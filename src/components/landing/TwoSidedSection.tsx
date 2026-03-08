import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import boxingRingImg from "@/assets/boxing-ring-dark.jpg";

export function TwoSidedSection() {
  return (
    <section className="py-0">
      <div className="container px-0 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-1">
          {/* View Events — with boxing ring background */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Link
              to="/events"
              className="relative block aspect-[4/3] overflow-hidden group"
            >
              <img
                src={boxingRingImg}
                alt="Boxing ring arena"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-60"
              />
              <div className="absolute inset-0 bg-background/40" />
              <div className="relative z-10 flex items-center justify-center h-full">
                <h3 className="font-heading text-3xl md:text-4xl text-foreground tracking-wide">
                  VIEW EVENTS
                </h3>
              </div>
            </Link>
          </motion.div>

          {/* View Fighters — dark card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Link
              to="/fighters"
              className="relative block aspect-[4/3] overflow-hidden bg-card group"
            >
              <div className="relative z-10 flex items-center justify-center h-full">
                <h3 className="font-heading text-3xl md:text-4xl text-foreground tracking-wide">
                  VIEW FIGHTERS
                </h3>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Create Account CTA */}
      <motion.div
        className="flex justify-center py-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Link
          to="/auth"
          className="inline-flex items-center gap-3 bg-muted hover:bg-muted/80 text-foreground font-medium text-sm px-8 py-3 rounded-full transition-colors duration-200"
        >
          create account
        </Link>
      </motion.div>
    </section>
  );
}
