## Scope
All edits confined to `src/pages/Matchmaking.tsx`. No engine, scoring, Elo, RLS, or schema changes.

---

## 1. Fix blocking bug — discipline mismatch

**Root cause (confirmed against DB):** the fighter pool query uses `.eq("discipline", event.discipline)`, but `events.discipline` is inconsistently cased and sometimes multi-token (`boxing`, `muay_thai`, `Mixed (Muay Thai & Boxing)`), while `fighter_profiles.discipline` uses canonical single values (`Boxing`, `Muay Thai`, `MMA`, `Kickboxing`, `Bjj`). Exact-string match returns zero fighters → empty pool → engine returns `[]` → UI renders blank with no explanation. Elo is fully populated (73/73) and is not the cause.

**Fix:**
- Add a `normaliseDiscipline(raw: string): string[]` helper that:
  - Lowercases, replaces `_` with space, strips punctuation.
  - Maps known aliases (`bjj`→`Bjj`, `mma`→`MMA`, `muay thai`→`Muay Thai`, `boxing`→`Boxing`, `kickboxing`→`Kickboxing`).
  - Splits combined values on `&`, `/`, `,`, or `and` (so `Mixed (Muay Thai & Boxing)` → `["Muay Thai", "Boxing"]`).
  - Returns a de-duplicated array of canonical fighter-profile discipline values.
- Change the pool query from `.eq("discipline", event.discipline)` to `.in("discipline", normalised)` when the array is non-empty; when the array is empty (unrecognised discipline) fetch all fighters and rely on the diagnostic banner (below).
- Add a diagnostic banner shown when `fighters.length === 0` after the query resolves (not loading):
  > "No fighters match this event's discipline (`{event.discipline}`). Showing all fighters as a fallback so you can still build the card."
  Combined with a fallback query in that branch that drops the discipline filter entirely, so the walkthrough always has something to work with.

## 2. Step 1 copy
Change the Step 1 question string inside the `Walkthrough` component from "What kind of card are you building?" to **"Select the type of fight you want to see"**. Preset options and blurbs unchanged.

## 3. Step 2 weight dropdown
Source options from the full `WEIGHT_CLASS_LABELS` map already defined at the top of the file, not from `availableWeights` derived from the (possibly empty) pool. Order: `"Any weight class"` first, then every entry in `WEIGHT_CLASS_LABELS` in its declared order. Apply the same change to the Refine panel weight dropdown so both agree.

## 4. Experience tier — no change
Confirmed wired to real data (see investigation above). No edits.

## 5. Region → Nationality
- Remove `regionFilter` state, the Step 3 "Region" text `Input`, and the Refine panel "Region" field.
- Add `nationalityFilter` state (default `"any"`).
- New filter uses `SearchableCountrySelect` (already exists at `src/components/SearchableCountrySelect.tsx`, includes flag icons and search) with `includeAll` so "All Countries" is the "Any" option.
- Update the pool filter (`useMemo` at line 174) to filter on `f.country === nationalityFilter` when not `"any"`. `country` is present on all 73 fighter_profiles, so the field is safe.
- Add both Step 3 and Refine panel instances.

## 6. Remove "Available only"
Delete `availableOnly` state, the Step 3 toggle, the Refine panel "Availability" field, and its use inside the pool `useMemo`. The `available` column on fighter_profiles is untouched — only the UI filter is removed.

## 7. Walkthrough styling — match AuthModal
- Convert the inline `Walkthrough` render (currently inside `<main>`) to render inside a shadcn `<Dialog>` whose `open` is `walkthroughActive`. Use the exact `DialogContent` styling from `AuthModal.tsx`:
  ```
  className="p-0 border-0 max-w-md overflow-hidden"
  style={{
    background: "hsl(var(--card))",
    boxShadow: "var(--shadow-modal)",
    backdropFilter: "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
  }}
  ```
  (Radix's `DialogOverlay` already provides the frosted/blurred backdrop treatment used by the sign-up flow.)
- Add the segmented top progress indicator copied from `AuthModal`'s `SIGNUP_STEPS` block:
  - Steps array: `["Fight type", "Weight", "Filters"]`.
  - Numbered pills that turn primary-gold when done/active, with checkmark once done.
  - Thin `h-1` progress bar underneath, fills to `((step + 1) / 3) * 100%`.
  - Clicking a completed pill jumps back to that step (same pattern as sign-up).
- Keep the underlying step content (preset picker, weight dropdown, tier + nationality) as-is; only the wrapper and header change.
- When the user finishes step 3 (or clicks "Start over" from the results view), close the dialog by setting `walkStep = 3`. Results/refine UI stays where it is (below the header, non-modal) once the walkthrough is done.

---

## Verification
- Open matchmaking for a `boxing`, `muay_thai`, and `Mixed (…)` event; confirm fighters appear in the pool and suggestions render with zero filters applied.
- Unrecognised discipline → banner shown + fallback pool used.
- Weight dropdown lists all 14 classes.
- Nationality dropdown lists countries with flags; selecting one filters pool.
- Availability toggle absent from both Step 3 and Refine.
- Walkthrough opens as a centered modal with frosted backdrop and 3-step segmented progress bar visually matching the sign-up modal.

## Out of scope (unchanged)
Engine scoring, safety gate thresholds, Elo recompute, RLS, schema, tier logic, preset weights.
