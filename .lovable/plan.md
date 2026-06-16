# Fix Match Proposal Flow End to End

## Problems with current code

- `MatchProposalCard` (fighter) and `ProposalCard` (coach) duplicate logic with subtle differences, none open a "rich" detail view.
- `NotificationBell` and `NotificationHistory` ignore `notification.type`/`reference_id` and dump every click on `/dashboard?section=actions`.
- Confirmations are inserted without an `onConflict` upsert, so a user cannot change their decision; second insert may also break a future unique constraint check.
- "Required parties" gym lookup uses `fighter_gym_links.status = 'approved'` in fighter card and `'accepted'` in coach card — inconsistent and one of them returns no rows.
- `bout_acceptances` table is never written to.
- When a single party accepts, no notification is sent to the other parties (only on full confirm or decline).
- Decline updates `fight_slots.status = 'open'` but the spec is about `event_fight_slots`. Slot status updates are split across two tables (`fight_slots` vs `event_fight_slots`) and the confirmed-state update never touches `event_fight_slots`.
- No real-time subscription on `confirmations`, so progress tracker is stale.
- Organiser slot deletion (`FightCardManager.tsx:289`, `EditBoutDialog.tsx:138`, `DashboardActions.tsx:414`) sends no cancellation notifications.
- "If no coach is assigned, fighter's acceptance is enough" rule is not implemented — code adds every coach but never differentiates "required" from "informational".

## Scope

Wire the existing `bout_acceptances`, `confirmations`, `match_proposals`, `event_fight_slots`, and `notifications` tables correctly. No schema changes.

## Implementation plan

### 1. Shared proposal engine — `src/lib/matchProposal.ts` (new)

Single source of truth used by every entry point.

- `getProposalParties(proposalId)` — resolves the four logical sides from `match_proposals` + `fighter_profiles` + `fighter_gym_links` (status `accepted`) + `gyms.coach_id` + `events.organiser_id`. Returns:
  ```
  { fighterA, fighterB, coachA|null, coachB|null, organiserId, slotId, eventFightSlotId }
  ```
  `coachX` is null when the fighter has no linked gym coach — that side is then satisfied by the fighter alone.
- `getRequiredUserIds(parties)` — returns the user_ids that must accept (organiser excluded).
- `recordDecision({ proposalId, userId, role, decision, comment })` — upserts into `confirmations` keyed on `(match_proposal_id, user_id)` so a user can switch accept↔decline while proposal is not yet `confirmed`. Returns the fresh confirmations list. If `decision === 'accepted'` and the side has no coach, write a row for the corresponding `bout_acceptances` (so the slot has the audit trail).
- `evaluateProposal(parties, confirmations)` — returns `{ status: 'pending'|'confirmed'|'declined', sideStatus: { fighterA, coachA, fighterB, coachB } }`. A side is "satisfied" if every required user_id on that side accepted; declined if any required user_id declined.
- `applyOutcome({ parties, outcome, actorUserId })` — performs the writes:
  - On **confirmed**: `match_proposals.status='confirmed'`, `event_fight_slots.status='confirmed'` (resolved via `event_fight_slots` lookup keyed by `event_id` + fighter ids), insert `bout_acceptances` rows for each accepting user (`onConflict: slot_id,user_id` no-op), notify all parties with `match_confirmed`.
  - On **declined**: `match_proposals.status='declined'`, `event_fight_slots.status='open'`, clear `fighter_a_id`/`fighter_b_id` on the slot if both were set by this proposal, notify all other parties with `match_declined` including the declining party's display name in the message, plus dedicated `match_declined` notification for the organiser.
  - On **still pending**: notify other parties with `match_accepted` / `match_declined` containing party name + remaining count.
- `notifyCancellation({ proposalId|slotId, reason })` — used by slot deletion. Pulls anyone who ever appeared in `confirmations` or `bout_acceptances` for the slot, plus current `fighter_a/b` and their coaches, and sends a `match_withdrawn` notification.

All slot updates write to **both** `fight_slots` (legacy) and `event_fight_slots` to keep current code paths working, but `event_fight_slots` is the authoritative one per spec.

### 2. Rich proposal detail — `src/components/proposal/ProposalDetail.tsx` (new)

Modelled on the existing Match Found card style (no border, charcoal `#111318`, gold `#e8a020`, Bebas Neue headings). Used both as a full page and a modal.

Sections:
- Event header — title, date, venue, discipline, bout type, rounds × duration.
- Versus block — both fighters with avatar, record (W-L-D-NC from `fighter_records`), style, gym, weight, height, reach. Highlights the current user's side.
- Bout details — weight class, agreed weight (kg/lbs), slot number, card position.
- **Progress tracker** — 4 (or 2/3 when coaches absent) pills: Fighter A, Coach A, Fighter B, Coach B. Each shows `accepted` (gold filled), `declined` (red), or `awaiting` (charcoal). Driven by `confirmations` query + Supabase realtime subscription on `confirmations` filtered by `match_proposal_id`.
- Action bar — for the viewer's side: Accept / Decline (and Change my response when already decided and proposal not `confirmed`). Optional comment textarea. Hidden when proposal is `confirmed` or `declined`.
- Optional message from organiser.

### 3. Routing & notification entry points

