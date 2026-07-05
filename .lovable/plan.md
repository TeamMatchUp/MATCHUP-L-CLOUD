## Landing page

**Hero (`HeroSection.tsx`)**
- Resize `AppIcon` from `clamp(56px,6vw,88px)` up to match the H1 height — target `clamp(72px,11vw,176px)` (roughly 2 lines × 88px) so the shield reads the same height as "MATCH EASY / FIGHT HARD".
- Subtitle "Fighters, coaches and promoters are already matching…" → change to normal weight (`font-normal`), wrap only "Don't get left off the card." in `<strong className="font-bold">`.

**Ticker (`UpcomingFightsTicker.tsx`)**
- Center the marquee content when the item row is narrower than the container (add `justify-center` to the track when total width < viewport, or duplicate content so the scroll always fills width). Removes empty right-side gap.

**Feature showcase (`FeatureShowcase.tsx`)**
- Replace the three preview mock images (For Fighters / For Coaches / For Organisers) with the three uploaded screenshots, respectively:
  - Fighters → `user-uploads://image-33.png` (fighter profile)
  - Coaches → `user-uploads://07667382-…webp` (coach analytics)
  - Organisers → `user-uploads://5dbb6f47-…webp` (event manager)
- Import via `lovable-assets` pointer JSON into `src/assets/`.

**Platform stats (`PlatformStatsStrip.tsx`)**
- Remove "Bouts Confirmed On Time" KPI.
- Add "Hours Saved" = `count(events) × 4`, formatted as `Nh` or plain integer.

**Final CTA (`FinalCtaSection.tsx`)**
- Headline copy → "YOUR TICKET TO THE FUTURE OF **COMBAT SPORTS** IS ONE STEP AWAY" (gold on "COMBAT SPORTS").

## Event detail — ticket section (`src/pages/EventDetail.tsx`)

Fix bug where only one ticket type renders when multiple exist:
- Investigate the query in `TicketSection` — likely `.single()` or a bad filter. Switch to fetch all rows for `event_id`, order by `price` asc.
- Render every tier with: name, description, price, availability, `-` / qty / `+` stepper (already built), and a single "ADD N TO BASKET — £X" button aggregating all selected tiers (already built — just needs the full list to iterate over).

## Organiser event manager (`src/pages/organiser/EventManager.tsx`)

- **Manage Tickets** button → open a `<Dialog>` containing `ManageTicketsPanel` instead of expanding an inline section.
- **Publish Event** button → hoist out of `EditEventDialog` and render on the main manager page header (next to Boost / Preview / Share / Edit).
- **Financial Summary**:
  - Add a per-ticket breakdown table: tier name · price · sold/available · revenue.
  - Add "Expenses" sub-section with add / edit / delete rows (description + amount). Store in new `event_expenses` table.
  - Net = ticket revenue − sum(expenses).

### New table `event_expenses`
Columns: `id`, `event_id` (fk), `description`, `amount` (numeric), `created_at`, `updated_at`.
Grants: `authenticated` + `service_role`. RLS: organiser of the event can manage; readable by organiser only.

## Out of scope
- No changes to matchmaking, RLS on other tables, or routing.
