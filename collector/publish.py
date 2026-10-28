"""Write the database out as static JSON files that the app reads.
No server needed: the folder can be hosted free (GitHub Pages, Cloudflare Pages).

    python publish.py                  # writes ../app/public/api
    python publish.py --out some/dir

Files:
    index.json              live / upcoming / recent tournaments and streams / videos per game
    tournaments/<game>.json every tournament of a game (summary)
    t/<id>.json             one tournament: info, standings, points tables, matches, squads
    teams/index.json        all teams (for search)
    teams/<slug>.json       one team: results history, titles, last squad
"""
import argparse
import json
import re
import shutil
import sqlite3
from collections import defaultdict
from pathlib import Path

import config
import db

GAMES = {"BGMI": "bgmi", "PUBG Mobile": "pubgm", "Free Fire": "freefire"}
WIKI_PREFIX = {"pubgmobile": "pm", "freefire": "ff"}
RECENT = 12


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-") or "unknown"


def write(out, path, data):
    f = out / path
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


class Teams:
    """Resolves any stored team spelling to {id, name} for one wiki."""

    def __init__(self, con):
        self.map = {(w, k): (page, name) for w, k, page, name in
                    con.execute("SELECT wiki, key, team_page, name FROM teams")}

    def get(self, wiki, raw):
        page, name = self.map.get((wiki, (raw or "").strip().lower()), (None, None))
        name = name or raw
        return {"id": team_id(wiki, page or name), "name": name}


def team_id(wiki, page_or_name):
    """Same team name can exist on both wikis, so the id carries the wiki."""
    return f"{WIKI_PREFIX[wiki]}-{slug(page_or_name)}"


def finish_vs_fight(con, names, wiki, st):
    """{team_id: {"placePts", "killPts"}}: how each team scored, by surviving or by fighting.
    Match tables: kill points = kills x points per kill, the rest of the points came from placement.
    Totals tables: the stage's own 'placement' and 'kill' columns when it has them."""
    out = {}
    if st["kill_points"] is not None:
        for team, kills, pts in con.execute("SELECT team, SUM(kills), SUM(points) FROM match_results "
                                            "WHERE stage_id = ? AND points IS NOT NULL GROUP BY team",
                                            (st["id"],)):
            kill_pts = kills * st["kill_points"]
            out[names.get(wiki, team)["id"]] = {"placePts": pts - kill_pts, "killPts": kill_pts}
        return out
    for team, rounds in con.execute("SELECT team, rounds FROM stage_totals WHERE stage_id = ?", (st["id"],)):
        parts = json.loads(rounds or "{}")
        place = next((v for k, v in parts.items() if "place" in k.lower()), None)
        kill = next((v for k, v in parts.items() if "kill" in k.lower()), None)
        if place is not None and kill is not None:
            out[names.get(wiki, team)["id"]] = {"placePts": place, "killPts": kill}
    return out


def load_videos(con, summaries):
    """Followed channels' recent videos, newest first: live first, then upcoming, then uploads."""
    channel_games = {c["handle"]: [GAMES[g] for g in c["games"]] for c in config.YOUTUBE_CHANNELS}
    out = []
    for vid, handle, title, thumb, status, published, scheduled, started, tid, channel in con.execute("""
            SELECT v.video_id, v.handle, v.title, v.thumb, v.status, v.published_at, v.scheduled_start,
                   v.actual_start, v.tournament_id, c.title
            FROM yt_videos v LEFT JOIN yt_channels c ON c.handle = v.handle"""):
        t = summaries.get(tid)
        out.append({
            "id": vid, "title": title, "thumb": thumb, "status": status, "channel": channel,
            "at": started or scheduled or published,
            "url": f"https://www.youtube.com/watch?v={vid}",
            # a matched video belongs to its tournament's game; otherwise to every game the channel covers
            "games": [t["game"]] if t else channel_games.get(handle, []),
            "tournament": {"id": t["id"], "name": t["name"]} if t else None,
        })
    out = group_languages(out)
    # live first; upcoming soonest first; uploads newest first
    live = sorted((v for v in out if v["status"] == "live"), key=lambda v: v["at"] or "", reverse=True)
    upcoming = sorted((v for v in out if v["status"] == "upcoming"), key=lambda v: v["at"] or "")
    uploads = sorted((v for v in out if v["status"] == "video"), key=lambda v: v["at"] or "", reverse=True)
    return live + upcoming + uploads


