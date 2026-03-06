

# Phase 2: Structured Matchmaking Engine — Implementation Plan

## Overview

Five workstreams executed sequentially. No schema changes needed — all tables, enums, and RLS policies already exist. This is purely frontend/logic work with database queries.

---

## Step 1: Organiser — Create Event + Fight Slots

**New files:**
- `src/pages/organiser/CreateEvent.tsx` — Form with: title, date (datepicker), location, country (UK/USA/AUS select), promotion name, description. Includes a dynamic fight slot builder (add/remove rows with weight class select). On submit: insert into `events` table with `organiser_id = auth.uid()`, status `draft`, then batch insert `fight_slots`. Redirect to Event Manager.
- `src/pages/organiser/EventManager.tsx` — Shows event details, fight slots with statuses, and actions per slot. Route: `/organiser/events/:id`.

**Modified files:**
- `src/pages/OrganiserDashboard.tsx` — Add "Create Event" button linking to `/organiser/create-event`. Add "My Events" list querying `events` where `organiser_id = auth.uid()`.
- `src/App.tsx` — Add routes: `/organiser/create-event`, `/organiser/events/:id` (both protected with `requiredRole="organiser"`).

**RLS note:** Events insert policy requires `has_role(auth.uid(), 'organiser') AND auth.uid() = organiser_id` — the form sets `organiser_id` to the current user. Events default to `draft` status so they won't appear on the public page until the organiser publishes.

**Publish flow:** Add a "Publish" button on EventManager that updates `status` from `draft` to `published`.

---

## Step 2: Organiser — Fighter Search + Propose Match

**New files:**
- `src/components/organiser/FighterSearchPanel.tsx` — Filters: weight class (pre-filled from slot), country, style, availability. Queries `fighter_profiles` with filters. Displays results as selectable cards with record/stats.
- `src/components/organiser/ProposeMatchDialog.tsx` — Shows selected Fighter A vs Fighter B side-by-side. Confirm button inserts into `match_proposals` with `status = pending_coach_a`, updates fight slot status to `proposed`, and creates a notification for the relevant coach(es).

**Modified files:**
- `src/pages/organiser/EventManager.tsx` — Each open slot gets a "Find Fighters" button that opens the search panel. Once a match is proposed, the slot shows the proposed fighters and current status.

**Coach lookup logic:** When proposing a match, look up the coach for each fighter via `fighter_profiles.created_by_coach_id` or `fighter_gym_links` → `gyms.coach_id`. Create notification rows for the relevant coaches.

---

## Step 3: Organiser Dashboard — Live Data

**Modified files:**
- `src/pages/OrganiserDashboard.tsx` — Replace hardcoded "0" values with real queries:
  - My Events: `select count from events where organiser_id = auth.uid()`
  - Open Slots: `select count from fight_slots inner join events where status = open`
  - Pending Confirmations: `select count from match_proposals inner join fight_slots inner join events where status in (pending_*)`
- Add a table/list of events with status badges, linking to EventManager.
- Add a section showing active match proposals with their current confirmation stage.

---

## Step 4: Coach — Incoming Proposals + Approval

**New files:**
- `src/components/coach/ProposalCard.tsx` — Shows match proposal details: event name, weight class, Fighter A vs Fighter B comparison (record, style, height, reach). Accept/Decline buttons with optional comment textarea.

**Modified files:**
- `src/pages/CoachDashboard.tsx` — Replace placeholders with:
  - **Fighter Roster:** Query `fighter_profiles` where `created_by_coach_id = auth.uid()` plus fighters linked via `fighter_gym_links` → `gyms` where `coach_id = auth.uid()`.
  - **Incoming Proposals:** Query `match_proposals` joined with `fighter_profiles` where the coach's fighters are involved and status is `pending_coach_a` or `pending_coach_b`.
  - **Accept action:** Insert `confirmations` row, update `match_proposals.status` to next stage (e.g., `pending_coach_b` → `pending_fighter_a`). Create notification for next party.
  - **Decline action:** Update status to `declined`, notify organiser.

**Status progression logic:**
- `pending_coach_a` → Coach A accepts → `pending_coach_b`
- `pending_coach_b` → Coach B accepts → `pending_fighter_a`
- Any coach declines → `declined`

---

## Step 5: Fighter — Confirmation Portal

**New files:**
- `src/components/fighter/MatchProposalCard.tsx` — Shows upcoming match details: opponent, event, date, weight class. Accept/Decline buttons.

**Modified files:**
- `src/pages/FighterDashboard.tsx` — Replace placeholders with:
  - **Match Proposals:** Query `match_proposals` where `fighter_a_id` or `fighter_b_id` matches the fighter's profile and status is `pending_fighter_a` or `pending_fighter_b`.
  - **Accept action:** Insert `confirmations` row, advance status. If both fighters confirmed → status = `confirmed`, fight slot status = `confirmed`.
  - **Decline action:** Status → `declined`, notify organiser and coaches.
  - **Upcoming Fights:** Query confirmed match proposals with event details.

**Fighter profile lookup:** Query `fighter_profiles` where `user_id = auth.uid()` to get the fighter's profile ID for matching against proposals.

**Status progression:**
- `pending_fighter_a` → Fighter A accepts → `pending_fighter_b`
- `pending_fighter_b` → Fighter B accepts → `confirmed` (fight slot also → `confirmed`)
- Any fighter declines → `declined`

---

## Notification Inserts (Cross-cutting)

Notifications are created inline during Steps 2, 4, and 5:
- Step 2: Organiser proposes → notify Coach A (`match_proposed`)
- Step 4: Coach accepts → notify next coach or fighter (`match_accepted`). Coach declines → notify organiser (`match_declined`).
- Step 5: Fighter accepts → notify next fighter or all parties on confirmation (`match_confirmed`). Fighter declines → notify organiser + coaches (`match_declined`).

**RLS issue:** The `notifications` insert policy requires `auth.uid() = user_id`, which means a user can only insert notifications for themselves. This needs a fix — either a database function (security definer) to insert notifications for other users, or an RLS policy update. I will create a `create_notification` security definer function to handle this.

---

## Database Migration Required

One migration needed:
- Create `create_notification()` security definer function that allows inserting notifications for any user (called server-side by authenticated users during matchmaking actions).
- Alternatively, update the notifications INSERT RLS to allow authenticated users to insert for any user_id (less secure) — the security definer function is preferred.

---

## New Routes Summary

```text
/organiser/create-event    → CreateEvent (protected: organiser)
/organiser/events/:id      → EventManager (protected: organiser)
```

No new routes needed for Coach or Fighter — their dashboards handle everything inline.

