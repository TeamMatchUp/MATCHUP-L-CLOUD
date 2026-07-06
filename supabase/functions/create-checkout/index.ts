import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { type StripeEnv, createStripeClient, resolveOrCreateCustomer } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type BoostTier = "24h" | "7d" | "14d" | "30d";
const BOOST_MAP: Record<BoostTier, { priceId: string; hours: number }> = {
  "24h": { priceId: "boost_24h", hours: 24 },
  "7d":  { priceId: "boost_7d",  hours: 24 * 7 },
  "14d": { priceId: "boost_14d", hours: 24 * 14 },
  "30d": { priceId: "boost_30d", hours: 24 * 30 },
};

interface TicketLine {
  ticket_id?: string;
  ticket_type: string;
  event_id: string;
  event_title?: string;
  unit_amount: number; // cents/pence
  quantity: number;
}

async function handle(req: Request): Promise<Response> {
  const body = await req.json();
  const environment: StripeEnv = body.environment === "live" ? "live" : "sandbox";
  const mode: "subscription" | "boost" | "tickets" = body.mode;
  const returnUrl: string = body.returnUrl;
  const customerEmail: string | undefined = body.customerEmail;
  const userId: string | undefined = body.userId;

  if (!returnUrl) throw new Error("returnUrl required");

  const stripe = createStripeClient(environment);
  const customerId = (customerEmail || userId)
    ? await resolveOrCreateCustomer(stripe, { email: customerEmail, userId })
    : undefined;

  // ---- SUBSCRIPTION ----
  if (mode === "subscription") {
    const priceId: string = body.priceId;
    if (!/^[a-zA-Z0-9_-]+$/.test(priceId)) throw new Error("Invalid priceId");
    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const price = prices.data[0];

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: price.id, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      ...(customerId && { customer: customerId }),
      ...(userId && {
        metadata: { userId, kind: "subscription" },
        subscription_data: { metadata: { userId } },
      }),
    });
    return json({ clientSecret: session.client_secret });
  }

  // ---- BOOST ----
  if (mode === "boost") {
    const tier: BoostTier = body.tier;
    const eventId: string = body.eventId;
    if (!BOOST_MAP[tier]) throw new Error("Invalid boost tier");
    if (!eventId || !userId) throw new Error("eventId and userId required");

    const conf = BOOST_MAP[tier];
    const prices = await stripe.prices.list({ lookup_keys: [conf.priceId] });
    if (!prices.data.length) throw new Error("Boost price not found");
    const price = prices.data[0];
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const product = await stripe.products.retrieve(productId);

    // Pre-insert pending purchase row keyed by session id
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: price.id, quantity: 1 }],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      ...(customerId && { customer: customerId }),
      payment_intent_data: { description: product.name },
      metadata: { userId, kind: "boost", eventId, tier },
    });

    await supabase.from("event_boost_purchases").insert({
      organiser_id: userId,
      event_id: eventId,
      tier,
      price_id: conf.priceId,
      amount: price.unit_amount ?? 0,
      currency: price.currency,
      duration_hours: conf.hours,
      stripe_session_id: session.id,
      status: "pending",
      environment,
    });
    return json({ clientSecret: session.client_secret });
  }

  // ---- TICKETS ----
  if (mode === "tickets") {
    const items: TicketLine[] = body.items;
    if (!Array.isArray(items) || items.length === 0) throw new Error("items required");

    const line_items = items.map((it) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: `${it.ticket_type}${it.event_title ? ` — ${it.event_title}` : ""}`,
        },
        unit_amount: it.unit_amount,
      },
      quantity: it.quantity,
    }));

    const totalDesc = items.length === 1
      ? `${items[0].ticket_type}${items[0].event_title ? ` — ${items[0].event_title}` : ""}`
      : `MatchUp tickets (${items.reduce((s, i) => s + i.quantity, 0)})`;

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      ...(customerId && { customer: customerId }),
      payment_intent_data: { description: totalDesc },
      metadata: { userId: userId ?? "", kind: "tickets" },
    });

    // Pre-insert pending ticket_orders (one per line)
    const rows = items.map((it) => ({
      buyer_id: userId ?? null,
      buyer_email: customerEmail ?? null,
      event_id: it.event_id,
      ticket_id: it.ticket_id ?? null,
      ticket_type: it.ticket_type,
      quantity: it.quantity,
      unit_amount: it.unit_amount,
      total_amount: it.unit_amount * it.quantity,
      currency: "gbp",
      stripe_session_id: session.id,
      status: "pending",
      environment,
    }));
    await supabase.from("ticket_orders").insert(rows);
    return json({ clientSecret: session.client_secret });
  }

  throw new Error("Invalid mode");
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  try {
    return await handle(req);
  } catch (e) {
    console.error("create-checkout error:", e);
    return json({ error: (e as Error).message }, 400);
  }
});
