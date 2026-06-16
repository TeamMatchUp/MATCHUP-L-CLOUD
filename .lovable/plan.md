## Make the coach fighter profile optional

Currently the coach onboarding step (`CoachStep` in `src/pages/Onboarding.tsx`) renders gym fields and a required fighter profile section in a single form, and submission always creates/updates a `fighter_profiles` row for the coach. We'll make the fighter profile an explicit opt-in and offer a way to add it later from Account Settings.

### 1. Onboarding — add a Yes/No gate

In `src/pages/Onboarding.tsx`, inside `CoachStep`:

- Add state `isFighter: "yes" | "no" | null` (default `null`).
- After the existing gym section (Gym Name, Postcode, Disciplines, Roster Size), render the question:
  > "Are you also an active fighter?"
  with two buttons: **Yes** and **No** (styled like existing role choices — gold accent, no border, Bebas heading).
- Only render the "YOUR FIGHTER PROFILE" block (DOB, weight class, walk-around, etc.) when `isFighter === "yes"`.
- The primary submit button stays disabled until `isFighter` is chosen and (if yes) the existing required fields (`weightClass`, `discipline`) are filled. If `isFighter === "no"`, only gym fields are required.

### 2. Submit behaviour

Update `handleSubmit` in `CoachStep`:

- Always: create the gym row (unchanged).
- If `isFighter === "no"`: skip the entire `fighter_profiles` select/insert/update block. Call `markOnboardingComplete`, track `onboarding_completed { role: "coach", fighter_profile: false }`, and call `onComplete()` so the user is routed to `/coach/dashboard` as normal.
- If `isFighter === "yes"`: keep the existing flow (existing-check, insert with `user_id` + `created_by_coach_id: user!.id`, or update) exactly as it is now.
- Adjust validation guards so the `weightClass || discipline` check only runs when `isFighter === "yes"`.

No schema changes. No changes to fighter or organiser onboarding paths.

### 3. Post-signup "Add fighter profile" from Account Settings

`src/pages/AccountSettings.tsx` currently has no fighter profile entry point. Add one, visible only when the current user has the `coach` or `gym_owner` role AND no `fighter_profiles` row exists for their `user_id`:

- A small card titled "Fighter profile" with copy: "Add a fighter profile so you can be put forward for events as an active fighter."
- A single **Add fighter profile** button (gold accent).
- Clicking opens a modal (`min(90vw, 960px)`, `max-height: 88vh`, no border, shadow only) containing a reused form.

To avoid duplicating the form, extract the existing fighter-profile fields and `handleSubmit` body from `CoachStep` into a new shared component `src/components/onboarding/CoachFighterProfileForm.tsx` that takes `{ userId, onSaved }` and performs the same insert/update against `fighter_profiles`. `CoachStep` renders it inline (when Yes); `AccountSettings` renders it inside the modal. The component returns the same row shape with `created_by_coach_id: userId` and `user_id: userId`.

Once a row exists, hide the "Add fighter profile" card (or replace it with a link to `/dashboard` / their fighter profile) so it's not shown twice.

### Files touched

- `src/pages/Onboarding.tsx` — Yes/No gate, conditional rendering, conditional submit logic in `CoachStep`.
- `src/components/onboarding/CoachFighterProfileForm.tsx` — new shared form extracted from `CoachStep`.
- `src/pages/AccountSettings.tsx` — new "Fighter profile" card + modal for coaches/gym owners without a fighter profile row.

### Out of scope

- No edits to `fighter_profiles` schema or NOT NULL constraints.
- No edits to fighter or organiser onboarding flows.
- No changes to RLS policies or matchmaking logic.
