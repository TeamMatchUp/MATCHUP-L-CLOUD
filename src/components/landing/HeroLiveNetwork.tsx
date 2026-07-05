import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface Stat {
  label: string;
  value: string;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const h = () => setReduced(m.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  return reduced;
}

export function HeroLiveNetwork() {
  const { data } = useQuery({
    queryKey: ["hero-live-network"],
    queryFn: async () => {
      const [fighters, coaches, organisers, confirmedSlots] = await Promise.all([
        supabase.from("fighter_profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "coach"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "organiser"),
        supabase.from("event_fight_slots").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
      ]);
      return {
        fighters: fighters.count ?? 0,
        coaches: coaches.count ?? 0,
        organisers: organisers.count ?? 0,
        hoursSaved: (confirmedSlots.count ?? 0) * 4,
      };
    },
  });

  const reduced = useReducedMotion();

  const stats: Stat[] = [
    { label: "Fighters", value: (data?.fighters ?? 0).toLocaleString() },
    { label: "Coaches", value: (data?.coaches ?? 0).toLocaleString() },
    { label: "Organisers", value: (data?.organisers ?? 0).toLocaleString() },
    { label: "Hours Saved", value: `${(data?.hoursSaved ?? 0).toLocaleString()}+` },
  ];

  if (reduced) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-heading text-2xl text-primary tabular-nums leading-none">{s.value}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    );
  }

  const size = 340;
  const radius = 130;
  const center = size / 2;

  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size, maxWidth: "90vw" }}
      aria-label="Live platform stats"
    >
      {/* rotating orbit layer */}
      <div className="absolute inset-0 hero-network-spin">
        {/* connecting lines */}
        <svg className="absolute inset-0" width={size} height={size} style={{ overflow: "visible" }}>
          {stats.map((_, i) => {
            const angle = (i / stats.length) * Math.PI * 2 - Math.PI / 2;
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="rgba(232,160,32,0.18)"
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            );
          })}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(232,160,32,0.08)" strokeWidth={1} />
        </svg>

        {/* nodes — counter-rotate so text stays upright */}
        {stats.map((s, i) => {
          const angle = (i / stats.length) * Math.PI * 2 - Math.PI / 2;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          return (
            <div
              key={s.label}
              className="absolute hero-network-counter"
              style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
            >
              <div
                className="px-4 py-2 rounded-full text-center whitespace-nowrap"
                style={{
                  backgroundColor: "#181c24",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(232,160,32,0.15)",
                }}
              >
                <p className="font-heading text-xl text-primary leading-none tabular-nums">{s.value}</p>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* central node */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          left: center,
          top: center,
          transform: "translate(-50%, -50%)",
          width: 56,
          height: 56,
          backgroundColor: "#111318",
          boxShadow:
            "0 0 0 1px rgba(232,160,32,0.35), 0 0 32px rgba(232,160,32,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <span className="font-heading text-primary text-lg tracking-wider">MU</span>
      </div>

      <style>{`
        @keyframes hero-network-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes hero-network-counter {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(-360deg); }
        }
        .hero-network-spin {
          animation: hero-network-spin 60s linear infinite;
          transform-origin: center;
        }
        .hero-network-counter {
          animation: hero-network-counter 60s linear infinite;
          transform-origin: center;
        }
      `}</style>
    </div>
  );
}
