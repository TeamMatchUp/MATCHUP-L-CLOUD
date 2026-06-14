## Two targeted changes — event-creator-based routing/visibility

### 1. `src/pages/EventDetail.tsx` (line 280)
Remove the role requirement from `isOwnEvent` so any logged-in user who created the event is treated as the owner.

```ts
// before
const isOwnEvent = !!(user && isOrganiser && event.organiser_id === user.id);
// after
const isOwnEvent = !!(user && event.organiser_id === user.id);
```

No other logic in this file changes. The existing branches (`isOwnEvent && isPreview` → banner, `isOwnEvent && !isPreview` → Manage Event pill) continue to work unchanged.

### 2. `src/components/dashboard/DashboardEvents.tsx` (line 100)
Route to the manage hub when the logged-in user created the event, regardless of role.

- Import `useAuth` from `@/contexts/AuthContext` (same hook used by the parent `Dashboard.tsx`).
- Inside the component, pull the current user: `const { user } = useAuth();` and derive `const currentUserId = user?.id;`.
- Update the `Link` `to` prop:

```tsx
to={event.organiser_id === currentUserId ? `/organiser/events/${event.id}` : `/events/${event.id}`}
```

The `isOrganiser` prop stays on the component (still used elsewhere — e.g. the empty-state / header logic for organiser vs fighter views). Only the per-event link condition swaps from `isOrganiser` to the creator check.

### Out of scope
No changes to Explore, EventManager, RLS, or any other routing/permission logic.
