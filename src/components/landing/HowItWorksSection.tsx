import { motion } from "framer-motion";
import { Search, Send, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "DISCOVER",
    description: "Browse events, explore fighters, and find the right matchups across weight classes and styles.",
  },
  {
    icon: Send,
    step: "02",
    title: "PROPOSE",
    description: "Organisers create structured match proposals. AI assists with optimal pairing recommendations.",
  },
  {
    icon: CheckCircle,
    step: "03",
    title: "CONFIRM",
    description: "Coach approves, fighter confirms. Only when all parties agree does a match become official.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 border-t border-border/30">
      <div className="container">
        <motion.h2
          className="font-heading text-4xl md:text-5xl text-center text-foreground mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          HOW IT <span className="text-primary">WORKS</span>
        </motion.h2>
        <motion.p
          className="text-center text-muted-foreground mb-16 max-w-md mx-auto text-sm"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Three steps to a confirmed fight. No shortcuts.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              className="relative text-center p-8 pt-12 rounded-lg border border-transparent hover:border-border transition-all duration-250 group overflow-visible"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              {/* Step number glow */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                <span className="font-heading text-5xl text-primary/10">{s.step}</span>
              </div>

              <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 border border-primary/20 mb-6 mt-4 transition-all duration-250 group-hover:bg-primary/15 group-hover:border-primary/30 group-hover:shadow-[0_0_20px_hsl(46_93%_61%/0.15)]">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading text-2xl text-foreground mb-3">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
