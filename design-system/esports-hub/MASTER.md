# Esports Hub — Design System (MASTER)

Built with **UI UX Pro Max** (v2.15.0) on 2026-10-28. This file is the source of truth; screen-specific
overrides go in `pages/<screen>.md`. Code tokens live in `app/src/lib/theme.ts`.

**Product:** Cricbuzz-style score app for Indian BGMI / Free Fire esports. Mobile first (Android + iOS), dark,
data-dense: live events, points tables, match results, team profiles. Audience: Indian Gen-Z players and fans,
quick checks during live matches.

## Sources (what came from the skill, what was decided here)

| Area | Source |
|---|---|
| Style | `style` domain: **Dark Mode (OLED)**; product domain (Sports): secondary **Vibrant & Block-based**, dashboard style **Performance Analytics** |
| Colours | `color` domain: **Gaming** palette (neon purple + rose) + **Arcade** "score green" |
| Typography | `--design-system` esports pairing: **Russo One** + **Chakra Petch** (mood: gaming, competitive, esports) |
| Table UX | `ux` domain: tables overflow on mobile → horizontal scroll or card layout |
| RN rules | `react-native` stack: Pressable, hitSlop for small targets, press feedback, context only for theme |
| Rejected | `--design-system` picked "3D & Hyperrealism" (WebGL, high cost) and landing-page hero patterns — wrong fit for a data app on budget phones, not used |
| Decided here | Per-game accent colours, rank colours (gold/silver/bronze), numeric font choice, density tokens |

## Style

Dark Mode (OLED) base with Vibrant block accents.
- Near-black surfaces, cards one step lighter; no white backgrounds.
- Colour is used for **meaning** (live, winner, rank, game), not decoration.
- Minimal glow only on the LIVE badge. No 3D, no parallax, no autoplay video.
- Data first: tables and numbers are the hero, not images.

## Colour tokens

**Revised 2026-10-28** after the taste-skill review (owner's decision): violet is the **brand mark only**
(app icon, wordmark, splash), never on screens. On screens colour goes on **data**, in the **game's own
hue**; selections (tabs, switchers) are brightness + a 2px white underline; the one primary action is an
inverted white pill. Ground is true black; cards are one lightness step up with no border or shadow.

| Token (`theme.ts`) | Hex | Use |
|---|---|---|
| `bg` | `#000000` | app ground (true black, OLED) |
| `card` | `#111111` | cards (no border, no shadow) |
| `cardAlt` | `#2A2A2A` | nested panels, avatars, pressed state |
| `border` | `#1A1A1A` | the 1px rule under tab rows |
| `rule` | `#1F1F1F` | table row rules (no zebra) |
| `text` | `#FFFFFF` | primary text, selected tab |
| `muted` | `#B4B4B4` | secondary text |
| `faint` | `#949494` | meta, table headers, unselected tabs |
| `primary` / `onPrimary` | `#FFFFFF` / `#000000` | the one primary action (inverted pill) |
| `brand` | `#7C3AED` | logo / wordmark only |
| `live` | `#F43F5E` | LIVE badge |
| `good` | `#3FC07A` | prize money |
| `gold` / `silver` / `bronze` | `#F5C04A` / `#C3CBD8` / `#D08A52` | ranks 1-3, champion |
| `gameColors.bgmi` | `#FF8A1F` (soft `#7A4613`) | BGMI data hue: leader mark, Finish-vs-Fight bars, badge |
| `gameColors.freefire` | `#FFB020` (soft `#7A5814`) | Free Fire data hue |
| `gameColors.pubgm` | `#F5C04A` (soft `#75602A`) | PUBG Mobile data hue |

Rules: colour on data and status only (≤ 3% of pixels); never meaning in colour alone (rank also has the
number, LIVE also has the word). Normal text ≥ 4.5:1.

## Typography

| Role | Font | Size / weight |
|---|---|---|
| Display (screen titles, tournament name) | Russo One | 22 / 400 |
| Heading (section titles, card titles) | Russo One | 16-18 / 400 |
| Body | Chakra Petch | 14 / 500, line-height 20 |
| Caption / meta | Chakra Petch | 12 / 500 |
| Numbers in tables | Chakra Petch | 13-14 / 700, tabular figures |

Minimum 12px for any text. Respect system font scaling.

## Spacing, shape, motion

- Density: **dense/dashboard** (skill dial 8): spacing scale 4 / 8 / 12 / 16 / 24 / 32.
- Screen gutter 16; card padding 16 (12 in tables); section gap 24.
- Radius: cards 12, pills 20, badges 6.
- Motion (dial 3, subtle): press feedback 100ms opacity/background, screen transitions native. No bouncy
  overshoot on data tables. Respect reduced motion.

## Components

- **Tabs / game switcher:** underline tabs on a 1px rule, selected = white label + 2px white line, 44px
  targets; the row scrolls sideways on phones and wraps from 600px.
- **Tournament card:** badges row (LIVE, tier, type) → name (heading font) → meta line → prize (score) + winner (gold).
- **Points table:** rank in rank colour, team avatar + name, numeric columns right-aligned in tabular
  figures, 1px row rules (no zebra), leader row marked by a 3px edge in the game hue. Columns shown only
  when data exists; on phones a column that repeats one value for every team is dropped, never the name.
- **Match card:** "Match N · Map" + time, WWCD line, tap to expand full results.
- **Team avatar:** initials in a circle until official logos are licensed.
- **Icons:** one vector family (Ionicons via `@expo/vector-icons`), outline style, 20/24 sizes. No emoji icons.

## Pre-delivery checklist (from the skill, app version)

- [ ] No emoji as icons; one icon family and style
- [ ] Every tappable element ≥ 44×44 (hitSlop for small ones) with pressed feedback
- [ ] Text contrast ≥ 4.5:1 on dark surfaces
- [ ] Tokens only — no raw hex in screens
- [ ] Safe areas respected; lists not hidden behind tab bar
- [ ] Tested at 375px width; reduced motion; large system text
