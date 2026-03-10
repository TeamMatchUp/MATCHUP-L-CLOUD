import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

function useCountUp(target: number, shouldStart: boolean, duration = 1600) {
  const [count, setCount] = useState(0);
  const raf = useRef<number>();

  useEffect(() => {
    if (!shouldStart || target <= 0) { setCount(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setCount(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, shouldStart, duration]);

  return count;
}

/** Displays count with smooth number transitions */
function AnimatedNumber({ value, isInView }: { value: number; isInView: boolean }) {
  const count = useCountUp(value, isInView);
  return <span className="tabular-nums">{count.toLocaleString()}</span>;
}

export function TwoSidedSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.9 });

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


  const tiles = useMemo(() => [
    { label: "Events", suffix: "Active", to: "/events", key: "events" as const },
    { label: "Fighters", suffix: "Listed", to: "/fighters", key: "fighters" as const },
    { label: "Gyms", suffix: "Registered", to: "/gyms", key: "gyms" as const },
  ], []);

  return (
    <section className="py-16 bg-card border-y border-border/30">
      <div className="container max-w-2xl" ref={sectionRef}>
        <motion.p
          className="font-heading text-xl sm:text-2xl md:text-3xl text-foreground text-center mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        >
          EXPLORE THE <span className="text-primary">NETWORK</span>
        </motion.p>

        <div className="grid grid-cols-3 gap-4">
          {tiles.map((tile, i) => (
            <motion.div
              key={tile.label}
              className="flex flex-col items-center text-center gap-1"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.08 }}
            >
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {tile.label}
              </p>
              <p className="font-heading text-4xl md:text-5xl text-primary leading-none my-1">
                <AnimatedNumber value={counts?.[tile.key] ?? 0} isInView={isInView} />
              </p>
              <p className="text-xs text-muted-foreground mb-3">{tile.suffix}</p>
              <Button variant="heroOutline" size="sm" asChild>
                <Link to={tile.to}>View {tile.label}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
