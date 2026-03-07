import type { Database } from "@/integrations/supabase/types";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];

interface SuggestedPair {
  fighterA: FighterProfile;
  fighterB: FighterProfile;
  score: number; // lower = more competitive / better match
  reason: string;
}

/**
 * Score a pair of fighters for competitive balance.
 * Lower score = better match.
 */
function scorePair(a: FighterProfile, b: FighterProfile): { score: number; reason: string } {
  const totalA = a.record_wins + a.record_losses + a.record_draws;
  const totalB = b.record_wins + b.record_losses + b.record_draws;

  // Win rate difference (0-1 scale)
  const winRateA = totalA > 0 ? a.record_wins / totalA : 0.5;
  const winRateB = totalB > 0 ? b.record_wins / totalB : 0.5;
  const winRateDiff = Math.abs(winRateA - winRateB);

  // Experience difference (total fights)
  const expDiff = Math.abs(totalA - totalB);
  const expPenalty = Math.min(expDiff / 10, 1); // normalize to 0-1

  // Style matchup bonus: different styles = more exciting
  const styleDiversity = a.style && b.style && a.style !== b.style ? -0.1 : 0;

  // Country diversity bonus (international matchups)
  const countryBonus = a.country !== b.country ? -0.05 : 0;

  const score = winRateDiff * 3 + expPenalty + styleDiversity + countryBonus;

  const reasons: string[] = [];
  if (winRateDiff < 0.1) reasons.push("Similar win rates");
  if (expDiff <= 3) reasons.push("Similar experience");
  if (a.style && b.style && a.style !== b.style) reasons.push("Style clash");
  if (a.country !== b.country) reasons.push("International");

  return {
    score: Math.round(score * 100) / 100,
    reason: reasons.length > 0 ? reasons.join(" · ") : "Viable matchup",
  };
}

/**
 * Generate top match suggestions from a pool of available fighters.
 * Excludes fighters already in active proposals for this slot.
 */
export function generateSuggestions(
  fighters: FighterProfile[],
  excludeIds: Set<string>,
  maxResults = 5
): SuggestedPair[] {
  const eligible = fighters.filter((f) => f.available && !excludeIds.has(f.id));

  if (eligible.length < 2) return [];

  const pairs: SuggestedPair[] = [];

  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const { score, reason } = scorePair(eligible[i], eligible[j]);
      pairs.push({ fighterA: eligible[i], fighterB: eligible[j], score, reason });
    }
  }

  // Sort by score ascending (lower = better match)
  pairs.sort((a, b) => a.score - b.score);

  return pairs.slice(0, maxResults);
}
