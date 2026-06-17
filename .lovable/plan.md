## Diagnosis — notification routing bug

The `match_*` notification types are produced by **two different subsystems** that store completely different ids in `reference_id`, but the click handler in `NotificationBell.tsx` and `NotificationHistory.tsx` treats every match-typed notification as if `reference_id` is a `match_proposals.id` and unconditionally routes to `/proposals/:id`.

Producers found:

| File | `_type` | `_reference_id` actually stored |
|---|---|---|
| `src/components/organiser/ProposeMatchDialog.tsx:147` | `match_proposed` | `match_proposals.id` ✓ |
| `src/lib/matchProposal.ts` (notify helper, applyOutcome) | `match_accepted` / `match_declined` / `match_confirmed` / `match_withdrawn` | `match_proposals.id` ✓ |
| `src/components/organiser/AddFightModal.tsx:63` | `match_proposed` | `event_fight_slots.id` ✗ |
| `src/components/organiser/AddFightManuallyDialog.tsx:55` | `match_proposed` | `event_fight_slots.id` ✗ |
| `src/components/organiser/EditBoutDialog.tsx:58` | `match_declined` | `event_fight_slots.id` ✗ |
| `src/components/dashboard/DashboardActions.tsx:517,536` | `match_confirmed` / `match_declined` | `event_fight_slots.id` ✗ |

When the rows marked ✗ are clicked, the handler navigates to `/proposals/<event_fight_slots.id>`, `ProposalDetail` calls `getProposalParties()` which queries `match_proposals` by that id, finds nothing, and renders "Proposal not found." That is the bug.

## Fix #1 — notification routing

Add a small resolver `resolveNotificationTarget(notification)` in `src/lib/notificationRouting.ts`:

```text
1. If type is one of the match_* types and reference_id is set:
   a. SELECT id FROM match_proposals WHERE id = reference_id   → /proposals/:id
   b. else SELECT id FROM event_fight_slots WHERE id = ref_id   → /dashboard?actionItem=<slotId>&actionTab=auto
   c. else fall back to /dashboard
2. Other notification types keep their current routing.
```

Both `NotificationBell.tsx` and `NotificationHistory.tsx` replace their inline `proposalTypes.includes(...) → navigate("/proposals/" + reference_id)` block with `const target = await resolveNotificationTarget(n); navigate(target);` (still awaits, then closes the popover / marks read as before).

`DashboardActions.tsx` reads `actionItem` and `actionTab` from `useSearchParams`; if `actionItem` matches an id in `activeItems` it stays on Active, otherwise switches to Done. The target row is given `data-action-id={item.id}` and on mount it scrolls into view with a brief gold outline highlight (2s). If `actionTab=auto`, this resolves automatically based on which list contains the id.

No DB migration. Existing producers keep emitting slot ids — the resolver makes them route correctly without rewriting historical notifications.

## Fix #2 — Active / Done split for proposal items

Today the "Active" tab in the action centre hides any bout proposal where I've already submitted an acceptance (`boutProposalsActive` line ~245 filters out `myAcceptances`). The item only resurfaces in "Done" if the **overall slot** flips to confirmed or declined — so if I accept and the other parties haven't, the item vanishes from both views. That's the symptom the user wants fixed.

The split must be driven by *my* decision, not by the slot's terminal state. Changes confined to `src/components/dashboard/DashboardActions.tsx`:

1. **Reframe the two bout-proposal queries** so both are sourced by my acceptances:
   - `boutProposalsAll` — single query for `event_fight_slots` where my fighter ids are A or B and `status IN ('proposed','confirmed','declined')`, plus my acceptances + decline records.
   - Partition in JS:
     - **Active** = slot.status is `'proposed'` AND I have no row in `bout_acceptances` for it AND I have no decline record. (Mirrors today's "still actionable for me" set, but now the source of truth is *my* decision.)
     - **Done** = I have a `bout_acceptances` row for it (accepted) OR the slot is `'declined'` and I was a party (declined). Each item carries a `myDecision: 'accepted' | 'declined'` field and the slot's overall `status`.

   Note on declines: today `handleDeclineBoutProposal` sets `slot.status = 'declined'` directly (no per-user decline record). To preserve the "Change Decision" rule we need per-user tracking. Two options:
   - (a) Add a `decision text` column to `bout_acceptances` (currently it just records that a party accepted) and stop writing the slot to `'declined'` on a single party's decline — only flip the slot when all parties have submitted a decline. This is the correct model and matches `confirmations` for match_proposals, but it is a schema change with broader implications.
   - (b) Minimal change: when I decline, keep writing `bout_acceptances` row with a new `decision='declined'` column, and leave slot `status='proposed'`. (Same column add as (a) but without changing slot-flip semantics for now.) The slot still flips to `declined` when the organiser explicitly removes the fighter via `EditBoutDialog`.

   I'd go with **(b)**: minimal `ALTER TABLE bout_acceptances ADD COLUMN decision text NOT NULL DEFAULT 'accepted' CHECK (decision IN ('accepted','declined'))`. Decline handler inserts/updates a `bout_acceptances` row with `decision='declined'` instead of mutating slot status. Slot only flips to `confirmed`/`declined` when **all** required parties have submitted matching decisions (already the rule used for confirm; mirror it for decline).

2. **Render**: Done section items show their `myDecision` badge plus a "Change Decision" button when `slot.status === 'proposed'` (overall not yet finalised). Clicking calls a new `handleChangeBoutDecision(item)`:
   - `DELETE FROM bout_acceptances WHERE slot_id=? AND user_id=?`
   - Invalidate the action-centre queries
   - Toast "Decision reset — choose again in Active"
   - The item naturally reappears in Active because partition now finds no acceptance row.
   - Button is hidden / replaced with "Locked" pill when `slot.status` is `confirmed` or `declined` (final state rule).

3. **Parallel for match_proposals items** (the other proposal subsystem): match_proposals rows aren't currently sources for the action centre, so the split affects bout_proposal only. The detail page `ProposalDetail.tsx` already allows re-submitting a decision while the proposal is not `confirmed`/`declined`, which is the equivalent behaviour for that subsystem — no change needed.

## Files touched

- new `src/lib/notificationRouting.ts`
- edit `src/components/NotificationBell.tsx` (use resolver)
- edit `src/components/NotificationHistory.tsx` (use resolver)
- edit `src/components/dashboard/DashboardActions.tsx`
  - replace partition logic for bout_proposal items
  - new `handleChangeBoutDecision`
  - new "Change Decision" button on Done rows for `bout_proposal`
  - read `actionItem` / `actionTab` query params; scroll-to + highlight target row
  - rework `handleDeclineBoutProposal` to insert `bout_acceptances` row with `decision='declined'` and flip slot only when all parties have declined (mirror existing accept logic)
- migration: `ALTER TABLE public.bout_acceptances ADD COLUMN decision text NOT NULL DEFAULT 'accepted' CHECK (decision IN ('accepted','declined'))`

## Out of scope

- Rewriting historical notifications.
- Per-user decision tracking on `match_suggestions` (fight_proposal items in Done) — no separate decision rows exist for those; out of scope unless you also want a Change Decision there.
- Changing the producers in AddFightModal / AddFightManuallyDialog / EditBoutDialog to emit a different `reference_id` — the resolver covers it without source-side churn.
