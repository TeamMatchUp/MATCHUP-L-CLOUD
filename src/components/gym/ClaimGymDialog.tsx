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
import { CheckCircle2 } from "lucide-react";

interface ClaimGymDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gymId: string;
  gymName: string;
}

export function ClaimGymDialog({ open, onOpenChange, gymId, gymName }: ClaimGymDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    claimant_name: "",
    claimant_email: "",
    claimant_role: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.claimant_name.trim() || !form.claimant_email.trim() || !form.claimant_role) return;

    setSubmitting(true);
    const { error } = await supabase.from("gym_claims" as any).insert({
      gym_id: gymId,
      claimant_name: form.claimant_name.trim(),
      claimant_email: form.claimant_email.trim(),
      claimant_role: form.claimant_role,
      message: form.message.trim() || null,
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
      setForm({ claimant_name: "", claimant_email: "", claimant_role: "", message: "" });
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
              We'll review your request and get back to you at {form.claimant_email}.
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
                required
                maxLength={100}
                value={form.claimant_name}
                onChange={(e) => setForm((f) => ({ ...f, claimant_name: e.target.value }))}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="claimant_email">Email address</Label>
              <Input
                id="claimant_email"
                type="email"
                required
                maxLength={255}
                value={form.claimant_email}
                onChange={(e) => setForm((f) => ({ ...f, claimant_email: e.target.value }))}
                placeholder="you@example.com"
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
