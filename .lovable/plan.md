# Fix Organiser Event Routing

Three coordinated changes so organisers reach the right page from each entry point, and the public preview banner only appears during an explicit preview.

## 1. Dashboard → My Events → select event

File: `src/components/dashboard/DashboardOverview.tsx` (line 226)

The My Events list currently routes to `/events/${e.id}` (public page). Change the click handler to route organisers to the manage hub:

```
onClick={() => handleSelect(`/organiser/events/${e.id}`)}
```

This list is already inside the organiser-only "My Events" section, so all entries belong to the current user — always route to the hub.

## 2. Manage Event hub → Preview Public Page

File: `src/pages/organiser/EventManager.tsx` (line 309)

Update the Preview Public Page link to include the preview flag so the banner shows only when arriving via this button:

```
href={`/events/${id}?preview=true`}
```

## 3. Public event page (`/events/:id`)

File: `src/pages/EventDetail.tsx`

a. Read the query param:
```
const [searchParams] = useSearchParams();
const isPreview = searchParams.get("preview") === "true";
```

b. Gate the existing sticky "Previewing your public event page" banner (lines 427–453) on `isOwnEvent && isPreview` instead of just `isOwnEvent`.

c. When `isOwnEvent && !isPreview`, render a small "Manage Event" pill in the top-right of the page (positioned in the hero/top section, not as a full-width banner). Styling per design system:
- Gold pill: background `#e8a020`, text `#0d0f12`, `fontSize: 12`, `fontWeight: 700`, `borderRadius: 999`, padding `6px 14px`, gear/settings icon + label.
- Click → `navigate(\`/organiser/events/${id}\`)`.
- Placed absolutely in the top-right of the banner/hero area (or inline at the right of the title row) so non-creators see a clean public page.

## 4. Explore page

No change required — Explore already links to `/events/${id}` (without `?preview=true`), so per the new rule the banner won't show, and creators get the Manage Event pill from step 3c.

## Out of scope
No route additions, no RLS changes, no changes to matchmaking, fight card, or ticket logic. No styling changes to non-creator views of the public event page.
