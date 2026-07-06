import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BoostTierPicker } from "./BoostTierPicker";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
import type { BoostTierId } from "@/lib/boostTiers";
import { getTier } from "@/lib/boostTiers";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  mode: "upsell" | "manage";
}

export function BoostPurchaseDialog({ open, onOpenChange, eventId, mode }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<BoostTierId | null>(null);

  const handleConfirm = (tier: BoostTierId) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to purchase a boost." });
      return;
    }
    setSelectedTier(tier);
  };

  const reset = () => {
    setSelectedTier(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setSelectedTier(null); onOpenChange(o); }}>
      <DialogContent
        style={{
          maxWidth: "min(90vw, 960px)",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "hsl(var(--card))",
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 26,
              letterSpacing: "0.03em",
              color: "hsl(var(--foreground))",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Sparkles style={{ color: "hsl(var(--primary))", width: 22, height: 22 }} />
            {selectedTier
              ? `Pay for ${getTier(selectedTier).label} boost`
              : mode === "upsell"
              ? "Boost this event to reach more fans"
              : "Boost this event"}
          </DialogTitle>
          {!selectedTier && (
            <DialogDescription style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
              {mode === "upsell"
                ? "Your event is published. Pin it to the top of the explore page and event listings so more fighters and fans see it."
                : "Pin your event to the top of the explore page and event listings for a fixed period."}
            </DialogDescription>
          )}
        </DialogHeader>

        <div style={{ marginTop: 12 }}>
          {!selectedTier ? (
            <BoostTierPicker
              onConfirm={handleConfirm}
              onCancel={reset}
              primaryLabel="Continue to Payment"
              secondaryLabel={mode === "upsell" ? "Skip for now" : "Cancel"}
            />
          ) : user ? (
            <StripeEmbeddedCheckout
              mode="boost"
              tier={selectedTier}
              eventId={eventId}
              userId={user.id}
              customerEmail={user.email ?? undefined}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
