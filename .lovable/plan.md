# Add Non-Member Fighter to Matchmaking

## Understanding

When an organiser is filling a bout slot (Add Fight / Find Matches / Find Fights in `AddFightModal`), they currently choose fighters only from the Matchup roster via `FighterSearchDropdown`. You want a third option — **Add Non-Member** — that lets them enter a fighter who isn't on the platform yet, drops that fighter into the bout, and emails them an invite to create an account and claim the profile.

The good news: the plumbing for claim-on-signup already exists. `fighter_profiles` has `email`, `user_id`, and `created_by_coach_id` columns, and a `sync_fighter_on_signup` trigger auto-links a fighter profile to a new auth user when their signup email matches an unclaimed profile (and assigns the `fighter` role). We just need to create the unclaimed profile from the organiser and send the invite email.

## Scope

- Add a **Non-Member** entry point inside `AddFightModal` alongside "Add Manually" / "Suggested".
- New form: **Full name**, **Age**, **Email** (all required). Optional: weight class + discipline (pre-filled from slot when known so the profile is useful downstream).
- On submit:
  1. Look up existing `fighter_profiles` by email (case-insensitive). If one exists, reuse it — don't duplicate.
  2. Otherwise insert a new `fighter_profiles` row: `name`, `email`, DOB derived from age (Jan 1 of `currentYear - age`), `weight_class`, `discipline`, `visibility = 'unlisted'`, `verified = false`, `created_by_coach_id = <organiser user id>`, `user_id = null`.
  3. Use that fighter as one side of the bout (respecting `oneTBA` / `bothTBA` / new-slot logic already in `AddFightModal`).
  4. Send an invite email via a new `send-fighter-invite` edge function.
- Invite email content: "You've been added to [Event] on Matchup by [Organiser]. Create your account to claim your profile and confirm the bout." Contains a signup link (`/auth?invite=<email>`) prefilling the email.
- When the invitee signs up with that email, the existing `sync_fighter_on_signup` trigger fires: it links `user_id`, assigns the `fighter` role, and notifies them of gym/bout context. No new claim logic needed.
- Also create an in-app `notifications` entry for the organiser confirming the invite was sent.

## Explicitly out of scope

- No changes to matchmaking scoring or suggestions (non-members are only usable via the manual/non-member path, not AI suggestions).
- No changes to existing `FighterSearchDropdown`, RLS, or roles beyond what's above.
- No bulk invite. One fighter per submission.
- No SMS. Email only.
- Auth email templates unchanged — this is an app (transactional) email.

## Technical notes

**UI** — `src/components/organiser/AddFightModal.tsx`
- Add `"nonmember"` to the `Step` union and a third `optionCard` in the menu ("Add Non-Member Fighter", icon `UserPlus`, copy: "Invite a fighter who isn't on Matchup yet").
- New `nonMember` step: name / age (number 16–70) / email inputs + optional weight class + discipline selects + `paramFields` for slot params (only when creating a new slot, matching manual behaviour).
- Side selector when `scenario === "bothTBA"` or creating a new slot (which side does the invitee take, or "Side A" default). For `oneTBA`, the empty side is auto-picked.
- Submit handler mirrors `handleManualSave` — same INSERT vs UPDATE branches on `event_fight_slots`, same `notifyBoutParties` for the on-platform side (organiser/coach of the anchor fighter), then triggers the invite email.

**Data** — no schema migration required. `fighter_profiles` already has every column we need. Add a lookup+insert helper in the modal (no new table).

**Edge function** — new `supabase/functions/send-fighter-invite/index.ts`
- Verifies JWT, validates body with Zod (`{ email, name, eventId, fighterProfileId }`), checks the caller owns the event (`events.organiser_id = auth.uid()`), then calls `send-transactional-email` with a new template `fighter-invite`.
- New React Email template `supabase/functions/_shared/transactional-email-templates/fighter-invite.tsx` registered in `registry.ts`. Uses Matchup brand tokens (bg #ffffff, gold #e8a020 CTA), CTA link `${SITE_URL}/auth?invite=<encoded email>&fighter=<fighterProfileId>`.
- Prerequisite: this needs Lovable Emails infrastructure (`setup_email_infra` + `scaffold_transactional_email` + an email domain). Build step will check `check_email_domain_status` first; if no domain, surface the domain-setup dialog and pause implementation there.

**Auth page** — `src/pages/Auth.tsx` reads `?invite=` and prefills the email field on the signup tab. No signup logic change; existing `sync_fighter_on_signup` handles claim on account creation.

## Files touched

- `src/components/organiser/AddFightModal.tsx` — add tab + form + submit handler
- `src/pages/Auth.tsx` — prefill email from `?invite=` param
- `supabase/functions/send-fighter-invite/index.ts` — new
- `supabase/functions/_shared/transactional-email-templates/fighter-invite.tsx` — new
- `supabase/functions/_shared/transactional-email-templates/registry.ts` — register template

## Open questions (please confirm before I build)

1. **Age → DOB**: storing exact DOB isn't in the form. OK to store Jan 1 of birth year (approximate) so downstream age math works, or would you rather leave DOB null and store age separately? (There's no `age` column on `fighter_profiles` today — DOB is the standard field.)
2. **Email prerequisite**: does the project already have an email domain configured? If not, we'll need to set one up before the invite email can send. The bout can still be created without the email, but the invite won't reach them.
3. **Bout status when the second side is a non-member**: should it go straight to `proposed` (as it does today for two on-platform fighters), or sit as `pending_invite` until the invitee signs up and accepts? Default in this plan: `proposed` — the on-platform side sees it immediately, and the invitee sees/accepts once they claim.
