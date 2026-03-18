import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Star } from "lucide-react";
import { toast } from "sonner";

interface UpgradeGymDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gymId: string;
  gymName: string;
}

const TIERS = [
  {
    name: "Free",
    price: "Free",
    features: ["Name & location", "Disciplines", "Map listing", "Contact details"],
    tier: "free",
    current: true,
  },
  {
    name: "Pro",
    price: "£29/month",
    features: ["Training schedule", "Social links", "Analytics dashboard", "Priority search"],
    tier: "pro",
    current: false,
  },
  {
    name: "Featured",
    price: "£79/month",
    features: ["Top directory placement", "Gold badge everywhere", "Full analytics", "All Pro features"],
    tier: "featured",
    current: false,
  },
];

export function UpgradeGymDialog({ open, onOpenChange, gymId, gymName }: UpgradeGymDialogProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleJoinWaitlist = async (tier: string) => {
    if (!email || !user) return;
    setSaving(true);
    setSelectedTier(tier);
    await supabase.from("upgrade_waitlist" as any).insert({
      user_id: user.id,
      gym_id: gymId,
      desired_tier: tier,
      email,
    } as any);
    setSaving(false);
    setSubmitted(true);
    toast.success("Added to waitlist!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">UPGRADE {gymName.toUpperCase()}</DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-6">
            <Check className="h-10 w-10 text-primary mx-auto mb-3" />
            <p className="font-heading text-lg text-foreground">You're on the waitlist!</p>
            <p className="text-sm text-muted-foreground mt-1">We'll contact you when {selectedTier} tier is available.</p>
            <Button className="mt-4" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              <Label className="text-xs">Your email for waitlist</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIERS.map((t) => (
                <div
                  key={t.tier}
                  className={`rounded-lg border p-4 flex flex-col ${
                    t.tier === "featured" ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-heading text-lg text-foreground">{t.name}</h3>
                    {t.tier === "featured" && <Star className="h-4 w-4 text-primary fill-primary" />}
                  </div>
                  <p className="font-heading text-2xl text-foreground mb-3">{t.price}</p>
                  <ul className="text-xs text-muted-foreground space-y-1.5 flex-1 mb-4">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {t.current ? (
                    <Button variant="outline" disabled className="w-full">Current Plan</Button>
                  ) : (
                    <Button
                      variant={t.tier === "featured" ? "default" : "outline"}
                      className="w-full"
                      onClick={() => handleJoinWaitlist(t.tier)}
                      disabled={saving || !email}
                    >
                      {saving && selectedTier === t.tier ? "Joining..." : "Join Waitlist"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
