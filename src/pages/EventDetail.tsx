import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { MapPin, Calendar, ArrowLeft, ExternalLink, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

const SLOT_STATUS_STYLES: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  proposed: "bg-secondary/10 text-secondary",
  confirmed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, fight_slots(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="container py-16">
            <div className="h-8 w-64 bg-card animate-pulse rounded mb-4" />
            <div className="h-4 w-48 bg-card animate-pulse rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="container py-16 text-center">
            <h1 className="font-heading text-3xl text-foreground mb-4">Event Not Found</h1>
            <Button variant="ghost" asChild>
              <Link to="/events"><ArrowLeft className="h-4 w-4 mr-2" />Back to Events</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const openSlots = event.fight_slots?.filter((s: any) => s.status === "open") ?? [];
  const confirmedSlots = event.fight_slots?.filter((s: any) => s.status === "confirmed") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container">
            <Button variant="ghost" size="sm" asChild className="mb-6">
              <Link to="/events"><ArrowLeft className="h-4 w-4 mr-2" />All Events</Link>
            </Button>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-2">{event.title}</h1>
              <p className="text-lg text-muted-foreground mb-4">{event.promotion_name}</p>

              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground mb-8">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(event.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </span>
              </div>

              {event.description && (
                <p className="text-muted-foreground max-w-2xl mb-8">{event.description}</p>
              )}

              {/* Location Map */}
              <div className="rounded-lg border border-border overflow-hidden mb-12">
                <iframe
                  title="Event Location"
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    [event.venue_name, event.location, event.city, event.country].filter(Boolean).join(", ")
                  )}&output=embed&z=14`}
                />
                <div className="bg-card px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  {[event.venue_name, event.location, event.city].filter(Boolean).join(", ")}
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {[
                { label: "Total Slots", value: event.fight_slots?.length ?? 0 },
                { label: "Open", value: openSlots.length },
                { label: "Confirmed", value: confirmedSlots.length },
                { label: "Country", value: event.country },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="font-heading text-2xl text-foreground mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Fight Slots */}
            <h2 className="font-heading text-2xl text-foreground mb-6">
              FIGHT <span className="text-primary">CARD</span>
            </h2>
            {event.fight_slots && event.fight_slots.length > 0 ? (
              <div className="space-y-3">
                {event.fight_slots
                  .sort((a: any, b: any) => a.slot_number - b.slot_number)
                  .map((slot: any) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-heading text-lg text-muted-foreground w-8">#{slot.slot_number}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{WEIGHT_CLASS_LABELS[slot.weight_class]}</p>
                        </div>
                      </div>
                      <Badge className={SLOT_STATUS_STYLES[slot.status] ?? ""} variant="outline">
                        {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No fight slots defined yet.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
