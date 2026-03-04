import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const mockFighters = [
  {
    id: "1",
    name: "Marcus Cole",
    record: "12-3-0",
    weightClass: "Welterweight",
    style: "MMA",
    gym: "Iron Forge MMA",
    height: "5'11\"",
    reach: "74\"",
    available: true,
  },
  {
    id: "2",
    name: "Amir Hassan",
    record: "8-1-0",
    weightClass: "Lightweight",
    style: "Muay Thai",
    gym: "Bangkok Ready",
    height: "5'9\"",
    reach: "71\"",
    available: true,
  },
  {
    id: "3",
    name: "Jake Morrison",
    record: "15-5-1",
    weightClass: "Middleweight",
    style: "MMA",
    gym: "Apex Combat",
    height: "6'1\"",
    reach: "76\"",
    available: false,
  },
  {
    id: "4",
    name: "Dani Reyes",
    record: "6-0-0",
    weightClass: "Bantamweight",
    style: "Muay Thai",
    gym: "Siam Warriors",
    height: "5'6\"",
    reach: "67\"",
    available: true,
  },
];

export function FeaturedFightersSection() {
  return (
    <section className="py-24">
      <div className="container">
        <div className="flex items-end justify-between mb-12">
          <motion.h2
            className="font-heading text-4xl md:text-5xl text-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            FEATURED <span className="text-primary">FIGHTERS</span>
          </motion.h2>
          <Button variant="ghost" asChild className="hidden md:inline-flex">
            <Link to="/fighters">View All</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockFighters.map((fighter, i) => (
            <motion.div
              key={fighter.id}
              className="rounded-lg border border-border bg-card p-6 hover:gold-border-subtle transition-all duration-250"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-heading text-lg text-muted-foreground">
                  {fighter.name.split(" ").map(n => n[0]).join("")}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${fighter.available ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {fighter.available ? "Available" : "Booked"}
                </span>
              </div>
              <h3 className="font-heading text-lg text-foreground">{fighter.name}</h3>
              <p className="text-primary font-bold text-lg mt-1">{fighter.record}</p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>{fighter.weightClass} · {fighter.style}</p>
                <p>{fighter.gym}</p>
                <p>{fighter.height} · {fighter.reach} reach</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Button variant="ghost" asChild>
            <Link to="/fighters">View All Fighters</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
