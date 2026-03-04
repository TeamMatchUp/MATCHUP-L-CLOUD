import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { mockFighters } from "@/components/landing/FeaturedFightersSection";

const allFighters = [
  ...mockFighters,
  {
    id: "5",
    name: "Liam O'Brien",
    record: "10-2-0",
    weightClass: "Featherweight",
    style: "MMA",
    gym: "Celtic Combat",
    height: "5'8\"",
    reach: "69\"",
    available: true,
  },
  {
    id: "6",
    name: "Kai Tanaka",
    record: "14-4-0",
    weightClass: "Lightweight",
    style: "Muay Thai",
    gym: "Rising Sun Muay Thai",
    height: "5'10\"",
    reach: "72\"",
    available: true,
  },
  {
    id: "7",
    name: "Tommy Watts",
    record: "7-3-1",
    weightClass: "Heavyweight",
    style: "MMA",
    gym: "Iron Forge MMA",
    height: "6'3\"",
    reach: "78\"",
    available: false,
  },
  {
    id: "8",
    name: "Rio Santos",
    record: "9-1-0",
    weightClass: "Welterweight",
    style: "Muay Thai",
    gym: "Bangkok Ready",
    height: "5'11\"",
    reach: "73\"",
    available: true,
  },
];

const Fighters = () => {
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
              FIGHTER <span className="text-primary">ROSTER</span>
            </motion.h1>
            <motion.p
              className="text-muted-foreground mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Explore active fighters across weight classes and disciplines.
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {allFighters.map((fighter, i) => (
                <motion.div
                  key={fighter.id}
                  className="rounded-lg border border-border bg-card p-6 hover:gold-border-subtle transition-all duration-250"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
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
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Fighters;
