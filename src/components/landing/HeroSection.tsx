import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useAuth } from "@/contexts/AuthContext";
import { AppIcon } from "@/components/AppIcon";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

const PARTNERS = ["Iron Circle Gym", "Apex MMA", "Northside Boxing", "Titan Fight Co.", "Vanguard Combat", "Crown MMA"];

export function HeroSection() {
  const { open } = useAuthModal();
  const { user } = useAuth();

  return (
    <section className="relative min-h-[78vh] flex items-center overflow-hidden py-16">
      <div className="container relative z-10">
        <div className="mx-auto max-w-4xl flex flex-col items-center text-center">
          <AppIcon
            className="h-[clamp(72px,9vw,120px)] w-auto opacity-95 drop-shadow-[0_0_60px_rgba(255,255,255,0.08)] mb-6"
            alt="MatchUp shield"
          />

          <p
            className="font-body uppercase text-muted-foreground mb-5"
            style={{ fontSize: "clamp(0.65rem, 0.8vw, 0.78rem)", letterSpacing: "0.22em" }}
          >
            AI-DRIVEN MATCHMAKING · VERIFIED FIGHTER DATABASE · FIGHT CARD BUILDER
          </p>

          <h1
            className="font-heading leading-[0.9] tracking-tight"
            style={{ fontWeight: 800, letterSpacing: "0.01em" }}
          >
            <span
              className="block text-foreground"
              style={{ fontSize: "clamp(2.25rem, 6vw, 4.75rem)", lineHeight: 0.92 }}
            >
              MATCH EASY,
            </span>
            <span
              className="block text-primary text-gold-glow"
              style={{ fontSize: "clamp(2.25rem, 6vw, 4.75rem)", lineHeight: 0.92 }}
            >
              FIGHT HARD
            </span>
          </h1>

          <p
            className="text-foreground/70 mt-5 max-w-xl font-body uppercase"
            style={{ fontSize: "clamp(0.75rem, 0.9vw, 0.9rem)", letterSpacing: "0.14em" }}
          >
            PROMOTE. MATCHUP. DONE. IT'S THAT SIMPLE…
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

          {/* Social proof counters */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span><span className="text-primary font-heading text-lg tracking-normal">850+</span> Fighters</span>
            <span className="opacity-40">·</span>
            <span><span className="text-primary font-heading text-lg tracking-normal">340+</span> Coaches</span>
            <span className="opacity-40">·</span>
            <span><span className="text-primary font-heading text-lg tracking-normal">96%</span> Match Rate</span>
          </div>

          {/* Partner strip */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 max-w-2xl">
            {PARTNERS.map((p) => (
              <span
                key={p}
                className="font-heading text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors tracking-wider"
              >
                {p}
              </span>
            ))}
          </div>

          {/* Trust microcopy */}
          <p className="mt-6 text-[11px] text-muted-foreground/70 flex items-center gap-1.5 flex-wrap justify-center">
            <Lock className="h-3 w-3" />
            Your fighter data is private by default · GDPR compliant · You control visibility
          </p>
        </div>
      </div>
    </section>
  );
}
