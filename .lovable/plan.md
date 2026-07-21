# Replace Elo with Glicko-2 (internal) — MU Score stays the same on the surface

Ship Glicko-2 as the rating engine. Users still see one "MU Score" number, same leaderboards, same profile pill. RD/volatility are internal only.

## 1. Schema migration

Add to `fighter_profiles`:
- `rating numeric NOT NULL DEFAULT 1500`
- `rating_deviation numeric NOT NULL DEFAULT 350`
- `volatility numeric NOT NULL DEFAULT 0.06`
- `last_result_at timestamptz`
- `first_platform_confirmed_at timestamptz`

Keep `elo_rating` (unused post-cutover, not displayed, not dropped).

## 2. New engine — `src/lib/glicko2Engine.ts`

Pure module, no Supabase deps. Constants: `TAU = 0.5`, `SCALE = 173.7178`, `DEFAULT_RATING = 1500`, `DEFAULT_RD = 350`, `DEFAULT_VOL = 0.06`, `FINISH_BONUS = 8`, inactivity `C ≈ 64.5`, `MAX_RD = 350`.

Exports:

- `seedFromRecord({ pro, amateur, hasApprovedGymLink, isTrueDebut })` → `{ rating, rd, volatility }`. Implements §2: draws = 0.5 win, amateur ×0.55, Laplace `(w+2)/(n+4)`, seed = `1500 + (awr − 0.5) × 600`; RD tier 350/300/250.

- **`glickoStep(player, opponents, tau)` → `{ rating, rd, volatility }`** — the general Glicko-2 rating-period function accepting a list `[{ rating, rd, score }, ...]`. This is the actual validated unit against Glickman's published anchor (see §8). Standard µ/φ/σ scale conversion, `v`, `Δ`, volatility iteration, φ*, µ' update, back to public scale.

- **`updateBout(a, b, { outcomeA, method, isAmateur })` → `{ a, b }`** — thin wrapper. Snapshot both pre-fight states, then in parallel:
  - `aNew = glickoStep(a, [{ ...b, score: outcomeA }], TAU)`
  - `bNew = glickoStep(b, [{ ...a, score: 1 − outcomeA }], TAU)`
  - `s ∈ {0, 0.5, 1}` only — never encode finish bonus into `s` (breaks volatility iteration).
  - Scale the **rating delta** (`new − old`) by `level_weight` (1.0 pro / 0.55 amateur). RD & volatility take their standard values unscaled — any real fight reduces uncertainty regardless of level.
  - Apply finish bonus **also scaled by `level_weight`**: `±8` for pro KO/TKO/Sub, `±4.4` for amateur KO/TKO/Sub, nothing on decision/draw/DQ. This keeps the amateur discount consistent across every component (seed, base delta, and finish bonus all scaled by the same 0.55). Deliberate choice — no level-agnostic component.
  - Final rating = pre + scaled_delta + scaled_finish_bonus.

- `effectiveRd(storedRd, lastResultAt, now)` → `min(sqrt(rd² + c² · monthsInactive), 350)`; months = 0 when `lastResultAt` is null.

- `displayedMuScore(rating, effectiveRd)` → `round(rating − 2 × effectiveRd)`.

## 3. Recompute edge function — rename `recompute-elo` → `recompute-ratings`

Admin-triggered single pass:
1. Load `fighter_profiles`, `fights`, `fighter_gym_links` (approved-link tier), historical fight rows.
2. Compute each fighter's `first_platform_confirmed_at` = min `event_date` of platform-confirmed fights (null if none).
3. Seed from historical entries with `created_at < first_platform_confirmed_at` (or all entries if null) — idempotency rule.
4. Chronologically replay every platform-confirmed fight (`event_date` asc, tiebreak `created_at`, then `id`), calling `updateBout` with running state; update `last_result_at` and set `first_platform_confirmed_at` on first hit.
5. Batched write of `rating/rating_deviation/volatility/last_result_at/first_platform_confirmed_at`.
6. Report per fighter: `old_displayed (elo_rating)`, `new_displayed (MU Score)`, leaderboard rank before/after, flag `|rank_delta| > 10`.

## 4. Live update hooks

At the existing result-verification path (where Elo would have moved today), call `applyBoutUpdate(fightId)`:
- Load both fighters' current stored values.
- Call `updateBout`.
- Write both rows' `rating/rd/volatility/last_result_at` and `first_platform_confirmed_at` if null.

Re-seed trigger: whenever a fighter's historical record changes AND `first_platform_confirmed_at IS NULL`, recompute their seed. After platform history exists, historical edits are display-only.

## 5. Display surfaces

