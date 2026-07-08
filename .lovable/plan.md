## Root cause

The recent security fix (`user_roles_gym_owner_self_assignment`) restricted the `user_roles` INSERT policy so that authenticated users can only self-assign the `fighter` role:

```sql
CREATE POLICY "Users can insert only fighter role for themselves"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'fighter'::app_role);
```

But `AuthModal.handleSignUp` still inserts the selected role directly from the client:

```ts
await supabase.from("user_roles").insert([{ user_id: data.user.id, role: selectedRole }]);
```

For any non-fighter signup (coach, organiser, gym_owner — the coach account in the auth log is exactly this) the insert is silently rejected by RLS. The user lands on `/onboarding`, which waits on `freshRoles.length > 0` and shows the spinner forever. That is the "loading circle on login" the user is seeing.

## Fix

Add a server-side RPC that self-assigns a signup role safely, then call it from the sign-up modal. Keep the tight RLS policy — the RPC does the validation.

### 1. Migration: `assign_signup_role` RPC

- `SECURITY DEFINER`, `SET search_path = public`.
- Argument: `_role app_role`.
- Rejects `admin` outright.
- Only allows the caller (`auth.uid()`) to insert a role **for themselves**, and only when they currently have **no roles** (first-time signup). This prevents an existing fighter from later self-escalating to gym_owner via the RPC.
- Uses `ON CONFLICT (user_id, role) DO NOTHING`.
- `REVOKE EXECUTE ... FROM PUBLIC, anon`; `GRANT EXECUTE ... TO authenticated`.

### 2. `src/components/auth/AuthModal.tsx`

Replace the direct `user_roles` insert in `handleSignUp` with:

```ts
const { error: roleError } = await supabase.rpc("assign_signup_role", { _role: selectedRole });
```

On failure, surface a toast (do not silently proceed — otherwise the user hits the same spinner). Sign-in flow untouched.

### 3. `src/pages/Onboarding.tsx` — safety net

If `freshRoles` resolves to an empty array (RPC failed, or profile trigger raced), show an inline error card with a "Retry" button and a link back to `/auth`, instead of an infinite spinner. Cheap defence so this class of bug can never wedge the app again.

## Out of scope

- No changes to the security policies added in the earlier migration (they stay as-is).
- No changes to the sign-up modal UI, onboarding forms, tutorial, or any other flow.
- No changes to `handle_new_user` / `sync_fighter_on_signup` triggers.

## Verification

- Sign up as coach → RPC inserts `(user_id, 'gym_owner'|'coach')` → `/onboarding` renders `CoachLanding`.
- Sign up as fighter → RPC inserts `fighter` → `/onboarding` renders `FighterForm`.
- Sign up as organiser → RPC inserts `organiser` → `/onboarding` renders `OrganiserLanding`.
- Existing users signing in are unaffected.
