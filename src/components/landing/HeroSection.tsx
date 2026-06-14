import { motion } from "framer-motion";

const LINE_1 = ["MATCH", "EASY,"];
const LINE_2 = ["FIGHT", "HARD"];

export function HeroSection() {
  let i = 0;
  const word = (text: string, gold = false) => {
    const delay = 0.15 * i++;
    return (
      <motion.span
        key={text + delay}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
        className={`inline-block mr-[0.18em] ${gold ? "text-primary text-gold-glow" : "text-foreground"}`}
      >
        {text}
      </motion.span>
    );
  };

  return (
    <section className="relative min-h-[60vh] sm:min-h-[75vh] flex items-center justify-center overflow-hidden -mt-8">
      {/* Giant watermark text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="font-heading text-[20vw] leading-none tracking-tighter text-foreground/[0.03] whitespace-nowrap">
          MATCHUP
        </span>
      </div>

      <div className="container relative z-10">
        <div className="flex flex-col items-center text-center">
          <h1
            className="font-heading leading-[0.85] mb-3 sm:mb-6"
            style={{
              fontSize: "clamp(3.5rem, 14vw, 9rem)",
              fontWeight: 800,
              letterSpacing: "0.02em",
            }}
          >
            <span className="block">{LINE_1.map((w) => word(w, false))}</span>
            <span className="block">{LINE_2.map((w) => word(w, true))}</span>
          </h1>

          <motion.p
            className="text-foreground text-[3.5vw] sm:text-base md:text-lg max-w-md mt-2 sm:mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15 * (LINE_1.length + LINE_2.length) }}
          >
            PROMOTE, MATCHUP, DONE. IT'S THAT SIMPLE...
          </motion.p>
        </div>
      </div>
    </section>
  );
}
