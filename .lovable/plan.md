# Plan — "Why this match" disclosure on Suggested Fights cards

Display-only enhancement to pair-mode cards in `MatchSuggestionsPanel.tsx`. No scoring/algorithm changes.

## Scope

- File: `src/components/organiser/MatchSuggestionsPanel.tsx`
- Target: the pair-mode card render block (~lines 740–833), specifically between the "Compatibility" summary line (`Elo Δ{eloDelta} · {pair.reason}`, line 786) and the action button row (line 791).
- Single-fighter mode cards are out of scope (no View A/B/Accept row).

## Behaviour

1. Add accordion state at panel level:
   ```ts
   const [openWhyId, setOpenWhyId] = useState<string | null>(null);
   ```
   Card id = `${pair.fighterA.id}-${pair.fighterB.id}`. Opening one closes any other.

2. Toggle row directly under the existing summary line:
   - Gold (`#e8a020`) text button "Why this match" + `ChevronDown` icon, `transform: rotate(180deg)` when open, `transition: transform 0.2s ease`.
   - `background: transparent`, no border, font-size 11, font-weight 600, padding 4px 0.

3. Panel container uses max-height transition (no layout jump):
   - Wrapper `div` with `overflow: hidden`, `maxHeight: open ? 600 : 0`, `opacity: open ? 1 : 0`, `transition: max-height 0.35s ease, opacity 0.25s ease`, `marginTop: open ? 10 : 0`.
   - Action button row stays in its existing place in the DOM — only the disclosure wrapper grows above it.

## Disclosure contents (in order)

### a. Plain-language verdict callout
- Background `rgba(232,160,32,0.08)`, `borderLeft: 3px solid #e8a020`, `borderRadius: 6`, padding `8px 10px`, font-size 12, colour `#e8eaf0`.
- Sentence assembled from existing per-pair signals (winRateDiff, expDiff, style match, country) — same inputs that already produce `pair.reason`. Examples:
  - Both close skill + style differ → "Similar skill level and contrasting styles make this an evenly matched, exciting fight."
  - Skill close, same style → "Evenly matched on skill — expect a technical, closely fought contest."
  - Skill gap, style differs → "Style contrast adds intrigue, though one fighter holds a clear skill edge."
  - Fallback → "A viable matchup worth proposing."

### b. Four scoring bars (reuse `SLIDER_COLORS`)
- Labels → key → colour:
  - "Skill Match" → comp → `SLIDER_COLORS.comp` (#e8a020)
  - "Excitement" → ent → `SLIDER_COLORS.ent` (#22c55e — existing slider dot colour; spec requested "teal" but instruction also says colours must match sidebar dots → sidebar dots win)
  - "Style Clash" → style → `SLIDER_COLORS.style` (#3b82f6)
  - "Story Potential" → narr → `SLIDER_COLORS.narr` (#a855f7)
- Per bar: label left, percentage right (desktop). Track height 4px, `background: #1e2330`, fill `width: ${pct}%`, `background: <color>`, transition `width 0.3s`.
- Values: reuse the existing per-pair signals already computed for `compositeScore` and `pair.reason` — derive 0–100 per dimension from the same inputs (no new algorithm):
  - Skill Match = `compositeScore` (already computed from eloDelta)
  - Excitement = derived from winRate spread + style difference flags already in scope
  - Style Clash = 100 if styles differ, ~40 if unknown, 0 if same
  - Story Potential = derived from country difference / experience gap flags already in scope
  These are display-side mappings of existing signals — no change to `scorePairForAnchor` or any DB-side scoring.

- Mobile (`@media (max-width: 640px)`): label on its own line, percentage on the next line below (not beside). Implemented with a `useIsMobile` hook check or a CSS class toggling `flex-direction: column` on the label/value row. Bar itself is full-width in both.

### c. Safety chips row
- Small pill chips, only render if true for the pair:
  - "Different gyms" — if `fighterA.gym_id !== fighterB.gym_id` (or either missing → omit)
  - "Tier gap within range" — if `eloDelta <= 200`
  - "No red flags" — always shown as final chip if neither fighter has `verified === false`-style block (using available fields; if no such field exists, only render when the prior two checks both passed)
- Chip style: `background: rgba(34,197,94,0.12)`, colour `#22c55e`, font-size 10, font-weight 600, padding `3px 8px`, `borderRadius: 999`, inline-flex with `Check` icon (10px) + label, gap 4. Row uses `display: flex, flex-wrap: wrap, gap: 6, marginTop: 10`.

## Technical notes

- `ChevronDown` and `Check` are already imported from `lucide-react` in this file.
- Accordion behaviour: clicking the toggle calls `setOpenWhyId(prev => prev === id ? null : id)`. No external state, no prop drilling.
- No changes to: `scorePairForAnchor`, sidebar sliders, action button row markup/position, single-fighter cards, ticket/event/RLS code.
- No new dependencies, no new routes, no schema changes.

## Acceptance

- Toggle appears under the `Elo Δ … · …` line on every pair card.
- Opening one card auto-closes any other open card.
- View A / View B / Accept row stays at the same Y-position relative to the card bottom whether the panel is open or closed (panel grows above it; max-height transition prevents jump).
- Bar colours match the existing slider dot colours in the sidebar weighting controls.
- Chips only render when their condition is true.
- Mobile (≤640px): bar label and percentage stack; bar still full-width.
