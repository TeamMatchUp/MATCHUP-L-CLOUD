import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _sb: ReturnType<typeof createClient> | null = null;
const sb = () => (_sb ??= createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
));

async function handleSubscriptionUpsert(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  if (!userId) {
    console.error("subscription without userId metadata", subscription.id);
    return;
  }

  await sb().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await sb().from("subscriptions").update({
    status: "canceled",
    updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", subscription.id).eq("environment", env);
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const kind = session.metadata?.kind;
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;

  if (kind === "tickets") {
    await sb().from("ticket_orders").update({
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    }).eq("stripe_session_id", session.id).eq("environment", env);
  }

  if (kind === "boost") {
    const now = new Date();
    const eventId = session.metadata?.eventId;
    // fetch pending purchase to compute active window
    const { data: purchase } = await sb()
      .from("event_boost_purchases")
      .select("id, duration_hours")
      .eq("stripe_session_id", session.id)
      .eq("environment", env)
      .maybeSingle();

    if (purchase) {
      const activeUntil = new Date(now.getTime() + Number(purchase.duration_hours) * 3600 * 1000);
      await sb().from("event_boost_purchases").update({
        status: "paid",
        stripe_payment_intent_id: paymentIntentId,
        active_from: now.toISOString(),
        active_until: activeUntil.toISOString(),
        updated_at: now.toISOString(),
      }).eq("id", purchase.id);

      // Bump event boost fields
      if (eventId) {
        await sb().from("events").update({
          boosted_until: activeUntil.toISOString(),
        } as any).eq("id", eventId);
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), { status: 200 });
  }
  const env: StripeEnv = rawEnv;
  try {
    const event = await verifyWebhook(req, env);
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, env);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
