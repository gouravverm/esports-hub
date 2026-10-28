"""Turn a Liquipedia tournament page (wikitext) into plain records."""
import re
from datetime import datetime

import mwparserfromhell

TIERS = {"1": "S-Tier", "2": "A-Tier", "3": "B-Tier", "4": "C-Tier", "5": "D-Tier"}


def _clean(value):
    if value is None:
        return None
    text = mwparserfromhell.parse(str(value)).strip_code()
    text = text.replace("&nbsp;", " ").replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def _param(tpl, name):
    return _clean(tpl.get(name).value) if tpl.has(name) else None


def _name(tpl):
    return str(tpl.name).strip().lower()


def _number(text):
    digits = re.sub(r"[^\d.]", "", text or "")
    try:
        return float(digits) if digits else None
    except ValueError:
        return None


def _first_int(text):
    """'5-8' -> 5, '1st' -> 1."""
    m = re.match(r"\s*(\d+)", text or "")
    return int(m.group(1)) if m else None


def _opponent_team(tpl):
    """{{Opponent|team name}} -> 'team name' (player opponents use |team=)."""
    if tpl.has("1"):
        return _clean(tpl.get("1").value)
    return None


def parse_tournament(wikitext):
    """Returns dict with 'info', 'placements', 'rosters', or None if the page
    is not a tournament main page (no Infobox league)."""
    code = mwparserfromhell.parse(wikitext)
    templates = code.filter_templates(recursive=True)

    box = next((t for t in templates if _name(t) == "infobox league"), None)
    if box is None:
        return None

    tier = _param(box, "liquipediatier")
    info = {
        "name": _param(box, "name"),
        "game_raw": _param(box, "game"),
        "tier": TIERS.get(tier, tier),
        "type": _param(box, "type"),
        "organizer": _param(box, "organizer"),
        "series": _param(box, "series"),
        "country": _param(box, "country"),
        "city": _param(box, "city"),
        "mode": _param(box, "mode"),
        "perspective": _param(box, "perspective"),
        "prize_pool": _number(_param(box, "prizepool")) or _number(_param(box, "prizepoolusd")),
        "currency": (_param(box, "localcurrency") or ("usd" if box.has("prizepoolusd") else None)),
        "start_date": _param(box, "sdate") or _param(box, "date"),
        "end_date": _param(box, "edate") or _param(box, "date"),
        "team_count": _number(_param(box, "team_number")),
        "youtube": _param(box, "youtube"),
        "ticker": _param(box, "tickername"),  # short name used in stream titles, e.g. "BGMS S2"
        "abbreviation": _param(box, "abbreviation"),
    }

    # Final standings come from the prize pool table, one Slot per place;
    # a Slot with several Opponents is a tie.
    placements = []
    pool = next((t for t in templates if _name(t) in ("teamprizepool", "prize pool start")), None)
    if pool is not None:
        place = 1
        for slot in pool.params:
            for s in mwparserfromhell.parse(str(slot.value)).filter_templates(recursive=False):
                if _name(s) != "slot":
                    continue
                nested = mwparserfromhell.parse(str(s)).filter_templates(recursive=True)
                teams = [_opponent_team(o) for o in nested if _name(o) in ("opponent", "teamopponent")]
                teams = [t for t in teams if t]
                slot_place = _first_int(_param(s, "place")) or place
                prize = _number(_param(s, "localprize")) or _number(_param(s, "usdprize"))
                for team in teams:
                    placements.append({"place": slot_place, "team": team, "prize": prize})
                place = slot_place + max(len(teams), 1)

    if not placements:  # older pages: {{prize pool slot team |place=5-8 |Team A |Team B}}
        for s in (t for t in templates if _name(t) in ("prize pool slot team", "prize pool slot")):
            slot_place = _first_int(_param(s, "place"))
            prize = _number(_param(s, "localprize")) or _number(_param(s, "usdprize"))
            for p in s.params:
                key = str(p.name).strip()
                if key.isdigit() or re.fullmatch(r"team\d*", key):
                    team = _clean(p.value)
                    if team and slot_place:
                        placements.append({"place": slot_place, "team": team, "prize": prize})

    return {"info": info, "placements": placements, "rosters": parse_rosters(templates)}