LANG_TAG = re.compile(r"^\s*\[([^\]]+)\]\s*")
LANG_ORDER = ["HINDI", "ENGLISH"]  # which broadcast leads a group


def group_languages(videos):
    """The same broadcast in several languages ('[HINDI] BMIC 2026 | Day 3', '[ENGLISH] ...') becomes
    one entry led by the Hindi (else English) stream, with the others under "languages"."""
    groups = defaultdict(list)
    for v in videos:
        m = LANG_TAG.match(v["title"])
        base = LANG_TAG.sub("", v["title"]) if m else v["title"]
        groups[(v["channel"], base, v["status"])].append((m.group(1).upper() if m else None, v))
    out = []
    for (_, base, _), items in groups.items():
        if len(items) == 1 or not all(lang for lang, _ in items):
            out.extend(v for _, v in items)
            continue
        items.sort(key=lambda lv: LANG_ORDER.index(lv[0]) if lv[0] in LANG_ORDER else len(LANG_ORDER))
        lead_lang, lead = items[0]
        out.append({**lead, "title": base, "language": lead_lang.title(),
                    "languages": [{"language": lang.title(), "url": v["url"]} for lang, v in items[1:]]})
    return out


def summary(row):
    return {
        "id": row["id"], "game": GAMES[row["game"]], "name": row["name"], "tier": row["tier"],
        "type": row["type"], "organizer": row["organizer"], "city": row["city"],
        "start": row["start_date"], "end": row["end_date"], "status": row["status"],
        "prize": row["prize_pool"], "currency": row["currency"],
    }


