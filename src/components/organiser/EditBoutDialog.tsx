import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";
import { formatEnum } from "@/lib/format";
import { FighterSearchDropdown } from "./FighterSearchDropdown";
import { useAuth } from "@/contexts/AuthContext";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];

async function notifyFighterRemoval(
  removedFighter: FighterProfile | null,
  otherFighter: FighterProfile | null,
  eventId: string,
  slotId: string,
  weightClass: string | null
) {
  if (!removedFighter) return;
  const { data: evt } = await supabase.from("events").select("title").eq("id", eventId).single();
  const eventTitle = evt?.title ?? "an event";
  const wcLabel = weightClass ? formatEnum(weightClass) : "N/A";

  const notifyIds = new Set<string>();
  if (removedFighter.user_id) notifyIds.add(removedFighter.user_id);
  if (otherFighter?.user_id) notifyIds.add(otherFighter.user_id);
  if (removedFighter.created_by_coach_id) notifyIds.add(removedFighter.created_by_coach_id);
  if (otherFighter?.created_by_coach_id) notifyIds.add(otherFighter.created_by_coach_id);

  const fighterIds = [removedFighter.id];
  if (otherFighter) fighterIds.push(otherFighter.id);
  const { data: gymLinks } = await supabase
    .from("fighter_gym_links")
    .select("fighter_id, gym:gyms(coach_id)")
    .in("fighter_id", fighterIds)
    .eq("status", "approved");

  (gymLinks ?? []).forEach((link: any) => {
    const gym = Array.isArray(link.gym) ? link.gym[0] : link.gym;
    if (gym?.coach_id) notifyIds.add(gym.coach_id);
  });

  const promises = Array.from(notifyIds).map((uid) =>
    supabase.rpc("create_notification", {
      _user_id: uid,
      _title: "Fighter Removed from Bout",
      _message: `${removedFighter.name} has been removed from a ${wcLabel} bout at ${eventTitle}.`,
      _type: "match_declined" as any,
      _reference_id: slotId,
    })
  );
  await Promise.all(promises);
}

export function EditBoutDialog({ open, onOpenChange, bout, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bout: any;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [boutType, setBoutType] = useState(bout.bout_type || "Undercard");
  const [isPublic, setIsPublic] = useState(bout.is_public !== false);
  const fAInitial = Array.isArray(bout.fighter_a) ? bout.fighter_a[0] : bout.fighter_a;
  const fBInitial = Array.isArray(bout.fighter_b) ? bout.fighter_b[0] : bout.fighter_b;
  const [fighterA, setFighterA] = useState<FighterProfile | null>(fAInitial || null);
  const [fighterB, setFighterB] = useState<FighterProfile | null>(fBInitial || null);

  const handleSave = async () => {
    setLoading(true);
    const wc = fighterA?.weight_class || fighterB?.weight_class || bout.weight_class;

    const originalA = fAInitial;
    const originalB = fBInitial;
    const removedA = originalA && (!fighterA || fighterA.id !== originalA.id);
    const removedB = originalB && (!fighterB || fighterB.id !== originalB.id);

    const { error } = await supabase.from("event_fight_slots").update({
      fighter_a_id: fighterA?.id || null,
      fighter_b_id: fighterB?.id || null,
      bout_type: boutType,
      is_public: isPublic,
      weight_class: wc,
    }).eq("id", bout.id);
    if (error) {
      toast({ title: "Error updating bout", description: error.message, variant: "destructive" });
    } else {
      if (removedA) {
        await notifyFighterRemoval(originalA, originalB, bout.event_id, bout.id, bout.weight_class);
      }
      if (removedB) {
        await notifyFighterRemoval(originalB, originalA, bout.event_id, bout.id, bout.weight_class);
      }

      if (!removedA && !removedB) {
        const notifyIds = new Set<string>();
        if (fighterA?.user_id) notifyIds.add(fighterA.user_id);
        if (fighterB?.user_id) notifyIds.add(fighterB.user_id);
        if (fighterA?.created_by_coach_id) notifyIds.add(fighterA.created_by_coach_id);
        if (fighterB?.created_by_coach_id) notifyIds.add(fighterB.created_by_coach_id);
        for (const uid of notifyIds) {
          await supabase.rpc("create_notification", {
            _user_id: uid,
            _title: "Bout updated",
            _message: `A bout has been updated: ${fighterA?.name || "TBA"} vs ${fighterB?.name || "TBA"}.`,
            _type: "event_update",
            _reference_id: bout.event_id,
          });
        }
      }
      toast({ title: "Bout updated" });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    if (fAInitial || fBInitial) {
      if (fAInitial) await notifyFighterRemoval(fAInitial, fBInitial, bout.event_id, bout.id, bout.weight_class);
      if (fBInitial) await notifyFighterRemoval(fBInitial, fAInitial, bout.event_id, bout.id, bout.weight_class);
    }
    const { error } = await supabase.from("event_fight_slots").delete().eq("id", bout.id);
    if (error) {
      toast({ title: "Error deleting bout", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Bout removed" });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Bout</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FighterSearchDropdown
            label="Fighter A"
            selected={fighterA}
            onSelect={setFighterA}
            onClear={() => setFighterA(null)}
            excludeId={fighterB?.id}
            eventId={bout.event_id}
          />
          <FighterSearchDropdown
            label="Fighter B"
            selected={fighterB}
            onSelect={setFighterB}
            onClear={() => setFighterB(null)}
            excludeId={fighterA?.id}
            eventId={bout.event_id}
          />

          <div className="space-y-1">
            <Label className="text-xs">Card Position</Label>
            <Select value={boutType} onValueChange={setBoutType}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Main Event">Main Event</SelectItem>
                <SelectItem value="Undercard">Undercard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Public (visible to spectators)</Label>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1"><Trash2 className="h-3 w-3" /> Remove</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove this bout?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently remove this bout from the fight card.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {loading ? "Removing..." : "Remove"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
