
# Phase 2 rework — EventDetail layout gap-fix

Phase 2 shipped the waitlist backend + dialog and the gym mailto wiring, but the EventDetail page was NOT rebuilt to match reference image 2. The current page is still the old single-column banner hero with a toggle-map and inline ticket list. This plan finishes what Phase 2 promised.

## Gap analysis vs. reference image 2

| Reference (image 2)                                                        | Current EventDetail                            | Fix          |
| -------------------------------------------------------------------------- | ---------------------------------------------- | ------------ |
| `← All events` back link (text, top)                                       | `← Back` ghost button                          | Rename + restyle |
| Eyebrow: `PROMOTION · DISCIPLINE` + `★ BOOSTED` pill                       | No eyebrow. Boosted pill sits on banner image  | New eyebrow row above title |
| Huge Bebas title, no banner image above it                                 | Banner image hero with title overlaid           | Move title into hero row; keep cover as smaller optional element |
| Meta row: calendar date · doors · first bout · venue · city                | Only date + venue chips                        | Add doors / first bout entries |
| **Two-column body** — map (left) + tickets & event details (right sticky)  | Single column; map behind a toggle             | New `lg:grid-cols-[minmax(0,1fr)_360px]` layout |
| Map card ALWAYS visible with `Open in Maps` footer                         | Map hidden until user clicks "Show map"        | Remove toggle, render inline map card |
| Right column: `TICKETS` card listing every tier publicly                   | Tickets rendered inline in left flow           | Move into sticky right card (reuse existing `TicketSection`) |
| Right column: `EVENT DETAILS` table (Promoter / Discipline / Doors / First bout / Venue) | Not present                          | New `EventDetailsCard` component |
| Waitlist card replaces tickets card when sold out                          | Waitlist banner sits below action buttons      | Move into right column, swap with tickets card |
| **No AI Matchmaking button anywhere**                                      | Present in surrounding actions                 | Remove |

## Files to edit

- `src/pages/EventDetail.tsx` — layout rewrite of the `return (...)` block. All data hooks, RLS queries, interest toggle, waitlist state, `TicketSection`, boost badge, put-forward and claim dialogs stay untouched — this is a presentation-only refactor.
- `src/components/event/EventDetailsCard.tsx` — new small stateless card (Promoter, Discipline, Doors, First bout, Venue rows).

No new components beyond `EventDetailsCard`. No route, RLS, matchmaking, or data changes. All colors/shadows via existing semantic tokens so Phase 4 light-mode still flips automatically.

## New layout skeleton

```text
Header
────────────────────────────────────────────────────────────
← All events
PROMOTION · DISCIPLINE          [★ BOOSTED]
HUGE BEBAS EVENT TITLE
📅 Sat, 4 Jul 2026   🕒 Doors 19:00 · First bout 20:00   📍 O2 Arena, London
────────────────────────────────────────────────────────────
┌─────────────────────────────┐  ┌──────────────────────┐
│ Map (always visible)        │  │ TICKETS              │
│ Venue footer + Open in Maps │  │ · Tier 1  £60  [+/-] │
├─────────────────────────────┤  │ · Tier 2  £45  [+/-] │
│ FIGHT CARD                  │  │ · Tier 3  SOLD OUT   │
│  · Main events              │  └──────────────────────┘
│  · Undercards               │  ┌──────────────────────┐
├─────────────────────────────┤  │ EVENT DETAILS        │
│ About                       │  │ Promoter · Discipline│
│ (description + contact)     │  │ Doors · First bout   │
└─────────────────────────────┘  │ Venue                │
                                 └──────────────────────┘
                                 [Waitlist card replaces
                                  Tickets when sold out]
```

Sticky right column: `position: sticky; top: 80px;` on `lg+` screens. Right column stacks under left column on mobile with the tickets card first (mirrors mobile UX shown in reference).

## Details of each change

1. Delete banner-title hero. Render title + eyebrow + boosted pill in a plain header block. If `event.banner_image` exists, keep it as a slim cover strip above the eyebrow (60–120px, no title overlay) — kept per earlier note "with the cover image added".
2. Meta row uses `event.doors_time`/`event.first_bout_time` when present, otherwise derive from `event.date`.
3. Remove `mapOpen` state + toggle chip; render the map card unconditionally when `hasCoords`. Add an `Open in Maps` link that opens `https://www.google.com/maps/search/?api=1&query={lat},{lng}` in a new tab.
4. Extract the existing tickets block into the right column. When `allSoldOut`, swap it for the existing waitlist card (already built in Phase 2) in the same slot.
5. New `EventDetailsCard` renders whichever of `promotion_name`, `discipline`, `doors_time`, `first_bout_time`, `venue_name` are present. No behaviour, no queries.
6. Remove any `AI Matchmaking` / matchmaking CTA button rendered on this page (audit `EventDetail.tsx` for the string).
7. Public read: confirm `tickets` has an anon SELECT policy scoped to published events. If missing, add it as a separate migration BEFORE the layout edit lands so the right-column tickets card renders for logged-out users.

## Technical notes

- Two-column grid: `grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6`.
- Sticky wrapper: `<aside className="lg:sticky lg:top-[80px] lg:self-start space-y-4">`.
- Reuses `TicketSection` component unchanged. Only its parent container/margin styles change.
- Waitlist card visibility logic stays identical to Phase 2 (`allSoldOut` boolean); only its DOM position moves.
- All new surfaces use `bg-card`, `text-foreground`, `text-muted-foreground`, `text-primary`, `hsl(var(--card))` — no hardcoded hex.

## Out of scope (still queued)

- Phase 3 — GymDetail rebuild + Proposal accept/pending redesign.
- Phase 4 — Light-mode token repaint.
- Anything on Explore / Interests cards (Phase 1 already shipped, matches image 1 / image 5).

Ship this, review the EventDetail page against image 2, then proceed to Phase 3.
