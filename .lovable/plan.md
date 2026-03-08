

## Ticket Management for Events

The `tickets` table already exists in the database with all needed columns: `ticket_type`, `price`, `quantity_available`, `external_link`, `sales_start`, `sales_end`, `event_id`. No database changes required.

### Changes

**1. Create `src/components/organiser/ManageTicketsPanel.tsx`**
- Panel displayed in the EventManager page for organisers
- Lists existing tickets for the event (type, price, quantity, external link)
- "Add Ticket" button opens a dialog/inline form with fields: ticket type (text input, e.g. "General Admission", "VIP"), price (number), quantity available (number), external link (URL for purchase)
- Each ticket row has Edit and Delete buttons (note: DELETE RLS policy is missing -- we'll need a migration for that)
- Uses `useMutation` for CRUD operations, invalidates `["event-tickets", eventId]`

**2. Add DELETE RLS policy for tickets**
- Database migration: allow organisers/gym_owners to delete tickets they manage
```sql
CREATE POLICY "Organisers and gym owners can delete tickets"
ON public.tickets FOR DELETE
USING (has_role(auth.uid(), 'organiser'::app_role) OR has_role(auth.uid(), 'gym_owner'::app_role));
```

**3. Update `src/pages/organiser/EventManager.tsx`**
- Import and render `ManageTicketsPanel` below the fight card sections
- Pass `eventId` as prop

**4. Update `src/pages/EventDetail.tsx`**
- Fetch tickets for the event alongside existing data
- Display a "Tickets" section showing each ticket type with price, availability, and a "Buy Tickets" button linking to the external URL
- Section only renders if tickets exist

**5. Update `src/components/organiser/EditEventDialog.tsx`**
- Add a toggle/checkbox for `ticket_enabled` field so organisers can enable/disable ticket visibility on the public event page

### UI Details
- Organiser side: table-style list with inline actions
- Public side: card-style ticket display with prominent external link buttons
- Ticket type displayed as badge, price formatted with currency, quantity shown as "X available"

