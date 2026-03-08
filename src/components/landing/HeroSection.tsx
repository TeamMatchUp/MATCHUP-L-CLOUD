import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden">
      {/* Giant watermark text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span
          className="font-heading text-[18vw] leading-none tracking-tighter text-foreground/[0.03] whitespace-nowrap"
        >
          MATCHUP
        </span>
      </div>

      <div className="container relative z-10">
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-12 md:gap-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="text-center">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-foreground leading-tight">
              PROMOTE
            </h2>
            <p className="font-heading text-2xl sm:text-3xl md:text-4xl text-foreground leading-tight">
              EVENTS
            </p>
          </div>

          <div className="text-center">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-foreground leading-tight">
              MATCH
            </h2>
            <p className="font-heading text-2xl sm:text-3xl md:text-4xl text-foreground leading-tight">
              FIGHTERS
            </p>
          </div>

          <div className="text-center">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-foreground leading-tight">
              SIMPLIFY
            </h2>
            <p className="font-heading text-2xl sm:text-3xl md:text-4xl text-foreground leading-tight">
              WORKFLOW
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
