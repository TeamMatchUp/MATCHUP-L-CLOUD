import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface BannerAdProps {
  variant?: "horizontal" | "grid-break";
}

export function BannerAd({ variant = "horizontal" }: BannerAdProps) {
  return (
    <Link
      to="/advertise"
      className={`relative overflow-hidden rounded-lg border border-border bg-card block hover:border-primary/30 transition-colors ${
        variant === "grid-break" ? "col-span-full" : ""
      }`}
    >
      <div className="flex items-center justify-between px-6 py-5 md:py-6">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">
            Sponsored
          </p>
          <h4 className="font-heading text-xl md:text-2xl text-foreground">
            ADVERTISE WITH <span className="text-primary">MATCHUP</span>
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Reach thousands of fighters, coaches and promoters.
          </p>
        </div>
        <div className="flex items-center gap-2 text-primary">
          <span className="hidden sm:inline text-sm font-medium">Learn More</span>
          <ExternalLink className="h-4 w-4" />
        </div>
      </div>
      {/* Decorative accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </Link>
  );
}
