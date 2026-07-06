import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FighterProfileCard } from "@/components/fighter/FighterProfileCard";
import { computeFighterRecord } from "@/lib/fighterStats";

export function TopFightersSeekingSection() {
  const { data: fighters } = useQuery({
    queryKey: ["top-fighters-seeking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fighter_profiles")
        .select("*, fighter_gym_links(gym_id, is_primary, gyms(name))")
        .eq("available", true)
        .order("record_wins", { ascending: false })
        .limit(4);
      if (error) throw error;

      const ids = (data ?? []).map((f) => f.id);
      const userIds = (data ?? []).map(f => f.user_id).filter(Boolean) as string[];

      const [avatarsRes, fightsARes, fightsBRes] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("id, avatar_url").in("id", userIds)
          : Promise.resolve({ data: [] as any[] } as any),
        ids.length
          ? supabase.from("fights").select("*").in("fighter_a_id", ids)
          : Promise.resolve({ data: [] as any[] } as any),
        ids.length
          ? supabase.from("fights").select("*").in("fighter_b_id", ids)
          : Promise.resolve({ data: [] as any[] } as any),
      ]);

      const avatarMap = new Map<string, string>();
      (avatarsRes.data ?? []).forEach((p: any) => { if (p.avatar_url) avatarMap.set(p.id, p.avatar_url); });

      const fightMap = new Map<string, any>();
      [...(fightsARes.data ?? []), ...(fightsBRes.data ?? [])].forEach((f: any) => fightMap.set(f.id, f));
      const allFights = Array.from(fightMap.values());

      return (data ?? []).map((f: any) => {
        const rec = computeFighterRecord(f, allFights);
        const primary = f.fighter_gym_links?.find((l: any) => l.is_primary);
        return {
          ...f,
          _avatar: f.profile_image || (f.user_id ? avatarMap.get(f.user_id) : null) || null,
          _record: rec,
          _gymName: primary?.gyms?.name || "Independent",
        };
      });
    },
  });

  const displayFighters = fighters ?? [];
  if (displayFighters.length === 0) return null;

  return (
    <section className="py-20">
      <div className="container">
        <div className="mb-10">
          <motion.p
            className="font-body uppercase text-primary text-xs tracking-[0.24em] mb-3"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            In The Spotlight
          </motion.p>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <motion.h2
              className="font-heading text-3xl sm:text-4xl md:text-5xl text-foreground max-w-3xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              TOP FIGHTERS <span className="text-primary">ACTIVELY SEEKING A MATCH</span>
            </motion.h2>
            <Button variant="ghost" asChild className="hidden md:inline-flex">
              <Link to="/explore?tab=fighters">View all →</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayFighters.map((fighter: any, i: number) => (
            <FighterProfileCard
              key={fighter.id}
              index={i}
              fighter={{
                id: fighter.id,
                name: fighter.name,
                country: fighter.country,
                discipline: fighter.discipline,
                weight_class: fighter.weight_class,
                profile_image: fighter.profile_image,
                _avatar: fighter._avatar,
                height: fighter.height,
                reach: fighter.reach,
                walk_around_weight_kg: fighter.walk_around_weight_kg,
                stance: fighter.stance,
                date_of_birth: fighter.date_of_birth,
                gymName: fighter._gymName,
                wins: fighter._record.wins,
                losses: fighter._record.losses,
                draws: fighter._record.draws,
                kos: fighter._record.kos,
              }}
            />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Button variant="ghost" asChild>
            <Link to="/explore?tab=fighters">View all fighters</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
