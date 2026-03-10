import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AppLogo } from "@/components/AppLogo";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function Footer() {
  const { user, effectiveRoles, signOut } = useAuth();
  const navigate = useNavigate();
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [roleDialogAction, setRoleDialogAction] = useState("");

  const handleCreateEvent = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (effectiveRoles.includes("gym_owner")) {
      navigate("/organiser/create-event");
      return;
    }
    if (effectiveRoles.includes("organiser")) {
      navigate("/organiser/create-event");
      return;
    }
    // Fighter or no matching role
    setRoleDialogAction("create events");
    setShowRoleDialog(true);
  };

  const handleRegisterGym = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (effectiveRoles.includes("gym_owner")) {
      navigate("/register-gym");
      return;
    }
    // Organiser, fighter, or no matching role
    setRoleDialogAction("register a gym");
    setShowRoleDialog(true);
  };

  const handleLogoutAndRegister = async () => {
    setShowRoleDialog(false);
    await signOut();
    navigate("/auth");
  };

  return (
    <>
      <footer className="border-t border-border/30 bg-background">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <AppLogo className="h-6" />
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
                <button
                  onClick={handleRegisterGym}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  Register Gym
                </button>
                <button
                  onClick={handleCreateEvent}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  Create Event
                </button>
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

      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access level required</DialogTitle>
            <DialogDescription>
              Your current account doesn't have the access level needed to {roleDialogAction}. To continue, you'll need to create a new account with the appropriate role.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogoutAndRegister}>
              Create New Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
