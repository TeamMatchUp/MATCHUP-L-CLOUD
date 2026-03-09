import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, ArrowRight, Bell } from "lucide-react";
import { NotificationHistory } from "@/components/NotificationHistory";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/20 text-success border-success/30",
  completed: "bg-secondary/20 text-secondary border-secondary/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function OrganiserDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const { data: events = [] } = useQuery({
    queryKey: ["organiser-events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("organiser_id", user!.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const eventIds = events.map((e) => e.id);

  const { data: slots = [] } = useQuery({
    queryKey: ["organiser-slots", eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("fight_slots")
        .select("*")
        .in("event_id", eventIds);
      if (error) throw error;
      return data;
    },
    enabled: eventIds.length > 0,
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["organiser-proposals", eventIds],
    queryFn: async () => {
      const slotIds = slots.map((s) => s.id);
      if (slotIds.length === 0) return [];
      const { data, error } = await supabase
        .from("match_proposals")
        .select("*, fighter_a:fighter_profiles!match_proposals_fighter_a_id_fkey(name), fighter_b:fighter_profiles!match_proposals_fighter_b_id_fkey(name)")
        .in("fight_slot_id", slotIds);
      if (error) throw error;
      return data;
    },
    enabled: slots.length > 0,
  });

  const openSlots = slots.filter((s) => s.status === "open").length;
  const pendingProposals = proposals.filter((p) => p.status === "pending").length;
  const confirmedMatches = proposals.filter((p) => p.status === "confirmed").length;

  const stats = [
    { label: "My Events", value: String(events.length), sub: "Total events created" },
    { label: "Open Slots", value: String(openSlots), sub: "Unfilled fight slots" },
    { label: "Pending", value: String(pendingProposals), sub: "Awaiting confirmation" },
    { label: "Confirmed", value: String(confirmedMatches), sub: "Locked in" },
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
                  Manage your events, slots, and match proposals.
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
            <Tabs defaultValue="events" className="space-y-6">
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
                <Button asChild>
                  <Link to="/organiser/create-event">Create Your First Event</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => {
                  const eventSlots = slots.filter((s) => s.event_id === event.id);
                  const eventOpen = eventSlots.filter((s) => s.status === "open").length;
                  return (
                    <Link
                      key={event.id}
                      to={`/organiser/events/${event.id}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{event.title}</p>
                          <Badge variant="outline" className={STATUS_COLORS[event.status] || ""}>
                            {event.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.date} · {event.location} · {eventSlots.length} slots ({eventOpen} open)
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
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
      <Footer />
    </div>
  );
}
