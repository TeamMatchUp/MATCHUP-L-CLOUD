import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEnum } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId: string;
  eventId: string;
  eventTitle: string;
}

export function PutForwardFightersDialog({ open, onOpenChange, coachId, eventId, eventTitle }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sending, setSending] = useState(false);

  // Fetch coach's fighter roster via gyms
  const { data: fighters = [], isLoading } = useQuery({
    queryKey: ["coach-roster-for-event", coachId, eventId],
    queryFn: async () => {
      // Get gyms owned by coach
      const { data: gyms } = await supabase
        .from("gyms")
        .select("id")
        .eq("coach_id", coachId);
      if (!gyms || gyms.length === 0) return [];

      const gymIds = gyms.map((g) => g.id);

      // Get fighters linked to those gyms
      const { data: links } = await supabase
        .from("fighter_gym_links")
        .select("fighter_id, fighter_profiles(id, name, weight_class, record_wins, record_losses, record_draws, country, user_id)")
        .in("gym_id", gymIds)
        .eq("status", "accepted");

      if (!links) return [];

      // Get already-nominated fighter IDs for this event
      const { data: existing } = await supabase
        .from("coach_event_nominations")
        .select("fighter_id")
        .eq("event_id", eventId);

      const nominatedIds = new Set((existing ?? []).map((e: any) => e.fighter_id));

      // Deduplicate fighters
      const map = new Map<string, any>();
      links.forEach((link: any) => {
        const fp = link.fighter_profiles;
        if (fp && !nominatedIds.has(fp.id)) {
          map.set(fp.id, fp);
        }
      });

      return Array.from(map.values());
    },
    enabled: open,
  });

  const toggleFighter = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSending(true);
    try {
      // Insert nominations
      const nominations = Array.from(selectedIds).map((fighterId) => ({
        coach_id: coachId,
        fighter_id: fighterId,
        event_id: eventId,
      }));

      const { error } = await supabase
        .from("coach_event_nominations")
        .insert(nominations);
      if (error) throw error;

      // Send notifications to fighters who have accounts
      const selectedFighters = fighters.filter((f: any) => selectedIds.has(f.id));
      for (const fighter of selectedFighters) {
        if (fighter.user_id) {
          await supabase.rpc("create_notification", {
            _user_id: fighter.user_id,
            _title: "You've been put forward for an event",
            _message: `Your coach has put you forward for "${eventTitle}".`,
            _type: "event_update" as any,
            _reference_id: eventId,
          });
        }
      }

      toast.success(`${selectedIds.size} fighter${selectedIds.size > 1 ? "s" : ""} put forward successfully!`);
      setSelectedIds(new Set());
      setShowConfirmation(false);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to put forward fighters. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setShowConfirmation(false);
    onOpenChange(false);
  };

  const selectedFighterNames = fighters
    .filter((f: any) => selectedIds.has(f.id))
    .map((f: any) => f.name);

  return (
    <>
      <Dialog open={open && !showConfirmation} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Put Forward Fighters</DialogTitle>
            <DialogDescription>
              Select fighters from your roster to put forward for this event. They will be notified.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : fighters.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No fighters available to put forward. They may already be nominated for this event.
            </p>
          ) : (
            <div className="space-y-2 py-2">
              {fighters.map((fighter: any) => (
                <label
                  key={fighter.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedIds.has(fighter.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Checkbox
                    checked={selectedIds.has(fighter.id)}
                    onCheckedChange={() => toggleFighter(fighter.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{fighter.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{fighter.record_wins}W-{fighter.record_losses}L-{fighter.record_draws}D</span>
                      <span>·</span>
                      <span>{formatEnum(fighter.weight_class)}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{fighter.country}</Badge>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button
              disabled={selectedIds.size === 0}
              onClick={() => setShowConfirmation(true)}
            >
              Put Forward ({selectedIds.size})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Nomination</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to put forward the following fighter{selectedIds.size > 1 ? "s" : ""} for this event?
              <span className="block mt-2 font-medium text-foreground">
                {selectedFighterNames.join(", ")}
              </span>
              <span className="block mt-2 text-muted-foreground">
                Each fighter will receive a notification about this nomination.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={sending}>
              {sending ? "Sending..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
