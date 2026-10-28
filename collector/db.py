"""SQLite storage for collected tournaments, points tables and teams."""
import json
import sqlite3
from datetime import datetime, timezone

import config

SCHEMA = """
-- raw page cache (Liquipedia asks API users to cache)
CREATE TABLE IF NOT EXISTS pages (
    wiki TEXT NOT NULL, page TEXT NOT NULL,
    revid INTEGER, text TEXT, fetched_at TEXT,
    PRIMARY KEY (wiki, page)
);
CREATE TABLE IF NOT EXISTS title_index (
    wiki TEXT NOT NULL, page TEXT NOT NULL,
    PRIMARY KEY (wiki, page)
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY,
    game TEXT NOT NULL,
    wiki TEXT NOT NULL,
    page TEXT NOT NULL,
    name TEXT, tier TEXT, type TEXT, organizer TEXT, series TEXT,
    country TEXT, city TEXT, mode TEXT, perspective TEXT,
    prize_pool REAL, currency TEXT,
    start_date TEXT, end_date TEXT, status TEXT,
    team_count INTEGER, youtube TEXT,
    source_url TEXT, revid INTEGER, updated_at TEXT,
    UNIQUE (wiki, page)
);
CREATE TABLE IF NOT EXISTS placements (
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    place INTEGER, team TEXT, prize REAL
);
CREATE TABLE IF NOT EXISTS rosters (
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team TEXT, player TEXT, role TEXT
);

-- one stage = one points table (e.g. "Week 1", "Grand Finals")
CREATE TABLE IF NOT EXISTS stages (
    id INTEGER PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    source_page TEXT NOT NULL, stage_no INTEGER, title TEXT,
    kill_points REAL, placement_points TEXT
);
CREATE TABLE IF NOT EXISTS matches (
    stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    match_no INTEGER, played_at TEXT, map TEXT
);
CREATE TABLE IF NOT EXISTS match_results (
    stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    match_no INTEGER, team TEXT, place INTEGER, kills INTEGER, points REAL
);
CREATE TABLE IF NOT EXISTS starting_points (
    stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    team TEXT, points REAL
);
-- older pages only give per-day / overall totals, not match-by-match
CREATE TABLE IF NOT EXISTS stage_totals (
    stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    team TEXT, total REAL, rounds TEXT, wwcd INTEGER
);

-- every spelling of a team -> its Liquipedia page and current name
CREATE TABLE IF NOT EXISTS teams (
    wiki TEXT NOT NULL, key TEXT NOT NULL,
    team_page TEXT, name TEXT, logo TEXT,
    PRIMARY KEY (wiki, key)
);

CREATE INDEX IF NOT EXISTS ix_place_team ON placements(team);
CREATE INDEX IF NOT EXISTS ix_roster_player ON rosters(player);
CREATE INDEX IF NOT EXISTS ix_result_stage ON match_results(stage_id);
CREATE INDEX IF NOT EXISTS ix_stage_tournament ON stages(tournament_id);

-- team name as shown in the app (falls back to the spelling on the page)
DROP VIEW IF EXISTS v_stage_standings;
CREATE VIEW v_stage_standings AS
WITH r AS (
    SELECT s.id AS stage_id, s.tournament_id, s.title AS stage, t.wiki,
           COALESCE(tm.team_page, mr.team) AS team_id, COALESCE(tm.name, mr.team) AS team,
           COUNT(*) AS matches, SUM(mr.place = 1) AS wwcd, SUM(mr.kills) AS kills,
           SUM(mr.points) AS match_points
    FROM match_results mr
    JOIN stages s ON s.id = mr.stage_id
    JOIN tournaments t ON t.id = s.tournament_id
    LEFT JOIN teams tm ON tm.wiki = t.wiki AND tm.key = lower(mr.team)
    GROUP BY s.id, team_id
)
SELECT r.*, COALESCE(sp.points, 0) AS starting_points,
       r.match_points + COALESCE(sp.points, 0) AS total_points
FROM r
LEFT JOIN (SELECT sp.stage_id, COALESCE(tm.team_page, sp.team) AS team_id, sp.points
           FROM starting_points sp JOIN stages s ON s.id = sp.stage_id
           JOIN tournaments t ON t.id = s.tournament_id
           LEFT JOIN teams tm ON tm.wiki = t.wiki AND tm.key = lower(sp.team)) sp
       ON sp.stage_id = r.stage_id AND sp.team_id = r.team_id
UNION ALL
SELECT s.id, s.tournament_id, s.title, t.wiki,
       COALESCE(tm.team_page, st.team), COALESCE(tm.name, st.team),
       NULL, st.wwcd, NULL, NULL, 0, st.total
FROM stage_totals st
JOIN stages s ON s.id = st.stage_id
JOIN tournaments t ON t.id = s.tournament_id
LEFT JOIN teams tm ON tm.wiki = t.wiki AND tm.key = lower(st.team);
"""


