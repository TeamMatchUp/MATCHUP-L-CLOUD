## Part A — Hero polish

**A1. AppIcon bounding box.** Shrink the invisible padding around the shield so "MATCH EASY" and "FIGHT HARD" sit against the icon's visible edges.
- Inspect `src/assets/icon-black.svg` / `icon-white.svg` viewBox — if the artwork has empty padding, tighten the viewBox to hug the shield.
- In `HeroSection.tsx`, wrap `AppIcon` in a `leading-none inline-flex` span, and if any residual padding remains apply a small negative-margin correction (`-mx-[0.35em]`) so gap is driven only by the `h1`'s `gap-*` class.
- Verify by DOM inspect: highlighted box hugs shield; visible gaps equal on both sides.

**A2. Hero CTA drop shadow.** Add subtle shadow to primary CTA in both auth states (`Create free account`, `Explore MatchUp`):
- Apply `box-shadow: 0 6px 20px rgba(0,0,0,0.45), 0 0 24px rgba(232,68,68,0.18)` via a `hero-cta-shadow` utility or extend the `hero` button variant.

## Part B — Features & fixes

**B1. Follow/Unfollow button.** `useFollow` hook exists. Add `FollowButton` component and render on:
- `FighterDetail.tsx` hero (next to Share) — target `fighter.user_id`.
- `GymDetail.tsx` hero — target `gym.coach_id`.
- Optimistic UI; hidden when viewing self or target user id is null.

**B2. Socials URL on profile.**
- Migration: add `social_url text` to `fighter_profiles`.
- `EditableProfilePanel.tsx`: single URL input, zod URL validation.
- `FighterDetail.tsx`: small link icon when populated; hidden otherwise.

**B3. Record Accuracy Policy — corrected rewrite.**
Remove badge examples and verification-tier language from `RecordAccuracyPolicy.tsx`. Replace with an accurate description of how MU Score is calculated for the two data sources:

> **How your MU Score is calculated**
> Every fight you log affects your MU Score. Fights confirmed through a Matchup event use your opponent's verified rating to calculate the result precisely, since both fighters' scores are being measured live and simultaneously.
>
> Self-reported historical fights also move your MU Score, but they use a neutral assumption about opponent strength — we can't verify an opponent's real rating at a past point in time. The amateur/pro weighting in our Elo engine still applies, so your score still moves; the platform just treats these results more conservatively until you compete through Matchup.

Also cover: fighters cannot invent opponents, coaches enter historical fights, and only Matchup-event results are marked as event-confirmed. Drop all `FightRecordBadge` imports/usages here.

**B4. "MU Score" (Elo) on fighter profile.** Display `elo_rating` on `FighterDetail.tsx` hero labelled `MU Score` (DB column stays `elo_rating`). Add short tooltip pointing to the Record Accuracy Policy.

**B5. Leaderboard modal from MU Score.**
- Button next to MU Score opens modal with `Global` and `Local (gym)` tabs.
- Shared helper `src/lib/leaderboard.ts` returning `rank, id, name, avatar, elo_rating`.
- Global = all fighters sorted by `elo_rating desc`; Local = same but filtered to `gym_id`.
- Auto-scroll to and highlight viewed fighter's row.

**B6. Explore Fighters ranking toggle.** Add "Rankings" toggle in `Explore.tsx` fighters section — sorts by `elo_rating desc` and shows rank number on each `FighterCard`. Reuses B5 helper.

**B7. Dashboard tutorial — fighter steps.** In `DashboardTutorial.tsx` append two fighter-only steps: incoming fight requests, and expanded Explore step copy that explicitly names fighters, gyms and events.

## Part C — Under-18 privacy protections

Scope: any role (fighter, coach, organiser). DOB lives on `profiles`.

