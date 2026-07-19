## Goal
Manual admin review queue for new gyms and events, reusing the gym-claim admin pattern. Also fix `has_role()` so it recognises admins whose role lives in `auth` app_metadata.

## 0. Fix `has_role()` (prerequisite)
Update the SECURITY DEFINER function so admin resolves from either source:

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    -- JWT app_metadata admin (works for admins provisioned in auth.users only)
    (_user_id = auth.uid()
     AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND (
          role = _role
          OR role = 'admin'
          OR (role = 'gym_owner' AND _role IN ('organiser','fighter','coach'))
        )
    )
$$;
```

The JWT branch is gated on `_user_id = auth.uid()` because `auth.jwt()` only reflects the caller. All existing call sites (RLS policies, `approve_gym_claim`, etc.) continue to work unchanged and now succeed for the app_metadata admin.

## Naming note
`events.status` is already an enum (draft/published/completed/cancelled) for lifecycle. Moderation uses a new column **`review_status text`** on both tables (`pending|approved|rejected`) to avoid clash. Same column added on `gyms` for symmetry.

## 1. Database migration
- Add to `gyms` and `events`:
  - `review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected'))`
  - `review_reason text`
  - `reviewed_at timestamptz`
  - Index on `(review_status)`
- Backfill: `UPDATE gyms SET review_status='approved'; UPDATE events SET review_status='approved';` so nothing currently public disappears.
- Replace `has_role()` as above.
- New SECURITY DEFINER RPCs (admin-only via updated `has_role`, mirror `approve_gym_claim`):
  - `approve_gym(_gym_id uuid)` / `reject_gym(_gym_id uuid, _reason text)`
  - `approve_event(_event_id uuid)` / `reject_event(_event_id uuid, _reason text)`
  - Each updates the row, stamps `reviewed_at`, and calls `create_notification` targeting `coach_id` / `organiser_id`:
    - Approve → "Your gym/event is now live"
    - Reject → "Your gym/event was not approved" + reason if provided

## 2. RLS visibility
- **gyms SELECT** (currently `USING (true)`) → replace with:
  `review_status = 'approved' OR auth.uid() = coach_id OR has_role(auth.uid(),'admin')`
- **events SELECT** (currently published-or-owner) → tighten to:
  `(status='published' AND review_status='approved') OR auth.uid() = organiser_id OR has_role(auth.uid(),'admin')`
- INSERT/UPDATE/DELETE untouched. New rows enter as `pending` via the column default — no change to create-gym / create-event workflows.

## 3. Admin review queue UI (`src/pages/Admin.tsx`)
Extend the existing admin page (which already hosts gym-claim + event-claim tables) using the same table + Approve/Reject styling:
- Extend `AdminSummary` with "Pending Gyms" and "Pending Events" tiles.
- Add a **Review Queue** section with three tabs: `Gyms` / `Events` / `All`.
- Each row shows: name/title, submitter (name + email via `profiles`), date submitted, location, Approve / Reject buttons.
- Reject opens a small inline dialog with an optional reason textarea, then calls the reject RPC.
- TanStack Query; approve/reject invalidate the queue + summary; toast on success/failure.

## 4. Submitter-facing feedback (copy only)
- `src/pages/RegisterGym.tsx` post-submit → "Your gym has been submitted and is pending review. We'll notify you once it's live."
- `src/pages/organiser/CreateEvent.tsx` post-submit → equivalent event copy.
- `src/pages/Onboarding.tsx` — same copy in the coach "add first gym" and organiser/coach "add first event" success paths.
- **My Gyms / My Events status badges:**
  - `src/components/dashboard/DashboardGyms.tsx`: "Pending Review" / "Rejected" badge next to gym name; rejected shows `review_reason` under the title.
  - `src/components/dashboard/DashboardEvents.tsx`: same badge (in addition to existing lifecycle status badge).

## 5. Notifications
`approve_*` / `reject_*` RPCs call `create_notification` with `_type='system'` and `_reference_id = gym/event id` — same pattern as `approve_gym_claim` and `fighter_gym_links` approvals. No notification schema changes.

## Out of scope
Gym-claim flow, onboarding form fields, matchmaking, unrelated RLS, automated screening.

## Files touched
- New migration (has_role fix, columns, backfill, 4 RPCs, updated SELECT policies on `gyms` and `events`).
- `src/pages/Admin.tsx` — summary tiles + Review Queue tabs.
- `src/pages/RegisterGym.tsx`, `src/pages/organiser/CreateEvent.tsx`, `src/pages/Onboarding.tsx` — post-submit copy.
- `src/components/dashboard/DashboardGyms.tsx`, `src/components/dashboard/DashboardEvents.tsx` — owner-facing status badges.
