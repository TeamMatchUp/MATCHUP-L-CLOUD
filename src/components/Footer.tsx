import { Link } from "react-router-dom";
import { AppLogo } from "@/components/AppLogo";

export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-background">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <img src={logoFull} alt="MatchUp" className="h-6" />
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              The professional matchmaking platform for combat sports.
            </p>
          </div>
          <div>
            <h4 className="font-body text-sm font-semibold text-foreground mb-3">Platform</h4>
            <div className="flex flex-col gap-2">
              <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Events</Link>
              <Link to="/fighters" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Fighters</Link>
              <Link to="/gyms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Gyms</Link>
            </div>
          </div>
          <div>
            <h4 className="font-body text-sm font-semibold text-foreground mb-3">For Teams</h4>
            <div className="flex flex-col gap-2">
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Register Gym</Link>
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Create Event</Link>
            </div>
          </div>
          <div>
            <h4 className="font-body text-sm font-semibold text-foreground mb-3">Legal</h4>
            <div className="flex flex-col gap-2">
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/record-accuracy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Record Accuracy Policy</Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/30 text-center text-sm text-muted-foreground">
          2026 MatchUp. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
