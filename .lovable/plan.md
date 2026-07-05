
# Full redesign plan — Phases 1–4

All work stays inside the existing dark liquid-glass tokens (bg #080a0d, card #111318, gold #e8a020, Bebas/Inter, soft shadow + inset highlight, no borders). Every new component uses semantic tokens only, so Phase 4's light-mode repaint flips automatically without touching component code.

---

## Phase 1 — Explore cards + Interests reuse

Explore page (`src/pages/Explore.tsx`)
- **Ordering:** boosted listings first (active `event_boosts` for events, `listing_tier` for gyms), rest by date/name.
- **Event card** (image 1 layout):
  - Fixed height, single card component reused everywhere.
  - Left: day/month block in gold Bebas.
  - Right: title, venue · time, short description (2-line clamp), discipline chip + "From £X" or red "SOLD OUT".
  - `★ BOOSTED` pill top-right when boosted.
  - **Avatar removed.**
- **Gym card** (image 8 layout):
  - Fixed height, no avatar.
  - Name, city · N pro fighters · N upcoming, description (2-line clamp), verified chip top-right, discipline pills row.
- Descriptions truncate; cards never expand to fit content.

Interests page (`src/components/fighter/InterestedEventsPanel.tsx`, `DashboardEvents.tsx`)
- Replaces bespoke row with the same Explore event card component.

Files
- `src/pages/Explore.tsx`, new `src/components/explore/EventCard.tsx` + `GymCard.tsx`, `src/components/fighter/InterestedEventsPanel.tsx`, `src/components/dashboard/DashboardEvents.tsx`.

---

## Phase 2 — EventDetail rebuild (image 2) + waitlist + gym mailto

EventDetail (`src/pages/EventDetail.tsx`)
- Hero: "← All events" · "PROMOTION · DISCIPLINE" + boosted pill · huge Bebas title · date / doors + first bout / venue · city.
- Left column: Map card (existing Pigeon Map) with venue footer + "Open in Maps"; Fight Card section with title-fight gold outline, corner initials, names + nicknames + records + flags, weight chip, "Awaiting profile" fallback; About section.
- Right column (sticky, `backdrop-blur-xl bg-card/70` for liquid glass):
  - **Tickets card** — every tier listed publicly (name, description, price, qty available, "Only N left", sold-out state, qty stepper) with single "Select tickets" CTA.
  - **Waitlist card** — appears when `sold_out = true` or all tiers exhausted. Signed-in one-click; guests provide name + email. Insert into new `event_waitlist` table, then call `create_notification` for `events.organiser_id`. Idempotent per (event_id, email).
  - Event Details card (promoter, discipline, doors, first bout, venue). **AI Matchmaking button removed.**
  - Share event + Add to calendar buttons.

GymDetail contact wiring (`src/pages/GymDetail.tsx`)
- "Contact Gym" → `mailto:` with `to = gym.contact_email`, subject "Enquiry via MatchUp — {gym name}", body prefilled with sender's name/email; if sender is an organiser with an upcoming event, prefill "Enquiry from {organiser name} regarding {event title} on {date}".
- Phone icon → `tel:` when `phone` is set.
- (Full GymDetail visual rebuild is Phase 3.)

Migration
```sql
CREATE TABLE public.event_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  ticket_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.event_waitlist TO authenticated;
GRANT INSERT ON public.event_waitlist TO anon;
GRANT ALL ON public.event_waitlist TO service_role;
ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone joins waitlist" ON public.event_waitlist
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "organiser or self reads waitlist" ON public.event_waitlist
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organiser_id = auth.uid())
    OR user_id = auth.uid()
  );
```
Also verify (and add if missing) anon SELECT policies for `tickets` and `event_fight_slots` scoped to `events.status = 'published'` / `is_public = true` so the public detail page renders for logged-out users.

---

## Phase 3 — GymDetail rebuild (image 3) + Proposal accept/pending (image 4)

GymDetail (`src/pages/GymDetail.tsx`)
- Hero: gym avatar circle (kept only on detail page), Bebas name, verified chip, meta (city · disciplines), phone icon + "CONTACT GYM" primary (mailto from Phase 2).
- KPI strip: Combined Record, Win Rate, Knockouts, Titles Held, Pro Fighters, Upcoming Events.
- "Inside the Gym" gallery: large slide + thumbnail row with caption + counter.
- Two-column body:
  - Left: About card; Competition Roster (fighter mini-cards with avatar, name, nickname, flag · discipline, record / KOs / class, availability pill); Recent Results list.
  - Right: Map card; Contact card (address, phone, email, get directions); Roster in Action (upcoming events with roster members on the card); Disciplines & Facilities chips + short description.

Proposal detail (`src/components/proposal/ProposalDetail.tsx`, `src/pages/ProposalDetailPage.tsx`)
- Hero: "← Dashboard", "MATCH PROPOSAL · {EVENT NAME}", Bebas "{FIGHTER A} vs {FIGHTER B}", overall status pill top-right, meta line "Main Card — Weight · proposed by {promoter} · {date}".
- Two side-by-side corner cards (Red / Blue):
  - Corner header row: initials avatar, "Red/Blue corner", coach/gym subtitle, corner status pill.
  - Fighter row: name, "Fighter — {corner}", timestamp, Accepted pill OR Accept/Decline buttons when current user is that fighter.
  - Coach row: same pattern for that fighter's coach/gym.
- Footer note: "A bout confirms only when every required party on both sides accepts."
- Existing accept/decline RPC calls remain unchanged; only the panel UI is rebuilt.

---

## Phase 4 — Light-mode repaint (images 6–9)

- Locate the existing light-mode toggle (`ThemeProvider`, `.light` block in `src/index.css`).
- Repaint light tokens to match the reference:
  - `--background` #f2f1ec off-white
  - `--card` #ffffff
  - `--foreground` #0a0a0a
  - `--muted-foreground` neutral 500
  - `--primary` electric blue #2563eb (hover #1d4ed8), `--primary-foreground` white
  - `--border` neutral 200, subtle
  - Success red for SOLD OUT stays legible on light.
- Keep Bebas Neue / Inter typography, keep card shadow shape (softer values on light).
- Audit Phase 1–3 components: any leftover hardcoded hex → replaced with semantic tokens so the toggle covers them.
- Dark mode untouched.

---

## Global rules across all phases

- No route changes.
- No matchmaking scoring changes.
- No RLS rewrites beyond the additive policies noted above.
- No hardcoded colors in any component — semantic tokens only.
- Liquid-glass surfaces (backdrop blur + soft inset highlight) preserved and extended to the new sticky tickets column.
- Ship phases in order; pause after each for review.