def connect():
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(config.DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    cols = [r[1] for r in con.execute("PRAGMA table_info(stage_totals)")]
    if cols and "wwcd" not in cols:  # databases made before the wwcd column
        con.execute("ALTER TABLE stage_totals ADD COLUMN wwcd INTEGER")
    con.executescript(SCHEMA)
    return con


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def get_meta(con, key):
    row = con.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
    return row[0] if row else None


def set_meta(con, key, value):
    con.execute("INSERT OR REPLACE INTO meta VALUES (?, ?)", (key, value))


def page_revids(con, wiki):
    return dict(con.execute("SELECT page, revid FROM pages WHERE wiki = ?", (wiki,)))


def store_page(con, wiki, page, revid, text):
    con.execute("INSERT OR REPLACE INTO pages VALUES (?, ?, ?, ?, ?)", (wiki, page, revid, text, now()))


def status_for(start, end):
    today = datetime.now().date().isoformat()
    if start and start > today:
        return "upcoming"
    if end and end < today:
        return "finished"
    return "ongoing" if start else None


def save_tournament(con, game, wiki, page, revid, parsed):
    info = parsed["info"]
    url = f"https://liquipedia.net/{wiki}/{page.replace(' ', '_')}"
    cols = ["name", "tier", "type", "organizer", "series", "country", "city", "mode", "perspective",
            "prize_pool", "currency", "start_date", "end_date", "team_count", "youtube"]
    values = [info[c] for c in cols]
    con.execute(
        f"""INSERT INTO tournaments (game, wiki, page, {", ".join(cols)}, status, source_url, revid, updated_at)
            VALUES (?, ?, ?, {", ".join("?" * len(cols))}, ?, ?, ?, ?)
            ON CONFLICT (wiki, page) DO UPDATE SET game = excluded.game,
            {", ".join(f"{c} = excluded.{c}" for c in cols)},
            status = excluded.status, source_url = excluded.source_url,
            revid = excluded.revid, updated_at = excluded.updated_at""",
        [game, wiki, page, *values, status_for(info["start_date"], info["end_date"]), url, revid, now()],
    )
    tid = tournament_id(con, wiki, page)
    con.execute("DELETE FROM placements WHERE tournament_id = ?", (tid,))
    con.execute("DELETE FROM rosters WHERE tournament_id = ?", (tid,))
    con.executemany("INSERT INTO placements VALUES (?, ?, ?, ?)",
                    [(tid, p["place"], p["team"], p["prize"]) for p in parsed["placements"]])
    con.executemany("INSERT INTO rosters VALUES (?, ?, ?, ?)",
                    [(tid, r["team"], r["player"], r["role"]) for r in parsed["rosters"]])
    return tid


def tournament_id(con, wiki, page):
    row = con.execute("SELECT id FROM tournaments WHERE wiki = ? AND page = ?", (wiki, page)).fetchone()
    return row[0] if row else None


def save_stages(con, tid, page, stages):
    """Replace all points tables that came from this page."""
    con.execute("DELETE FROM stages WHERE source_page = ? AND tournament_id = ?", (page, tid))
    for no, st in enumerate(stages, start=1):
        kill, places = st["kill_points"], st["placement_points"]
        cur = con.execute("INSERT INTO stages (tournament_id, source_page, stage_no, title, kill_points, "
                          "placement_points) VALUES (?, ?, ?, ?, ?, ?)",
                          (tid, page, no, st["title"], kill, json.dumps(places) if places else None))
        sid = cur.lastrowid
        con.executemany("INSERT INTO matches VALUES (?, ?, ?, ?)",
                        [(sid, n, m["played_at"], m["map"]) for n, m in sorted(st["matches"].items())])

        def points(r):
            if kill is None and not places:
                return None  # table did not state its points system
            return (kill or 0) * r["kills"] + places.get(r["place"], 0)

        con.executemany("INSERT INTO match_results VALUES (?, ?, ?, ?, ?, ?)",
                        [(sid, r["match_no"], r["team"], r["place"], r["kills"], points(r))
                         for r in st["results"]])
        con.executemany("INSERT INTO starting_points VALUES (?, ?, ?)",
                        [(sid, team, pts) for team, pts in st["starting_points"].items()])
        con.executemany("INSERT INTO stage_totals VALUES (?, ?, ?, ?, ?)",
                        [(sid, r["team"], r["total"], json.dumps(r["rounds"]), r.get("wwcd"))
                         for r in st["totals"]])


def team_names(con, wiki):
    """Every team spelling stored for this wiki, from all tables."""
    rows = con.execute("""
        SELECT p.team FROM placements p JOIN tournaments t ON t.id = p.tournament_id WHERE t.wiki = ?
        UNION SELECT r.team FROM rosters r JOIN tournaments t ON t.id = r.tournament_id WHERE t.wiki = ?
        UNION SELECT m.team FROM match_results m JOIN stages s ON s.id = m.stage_id
              JOIN tournaments t ON t.id = s.tournament_id WHERE t.wiki = ?
        UNION SELECT x.team FROM stage_totals x JOIN stages s ON s.id = x.stage_id
              JOIN tournaments t ON t.id = s.tournament_id WHERE t.wiki = ?
    """, (wiki, wiki, wiki, wiki))
    return [r[0] for r in rows]
