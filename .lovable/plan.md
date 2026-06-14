## Plan: 8 UI/UX fixes

### 1. Organiser back banner on public event page
**File:** `src/pages/EventDetail.tsx`
- Detect when current user is the event organiser (logic already present).
- Instead of (or in addition to) the existing auto-redirect, render a persistent sticky banner at the top of the page: "← Back to Manage Event" linking to `/organiser/events/:id`.
- Remove the auto-redirect for organisers so they can actually use the preview, since the banner now provides return navigation. Gold accent (#e8a020), full-width, sits above the hero, z-index above page content.

### 2. Delete fight slot confirmation
**Files:** `src/pages/organiser/EventManager.tsx` (and/or wherever delete-slot handler lives)
- Wrap the existing delete handler in an `AlertDialog` (shadcn) with copy: "Are you sure you want to delete this fight slot? This cannot be undone." with Cancel + Delete (destructive) buttons.
- Trigger dialog from the existing trash icon; only call the actual delete mutation on confirm.

### 3. Gyms Near You widget grid constraint
**Files:** `src/components/dashboard/DashboardOverview.tsx`, `src/pages/Dashboard.tsx`
- Currently `GymsNearYouWidget` is rendered below `DashboardOverview` as a standalone block (full width).
- Move the widget *inside* the DashboardOverview grid as a `Cell` so it inherits identical card shape/padding/radius/min-height, occupying one grid column like the other widgets.
- Remove the standalone render in `Dashboard.tsx`.

### 4. Mobile single-line headers (global)
**Files:** primary heading sites — `src/pages/Dashboard.tsx`, `src/components/dashboard/DashboardOverview.tsx`, `src/pages/Explore.tsx`, `src/pages/EventDetail.tsx`, `src/pages/organiser/EventManager.tsx`, plus section titles in overview widgets.
- Apply consistent rules to large display headings:
  - `whitespace-nowrap overflow-hidden text-ellipsis`
  - `clamp()` font sizes (e.g. `clamp(1.25rem, 5vw, 2rem)` for page titles)
  - For Bebas Neue display headers, shrink to fit container width on mobile.
- Audit and fix wrapping titles only; do not touch body copy.

### 5. Explore tabs single line on mobile
**File:** `src/pages/Explore.tsx`
- Tab pill container: `flex flex-nowrap` with reduced gap/padding on mobile.
- Pills: `px-3 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm`, `whitespace-nowrap`.
- Ensure container has `overflow-x-auto` fallback but at typical mobile widths (≥320px) the three labels fit without scroll.

### 6. Fight card VS / weight label vertical centering
**File:** `src/pages/EventDetail.tsx` (fight slot render block)
- Restructure each matchup row as a 3-column flex/grid: `[Fighter A | Center | Fighter B]` with `items-center` on the row and the centre column using `flex flex-col items-center justify-center` to perfectly centre VS + weight label between the two name columns at all breakpoints.

### 7. Tickets section horizontal alignment
**File:** `src/pages/EventDetail.tsx` (ticket card section)
- Refactor each ticket row to a single horizontal flex container with `items-center` so tier name, price, quantity selector, and CTA share a single baseline.
- Remove any per-element top/bottom margins that cause stagger; use gap only.

### 8. Find Fights / Add Fight modal — mobile fixes
**File:** `src/components/organiser/AddFightModal.tsx` (and the dialog body containing Cancel / Create Proposal — likely `ProposeMatchDialog.tsx` or `FighterSearchDropdown.tsx`).
- (a) Make the dialog body scrollable on mobile: ensure outer `DialogContent` uses `max-h-[88vh] overflow-y-auto` (already global) and the inner panel does NOT set its own fixed height that clips content.
- (b) Move Cancel + Create Proposal buttons out of any `sticky`/`fixed` footer wrapper into the natural bottom of the scroll flow (a non-sticky footer row inside the scrollable content).
- (c) Add a "Coach-nominated only" filter toggle/chip to the filter bar in `FighterSearchDropdown.tsx`, querying `coach_event_nominations` for the current event and filtering the fighter list to that set. Matches the existing filter present in the fight editing view (reuse the same query pattern).

### Technical notes
- No schema or RLS changes.
- No matchmaking algorithm changes.
- Reuse existing shadcn primitives (`AlertDialog`, `Dialog`, `Button`).
- All styling stays within Obsidian Gold tokens: bg `#080a0d` / cards `#111318` / accent `#e8a020`, Bebas Neue headings, no borders on cards.

### Out of scope
- Any backend or policy changes.
- Restructuring routes.
- Changes to matchmaking scoring.
