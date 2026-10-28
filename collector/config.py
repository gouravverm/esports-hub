"""Collector settings. Edit CONTACT before running regularly."""
from pathlib import Path

# Liquipedia requires a User-Agent that names the project and gives a contact
# (email or website). Generic agents get blocked.
CONTACT = "https://github.com/gouravverm/esports-hub"
USER_AGENT = f"EsportsHubCollector/0.1 (BGMI/Free Fire stats app prototype; contact: {CONTACT})"

# Liquipedia API terms: max 1 request per 2 seconds. Kept a little slower.
MIN_SECONDS_BETWEEN_REQUESTS = 2.5
# action=parse limit is 1 per 30 seconds; used for expandtemplates too.
MIN_SECONDS_BETWEEN_HEAVY_REQUESTS = 31

# Full title list is refreshed this often; in between, only ongoing and
# upcoming tournaments are checked for new sub-pages.
FULL_TITLE_REFRESH_DAYS = 7
TEAM_BATCH = 150  # team names expanded per expandtemplates call

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "esports.db"
EXPORT_DIR = DATA_DIR / "export"

# game key -> Liquipedia wiki + category that lists its Indian tournaments
GAMES = {
    "bgmi": {"wiki": "pubgmobile", "category": "Category:Indian Tournaments"},
    "freefire": {"wiki": "freefire", "category": "Category:Indian Tournaments"},
}