- New route in `src/App.tsx`: `/* */` `<Route path="/proposals/:id" element={<ProtectedRoute><ProposalDetailPage /></ProtectedRoute>} />` rendering `ProposalDetail` full-page.
- `NotificationBell.handleNotificationClick` and `NotificationHistory.handleNotificationClick`: switch on `notification.type`:
  - `match_proposed`, `match_accepted`, `match_declined`, `match_confirmed`, `match_withdrawn` → `navigate('/proposals/' + reference_id)`.
  - Existing handling preserved for other types (fall back to `/dashboard?section=actions`).
- `DashboardProposals` cards: clicking the card opens `ProposalDetail` (modal on desktop, navigate on mobile). Replace inline Accept/Decline buttons inside `MatchProposalCard` and `ProposalCard` with "View proposal" — both files keep their summary look but delegate the actual decision flow to `ProposalDetail` so logic isn't duplicated.

### 4. Per-party acceptance + change of decision

- `recordDecision` performs `supabase.from('confirmations').upsert(..., { onConflict: 'match_proposal_id,user_id' })`. (Existing primary key is `id`, so we use `delete` then `insert` inside a single call when upsert can't target a non-unique combo — implemented as: select existing row → if exists, `update` by id; else `insert`.)
- After every write, `evaluateProposal` runs and `applyOutcome` decides next step.
- Disable Accept/Decline buttons while a mutation is in flight; revalidate React Query keys `['proposal-confirmations', id]`, `['proposals']`, `['notifications']` after success.

### 5. Cross-party notifications

`applyOutcome` always sends one notification per other party (organiser + the three other sides' user_ids). Templates:

- Accept: `"{ActorName} accepted the bout"` / `"{A} vs {B} — {remaining} party still to respond"`.
- Decline: `"{ActorName} declined the bout"` / `"{A} vs {B} for {EventTitle}"`.
- Confirmed: `"Bout confirmed"` / `"{A} vs {B} is locked in for {EventTitle} on {Date}"`.
- Withdrawn (slot deletion): `"Bout cancelled by organiser"` / `"{A} vs {B} for {EventTitle} has been removed from the card."`.

All notifications set `reference_id = proposal.id` (or `slot.id` for cancellations when no proposal exists).

### 6. Bout confirmed state

When `evaluateProposal` returns `confirmed`:
- `match_proposals.status = 'confirmed'`.
- `event_fight_slots.status = 'confirmed'` resolved via `(event_id, fighter_a_id, fighter_b_id)` lookup.
- Insert `bout_acceptances` row for each accepted user with `slot_id = event_fight_slots.id`, `role`, `user_id`, `accepted_at` defaulting to `now()`. `onConflict (slot_id,user_id)` does nothing.
- Send `match_confirmed` notifications.

### 7. Decline handling

- `match_proposals.status = 'declined'`.
- Re-open `event_fight_slots`: `status = 'open'`, clear `fighter_a_id` / `fighter_b_id`.
- Notify all other parties (template above). The organiser's notification message names the declining party.

### 8. Fight slot deletion notification

Single helper `notifyCancellationForSlot(slotId)` invoked from:
- `src/pages/organiser/FightCardManager.tsx` before `.delete()`.
- `src/components/organiser/EditBoutDialog.tsx` before `.delete()`.
- `src/components/dashboard/DashboardActions.tsx` (slot-delete branch).

The helper looks up the latest `match_proposals` row for that slot (if any), gathers `confirmations` and current/previous fighters + their coaches, and emits `match_withdrawn` notifications.

### 9. Realtime

Inside `ProposalDetail` only (component scope, in `useEffect` with cleanup):
```ts
supabase.channel('proposal:' + id)
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'confirmations', filter: `match_proposal_id=eq.${id}` },
      () => queryClient.invalidateQueries({ queryKey: ['proposal-confirmations', id] }))
  .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'match_proposals', filter: `id=eq.${id}` },
      () => queryClient.invalidateQueries({ queryKey: ['proposal', id] }))
  .subscribe();
```

### 10. Files touched

New:
- `src/lib/matchProposal.ts`
- `src/components/proposal/ProposalDetail.tsx`
- `src/components/proposal/ProposalProgress.tsx`
- `src/pages/ProposalDetailPage.tsx`

Edited:
- `src/App.tsx` — add `/proposals/:id` route.
- `src/components/NotificationBell.tsx` — type-aware navigation.
- `src/components/NotificationHistory.tsx` — type-aware navigation.
- `src/components/fighter/MatchProposalCard.tsx` — replace inline accept/decline with summary + "View proposal".
- `src/components/coach/ProposalCard.tsx` — same.
- `src/components/organiser/ProposeMatchDialog.tsx` — fix `fighter_gym_links.status` filter to `accepted` only; route through `matchProposal.ts` helper so initial notifications are consistent.
- `src/pages/organiser/FightCardManager.tsx`, `src/components/organiser/EditBoutDialog.tsx`, `src/components/dashboard/DashboardActions.tsx` — call `notifyCancellationForSlot` before deleting.

### 11. Out of scope

- No schema changes (no migrations).
- No changes to RLS policies.
- No changes to matchmaking algorithm scoring.
- No changes to ticketing or event creation flow.
