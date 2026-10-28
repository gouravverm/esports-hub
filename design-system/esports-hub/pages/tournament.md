# Tournament screen — design direction (override of MASTER.md)

**Status: built 2026-10-28** in `app/src/app/tournament/[id].tsx`. Owner chose: game colour on data,
violet for the brand mark only. Inspector on the production build: **0 FAIL** at 1440 / 768 / 390;
one WARN kept on purpose (font-count counts Chakra Petch 500 and 700 as two faces; the screen uses two
families). Before: 2 FAIL, 2 WARN. Screenshots: `.taste-skill/before/`, `.taste-skill/after/`.

Still open: the nav bar is an empty black band when the screen is opened directly (no back button);
the 22px prize figure is louder than the 14px finding line that answers the question; tournament JSON
is ~280 KB for big events (squads + every match), worth splitting before launch.

Made with **taste-skill** v2.1.5 (app-screen run, review mode) on 2026-10-28.
Style dealt: **true-black-flat** (seed 2027216429), kind `community`, theme dark, `--keep palette,type`.
Before-state measurements: `.taste-skill/before/` (inspector at 1440 / 768 / 390).

## The screen's one question and its finding

- **Question:** "Who won (or who is leading) this tournament, and by how much?"
- **Finding (first line under the title):** e.g. "Nebula Esports won by 21 pts · 4 WWCD in 18 matches".
  Built from the Grand Finals rows: leader total − 2nd total; leader's WWCD and matches.
- **Most frequent job:** open the latest stage's table, then a match's full result.

## Style: true-black-flat, adapted to this brand

- Ground `#000` (events / media, OLED). Cards `#111`, nested panels `#2a2a2a`. **No borders or shadows on
  cards**; elevation is a lightness step only.
- Text `#fff`; secondary `#b4b4b4`; meta `#949494` (two greys that read apart).
- **Colour on data only, ≤ 3% of pixels.** The one data hue is the **game's own colour**
  (BGMI `#FF8A1F`, Free Fire `#FFB020`) on the main data element: the leader's row mark and the
  "finish vs fight" bars below. Gold/silver/bronze stay for ranks 1-3 only.
- **Selections are not coloured.** Tabs: label `#949494` → `#fff` with a 2px white underline on a full-width
  1px `#1a1a1a` rule. Stage switcher: same treatment, horizontally scrollable, never purple pills.
- The one primary action (if any, e.g. "Watch live") is an inverted **white 36px pill with black text**.

### Conflict with MASTER.md (needs your call)

taste-skill bans violet/indigo accents and the accent on tabs/nav; UI UX Pro Max chose neon violet
`#7C3AED` as the brand fill. Proposal: keep violet only as the **brand mark** (app icon, wordmark,
splash), and use the game colour as the data hue on screens. If you want violet on screens, it can stay,
but the inspector's palette rule must be allowed for it (`--allow`) and noted.

## Layout (detail pattern: object header + one grid)

1. **Object header card** (no duplicate title in the nav bar; the nav bar shows only back + a short name):
   game badge · tier, the 22px name, the finding line, then **one meta line** in `#949494`:
   "10 Aug – 6 Sep 2026 · Delhi NCR · NODWIN Gaming · 26 teams". Prize as the one larger figure on the
   right ("₹1.01 Cr prize pool"). The 6-row key–value list goes; it pushed the table below the fold.
2. **Underline tabs** on a 1px rule: Points table · Matches · Final results · Squads.
3. **Stage switcher** as a second, smaller underline row; titles shortened editorially
   ("Grand Finals", "Playoffs", "Week 1", "Week 2"), the finals first. Long generated titles
   ("League - Overview - Super Weekend Leaderboard") are cut to their last meaningful part.
4. **Points table** — the biggest block, it answers the question:
   - no zebra rows, no header band; rows split by 1px `#161616` rules; 44px rows;
   - header 12px `#949494` sentence case; numbers right-aligned in tabular figures, flush with headers;
   - on desktop the table is **max ~760px wide** and pairs with a side panel (below); on phones it is
     full width with the identity column taking the slack;
   - the leader row carries the game-hue mark (a 3px left edge), ranks 1-3 in gold / silver / bronze.
5. **Signature element — "Finish vs Fight" bars** (only a battle-royale app has this): for each team, one
   horizontal bar of total points split into **placement points** and **kill points** (two tones of the
   game hue, 2px seam), sorted by total. It shows *how* each team scored — survival vs aggression.
   Desktop: the side panel beside the table (6-column grid: table 4, bars 2). Phone: under the table,
   top 8 with "View all". Data exists already: per match `place` and `kills` × the stage's points system.
6. **Matches tab:** one row per match: "Match 18 · Erangel", time on the right, WWCD team + kills on line 2;
   tap opens the full 16-team result. Newest first.

## Phone (390px)

- Header card: name, finding, meta line; prize stays; no kebab needed (no actions yet).
- Tabs and stage switcher scroll sideways **inside their own row with 16px end padding** (fixes the
  inspector's `edge-text` FAIL).
- First table row must start in the top 60% of the screen (it is at ~63% now).

## Fixes from the inspector (before state)

| Check | Finding | Fix |
|---|---|---|
| FAIL contrast | Title measured on a `#f2f2f2` web body behind the header | Set the web body / navigation background to the ground colour |
| FAIL edge-text | Stage pills run to 0px from the right edge | End padding on the scroll row; shorter stage titles |
| WARN hero-void | 1020×420 empty band on desktop (table stretched to 1400px) | Table max ~760px + Finish-vs-Fight panel beside it |
| WARN font-count | Counts Chakra Petch 500 and 700 as two faces | Defensible: two families (Russo One for titles only, Chakra Petch for everything else) |
| Sizes | 9px avatar initials | Floor 11px; avatars 28px |

## The three changes that move this screen most

1. **Answer the question first:** finding line under the name, one meta line instead of the 6-row list,
   table up to the first screen.
2. **Colour off the chrome, onto the data:** underline tabs and stage switcher in white/grey, no zebra,
   game hue on the leader and on the bars.
3. **Add the Finish vs Fight panel** beside / under the table, so the desktop width is used and the screen
   shows something no other sports app has.

## Not changed

Data, routes, tabs and their content, Russo One + Chakra Petch, rank colours, team avatars.
