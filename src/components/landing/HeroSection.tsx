import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden -mt-8">
      {/* Giant watermark text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="font-heading text-[20vw] leading-none tracking-tighter text-foreground/[0.03] whitespace-nowrap">
          MATCHUP
        </span>
      </div>

      <div className="container relative z-10">
        <div className="flex flex-col items-center text-center">
          <motion.h1
            className="font-heading text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-foreground leading-[0.9] mb-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            MATCH EASY,
            <br />
            <span className="text-primary text-gold-glow">FIGHT HARD</span>
          </motion.h1>

          <motion.p
            className="text-muted-foreground text-base md:text-lg max-w-md mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            promote, matchup, done. It's that simple...
          </motion.p>

          {/* Left-aligned nav links */}
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-3 pl-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Link to="/events" className="text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 uppercase tracking-wide">
              View Events
            </Link>
            <Link to="/fighters" className="text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 uppercase tracking-wide">
              View Fighters
            </Link>
            <Link to="/gyms" className="text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 uppercase tracking-wide">
              View Gyms
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
