"""Collect Indian BGMI / Free Fire tournaments from Liquipedia into data/esports.db:
tournament info, final standings, rosters, match-by-match points tables, teams.

Usage:
    python run.py                 # both games
    python run.py --game bgmi     # one game
    python run.py --export        # also write CSV files to data/export
    python run.py --reparse       # re-read all cached pages (after parser changes)
    python run.py --offline       # same, without any download
Only pages changed since the last run are downloaded again.
"""
import argparse
import csv
from datetime import datetime, timedelta, timezone

import config
import db
import teams
from liquipedia import Liquipedia
from parse import parse_player_stats, parse_stages, parse_tournament


def game_label(key, game_raw):
    if key == "freefire":
        return "Free Fire"
    return "BGMI" if game_raw and "bgmi" in game_raw.lower() else "PUBG Mobile"


def refresh_title_index(con, api, wiki):
    """Full list of wiki titles weekly; otherwise only sub-pages of live/upcoming events."""
    last = db.get_meta(con, f"titles_refreshed:{wiki}")
    stale = not last or datetime.fromisoformat(last) < datetime.now(timezone.utc) - timedelta(
        days=config.FULL_TITLE_REFRESH_DAYS)
    if stale:
        titles = api.all_titles()
        con.execute("DELETE FROM title_index WHERE wiki = ?", (wiki,))
        db.set_meta(con, f"titles_refreshed:{wiki}", db.now())
    else:
        live = [p for (p,) in con.execute("SELECT page FROM tournaments WHERE wiki = ? AND "
                                          "(status IS NULL OR status != 'finished')", (wiki,))]
        titles = [t for p in live for t in api.all_titles(prefix=p + "/")]
    con.executemany("INSERT OR IGNORE INTO title_index VALUES (?, ?)", [(wiki, t) for t in titles])
    con.commit()


def owner(page, tournament_pages):
    """Closest tournament page that this page sits under (or the page itself)."""
    parts = page.split("/")
    for n in range(len(parts), 0, -1):
        cand = "/".join(parts[:n])
        if cand in tournament_pages:
            return cand
    return None


def _cached(con, wiki, page):
    return con.execute("SELECT revid, text FROM pages WHERE wiki = ? AND page = ?", (wiki, page)).fetchone()


def process(con, key, wiki, pages, cat_set):
    """Parse cached pages: tournament pages first, then points tables on every page."""
    pages = [p for p in pages if _cached(con, wiki, p)]
    saved = 0
    for page in (p for p in pages if p in cat_set):
        revid, text = _cached(con, wiki, page)
        parsed = parse_tournament(text)
        if parsed:
            db.save_tournament(con, game_label(key, parsed["info"]["game_raw"]), wiki, page, revid, parsed)
            saved += 1
    known = {p for (p,) in con.execute("SELECT page FROM tournaments WHERE wiki = ?", (wiki,))}
    for page in pages:
        own = owner(page, known)
        if not own:
            continue
        text = _cached(con, wiki, page)[1]
        stages = parse_stages(text)
        if page != own:  # name tables from sub-pages after the sub-page, e.g. "League/Week 1 - Results"
            sub = page[len(own) + 1:]
            for st in stages:
                st["title"] = f"{sub} - {st['title']}" if st["title"] else sub
        tid = db.tournament_id(con, wiki, own)
        db.save_stages(con, tid, page, stages)
        db.save_player_stats(con, tid, page, parse_player_stats(text))
    con.commit()
    return saved


def reprocess_offline(con, key):
    """Re-parse every cached page without touching the network."""
    wiki = config.GAMES[key]["wiki"]
    tournament_pages = {p for (p,) in con.execute("SELECT page FROM tournaments WHERE wiki = ?", (wiki,))}
    pages = [p for (p,) in con.execute("SELECT page FROM pages WHERE wiki = ?", (wiki,))]
    saved = process(con, key, wiki, pages, tournament_pages)
    print(f"[{key}] re-parsed {len(pages)} cached pages, {saved} tournaments")


