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
  const proFights = own.filter((f) => !f.is_amateur);
  const amFights = own.filter((f) => f.is_amateur);

  const tally = (arr: any[]) => {
    const wins = arr.filter((f) => isWin(f, fighter.id));
    return {
      wins: wins.length,
      losses: arr.filter((f) => isLoss(f, fighter.id)).length,
      draws: arr.filter(isDraw).length,
      kos: wins.filter((f) => isKO(f.method) || isTKO(f.method)).length,
    };
  };

  // For each side (pro / amateur), prefer authoritative fight rows when
  // present, otherwise fall back to the cached counters on fighter_profiles.
  // This guarantees pro history is never dropped just because only amateur
  // bouts (or vice versa) have been logged in the fights table.
  const pro = proFights.length > 0
    ? tally(proFights)
    : {
        wins: fighter.record_wins ?? 0,
        losses: fighter.record_losses ?? 0,
        draws: fighter.record_draws ?? 0,
        kos: 0,
      };
  const am = amFights.length > 0
    ? tally(amFights)
    : {
        wins: fighter.amateur_wins ?? 0,
        losses: fighter.amateur_losses ?? 0,
        draws: fighter.amateur_draws ?? 0,
        kos: 0,
      };

  return {
    wins: pro.wins + am.wins,
    losses: pro.losses + am.losses,
    draws: pro.draws + am.draws,
    kos: pro.kos + am.kos,
    // "stated" iff both sides fell back to the cached counters.
    stated: proFights.length === 0 && amFights.length === 0,
  };
}
