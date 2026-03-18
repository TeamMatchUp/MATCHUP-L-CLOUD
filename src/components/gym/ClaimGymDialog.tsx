import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2 } from "lucide-react";

interface ClaimGymDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gymId: string;
  gymName: string;
}

export function ClaimGymDialog({ open, onOpenChange, gymId, gymName }: ClaimGymDialogProps) {
  const { toast } = useToast();
  const { user, session } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    claimant_role: "",
    message: "",
  });

  const userName = session?.user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userEmail = user?.email || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.claimant_role || !user) return;

    setSubmitting(true);
    const { error } = await supabase.from("gym_claims" as any).insert({
      gym_id: gymId,
      claimant_name: userName,
      claimant_email: userEmail,
      claimant_role: form.claimant_role,
      message: form.message.trim() || null,
      user_id: user.id,
    } as any);

    setSubmitting(false);

    if (error) {
      toast({ title: "Failed to submit claim", description: error.message, variant: "destructive" });
      return;
    }

    setSubmitted(true);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setSubmitted(false);
      setForm({ claimant_role: "", message: "" });
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Claim {gymName}</DialogTitle>
          <DialogDescription>
            Verify your affiliation with this gym to manage its listing.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <p className="text-foreground font-medium">Claim submitted successfully</p>
            <p className="text-sm text-muted-foreground">
              We'll review your request and get back to you at {userEmail}.
            </p>
            <Button className="mt-2" onClick={() => handleClose(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="claimant_name">Full name</Label>
              <Input
                id="claimant_name"
                value={userName}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="claimant_email">Email address</Label>
              <Input
                id="claimant_email"
                type="email"
                value={userEmail}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="claimant_role">Role at gym</Label>
              <Select
                value={form.claimant_role}
                onValueChange={(v) => setForm((f) => ({ ...f, claimant_role: v }))}
              >
                <SelectTrigger id="claimant_role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Head Coach">Head Coach</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim_message">Message (optional)</Label>
              <Textarea
                id="claim_message"
                maxLength={1000}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Any additional details..."
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting || !form.claimant_role}>
              {submitting ? "Submitting..." : "Submit claim"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
