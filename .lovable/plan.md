## 1. Fight Card Overview — correct slot counts and progress bars

File: `src/pages/organiser/EventManager.tsx`

Problems today:
- The overview renders three sections (Main Card, Undercard, Prelims), but the database only uses two `bout_type` values (`Main Event` and `Undercard`), so Prelims is always empty noise.
- `total: Math.max(metrics.main.length, 1)` makes the denominator equal to the filled count, so progress always reads e.g. `2 / 2` and the bar always shows 100% — the breakdown never reflects reality.
- Filled count uses `fighter_a_id && fighter_b_id`, but "filled" for an organiser should mean the bout is locked in (status `confirmed`), not just that two fighters have been proposed.

Fix:
- Drop the Prelims row entirely. Render only Main Card and Undercard.
- Compute per-section counts from the existing `bouts` query (already scoped to the current event):
  - `mainSlots = bouts.filter(b => b.bout_type === "Main Event")`
  - `underSlots = bouts.filter(b => b.bout_type === "Undercard" || b.bout_type == null)` (treat null/legacy as Undercard so nothing is hidden)
- For each section:
  - `total = section.length`
  - `confirmed = section.filter(b => b.status === "confirmed" && b.fighter_a_id && b.fighter_b_id).length`
  - `pct = total ? (confirmed / total) * 100 : 0`
- Display `confirmed / total` and a gold `ProgressBar` (existing component, gold accent `#e8a020`).
- If a section has 0 slots, still render the row with `0 / 0` and an empty bar (consistent height with the other section).

No schema changes, no routing changes, no styling changes beyond removing the third row.

## 2. Confirmed bouts not appearing on the public event page for organiser-created events

Root cause (verified against live data, not RLS):
- The `event_fight_slots` RLS policy is `(is_public = true) OR (auth.uid() IS NOT NULL)` — identical for every event regardless of creator role, so RLS is not the issue.
- `src/pages/EventDetail.tsx` filters with `is_public === true && status === "confirmed"`.
- Coach-created bouts (via the gym_owner flow) are inserted with `is_public: true`, so they pass the filter once confirmed.
- Organiser-created bouts in `src/components/organiser/AddFightModal.tsx` are inserted with `is_public: false` (lines 219 and 317). When the proposal flow flips `status` to `confirmed` in `src/lib/matchProposal.ts` (`applyOutcome`, line ~307), `is_public` is never updated, so the slot stays hidden on the public page even though it is fully confirmed.
- Confirmed in the DB: organiser event `esme fight night` has a `status='confirmed'`, `is_public=false` slot; the gym_owner event `TEST EVENT NIGHT` has its confirmed slot with `is_public=true` and shows correctly.

Fix (display/wiring only, no RLS, no schema changes):

1. `src/lib/matchProposal.ts` — in `applyOutcome`, when the proposal evaluates to `confirmed`, include `is_public: true` in the `event_fight_slots` update alongside `status: "confirmed"`. This makes every newly confirmed bout visible on the public event page by default, matching the coach flow.
2. `src/components/organiser/AddFightModal.tsx` — leave the pre-confirmation `is_public: false` as-is so proposed bouts stay private until both parties accept; the change in step 1 is what flips them public on confirmation.
3. Backfill existing organiser-created confirmed bouts so they appear immediately, without altering any policy:
   - One-shot SQL migration:
     ```sql
     UPDATE public.event_fight_slots
     SET is_public = true
     WHERE status = 'confirmed'
       AND is_public = false
       AND fighter_a_id IS NOT NULL
       AND fighter_b_id IS NOT NULL;
     ```
   - Organisers retain the eye toggle in `FightCardManager` to make a confirmed bout unlisted again if they choose.

No changes to `EventDetail.tsx` query/filter, no RLS changes, no changes to event ownership/role checks.

## Out of scope

- Adding a Prelims bout_type anywhere (per user choice).
- Any change to RLS policies, matchmaking scoring, or routing.
- Any change to the coach create-bout flow.
