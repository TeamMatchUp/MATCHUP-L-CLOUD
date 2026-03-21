import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function FeaturedEventsSection() {
  const { data: events } = useQuery({
    queryKey: ["featured-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, fight_slots(*)")
        .eq("status", "published")
        .order("date", { ascending: true })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const displayEvents = events ?? [];

  return (
    <section className="py-24 bg-card">
      <div className="container">
        <div className="flex items-end justify-between mb-12">
          <motion.h2
            className="font-heading text-4xl md:text-5xl text-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            UPCOMING <span className="text-primary">EVENTS</span>
          </motion.h2>
          <Button variant="ghost" asChild className="hidden md:inline-flex">
            <Link to="/explore?tab=events">View All</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayEvents.map((event, i) => {
            const openSlots = event.fight_slots?.filter((s: any) => s.status === "open").length ?? 0;
            const confirmedFights = event.fight_slots?.filter((s: any) => s.status === "confirmed").length ?? 0;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link
                  to={`/events/${event.id}`}
                  className="rounded-lg border border-border bg-background p-6 hover:gold-border-subtle transition-all duration-250 card-elevated block"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <h3 className="font-heading text-xl text-foreground mb-1">{event.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{event.promotion_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.location}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary font-semibold">{openSlots} open slots</span>
                    <span className="text-muted-foreground">{confirmedFights} confirmed</span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Button variant="ghost" asChild>
            <Link to="/explore?tab=events">View All Events</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
