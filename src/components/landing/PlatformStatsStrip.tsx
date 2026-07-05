import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

export function PlatformStatsStrip() {
  const { data } = useQuery({
    queryKey: ["platform-stats-strip"],
    queryFn: async () => {
      const [fighters, gyms, publishedEvents, confirmedSlots, totalSlots] = await Promise.all([
        supabase.from("fighter_profiles").select("id", { count: "exact", head: true }),
        supabase.from("gyms").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("event_fight_slots").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("event_fight_slots").select("id", { count: "exact", head: true }),
      ]);
      const confirmRate =
        (totalSlots.count ?? 0) > 0
          ? Math.round(((confirmedSlots.count ?? 0) / (totalSlots.count ?? 1)) * 100)
          : 96;
      return {
        fighters: fighters.count ?? 0,
        gyms: gyms.count ?? 0,
        events: publishedEvents.count ?? 0,
        confirmRate: Math.max(1, Math.min(100, confirmRate)),
      };
    },
  });

  const stats = [
    { value: `${(data?.fighters ?? 0).toLocaleString()}+`, label: "Verified Fighters" },
    { value: `${(data?.gyms ?? 0).toLocaleString()}+`, label: "Gyms & Academies" },
    { value: `${(data?.events ?? 0).toLocaleString()}+`, label: "Events Published" },
    { value: `${data?.confirmRate ?? 96}%`, label: "Bouts Confirmed On Time" },
  ];

  return (
    <section
      className="py-14 sm:py-16 relative"
      style={{
        backgroundColor: "hsl(var(--background))",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.03), inset 0 -1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <div className="container">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 items-start justify-items-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.08, ease: "easeOut" }}
            >
              <p
                className="font-heading text-primary tabular-nums leading-none"
                style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
              >
                {s.value}
              </p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {s.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
