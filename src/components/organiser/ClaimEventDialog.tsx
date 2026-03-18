import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ClaimEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

export function ClaimEventDialog({ open, onOpenChange, eventId, eventTitle }: ClaimEventDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState("Promoter");
  const [promotionName, setPromotionName] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email || !user) return;
    setSaving(true);

    const { error } = await supabase.from("event_claims" as any).insert({
      event_id: eventId,
      user_id: user.id,
      claimant_name: name,
      claimant_email: email,
      claimant_role: role,
      promotion_name: promotionName || null,
      status: "pending",
    } as any);

    setSaving(false);
    if (error) {
      toast.error("Failed to submit claim");
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">CLAIM SUBMITTED</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your claim for <span className="text-foreground font-medium">{eventTitle}</span> has been submitted and is pending review. We'll notify you once it's been processed.
          </p>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">CLAIM {eventTitle.toUpperCase()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Promoter">Promoter</SelectItem>
                <SelectItem value="Head Coach">Head Coach</SelectItem>
                <SelectItem value="Event Staff">Event Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Promotion / Company Name</Label>
            <Input value={promotionName} onChange={(e) => setPromotionName(e.target.value)} placeholder="Optional" />
          </div>
          <Button onClick={handleSubmit} disabled={saving || !name || !email} className="w-full">
            {saving ? "Submitting..." : "Submit Claim"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
