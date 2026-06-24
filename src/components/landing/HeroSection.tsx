import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export function HeroSection() {
  const { open } = useAuthModal();
  const { user } = useAuth();

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
            style={{ fontWeight: 800, letterSpacing: "0.01em" }}
          >
            <span className="block whitespace-nowrap text-foreground" style={{ fontSize: "clamp(3.25rem, 17vw, 13rem)", lineHeight: 0.9 }}>MATCH EASY,</span>
            <span className="block whitespace-nowrap text-primary text-gold-glow" style={{ fontSize: "clamp(3.25rem, 17vw, 13rem)", lineHeight: 0.9 }}>FIGHT HARD</span>
          </h1>

          <p className="text-foreground text-sm sm:text-base md:text-lg max-w-md mt-3 sm:mt-4">
            PROMOTE, MATCHUP, DONE. IT'S THAT SIMPLE...
          </p>

          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Button asChild variant="hero" size="lg" className="rounded-full px-8">
                <Link to="/explore">Explore the platform</Link>
              </Button>
            ) : (
              <>
                <Button variant="hero" size="lg" className="rounded-full px-8" onClick={() => open("signup")}>
                  Get started
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 bg-transparent"
                  onClick={() => open("signin")}
                >
                  Sign in
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
