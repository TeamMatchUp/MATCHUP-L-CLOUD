# Fighter Detail Page Redesign

The current `/fighters/[id]` page is a narrow mobile single-column with a dark blurred banner. The references show a wide two-column desktop layout. The references are rendered in light mode (white bg / blue accent) — **the project stays in dark mode with the gold accent**. I'll port the *composition* from the references onto the existing dark palette.

## Colour rules (non-negotiable)
- Page bg `#080a0d`, card surface `#111318`, inset surface `#181c24`, hover `#1e2330`.
- Single accent = gold `#e8a020` (replaces every blue in the mockups). Never orange, never blue.
- Text primary `#e8eaf0`, secondary `#8b909e`, muted `#555b6b`.
- Success `#22c55e` (wins / green bars), destructive `#ef4444` (losses / red bars), warning `#f59e0b`.
- No borders on cards, panels, inputs. Depth via the design-system shadow spec only.
- Bebas Neue for headings/numbers, Inter for body.

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Fighters                                          │
├─────────────────────────────────────────────────────────────┤
│ HERO CARD (#111318, network constellation watermark)        │
│  [Avatar 140px]  "THE SPECIALIST" (gold italic)  [+ FOLLOW] │
│                  JORDAN COLE  (Bebas ~56px)                 │
│                  🇬🇧 GB · Lightweight · MMA                  │
│                  [14 W][2 L][0 D][8 KOs][88% WIN%] pills    │
│                  🏆 Bamma LW Champion  🏆 Cage Warriors…    │
│                  ──────────────────────────────────────     │
│                  HT 5'10"  RCH 72"  WT 155  STANCE …  GYM … │
│                  [IG][TW][YT][TT][…]                        │
├──────────────────────────────────┬──────────────────────────┤
│ [TOTAL] [PRO] [AMATEUR]          │  PERFORMANCE ANALYTICS   │
│                                  │  [Overview|Striking|     │
│ ┌──────┬──────┬──────┬────────┐ │   Activity|Radar]        │
│ │ 14   │  2   │  0   │   8    │ │  (tab-specific content)  │
│ │ WINS │LOSSES│DRAWS │KO+TKO  │ │                          │
│ └──────┴──────┴──────┴────────┘ │                          │
│                                  │                          │
│ PRO RECORD SUMMARY  [Finish 36%] │  FIGHTER PROFILE         │
│        14 · 2 · 0                │  ┌────────┬────────┐    │
│  Wins by method | Losses by …    │  │ Height │ Weight │    │
│                                  │  │ Reach  │ Stance │    │
│ [ALL][KOs][SUBS][DECS]           │  │ Age    │ Nat.   │    │
│ 2026 ───────────────── 1W-0L     │  └────────┴────────┘    │
│  ▸ Rashid Khan … KO R2           │                          │
│ 2025 ───────────────── 3W-0L     │                          │
└──────────────────────────────────┴──────────────────────────┤
│ RELATED FIGHTERS                                            │
│ [card][card][card][card]                                    │
└─────────────────────────────────────────────────────────────┘
```

Collapses to single column under `lg` (1024px).

## Hero card
- Card surface `#111318`, rounded 16px, padded 32px, design-system card shadow, MU watermark + faint constellation bg at low opacity.
- Avatar 140px circle with gold ring `rgba(232,160,32,0.5)` + soft gold glow.
- Nickname: gold `#e8a020` italic uppercase small, above name.
- Name: Bebas Neue ~56px `#e8eaf0`.
- Stat pills row (5 chips, inset `#181c24`, no border): W (green), L (red), D (muted), KOs (gold-tint), WIN% (gold-tint). Bebas number ~28px + 10px uppercase label.
- Title pills: gold-tint fill `rgba(232,160,32,0.12)`, gold text, Award icon.
- Divider, meta row: HT / RCH / WT / STANCE / AGE / GYM as `LABEL value` pairs.
- Social icons row (existing wiring).
- `+ FOLLOW` top-right: outline gold default, filled gold when following — reuses existing follow logic.

## Left column
- `Total / Pro / Amateur` segmented control, gold active fill `rgba(232,160,32,0.12)` with `#e8a020` text.
- 4 KPI cards: Wins / Losses / Draws / KO+TKO. `#111318` surface, Bebas Neue value, uppercase label, no border.
- Pro Record Summary: big `W · L · D` centered, Finish Rate gold-tint pill top-right, two-column Wins/Losses breakdown with thin bars (green for wins, red for losses) — reuses existing `MethodRow`.
- Fight filter chips `[ALL][KOs][SUBS][DECS]` — gold active.
- Fight history grouped by year, year header + `wW-lL` right-aligned, rows collapsible (existing behaviour preserved).

## Right column
- Analytics card with 4 inline tabs (Overview / Striking / Activity / Radar), **gold active underline**.
  - Overview: 3 large tiles (Win Rate, Finish Rate, Decision Rate) + 4 small tiles (KOs / TKOs / SUBs / DECs) + Last 8 Results row (W/L circles, green/red).
  - Striking: Wins-by-method green bars + Losses-by-method red bars + Avg Finish Round + KO Rate tiles.
  - Activity: Fights-per-year bar chart (gold bars) + Career Fights / Years Active tiles + Record by Promotion list.
  - Radar: existing recharts radar, stroke/fill in gold.
- Fighter Profile card below: 2-col grid for Height / Weight / Reach / Stance / Age / Nationality. Each cell inset `#181c24`, label uppercase muted, value Inter semibold `#e8eaf0`.

## Related fighters
Existing query/section rendered as a 4-card row under the main grid using current explore-card styling.

## Files
- `src/pages/FighterDetail.tsx` — rebuild markup/layout; keep all existing data fetching, follow logic, analytics tracking, profile completion bar, and titles query untouched.
- No schema, route, or RLS changes.
