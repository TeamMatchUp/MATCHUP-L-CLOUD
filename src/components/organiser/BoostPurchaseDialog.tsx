import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BoostTierPicker } from "./BoostTierPicker";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
import type { BoostTierId } from "@/lib/boostTiers";
import { getTier } from "@/lib/boostTiers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  mode: "upsell" | "manage";
}

export function BoostPurchaseDialog({ open, onOpenChange, eventId, mode }: Props) {
  const { toast } = useToast();

  const handleConfirm = (tier: BoostTierId) => {
    const t = getTier(tier);
    // Stripe integration not yet wired — placeholder. Once Stripe is enabled,
    // this should call the create-boost-checkout edge function with { eventId, tier }
    // and redirect to the returned Stripe URL.
    toast({
      title: "Payment integration coming soon",
      description: `Selected ${t.label} boost (£${t.price.toFixed(2)}). Stripe checkout will be enabled in a future update.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          maxWidth: "min(90vw, 720px)",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "#111318",
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 26,
              letterSpacing: "0.03em",
              color: "#e8eaf0",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Sparkles style={{ color: "#ef4444", width: 22, height: 22 }} />
            {mode === "upsell" ? "Boost this event to reach more fans" : "Boost this event"}
          </DialogTitle>
          <DialogDescription style={{ color: "#8b909e", fontSize: 13 }}>
            {mode === "upsell"
              ? "Your event is published. Pin it to the top of the explore page and event listings so more fighters and fans see it."
              : "Pin your event to the top of the explore page and event listings for a fixed period."}
          </DialogDescription>
        </DialogHeader>

        <div style={{ marginTop: 12 }}>
          <BoostTierPicker
            onConfirm={handleConfirm}
            onCancel={() => onOpenChange(false)}
            primaryLabel="Continue to Payment"
            secondaryLabel={mode === "upsell" ? "Skip for now" : "Cancel"}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
