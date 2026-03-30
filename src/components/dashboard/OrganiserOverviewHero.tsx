import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ChevronDown, Check } from "lucide-react";

export function OrganiserOverviewHero() {
  const { user } = useAuth();
  const [ticketFilter, setTicketFilter] = useState("all");
  const [showTicketDrop, setShowTicketDrop] = useState(false);

  // Next upcoming event
  const { data: nextEvent } = useQuery({
    queryKey: ["organiser-next-event", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("organiser_id", user!.id)
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fight slots for that event
  const { data: slots = [] } = useQuery({
    queryKey: ["organiser-hero-slots", nextEvent?.id],
    queryFn: async () => {
      if (!nextEvent) return [];
      const { data } = await supabase
        .from("event_fight_slots")
        .select("*")
        .eq("event_id", nextEvent.id);
      return data ?? [];
    },
    enabled: !!nextEvent,
  });

  // Tickets for that event
  const { data: tickets = [] } = useQuery({
    queryKey: ["organiser-hero-tickets", nextEvent?.id],
    queryFn: async () => {
      if (!nextEvent) return [];
      const { data } = await supabase
        .from("tickets")
        .select("*")
        .eq("event_id", nextEvent.id);
      return data ?? [];
    },
    enabled: !!nextEvent,
  });

  const confirmed = slots.filter((s) => s.status === "confirmed").length;
  const pending = slots.filter((s) => s.status !== "confirmed" && s.status !== "cancelled" && (s.fighter_a_id || s.fighter_b_id)).length;
  const total = confirmed + pending;
  const progressPct = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  const ticketTypes = useMemo(() => {
    const types = new Set(tickets.map((t) => t.ticket_type));
    return ["all", ...Array.from(types)];
  }, [tickets]);

  const ticketsSold = useMemo(() => {
    const filtered = ticketFilter === "all" ? tickets : tickets.filter((t) => t.ticket_type === ticketFilter);
    return filtered.reduce((sum, t) => sum + (t.quantity_available ?? 0), 0);
  }, [tickets, ticketFilter]);

  const revenue = useMemo(() => {
    return tickets.reduce((sum, t) => sum + ((t.price ?? 0) * (t.quantity_available ?? 0)), 0);
  }, [tickets]);

  if (!nextEvent) {
    return (
      <div className="coach-card p-6 text-center">
        <p className="text-muted-foreground text-sm">No upcoming events. Create your first event to get started.</p>
      </div>
    );
  }

  return (
    <div className="coach-card p-5">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT: Event identity + progress */}
        <div className="flex-[1.5] space-y-4">
          {/* Event identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent border border-border flex items-center justify-center text-primary font-heading text-lg shrink-0">
              {nextEvent.title?.[0]?.toUpperCase() || "E"}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{nextEvent.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(nextEvent.date + "T00:00:00"), "MMMM d, yyyy")}
                {nextEvent.city && ` · ${nextEvent.city}`}
              </p>
            </div>
          </div>

          {/* Match Confirmation Progress */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Match Confirmation Progress</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 rounded-full bg-border/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-400"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-base font-bold text-primary">{progressPct}%</span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Confirmed ({confirmed})
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                Pending ({pending})
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: 2x2 Stats Grid */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          {/* Confirmed */}
          <div className="rounded-lg border border-border bg-accent p-3.5 hover:border-primary/20 transition-colors">
            <p className="text-[11px] text-muted-foreground">Confirmed</p>
            <p className="font-heading text-3xl text-primary">{confirmed}</p>
          </div>
          {/* Pending */}
          <div className="rounded-lg border border-border bg-accent p-3.5 hover:border-primary/20 transition-colors">
            <p className="text-[11px] text-muted-foreground">Pending</p>
            <p className="font-heading text-3xl text-destructive">{pending}</p>
          </div>
          {/* Tickets Sold */}
          <div className="rounded-lg border border-border bg-accent p-3.5 hover:border-primary/20 transition-colors">
            <p className="text-[11px] text-muted-foreground">Tickets Sold</p>
            <p className="font-heading text-3xl text-foreground">{ticketsSold}</p>
            <div className="relative mt-1">
              <button
                className="text-[10px] text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
                onClick={() => setShowTicketDrop(!showTicketDrop)}
              >
                {ticketFilter === "all" ? "All Types" : ticketFilter}
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
              {showTicketDrop && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTicketDrop(false)} />
                  <div className="absolute left-0 top-5 z-50 min-w-[120px] rounded-lg border border-border bg-accent shadow-xl p-1">
                    {ticketTypes.map((type) => (
                      <button
                        key={type}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] hover:bg-background/50 transition-colors"
                        style={{ color: ticketFilter === type ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
                        onClick={() => { setTicketFilter(type); setShowTicketDrop(false); }}
                      >
                        {type === "all" ? "All Types" : type}
                        {ticketFilter === type && <Check className="h-2.5 w-2.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Revenue */}
          <div className="rounded-lg border border-border bg-accent p-3.5 hover:border-primary/20 transition-colors">
            <p className="text-[11px] text-muted-foreground">Revenue</p>
            <p className="font-heading text-3xl text-emerald-500">${revenue.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
