import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PAGE_SIZE = 5;

export function CoachUpcomingFights() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);

  // Get coach's fighter IDs
  const { data: fighterIds = [] } = useQuery({
    queryKey: ["coach-upcoming-fighter-ids", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("id")
        .eq("created_by_coach_id", user!.id);
      return (data ?? []).map((f) => f.id);
    },
    enabled: !!user,
  });

  // Get confirmed fight slots for these fighters
  const { data: upcomingFights = [] } = useQuery({
    queryKey: ["coach-upcoming-fights", fighterIds],
    queryFn: async () => {
      if (fighterIds.length === 0) return [];
      const today = new Date().toISOString().split("T")[0];

      const { data: slotsA } = await supabase
        .from("event_fight_slots")
        .select("*, events(id, title, date, location, city)")
        .in("fighter_a_id", fighterIds)
        .eq("status", "confirmed");

      const { data: slotsB } = await supabase
        .from("event_fight_slots")
        .select("*, events(id, title, date, location, city)")
        .in("fighter_b_id", fighterIds)
        .eq("status", "confirmed");

      const map = new Map<string, any>();
      [...(slotsA ?? []), ...(slotsB ?? [])].forEach((s) => {
        if (s.events && s.events.date >= today) {
          map.set(s.id, s);
        }
      });

      // Sort by event date
      return Array.from(map.values()).sort(
        (a, b) => a.events.date.localeCompare(b.events.date)
      );
    },
    enabled: fighterIds.length > 0,
  });

  // Fetch fighter names for display
  const allSlotFighterIds = useMemo(() => {
    const ids = new Set<string>();
    upcomingFights.forEach((s) => {
      if (s.fighter_a_id) ids.add(s.fighter_a_id);
      if (s.fighter_b_id) ids.add(s.fighter_b_id);
    });
    return Array.from(ids);
  }, [upcomingFights]);

  const { data: fighterNames = {} } = useQuery({
    queryKey: ["coach-upcoming-names", allSlotFighterIds],
    queryFn: async () => {
      if (allSlotFighterIds.length === 0) return {};
      const { data } = await supabase
        .from("fighter_profiles")
        .select("id, name")
        .in("id", allSlotFighterIds);
      const map: Record<string, string> = {};
      (data ?? []).forEach((f) => { map[f.id] = f.name; });
      return map;
    },
    enabled: allSlotFighterIds.length > 0,
  });

  const totalPages = Math.max(1, Math.ceil(upcomingFights.length / PAGE_SIZE));
  const paged = upcomingFights.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="coach-card">
      <div className="p-5 pb-3">
        <h3 className="font-heading text-lg text-foreground">
          UPCOMING <span className="text-primary">FIGHTS</span>
        </h3>
      </div>

      <div className="px-5 pb-4 space-y-2">
        {paged.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No upcoming fights scheduled.
          </p>
        )}

        <TooltipProvider>
          {paged.map((slot) => {
            const event = slot.events;
            const daysUntil = differenceInDays(new Date(event.date), new Date());
            const countdownText = daysUntil === 0 ? "Today" : daysUntil === 1 ? "1 day" : `${daysUntil} days`;
            const nameA = fighterNames[slot.fighter_a_id] || "TBA";
            const nameB = fighterNames[slot.fighter_b_id] || "TBA";

            return (
              <Tooltip key={slot.id}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3 hover:bg-accent/50 hover:border-primary/20 transition-all cursor-pointer">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="text-foreground">{nameA}</span>
                        <span className="mx-1.5 text-muted-foreground">vs</span>
                        <span className="text-foreground">{nameB}</span>
                      </p>
                    </div>
                    <span className="shrink-0 ml-3 rounded-md bg-primary/10 border border-primary/25 text-primary text-xs font-bold px-2.5 py-1">
                      {countdownText}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-accent border-border text-xs">
                  <p className="font-semibold text-foreground">{format(new Date(event.date), "MMM d, yyyy")}</p>
                  <p className="text-muted-foreground">{event.city || event.location}</p>
                  {slot.weight_class && <p className="text-muted-foreground capitalize">{slot.weight_class.replace("_", " ")}</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>

        {/* Pagination */}
        {upcomingFights.length > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-accent border border-border disabled:opacity-30"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-accent border border-border disabled:opacity-30"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
