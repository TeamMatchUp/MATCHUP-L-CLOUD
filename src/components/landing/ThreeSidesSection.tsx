import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Users, Shield, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const sides = [
  {
    icon: Calendar,
    title: "ORGANISERS",
    description: "Create, publish and manage promotions with powerful automated matchmaking.",
    features: [
      "Create, publish and manage promotions",
      "Powerful automated matchmaking suggestions",
      "Full end-to-end analytics",
      "Integrated ticket sales and marketing",
      "Natural lead generation",
    ],
  },
  {
    icon: Users,
    title: "FIGHTERS",
    description: "Build your profile, track your record and engage with the community.",
    features: [
      "Build your profile, track your record and statistics like win rate and KO%",
      "Engage with match proposals",
      "Search and filter upcoming events",
      "Locate and engage with gyms near you",
    ],
  },
  {
    icon: Shield,
    title: "COACHES",
    description: "A central hub to level up your gym performance.",
    features: [
      "Full control centre for fighter matches, gym profiles and event promotion management",
      "Membership and session leads with detailed analytics",
      "Seamless CSV import from Excel",
      "Create, publish and manage events with automated matchmaking",
    ],
  },
];

export function ThreeSidesSection() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggle = (i: number) => {
    setExpandedIndex(expandedIndex === i ? null : i);
  };

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[100px]" />
      </div>

      <div className="container relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl text-foreground mb-3">
            THREE SIDES. <span className="text-primary">ONE PLATFORM.</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            MatchUp connects the three key roles in combat sports matchmaking into a single, streamlined workflow.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {sides.map((side, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <motion.div
                key={side.title}
                className={`relative group rounded-lg border bg-card p-8 transition-all duration-250 cursor-pointer ${
                  isExpanded
                    ? "border-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                    : "border-border hover:border-primary/30 gold-glow-hover"
                }`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                onClick={() => toggle(i)}
              >
                <div className="flex items-start justify-between">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 mb-6 transition-all duration-250 group-hover:bg-primary/15 group-hover:border-primary/30">
                    <side.icon className="h-6 w-6 text-primary" />
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                      isExpanded ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </div>
                <h3 className="font-heading text-2xl text-foreground mb-3">{side.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{side.description}</p>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <ul className="mt-4 space-y-2 border-t border-border/30 pt-4">
                        {side.features.map((f, fi) => (
                          <li key={fi} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-5">
                        <Button size="sm" className="w-full" asChild>
                          <Link to="/auth?mode=signup">Create Account</Link>
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
