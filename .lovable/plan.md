Two small UI fixes in `src/components/organiser/MatchSuggestionsPanel.tsx`.

## 1. Make the panel fully scrollable on all screens

Currently the root wrapper uses `maxHeight: 92vh` with `overflow: hidden`, and relies on two inner columns (`overflowY: auto`) to scroll. On mobile, the layout switches to `flex-col`, the two columns stack, and their individual `overflowY: auto` no longer produces a usable scroll area — content gets clipped and unreachable.

Change:
- On the root wrapper (line ~329), keep `maxHeight: 92vh` but switch `overflow: hidden` → `overflow-y: auto` on mobile, and remove the per-column inner scroll on mobile so the whole panel scrolls as one. Concretely: keep desktop two-column inner scroll behaviour (md+), but on mobile (`<md`) let the outer container scroll and let the inner columns size to content (`overflowY: visible`, no fixed height).
- Implementation: add Tailwind responsive classes — outer `overflow-hidden md:overflow-hidden overflow-y-auto` style swap via className, and inner columns get `md:overflow-y-auto` only (drop inline `overflowY: auto`).

No behavioural or algorithm changes.

## 2. Reset preset button

In the PRESET block (line ~398) add a "Reset" button rendered inline with the preset pills (or immediately below), visible only when `selectedPreset !== null` OR when sliders differ from defaults.

Behaviour on click:
- `setSelectedPreset(null)`
- Reset sliders to the panel's default starting state: `setComp(50); setEnt(50); setStyle(50); setNarr(50);`
- `setSettingsChanged(false)`

Styling: matches existing pill style but uses muted text (`#8b909e`) with a small `RefreshCw` icon (already imported), no background, on hover background `#1e2330`. Sits at the end of the preset pill row, wrapping naturally.

No other changes.