import { motion } from "framer-motion";
import { Calendar, Users, Shield } from "lucide-react";

const sides = [
  {
    icon: Calendar,
    title: "ORGANISERS",
    description: "Create events, define fight cards, and fill slots with AI-assisted match suggestions. Manage your promotion end-to-end.",
  },
  {
    icon: Shield,
    title: "COACHES",
    description: "Manage your roster, review proposals, and approve matches. Full control over which fights your athletes take.",
  },
  {
    icon: Users,
    title: "FIGHTERS",
    description: "Build your profile, track your record, and confirm match proposals. Your career data in one place.",
  },
];

export function ThreeSidesSection() {
  return (
    <section className="py-12 sm:py-24 relative overflow-hidden">
      {/* Subtle background glow */}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sides.map((side, i) => (
            <motion.div
              key={side.title}
              className="relative group rounded-lg border border-border bg-card p-8 transition-all duration-250 hover:border-primary/30 gold-glow-hover"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
            >
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 mb-6 transition-all duration-250 group-hover:bg-primary/15 group-hover:border-primary/30">
                <side.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading text-2xl text-foreground mb-3">{side.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{side.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
