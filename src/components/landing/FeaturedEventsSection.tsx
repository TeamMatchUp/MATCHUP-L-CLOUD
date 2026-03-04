import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export const mockEvents = [
  {
    id: "1",
    name: "FURY FC 12",
    date: "2026-04-15",
    location: "Manchester, UK",
    promotion: "Fury Fighting Championship",
    openSlots: 3,
    confirmedFights: 8,
    weightClasses: ["Lightweight", "Welterweight", "Middleweight"],
  },
  {
    id: "2",
    name: "WARRIOR SERIES 7",
    date: "2026-05-02",
    location: "London, UK",
    promotion: "Warrior Combat Series",
    openSlots: 5,
    confirmedFights: 6,
    weightClasses: ["Flyweight", "Bantamweight", "Featherweight"],
  },
  {
    id: "3",
    name: "APEX MUAY THAI 4",
    date: "2026-05-20",
    location: "Birmingham, UK",
    promotion: "Apex Muay Thai",
    openSlots: 2,
    confirmedFights: 10,
    weightClasses: ["Lightweight", "Welterweight"],
  },
];

export function FeaturedEventsSection() {
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
            <Link to="/events">View All</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockEvents.map((event, i) => (
            <motion.div
              key={event.id}
              className="rounded-lg border border-border bg-background p-6 hover:gold-border-subtle transition-all duration-250 card-elevated"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </div>
              <h3 className="font-heading text-xl text-foreground mb-1">{event.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{event.promotion}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <MapPin className="h-3.5 w-3.5" />
                {event.location}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary font-semibold">{event.openSlots} open slots</span>
                <span className="text-muted-foreground">{event.confirmedFights} confirmed</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Button variant="ghost" asChild>
            <Link to="/events">View All Events</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
