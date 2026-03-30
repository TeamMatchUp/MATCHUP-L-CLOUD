import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format } from "date-fns";
import { Bell, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PAGE_SIZE = 5;

export function OrganiserPendingMatches() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpMsg, setFollowUpMsg] = useState("");

  // All organiser events
  const { data: events = [] } = useQuery({
    queryKey: ["org-pending-events", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, date, city, location")
        .eq("organiser_id", user!.id)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  const eventIds = events.map((e) => e.id);

  // Fight slots for upcoming events
  const { data: slots = [] } = useQuery({
    queryKey: ["org-pending-slots", eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data } = await supabase
        .from("event_fight_slots")
        .select("*, fighter_a:fighter_profiles!event_fight_slots_fighter_a_id_fkey(id,name,record_wins,record_losses,record_draws), fighter_b:fighter_profiles!event_fight_slots_fighter_b_id_fkey(id,name,record_wins,record_losses,record_draws)")
        .in("event_id", eventIds)
        .neq("status", "cancelled");
      return data ?? [];
    },
    enabled: eventIds.length > 0,
  });

  // Pending (non-confirmed) slots with at least one fighter
  const pendingSlots = useMemo(() => {
    return slots
      .filter((s) => s.status !== "confirmed" && (s.fighter_a_id || s.fighter_b_id))
      .map((s) => {
        const event = events.find((e) => e.id === s.event_id);
        const daysUntil = event ? differenceInDays(new Date(event.date), new Date()) : 999;
        return { ...s, event, daysUntil };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [slots, events]);

  const totalPages = Math.ceil(pendingSlots.length / PAGE_SIZE);
  const pageSlots = pendingSlots.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const getCountdownColor = (days: number) => {
    if (days <= 3) return "hsl(var(--destructive))";
    if (days <= 7) return "#f59e0b";
    return "hsl(var(--primary))";
  };

  const formatRecord = (w: number, l: number, d: number) => `${w}-${l}-${d}`;

  return (
    <div className="coach-card">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg text-foreground">Pending Matches</h3>
            <p className="text-[11px] text-muted-foreground">Sorted by urgency</p>
          </div>
          <button
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs border border-border bg-transparent text-foreground hover:bg-accent/50 transition-colors"
            onClick={() => setShowFollowUp(true)}
          >
            <Bell className="h-3.5 w-3.5" />
            Follow Up ({pendingSlots.length})
          </button>
        </div>

        {/* Match rows */}
        {pendingSlots.length === 0 ? (
          <div className="rounded-lg border border-border bg-background p-8 text-center">
            <p className="text-sm text-muted-foreground">No pending matches.</p>
          </div>
        ) : (
          <TooltipProvider>
            <div className="space-y-2">
              {pageSlots.map((slot) => (
                <Tooltip key={slot.id}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-background/30 p-3 px-4 hover:bg-accent/30 hover:border-primary/20 cursor-pointer transition-all duration-150">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {slot.fighter_a?.name || "TBD"}
                          </span>
                          {slot.fighter_a && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${slot.status === "confirmed" ? "bg-green-500/10 border border-green-500/25 text-green-500" : "bg-amber-500/10 border border-amber-500/25 text-amber-500"}`}>
                              {slot.status === "confirmed" ? "confirmed" : "pending"}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground my-0.5">vs</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {slot.fighter_b?.name || "TBD"}
                          </span>
                          {slot.fighter_b && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${slot.status === "confirmed" ? "bg-green-500/10 border border-green-500/25 text-green-500" : "bg-amber-500/10 border border-amber-500/25 text-amber-500"}`}>
                              {slot.status === "confirmed" ? "confirmed" : "pending"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {slot.weight_class && (
                          <p className="text-xs font-semibold text-foreground">
                            {slot.weight_class.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </p>
                        )}
                        <p
                          className="text-sm font-bold mt-0.5"
                          style={{ color: getCountdownColor(slot.daysUntil) }}
                        >
                          {slot.daysUntil}d
                        </p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-accent border-border text-xs max-w-[240px]">
                    {slot.event && (
                      <>
                        <p className="font-semibold text-foreground">{slot.event.title}</p>
                        <p className="text-muted-foreground">
                          {format(new Date(slot.event.date + "T00:00:00"), "MMM d, yyyy")}
                          {slot.event.city && ` · ${slot.event.city}`}
                        </p>
                      </>
                    )}
                    {slot.weight_class && <p className="text-muted-foreground mt-1">{slot.weight_class.replace(/_/g, " ")}</p>}
                    {slot.fighter_a && <p className="text-muted-foreground">{slot.fighter_a.name}: {formatRecord(slot.fighter_a.record_wins, slot.fighter_a.record_losses, slot.fighter_a.record_draws)}</p>}
                    {slot.fighter_b && <p className="text-muted-foreground">{slot.fighter_b.name}: {formatRecord(slot.fighter_b.record_wins, slot.fighter_b.record_losses, slot.fighter_b.record_draws)}</p>}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              className="w-7 h-7 rounded-full flex items-center justify-center border border-border bg-accent disabled:opacity-30 hover:border-primary/20 transition-colors"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="w-7 h-7 rounded-full flex items-center justify-center border border-border bg-accent disabled:opacity-30 hover:border-primary/20 transition-colors"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* Follow Up Modal */}
      {showFollowUp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) setShowFollowUp(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setShowFollowUp(false); }}
        >
          <div className="w-full max-w-[480px] rounded-xl border border-border bg-accent shadow-2xl p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading text-xl text-foreground">Send Follow Up</h3>
                <p className="text-xs text-muted-foreground mt-1">Send a message to all pending fighters</p>
              </div>
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowFollowUp(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <textarea
              className="w-full min-h-[120px] rounded-lg border border-border bg-background/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none resize-none"
              placeholder="Type your message here..."
              value={followUpMsg}
              onChange={(e) => setFollowUpMsg(e.target.value)}
            />
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => setShowFollowUp(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/80"
                onClick={() => {
                  setShowFollowUp(false);
                  setFollowUpMsg("");
                }}
              >
                Send Notification
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
