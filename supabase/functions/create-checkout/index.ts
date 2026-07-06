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
  unit_amount?: number; // ignored server-side; DB is source of truth
  quantity: number;
}

async function getAuthedUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}

async function handle(req: Request): Promise<Response> {
  const body = await req.json();
  const environment: StripeEnv = body.environment === "live" ? "live" : "sandbox";
  const mode: "subscription" | "boost" | "tickets" = body.mode;
  const returnUrl: string = body.returnUrl;

  if (!returnUrl) throw new Error("returnUrl required");

  const authedUser = await getAuthedUser(req);

  // Auth requirements per mode
  if ((mode === "subscription" || mode === "boost") && !authedUser) {
    throw new Error("Authentication required");
  }

  // Prefer authed identity over client-supplied values
  const userId: string | undefined = authedUser?.id ?? (mode === "tickets" ? body.userId : undefined);
  const customerEmail: string | undefined = authedUser?.email ?? body.customerEmail;

  // If caller supplied a userId, it must match the authed user (when authed)
  if (authedUser && body.userId && body.userId !== authedUser.id) {
    throw new Error("userId does not match authenticated user");
  }

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

    // Verify caller owns the event
    const { data: evt, error: evtErr } = await supabase
      .from("events")
      .select("id, organiser_id")
      .eq("id", eventId)
      .maybeSingle();
    if (evtErr || !evt) throw new Error("Event not found");
    if (evt.organiser_id !== userId) throw new Error("Not authorised to boost this event");

    const conf = BOOST_MAP[tier];
    const prices = await stripe.prices.list({ lookup_keys: [conf.priceId] });
    if (!prices.data.length) throw new Error("Boost price not found");
    const price = prices.data[0];
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const product = await stripe.products.retrieve(productId);

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

    // Server-side price lookup — never trust client-supplied unit_amount.
    const resolved = await Promise.all(items.map(async (it) => {
      if (!it.ticket_id) throw new Error("ticket_id required for each item");
      if (!it.event_id) throw new Error("event_id required for each item");
      if (!Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 50) {
        throw new Error("Invalid quantity");
      }

      const { data: ticket, error: tErr } = await supabase
        .from("tickets")
        .select("id, event_id, ticket_type, price, sales_start, sales_end, quantity_available")
        .eq("id", it.ticket_id)
        .maybeSingle();
      if (tErr || !ticket) throw new Error("Ticket not found");
      if (ticket.event_id !== it.event_id) throw new Error("Ticket does not belong to event");

      const now = Date.now();
      if (ticket.sales_start && new Date(ticket.sales_start).getTime() > now) {
        throw new Error("Ticket sales have not started");
      }
      if (ticket.sales_end && new Date(ticket.sales_end).getTime() < now) {
        throw new Error("Ticket sales have ended");
      }
      if (ticket.price == null) throw new Error("Ticket price not configured");

      const { data: evt } = await supabase
        .from("events")
        .select("id, title")
        .eq("id", it.event_id)
        .maybeSingle();

      return {
        ticket_id: ticket.id,
        ticket_type: ticket.ticket_type,
        event_id: it.event_id,
        event_title: evt?.title,
        unit_amount: Math.round(Number(ticket.price) * 100),
        quantity: it.quantity,
      };
    }));

    const line_items = resolved.map((it) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: `${it.ticket_type}${it.event_title ? ` — ${it.event_title}` : ""}`,
        },
        unit_amount: it.unit_amount,
      },
      quantity: it.quantity,
    }));

    const totalDesc = resolved.length === 1
      ? `${resolved[0].ticket_type}${resolved[0].event_title ? ` — ${resolved[0].event_title}` : ""}`
      : `MatchUp tickets (${resolved.reduce((s, i) => s + i.quantity, 0)})`;

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      ...(customerId && { customer: customerId }),
      payment_intent_data: { description: totalDesc },
      metadata: { userId: userId ?? "", kind: "tickets" },
    });

    const rows = resolved.map((it) => ({
      buyer_id: userId ?? null,
      buyer_email: customerEmail ?? null,
      event_id: it.event_id,
      ticket_id: it.ticket_id,
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
