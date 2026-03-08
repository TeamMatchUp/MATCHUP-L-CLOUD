import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import boxingRingImg from "@/assets/boxing-ring-dark.jpg";
import iconImg from "@/assets/icon.png";

export function TwoSidedSection() {
  return (
    <section className="py-0">
      <div className="container px-0 sm:px-8">
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-1">
          {/* Icon between tile 1 and 2 */}
          <div className="hidden md:flex absolute z-20 items-center justify-center pointer-events-none" style={{ left: 'calc(33.333% - 24px)', top: '50%', transform: 'translateY(-50%)' }}>
            <img src={iconImg} alt="MatchUp icon" className="h-12 w-12 drop-shadow-lg" />
          </div>
          {/* Icon between tile 2 and 3 */}
          <div className="hidden md:flex absolute z-20 items-center justify-center pointer-events-none" style={{ left: 'calc(66.666% - 24px)', top: '50%', transform: 'translateY(-50%)' }}>
            <img src={iconImg} alt="MatchUp icon" className="h-12 w-12 drop-shadow-lg" />
          </div>

          {/* View Events */}
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
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-250 ease-in-out group-hover:scale-105 opacity-60"
              />
              <div className="absolute inset-0 bg-background/40" />
              <div className="relative z-10 flex items-center justify-center h-full">
                <h3 className="font-heading text-3xl md:text-4xl text-foreground tracking-wide">
                  VIEW EVENTS
                </h3>
              </div>
            </Link>
          </motion.div>

          {/* View Fighters */}
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

          {/* View Gyms */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              to="/gyms"
              className="relative block aspect-[4/3] overflow-hidden group"
            >
              <img
                src={boxingRingImg}
                alt="Gym arena"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-250 ease-in-out group-hover:scale-105 opacity-40"
              />
              <div className="absolute inset-0 bg-background/50" />
              <div className="relative z-10 flex items-center justify-center h-full">
                <h3 className="font-heading text-3xl md:text-4xl text-foreground tracking-wide">
                  VIEW GYMS
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
        transition={{ duration: 0.5, delay: 0.3 }}
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
