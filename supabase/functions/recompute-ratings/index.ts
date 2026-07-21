// Admin-only rating recompute (Glicko-2).
//
// Single pass:
//   1. Load fighter_profiles, fights, approved fighter_gym_links.
//   2. For each fighter, compute first_platform_confirmed_at = min event_date
//      across their platform-confirmed (event_verified) fights.
//   3. Seed each fighter from their historical record (fights with
//      verification_status != 'event_verified' AND, if platform history exists,
//      created_at < first_platform_confirmed_at — idempotency rule).
//   4. Chronologically replay every platform-confirmed fight, applying per-bout
//      Glicko-2 updates to running state.
//   5. Write rating / rating_deviation / volatility / last_result_at /
//      first_platform_confirmed_at back to fighter_profiles.
//   6. Report per-fighter old vs new displayed MU Score with rank deltas.
//
// The engine (glickoStep + updateBout) is duplicated here in Deno-compatible
// form, kept structurally identical to src/lib/glicko2Engine.ts and covered by
// the vitest anchor test on the client copy.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---- Engine (mirror of src/lib/glicko2Engine.ts) ----
const TAU = 0.5;
const SCALE = 173.7178;
const DEFAULT_RATING = 1500;
const DEFAULT_RD = 350;
const DEFAULT_VOL = 0.06;
const MAX_RD = 350;
const FINISH_BONUS_PRO = 8;
const AM_LEVEL_WEIGHT = 0.55;
const PRO_LEVEL_WEIGHT = 1.0;
const INACTIVITY_C = 64.5;

type Rating = { rating: number; rd: number; volatility: number };
type Opp = { rating: number; rd: number; score: number };

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const e = (mu: number, muJ: number, phiJ: number) =>
  1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

function glickoStep(p: Rating, opps: Opp[], tau = TAU): Rating {
  const mu = (p.rating - DEFAULT_RATING) / SCALE;
  const phi = p.rd / SCALE;
  const sigma = p.volatility;
  if (opps.length === 0) {
    const phiP = Math.sqrt(phi * phi + sigma * sigma);
    return { rating: p.rating, rd: Math.min(phiP * SCALE, MAX_RD), volatility: sigma };
  }
  const conv = opps.map((o) => ({
    muJ: (o.rating - DEFAULT_RATING) / SCALE,
    phiJ: o.rd / SCALE,
    s: o.score,
  }));
  let vInv = 0;
  for (const c of conv) {
    const gj = g(c.phiJ);
    const ej = e(mu, c.muJ, c.phiJ);
    vInv += gj * gj * ej * (1 - ej);
  }
  const v = 1 / vInv;
  let delta = 0;
  for (const c of conv) delta += g(c.phiJ) * (c.s - e(mu, c.muJ, c.phiJ));
  delta *= v;
  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    return (
      (ex * (delta * delta - phi * phi - v - ex)) /
        (2 * Math.pow(phi * phi + v + ex, 2)) -
      (x - a) / (tau * tau)
    );
  };
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
  else {
    let k = 1;
    while (f(a - k * tau) < 0) k++;
    B = a - k * tau;
  }
  let fA = f(A), fB = f(B);
  while (Math.abs(B - A) > 1e-6) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) { A = B; fA = fB; } else { fA = fA / 2; }
    B = C; fB = fC;
  }
  const sigmaP = Math.exp(A / 2);
  const phiStar = Math.sqrt(phi * phi + sigmaP * sigmaP);
  const phiP = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  let muP = mu;
  for (const c of conv) muP += phiP * phiP * g(c.phiJ) * (c.s - e(mu, c.muJ, c.phiJ));
  return { rating: muP * SCALE + DEFAULT_RATING, rd: Math.min(phiP * SCALE, MAX_RD), volatility: sigmaP };
}

function isFinish(m: string | null) {
  if (!m) return false;
  const u = m.toUpperCase();
  return u.includes("KO") || u.includes("TKO") || u.includes("SUB");
}
const isDq = (m: string | null) => !!m && m.toUpperCase().includes("DQ");

