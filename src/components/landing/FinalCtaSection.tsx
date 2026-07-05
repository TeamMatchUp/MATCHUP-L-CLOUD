import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useAuth } from "@/contexts/AuthContext";

export function FinalCtaSection() {
  const { open } = useAuthModal();
  const { user } = useAuth();

  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full bg-primary/[0.06] blur-[120px]" />
      </div>
      <div className="container relative z-10">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
        >
          <h2
            className="font-heading text-foreground mb-4 leading-[0.95]"
            style={{ fontSize: "clamp(2rem, 5.5vw, 4.25rem)" }}
          >
            YOUR TICKET TO THE FUTURE OF{" "}
            <span className="text-primary text-gold-glow">COMBAT SPORTS</span>{" "}
            IS ONE STEP AWAY
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg mb-10 max-w-xl mx-auto">
            Join the platform built for combat sports. Verified fighters, structured matchmaking, sold-out cards.
          </p>
          {user ? (
            <Button asChild variant="hero" size="lg" className="rounded-full px-10 min-h-[56px] text-base gold-glow">
              <Link to="/explore">Explore MatchUp</Link>
            </Button>
          ) : (
            <Button
              variant="hero"
              size="lg"
              className="rounded-full px-10 min-h-[56px] text-base gold-glow"
              onClick={() => open("signup")}
            >
              Create free account
            </Button>
          )}
        </motion.div>
      </div>
    </section>
  );
}
