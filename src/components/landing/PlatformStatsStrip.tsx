import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Building2, Calendar, Users, Clock, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

function useCountUp(target: number, shouldStart: boolean, duration = 1400) {
  const [count, setCount] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    if (!shouldStart || target <= 0) { setCount(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setCount(Math.round((1 - (1 - p) ** 2) * target));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, shouldStart, duration]);
  return count;
}

function StatCard({ value, label, icon: Icon, inView, delay, suffix, href }: { value: number; label: string; icon: LucideIcon; inView: boolean; delay: number; suffix?: string; href?: string }) {
  const count = useCountUp(value, inView);
  const content = (
    <motion.div
      className={`rounded-lg border border-border/30 bg-card p-4 text-center transition-all ${href ? "cursor-pointer hover:border-primary/60 hover:shadow-[0_0_12px_-4px_hsl(var(--primary)/0.3)]" : ""}`}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.22, delay }}
    >
      <Icon className="h-5 w-5 text-primary mx-auto mb-2" />
      <p className="font-heading text-2xl sm:text-3xl text-primary tabular-nums leading-none">
        {count.toLocaleString()}{suffix || ""}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
    </motion.div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}

export function PlatformStatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  const { data } = useQuery({
    queryKey: ["platform-stats-strip"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const [gyms, events, fighters, publishedEvents] = await Promise.all([
        supabase.from("gyms").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }).gte("date", today).eq("status", "published"),
        supabase.from("fighter_profiles").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
      ]);
      return {
        gyms: gyms.count ?? 0,
        events: events.count ?? 0,
        fighters: fighters.count ?? 0,
        hoursSaved: (publishedEvents.count ?? 0) * 15,
      };
    },
  });

  const cards = [
    { label: "Gyms Listed", key: "gyms" as const, icon: Building2, href: "/explore?tab=gyms" },
    { label: "Upcoming Events", key: "events" as const, icon: Calendar, href: "/explore?tab=events" },
    { label: "Fighters Registered", key: "fighters" as const, icon: Users, href: "/explore?tab=fighters" },
    { label: "Hours Saved", key: "hoursSaved" as const, icon: Clock, suffix: "+" },
  ];

  return (
    <section className="py-12 bg-background border-t border-border/20" ref={ref}>
      <div className="container max-w-5xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map((c, i) => (
            <StatCard key={c.key} value={data?.[c.key] ?? 0} label={c.label} icon={c.icon} inView={inView} delay={i * 0.06} suffix={c.suffix} href={c.href} />
          ))}
        </div>
      </div>
    </section>
  );
}