function updateBout(
  a: Rating, b: Rating,
  opts: { outcomeA: 0 | 0.5 | 1; method: string | null; isAmateur: boolean }
): { a: Rating; b: Rating } {
  const { outcomeA, method, isAmateur } = opts;
  const lw = isAmateur ? AM_LEVEL_WEIGHT : PRO_LEVEL_WEIGHT;
  const outcomeB = (1 - outcomeA) as 0 | 0.5 | 1;
  const aPre = { ...a }, bPre = { ...b };
  const aRaw = glickoStep(aPre, [{ rating: bPre.rating, rd: bPre.rd, score: outcomeA }]);
  const bRaw = glickoStep(bPre, [{ rating: aPre.rating, rd: aPre.rd, score: outcomeB }]);
  let aRating = aPre.rating + (aRaw.rating - aPre.rating) * lw;
  let bRating = bPre.rating + (bRaw.rating - bPre.rating) * lw;
  if (outcomeA !== 0.5 && isFinish(method) && !isDq(method)) {
    const bonus = FINISH_BONUS_PRO * lw;
    if (outcomeA === 1) { aRating += bonus; bRating -= bonus; }
    else { aRating -= bonus; bRating += bonus; }
  }
  return {
    a: { rating: aRating, rd: aRaw.rd, volatility: aRaw.volatility },
    b: { rating: bRating, rd: bRaw.rd, volatility: bRaw.volatility },
  };
}

function seedFromRecord(pro: {w:number;l:number;d:number}, am: {w:number;l:number;d:number}, hasGym: boolean, isDebut: boolean): Rating {
  if (isDebut) return { rating: DEFAULT_RATING, rd: DEFAULT_RD, volatility: DEFAULT_VOL };
  const proAdj = pro.w + 0.5 * pro.d;
  const amAdj = am.w + 0.5 * am.d;
  const proN = pro.w + pro.l + pro.d;
  const amN = am.w + am.l + am.d;
  const combW = proAdj + AM_LEVEL_WEIGHT * amAdj;
  const combN = proN + AM_LEVEL_WEIGHT * amN;
  const awr = (combW + 2) / (combN + 4);
  const rating = DEFAULT_RATING + (awr - 0.5) * 600;
  let rd: number;
  if (proN + amN === 0) rd = DEFAULT_RD;
  else if (hasGym && proN + amN >= 3) rd = 250;
  else rd = 300;
  return { rating, rd, volatility: DEFAULT_VOL };
}