### C0. Schema (migration)
- `profiles`: add `date_of_birth date`, `responsible_person_name text`, `responsible_person_confirmed_at timestamptz`, `responsible_person_confirmed_version int`.
- Backfill `profiles.date_of_birth` from `fighter_profiles.date_of_birth` where linked.
- Helper: `public.is_minor(_uid uuid) returns boolean` — STABLE, SECURITY DEFINER, `search_path = public`.
  **Explicit null-handling: when `profiles.date_of_birth IS NULL`, return `true`.** Unknown age = treat as minor (fail-safe).
  ```sql
  SELECT CASE
    WHEN date_of_birth IS NULL THEN true
    WHEN age(current_date, date_of_birth) < interval '18 years' THEN true
    ELSE false
  END
  FROM public.profiles WHERE id = _uid;
  -- If no profile row: return true.
  ```

### C1. Live age
Frontend `computeAge()` already exists; wire all age displays and gates off `profiles.date_of_birth` via `is_minor` for server-side and computed age client-side.

### C2. Under-18 restrictions (client + server)
- Client (`FighterDetail`, `FighterCard`, `GymDetail`, `Explore`, `TopFightersSeekingSection`): force placeholder avatar, hide address/postcode/region/lat-lng.
- `EditableProfilePanel`: hide photo upload control when minor.
- Server: exclude minors from proximity search. Add a `public.fighter_profiles_public` view (or update existing) that null-outs `latitude/longitude/postcode/region/profile_image` when `is_minor(user_id)`. Matchmaking proximity switches to this view.

### C3. Responsible-person confirmation gate
- RPC `record_responsible_person(_name text, _version int)` (SECURITY DEFINER).
- `ResponsiblePersonModal.tsx` mirrors `MatchmakingConsentModal` — blocking. Fields: named person + attestation checkbox.
- Wire into `Onboarding.tsx` immediately after signup **only when a supplied DOB indicates under-18**; enforce as route gate in `Dashboard` layout for existing minor accounts whose DOB is on file.
- Self-attestation only (interim). Log accepted-risk in `@security-memory`.

### C4. Privacy policy update
`PrivacyPolicy.tsx`: rename `Children's Privacy` → `Age Restrictions`. Cover: placeholder avatar (no photo), no address/location displayed and excluded from location-based search/matching, responsible-person confirmation (self-attested, interim).

### C5. DOB collection for coach/organiser onboarding
`Onboarding.tsx`:
- Add a required DOB field to `CoachLanding` **and** `OrganiserLanding` — reuse the existing `DOBPicker` component. Sits above the choice buttons.
- The `Skip for now` and each choice button save `profiles.date_of_birth` before navigating; if DOB is empty, buttons are disabled with helper text ("Date of birth is required").
- Fighter path already writes DOB to `fighter_profiles`; also mirror to `profiles.date_of_birth` in the same submit.
- Result: every new signup — fighter, coach, organiser — populates `profiles.date_of_birth`.

### C6. Staged backfill for pre-existing null-DOB accounts
`is_minor` returns `true` when DOB is null, so restrictions apply automatically until DOB is supplied. The user-facing flow is **staged**, never funneling adults into guardian-naming by mistake:

1. **DOB prompt first.** On login for any account where `profiles.date_of_birth IS NULL`, a blocking `DateOfBirthPrompt` modal appears (mounted in the `Dashboard` layout, same pattern as `MatchmakingConsentModal`). It only asks for DOB and writes to `profiles.date_of_birth`.
2. **Re-evaluate after save.** Once DOB is stored, `is_minor` is re-queried:
   - Adult (18+) → modal closes, restrictions drop, normal access resumes. **No guardian modal ever shown.**
   - Minor (<18) → the `ResponsiblePersonModal` (C3) opens next, gating further use until the named-person attestation is submitted.
3. The `ResponsiblePersonModal` never opens on its own for a null-DOB account — it is only reached after DOB has been provided and confirmed to be under 18.

## Part D
Deferred pending exact RLS error text — no action this task.

## Delivery order
Independent commits so each part can be confirmed: A1 → A2 → B1..B7 → C0 schema+backfill → C1..C6 → policy copy (B3, C4).