def parse_rosters(templates):
    """Squads from both roster formats. Each row: team, player (as shown), page (the player's
    Liquipedia page when the roster links one), role, flag."""
    rosters = []
    # older pages: {{TeamCard |team=X |p1=Name |p1link=Name (Indian player) |p1flag=in |c=Coach}}
    for card in (t for t in templates if _name(t) == "teamcard"):
        team = _param(card, "team")
        if not team:
            continue
        for p in card.params:
            key = str(p.name).strip()
            if re.fullmatch(r"p\d+", key):
                role = "player"
            elif re.fullmatch(r"(s|sub)\d*", key):
                role = "substitute"
            elif re.fullmatch(r"c\d*", key):
                role = "coach"
            else:
                continue
            player = _clean(p.value)
            if player:
                rosters.append({"team": team, "player": player, "page": _param(card, f"{key}link") or player,
                                "role": role, "flag": _param(card, f"{key}flag")})
    # 2025+ pages: {{TeamParticipants |{{Opponent|team |players={{Persons |{{Person|Name|link=..|role=Captain}} }} }} }}
    for block in (t for t in templates if _name(t) == "teamparticipants"):
        for opp in block.params:
            o = next(iter(mwparserfromhell.parse(str(opp.value)).filter_templates(recursive=False)), None)
            if o is None or _name(o) != "opponent" or not o.has("1"):
                continue
            team = _clean(o.get("1").value)
            for person in mwparserfromhell.parse(str(o.get("players").value) if o.has("players") else "").filter_templates(recursive=True):
                if _name(person) != "person" or not person.has("1"):
                    continue
                name = _clean(person.get("1").value)
                staff = (_param(person, "type") or "").lower() == "staff"
                role = (_param(person, "role") or "").lower()
                if staff:
                    role = role or "staff"
                elif role not in ("captain", "substitute", "sub"):
                    role = "player"
                if name and team:
                    rosters.append({"team": team, "player": name, "page": _param(person, "link") or name,
                                    "role": "substitute" if role == "sub" else role, "flag": _param(person, "flag")})
    return rosters


HEADING = re.compile(r"^(=+)\s*(.*?)\s*\1\s*$", re.M)


def _when(text):
    """'August 25, 2023 - 21:50' or '2026-08-31 16:00' -> '2023-08-25 21:50' (IST as written)."""
    if not text:
        return None
    text = text.replace(" - ", " ").strip()
    for fmt in ("%Y-%m-%d %H:%M", "%B %d, %Y %H:%M", "%b %d, %Y %H:%M", "%Y-%m-%d", "%B %d, %Y"):
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d %H:%M" if "%H" in fmt else "%Y-%m-%d")
        except ValueError:
            pass
    return text


def _points_system(tpl):
    """p_kill and p1..pN placement points as written on the table, if any."""
    kill = _number(_param(tpl, "p_kill"))
    places = {}
    for p in tpl.params:
        m = re.fullmatch(r"p(\d+)", str(p.name).strip())
        if m:
            pts = _number(_clean(p.value))
            if pts is not None:
                places[int(m.group(1))] = pts
    return kill, places


TAB_START = re.compile(r"\{\{\s*Tabs dynamic\s*\|(.*?)\}\}", re.S | re.I)
TAB = re.compile(r"\{\{\s*Tabs dynamic/tab\s*\|\s*(\d+)\s*\}\}", re.I)
TAB_END = re.compile(r"\{\{\s*Tabs dynamic/end\s*\}\}", re.I)


def _section_title(wikitext, tpl, own=None):
    """Heading (and dynamic tab, e.g. 'Group A') above the template, plus the
    table's own title: 'Grand Finals', 'League Stage - Day 2 - Overall Standings'."""
    pos = max(wikitext.find(str(tpl)[:200]), 0)
    parts = []
    headings = [m.group(2) for m in HEADING.finditer(wikitext, 0, pos)]
    if headings:
        parts.append(_clean(headings[-1]))
    tabs = list(TAB.finditer(wikitext, 0, pos))
    starts = [m for m in TAB_START.finditer(wikitext, 0, pos)]
    closed = tabs and TAB_END.search(wikitext, tabs[-1].end(), pos)
    if tabs and starts and starts[-1].start() < tabs[-1].start() and not closed:
        names = dict(re.findall(r"name(\d+)\s*=\s*([^|}]+)", starts[-1].group(1)))
        tab_name = _clean(names.get(tabs[-1].group(1)))
        if tab_name:
            parts.append(tab_name)
    if own:
        parts.append(own)
    parts = [p for i, p in enumerate(parts) if p and p not in parts[:i]]
    return " - ".join(parts) or None


