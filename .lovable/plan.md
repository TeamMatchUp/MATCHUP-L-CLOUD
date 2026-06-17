## Heads-up on Stripe

You said "reuse the existing Stripe checkout pattern already used for ticket purchases", but the current ticket Checkout page (`src/pages/Checkout.tsx`) is a placeholder showing "Payment processing coming soon" — there is no live Stripe integration yet. I'll need to set up Stripe to ship this. Two options:

1. **Lovable's built-in Stripe Payments (recommended)** — no Stripe account/API key needed up front, sandbox works immediately. I'd enable it via the payments tool before building.
2. **Bring-your-own Stripe key** — you provide `STRIPE_SECRET_KEY` and I wire two edge functions directly.

Either way, the boost purchase flow becomes the first real payment path, and the same pattern can later be dropped into the ticket checkout. **Please confirm which route to take before I implement.**

The rest of the plan assumes Stripe Checkout Sessions (works for both options).

## Tiers (constants in `src/lib/boostTiers.ts`)

```
24h  £7.99   ms = 24*3600*1000
7d   £44.99
14d  £69.99
30d  £99.99
```

## Shared UI

`src/components/organiser/BoostTierPicker.tsx` — four selectable gold-accent cards (tier label, duration, price, "Best value" pill on 30d), one CTA "Continue to Payment" and a secondary "Skip for now" / "Cancel" depending on caller.

`src/components/organiser/BoostPurchaseDialog.tsx` — modal wrapper hosting `BoostTierPicker`. On confirm, calls the `create-boost-checkout` edge function with `{ event_id, tier }`, receives `{ url }`, redirects to Stripe Checkout.

## Entry point 1 — at publish time

`src/components/organiser/EditEventDialog.tsx` (Publish button, line ~234): when the status transitions draft → published and the save mutation succeeds, open `BoostPurchaseDialog` with mode `"upsell"` (shows "Skip for now"). Publishing is never blocked — the dialog appears after the event row has already been updated.

## Entry point 2 — Manage Event hub

`src/pages/organiser/EventManager.tsx`: add a "Boost This Event" card in the top section (next to the existing status/checklist block), visible only when `event.status === "published"`. Shows current boost state:
- No active boost → gold CTA opens `BoostPurchaseDialog` (mode `"manage"`).
- Active boost → shows "Boosted — expires in Xd Yh", with a muted "Extend boost" link that re-opens the picker.

Active boost is fetched via a small `useActiveBoost(eventId)` hook (single query on `event_boosts` where `event_id = ? and payment_status = 'paid' and expires_at > now()` order by `expires_at desc` limit 1).

## Payment flow (edge functions)

`supabase/functions/create-boost-checkout/index.ts`
- Auth: requires logged-in user (JWT validated in code).
- Validates `{ event_id: uuid, tier: '24h'|'7d'|'14d'|'30d' }` with Zod.
- Confirms caller owns the event (`events.organiser_id = auth.uid()`).
- Creates Stripe Checkout Session (mode `payment`, GBP, line item from tier price, `metadata: { event_id, tier, user_id }`, success_url back to `/organiser/events/:id?boost=success`, cancel_url back to same page with `?boost=cancelled`).
- Returns `{ url }`.

`supabase/functions/boost-webhook/index.ts` (Stripe webhook, `verify_jwt = false`)
- Verifies signature with `STRIPE_WEBHOOK_SECRET`.
- On `checkout.session.completed` with `payment_status = 'paid'`, reads metadata, computes `expires_at = now + tier ms`, inserts into `event_boosts`:
  ```
  { event_id, tier, price_paid, starts_at: now(),
    expires_at, stripe_payment_intent_id: session.payment_intent,
    payment_status: 'paid', purchased_by: user_id }
  ```
- Idempotent on `stripe_payment_intent_id`.

On success-URL return, EventManager shows a toast "Boost activated" and invalidates the boost query.

## Sort logic

Update `src/pages/Explore.tsx` (events query, line 160) and `src/pages/Events.tsx` (line ~40) to:
1. Fetch all upcoming published events as today + the related boost rows: add `event_boosts(expires_at, payment_status, created_at)` to the select.
2. After fetch, partition into `boosted` (any row with `payment_status='paid'` and `expires_at > nowISO`) and `rest`. Sort `boosted` by max boost `created_at` DESC; keep `rest` in existing `date ASC` order. Concat and return.

This is done client-side to avoid a stored function; the existing `.order("date")` stays as the base for `rest`.

`DashboardOverview.tsx` global event search keeps current sort (out of scope).

## Visual indicator

`src/components/BoostedBadge.tsx` — small pill: `background: rgba(232,160,32,0.12); color: #e8a020; font: Bebas Neue; padding: 2px 8px; border-radius: 999px;` label "BOOSTED" with a `Sparkles` icon.

Rendered:
- On every event card in `Explore.tsx` and `Events.tsx` when that event has an active boost (flag computed during the partition above).
- On `EventDetail.tsx` next to the event title, gated by a one-off query for an active boost row.

## Files touched

- new `src/lib/boostTiers.ts`
- new `src/components/organiser/BoostTierPicker.tsx`
- new `src/components/organiser/BoostPurchaseDialog.tsx`
- new `src/components/BoostedBadge.tsx`
- new `src/hooks/useActiveBoost.ts`
- edit `src/components/organiser/EditEventDialog.tsx` (post-publish upsell)
- edit `src/pages/organiser/EventManager.tsx` (Boost This Event card + success toast)
- edit `src/pages/Explore.tsx`, `src/pages/Events.tsx` (boosted sort + badge)
- edit `src/pages/EventDetail.tsx` (badge)
- new `supabase/functions/create-boost-checkout/index.ts`
- new `supabase/functions/boost-webhook/index.ts`

No DB schema migration — `event_boosts` already has every column needed. RLS on `event_boosts` is not changed; inserts happen from the webhook using the service role.

## Out of scope

- Refunds / cancelling an active boost.
- Stacking rules (multiple overlapping boosts simply mean the latest `created_at` wins for ordering).
- Converting the existing ticket placeholder to real Stripe checkout (separate task; this flow gives us the pattern to reuse).
