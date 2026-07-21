import { supabase } from "@/integrations/supabase/client";
import { displayedMuScore, effectiveRd, DEFAULT_RATING, DEFAULT_RD } from "@/lib/glicko2Engine";

export interface LeaderboardRow {
  rank: number;
  id: string;
  name: string;
  profile_image: string | null;
  /** Displayed MU Score (rating − 2·effectiveRD, rounded). */
  mu_score: number;
  gym_id: string | null;
  gym_name?: string | null;
}

/**
 * Fetch fighters ordered by displayed MU Score.
 * Sort key is computed client-side from rating / rating_deviation /
 * last_result_at so that inactivity-inflated RD demotes unproven fighters.
 * If gymId is provided, restrict to fighters at that gym.
 */
export async function fetchLeaderboard(opts: { gymId?: string | null; limit?: number } = {}): Promise<LeaderboardRow[]> {
  const { gymId, limit = 500 } = opts;
  const { data, error } = await supabase
    .from("fighter_profiles")
    .select("id, name, profile_image, rating, rating_deviation, last_result_at, user_id")
    .limit(gymId ? 2000 : Math.max(limit * 4, 500));
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    id: string; name: string; profile_image: string | null;
    rating: number | null; rating_deviation: number | null; last_result_at: string | null;
    user_id: string | null;
  }>;

  const userIds = rows.map((r) => r.user_id).filter((v): v is string => !!v);
  const gymMap = new Map<string, { gym_id: string | null; gym_name: string | null }>();
  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, gym_id, gyms(name)")
      .in("id", userIds);
    (profs ?? []).forEach((p: any) => {
      gymMap.set(p.id, { gym_id: p.gym_id ?? null, gym_name: p.gyms?.name ?? null });
    });
  }

  const now = new Date();
  let enriched = rows.map((r) => {
    const link = r.user_id ? gymMap.get(r.user_id) : undefined;
    const rating = r.rating ?? DEFAULT_RATING;
    const effRd = effectiveRd(r.rating_deviation ?? DEFAULT_RD, r.last_result_at, now);
    return {
      id: r.id,
      name: r.name,
      profile_image: r.profile_image,
      mu_score: displayedMuScore(rating, effRd),
      gym_id: link?.gym_id ?? null,
      gym_name: link?.gym_name ?? null,
    };
  });

  enriched.sort((a, b) => b.mu_score - a.mu_score);
  if (gymId) enriched = enriched.filter((r) => r.gym_id === gymId);
  enriched = enriched.slice(0, limit);

  return enriched.map((r, i) => ({ rank: i + 1, ...r }));
}