function effectiveRd(rd: number, last: string | null, now: Date): number {
  let months = 0;
  if (last) months = Math.max(0, (now.getTime() - new Date(last).getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
  return Math.min(Math.sqrt(rd * rd + INACTIVITY_C * INACTIVITY_C * months), MAX_RD);
}
const displayedMuScore = (r: number, rd: number) => Math.round(r - 2 * rd);

// ---- Types ----
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

function cmp(a: Fight, b: Fight) {
  const ad = a.event_date, bd = b.event_date;
  if (ad && bd) { if (ad < bd) return -1; if (ad > bd) return 1; }
  else if (ad && !bd) return -1;
  else if (!ad && bd) return 1;
  if (a.created_at < b.created_at) return -1;
  if (a.created_at > b.created_at) return 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function outcomeFor(f: Fight, side: "a" | "b"): 0 | 0.5 | 1 {
  const r = (f.result || "").toLowerCase();
  if (r === "draw") return 0.5;
  const isWin = r === "win";
  return side === "a" ? (isWin ? 1 : 0) : (isWin ? 0 : 1);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

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

  const [fightsRes, fightersRes, linksRes] = await Promise.all([
    admin.from("fights").select("id,fighter_a_id,fighter_b_id,result,method,is_amateur,verification_status,event_date,created_at"),
    admin.from("fighter_profiles").select("id,name,elo_rating,rating,rating_deviation,last_result_at"),
    admin.from("fighter_gym_links").select("fighter_id,status").eq("status", "approved"),
  ]);
  if (fightsRes.error) return new Response(JSON.stringify({ error: fightsRes.error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (fightersRes.error) return new Response(JSON.stringify({ error: fightersRes.error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const fights = (fightsRes.data ?? []) as Fight[];
  const fighters = (fightersRes.data ?? []) as any[];
  const hasApprovedLink = new Set<string>((linksRes.data ?? []).map((l: any) => l.fighter_id));

  // Compute per-fighter first_platform_confirmed_at.
  const firstConfirmed = new Map<string, string>();
  const bumpFirst = (id: string | null, date: string | null) => {
    if (!id || !date) return;
    const cur = firstConfirmed.get(id);
    if (!cur || date < cur) firstConfirmed.set(id, date);
  };
  for (const f of fights) {
    if (f.verification_status === "event_verified" && f.event_date) {
      bumpFirst(f.fighter_a_id, f.event_date);
      bumpFirst(f.fighter_b_id, f.event_date);
    }
  }

  // Tally seed inputs per fighter from historical (non-event_verified) fights,
  // respecting idempotency: exclude historical entries created *after* the
  // fighter's first platform-confirmed fight.
  type Rec = { w: number; l: number; d: number };
  const proRec = new Map<string, Rec>();
  const amRec = new Map<string, Rec>();
  const anyReported = new Set<string>();
  const inc = (map: Map<string, Rec>, id: string, res: string) => {
    const r = map.get(id) ?? { w: 0, l: 0, d: 0 };
    if (res === "win") r.w++;
    else if (res === "loss") r.l++;
    else if (res === "draw") r.d++;
    map.set(id, r);
  };
  for (const f of fights) {
    if (f.verification_status === "event_verified") continue;
    const firstA = firstConfirmed.get(f.fighter_a_id);
    if (firstA && f.created_at >= firstA) continue;
    anyReported.add(f.fighter_a_id);
    const map = f.is_amateur ? amRec : proRec;
    inc(map, f.fighter_a_id, (f.result || "").toLowerCase());
  }

  // Seed running state per fighter (only for fighters we know about).
  const state = new Map<string, Rating>();
  for (const p of fighters) {
    const pr = proRec.get(p.id) ?? { w: 0, l: 0, d: 0 };
    const ar = amRec.get(p.id) ?? { w: 0, l: 0, d: 0 };
    const isDebut = !anyReported.has(p.id);
    state.set(p.id, seedFromRecord(pr, ar, hasApprovedLink.has(p.id), isDebut));
  }
  const get = (id: string): Rating => state.get(id) ?? { rating: DEFAULT_RATING, rd: DEFAULT_RD, volatility: DEFAULT_VOL };

  // Replay platform-confirmed fights chronologically.
  const lastResult = new Map<string, string>();
  const ordered = [...fights].filter((f) => f.verification_status === "event_verified" && f.fighter_b_id).sort(cmp);
  for (const f of ordered) {
    const a = get(f.fighter_a_id);
    const b = get(f.fighter_b_id!);
    const outcomeA = outcomeFor(f, "a");
    const upd = updateBout(a, b, { outcomeA, method: f.method, isAmateur: f.is_amateur });
    state.set(f.fighter_a_id, upd.a);
    state.set(f.fighter_b_id!, upd.b);
    const ts = f.event_date ?? f.created_at;
    lastResult.set(f.fighter_a_id, ts);
    lastResult.set(f.fighter_b_id!, ts);
  }

  // Compute old/new displayed MU Scores + ranks.
  const now = new Date();
  type Row = { id: string; name: string; oldDisplayed: number; newDisplayed: number; rating: number; rd: number; volatility: number; lastResultAt: string | null; firstConfirmedAt: string | null };
  const rows: Row[] = fighters.map((p) => {
    const s = get(p.id);
    const lra = lastResult.get(p.id) ?? p.last_result_at ?? null;
    const effRd = effectiveRd(s.rd, lra, now);
    return {
      id: p.id,
      name: p.name,
      oldDisplayed: Math.round(p.elo_rating ?? 1000),
      newDisplayed: displayedMuScore(s.rating, effRd),
      rating: s.rating,
      rd: s.rd,
      volatility: s.volatility,
      lastResultAt: lra,
      firstConfirmedAt: firstConfirmed.get(p.id) ?? null,
    };
  });

  const byOld = [...rows].sort((x, y) => y.oldDisplayed - x.oldDisplayed);
  const byNew = [...rows].sort((x, y) => y.newDisplayed - x.newDisplayed);
  const rankOld = new Map<string, number>(); byOld.forEach((r, i) => rankOld.set(r.id, i + 1));
  const rankNew = new Map<string, number>(); byNew.forEach((r, i) => rankNew.set(r.id, i + 1));

  // Batched writes.
  let updated = 0;
  await Promise.all(rows.map(async (r) => {
    const { error } = await admin.from("fighter_profiles").update({
      rating: r.rating,
      rating_deviation: r.rd,
      volatility: r.volatility,
      last_result_at: r.lastResultAt,
      first_platform_confirmed_at: r.firstConfirmedAt,
    }).eq("id", r.id);
    if (!error) updated++;
  }));

  const report = rows.map((r) => {
    const rOld = rankOld.get(r.id)!;
    const rNew = rankNew.get(r.id)!;
    return {
      fighter_id: r.id,
      name: r.name,
      old_displayed: r.oldDisplayed,
      new_displayed: r.newDisplayed,
      rank_before: rOld,
      rank_after: rNew,
      rank_delta: rOld - rNew,
      flagged: Math.abs(rOld - rNew) > 10,
    };
  });

  return new Response(JSON.stringify({ updated, count: rows.length, report }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
