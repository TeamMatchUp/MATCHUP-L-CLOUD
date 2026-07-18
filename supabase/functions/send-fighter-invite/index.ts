// Sends a claim invite email to a non-member fighter added into a bout by an organiser.
// Requires the project's email infrastructure (email domain + send-transactional-email) to be set up.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const eventId = String(body.eventId ?? "");
    const fighterProfileId = String(body.fighterProfileId ?? "");

    if (!email || !name || !eventId || !fighterProfileId) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Invalid email" }, 400);
    }

    // Verify caller owns the event (organiser) — service client for the check
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: evt, error: evtErr } = await admin
      .from("events")
      .select("id, title, organiser_id")
      .eq("id", eventId)
      .maybeSingle();
    if (evtErr || !evt) return json({ error: "Event not found" }, 404);
    if (evt.organiser_id !== callerId) return json({ error: "Not the event organiser" }, 403);

    // Organiser display name
    const { data: organiserProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", callerId)
      .maybeSingle();
    const organiserName = organiserProfile?.full_name ?? "an organiser";

    // Build claim link — Auth page reads ?invite= to prefill and pre-select fighter role
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const siteBase = origin.replace(/\/$/, "").split("/").slice(0, 3).join("/");
    const claimUrl = `${siteBase || ""}/auth?mode=signup&invite=${encodeURIComponent(email)}&fighter=${encodeURIComponent(fighterProfileId)}`;

    // Invoke the shared transactional email sender (must be scaffolded — see Cloud → Emails)
    const { error: sendErr } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "fighter-invite",
        recipientEmail: email,
        idempotencyKey: `fighter-invite-${fighterProfileId}-${eventId}`,
        templateData: {
          fighterName: name,
          organiserName,
          eventTitle: evt.title ?? "an event",
          claimUrl,
        },
      },
    });

    if (sendErr) {
      console.error("send-transactional-email failed", sendErr);
      return json({
        error: "Email service not configured",
        details: sendErr.message ?? String(sendErr),
      }, 500);
    }

    return json({ ok: true });
  } catch (e: any) {
    console.error("send-fighter-invite error", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
