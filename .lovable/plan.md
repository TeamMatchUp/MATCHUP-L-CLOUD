

# Phase 0 + Phase 1: Foundation, Auth, Data Architecture, and Public Discovery

## Overview

This phase establishes the complete backend foundation and public-facing discovery layer. By the end, we'll have: working auth with role selection, all core database tables, and public browsing of events and fighters backed by real data.

## 1. Enable Lovable Cloud

Before any backend work, we need Lovable Cloud enabled on the project. This provides the Supabase instance for auth, database, and edge functions.

## 2. Database Schema

### Tables to create:

- **profiles** — extends auth.users (id, full_name, avatar_url, created_at)
- **user_roles** — multi-role support (user_id, role enum: organiser/coach/fighter)
- **gyms** — (id, name, location, country, description, logo_url, coach_id)
- **fighter_profiles** — (id, user_id nullable, name, weight_class, record_wins/losses/draws, height, reach, style, country, availability, bio, created_by_coach_id)
- **fighter_gym_links** — many-to-many (fighter_id, gym_id, is_primary)
- **events** — (id, organiser_id, title, date, location, country, promotion_name, description, status)
- **fight_slots** — (id, event_id, weight_class, slot_number, status)
- **match_proposals** — (id, fight_slot_id, fighter_a_id, fighter_b_id, proposed_by, status enum, created_at)
- **confirmations** — (id, match_proposal_id, role, user_id, decision, comment, decided_at)
- **notifications** — (id, user_id, type, title, message, read, reference_id, created_at)

### Enums:
- `app_role`: organiser, coach, fighter
- `match_status`: pending_coach_a, pending_coach_b, pending_fighter_a, pending_fighter_b, confirmed, declined, withdrawn
- `fight_slot_status`: open, proposed, confirmed, cancelled

### RLS:
- `has_role()` security definer function for role checks
- Public read on events, fighter_profiles, gyms
- Role-gated write access on all tables
- Users can only update their own profiles

## 3. Authentication System

- Email/password signup with role selector (multi-select: Organiser, Coach, Fighter)
- Login page
- Password reset flow with `/reset-password` page
- Auto-create profile on signup via database trigger
- Store selected roles in `user_roles` table
- Protected route wrapper checking auth state
- Role-based redirect after login (to appropriate dashboard)

### Pages:
- `/auth` — Login / Signup with role selection
- `/reset-password` — Password reset form

## 4. Role-Based Navigation & Layout

- Authenticated sidebar layout with role switcher (for multi-role users)
- Header updates: show user menu when logged in, with role indicator
- Route guards: `/organiser/*`, `/coach/*`, `/fighter/*` protected by role
- Placeholder dashboard pages for each role (populated in Phase 2+)

### New pages (placeholder):
- `/organiser/dashboard`
- `/coach/dashboard`
- `/fighter/dashboard`

## 5. Public Discovery Layer (Database-Backed)

Replace current mock data with real Supabase queries:

- **Events page** (`/events`) — list events with filters (country, weight class, date), show open slots count
- **Event detail page** (`/events/:id`) — event info, fight slots, confirmed matchups
- **Fighters page** (`/fighters`) — public fighter profiles with filters (country, weight class, style)
- **Fighter detail page** (`/fighters/:id`) — full profile with record, stats, gym affiliation, fight history

Seed the database with sample data for demonstration.

## 6. Gym Profiles

- **Gym listing page** (`/gyms`) — browse gyms by country
- **Gym detail page** (`/gyms/:id`) — gym info, affiliated fighters, coach info

## Technical Notes

- All Supabase queries via `@tanstack/react-query` for caching
- Supabase client configured via Lovable Cloud auto-generated integration
- `onAuthStateChange` listener set up before `getSession`
- Notifications table ready for Phase 2 matchmaking flow
- Email notifications will use Lovable Cloud email capabilities

## Implementation Order

1. Enable Lovable Cloud
2. Create all database tables + enums + RLS + triggers
3. Build auth pages (signup with role selector, login, reset password)
4. Build protected route wrapper + role-based navigation
5. Build placeholder dashboards
6. Refactor Events page to query Supabase
7. Build Event detail page
8. Refactor Fighters page to query Supabase
9. Build Fighter detail page
10. Build Gym pages
11. Seed sample data
12. End-to-end verification

