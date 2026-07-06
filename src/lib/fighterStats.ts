// Shared fight/record helpers so cards and profile pages stay in sync.

export const isKO = (m?: string | null) => {
  if (!m) return false;
  const u = m.toUpperCase();
  return u === "KO" || u.startsWith("KO ");
};
export const isTKO = (m?: string | null) => m?.toUpperCase().includes("TKO") ?? false;
export const isSub = (m?: string | null) => m?.toUpperCase().includes("SUB") ?? false;
export const isDec = (m?: string | null) => {
  if (!m) return false;
  const u = m.toUpperCase();
  return u.includes("DECISION") || u.includes("DEC") || u.includes("POINTS");
};

export const isWin = (f: any, fighterId: string) =>
  f.winner_id === fighterId || (!f.winner_id && f.result?.toLowerCase() === "win");
export const isLoss = (f: any, fighterId: string) =>
  (f.winner_id && f.winner_id !== fighterId && f.result?.toLowerCase() !== "draw") ||
  (!f.winner_id && f.result?.toLowerCase() === "loss");
export const isDraw = (f: any) => f.result?.toLowerCase() === "draw";

export interface Record {
  wins: number;
  losses: number;
  draws: number;
  kos: number; // includes KO + TKO
  stated: boolean;
}

/**
 * Compute a fighter's record from the fights table (authoritative when rows exist),
 * falling back to the cached record_wins/losses/draws on fighter_profiles.
 */
export function computeFighterRecord(
  fighter: {
    id: string;
    record_wins?: number | null;
    record_losses?: number | null;
    record_draws?: number | null;
    amateur_wins?: number | null;
    amateur_losses?: number | null;
    amateur_draws?: number | null;
  },
  fights: any[],
): Record {
  const own = fights.filter(
    (f) => f.fighter_a_id === fighter.id || f.fighter_b_id === fighter.id,
  );
  if (own.length > 0) {
    const wins = own.filter((f) => isWin(f, fighter.id));
    return {
      wins: wins.length,
      losses: own.filter((f) => isLoss(f, fighter.id)).length,
      draws: own.filter(isDraw).length,
      kos: wins.filter((f) => isKO(f.method) || isTKO(f.method)).length,
      stated: false,
    };
  }
  return {
    wins: (fighter.record_wins ?? 0) + (fighter.amateur_wins ?? 0),
    losses: (fighter.record_losses ?? 0) + (fighter.amateur_losses ?? 0),
    draws: (fighter.record_draws ?? 0) + (fighter.amateur_draws ?? 0),
    kos: 0,
    stated: true,
  };
}