def _old_standings(tpl):
    """{{match standings team |pNteam=x |pNresults=place-kills, ...}} (until ~2024)."""
    matches = {}
    for p in tpl.params:
        m = re.fullmatch(r"details(\d+)", str(p.name).strip())
        if m:
            summary = next(iter(mwparserfromhell.parse(str(p.value)).filter_templates()), None)
            if summary is not None:
                matches[int(m.group(1))] = {"played_at": _when(_param(summary, "date")), "map": _param(summary, "map")}
    results, start = [], {}
    for p in tpl.params:
        m = re.fullmatch(r"p(\d+)team", str(p.name).strip())
        if not m:
            continue
        team = _clean(p.value)
        raw = _param(tpl, f"p{m.group(1)}results") or ""
        for no, cell in enumerate(raw.split(","), start=1):
            pk = re.fullmatch(r"\s*(\d+)\s*-\s*(\d+)\s*", cell)
            if pk and team:
                results.append({"match_no": no, "team": team, "place": int(pk.group(1)), "kills": int(pk.group(2))})
        sp = _number(_param(tpl, f"p{m.group(1)}startingpoints"))
        if team and sp:
            start[team] = sp
    return matches, results, start


def _new_match(tpl):
    """{{Match |mapN={{Map|...}} |opponentN={{TeamOpponent|x |mK={{MS|place|kills}}}}}} (2024+)."""
    matches, results, start = {}, [], {}
    for p in tpl.params:
        name = str(p.name).strip()
        m = re.fullmatch(r"map(\d+)", name)
        if m:
            mp = next(iter(mwparserfromhell.parse(str(p.value)).filter_templates()), None)
            if mp is not None:
                matches[int(m.group(1))] = {"played_at": _when(_param(mp, "date")), "map": _param(mp, "map")}
        if not re.fullmatch(r"opponent\d+", name):
            continue
        opp = next(iter(mwparserfromhell.parse(str(p.value)).filter_templates()), None)
        if opp is None or not opp.has("1"):
            continue
        team = _clean(opp.get("1").value)
        for q in opp.params:
            mk = re.fullmatch(r"m(\d+)", str(q.name).strip())
            ms = next(iter(mwparserfromhell.parse(str(q.value)).filter_templates()), None) if mk else None
            if ms is None or _name(ms) != "ms" or not (ms.has("1") and ms.has("2")):
                continue
            place, kills = _number(_clean(ms.get("1").value)), _number(_clean(ms.get("2").value))
            if place is not None and kills is not None:
                results.append({"match_no": int(mk.group(1)), "team": team, "place": int(place), "kills": int(kills)})
        sp = _number(_param(opp, "startingpoints"))
        if team and sp:
            start[team] = sp
    return matches, results, start


def _sum(values):
    nums = [v if isinstance(v, (int, float)) else _number(v) for v in values]
    nums = [n for n in nums if n is not None]
    return sum(nums) if nums else None


def _totals_stage(title, totals):
    return {"title": title, "kill_points": None, "placement_points": {}, "matches": {},
            "results": [], "starting_points": {}, "totals": totals}


def _ffa_standings(tpl):
    """{{FfaStandings |roundN={{Round|title=..}} |{{TeamOpponent|team|r1=..|r2=..}} ...}}"""
    rounds = {}
    for p in tpl.params:
        m = re.fullmatch(r"round(\d+)", str(p.name).strip())
        rt = next(iter(mwparserfromhell.parse(str(p.value)).filter_templates()), None) if m else None
        if rt is not None:
            rounds[int(m.group(1))] = _param(rt, "title")
    totals = []
    for p in tpl.params:
        if not str(p.name).strip().isdigit():
            continue
        opp = next(iter(mwparserfromhell.parse(str(p.value)).filter_templates()), None)
        if opp is None or not opp.has("1"):
            continue
        values = {n: _param(opp, f"r{n}") for n in rounds or range(1, 30) if opp.has(f"r{n}")}
        totals.append({"team": _clean(opp.get("1").value), "total": _sum(values.values()),
                       "rounds": {rounds.get(n) or f"R{n}": _number(v) for n, v in values.items()}})
    return totals


