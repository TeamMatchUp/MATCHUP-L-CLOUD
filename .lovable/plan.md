
## Change

In `src/lib/matchmakingEngine.ts`, feed a weighted fight count into the existing tier function so amateur experience counts, discounted to match the Elo `level_weight` (0.55).

### Current
```ts
function getExpTier(totalPro: number): number {
  if (totalPro === 0) return 0;   // T0 Debut
  if (totalPro <= 3) return 1;   // T1 Novice
  if (totalPro <= 9) return 2;   // T2 Intermediate
  return 3;                       // T3 Experienced
}
// ...
const totalPro = f.record_wins + f.record_losses + f.record_draws;
expTier: getExpTier(totalPro),
```

### After
Keep the thresholds (0 / 1–3 / 4–9 / 10+) unchanged. Only the input changes:

```ts
const AMATEUR_TIER_WEIGHT = 0.55; // mirrors Elo level_weight

const totalPro = f.record_wins + f.record_losses + f.record_draws;
const totalAmateur =
  (f.amateur_wins ?? 0) + (f.amateur_losses ?? 0) + (f.amateur_draws ?? 0);
const weightedFightCount = totalPro + totalAmateur * AMATEUR_TIER_WEIGHT;

expTier: getExpTier(weightedFightCount),
```

`getExpTier` signature widens to `number` (float) — the `<= 3` / `<= 9` comparisons keep working with fractional inputs.

`totalPro` field on `FighterWithStats` stays as pro-only (used elsewhere by `proDiff` in the debut-exception check — must remain pro-only per spec: "No change to hard-block or exception-window logic itself").

### Verification against your cases
- 0 pro + 20 am → weighted 11.0 → **T3** (was T0). ✓
- 0 pro + 2 am → weighted 1.1 → **T1** (was T0). Note: your spec allowed "T0 or a low tier"; 1.1 rounds into T1 under the existing `totalPro === 0 → T0` threshold since 1.1 ≠ 0. This is consistent with the philosophy (small but real experience → out of Debut). Flagging so you can confirm; if you'd rather keep 2-am fighters at T0, we'd change the T0 rule to `< 1` (i.e. require ≥ 1 weighted fight to leave Debut) — say the word and I'll adjust.
- Pro-only fighters: `totalAmateur = 0` → weighted count = `totalPro` → tier identical to today. ✓
- Hard-block (`tierGap > 2`) and exception (`tierGap === 2 && proDiff <= 3`) logic untouched.

## Out of scope (unchanged)
Tier thresholds, hard-block/exception logic, Elo engine, discipline normaliser, weight dropdown, nationality filter, modal styling.
