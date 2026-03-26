import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";
import { formatEnum } from "@/lib/format";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];

interface EditBoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bout: any;
  onSuccess: () => void;
}

async function notifyFighterRemoval(
  removedFighter: FighterProfile | null,
  otherFighter: FighterProfile | null,
  eventId: string,
  slotId: string,
  weightClass: string | null
) {
  if (!removedFighter) return;
  // Get event name
  const { data: evt } = await supabase.from("events").select("title").eq("id", eventId).single();
  const eventTitle = evt?.title ?? "an event";
  const wcLabel = weightClass ? formatEnum(weightClass) : "N/A";

  // Collect all party user IDs: both fighters + their coaches
  const notifyIds = new Set<string>();
  if (removedFighter.user_id) notifyIds.add(removedFighter.user_id);
  if (otherFighter?.user_id) notifyIds.add(otherFighter.user_id);
  if (removedFighter.created_by_coach_id) notifyIds.add(removedFighter.created_by_coach_id);
  if (otherFighter?.created_by_coach_id) notifyIds.add(otherFighter.created_by_coach_id);

  // Also find coaches via gym links
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

export function EditBoutDialog({ open, onOpenChange, bout, onSuccess }: EditBoutDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [boutType, setBoutType] = useState(bout.bout_type || "Undercard");
  const [isPublic, setIsPublic] = useState(bout.is_public !== false);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const fAInitial = Array.isArray(bout.fighter_a) ? bout.fighter_a[0] : bout.fighter_a;
  const fBInitial = Array.isArray(bout.fighter_b) ? bout.fighter_b[0] : bout.fighter_b;
  const [fighterA, setFighterA] = useState<FighterProfile | null>(fAInitial || null);
  const [fighterB, setFighterB] = useState<FighterProfile | null>(fBInitial || null);

  const { data: resultsA = [] } = useQuery({
    queryKey: ["edit-bout-search-a", searchA],
    queryFn: async () => {
      if (!searchA.trim()) return [];
      const { data } = await supabase.from("fighter_profiles").select("*").ilike("name", `%${searchA.trim()}%`).limit(10);
      return data ?? [];
    },
    enabled: searchA.trim().length > 1,
  });

  const { data: resultsB = [] } = useQuery({
    queryKey: ["edit-bout-search-b", searchB],
    queryFn: async () => {
      if (!searchB.trim()) return [];
      const { data } = await supabase.from("fighter_profiles").select("*").ilike("name", `%${searchB.trim()}%`).limit(10);
      return data ?? [];
    },
    enabled: searchB.trim().length > 1,
  });

  const handleSave = async () => {
    setLoading(true);
    const wc = fighterA?.weight_class || fighterB?.weight_class || bout.weight_class;

    // Check if a fighter was removed
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
      // Send removal notifications
      if (removedA) {
        await notifyFighterRemoval(originalA, originalB, bout.event_id, bout.id, bout.weight_class);
      }
      if (removedB) {
        await notifyFighterRemoval(originalB, originalA, bout.event_id, bout.id, bout.weight_class);
      }

      // Notify affected fighters/coaches of update
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
    // Send removal notifications for both fighters before deleting
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

  const renderFighterPicker = (label: string, fighter: FighterProfile | null, setFighter: (f: FighterProfile | null) => void, search: string, setSearch: (s: string) => void, results: FighterProfile[]) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {fighter ? (
        <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 p-2">
          <div>
            <p className="text-sm font-medium text-foreground">{fighter.name}</p>
            <p className="text-xs text-muted-foreground">{formatEnum(fighter.weight_class)}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setFighter(null); setSearch(""); }}>Change</Button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>
          {results.length > 0 && (
            <div className="border border-border rounded-md mt-1 max-h-32 overflow-y-auto">
              {results.map((f) => (
                <button key={f.id} onClick={() => { setFighter(f); setSearch(""); }} className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm">
                  <span className="text-foreground">{f.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{formatEnum(f.weight_class)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Bout</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {renderFighterPicker("Fighter A", fighterA, setFighterA, searchA, setSearchA, resultsA)}
          {renderFighterPicker("Fighter B", fighterB, setFighterB, searchB, setSearchB, resultsB)}

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
