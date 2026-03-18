

## Plan: Fix JoinGymButton hooks order + Update Dashboard nav fallback

### 1. Fix `src/components/gym/JoinGymButton.tsx` — Hooks ordering violation

The early return on line 18 runs before `useQuery` (lines 21, 34) and `useMutation` (line 49), violating React's Rules of Hooks.

**Fix**: Move all hooks to the top of the component, before any conditional returns. Use `enabled` flags to prevent queries from running when not needed. Move the early return to after all hooks.

```
Component order:
1. useAuth()
2. useToast()
3. useQuery (fighter-profile) — enabled: !!user && isFighter
4. useQuery (gym-link) — enabled: !!fighterProfile
5. useMutation (requestJoin)
6. Early returns (no user, not fighter, no profile)
7. Render
```

### 2. Update `src/components/Header.tsx` — Dashboard click handler

The handler already exists and works correctly. Only change: update fallback from `"/dashboard"` to `"/coach/dashboard"` and use `.maybeSingle()` instead of selecting all rows.

- Line 86: change `.eq("user_id", user.id)` to add `.maybeSingle()`
- Line 88: change fallback from `"/dashboard"` to `"/coach/dashboard"`

No other files affected. No database changes needed.

