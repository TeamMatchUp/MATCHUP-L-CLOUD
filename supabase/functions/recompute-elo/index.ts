// Admin-only Elo recompute. Runs a single global chronological pass over all
// fights and writes each fighter's final Elo + elo_last_computed_at.
//
// Response: { updated: number, shifts: Array<{ fighter_id, name, before, after, delta }> }
// where `shifts` lists fighters whose Elo changed by more than 50 points from
// their previously stored value (suppressed on first-ever run — see below).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const K = 32;
const START = 1000;
const AM_W = 0.55;
const PRO_W = 1.0;

type Fight = {
  id: string;
  fighter_a_id: string;
  fighter_b_id: string | null;
  result: string;
  method: string | null;
  is_amateur: boolean;
  verification_status: "self_reported" | "coach_verified" | "event_verified";
  event_date: string | null;
  created_at: string;
};

function isFinish(m: string | null) {
  if (!m) return false;
  const u = m.toUpperCase();
  return u.includes("KO") || u.includes("TKO") || u.includes("SUB");
}
function isDq(m: string | null) {
  return !!m && m.toUpperCase().includes("DQ");
}
function actualScore(f: Fight, side: "a" | "b"): number {
  const raw = (f.result || "").toLowerCase();
  let base: number;
  if (raw === "draw") base = 0.5;
  else if (side === "a") base = raw === "win" ? 1 : raw === "loss" ? 0 : 0.5;
  else base = raw === "win" ? 0 : raw === "loss" ? 1 : 0.5;
  if (base === 0.5 || isDq(f.method) || !isFinish(f.method)) return base;
  if (base === 1) return 1.15;
  if (base === 0) return -0.15;
  return base;
}
function expected(eloA: number, eloB: number) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}
function cmp(a: Fight, b: Fight) {
  const ad = a.event_date, bd = b.event_date;
  if (ad && bd) { if (ad < bd) return -1; if (ad > bd) return 1; }
  else if (ad && !bd) return -1;
  else if (!ad && bd) return 1;
  if (a.created_at < b.created_at) return -1;
  if (a.created_at > b.created_at) return 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // Verify caller is admin.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: isAdmin, error: adminErr } = await userClient.rpc("has_role", {
    _user_id: userData.user.id, _role: "admin",
  });
  if (adminErr || !isAdmin) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Fetch all fights + all fighter ids/names/current elo.
  const { data: fights, error: fErr } = await admin
    .from("fights")
    .select("id,fighter_a_id,fighter_b_id,result,method,is_amateur,verification_status,event_date,created_at");
  if (fErr) {
    return new Response(JSON.stringify({ error: fErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: fighters, error: pErr } = await admin
    .from("fighter_profiles")
    .select("id,name,elo_rating,elo_last_computed_at");
  if (pErr) {
    return new Response(JSON.stringify({ error: pErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Replay.
  const ratings = new Map<string, number>();
  const ordered = ([...(fights ?? [])] as Fight[]).sort(cmp);
  const get = (id: string) => ratings.get(id) ?? START;
  for (const f of ordered) {
    const lwA = f.is_amateur ? AM_W : PRO_W;
    const eloA = get(f.fighter_a_id);
    if (f.verification_status !== "event_verified") {
      const Sa = actualScore(f, "a");
      ratings.set(f.fighter_a_id, eloA + K * (Sa - 0.5) * lwA);
      continue;
    }
    if (!f.fighter_b_id) continue;
    const lwB = f.is_amateur ? AM_W : PRO_W;
    const eloB = get(f.fighter_b_id);
    const Ea = expected(eloA, eloB);
    const Sa = actualScore(f, "a");
    const Sb = actualScore(f, "b");
    ratings.set(f.fighter_a_id, eloA + K * (Sa - Ea) * lwA);
    ratings.set(f.fighter_b_id, eloB + K * (Sb - (1 - Ea)) * lwB);
  }

  // Prepare updates + shifts report.
  const shifts: { fighter_id: string; name: string; before: number; after: number; delta: number }[] = [];
  const now = new Date().toISOString();
  let updated = 0;

  for (const p of fighters ?? []) {
    const newElo = Math.round(ratings.get(p.id) ?? START);
    const prev = p.elo_rating ?? START;
    const isFirstRun = p.elo_last_computed_at == null;
    if (!isFirstRun && Math.abs(newElo - prev) > 50) {
      shifts.push({ fighter_id: p.id, name: p.name, before: prev, after: newElo, delta: newElo - prev });
    }
    const { error: uErr } = await admin
      .from("fighter_profiles")
      .update({ elo_rating: newElo, elo_last_computed_at: now })
      .eq("id", p.id);
    if (!uErr) updated++;
  }

  return new Response(JSON.stringify({ updated, shifts }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
