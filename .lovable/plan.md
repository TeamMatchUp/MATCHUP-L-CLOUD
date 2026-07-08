## Goal

Rework `/onboarding` into short role-specific flows launched after sign-up, and add a one-time spotlight tutorial on first dashboard visit. Sign-up modal is unchanged.

## 1. Database

Two migrations:
- **Already applied:** `profiles.has_seen_tutorial boolean NOT NULL DEFAULT false`.
- **New:** `ALTER TYPE public.weight_class ADD VALUE IF NOT EXISTS 'unspecified' BEFORE 'strawweight';` — fighter onboarding will insert `weight_class = 'unspecified'`, so new profiles render as "Unspecified" in My Profile / public views until the user picks a real class. Matchmaking / filters can exclude this value later; no such filter is added in this task.

`onboarding_completed` already exists — unchanged.

## 2. Rewrite `src/pages/Onboarding.tsx`

Keep the shell (role resolution via `user_roles`, `ROLE_PATHS`, `motion` wrapper, `markOnboardingComplete` helper). Replace the three per-role forms:

### `FighterForm`
Written into `fighter_profiles` using the exact field names `MyProfilePanel` / `EditableProfilePanel` already read.

Required:
- Date of birth → `date_of_birth`
- Height (cm) → `height`
- Walk-around weight (kg) → `walk_around_weight_kg`
- Stance (Orthodox / Southpaw / Switch) → `stance`
- Level toggle (Amateur / Pro) — **only initialises the matching record block to `0-0-0` on first insert**; submitting again after the row exists never overwrites `amateur_*` / `record_*` columns
- Country → `country` via `SearchableCountrySelect`

Optional (each with inline "Skip" / "Add" toggle):
- Bio → `fighter_profiles.bio`
- Gym affiliation → search reused from current `FighterForm`; on select, insert `fighter_gym_links` pending row + `create_notification` RPC to gym coach (identical to today)

Removed from onboarding: weight class, discipline, records, postcode (still editable from My Profile). First insert supplies `weight_class = 'unspecified'` (new enum value from §1).

On submit: upsert `fighter_profiles`, `markOnboardingComplete`, `navigate("/fighter/dashboard")`.

### `CoachLanding` (coach AND gym_owner)
Choice screen, no forms:
- "Add your first gym" → mark complete → `/register-gym`
- "Add your first event" → mark complete → `/organiser/create-event`
- "Skip for now" (ghost button) → mark complete → `ROLE_PATHS[activeRole]`

Current combined gym-plus-fighter form and "are you also a fighter?" gate are deleted.

### `OrganiserLanding`
- "Add your first event" → mark complete → `/organiser/create-event`
- "Skip for now" → mark complete → `/organiser/dashboard`

### Role routing
`primaryRole` computation stays as-is; gym_owner reuses `CoachLanding`.

## 3. New `src/components/tutorial/DashboardTutorial.tsx`

Lightweight spotlight overlay, no external library.

- Reads target rects via `document.querySelector('[data-tutorial="<key>"]')`, recomputes on `resize` / `scroll`.
- Fixed backdrop with a cut-out inner element sized to the target rect, using an outset `box-shadow` (`0 0 0 9999px rgba(0,0,0,0.7)`) and a soft gold ring. Backdrop captures pointer events.
- Tooltip card positioned below the rect (flips above if it would overflow, clamps to viewport). Contains copy, step counter (1/3), "Skip tutorial" ghost, and "Next" (steps 1-2) / "Got it" (step 3).
- Props: `role: AppRole | null`, `open: boolean`, `onDismiss: () => void`, `onOpenMobileSidebar?: () => void`.
- **Step resolution** — on open, computes the ordered step list from role:
  - Step 1 target `explore` — spec copy
  - Step 2 target `my-content` — spec copy
  - Step 3 target `account` — spec copy
  Then filters to steps whose `[data-tutorial]` target exists in the DOM. If the resulting list is empty, calls `onDismiss()` immediately without rendering anything (so `has_seen_tutorial` still flips to `true`).
- **Single close path** — Escape key, backdrop click, "Skip tutorial", and advancing past the final step all call one internal `close()` which invokes `onDismiss` exactly once. Nothing bypasses the persistence call.
- **Mobile** — if `isMobile` and `onOpenMobileSidebar` is provided, calls it on step 1 and step 2 so the sidebar-anchored targets are visible before spotlighting.

## 4. Mount tutorial in `src/pages/Dashboard.tsx`

- Add `useQuery(["tutorial-flag", user.id])` reading `profiles.has_seen_tutorial` with `refetchOnMount: "always"` and `staleTime: 0` so a "Replay" from settings sees the fresh `false`.
- When `data?.has_seen_tutorial === false` and `activeRole` is resolved, render `<DashboardTutorial role={activeRole} open onDismiss={handleDismiss} onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />`. `setMobileSidebarOpen` is already local to `Dashboard.tsx` and is passed in as a prop — no context/global.
- `handleDismiss` updates `profiles.has_seen_tutorial = true` for the current user, then `queryClient.setQueryData(["tutorial-flag", user.id], { has_seen_tutorial: true })` so it hides immediately.

## 5. `data-tutorial` anchors

`src/components/dashboard/DashboardSidebar.tsx`:
- Compute `myContentKey` per role: `fighter → "my-profile"`, `coach` / `gym_owner → "manage"` (Manage accordion whose children include My Gyms / My Events / My Profile — matches spec copy), `organiser → "events"`.
- Extend `renderNavItem` to accept an optional `data-tutorial` value and set it on the outer `button`/`Link` in both expanded and collapsed variants.
- Wire `data-tutorial="explore"` onto the Explore accordion trigger and `data-tutorial="my-content"` onto the resolved key.
- Add `data-tutorial="account"` to the Settings accordion trigger (expanded) and the collapsed `Link to="/account/settings"`.

`src/components/Header.tsx`:
- Add `data-tutorial="account"` to the account `DropdownMenuTrigger` button so Header-bearing routes also have an anchor.

## 6. `src/pages/AccountSettings.tsx`

Add a small "Guided tour" section above Notification Preferences with a "Replay dashboard tour" button:
1. `await supabase.from("profiles").update({ has_seen_tutorial: false }).eq("id", user.id)`
2. `queryClient.invalidateQueries({ queryKey: ["tutorial-flag", user.id] })` so Dashboard's next mount reads the fresh flag
3. `navigate(ROLE_PATHS[activeRole] ?? "/dashboard")`

## Files touched

- `supabase/migrations/<applied>.sql` — has_seen_tutorial (done)
- `supabase/migrations/<new>.sql` — add `unspecified` weight_class enum value
- `src/pages/Onboarding.tsx` — rewrite forms + landings, keep shell
- `src/components/tutorial/DashboardTutorial.tsx` — new
- `src/pages/Dashboard.tsx` — mount tutorial, fetch flag, pass sidebar setter
- `src/components/dashboard/DashboardSidebar.tsx` — add `data-tutorial` anchors
- `src/components/Header.tsx` — add `data-tutorial="account"`
- `src/pages/AccountSettings.tsx` — add "Replay dashboard tour" action

## Out of scope

Sign-up modal UI, gym-claim flow, existing create-event / register-gym workflows, RLS policies, matchmaking logic — untouched.