def _league_without_lobby(tpl):
    """{{League standings without lobby |teamN=x |standingsN= 98 , - , 106}}
    or the BGMI variant |pNteam=x |pNresults=19, 30"""
    totals = []
    for p in tpl.params:
        name = str(p.name).strip()
        m = re.fullmatch(r"team(\d+)", name) or re.fullmatch(r"p(\d+)team", name)
        if not m:
            continue
        cells_key = f"standings{m.group(1)}" if name.startswith("team") else f"p{m.group(1)}results"
        cells = [c.strip() for c in (_param(tpl, cells_key) or "").split(",")]
        team = _clean(p.value)
        if team:
            totals.append({"team": team, "total": _sum(cells),
                           "rounds": {f"R{i}": _number(c) for i, c in enumerate(cells, start=1)}})
    return totals


def _wwcd_pp_kp(tpl, team):
    """Row with WWCD count, placement points and kill points (2021-2026 BGMI tables)."""
    pp, kp = _number(_param(tpl, "pp")), _number(_param(tpl, "kp"))
    return {"team": team, "total": _sum([pp, kp]), "wwcd": _number(_param(tpl, "wwcd")),
            "rounds": {"Placement pts": pp, "Kill pts": kp}}


def _overall_standings_table(tpl):
    """{{OverallStandingsTable |{{TeamOpponent|team |wwcd=2 |pp=57 |kp=103}} ...}}"""
    totals = []
    for p in tpl.params:
        if not str(p.name).strip().isdigit():
            continue
        opp = next(iter(mwparserfromhell.parse(str(p.value)).filter_templates()), None)
        if opp is not None and opp.has("1"):
            team = _clean(opp.get("1").value)
            if team:
                totals.append(_wwcd_pp_kp(opp, team))
    return totals


def _league_slot(tpl):
    """{{league standings slot|team=x |results= D1-82, D2-60 |total=142}}"""
    rounds = {}
    for cell in (_param(tpl, "results") or "").split(","):
        m = re.fullmatch(r"\s*(\S+?)-(\d+(?:\.\d+)?)\s*", cell)
        if m:
            rounds[m.group(1)] = float(m.group(2))
    total = _number(_param(tpl, "total"))
    return {"team": _param(tpl, "team"), "total": total if total is not None else _sum(rounds.values()),
            "rounds": rounds}


def parse_stages(wikitext):
    """Every battle-royale points table on a page, one stage per table. Newer
    pages give match-by-match results; older ones only per-day/overall totals."""
    code = mwparserfromhell.parse(wikitext)
    stages = []
    open_league = None  # {{league standings start}} is followed by separate slot templates
    for tpl in code.filter_templates(recursive=True):
        name = _name(tpl)
        if name in ("league standings start", "overall standings table start"):
            open_league = _totals_stage(_section_title(wikitext, tpl, _param(tpl, "title")), [])
            stages.append(open_league)
            continue
        if name == "league standings slot" and open_league is not None:
            slot = _league_slot(tpl)
            if slot["team"]:
                open_league["totals"].append(slot)
            continue
        if name == "overall standings table slot" and open_league is not None:
            team = _param(tpl, "team")
            if team:
                open_league["totals"].append(_wwcd_pp_kp(tpl, team))
            continue
        if name in ("league standings end", "overall standings table end"):
            open_league = None
            continue
        if name == "overallstandingstable":
            stages.append(_totals_stage(_section_title(wikitext, tpl, _param(tpl, "title")),
                                        _overall_standings_table(tpl)))
            continue
        if name == "ffastandings":
            stages.append(_totals_stage(_section_title(wikitext, tpl, _param(tpl, "title")), _ffa_standings(tpl)))
            continue
        if name.startswith("league standings without lobby"):
            stages.append(_totals_stage(_section_title(wikitext, tpl, _param(tpl, "title")),
                                        _league_without_lobby(tpl)))
            continue
        if name.startswith("match standings"):
            matches, results, start = _old_standings(tpl)
            title = _param(tpl, "title")
        elif name == "match":
            matches, results, start = _new_match(tpl)
            title = None
        else:
            continue
        if not results:  # e.g. head-to-head Clash Squad matches
            continue
        kill, places = _points_system(tpl)
        stages.append({
            "title": _section_title(wikitext, tpl, title),
            "kill_points": kill,
            "placement_points": places,
            "matches": matches,
            "results": results,
            "starting_points": start,
            "totals": [],
        })
    return [s for s in stages if s["results"] or s["totals"]]
