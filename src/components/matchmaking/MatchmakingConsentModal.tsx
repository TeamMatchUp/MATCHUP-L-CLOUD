import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

interface Props {
  open: boolean;
  onConsented: () => void;
  recordConsent: () => Promise<void>;
}

export function MatchmakingConsentModal({ open, onConsented, recordConsent }: Props) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleContinue = async () => {
    if (!checked) return;
    setSaving(true);
    try {
      await recordConsent();
      onConsented();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not record consent");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate("/dashboard");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <DialogContent
        className="border-0 bg-card sm:max-w-[560px]"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)" }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <DialogTitle className="font-heading text-xl tracking-wide">
              Before you use matchmaking
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Matchup's rating and matchmaking system is a <span className="text-foreground">decision-support tool</span>,
            not a guarantee of a safe or fair pairing.
          </p>
          <p>
            Scores for fighters who haven't yet competed through Matchup are conservative
            estimates based on their reported record — always verify suitability before
            confirming a match.
          </p>
          <p>
            You remain responsible for verifying suitability before confirming any match,
            especially for debut fighters, welfare flags, and fighters without a
            Matchup-confirmed history.
          </p>
          <p className="text-xs">
            Full details:{" "}
            <Link to="/terms#matchmaking" className="text-primary underline underline-offset-2">
              Matchup Terms &amp; Conditions — Matchmaking
            </Link>
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-md bg-muted/30 p-3 cursor-pointer">
          <Checkbox
            checked={checked}
            onCheckedChange={(v) => setChecked(v === true)}
            className="mt-0.5"
          />
          <span className="text-sm text-foreground">
            I have read and understood this, and agree to the Matchup Terms &amp; Conditions.
          </span>
        </label>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleContinue} disabled={!checked || saving}>
            {saving ? "Saving..." : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
