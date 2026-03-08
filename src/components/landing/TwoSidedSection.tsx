import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const tiles = [
  { label: "VIEW EVENTS", to: "/events" },
  { label: "VIEW FIGHTERS", to: "/fighters" },
  { label: "VIEW GYMS", to: "/gyms" },
];

export function TwoSidedSection() {
  return (
    <section className="py-0">
      <div className="container px-0 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-1">
          {tiles.map((tile, i) => (
            <motion.div
              key={tile.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Link
                to={tile.to}
                className="relative block aspect-[4/3] overflow-hidden bg-card group border-r border-border/30 last:border-r-0"
              >
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/[0.03] transition-colors duration-250" />
                <div className="relative z-10 flex items-center justify-center h-full">
                  <h3 className="font-heading text-3xl md:text-4xl text-foreground tracking-wide group-hover:text-primary transition-colors duration-250">
                    {tile.label}
                  </h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Create Account CTA */}
      <motion.div
        className="flex justify-center py-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Link
          to="/auth"
          className="inline-flex items-center gap-3 bg-accent text-accent-foreground font-medium text-sm px-8 py-3 rounded-full transition-all duration-200 shadow-[0_0_20px_hsl(var(--accent)/0.3)] hover:shadow-[0_0_30px_hsl(var(--accent)/0.5)]"
        >
          create account
        </Link>
      </motion.div>
    </section>
  );
}
