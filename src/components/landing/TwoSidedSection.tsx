import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const ref = useRef<number>();

  useEffect(() => {
    if (target <= 0) return;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setCount(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);

  return count;
}

function formatNumber(n: number) {
  return n.toLocaleString();
}

export function TwoSidedSection() {
  const { data: counts } = useQuery({
    queryKey: ["platform-counts"],
    queryFn: async () => {
      const [events, fighters, gyms] = await Promise.all([
        supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("fighter_profiles").select("id", { count: "exact", head: true }),
        supabase.from("gyms").select("id", { count: "exact", head: true }),
      ]);
      return {
        events: events.count ?? 0,
        fighters: fighters.count ?? 0,
        gyms: gyms.count ?? 0,
      };
    },
  });

  const eventCount = useCountUp(counts?.events ?? 0);
  const fighterCount = useCountUp(counts?.fighters ?? 0);
  const gymCount = useCountUp(counts?.gyms ?? 0);

  const tiles = [
    { label: "Events", count: formatNumber(eventCount), suffix: "Active", to: "/events" },
    { label: "Fighters", count: formatNumber(fighterCount), suffix: "Listed", to: "/fighters" },
    { label: "Gyms", count: formatNumber(gymCount), suffix: "Registered", to: "/gyms" },
  ];

  return (
    <section className="py-20 bg-card border-y border-border/30">
      <div className="container">
        <motion.h2
          className="font-heading text-3xl md:text-4xl text-foreground text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          EXPLORE THE <span className="text-primary">NETWORK</span>
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-10">
          {tiles.map((tile, i) => (
            <motion.div
              key={tile.label}
              className="text-center"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
            >
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                {tile.label}
              </p>
              <p className="font-heading text-5xl md:text-6xl text-primary tabular-nums leading-none mb-2">
                {tile.count}
              </p>
              <p className="text-sm text-muted-foreground">{tile.suffix}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {tiles.map((tile) => (
            <Button key={tile.to} variant="heroOutline" asChild>
              <Link to={tile.to}>View {tile.label}</Link>
            </Button>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
