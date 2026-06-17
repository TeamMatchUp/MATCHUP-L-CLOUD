# Date-based event visibility (no scheduler, no enum changes)

Filter logic: an event is "past" when `date < today` (local midnight). All filters use a single helper to keep the rule consistent.

## 1. Public listings — exclude past events

Add `.gte("date", today)` (where `today = new Date().toISOString().slice(0,10)`) alongside the existing `status = 'published'` filter on these queries:

- **`src/pages/Explore.tsx`** line 159 — `["explore-events"]` query. Add `today` to the queryKey.
- **`src/pages/Events.tsx`** lines 31–48 — public events listing query. Add `today` to the queryKey.
- **`src/components/dashboard/DashboardOverview.tsx`** line 148 — `GlobalSearch` events query. Add `.gte("date", today)`.
- **`src/components/landing/TwoSidedSection.tsx`** line 42 — published events count. Add `.gte("date", today)` so the homepage stat reflects upcoming/live only.

Single event pages (`EventDetail.tsx`) and organiser-scoped queries (My Events, FightCardManager, EventManager, Matchmaking, OrganiserPendingMatches, OrganiserOverviewHero) are **not** changed — creators always see their full data, and a direct deep-link to a past event still resolves (so anyone with the URL can view it, but it won't be promoted in listings).

## 2. Organiser "My Events" — Upcoming vs Archive tabs

**File:** `src/components/dashboard/DashboardEvents.tsx` (used by Dashboard → "My Events", coach + organiser).

- Split incoming `events` by date using `new Date(e.date) >= startOfToday()` → `upcoming[]` vs `archive[]`.
- Add a shadcn `<Tabs>` above the search box with two triggers:
  - `Upcoming & Live Events` (default, shows count badge).
  - `Event Archive` (shows count badge).
- The existing search input filters within whichever tab is active. The current list rendering is reused inside each `<TabsContent>`.
- Empty states per tab:
  - Upcoming empty + no archive → existing "haven't created any events" CTA.
  - Upcoming empty + archive present → "No upcoming events. Check your archive or create a new one."
  - Archive empty → "No archived events yet."
- All edit/manage links inside archived cards continue to work — archive is a view filter, not a permission change.

**Also apply** the same tab split to `src/pages/OrganiserDashboard.tsx` (lines 127–223) so the standalone organiser dashboard's `MY EVENTS` section behaves identically. Same tab structure, same date split, reusing the existing card markup inside each `TabsContent`.

## What is intentionally NOT changed

- `event_status` enum — untouched.
- No scheduled function, no DB trigger, no status writes.
- Organiser detail pages, fight-card editor, ticket panel, matchmaking — all continue to surface past events fully.
- RLS policies — untouched.
