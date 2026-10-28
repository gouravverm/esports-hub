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
    order = {"live": 0, "upcoming": 1, "video": 2}
    out.sort(key=lambda v: v["at"] or "", reverse=True)
    out.sort(key=lambda v: order.get(v["status"], 3))
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

    for r, s in tours:
        tid, wiki = r["id"], r["wiki"]
        placements = []
        for place, team, prize in con.execute("SELECT place, team, prize FROM placements WHERE tournament_id = ? "
                                              "ORDER BY place", (tid,)):
            t = teams.get(wiki, team)
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
        for team, player, role in con.execute("SELECT team, player, role FROM rosters WHERE tournament_id = ?", (tid,)):
            t = teams.get(wiki, team)
            squad[t["id"]].append({"player": player, "role": role})
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
    return len(tours), len(team_index)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(config.BASE_DIR / "app" / "public" / "api"))
    args = ap.parse_args()
    out = Path(args.out)
    if out.exists():
        shutil.rmtree(out)
    con = db.connect()
    n_t, n_teams = build(con, out)
    print(f"wrote {n_t} tournaments and {n_teams} teams to {out}")


if __name__ == "__main__":
    main()