def build(con, out):
    con.row_factory = sqlite3.Row
    teams = Teams(con)
    rows = con.execute("SELECT * FROM tournaments WHERE name IS NOT NULL ORDER BY start_date DESC").fetchall()
    tours = []
    for r in rows:
        s = summary(r)
        s["status"] = db.status_for(r["start_date"], r["end_date"]) or r["status"]
        tours.append((r, s))

    # winners shown on cards
    winners = {}
    for tid, wiki, team in con.execute("SELECT p.tournament_id, t.wiki, p.team FROM placements p "
                                       "JOIN tournaments t ON t.id = p.tournament_id WHERE p.place = 1"):
        winners.setdefault(tid, teams.get(wiki, team)["name"])
    for _, s in tours:
        s["winner"] = winners.get(s["id"])

    videos = load_videos(con, {s["id"]: s for _, s in tours})

    # index + per-game lists
    index = {"updated": db.now(), "source": "Liquipedia (CC-BY-SA 3.0)", "games": {}}
    for label, key in GAMES.items():
        mine = [s for r, s in tours if r["game"] == label]
        write(out, f"tournaments/{key}.json", mine)
        game_videos = [v for v in videos if key in v["games"]]
        index["games"][key] = {
            "label": label,
            "count": len(mine),
            "live": [s for s in mine if s["status"] == "ongoing"],
            "upcoming": sorted([s for s in mine if s["status"] == "upcoming"], key=lambda s: s["start"] or "")[:RECENT],
            "recent": [s for s in mine if s["status"] == "finished"][:RECENT],
            # streams on air or about to start, then the newest uploads
            "streams": [v for v in game_videos if v["status"] in ("live", "upcoming")][:RECENT],
            "videos": [v for v in game_videos if v["status"] == "video"][:RECENT],
        }
    write(out, "index.json", index)
    by_tournament = defaultdict(list)
    for v in videos:
        if v["tournament"]:
            by_tournament[v["tournament"]["id"]].append(v)

    # team history collected while writing tournaments
    history = defaultdict(list)
    squads = {}
    team_game = {}
    # player careers collected from every roster: one entry per tournament played
    aliases = {(w, a): p for w, a, p in con.execute("SELECT wiki, alias, page FROM player_alias")}
    careers = defaultdict(list)
    player_meta = {}

    def player_id(wiki, alias):
        return team_id(wiki, aliases.get((wiki, alias)) or alias)

    for r, s in tours:
        tid, wiki = r["id"], r["wiki"]
        placements = []
        place_of = {}
        for place, team, prize in con.execute("SELECT place, team, prize FROM placements WHERE tournament_id = ? "
                                              "ORDER BY place", (tid,)):
            t = teams.get(wiki, team)
            place_of.setdefault(t["id"], (place, prize))
            placements.append({"place": place, "team": t, "prize": prize})
            history[t["id"]].append({**{k: s[k] for k in ("id", "name", "tier", "start", "currency")},
                                     "place": place, "prize": prize})
            team_game.setdefault(t["id"], (s["game"], t["name"]))

        stages = []
        for st in con.execute("SELECT * FROM stages WHERE tournament_id = ? ORDER BY source_page = ? DESC, id",
                              (tid, r["page"])).fetchall():
            split = finish_vs_fight(con, teams, wiki, st)
            standings = [
                {"team": {"id": team_id(wiki, x["team_id"]), "name": x["team"]}, "matches": x["matches"],
                 "wwcd": x["wwcd"], "kills": x["kills"], "start": x["starting_points"], "points": x["total_points"],
                 **split.get(team_id(wiki, x["team_id"]), {})}
                for x in con.execute("SELECT * FROM v_stage_standings WHERE stage_id = ? "
                                     "ORDER BY total_points DESC, wwcd DESC, kills DESC", (st["id"],))
            ]
            matches = defaultdict(lambda: {"results": []})
            for m in con.execute("SELECT match_no, played_at, map FROM matches WHERE stage_id = ?", (st["id"],)):
                matches[m["match_no"]].update({"no": m["match_no"], "at": m["played_at"], "map": m["map"]})
            for x in con.execute("SELECT match_no, team, place, kills, points FROM match_results "
                                 "WHERE stage_id = ? ORDER BY match_no, place", (st["id"],)):
                matches[x["match_no"]].setdefault("no", x["match_no"])
                matches[x["match_no"]]["results"].append(
                    {"team": teams.get(wiki, x["team"]), "place": x["place"], "kills": x["kills"],
                     "points": x["points"]})
            stages.append({
                "id": st["id"], "title": st["title"] or f"Stage {st['stage_no']}",
                "killPoints": st["kill_points"],
                "placementPoints": json.loads(st["placement_points"]) if st["placement_points"] else None,
                "standings": standings,
                "matches": [m for _, m in sorted(matches.items()) if m["results"]],
            })

        squad = defaultdict(list)
        for team, player, role, page in con.execute(
                "SELECT team, player, role, COALESCE(page, player) FROM rosters WHERE tournament_id = ?", (tid,)):
            t = teams.get(wiki, team)
            pid = player_id(wiki, page)
            squad[t["id"]].append({"player": player, "role": role, "id": pid})
            place, prize = place_of.get(t["id"], (None, None))
            careers[pid].append({**{k: s[k] for k in ("id", "name", "tier", "start", "currency")},
                                 "team": t, "role": role, "place": place, "prize": prize})
            player_meta.setdefault(pid, (wiki, aliases.get((wiki, page)), player, s["game"]))
            team_game.setdefault(t["id"], (s["game"], t["name"]))
            # rows are newest tournament first, so the first squad seen is the latest
            squads.setdefault(t["id"], {"tournament": s["name"], "players": squad[t["id"]]})
        squad_list = [{"team": {"id": k, "name": team_game[k][1]}, "players": v} for k, v in squad.items()]

        write(out, f"t/{tid}.json", {**s, "series": r["series"], "mode": r["mode"],
                                     "perspective": r["perspective"], "teams": r["team_count"],
                                     "source": r["source_url"], "placements": placements,
                                     "stages": stages, "squads": squad_list,
                                     "videos": by_tournament.get(tid, [])[:20]})

    team_index = []
    for tid_, (game, name) in team_game.items():
        h = history.get(tid_, [])
        titles = sum(1 for x in h if x["place"] == 1)
        team_index.append({"id": tid_, "name": name, "game": game, "titles": titles, "events": len(h)})
        write(out, f"teams/{tid_}.json", {
            "id": tid_, "name": name, "game": game, "titles": titles,
            "podiums": sum(1 for x in h if x["place"] and x["place"] <= 3),
            "earnings": sum(x["prize"] or 0 for x in h if (x["currency"] or "").lower() == "inr"),
            "history": h, "squad": squads.get(tid_),
        })
    team_index.sort(key=lambda t: (-t["titles"], -t["events"], t["name"]))
    write(out, "teams/index.json", team_index)
    n_players = write_players(con, out, careers, player_meta)
    return len(tours), len(team_index), n_players


