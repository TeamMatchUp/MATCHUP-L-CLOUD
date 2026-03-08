

# MATCHUP Build Verification Audit

## Audit Results Summary

I've reviewed every table, RLS policy, enum, page, route, and component against the checklist. Here are the findings:

---

## PASSING (Implemented Correctly)

| # | Item | Status |
|---|------|--------|
| 1 | Visitor Layer — public browsing of events, fighters, gyms | PASS |
| 1 | Authentication Layer — signup/login with role selection | PASS |
| 1 | Permission Tier System — organiser, fighter, gym_owner, admin enums | PASS |
| 1 | Role Dashboards — Organiser, GymOwner, Fighter dashboards exist | PASS |
| 2 | Visitors can browse fighters, gyms, events without login | PASS |
| 2 | Restricted actions redirect to /auth | PASS |
| 4 | Organiser can create/edit events, create fight cards, send match requests | PASS |
| 4 | Organiser cannot edit fighter records (RLS enforced) | PASS |
| 4 | Gym Owner can create multiple gyms | PASS |
| 4 | Gym Owner can manage roster, edit fighter records | PASS |
| 4 | Gym Owner inherits organiser + fighter capabilities (has_role function) | PASS |
| 4 | Fighter cannot edit wins/losses (RLS: only coach can update records) | PASS |
| 6 | Tables: events, fight_slots, fighter_profiles, fighter_gym_links, fighter_records, fight_results, result_verifications, match_proposals, notifications, tickets, promotions, profiles, user_roles, confirmations, gyms | PASS |
| 7 | Many-to-many fighter-gym via fighter_gym_links with is_primary | PASS |
| 8 | User → many Gyms relationship | PASS |
| 9 | Separate fighter_records table, only gym_owner can modify (RLS) | PASS |
| 10 | Hybrid verification: fight_results + result_verifications tables exist with verifier_type/verifier_id | PASS |
| 11 | match_proposals table with fight_slot_id, fighter_a_id, fighter_b_id, proposed_by, status | PASS |
| 12 | tickets table with event_id, ticket_type, price, quantity_available, sales_start, sales_end, external_link | PASS |
| 13 | promotions table with owner_id, promotion_type, target_id, boost_level, payment_status | PASS |

---

## GAPS FOUND (Needs Implementation)

### GAP 1: fighter_gym_links missing `status` and `role` columns
The spec requires `status` (pending/accepted/declined) and `role` fields for gym affiliation workflow. Current table only has: id, gym_id, fighter_id, is_primary, created_at.

**Fix:** Add `status` (text, default 'pending') and `role` (text, nullable) columns via migration.

### GAP 2: Gyms table missing several spec fields
Missing: `city`, `address`, `contact_email`, `phone`, `website`, `verified`. Currently has: id, coach_id, name, description, location, country, logo_url, created_at, updated_at.

**Fix:** Add columns via migration. These are needed for full gym profiles and verification.

### GAP 3: Fighter profiles missing `visibility` and `profile_image`
Spec requires visibility toggle and profile image. Also missing separate `first_name`/`last_name`/`nickname` (currently just `name`).

**Fix:** Add `visibility` (text, default 'public'), `profile_image` (text, nullable). Keep `name` as-is (splitting into first/last/nickname is optional but the single name field works).

### GAP 4: Events table missing spec fields
Missing: `venue_name`, `city`, `ticket_enabled`, `promotion_status`. Has `location` which partially covers venue.

**Fix:** Add `venue_name`, `city`, `ticket_enabled` (boolean, default false), `promotion_status` (text, nullable) columns.

### GAP 5: No onboarding flows
After signup, users land on their dashboard but there's no guided onboarding:
- Fighter: no prompt to create fighter profile
- Gym Owner: no prompt to register first gym (partially exists — empty state shows "Create Your First Gym")
- Organiser: no prompt to create first event (partially exists — empty state shows "Create Your First Event")

**Fix:** The empty-state CTAs partially cover this. Add a fighter profile creation form to the Fighter Dashboard when no profile exists (currently shows "Ask your coach" which doesn't match the spec — fighters should be able to create their own profile).

### GAP 6: Organiser cannot delete events
RLS has no DELETE policy on events. Spec says organisers can delete events.

**Fix:** Add DELETE RLS policy for events where auth.uid() = organiser_id.

### GAP 7: Gym Owner cannot delete gyms
No DELETE policy on gyms table. Spec says gym owners can delete gyms.

**Fix:** Add DELETE RLS policy for gyms where auth.uid() = coach_id.

### GAP 8: Shared Systems not implemented (UI)
- **Promotion system:** Table exists but no UI for boosted listings or ranking boost logic
- **Advertising system:** No banner ads every 10 listings
- **Map system:** No map integration for gyms/events
- **Verification system:** No UI for fighter/gym verification badges or fight result verification workflow

**Fix:** These are Step 3+ UI features. Database structure is ready. Implementation needed for promotion UI, ad slots, map component, and verification badges.

### GAP 9: Fighter cannot request gym affiliation
Spec says fighters can "request gym affiliation" but there's no UI or flow for this.

**Fix:** Add a "Join Gym" action on gym detail pages for fighters, inserting fighter_gym_links with status='pending'.

### GAP 10: Gyms `verified` field missing
No verification badge system for gyms or fighters.

**Fix:** Add `verified` boolean to gyms and fighter_profiles tables.

### GAP 11: match_proposals missing some spec fields
Spec's MatchRequests has `message` and `requester_id` and `target_fighter_id`. Current match_proposals uses `proposed_by`, `fighter_a_id`, `fighter_b_id` which is functionally equivalent but lacks `message`.

**Fix:** Add `message` (text, nullable) column to match_proposals.

### GAP 12: Users/profiles table doesn't have `country` or `permission_tier`
Spec says Users table should have `permission_tier`, `country`. Current profiles table only has id, full_name, avatar_url. Permission tier is stored in user_roles (which is correct for security) but `country` is missing from profiles.

**Fix:** Add `country` to profiles table. Permission tier via user_roles is actually better than storing on profiles (avoids privilege escalation), so keep current approach.

---

## Implementation Plan

### Migration 1: Schema alignment
Add missing columns to: fighter_gym_links (status, role), gyms (city, address, contact_email, phone, website, verified), fighter_profiles (visibility, profile_image, verified), events (venue_name, city, ticket_enabled, promotion_status), match_proposals (message), profiles (country).

### Migration 2: DELETE policies
Add DELETE RLS policies for events (organiser) and gyms (gym_owner).

### Code Changes
1. **Fighter Dashboard** — Add fighter profile creation form (instead of "ask your coach")
2. **Fighter profile creation** — Fighters should be able to create their own basic profile but NOT edit official records
3. **Gym affiliation request** — Add "Request to Join" button on gym detail pages for authenticated fighters
4. **Verification badges** — Add visual indicators on fighter/gym cards for verified status
5. **Promotion boost** — Add ranking logic to directories (boosted items appear first)
6. **Ad slots** — Insert ad placeholder components every 10 listings in directories

### What to defer (Phase 4+)
- Map integration (requires external library/API)
- Full advertising system with real ad content
- Payment processing for promotions/tickets
- Result verification UI workflow

This plan addresses all 12 gaps while preserving the existing styling, animations, and working functionality.

