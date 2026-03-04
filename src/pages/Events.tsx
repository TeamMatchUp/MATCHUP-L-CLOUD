import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { MapPin, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockEvents } from "@/components/landing/FeaturedEventsSection";

const allEvents = [
  ...mockEvents,
  {
    id: "4",
    name: "KNOCKOUT KINGS 9",
    date: "2026-06-10",
    location: "Leeds, UK",
    promotion: "Knockout Kings",
    openSlots: 7,
    confirmedFights: 4,
    weightClasses: ["Heavyweight", "Light Heavyweight"],
  },
  {
    id: "5",
    name: "COMBAT ELITE 3",
    date: "2026-06-28",
    location: "Glasgow, UK",
    promotion: "Combat Elite",
    openSlots: 4,
    confirmedFights: 7,
    weightClasses: ["Flyweight", "Bantamweight", "Lightweight", "Welterweight"],
  },
];

const Events = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container">
            <motion.h1
              className="font-heading text-5xl md:text-6xl text-foreground mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              ALL <span className="text-primary">EVENTS</span>
            </motion.h1>
            <motion.p
              className="text-muted-foreground mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Browse upcoming combat sports events and open fight slots.
            </motion.p>

            <div className="space-y-4">
              {allEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  className="flex flex-col md:flex-row md:items-center justify-between rounded-lg border border-border bg-card p-6 hover:gold-border-subtle transition-all duration-250"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <div className="flex-1">
                    <h3 className="font-heading text-xl text-foreground">{event.name}</h3>
                    <p className="text-sm text-muted-foreground">{event.promotion}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mt-4 md:mt-0">
                    <div className="text-right">
                      <span className="block text-primary font-semibold text-sm">{event.openSlots} open</span>
                      <span className="block text-xs text-muted-foreground">{event.confirmedFights} confirmed</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Events;
