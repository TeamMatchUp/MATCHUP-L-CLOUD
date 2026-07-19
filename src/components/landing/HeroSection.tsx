import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useAuth } from "@/contexts/AuthContext";
import { AppIcon } from "@/components/AppIcon";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import heroHorizon from "@/assets/hero-horizon.png.asset.json";

export function HeroSection() {
  const { open } = useAuthModal();
  const { user } = useAuth();

  return (
    <section
      className="relative min-h-[calc(100vh-140px)] flex items-center overflow-hidden py-10 bg-black"
    >
      {/* Background layer overscanned by 1px on all sides so fractional browser
          zoom cannot expose a rendering seam at the section edge */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          inset: "-1px",
          backgroundImage: `url(${heroHorizon.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#000",
        }}
      />

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

      {/* Scroll suggestion */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-3 text-foreground/70 pointer-events-none z-20">
        <span
          className="font-body text-[11px] tracking-[0.25em] uppercase"
          style={{ writingMode: "vertical-rl", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
        >
          Scroll
        </span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </div>

    </section>
  );
}
