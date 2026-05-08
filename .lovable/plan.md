# Fix: Dashboard hangs on "Loading…" and directories appear empty

## Problem

On `/dashboard`, the page is stuck on the `ProtectedRoute` "Loading…" screen, and directory pages (`/gyms`, `/events`, `/fighters`) intermittently show no listings.

The browser console has been emitting:

```
@supabase/gotrue-js: Lock "lock:sb-viioyaafpfmjzgcqzixd-auth-token" was not
released within 5000ms. This may indicate an orphaned lock from a component
unmount (e.g., React Strict Mode). Forcefully acquiring the lock to recover.
```

Network requests *do* succeed when finally released — proving the database has data and RLS is fine — but everything that needs a session is delayed by 5+ seconds, which is why pages look blank or stay on the loading spinner.

## Root cause

In `src/contexts/AuthContext.tsx`, inside the `onAuthStateChange` callback, on the `SIGNED_IN` event we currently call Supabase **synchronously inside the callback**:

```ts
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    ...
    if (event === "SIGNED_IN") {
      const { data: roles } = await supabase.from("user_roles").select(...);
      await supabase.from("analytics_events").insert(...);
    }
    ...
  }
);
```

Supabase's auth client holds a navigator lock for the duration of this callback. Any `supabase.*` call awaited inside the callback re-enters the auth client and deadlocks the lock until the 5-second timeout forcibly releases it. `fetchRoles` is already wrapped in `setTimeout(..., 0)` for exactly this reason; the analytics block was missed.

Symptoms:
- `ProtectedRoute` waits on `loading` from `useAuth` → spinner persists.
- `getSession()` calls in `PlatformStatsStrip`, dashboard hooks, and directory pages stall behind the same lock → empty listings until the lock is forcibly released.

## Fix

Edit `src/contexts/AuthContext.tsx` only. Defer the entire `SIGNED_IN` analytics block with `setTimeout(..., 0)` so it runs *outside* the auth callback (same pattern already used for `fetchRoles`).

Before:
```ts
if (event === "SIGNED_IN") {
  try {
    const { data: roles } = await supabase.from("user_roles")...
    await (supabase.from("analytics_events") as any).insert({...});
  } catch {}
}
```

After:
```ts
if (event === "SIGNED_IN") {
  setTimeout(async () => {
    try {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const role = roles?.[0]?.role || "unknown";
      await (supabase.from("analytics_events") as any).insert({
        user_id: session.user.id,
        event_type: "session_started",
        event_data: { role },
        page: window.location.pathname,
      });
    } catch {}
  }, 0);
}
```

Also remove the now-unnecessary `async` from work that no longer needs awaiting inside the callback (the outer arrow can stay async since `setLoading(false)` is sync).

## Verification

1. Reload `/dashboard` → spinner clears within ~1s and dashboard renders.
2. Reload `/gyms`, `/events`, `/fighters` → directory cards populate immediately.
3. Console no longer shows the "Lock … not released within 5000ms" warning.
4. Sign out / sign in → analytics `session_started` event still inserts (verify in `analytics_events` table).

## Out of scope

No changes to `ProtectedRoute`, `useDashboardData`, directory pages, or RLS. Single-file fix isolated to the auth provider.
