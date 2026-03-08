import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useState } from "react";

export function HeroSection() {
  const [exploreOpen, setExploreOpen] = useState(false);

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

          {/* Collapsible explore menu */}
          <motion.div
            className="absolute left-0 top-1/3 pl-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <button
              onClick={() => setExploreOpen(!exploreOpen)}
              className="flex items-center gap-3 group cursor-pointer"
            >
              {/* Three horizontal lines */}
              <div className="flex flex-col justify-center gap-[5px]">
                <span className={`block w-5 h-[2px] bg-foreground transition-all duration-250 ease-in-out ${exploreOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                <span className={`block w-5 h-[2px] bg-foreground transition-all duration-250 ease-in-out ${exploreOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-5 h-[2px] bg-foreground transition-all duration-250 ease-in-out ${exploreOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
              </div>
              <span className="text-sm font-medium text-foreground uppercase tracking-wide group-hover:text-primary transition-colors duration-200">
                explore
              </span>
            </button>

            <AnimatePresence>
              {exploreOpen && (
                <motion.div
                  className="flex flex-col gap-2 mt-4 pl-1"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
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
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
