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
 * Gym linkage is resolved via profiles.gym_id.
 */
export async function fetchLeaderboard(opts: { gymId?: string | null; limit?: number } = {}): Promise<LeaderboardRow[]> {
  const { gymId, limit = 500 } = opts;
  const { data, error } = await supabase
    .from("fighter_profiles")
    .select("id, name, profile_image, elo_rating, user_id")
    .not("elo_rating", "is", null)
    .order("elo_rating", { ascending: false })
    .limit(gymId ? 2000 : limit);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ id: string; name: string; profile_image: string | null; elo_rating: number | null; user_id: string | null }>;

  // Resolve gym linkage via profiles (client-side join keeps types simple)
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

  let enriched = rows.map((r) => {
    const link = r.user_id ? gymMap.get(r.user_id) : undefined;
    return {
      id: r.id,
      name: r.name,
      profile_image: r.profile_image,
      elo_rating: Math.round(r.elo_rating ?? 1000),
      gym_id: link?.gym_id ?? null,
      gym_name: link?.gym_name ?? null,
    };
  });

  if (gymId) enriched = enriched.filter((r) => r.gym_id === gymId).slice(0, limit);

  return enriched.map((r, i) => ({ rank: i + 1, ...r }));
}
