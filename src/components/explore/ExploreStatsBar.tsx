import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || target === 0) return;
    started.current = true;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return value;
}

export function ExploreStatsBar() {
  const { data: gymCount = 0 } = useQuery({
    queryKey: ["explore-gym-count"],
    queryFn: async () => {
      const { count } = await supabase.from("gyms").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: eventCount = 0 } = useQuery({
    queryKey: ["explore-event-count"],
    queryFn: async () => {
      const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published");
      return count ?? 0;
    },
  });

  const { data: fighterCount = 0 } = useQuery({
    queryKey: ["explore-fighter-count"],
    queryFn: async () => {
      const { count } = await supabase.from("fighter_profiles").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const animGyms = useCountUp(gymCount);
  const animEvents = useCountUp(eventCount);
  const animFighters = useCountUp(fighterCount);

  const stats = [
    { value: animGyms, label: "Elite Gyms" },
    { value: animEvents, label: "Upcoming Events" },
    { value: animFighters, label: "Active Fighters" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: "#14171e",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 36,
              color: "#e8a020",
              textShadow: "0 0 20px rgba(232,160,32,0.25)",
              lineHeight: 1,
            }}
          >
            {s.value}
          </div>
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              color: "#8b909e",
              marginTop: 4,
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
