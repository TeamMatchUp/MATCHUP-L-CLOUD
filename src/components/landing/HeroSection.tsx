import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useAuth } from "@/contexts/AuthContext";
import { AppIcon } from "@/components/AppIcon";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

export function HeroSection() {
  const { open } = useAuthModal();
  const { user } = useAuth();

  return (
    <section className="relative min-h-[70vh] flex items-center overflow-hidden py-16">
      <div className="container relative z-10">
        <div className="mx-auto max-w-5xl flex flex-col items-center text-center">
          {/* Logo + Headline horizontal lockup */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <AppIcon
              className="h-[clamp(112px,13vw,176px)] w-auto opacity-95 drop-shadow-[0_0_60px_rgba(255,255,255,0.08)] shrink-0"
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

          {/* Tagline */}
          <p
            className="text-foreground/90 mt-8 max-w-2xl font-normal"
            style={{ fontSize: "clamp(1rem, 1.6vw, 1.25rem)", lineHeight: 1.5 }}
          >
            Fighters, coaches and promoters are already matching. <strong className="font-bold text-foreground">Don't get left off the card.</strong>
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
