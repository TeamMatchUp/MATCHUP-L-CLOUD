

## Fix: Safe access for `link.fighter` and `link.gym` (array vs object edge case)

### Problem
Supabase joins can return the related record as either a single object or an array depending on the foreign key relationship type. If `link.fighter` is returned as an array, then `link.fighter?.user_id` is `undefined`, silently skipping the `profiles.gym_id` update.

### Solution
Add a helper function that normalises `link.fighter` and `link.gym` — if it's an array, take the first element; if it's an object, use it directly. Apply this in both `handleAccept`, `handleDecline`, and the render logic.

### Changes — single file: `src/components/coach/GymRequestsPanel.tsx`

1. Add a helper at the top of the file:
```typescript
function unwrap<T>(val: T | T[] | null | undefined): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val ?? null;
}
```

2. In `handleAccept`: replace direct `link.fighter?.user_id` / `link.fighter?.name` / `link.gym?.name` accesses with `unwrap(link.fighter)?.user_id`, etc.

3. In `handleDecline`: same unwrap for `link.fighter` and `link.gym`.

4. In the JSX render: same unwrap for display fields (name, discipline, weight_class, stance, gym name).

No database or migration changes needed.

