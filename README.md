# Esports App (BGMI + Free Fire)

Cricbuzz jaisa esports app: tournaments, results, points table, teams, players, history, live streams.

## Abhi tak kya bana hai

**Collector** (`collector/`): Liquipedia ke official API se Indian BGMI / PUBG Mobile / Free Fire
tournaments ka data nikal ke `data/esports.db` (SQLite) me save karta hai.

- **Tournament info:** naam, tier, organizer, city, dates, prize pool, status (finished / ongoing / upcoming)
- **Final standings:** place, team, prize
- **Team rosters:** players, coach, substitutes
- **Points tables:** har stage (League Week 1, Grand Finals, ...) ka table
  - naye tournaments: match-by-match (map, time, position, kills, points)
  - purane tournaments: sirf per-day / overall totals (Liquipedia pe itna hi hai)
- **Teams:** ek team ke saare naam ("s8ul", "team s8ul", "S8UL Esports") ek hi team se jude, current naam + logo file

Data source: [Liquipedia](https://liquipedia.net), license CC-BY-SA 3.0. App me "Data: Liquipedia" credit dikhana zaroori hai.

## Kaise chalayein

```
cd collector
python run.py --export
```

- Pehli baar ~30 minute (BGMI wiki bada hai). Uske baad sirf badle hue pages download hote hain.
- `--export` se `data/export/` me CSV files banti hain (Excel me khul jaati hain):
  `tournaments`, `placements`, `rosters`, `stage_standings`, `match_results`, `teams`.
- `--reparse`: parser badalne ke baad cached pages dobara padhta hai (download nahi karta).
- Liquipedia ke rules: har 2 second me max 1 request, heavy requests 30 second me 1; HTML scraping allowed nahi.
- `collector/config.py` me `CONTACT` me apna email / website daalna hai (Liquipedia ka rule).

## Files

| File | Kaam |
|---|---|
| `collector/run.py` | poora collection chalata hai |
| `collector/liquipedia.py` | Liquipedia API client (rate limit, gzip) |
| `collector/parse.py` | tournament page, prize pool, roster, points table parsing |
| `collector/teams.py` | team ke alag-alag naam ek team se jodna |
| `collector/db.py` | database tables; `v_stage_standings` view = points table |

## App (`app/`)

Expo (SDK 58) + Expo Router, ek code se Android + iOS + web. Koi server nahi: `collector/publish.py`
database ko static JSON files me likhta hai (`app/public/api/`), app wahi padhta hai.

Screens: Home (live / upcoming / recent), Tournaments (search + tier filter), Teams (search),
Tournament (points table, matches, final results, squads), Team (titles, earnings, squad, history).

```
cd collector && python run.py && python publish.py   # data update
cd app && npm run web                                 # browser me test
```

Phone pe chalane ke liye JSON folder kahin host karna hoga (GitHub Pages / Cloudflare Pages, free)
aur `EXPO_PUBLIC_DATA_URL` me uska URL dena hoga.

## Hosting (free) aur automatic update

- **Live app:** https://gouravverm.github.io/esports-hub/ (phone ke browser me bhi khulta hai)
- **Data (JSON):** https://gouravverm.github.io/esports-hub/api/index.json
- **Automatic:** `.github/workflows/deploy.yml` har 30 minute (aur har push pe) collector chalata hai,
  web app build karta hai aur GitHub Pages pe daal deta hai. Database runs ke beech Actions cache me
  rehta hai; cache khaali ho to `db-seed` release se shuru hota hai.
- **Haath se chalana:** GitHub repo → Actions → "Collect and deploy" → Run workflow.
- **Dhyan:** GitHub public repo me 60 din tak koi commit na ho to scheduled workflows band kar deta hai;
  tab Actions tab me "Enable workflow" dabana hoga (ya ek commit kar dena).

## Aage kya banana hai

1. YouTube channels se live streams aur videos (YouTube Data API, free key)
3. Team logos, player pages, push notifications
4. Ads (AdMob) + premium, phir Play Store / App Store build (EAS)
