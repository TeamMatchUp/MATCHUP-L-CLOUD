import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Check, Bell } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId: string;
  eventTitle: string;
  organiserId?: string | null;
}

export function WaitlistDialog({ open, onOpenChange, eventId, eventTitle, organiserId }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || (user?.email?.split("@")[0] ?? "");
    if (!cleanEmail || !cleanName) return;
    setLoading(true);

    const { error } = await supabase.from("event_waitlist").insert({
      event_id: eventId,
      user_id: user?.id ?? null,
      name: cleanName,
      email: cleanEmail,
    });

    if (error) {
      // Duplicate = already on the list. Treat as success.
      if (error.code === "23505") {
        setDone(true);
        toast.success("You're already on the waitlist.");
      } else {
        toast.error("Could not join the waitlist. Please try again.");
        setLoading(false);
        return;
      }
    } else {
      // Best-effort organiser notification
      if (organiserId) {
        await supabase.rpc("create_notification", {
          _user_id: organiserId,
          _title: `New waitlist signup — ${eventTitle}`,
          _message: `${cleanName} (${cleanEmail}) joined the waitlist for ${eventTitle}.`,
          _type: "event_update",
          _reference_id: eventId,
        });
      }
      setDone(true);
      toast.success("You're on the waitlist. We'll email you if tickets open up.");
    }
    setLoading(false);
  };

  const reset = () => {
    setDone(false);
    setName("");
    setEmail(user?.email ?? "");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Join the waitlist
          </DialogTitle>
          <DialogDescription>
            {eventTitle} is sold out. Add your details and we'll notify you if tickets become available.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-4 text-sm text-foreground">
            <Check className="h-5 w-5 text-primary" />
            You're on the list. The organiser has been notified.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="wl-name">Full name</Label>
              <Input
                id="wl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wl-email">Email</Label>
              <Input
                id="wl-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !email || !name}>
                {loading ? "Joining..." : "Join waitlist"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
