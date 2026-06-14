## Redesign Analytics Page — Tabbed Layout, Obsidian Gold

Refactor the three role-specific analytics components into a shared tabbed shell. Keep `DashboardAnalytics.tsx` as the role router (unchanged role detection) — it already picks Coach / Fighter / Organiser. Rewrite each role view to the same skeleton:

```text
Analytics                                  [page title — Bebas Neue]
┌──────────┬──────────┬──────────┬──────────┐
│ KPI 1    │ KPI 2    │ KPI 3    │ KPI 4    │  ← gold values, progress bars where applicable
└──────────┴──────────┴──────────┴──────────┘
[ Overview ] [ Matchmaking ] [ Performance ]  ← gold filled pill on active
─────────────────────────────────────────────
(only active tab content rendered)
```

### Shared building blocks (new)
`src/components/analytics/` directory:
- `AnalyticsShell.tsx` — page title + KPI strip + tab row + content slot. Props: `title`, `kpis: KPI[]`, `tabs: { value, label, content }[]`.
- `KpiCard.tsx` — charcoal card (`#111318`), shadow-only, Bebas Neue value in gold `#e8a020`, Inter label, optional progress bar.
- `AnalyticsCard.tsx` — uniform charcoal surface wrapper used inside tab content (same radius/padding/shadow as manage event hub cards).
- `AnalyticsTabs.tsx` — pill row (`rounded-full`, active: `bg-[#e8a020] text-[#0d0f12]`, inactive: `bg-[#181c24] text-[#8b909e]`), single-section rendering, no accordion.

KPI strip layout: `grid grid-cols-2 md:grid-cols-4 gap-3`, always visible regardless of active tab.

### Coach / Gym Owner (`CoachAnalytics.tsx` → rewrite `CoachAnalyticsV2`)
Applies to both `gym_owner` and `coach` (already handled by `isCoachOrOwner` upstream — no change).

- KPI strip: Total Fighters · Active Fighters · Roster Win Rate (with progress bar) · Pending Proposals.
- Tab 1 **Overview**: Roster summary card (count by weight class / discipline pulled from existing query) + Upcoming Events list with roster involvement.
- Tab 2 **Matchmaking**: Proposal acceptance rate (progress bar), Fights Booked card with 30 / 60 / 90 day toggle (pill segmented control), Avg Time to Confirm.
- Tab 3 **Performance**: Win/Loss/Draw by fighter (Recharts stacked bar), Finish rate by fighter (Recharts bar). Palette: gold `#e8a020`, charcoal `#181c24`, muted `#555b6b`.
- **Remove entirely:** Lead source breakdown + Lead pipeline sections (and any helper queries used only by them).
- Drop the embedded `OrganiserAnalyticsShared` block at line 947.

### Organiser (`OrganiserAnalytics.tsx` → rewrite `OrganiserAnalyticsShared`)
- KPI strip: Total Events · Fight Slots Filled % (progress) · Pending Proposals · Fighters Confirmed (progress).
- Tab 1 **Overview**: Event summary cards — one per event, shows slots filled %, ticket sales %, published status badge.
- Tab 2 **Matchmaking**: Three-row summary card — Suggestions Generated / Confirmed / Declined — plus acceptance rate and avg composite score as KPI mini-cards underneath.
- Tab 3 **Events**: Per-event slot breakdown table (event · total slots · filled · open · confirmed).
- Preserve `embedded` prop (still used elsewhere? — only by Coach view which is being trimmed; safe to keep prop but stop rendering inside Coach).

### Fighter (`FighterAnalytics.tsx` → rewrite `FighterAnalyticsV2`)
- KPI strip: Total Fights · Win/Loss Record (e.g. `12-3-1`) · Upcoming Bouts · Pending Proposals.
- Tab 1 **Overview**: Recent fight history list (opponent, result badge, date, event name) — sourced from `fights` table (authoritative).
- Tab 2 **Matchmaking**: Proposals Received · Acceptance Rate (progress) · Suggested Matches Pending.

### Data sources
Reuse the existing Supabase queries already inside each component (fighter_records for W/L/D, fights table for history/methods, event_fight_slots for slot fill, match_proposals/match_suggestions for matchmaking metrics). No schema changes, no new queries unless an existing one is being removed alongside the dead lead-pipeline code.

### Design tokens (all three views)
- Page bg `#080a0d`, cards `#111318`, raised insets `#181c24`, hover `#1e2330`.
- Accent gold `#e8a020`, dim gold fill `rgba(232,160,32,0.12)` for progress tracks.
- Card shadow: `0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)`.
- Headings/KPI values: Bebas Neue, letter-spacing 0.04em. Body/labels: Inter.
- No border lines anywhere. Equal heights for side-by-side cards via `h-full` inside `grid`.
- Charts: Recharts (already used in project), gold bars on charcoal background, axis text `#8b909e`.

### Out of scope
- Role detection logic in `DashboardAnalytics.tsx`.
- `AdminAnalytics.tsx` page.
- `GymAnalyticsStrip.tsx` (separate widget).
- Any RLS / matchmaking scoring logic.
