# Fix ticket editing on Organiser Manage Event hub

**File:** `src/components/organiser/ManageTicketsPanel.tsx`

The panel already supports editing existing tickets via an `upsertMutation`, but the edit form is missing two fields (`sales_start`, `sales_end`), and the Edit button is icon-only with no label so it's not discoverable.

Edits already go live immediately on the public event page — `src/pages/EventDetail.tsx` reads from the `tickets` table directly (no draft/publish step). No additional plumbing is required for that. No schema changes needed.

## Changes

1. **Extend `TicketForm` and `emptyForm`** to include `sales_start` and `sales_end` (both `string`, treated as datetime-local values).

2. **Update `upsertMutation` payload** to include:
   ```
   sales_start: form.sales_start ? new Date(form.sales_start).toISOString() : null,
   sales_end:   form.sales_end   ? new Date(form.sales_end).toISOString()   : null,
   ```

3. **`openEdit` prefill** — convert existing ISO timestamps to the `datetime-local` format `YYYY-MM-DDTHH:mm` (slice the ISO string). Pre-fill all six fields: ticket_type, price, quantity_available, sales_start, sales_end, external_link.

4. **Form UI** — add a two-column row (`grid-cols-1 sm:grid-cols-2`) with `<Input type="datetime-local">` for **Sales Start** and **Sales End**, placed between the Qty row and the External Link field. Mark them optional in helper copy.

5. **Edit button** — change the icon-only ghost button to a labeled outline button: `<Pencil /> Edit`, matching the styling of the existing "Add Ticket" button. Keep the trash icon button unchanged.

6. **Row layout** — make the row use `flex-col sm:flex-row` so the labeled Edit/Delete buttons don't crowd the badge/price row on mobile.

7. **Optional display** — show sales window under the row when set: `"On sale {dd MMM} – {dd MMM}"` in muted text, so organisers can see at a glance what was saved.

## Out of scope
- No RLS or schema changes (`sales_start` / `sales_end` columns already exist).
- No changes to `EventDetail.tsx` — it already filters tickets by `sales_start`/`sales_end` and reads live data.
