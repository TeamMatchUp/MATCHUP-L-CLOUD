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
    <section className="py-24">
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
          className="text-center text-muted-foreground mb-16 max-w-md mx-auto"
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
              className="text-center p-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <s.icon className="h-7 w-7 text-primary" />
              </div>
              <span className="block font-heading text-sm text-primary mb-2">{s.step}</span>
              <h3 className="font-heading text-2xl text-foreground mb-3">{s.title}</h3>
              <p className="text-muted-foreground text-sm">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
