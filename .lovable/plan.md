# Event Manage Hub Redesign

Rebuild `/organiser/events/:id` as a polished hub page matching the reference screenshot, using the Obsidian Gold design system. Existing sub-pages (fight card builder, matchmaking, tickets, fighters, etc.) remain untouched — the hub only links to them.

## 1. Public event page → "Manage Event" button (`src/pages/EventDetail.tsx`)

- Find the existing organiser-only action button on the public detail page that currently reads "Edit Event".
- Rename to **Manage Event** and route to `/organiser/events/:id` (already gated by `isOwnEvent`, so visible only to the event creator).

## 2. Hub layout (`src/pages/organiser/EventManager.tsx`)

Replace the current page body with a hub view. Keep the existing data hooks/queries (event, slots, tickets, organiser preferences) — only the rendering changes. The current slot-edit / add-fight modals stay mounted but become accessible from the linked sub-pages, not from the hub itself.

### Top bar
- Left: `← Back to Events` link → `/organiser/events` (or dashboard).
- Center/left of body: event banner thumbnail (180×120), title (Bebas Neue, uppercase, clamp font), `Published` / `Draft` status pill, meta row (date · city · venue), short description.
- Right of body: action buttons — **Preview Public Page** (ghost) → `/events/:id`, **Share Event** (ghost), **Edit Event Details** (gold filled) → opens existing `EditEventDialog`.

### KPI strip (4 cards, single row, equal width)
1. Tickets Sold — `sold / total`, gold progress bar, % label.
2. Est. Revenue — `£X / £Y` projected, green progress bar.
3. Matched Fights — confirmed slots / total slots, gold progress bar.
4. Open Slots — remaining unfilled slots, red progress bar, % label.

Derived from existing `tickets` and `event_fight_slots` queries already in this file.

### Main grid (2 cols, `1fr 1fr`, gap 20)

**Left column**
- **Event Progress** card — checklist: Event details, Build fight card, Matchmaking, Tickets & pricing, Publish event. Each row has a check/in-progress indicator and a small count (e.g. `12 / 12`, `7 / 12`). Footer: overall % complete with gold progress bar.
- **Recent Matchups** card — list of up to 4 fight slots: fighter A vs fighter B, weight class, records, compatibility % + status badge for confirmed/pending; TBD slots show a `Find Match` button → `/organiser/events/:id/matchmaking` (existing route). Footer: `N open slots remaining` + gold **Go to Matchmaking** CTA.

**Right column**
- **Fight Card Overview** card — three rows (Main Card, Undercard, Prelims) each with `filled / total` + gold progress bar. Header button **Edit Fight Card** → existing fight card builder route (keep current path; no logic changes).
- **Ticket Sales** card — list of tier rows (name, price, sold/total, %). Below: donut/legend reusing existing chart if present, otherwise a simple legend list. Footer row: Est. Revenue + Average Order Value. Header button **Manage Tickets** → opens existing `ManageTicketsPanel`.

### Bottom row (3 equal cols, gap 20)
- **Event Information** — date, venue, event type, weight classes, rules, capacity, dress code, age restriction. Header `Edit` button opens `EditEventDialog`.
- **Financial Summary** — Total Revenue, Total Expenses (from existing data or `0` placeholder if not stored), Net Profit (Est.). Sub-list of top revenue sources (Ticket Sales, Sponsorships, Other) with £ + %.
- **Recent Activity** — feed pulled from existing activity sources (recent confirmations, ticket sales, slot inserts, event publish timestamp). Each row: icon, title, subtitle, relative time.

### Fight card builder back link
- In the existing fight card page (the page `Edit Fight Card` links to — already present), add a `← Back to Event Overview` button at the top that navigates to `/organiser/events/:id`. No other changes there.

## 3. Design tokens (apply throughout)

- Page bg `#080a0d`, card surface `#111318`, raised `#181c24`, hover `#1e2330`.
- Accent `#e8a020`; gold dim fill `rgba(232,160,32,0.12)` for progress tracks and active pills.
- Text primary `#e8eaf0`, secondary `#8b909e`, muted `#555b6b`.
- No borders on cards/inputs. Card shadow: `0 2px 8px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.04)`. Consistent radius `16`, padding `20`.
- Headings: Bebas Neue uppercase, letter-spacing 0.04em. Body: Inter.
- Status badge colors: published/confirmed `#22c55e` on `rgba(34,197,94,.12)`; pending `#f59e0b` on `rgba(245,158,11,.12)`; draft/declined neutral.

## 4. Out of scope (do NOT touch)

- Matchmaking algorithm, scoring, presets.
- RLS policies, Supabase schema.
- Existing sub-pages (fight card builder body, matchmaking panel internals, tickets panel internals, fighters list).
- Routing — only the button label/destination in `EventDetail.tsx` changes; `/organiser/events/:id` route stays.

## Files to edit

- `src/pages/organiser/EventManager.tsx` — full body redesign, reusing existing queries and dialog components.
- `src/pages/EventDetail.tsx` — rename organiser-only `Edit Event` → `Manage Event`, point to `/organiser/events/:id`.
- The existing fight card builder page (linked from `Edit Fight Card`) — add a `Back to Event Overview` button at the top. (Will identify exact file in build mode; likely the matchmaking/fight-card section currently inside `EventManager.tsx` will be split into a dedicated sub-route or already exists as a tab — if it's currently inline, the hub replacement preserves that view behind the `Edit Fight Card` link as a sectioned anchor.)
