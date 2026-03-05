import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

const STYLE_LABELS: Record<string, string> = {
  boxing: "Boxing", muay_thai: "Muay Thai", mma: "MMA", kickboxing: "Kickboxing", bjj: "BJJ",
};

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
            <Link to="/fighters">View All</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayFighters.map((fighter, i) => {
            const primaryGym = fighter.fighter_gym_links?.find((l: any) => l.is_primary);
            const gymName = primaryGym?.gyms?.name ?? "Independent";
            const record = `${fighter.record_wins}-${fighter.record_losses}-${fighter.record_draws}`;

            return (
              <motion.div
                key={fighter.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link
                  to={`/fighters/${fighter.id}`}
                  className="rounded-lg border border-border bg-card p-6 hover:gold-border-subtle transition-all duration-250 block"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-heading text-lg text-muted-foreground">
                      {fighter.name.split(" ").filter((n: string) => !n.startsWith('"')).map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-success/10 text-success">
                      Available
                    </span>
                  </div>
                  <h3 className="font-heading text-lg text-foreground">{fighter.name}</h3>
                  <p className="text-primary font-bold text-lg mt-1">{record}</p>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <p>{WEIGHT_CLASS_LABELS[fighter.weight_class]} · {fighter.style ? STYLE_LABELS[fighter.style] : "—"}</p>
                    <p>{gymName}</p>
                    {fighter.height && fighter.reach && <p>{fighter.height} · {fighter.reach} reach</p>}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Button variant="ghost" asChild>
            <Link to="/fighters">View All Fighters</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
