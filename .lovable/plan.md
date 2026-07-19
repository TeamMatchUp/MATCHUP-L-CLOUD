## Scope

Simplify the organiser matchmaking UI. No changes to scoring math, presets, safety-gate thresholds, or any Elo/data logic — Part 1 (Elo replay + unverified-opponent flag) is explicitly deferred to a separate task.

Only `src/pages/Matchmaking.tsx` (and small helper subcomponents inside it) are changed. `matchmakingEngine.ts` is untouched.

## New flow

```text
Open matchmaking
        │
        ▼
Guided walkthrough (default entry)
  Step 1 — Card type (5 presets, one-at-a-time, plain-language)
  Step 2 — Weight class / discipline  (Skip)
  Step 3 — Experience tier / region / availability  (Skip)
        │
        ▼
Simplified suggestions list
  - vs layout, names, weight/discipline, W-L-D
  - Compatibility bar + label ("Strong match" / "Good match" / "Viable")
  - Warning icons only (tooltip on hover)
  - "Why this match" expandable — reasoning + full warning explanations
  - Accept / View A / View B
  - Search bar (unchanged)
        │
        ▼
"Refine match" toggle  →  reveals current left-column sliders + filters
```

## Changes

### 1. Walkthrough component (new, inside `Matchmaking.tsx`)
- `walkthroughStep` state: `0` (preset) → `1` (weight/discipline) → `2` (extra filters) → `done`.
- Full-panel card, one question visible at a time, Back / Skip / Next.
- Step 1 shows the 5 presets as large stacked options with the existing `PRESETS[key].label` plus a one-line description (new copy, per preset).
- Step 2 & 3 wire to existing state (weight class filter, discipline is already event-locked; experience tier, region, availability toggle — currently only exposed via the free-text quick filter; add lightweight explicit selects here that feed the same filtering).
- On finish/skip, sets `walkthroughDone = true` and renders the suggestions list. A "Start over" link re-opens the walkthrough.

### 2. Simplified `MatchCard`
- Remove: numeric composite %, per-dimension `DimensionBar` rows, inline warning text, `#rank` prefix (keep list order only).
- Keep: names (linked), weight/discipline badge, W-L-D, vs layout, Accept / View A / View B.
- Add: compatibility bar (visual only) + label derived from `match.composite`:
  - ≥ 0.75 → "Strong match"
  - ≥ 0.55 → "Good match"
  - else → "Viable match"
- Warnings become icon-only chips (AlertTriangle + tooltip with short name). Full text moves into "Why this match".
- "Why this match" panel is expanded-by-default (collapsible) and contains: `match.explanation` plus one paragraph per active flag using an existing `FLAG_COPY` map (Debut, Welfare, Same Gym is already filtered out by the engine so won't appear, plus a placeholder for future unverified-opponent flag wired through `match.flags` — no logic added, just copy ready if the flag string appears).

### 3. "Refine match" panel (opt-in)
- Single toggle button above the suggestions list: `Refine match` ⇄ `Hide refine`.
- When on, renders the existing left-column sliders + Quick Filter block in a collapsible section above the list. Default: off.
- Removes the always-visible left column entirely; layout becomes a single centred column.

### 4. Safety-critical icons
- Always render icons for: `Debut`, `Welfare`, and (future) `Unverified Opponents`, `No Competitive History` if their flag strings appear in `match.flags`. Never gated behind Refine. Full text in "Why this match".

### 5. Copy additions (inside the file)
```ts
const PRESET_BLURBS: Record<string, string> = {
  action_night:     "High-energy card built for finishes and crowd reaction.",
  championship:     "Even, high-stakes matchups suited to title fights.",
  grassroots:       "Balanced pairings for developing fighters.",
  ko_special:       "Prioritises knockout artists and stoppage rates.",
  undefeated_clash: "Pits unbeaten records against each other for narrative.",
};

const FLAG_COPY: Record<string, string> = {
  "Debut": "One or both fighters have no logged fights. Coach acknowledgement required before confirming.",
  "Welfare": "Notable experience gap. Review with both coaches to confirm suitability.",
  "Unverified Opponents": "Rating is based partly or entirely on fights against opponents not found on Matchup. Verify strength with fighter/coach.",
  "No Competitive History": "Fighter has no verified competitive record on Matchup — treat rating as provisional.",
};
```

## Out of scope
- Elo replay engine, E_a = 0.50 rule, unverified-opponent flag logic (deferred).
- Any change to `matchmakingEngine.ts`, preset weights, safety-gate thresholds, or scoring math.
- `MatchSuggestionsPanel.tsx` (per-slot suggestions inside `EventManager`) — the request is specifically about the event-level `/events/:eventId/matchmaking` page.

## Files touched
- `src/pages/Matchmaking.tsx` — rewritten layout, new walkthrough, simplified `MatchCard`, opt-in refine panel.