SOCIAL_URL = {
    "instagram": "https://instagram.com/{}", "youtube": "https://youtube.com/{}", "twitter": "https://x.com/{}",
    "twitch": "https://twitch.tv/{}", "facebook": "https://facebook.com/{}", "kick": "https://kick.com/{}",
}
PLAYING = ("player", "captain", "substitute")


def write_players(con, out, careers, player_meta):
    """players/<id>.json: Liquipedia profile + career built from the rosters; players/index.json for search."""
    profiles = {(r["wiki"], r["page"]): r for r in con.execute("SELECT * FROM players")}
    index = []
    for pid, events in careers.items():
        wiki, page, shown, game = player_meta[pid]
        prof = profiles.get((wiki, page))
        events.sort(key=lambda e: e["start"] or "")
        # consecutive tournaments with the same team make one stint
        timeline = []
        for e in events:
            if timeline and timeline[-1]["team"]["id"] == e["team"]["id"]:
                timeline[-1]["to"] = e["start"]
                timeline[-1]["events"] += 1
            else:
                timeline.append({"team": e["team"], "from": e["start"], "to": e["start"], "events": 1})
        played = [e for e in events if e["role"] in PLAYING]
        titles = sum(1 for e in played if e["place"] == 1)
        latest = events[-1]
        links = {k: SOCIAL_URL[k].format(v) for k, v in json.loads(prof["links"] or "{}").items()
                 if k in SOCIAL_URL} if prof else {}
        data = {
            "id": pid, "game": game,
            "tag": (prof and prof["tag"]) or shown,
            "name": prof and prof["romanized_name"],
            "nativeName": prof and prof["name"] if prof and prof["name"] != prof["romanized_name"] else None,
            "birthDate": prof and prof["birth_date"],
            "country": prof and prof["country"],
            "roles": prof and prof["roles"],
            "status": prof and prof["status"],
            "yearsActive": prof and prof["years_active"],
            "links": links,
            "source": f"https://liquipedia.net/{wiki}/{page.replace(' ', '_')}" if page else None,
            "currentTeam": latest["team"],
            "lastRole": latest["role"],
            "listedHistory": json.loads(prof["history"]) if prof and prof["history"] else [],
            "timeline": list(reversed(timeline)),
            "tournaments": list(reversed(events)),
            "events": len(played), "titles": titles,
            "podiums": sum(1 for e in played if e["place"] and e["place"] <= 3),
            # what the player's teams won in events the player was rostered for (not a personal payout)
            "teamWinnings": sum(e["prize"] or 0 for e in played if (e["currency"] or "").lower() == "inr"),
        }
        write(out, f"players/{pid}.json", data)
        index.append({"id": pid, "tag": data["tag"], "name": data["name"], "game": game,
                      "team": latest["team"]["name"], "events": data["events"], "titles": titles})
    index.sort(key=lambda p: (-p["titles"], -p["events"], p["tag"].lower()))
    write(out, "players/index.json", index)
    return len(index)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(config.BASE_DIR / "app" / "public" / "api"))
    args = ap.parse_args()
    out = Path(args.out)
    if out.exists():
        shutil.rmtree(out)
    con = db.connect()
    n_t, n_teams, n_players = build(con, out)
    print(f"wrote {n_t} tournaments, {n_teams} teams and {n_players} players to {out}")


if __name__ == "__main__":
    main()
