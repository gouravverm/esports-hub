"""Map the many spellings of a team ("godl", "GodL", "GodLike Esports") to one
Liquipedia team page, using Liquipedia's own team templates."""
import re

import config

LINK = re.compile(r'team-template-text">\[\[([^\]|]+)\|([^\]]+)\]\]')
LOGO = re.compile(r"\[\[File:([^|\]]+)")


def team_key(name):
    return re.sub(r"\s+", " ", name or "").strip().lower()


def resolve(con, api, wiki, names):
    """Look up keys not yet in the teams table and store page, display name and logo."""
    known = {k for (k,) in con.execute("SELECT key FROM teams WHERE wiki = ?", (wiki,))}
    todo = sorted({team_key(n) for n in names if n} - known)
    if not todo:
        return 0
    print(f"[{wiki}] resolving {len(todo)} team names "
          f"(~{len(todo) // config.TEAM_BATCH + 1} slow requests)")
    for i in range(0, len(todo), config.TEAM_BATCH):
        chunk = todo[i:i + config.TEAM_BATCH]
        text = "".join(f"\n@@{n}@@{{{{Team|1={key}}}}}" for n, key in enumerate(chunk))
        parts = re.split(r"\n?@@(\d+)@@", api.expand(text))
        found = {int(parts[j]): parts[j + 1] for j in range(1, len(parts) - 1, 2)}
        rows = []
        for n, key in enumerate(chunk):
            html = found.get(n, "")
            link, logo = LINK.search(html), LOGO.search(html)
            if link:
                rows.append((wiki, key, link.group(1).strip(), link.group(2).strip(),
                             logo.group(1).strip() if logo else None))
            else:  # no team template: keep the name as written
                rows.append((wiki, key, None, key.title(), None))
        con.executemany("INSERT OR REPLACE INTO teams VALUES (?, ?, ?, ?, ?)", rows)
        con.commit()
    return len(todo)
