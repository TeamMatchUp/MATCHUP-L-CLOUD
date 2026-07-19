import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardRow {
  rank: number;
  id: string;
  name: string;
  profile_image: string | null;
  elo_rating: number;
  gym_id: string | null;
  gym_name?: string | null;
}

/**
 * Fetch fighters ordered by MU Score (elo_rating desc).
 * If gymId is provided, restrict to fighters at that gym (local leaderboard).
 */
export async function fetchLeaderboard(opts: { gymId?: string | null; limit?: number } = {}): Promise<LeaderboardRow[]> {
  const { gymId, limit = 500 } = opts;
  let q = supabase
    .from("fighter_profiles")
    .select("id, name, profile_image, elo_rating, gym_id, gyms(name)")
    .not("elo_rating", "is", null)
    .order("elo_rating", { ascending: false })
    .limit(limit);
  if (gymId) q = q.eq("gym_id", gymId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r: any, i: number) => ({
    rank: i + 1,
    id: r.id,
    name: r.name,
    profile_image: r.profile_image,
    elo_rating: Math.round(r.elo_rating ?? 1000),
    gym_id: r.gym_id ?? null,
    gym_name: r.gyms?.name ?? null,
  }));
}
