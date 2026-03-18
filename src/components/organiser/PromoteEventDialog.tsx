import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Check, Share2, Code, Star } from "lucide-react";
import { toast } from "sonner";

interface PromoteEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

export function PromoteEventDialog({ open, onOpenChange, eventId, eventTitle }: PromoteEventDialogProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const eventUrl = `${window.location.origin}/events/${eventId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  };

  const handleJoinWaitlist = async () => {
    if (!email || !user) return;
    setSaving(true);
    await supabase.from("upgrade_waitlist" as any).insert({
      user_id: user.id,
      event_id: eventId,
      desired_tier: "featured_event",
      email,
    } as any);
    setSaving(false);
    setWaitlistSubmitted(true);
    toast.success("You've been added to the waitlist");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">PROMOTE {eventTitle.toUpperCase()}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="share" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="share" className="flex-1"><Share2 className="h-3.5 w-3.5 mr-1" /> Share</TabsTrigger>
            <TabsTrigger value="embed" className="flex-1"><Code className="h-3.5 w-3.5 mr-1" /> Embed</TabsTrigger>
            <TabsTrigger value="feature" className="flex-1"><Star className="h-3.5 w-3.5 mr-1" /> Feature</TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="space-y-3">
            <p className="text-sm text-muted-foreground">Share the public event link</p>
            <div className="flex gap-2">
              <Input value={eventUrl} readOnly className="text-xs" />
              <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="embed" className="space-y-3">
            <p className="text-sm text-muted-foreground">Embed this event on your website</p>
            <pre className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground overflow-x-auto">
{`<!-- Event widget — coming soon -->
<iframe src="${eventUrl}/embed"
  width="100%" height="400"
  frameborder="0">
</iframe>`}
            </pre>
          </TabsContent>

          <TabsContent value="feature" className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <h3 className="font-heading text-lg text-foreground mb-1">FEATURE THIS EVENT</h3>
              <p className="text-sm text-muted-foreground mb-2">from £49 per event</p>
              <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                <li>• Top placement in events directory</li>
                <li>• Gold Featured badge</li>
                <li>• Priority in search results</li>
              </ul>
              {waitlistSubmitted ? (
                <p className="text-sm text-primary font-medium">✓ You're on the waitlist — we'll be in touch!</p>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
                  <Button onClick={handleJoinWaitlist} disabled={saving || !email} className="w-full">
                    {saving ? "Joining..." : "Join Waitlist"}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
