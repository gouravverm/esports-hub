"""Recent uploads and live streams of the followed channels, via the official YouTube Data API v3.

    YOUTUBE_API_KEY=... python youtube.py

Per run: 1 unit per channel for its uploads list + 1 unit per 50 videos for their details,
about 7 units against the free 10,000 a day. Without a key the script says so and exits
cleanly, so the rest of the pipeline still runs. Each video is matched to a tournament by
its game, its date and the words of its title (the tournament's ticker, e.g. "BGMS S2",
counts most).
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

import config
import db

API = "https://www.googleapis.com/youtube/v3/"

# words that say nothing about which tournament a video is
STOP = {
    "the", "of", "and", "by", "ft", "x", "vs", "in", "on", "at", "a", "to", "for", "with", "live", "day",
    "week", "match", "matches", "esports", "esport", "india", "indian", "presented", "powered", "official",
    "stage", "finals", "final", "grand", "group", "league", "round", "qualifiers", "qualifier", "show",
    "bgmi", "free", "fire", "max", "ff", "pubg", "mobile", "pubgm", "hindi", "english", "tamil", "telugu",
    "highlights", "watch", "now", "stream", "streaming", "presents", "tournament", "cup", "series", "season",
}


def get(endpoint, key, **params):
    url = API + endpoint + "?" + urllib.parse.urlencode({**params, "key": key})
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read())


def resolve_channels(con, key):
    """Handle -> channel id and uploads playlist, looked up once and kept."""
    known = {h for (h,) in con.execute("SELECT handle FROM yt_channels WHERE uploads IS NOT NULL")}
    for ch in config.YOUTUBE_CHANNELS:
        if ch["handle"] in known:
            continue
        items = get("channels", key, part="id,snippet,contentDetails", forHandle=ch["handle"]).get("items", [])
        if not items:
            print(f"[youtube] channel not found: {ch['handle']}")
            continue
        it = items[0]
        con.execute("INSERT OR REPLACE INTO yt_channels VALUES (?, ?, ?, ?, ?, ?)", (
            ch["handle"], it["id"], it["snippet"]["title"],
            it["snippet"].get("thumbnails", {}).get("default", {}).get("url"),
            it["contentDetails"]["relatedPlaylists"]["uploads"], db.now()))
    con.commit()


def status_of(item):
    live = item["snippet"].get("liveBroadcastContent", "none")
    return {"live": "live", "upcoming": "upcoming"}.get(live, "video")


def best_thumb(snippet):
    thumbs = snippet.get("thumbnails", {})
    for size in ("high", "medium", "standard", "default"):
        if size in thumbs:
            return thumbs[size]["url"]
    return None


def fetch_videos(con, key):
    ids_by_handle = {}
    for handle, uploads in con.execute("SELECT handle, uploads FROM yt_channels WHERE uploads IS NOT NULL"):
        items = get("playlistItems", key, part="contentDetails", playlistId=uploads,
                    maxResults=config.YOUTUBE_RECENT_PER_CHANNEL).get("items", [])
        ids_by_handle[handle] = [i["contentDetails"]["videoId"] for i in items]
    handle_of = {v: h for h, ids in ids_by_handle.items() for v in ids}
    ids = list(handle_of)
    rows = []
    for i in range(0, len(ids), 50):
        for it in get("videos", key, part="snippet,liveStreamingDetails,contentDetails",
                      id=",".join(ids[i:i + 50])).get("items", []):
            sn, ls = it["snippet"], it.get("liveStreamingDetails", {})
            rows.append((it["id"], handle_of[it["id"]], sn["title"], sn["publishedAt"], best_thumb(sn),
                         status_of(it), ls.get("scheduledStartTime"), ls.get("actualStartTime"),
                         ls.get("actualEndTime"), it.get("contentDetails", {}).get("duration"), db.now()))
    con.executemany("""INSERT INTO yt_videos (video_id, handle, title, published_at, thumb, status,
                           scheduled_start, actual_start, actual_end, duration, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                       ON CONFLICT (video_id) DO UPDATE SET title = excluded.title, thumb = excluded.thumb,
                           status = excluded.status, scheduled_start = excluded.scheduled_start,
                           actual_start = excluded.actual_start, actual_end = excluded.actual_end,
                           duration = excluded.duration, updated_at = excluded.updated_at""", rows)
    # a stream that ended between runs is no longer listed as live
    con.execute("UPDATE yt_videos SET status = 'video' WHERE status = 'live' AND actual_end IS NOT NULL")
    con.commit()
    return len(rows)


# ---------- matching videos to tournaments ----------

def words(text):
    # years are left out: nearly every title and tournament name carries one
    return {w for w in re.findall(r"[a-z0-9]+", (text or "").lower())
            if w not in STOP and not re.fullmatch(r"20\d\d", w)}


def day(text):
    """'2026-08-10' -> date; partly known dates ('2026-11-??') -> None."""
    try:
        return datetime.strptime((text or "")[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def match_score(title_words, t):
    """How strongly a title points at one tournament: ticker words count triple."""
    ticker = words(t["ticker"]) | words(t["abbreviation"])
    name = words(t["name"]) - ticker
    return 3 * len(title_words & ticker) + len(title_words & name)


def match_tournaments(con):
    games_of = {c["handle"]: set(c["games"]) for c in config.YOUTUBE_CHANNELS}
    tours = [dict(zip(("id", "game", "name", "ticker", "abbreviation", "start", "end"), r)) for r in con.execute(
        "SELECT id, game, name, ticker, abbreviation, start_date, end_date FROM tournaments WHERE name IS NOT NULL")]
    for t in tours:
        t["from"], t["to"] = day(t["start"]), day(t["end"]) or (day(t["start"]) and day(t["start"]) + timedelta(days=30))
    updates = []
    for vid, handle, title, published, scheduled, started in con.execute(
            "SELECT video_id, handle, title, published_at, scheduled_start, actual_start FROM yt_videos"):
        when = day(started or scheduled or published)
        tw = words(title)
        best, best_key = None, None
        for t in tours:
            if t["game"] not in games_of.get(handle, set()) or not t["from"] or not when:
                continue
            # streams start a little before day 1 and highlights come out a few days after
            if not (t["from"] - timedelta(days=2) <= when <= t["to"] + timedelta(days=4)):
                continue
            score = match_score(tw, t)
            if score < 2:
                continue
            span = (t["to"] - t["from"]).days
            key = (score, -span)  # prefer the stronger match, then the more specific (shorter) event
            if best_key is None or key > best_key:
                best, best_key = t["id"], key
        updates.append((best, vid))
    con.executemany("UPDATE yt_videos SET tournament_id = ? WHERE video_id = ?", updates)
    con.commit()
    return sum(1 for b, _ in updates if b)


def main():
    key = os.environ.get(config.YOUTUBE_API_KEY_ENV)
    con = db.connect()
    if not key:
        print(f"[youtube] {config.YOUTUBE_API_KEY_ENV} not set, skipping video fetch")
    else:
        resolve_channels(con, key)
        n = fetch_videos(con, key)
        print(f"[youtube] {n} recent videos from {len(config.YOUTUBE_CHANNELS)} channels")
    # YouTube API policy: data not refreshed within 30 days must be deleted. Videos that dropped
    # out of a channel's latest uploads stop being refreshed, so they go after 30 days.
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(timespec="seconds")
    gone = con.execute("DELETE FROM yt_videos WHERE updated_at < ?", (cutoff,)).rowcount
    con.commit()
    if gone:
        print(f"[youtube] removed {gone} videos not refreshed for 30 days")
    matched = match_tournaments(con)
    live = con.execute("SELECT COUNT(*) FROM yt_videos WHERE status = 'live'").fetchone()[0]
    print(f"[youtube] {matched} videos matched to tournaments, {live} live now")


if __name__ == "__main__":
    sys.exit(main())
