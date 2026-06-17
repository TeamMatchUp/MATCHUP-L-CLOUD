# Ticket description: organiser input + public expandable row

The `tickets.description` column already exists (text, nullable). No schema migration needed.

## 1. Organiser form — `src/components/organiser/ManageTicketsPanel.tsx`

- Add `description: string` to `TicketForm` and `emptyForm`.
- In `openEdit`, prefill `description: ticket.description ?? ""`.
- In `upsertMutation`'s payload, include `description: form.description.trim() || null`.
- In the dialog, add a `<Textarea>` (shadcn) below "External Purchase Link" labelled **"Description"** with helper text "What's included with this ticket (optional)" and a 3–4 row default. Add the missing `import { Textarea } from "@/components/ui/textarea";`.

## 2. Public event page — `src/pages/EventDetail.tsx` (`TicketSection`, lines 38–176)

Goal: add a chevron toggle on each ticket row that reveals `quantity_available` and `description` when expanded, **without breaking** the existing 3-column grid (`minmax(0,1fr) auto auto`) that aligns title / price / qty+Buy.

- Add per-row state `expandedId: string | null` (single-open) alongside the existing `selectedId`.
- Restructure each ticket from a single grid `<div>` to a vertical container (still rounded `#181c24`, same padding/shadows). Inside it:
  - **Top row** — the existing 3-column grid wrapped in its own `<div>` so the price/Buy alignment is unchanged. Add a small chevron button as the **first cell** of column 1 (inside the title block, left of the type name) so it lives within the title cell and does not shift columns 2/3.
    - Show chevron only when expandable content exists (`ticket.quantity_available != null || !!ticket.description`).
    - `<ChevronDown>` rotated 180° when expanded, 16px, muted colour, `onClick` stops propagation, toggles `expandedId`.
  - **Expanded panel** — sibling below the top row, conditionally rendered. Adds `marginTop: 10`, `paddingTop: 10`, inset top border via `boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)"` (no real border per design rules). Contains:
    - Quantity line: `"<n> tickets available"` in `#8b909e` when `quantity_available != null`.
    - Description paragraph: `whiteSpace: "pre-wrap"`, `fontSize: 13`, `color: "#8b909e"`, `lineHeight: 1.5` when `description` is set.
  - Wrap with simple CSS transition (`maxHeight` + `opacity`) or just conditional render — start with conditional render for simplicity.
- Collapsed by default (initial `expandedId = null`).
- Click on the chevron must NOT trigger `handleRowClick` selection — use `e.stopPropagation()`.
- The existing row click (select + bump qty to 1) behaviour is preserved.

## Out of scope
- No schema migration (column already exists).
- No changes to basket logic, sales-window filtering, or organiser dashboard ticket list.