- `src/lib/leaderboard.ts` — select `rating, rating_deviation, last_result_at`; sort by `displayedMuScore(rating, effectiveRd(...))`. Update 2-3 leaderboard consumers to use the new field name (`mu_score`).
- `FighterDetail.tsx` — pill sources displayed MU Score; tooltip copy: *"Your MU Score is a conservative estimate of your skill level. It rises as you win — and as you prove your record in Matchup-confirmed fights."*
- `FighterProfileCard.tsx` and any other card showing MU Score — same swap.
- "Inactive — no fights in 12+ months" badge when `last_result_at` older than 12 months.
- Never render raw rating / RD / volatility.

## 6. Matchmaking integration

In `src/lib/matchmakingEngine.ts` / `matchSuggestions.ts`:
- Consume raw `rating` for pairing math; `effectiveRd` as a signal.
- Keep tier gates, tierGap, debut exception, same-gym exclusion untouched.
- Keep `no_platform_history` flag/copy.
- Add advisory flag `unproven_high_rd` when either side's `effectiveRd ≥ 300` and the overlap depends on it: *"[Name]'s rating is still largely unproven — verify suitability with fighter/coach before confirming."*

## 7. Copy updates

- `src/pages/RecordAccuracyPolicy.tsx` — rewrite the "How your MU Score is calculated" section per prompt; keep the "can't invent opponents / only Matchup-event results are event-confirmed" points; add: fighter-entered vs coach-entered historical records are treated the same.
- `src/components/matchmaking/MatchmakingConsentModal.tsx` — replace the self-reported-ratings paragraph with: *"Scores for fighters who haven't yet competed through Matchup are conservative estimates based on their reported record — always verify suitability before confirming a match."*
- `src/pages/TermsOfService.tsx` `#matchmaking` section — same one-line adjustment.

## 8. Tests — `src/test/glicko2Engine.test.ts`

- **Seeding**: debut (0-0-0) → 1500/350. 5W-5D-0L pro seeds strictly higher than 5W-0D-5L (draws ≠ losses).
- **Amateur weighting (seed)**: identical records logged amateur vs pro — amateur seeds closer to 1500.
- **Glickman anchor — tests `glickoStep`, not `updateBout`**: player at (1500, 200, 0.06) vs three opponents [(1400, 30, W), (1550, 100, L), (1700, 300, L)] in a single rating period → rating ≈ 1464.06, RD ≈ 151.52, vol ≈ 0.05999. This is why `glickoStep` is the general function: the published anchor is a multi-opponent single-period case, and testing it directly proves the core math. `updateBout` is trusted transitively as the `n=1` wrapper — no separate re-derivation of the anchor for the per-fight path.
- **Simultaneity (`updateBout`)**: rematch pair — second bout uses post-first-bout values for both; A's first-bout update uses B's pre-fight values (assert both A and B post-fight values are computed from the shared pre-fight snapshot).
- **Finish bonus (pro)**: identical bout, KO vs decision → exactly +8 rating difference; `s` never exceeds 1.
- **Finish bonus (amateur discount)**: identical amateur bout, KO vs decision → exactly +4.4 rating difference (finish bonus scaled by 0.55, matching the base-delta discount).
- **Inactivity**: fighter at stored RD 150, 24 months inactive → `effectiveRd` ≈ 350; 1 month → barely moved.
- **Idempotency**: fighter with platform history + a historical entry `created_at > first_platform_confirmed_at` → recompute output identical with or without that entry.
- **Display**: MU Score = `round(rating − 2·effectiveRd)`; leaderboard order sorts by it (unproven high-RD fighter with high raw rating sits below a proven lower-raw-rating fighter).

Delete `src/test/eloEngine.test.ts` after cutover.

## Technical notes

- `glickoStep` is the general, mathematically-validated primitive; `updateBout` is a thin per-fight wrapper (single-item opponent list). Level-weight scaling and finish bonus are applied by the wrapper, outside the core Glicko math.
- Amateur discount is uniform across seed, base delta, and finish bonus (all ×0.55). RD and volatility updates are level-agnostic.
- `s` stays in `{0, 0.5, 1}` at all times — finish bonus is a post-hoc rating adjustment only.
- `effectiveRd` clamps at 350; also the post-update ceiling.
- Legacy `eloEngine.ts` deleted once no imports remain.
- `elo_rating` column stays; only read by the recompute report's "old_displayed".

## Out of scope

Tier thresholds, safety-gate logic, matchmaking walkthrough UI, presets/scoring dimensions, under-18 protections, consent gating mechanics (copy only), dropping `elo_rating`.
