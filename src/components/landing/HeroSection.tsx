import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useAuth } from "@/contexts/AuthContext";
import { AppIcon } from "@/components/AppIcon";
import { Link } from "react-router-dom";
import heroHorizon from "@/assets/hero-horizon-v2.png.asset.json";

export function HeroSection() {
  const { open } = useAuthModal();
  const { user } = useAuth();

  return (
    <section
      className="relative min-h-[calc(100svh-4rem)] flex items-center overflow-hidden py-10 bg-black"
      style={{
        backgroundImage: `url(${heroHorizon.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center bottom",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Scroll indicator */}
      <div
        aria-hidden="true"
        className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-2 text-foreground/60 select-none pointer-events-none"
        style={{ animation: "heroScrollBounce 2.8s ease-in-out infinite" }}
      >
        <span
          className="font-heading text-xs"
          style={{ writingMode: "vertical-rl", letterSpacing: "0.4em" }}
        >
          SCROLL
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <style>{`
        @keyframes heroScrollBounce {
          0%, 70%, 100% { transform: translate(0, -50%); }
          80% { transform: translate(0, calc(-50% + 6px)); }
          90% { transform: translate(0, calc(-50% - 2px)); }
        }
      `}</style>

      <div className="container relative z-10">
        <div className="mx-auto max-w-6xl flex flex-col items-center text-center">
          {/* Horizontal lockup: MATCH EASY — shield — FIGHT HARD */}
          <h1
            className="font-heading flex items-center justify-center gap-[0.005em] text-foreground"

            style={{
              fontWeight: 800,
              letterSpacing: "0.01em",
              fontSize: "clamp(1.75rem, 8vw, 4.75rem)",
              lineHeight: 1,
            }}
          >
            <span>MATCH EASY</span>
            <span className="inline-flex shrink-0" style={{ height: "4em" }}>
              <AppIcon className="h-full w-auto" alt="MatchUp shield" />
            </span>
            <span>FIGHT HARD</span>
          </h1>

          {/* Tagline */}
          <p
            className="text-foreground/90 mt-8 max-w-2xl font-normal"
            style={{ fontSize: "clamp(1rem, 1.6vw, 1.25rem)", lineHeight: 1.5 }}
          >
            Fighters, coaches and promoters are already matching.
            <br />
            <strong className="font-bold text-foreground">Don't get left off the card.</strong>
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto">
            {user ? (
              <Button asChild variant="hero" size="lg" className="rounded-full px-10 min-h-[52px] text-base">
                <Link to="/explore">Explore MatchUp</Link>
              </Button>
            ) : (
              <>
                <Button
                  variant="hero"
                  size="lg"
                  className="rounded-full px-10 min-h-[52px] text-base gold-glow"
                  onClick={() => open("signup")}
                >
                  Create free account
                </Button>
                <Link
                  to="/explore"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 self-center"
                >
                  or explore MatchUp →
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
