import { motion } from "framer-motion";
import { Shield, Users } from "lucide-react";

const sides = [
  {
    icon: Shield,
    title: "FOR ORGANISERS",
    description: "Create events, define fight slots, and use AI-powered smart matching to build the perfect card. Full control over every matchup.",
    features: ["Event creation", "AI Smart Match", "Confirmation tracking"],
  },
  {
    icon: Users,
    title: "FOR COACHES",
    description: "Manage your fighter roster, control availability, and review structured match proposals. Your fighters, your decisions.",
    features: ["Roster management", "Availability control", "Proposal review"],
  },
];

export function TwoSidedSection() {
  return (
    <section className="py-24 bg-card">
      <div className="container">
        <motion.h2
          className="font-heading text-4xl md:text-5xl text-center text-foreground mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          TWO SIDES. <span className="text-primary">ONE PLATFORM.</span>
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sides.map((side, i) => (
            <motion.div
              key={side.title}
              className="p-8 rounded-lg bg-background border border-border hover:gold-border-subtle transition-colors duration-250"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <side.icon className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-heading text-2xl text-foreground mb-3">{side.title}</h3>
              <p className="text-muted-foreground text-base mb-6">{side.description}</p>
              <ul className="space-y-2">
                {side.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
