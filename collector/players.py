"""Player profiles from Liquipedia (Infobox player): real name, birth date, country, role, status,
years active, team history and social links.

    python players.py              # both wikis
    python players.py --all        # re-check every known player, not only recent ones

Roster names are first resolved to player pages (redirects followed, 50 per request). After that a
run only re-checks players from tournaments of the last 60 days, and everyone once a week, so it stays
within Liquipedia's API limits.
"""
import argparse
import json
import re
from datetime import datetime, timedelta, timezone

import mwparserfromhell

import config
import db
from liquipedia import BATCH, Liquipedia
from parse import _clean, _name, _param

SOCIAL = ("instagram", "youtube", "twitter", "twitch", "facebook", "discord", "kick", "rooter", "loco")
RECENT_DAYS = 60
FULL_REFRESH_DAYS = 7


def parse_player(wikitext):
    """Infobox player -> dict, or None for pages that are not player pages."""
    code = mwparserfromhell.parse(wikitext)
    box = next((t for t in code.filter_templates(recursive=True) if _name(t) == "infobox player"), None)
    if box is None:
        return None
    history = []
    if box.has("history"):
        for th in mwparserfromhell.parse(str(box.get("history").value)).filter_templates(recursive=False):
            if _name(th) != "th" or not th.has("2"):
                continue
            span = _clean(th.get("1").value) or ""  # "2021-07-23 — 2021-08-26", "2021-08-26 - Present"
            parts = re.split(r"\s*[—–]\s*|\s+-\s+", span, maxsplit=1)
            history.append({"from": parts[0] if parts else None, "to": parts[1] if len(parts) > 1 else None,
                            "team": _clean(th.get("2").value)})
    links = {k: _param(box, k) for k in SOCIAL if _param(box, k)}
    return {
        "tag": _param(box, "id"),
        "name": _param(box, "name"),
        "romanized_name": _param(box, "romanized_name"),
        "birth_date": _param(box, "birth_date"),
        "country": _param(box, "country"),
        "team": _param(box, "team"),
        "roles": _param(box, "roles") or _param(box, "role"),
        "status": _param(box, "status"),
        "years_active": _param(box, "years_active"),
        "history": history,
        "links": links,
    }


def resolve_aliases(con, api, wiki):
    """Roster spellings/links -> real page titles (redirects followed). Missing pages map to NULL."""
    known = {a for (a,) in con.execute("SELECT alias FROM player_alias WHERE wiki = ?", (wiki,))}
    aliases = sorted({a for (a,) in con.execute(
        "SELECT DISTINCT COALESCE(r.page, r.player) FROM rosters r JOIN tournaments t ON t.id = r.tournament_id "
        "WHERE t.wiki = ?", (wiki,)) if a} - known)
    if aliases:
        print(f"[{wiki}] resolving {len(aliases)} new player names (~{len(aliases) // BATCH + 1} requests)")
    for i in range(0, len(aliases), BATCH):
        chunk = aliases[i:i + BATCH]
        data = api._get({"action": "query", "prop": "info", "redirects": 1, "titles": "|".join(chunk)})
        q = data["query"]
        hop = {n["from"]: n["to"] for n in q.get("normalized", [])}
        hop.update({r["from"]: r["to"] for r in q.get("redirects", [])})
        exists = {p["title"] for p in q["pages"] if "missing" not in p and "invalid" not in p}
        rows = []
        for a in chunk:
            t = a
            for _ in range(3):  # normalised, then redirected
                t = hop.get(t, t)
            rows.append((wiki, a, t if t in exists else None))
        con.executemany("INSERT OR REPLACE INTO player_alias VALUES (?, ?, ?)", rows)
        con.commit()


def pages_to_check(con, wiki, everyone):
    if everyone:
        sql = "SELECT DISTINCT page FROM player_alias WHERE wiki = ? AND page IS NOT NULL"
        return [p for (p,) in con.execute(sql, (wiki,))]
    since = (datetime.now() - timedelta(days=RECENT_DAYS)).date().isoformat()
    recent = {p for (p,) in con.execute("""
        SELECT DISTINCT a.page FROM rosters r JOIN tournaments t ON t.id = r.tournament_id
        JOIN player_alias a ON a.wiki = t.wiki AND a.alias = COALESCE(r.page, r.player)
        WHERE t.wiki = ? AND a.page IS NOT NULL AND (t.end_date >= ? OR t.status != 'finished')""", (wiki, since))}
    never = {p for (p,) in con.execute("""
        SELECT DISTINCT a.page FROM player_alias a LEFT JOIN players p ON p.wiki = a.wiki AND p.page = a.page
        WHERE a.wiki = ? AND a.page IS NOT NULL AND p.page IS NULL""", (wiki,))}
    return sorted(recent | never)


def collect(con, key, everyone):
    wiki = config.GAMES[key]["wiki"]
    api = Liquipedia(wiki)
    resolve_aliases(con, api, wiki)

    last = db.get_meta(con, f"players_full:{wiki}")
    if not last or datetime.fromisoformat(last) < datetime.now(timezone.utc) - timedelta(days=FULL_REFRESH_DAYS):
        everyone = True
    pages = pages_to_check(con, wiki, everyone)
    latest = api.latest_revids(pages)
    known = dict(con.execute("SELECT page, revid FROM players WHERE wiki = ?", (wiki,)))
    changed = [p for p, rev in latest.items() if known.get(p) != rev]
    print(f"[{wiki}] {len(pages)} player pages checked, {len(changed)} new or changed")

    saved = 0
    for page, (revid, text) in api.wikitext(changed).items():
        p = parse_player(text)
        if p is None:
            continue
        con.execute("""INSERT OR REPLACE INTO players VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", (
            wiki, page, p["tag"], p["name"], p["romanized_name"], p["birth_date"], p["country"], p["team"],
            p["roles"], p["status"], p["years_active"], json.dumps(p["history"], ensure_ascii=False),
            json.dumps(p["links"]), revid, db.now()))
        saved += 1
    if everyone:
        db.set_meta(con, f"players_full:{wiki}", db.now())
    con.commit()
    print(f"[{wiki}] saved {saved} player profiles")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", choices=list(config.GAMES))
    ap.add_argument("--all", action="store_true", help="re-check every known player")
    args = ap.parse_args()
    con = db.connect()
    for key in [args.game] if args.game else config.GAMES:
        collect(con, key, args.all)


if __name__ == "__main__":
    main()
