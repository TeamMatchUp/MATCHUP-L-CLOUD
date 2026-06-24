# Site Redesign — Staged Rollout

Adopts the layout/UX from the three dashboard screenshots and MatchUp.html, while keeping all routes, permissions, RLS, matchmaking logic, and data sources intact.

## Global decisions

- **Accent**: replace gold `#e8a020` with coral red `#ef4444` (active), `#dc2626` (hover), `rgba(239,68,68,0.12)` (dim fill). Greens/warning/destructive unchanged.
- **Surfaces unchanged**: page `#080a0d`, card `#111318`, raised `#181c24`, hover `#1e2330`. Bebas Neue headings, Inter body. No borders on cards/inputs. Existing shadow spec retained.
- **Sidebar + header shell stays.** Only addition is a Calendar tab inside each dashboard.
- **Auth modal** (frosted, in-place) over the current route; `/auth` kept as deep-link fallback for password-reset emails.

Ships in 4 stages, each previewed before the next.

---

## Stage 1 — Token swap + landing + auth modal

**Tokens**: update `src/index.css` (`--primary`, `--ring`, `--accent`, gradient/shadow tokens) and `tailwind.config.ts`. Sweep components for `#e8a020` / `rgba(232,160,32,*)` hex literals and replace.

**Landing** (`src/pages/Index.tsx`, `src/components/landing/*`):
- Keep three existing sections (How it works, KPIs, role pitch) and copy.
- Add hero CTA (“Get started” → opens auth modal in Sign Up mode; secondary “Sign in”).
- Refresh visual treatment to match dashboard screenshots — charcoal card stack, red accent KPIs, Bebas Neue numerals, existing `NetworkBackground`.

**Auth modal** (new `src/components/auth/AuthModal.tsx` + provider):
- Frosted backdrop (`rgba(0,0,0,0.6)` + blur), card spec matches modal tokens, no border.
- Reuses **every existing field, validation, and Supabase call** from `Auth.tsx` + onboarding — no signup logic rewrite.
- Renders the existing multi-step signup as a click-through **progress bar** inside the modal; form state persists across steps; closes and routes to `/onboarding` (or wherever the current flow hands off) on success.
- `openAuthModal('signin'|'signup')` context wraps `App.tsx`; header + landing CTAs trigger it.

## Stage 2 — Explore + Public fighter profile

**Explore cards** (`src/pages/Explore.tsx`, card components):
- Re-proportion per design rules (96px fighter avatar, Win Rate inline in stat row, no overlay badge, MU watermark sizing, no borders).
- Search, filters, map, pagination, sort, and queries untouched.

**Public fighter profile** (`src/pages/FighterDetail.tsx`):
- New layout: header strip with avatar + record, KPI row (Pro Record, Win Rate, KO%, recent form), fight history grouped by year, titles section.
- Data sources unchanged (existing `fights` / `fighter_profiles` / `fighter_records` logic).

## Stage 3 — Dashboards (Fighter / Coach / Organiser)

Apply screenshot layout to each dashboard. No data/RLS/permission changes.

- `FighterDashboard.tsx` → KPI row + Overview (Next Fight, Quick Actions, Recent Fights, Notifications).
- `CoachDashboard.tsx` → KPI row + Overview (Fighter Performance, Upcoming Fights, Recent Activity).
- `OrganiserDashboard.tsx` → KPI row + Overview (Upcoming Events, Sales chart, Notifications).
- Quick Actions right-rail using the fighter screenshot pattern.
- Tab strip under KPIs with red active underline.

## Stage 4 — Create Event wizard + Calendar

**Create Event**: convert to single-page stepper with click-through progress bar (Details → Venue → Bouts → Tickets → Review). All fields, validation, inserts, ticket logic, and matchmaking slider rules preserved.

**Calendar tab** inside each dashboard (not a sidebar route):
- Fighter: their fights. Coach: roster fights. Organiser: their events.
- shadcn `Calendar` (`pointer-events-auto`), month view + agenda list, popovers link to existing detail pages.
- Uses existing `fights` / `events` queries; no new tables.

---

## Out of scope

- Matchmaking scoring + slider math.
- RLS, grants, edge functions, DB schema.
- Route additions/removals beyond keeping `/auth` fallback.
- Role assignment / `user_roles`.
- Stripe/ticketing logic, fight history queries, record calculation logic.

## Technical notes

- All colour changes via CSS variables; no `text-red-*` literals in components.
- Auth modal context wraps `App.tsx`; signup flow internals untouched.
- Each stage ends with a preview check.

Starting with **Stage 1** on approval.