def collect(con, key, reparse=False):
    wiki, category = config.GAMES[key]["wiki"], config.GAMES[key]["category"]
    api = Liquipedia(wiki)

    # parser changed since this database was built: re-read the cached pages once (no downloads)
    if db.get_meta(con, f"parser_version:{wiki}") != str(config.PARSER_VERSION):
        reprocess_offline(con, key)
        db.set_meta(con, f"parser_version:{wiki}", str(config.PARSER_VERSION))
        con.commit()

    cat = api.category_pages(category)
    cat_set = set(cat)
    refresh_title_index(con, api, wiki)

    # tournament pages + every sub-page under them (League, Finals, Week 1, ...)
    index = [p for (p,) in con.execute("SELECT page FROM title_index WHERE wiki = ?", (wiki,))]
    tracked = sorted(cat_set | {p for p in index if owner(p, cat_set) and p not in cat_set})

    latest = api.latest_revids(tracked)
    known = db.page_revids(con, wiki)
    changed = [t for t, rev in latest.items() if known.get(t) != rev]
    print(f"[{key}] {len(cat)} tournament pages, {len(tracked) - len(cat)} sub-pages, "
          f"{len(changed)} new or changed")
    for page, (revid, text) in api.wikitext(changed).items():
        db.store_page(con, wiki, page, revid, text)
    con.commit()

    todo = tracked if reparse else changed
    saved = process(con, key, wiki, todo, cat_set)
    print(f"[{key}] processed {len(todo)} pages, {saved} tournaments updated")

    teams.resolve(con, api, wiki, db.team_names(con, wiki))


def export(con):
    config.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    team = "COALESCE(tm.name, {col})"
    join = "LEFT JOIN teams tm ON tm.wiki = t.wiki AND tm.key = lower({col})"
    queries = {
        "tournaments": "SELECT * FROM tournaments ORDER BY start_date DESC",
        "placements": f"""SELECT t.game, t.name AS tournament, t.start_date, p.place,
                          {team.format(col="p.team")} AS team, p.prize, t.currency
                          FROM placements p JOIN tournaments t ON t.id = p.tournament_id
                          {join.format(col="p.team")}
                          ORDER BY t.start_date DESC, p.place""",
        "rosters": f"""SELECT t.game, t.name AS tournament, t.start_date,
                       {team.format(col="r.team")} AS team, r.player, r.role
                       FROM rosters r JOIN tournaments t ON t.id = r.tournament_id
                       {join.format(col="r.team")}
                       ORDER BY t.start_date DESC, team""",
        "stage_standings": """SELECT t.game, t.name AS tournament, t.start_date, v.stage, v.team,
                              v.matches, v.wwcd, v.kills, v.starting_points, v.total_points
                              FROM v_stage_standings v JOIN tournaments t ON t.id = v.tournament_id
                              ORDER BY t.start_date DESC, v.stage_id, v.total_points DESC, v.wwcd DESC""",
        "match_results": f"""SELECT t.game, t.name AS tournament, s.title AS stage, mr.match_no,
                             m.played_at, m.map, {team.format(col="mr.team")} AS team,
                             mr.place, mr.kills, mr.points
                             FROM match_results mr JOIN stages s ON s.id = mr.stage_id
                             JOIN tournaments t ON t.id = s.tournament_id
                             LEFT JOIN matches m ON m.stage_id = mr.stage_id AND m.match_no = mr.match_no
                             {join.format(col="mr.team")}
                             ORDER BY t.start_date DESC, s.id, mr.match_no, mr.place""",
        "teams": "SELECT * FROM teams ORDER BY wiki, name",
    }
    for name, sql in queries.items():
        cur = con.execute(sql)
        path = config.EXPORT_DIR / f"{name}.csv"
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f)
            w.writerow([c[0] for c in cur.description])
            w.writerows(cur)
        print(f"exported {path}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", choices=list(config.GAMES), help="collect only this game")
    ap.add_argument("--export", action="store_true", help="write CSV files after collecting")
    ap.add_argument("--reparse", action="store_true", help="re-read every cached page")
    ap.add_argument("--offline", action="store_true", help="only re-parse the cache, no downloads")
    args = ap.parse_args()

    con = db.connect()
    for key in [args.game] if args.game else config.GAMES:
        if args.offline:
            reprocess_offline(con, key)
        else:
            collect(con, key, args.reparse)
    if args.export:
        export(con)


if __name__ == "__main__":
    main()
