import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useAuth } from "@/contexts/AuthContext";
import { AppIcon } from "@/components/AppIcon";
import { Link } from "react-router-dom";

export function HeroSection() {
  const { open } = useAuthModal();
  const { user } = useAuth();

  return (
    <section className="relative min-h-[78vh] flex items-center overflow-hidden">
      <div className="container relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-8 md:gap-12 items-center">
          {/* Shield mark */}
          <div className="flex justify-center md:justify-end">
            <AppIcon
              className="h-[clamp(180px,30vw,420px)] w-auto opacity-95 drop-shadow-[0_0_60px_rgba(255,255,255,0.08)]"
              alt="MatchUp shield"
            />
          </div>

          {/* Copy */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h1
              className="font-heading leading-[0.9] tracking-tight"
              style={{ fontWeight: 800, letterSpacing: "0.01em" }}
            >
              <span
                className="block text-foreground"
                style={{ fontSize: "clamp(2.5rem, 7.5vw, 5.75rem)", lineHeight: 0.95 }}
              >
                MATCH EASY
              </span>
              <span
                className="block text-primary text-gold-glow"
                style={{ fontSize: "clamp(2.5rem, 7.5vw, 5.75rem)", lineHeight: 0.95 }}
              >
                FIGHT HARD
              </span>
            </h1>

            <p
              className="text-foreground/80 mt-5 max-w-md"
              style={{ fontSize: "clamp(0.875rem, 1.1vw, 1rem)", letterSpacing: "0.08em" }}
            >
              UNITING ALL CORNERS OF MARTIAL ARTS.<br />
              SIGN UP, MATCHUP, PROMOTE, DONE...
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center md:justify-start gap-3">
              {user ? (
                <Button asChild variant="hero" size="lg" className="rounded-full px-8">
                  <Link to="/explore">Explore MatchUp</Link>
                </Button>
              ) : (
                <>
                  <Button
                    variant="hero"
                    size="lg"
                    className="rounded-full px-8"
                    onClick={() => open("signup")}
                  >
                    Create your free account
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    className="rounded-full px-8 bg-white text-black hover:bg-white/90"
                  >
                    <Link to="/explore">Explore MatchUp</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
