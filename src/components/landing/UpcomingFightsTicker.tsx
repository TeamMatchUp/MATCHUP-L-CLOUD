import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Swords } from "lucide-react";

const SPONSORS = [
  "Venum", "Hayabusa", "Everlast", "Fairtex", "Tatami", "Ringside", "RDX", "Cleto Reyes",
];

function formatDate(d: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function UpcomingFightsTicker() {
  const { data } = useQuery({
    queryKey: ["ticker-upcoming-fights"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("event_fight_slots")
        .select("id, weight_class, discipline, fighter_a:fighter_profiles!fighter_a_id(name), fighter_b:fighter_profiles!fighter_b_id(name), events!inner(title, date, status)")
        .eq("status", "confirmed")
        .eq("is_public", true)
        .gte("events.date", today)
        .eq("events.status", "published")
        .limit(8);
      return data ?? [];
    },
  });

  const fights = (data ?? []).filter((f: any) => f.fighter_a && f.fighter_b);
  // Ensure enough content to fill viewport by repeating the fight list.
  // Each duplicate segment is one "half" of the -50% scroll cycle, so both halves must match.
  const REPEATS_PER_HALF = Math.max(4, Math.ceil(12 / Math.max(fights.length, 1)));
  const fillerRepeats = Array.from({ length: REPEATS_PER_HALF });

  return (
    <section className="border-y border-border/20 bg-[hsl(var(--card))]/40 overflow-hidden py-4 space-y-3">
      {/* Row 1 — upcoming fights */}
      <div className="ticker-row group">
        <div className="ticker-track group-hover:[animation-play-state:paused]" style={{ animationDuration: "60s" }}>
          {[...Array(2)].map((_, dup) => (
            <div key={dup} className="flex items-center justify-center gap-3 pr-3 shrink-0">
              {fights.length > 0 ? fillerRepeats.flatMap((_, rep) => fights.map((f: any) => (
                <div key={`${dup}-${rep}-${f.id}`} className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/60 text-xs whitespace-nowrap">
                  <Swords className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-foreground font-medium">{f.fighter_a?.name}</span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="text-foreground font-medium">{f.fighter_b?.name}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px]">{f.weight_class?.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="text-primary/80 uppercase tracking-wider text-[10px]">{f.events?.title}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="text-muted-foreground text-[10px]">{formatDate(f.events?.date)}</span>
                </div>
              ))) : (
                fillerRepeats.map((_, rep) => (
                  <div key={`${dup}-${rep}`} className="flex items-center gap-2 px-6 py-2 text-xs text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                    <Swords className="h-3.5 w-3.5 text-primary" />
                    Upcoming fights will appear here as promoters publish cards
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Row 2 — sponsors */}
      <div className="ticker-row group hidden sm:block">
        <div className="ticker-track group-hover:[animation-play-state:paused]" style={{ animationDuration: "90s", animationDirection: "reverse" }}>
          {[...Array(2)].map((_, dup) => (
            <div key={dup} className="flex items-center gap-10 pr-10 shrink-0">
              {SPONSORS.map((s) => (
                <span
                  key={`${dup}-${s}`}
                  className="font-heading text-lg tracking-widest text-muted-foreground/40 whitespace-nowrap"
                >
                  {s.toUpperCase()}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .ticker-row {
          display: flex;
          overflow: hidden;
          white-space: nowrap;
          mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
        }
        .ticker-track {
          display: flex;
          animation-name: ticker-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
