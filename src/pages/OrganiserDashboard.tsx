import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, ArrowRight, Bell, Megaphone } from "lucide-react";
import { NotificationHistory } from "@/components/NotificationHistory";
import { PromoteEventDialog } from "@/components/organiser/PromoteEventDialog";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/20 text-success border-success/30",
  completed: "bg-secondary/20 text-secondary border-secondary/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function OrganiserDashboard() {
  const { user } = useAuth();
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

  const { data: proposals = [] } = useQuery({
    queryKey: ["organiser-proposals", events.map((e) => e.id)],
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
                <p className="text-muted-foreground">
                  Manage your events, fight cards, and match proposals.
                </p>
              </div>
              <Button asChild className="gap-2">
                <Link to="/organiser/create-event">
                  <Plus className="h-4 w-4" /> Create Event
                </Link>
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

            {/* View Selector */}
            <Tabs defaultValue={searchParams.get("tab") || "events"} className="space-y-6">
              <TabsList className="bg-card border border-border">
                <TabsTrigger value="events">
                  <Calendar className="h-4 w-4 mr-1" /> Events
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <Bell className="h-4 w-4 mr-1" /> Notifications
                </TabsTrigger>
              </TabsList>

              <TabsContent value="events">
                <h2 className="font-heading text-2xl text-foreground mb-4">
                  MY <span className="text-primary">EVENTS</span>
                </h2>

                {events.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-8 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">You haven't created any events yet.</p>
                    <Button asChild size="lg">
                      <Link to="/organiser/create-event">Create Your First Event</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => {
                      const eventSlots = event.fight_slots || [];
                      const eventConfirmed = eventSlots.filter((s: any) => s.status === "confirmed").length;
                      const eventTotal = eventSlots.length;
                      const pct = eventTotal > 0 ? Math.round((eventConfirmed / eventTotal) * 100) : 0;
                      const barColor = pct < 50 ? "bg-destructive" : pct < 80 ? "bg-amber-500" : "bg-success";
                      return (
                        <div
                          key={event.id}
                          className="rounded-lg border border-border bg-card p-4"
                        >
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <Link to={`/organiser/events/${event.id}`} className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground truncate">{event.title}</p>
                                <Badge variant="outline" className={STATUS_COLORS[event.status] || ""}>
                                  {event.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {event.date} · {event.location} · {eventTotal} slots
                              </p>
                            </Link>
                            <div className="flex gap-2 shrink-0">
                              <Button size="sm" variant="outline" onClick={() => setPromoteEvent(event)}>
                                <Megaphone className="h-3.5 w-3.5 mr-1" /> Promote
                              </Button>
                              <Button size="sm" variant="ghost" asChild>
                                <Link to={`/organiser/events/${event.id}`}>
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                          {/* Fight card progress bar */}
                          {eventTotal > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
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

      {/* Promote Event Dialog */}
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
