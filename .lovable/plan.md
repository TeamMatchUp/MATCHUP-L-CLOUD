## Heads-up on current state

The earlier matchmaking task (Part 2 UI only) explicitly **deferred all Elo work**. There is currently **no Elo engine, no `elo` column on `fighter_profiles`, no `transfer_weight`/`pro_elo_seed` code, and no "unverified opponent" flag in the app**. The rules described as "already live" have never actually shipped.

That's good news for the migration piece (nothing stored to overwrite), but it means this task is really: **build the Elo engine correctly the first time**, using rules A and B, with a single global chronological replay for platform-confirmed fights.

## What I'll build

### 1. Elo engine (new)

New module `src/lib/eloEngine.ts` implementing corrected rules only — no legacy branches:

- `K = 32`
- `S_a`: 1.0 win / 0.5 draw / 0.0 loss, with ±15% finish bonus for KO/TKO/Submission (DQ = plain win, no bonus)
- `E_a`:
  - Historical / self-reported fight (`verification_status` = `self_reported` or `coach_verified`) → **always 0.50**, regardless of whether the named opponent matches a Matchup profile
  - Platform-confirmed fight (`verification_status = 'platform_confirmed'`) → real opponent-Elo differential using each fighter's Elo **as it stands just before that fight in the global replay**
- `level_weight`: `1.0` if `fights.is_amateur = false`, `0.55` if `true` — flat across all disciplines, applied to every fight
- `change = K × (S_a − E_a) × level_weight`

**Replay architecture — single global chronological pass:**

1. Load every fight row (both self-reported/coach-verified and platform-confirmed) across all fighters.
2. Sort globally by `event_date ASC NULLS LAST`, tiebreak `created_at ASC`, then `id` for a stable total order.
3. Initialise every fighter at Elo 1000 in an in-memory map `Map<fighterId, number>`.
4. Iterate the sorted list **once**. For each fight:
   - **Self-reported / coach-verified**: update only fighter A's Elo (they are the perspective owner of a self-reported row) using `E_a = 0.50` and their own `level_weight`. Opponent side is not touched — the other side of a historical fight isn't a Matchup rating event.
   - **Platform-confirmed**: read both fighters' current running Elo from the map, compute `E_a` and `E_b` from the differential, apply `change` to each with their per-side `level_weight` (a mixed-level bout is possible in principle, so `level_weight` is looked up per fighter row / per fight-side), and write both back to the map.
5. After the pass, the map holds each fighter's final Elo. This guarantees no future information leaks into any lookup, and rematches / shared opponents resolve unambiguously because every prior fight has already been applied before the next one is read.

Unit tests in `src/test/eloEngine.test.ts` covering:

- Muay Thai worked example (2 amateur KO wins, 1 amateur DQ win, 2 amateur draws, 1 pro decision win) → **1047.68**
- A rematch pair (A beats B, then B beats A) confirming the second bout uses post-first-bout Elos, not starting 1000s
- A shared-opponent chain (A vs C, then B vs C, then A vs B) confirming C's Elo at each lookup reflects only prior fights

### 2. Schema + migration

Migration adds:

- `fighter_profiles.elo_rating integer NOT NULL DEFAULT 1000`
- `fighter_profiles.elo_last_computed_at timestamptz`
- `fights.verification_status` — already exists, no change
- `fights.is_amateur` — already exists, no change
- `profiles.has_consented_matchmaking boolean NOT NULL DEFAULT false`
- `profiles.matchmaking_consent_version integer`
- `profiles.matchmaking_consent_at timestamptz`
- New `public.record_matchmaking_consent(_version integer)` SECURITY DEFINER RPC that sets all three columns on `auth.uid()`'s profile

RLS / grants on `profiles` and `fighter_profiles` already exist and stay untouched.

### 3. One-time recompute job

Since no prior Elo values exist, this doubles as first-compute and future-rerun tool:

- Edge function `supabase/functions/recompute-elo/index.ts` — admin-gated via `has_role('admin')`
- Runs the single global chronological pass described above, then writes each fighter's final Elo + `elo_last_computed_at` in one batched update
- Returns a JSON report listing any fighter whose Elo shifted by >50 points vs. their previously stored value (suppressed on first run when previous value is 1000/null; meaningful on subsequent reruns)
- Triggered manually from `Admin.tsx` via a new "Recompute Elo" button in the existing admin tools area

### 4. Matchmaker flag rename

In `src/pages/Matchmaking.tsx` and `src/lib/matchmakingEngine.ts`:

- Remove any "Unverified opponent" copy
- Add flag `no_platform_history`, triggered when a fighter has zero `fights` rows with `verification_status = 'platform_confirmed'`
- Icon-only on the card, full text inside "Why this match":
  > "[Name]'s rating is built from self-reported history using neutral assumptions — not yet tested against a Matchup-confirmed opponent. Verify suitability with fighter/coach before confirming this match."

### 5. Consent modal (new)

- New `src/components/matchmaking/MatchmakingConsentModal.tsx` — dark theme, gold accent, no border, shadow-only per design system
- Constant `MATCHMAKING_CONSENT_VERSION = 1` in `src/lib/matchmakingConsent.ts`
- Gate placed at the top of `src/pages/Matchmaking.tsx`: if user's `has_consented_matchmaking` is false **or** `matchmaking_consent_version < MATCHMAKING_CONSENT_VERSION`, render only the modal (walkthrough + suggestions list are not rendered behind it)
- Body covers: decision-support only, self-reported ratings use neutral assumptions, matchmaker still responsible for debut/welfare/no-platform-history checks, link to T&Cs anchor `#matchmaking`
- Single checkbox "I have read and understood this, and agree to the Matchup Terms & Conditions" — `Continue` disabled until checked; `Cancel` / dismiss → `navigate('/dashboard')`
- On Continue → call `record_matchmaking_consent` RPC, then reveal the walkthrough

### 6. Terms & Conditions

Add new section `#matchmaking` to `src/pages/TermsOfService.tsx`:

- **Neutral-Elo disclosure** — ratings built from self-reported history reflect neutral assumptions, not confirmed opponent strength
- **Matchmaker responsibility** — organisers/coaches remain responsible for verifying suitability regardless of algorithm output

## Out of scope (unchanged)

Simplified matchmaking UI (walkthrough, icon warnings, Why-this-match panel, Refine toggle), preset weights, safety-gate thresholds, and the four scoring dimensions all stay exactly as they are.

## Verification before I call it done

1. Unit tests pass, including the Muay Thai 1047.68 case, rematch case, and shared-opponent chain
2. Migration applied; `fighter_profiles.elo_rating` populated by recompute function
3. Manual: fresh account with 0 consent → opening `/matchmaking` shows only the modal; ticking + Continue lands on Step 1 of 3; refresh doesn't re-prompt
4. Manual: fighter with only self-reported fights shows the new `no_platform_history` flag (icon on card, full text in Why-this-match); fighter with any platform-confirmed fight does not