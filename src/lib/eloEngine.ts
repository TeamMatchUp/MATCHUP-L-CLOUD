// Elo replay engine (v2).
//
// Rules
// -----
// K = 32.
// S_a: win=1.0, draw=0.5, loss=0.0. Finish bonus of +/-15% for KO/TKO/Submission
//      (DQ counts as a plain win with no bonus).
// E_a:
//   • Historical / self-reported fight (verification_status = 'self_reported' or
//     'coach_verified') → always 0.50, regardless of any named opponent's
//     Matchup profile.
//   • Platform-confirmed fight (verification_status = 'event_verified') → real
//     opponent-Elo differential using the opponent's running Elo *as it stands
//     just before that fight in the global chronological replay*.
// level_weight: 1.0 for pro, 0.55 for amateur, flat across all disciplines.
// change = K × (S_a − E_a) × level_weight
//
// Replay is a single global chronological pass over every fight row so that
// rematches and shared opponents always resolve unambiguously.

export const K_FACTOR = 32;
export const START_ELO = 1000;
export const PRO_LEVEL_WEIGHT = 1.0;
export const AM_LEVEL_WEIGHT = 0.55;

export type FightRow = {
  id: string;
  fighter_a_id: string;
  fighter_b_id: string | null;
  winner_id: string | null;
  result: string; // 'win' | 'loss' | 'draw' from A's perspective
  method: string | null;
  is_amateur: boolean;
  verification_status: "self_reported" | "coach_verified" | "event_verified";
  event_date: string | null;
  created_at: string;
};

export function isPlatformConfirmed(v: FightRow["verification_status"]): boolean {
  return v === "event_verified";
}

function isFinish(method: string | null): boolean {
  if (!method) return false;
  const u = method.toUpperCase();
  return u.includes("KO") || u.includes("TKO") || u.includes("SUB");
}

function isDq(method: string | null): boolean {
  if (!method) return false;
  return method.toUpperCase().includes("DQ");
}

/** Expected score for A given both Elos. */
export function expectedScore(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/** Compute S_a for a given side ('a' or 'b') from the fight row. */
export function actualScoreFor(fight: FightRow, side: "a" | "b"): number {
  const raw = (fight.result || "").toLowerCase();
  // Determine base per-side outcome
  let base: number;
  if (raw === "draw") base = 0.5;
  else if (side === "a") base = raw === "win" ? 1.0 : raw === "loss" ? 0.0 : 0.5;
  else base = raw === "win" ? 0.0 : raw === "loss" ? 1.0 : 0.5;

  // Finish bonus only on decisive win/loss with KO/TKO/Submission — never on DQ.
  if (base === 0.5 || isDq(fight.method) || !isFinish(fight.method)) return base;
  if (base === 1.0) return 1.15;
  if (base === 0.0) return -0.15;
  return base;
}

export function levelWeight(is_amateur: boolean): number {
  return is_amateur ? AM_LEVEL_WEIGHT : PRO_LEVEL_WEIGHT;
}

/** Sort key: event_date asc (nulls last), then created_at, then id. */
function compareChronological(a: FightRow, b: FightRow): number {
  const ad = a.event_date;
  const bd = b.event_date;
  if (ad && bd) {
    if (ad < bd) return -1;
    if (ad > bd) return 1;
  } else if (ad && !bd) return -1;
  else if (!ad && bd) return 1;
  if (a.created_at < b.created_at) return -1;
  if (a.created_at > b.created_at) return 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export interface ReplayResult {
  /** Final Elo per fighter id. */
  ratings: Map<string, number>;
  /** Ordered fight application log (useful for debugging/tests). */
  log: {
    fightId: string;
    fighterId: string;
    before: number;
    after: number;
    change: number;
  }[];
}

/** Global chronological Elo replay. */
export function replayElo(fights: FightRow[]): ReplayResult {
  const ratings = new Map<string, number>();
  const log: ReplayResult["log"] = [];
  const get = (id: string): number => ratings.get(id) ?? START_ELO;

  const ordered = [...fights].sort(compareChronological);

  for (const f of ordered) {
    const platform = isPlatformConfirmed(f.verification_status);
    const lwA = levelWeight(f.is_amateur);
    const eloA = get(f.fighter_a_id);
    const eloB = f.fighter_b_id ? get(f.fighter_b_id) : START_ELO;

    if (!platform) {
      // Historical / self-reported: only A's Elo changes, E_a = 0.50.
      const Sa = actualScoreFor(f, "a");
      const change = K_FACTOR * (Sa - 0.5) * lwA;
      const after = eloA + change;
      ratings.set(f.fighter_a_id, after);
      log.push({ fightId: f.id, fighterId: f.fighter_a_id, before: eloA, after, change });
      continue;
    }

    // Platform-confirmed: both sides update using pre-fight running Elos.
    if (!f.fighter_b_id) continue; // can't confirm without an opponent
    const lwB = levelWeight(f.is_amateur);
    const Ea = expectedScore(eloA, eloB);
    const Eb = 1 - Ea;
    const Sa = actualScoreFor(f, "a");
    const Sb = actualScoreFor(f, "b");
    const changeA = K_FACTOR * (Sa - Ea) * lwA;
    const changeB = K_FACTOR * (Sb - Eb) * lwB;
    const afterA = eloA + changeA;
    const afterB = eloB + changeB;
    ratings.set(f.fighter_a_id, afterA);
    ratings.set(f.fighter_b_id, afterB);
    log.push({ fightId: f.id, fighterId: f.fighter_a_id, before: eloA, after: afterA, change: changeA });
    log.push({ fightId: f.id, fighterId: f.fighter_b_id, before: eloB, after: afterB, change: changeB });
  }

  return { ratings, log };
}
