import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, ArrowRight, Bell, Megaphone, Sparkles, GripVertical } from "lucide-react";
import { NotificationHistory } from "@/components/NotificationHistory";
import { PromoteEventDialog } from "@/components/organiser/PromoteEventDialog";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/20 text-success border-success/30",
  completed: "bg-secondary/20 text-secondary border-secondary/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function OrganiserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [promoteEvent, setPromoteEvent] = useState<any>(null);

  const { data: events = [] } = useQuery({
    queryKey: ["organiser-events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, fight_slots(*)")
        .eq("organiser_id", user!.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch confirmed fight slots with fighter names
  const eventIds = events.map((e) => e.id);
  const { data: confirmedBouts = [] } = useQuery({
    queryKey: ["organiser-confirmed-bouts", eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("event_fight_slots")
        .select("*, fighter_a:fighter_profiles!event_fight_slots_fighter_a_id_fkey(name), fighter_b:fighter_profiles!event_fight_slots_fighter_b_id_fkey(name)")
        .in("event_id", eventIds)
        .eq("status", "confirmed")
        .order("slot_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: eventIds.length > 0,
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["organiser-proposals", eventIds],
    queryFn: async () => {
      const slotIds = events.flatMap((e) => (e.fight_slots || []).map((s: any) => s.id));
      if (slotIds.length === 0) return [];
      const { data, error } = await supabase
        .from("match_proposals")
        .select("*, fighter_a:fighter_profiles!match_proposals_fighter_a_id_fkey(name), fighter_b:fighter_profiles!match_proposals_fighter_b_id_fkey(name)")
        .in("fight_slot_id", slotIds);
      if (error) throw error;
      return data;
    },
    enabled: events.length > 0,
  });

  const totalSlots = events.flatMap((e) => e.fight_slots || []).length;
  const filledSlots = events.flatMap((e) => e.fight_slots || []).filter((s: any) => s.status === "confirmed").length;
  const filledPct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
  const pendingProposals = proposals.filter((p) => p.status === "pending").length;

  const stats = [
    { label: "Events Created", value: String(events.length), sub: "Total events" },
    { label: "Total Fight Slots", value: String(totalSlots), sub: "Across all events" },
    { label: "Slots Filled %", value: `${filledPct}%`, sub: `${filledSlots}/${totalSlots} confirmed` },
    { label: "Pending Proposals", value: String(pendingProposals), sub: "Awaiting confirmation" },
  ];

  const getBoutsForEvent = (eventId: string) =>
    confirmedBouts.filter((b: any) => b.event_id === eventId);

  const unwrap = (val: any) => Array.isArray(val) ? val[0] : val;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
              <div>
                <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-2">
                  ORGANISER <span className="text-primary">DASHBOARD</span>
                </h1>
                <p className="text-muted-foreground">Manage your events, fight cards, and match proposals.</p>
              </div>
              <Button asChild className="gap-2">
                <Link to="/organiser/create-event"><Plus className="h-4 w-4" /> Create Event</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {stats.map((card) => (
                <div key={card.label} className="rounded-lg border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="font-heading text-3xl text-foreground mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-2">{card.sub}</p>
                </div>
              ))}
            </div>

            <Tabs defaultValue={searchParams.get("tab") || "events"} className="space-y-6">
              <TabsList className="bg-card border border-border">
                <TabsTrigger value="events"><Calendar className="h-4 w-4 mr-1" /> Events</TabsTrigger>
                <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1" /> Notifications</TabsTrigger>
              </TabsList>

              <TabsContent value="events">
                <h2 className="font-heading text-2xl text-foreground mb-4">MY <span className="text-primary">EVENTS</span></h2>

                {events.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-8 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">You haven't created any events yet.</p>
                    <Button asChild size="lg"><Link to="/organiser/create-event">Create Your First Event</Link></Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events.map((event) => {
                      const eventSlots = event.fight_slots || [];
                      const eventConfirmed = eventSlots.filter((s: any) => s.status === "confirmed").length;
                      const eventTotal = eventSlots.length;
                      const pct = eventTotal > 0 ? Math.round((eventConfirmed / eventTotal) * 100) : 0;
                      const barColor = pct < 50 ? "bg-destructive" : pct < 80 ? "bg-amber-500" : "bg-success";
                      const bouts = getBoutsForEvent(event.id);

                      return (
                        <div key={event.id} className="rounded-lg border border-border bg-card p-5">
                          <div className="flex items-center justify-between gap-4 mb-3">
                            <Link to={`/organiser/events/${event.id}`} className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground truncate">{event.title}</p>
                                <Badge variant="outline" className={STATUS_COLORS[event.status] || ""}>{event.status}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{event.date} · {event.location} · {eventTotal} slots</p>
                            </Link>
                            <div className="flex gap-2 shrink-0">
                              <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate(`/matchmaking/${event.id}`)}>
                                <Sparkles className="h-3.5 w-3.5" /> Find Matches
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setPromoteEvent(event)}>
                                <Megaphone className="h-3.5 w-3.5 mr-1" /> Promote
                              </Button>
                              <Button size="sm" variant="ghost" asChild>
                                <Link to={`/organiser/events/${event.id}`}><ArrowRight className="h-4 w-4" /></Link>
                              </Button>
                            </div>
                          </div>

                          {/* Progress bar */}
                          {eventTotal > 0 && (
                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                            </div>
                          )}

                          {/* Confirmed Fight Card */}
                          {bouts.length > 0 && (
                            <div className="border-t border-border pt-3 mt-1">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Fight Card</p>
                              <div className="space-y-1.5">
                                {bouts.map((bout: any, idx: number) => {
                                  const fA = unwrap(bout.fighter_a);
                                  const fB = unwrap(bout.fighter_b);
                                  return (
                                    <div key={bout.id} className="flex items-center gap-2 text-sm">
                                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                                      <span className="text-foreground">{fA?.name ?? "TBD"}</span>
                                      <span className="text-primary font-heading text-xs">VS</span>
                                      <span className="text-foreground">{fB?.name ?? "TBD"}</span>
                                      {bout.weight_class && <Badge variant="outline" className="text-[10px] ml-auto">{bout.weight_class}</Badge>}
                                      {bout.bout_type && <Badge variant="secondary" className="text-[10px]">{bout.bout_type}</Badge>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notifications">
                <NotificationHistory />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      {promoteEvent && (
        <PromoteEventDialog
          open={!!promoteEvent}
          onOpenChange={(open) => { if (!open) setPromoteEvent(null); }}
          eventId={promoteEvent.id}
          eventTitle={promoteEvent.title}
        />
      )}

      <Footer />
    </div>
  );
}
