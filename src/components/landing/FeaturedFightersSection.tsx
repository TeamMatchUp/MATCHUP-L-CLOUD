import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FighterCard } from "@/components/fighter/FighterCard";

export function FeaturedFightersSection() {
  const { data: fighters } = useQuery({
    queryKey: ["featured-fighters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fighter_profiles")
        .select("*, fighter_gym_links(gym_id, is_primary, gyms(name))")
        .eq("available", true)
        .order("record_wins", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const displayFighters = fighters ?? [];

  return (
    <section className="py-24">
      <div className="container">
        <div className="flex items-end justify-between mb-12">
          <motion.h2
            className="font-heading text-4xl md:text-5xl text-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            FEATURED <span className="text-primary">FIGHTERS</span>
          </motion.h2>
          <Button variant="ghost" asChild className="hidden md:inline-flex">
            <Link to="/explore?tab=fighters">View All</Link>
          </Button>
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
              }}
            />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Button variant="ghost" asChild>
            <Link to="/explore?tab=fighters">View All Fighters</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
