# Five small UI/nav fixes

All changes are presentation-only — no business logic, no routing additions, no schema changes.

## 1. Remove duplicated profile from Dashboard Overview
**File:** `src/components/dashboard/DashboardOverview.tsx`

The `StickyHeader` (lines ~331–396) currently renders avatar + username + follower/following counts inside the Overview content area, duplicating the sidebar profile card.

- Remove the LEFT block (avatar, name, follower/following buttons).
- Keep the mobile hamburger button (so mobile users can still open the sidebar).
- Keep the RIGHT block (search + Quick Actions).
- Remove now-unused `profileData`, `followerCount`, `followingCount`, `initials`, and `networkModal` state/queries if no longer referenced elsewhere in the file. (`profileData?.full_name` is still used in `OverviewHeader`'s welcome line — keep that query, just drop the avatar/counts UI.)

## 2. "Quick Actions" label visible on mobile
**File:** `src/components/dashboard/DashboardOverview.tsx` (`QuickActionsButton`, line ~50)

Currently when `compact` (mobile) the button renders icon-only. Update so the text "Quick Actions" (or a shortened "Actions") shows next to the icon on mobile as well, matching desktop styling at a smaller font size.

## 3. Logo click-through to homepage
**File:** `src/components/dashboard/DashboardSidebar.tsx` (lines ~280 and ~293)

Wrap both `<img src={iconWhite}>` (collapsed) and `<img src={logoDark}>` (expanded) in a `<Link to="/">` from `react-router-dom`. Preserve existing sizing and layout.

## 4. Rename Roster → "My Fighters" and move into Manage accordion
**File:** `src/components/dashboard/DashboardSidebar.tsx` (lines ~94–110, coach/owner menu)

Change:
```
{ key: "manage", ... children: [
  { key: "gyms", label: "My Gyms" },
  { key: "events", label: "My Events" },
  { key: "my-profile", label: "My Profile" },
]},
{ key: "roster", label: "Roster", icon: Users },
```
to:
```
{ key: "manage", ... children: [
  { key: "roster", label: "My Fighters" },
  { key: "gyms", label: "My Gyms" },
  { key: "events", label: "My Events" },
  { key: "my-profile", label: "My Profile" },
]},
```
The `roster` section key is unchanged so existing routing/rendering in `Dashboard.tsx` still works. Update the section title map in `Dashboard.tsx` (line 129: `roster: "Fighter Roster"`) to `"My Fighters"` for consistency.

## 5. Explore Map button label on desktop only
**File:** `src/pages/Explore.tsx` (lines ~420–433)

Update the Map toggle button so on desktop it shows the `MapPin` icon plus the text "Map", and on mobile it stays icon-only. Widen the button from fixed `width: 40` to `width: auto` with horizontal padding when desktop, keep 40×40 square on mobile. Use the existing `isMobile`/responsive check used elsewhere in the file.

---

### Out of scope
No changes to data fetching, RLS, routes, or matchmaking logic.
