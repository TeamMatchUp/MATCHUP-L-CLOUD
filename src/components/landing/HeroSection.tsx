import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useAuth } from "@/contexts/AuthContext";
import { AppIcon } from "@/components/AppIcon";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { HeroLiveNetwork } from "./HeroLiveNetwork";

export function HeroSection() {
  const { open } = useAuthModal();
  const { user } = useAuth();

  return (
    <section className="relative min-h-[78vh] flex items-center overflow-hidden py-16">
      <div className="container relative z-10">
        <div className="mx-auto max-w-5xl flex flex-col items-center text-center">
          {/* Logo + Headline horizontal lockup */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8">
            <AppIcon
              className="h-[clamp(72px,9vw,120px)] w-auto opacity-95 drop-shadow-[0_0_60px_rgba(255,255,255,0.08)] shrink-0"
              alt="MatchUp shield"
            />
            <h1
              className="font-heading leading-[0.9] tracking-tight text-left"
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
          </div>

          {/* New tagline block */}
          <h2
            className="font-heading text-foreground mt-8"
            style={{ fontSize: "clamp(1.25rem, 2.2vw, 1.75rem)", letterSpacing: "0.04em" }}
          >
            WHERE FIGHTS GET MADE.
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm sm:text-base">
            Fighters, coaches and promoters are already matching. Don't get left off the card.
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

          {/* Rotating live KPI network */}
          <div className="mt-12">
            <HeroLiveNetwork />
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
