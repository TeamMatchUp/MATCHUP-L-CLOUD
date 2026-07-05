import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FighterCard } from "@/components/fighter/FighterCard";

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

      // Fetch KO counts
      const ids = (data ?? []).map((f) => f.id);
      const koMap = new Map<string, number>();
      if (ids.length) {
        const [{ data: koA }, { data: koB }] = await Promise.all([
          supabase.from("fights").select("fighter_a_id, method, result, winner_id").in("fighter_a_id", ids),
          supabase.from("fights").select("fighter_b_id, method, result, winner_id").in("fighter_b_id", ids),
        ]);
        const isKO = (m?: string | null) =>
          !!m && /ko|tko/i.test(m);
        (koA ?? []).forEach((f: any) => {
          if (isKO(f.method) && (f.result === "win" || f.winner_id === f.fighter_a_id)) {
            koMap.set(f.fighter_a_id, (koMap.get(f.fighter_a_id) ?? 0) + 1);
          }
        });
        (koB ?? []).forEach((f: any) => {
          if (isKO(f.method) && f.winner_id === f.fighter_b_id) {
            koMap.set(f.fighter_b_id, (koMap.get(f.fighter_b_id) ?? 0) + 1);
          }
        });
      }

      return (data ?? []).map((f: any) => ({
        ...f,
        _kos: koMap.get(f.id) ?? 0,
      }));
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
            <FighterCard
              key={fighter.id}
              index={i}
              fighter={{
                id: fighter.id,
                name: fighter.name,
                country: fighter.country,
                region: fighter.region,
                discipline: fighter.discipline,
                weight_class: fighter.weight_class,
                style: fighter.style,
                available: fighter.available,
                profile_image: fighter.profile_image,
                wins: fighter.record_wins ?? 0,
                losses: fighter.record_losses ?? 0,
                draws: fighter.record_draws ?? 0,
                kos: fighter._kos ?? 0,
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
