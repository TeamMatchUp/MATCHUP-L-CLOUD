export function HeroSection() {
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
            className="font-heading leading-[0.85] mb-3 sm:mb-6 w-full"
            style={{
              fontSize: "clamp(4.5rem, 19vw, 13rem)",
              fontWeight: 800,
              letterSpacing: "0.01em",
            }}
          >
            <span className="block whitespace-nowrap text-foreground">MATCH EASY,</span>
            <span className="block whitespace-nowrap text-primary text-gold-glow">FIGHT HARD</span>
          </h1>

          <p className="text-foreground text-[3.5vw] sm:text-base md:text-lg max-w-md mt-2 sm:mt-4">
            PROMOTE, MATCHUP, DONE. IT'S THAT SIMPLE...
          </p>
        </div>
      </div>
    </section>
  );
}
