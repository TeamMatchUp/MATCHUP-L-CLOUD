import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type WeightClass = Database["public"]["Enums"]["weight_class"];
type FightSlot = Database["public"]["Tables"]["fight_slots"]["Row"];

const WEIGHT_CLASSES = Constants.public.Enums.weight_class;
const EXPERIENCE_LEVELS = ["debut", "amateur", "semi-pro", "professional"] as const;
const CARD_POSITIONS = ["main_card", "undercard"] as const;

function formatEnum(val: string) {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface EditFightSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: FightSlot;
  onSuccess: () => void;
}

export function EditFightSlotDialog({ open, onOpenChange, slot, onSuccess }: EditFightSlotDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [weightClass, setWeightClass] = useState<WeightClass>(slot.weight_class);
  const [cardPosition, setCardPosition] = useState(slot.card_position || "undercard");
  const [experienceLevel, setExperienceLevel] = useState(slot.experience_level || "");
  const [minWeightKg, setMinWeightKg] = useState(slot.min_weight_kg?.toString() || "");
  const [maxWeightKg, setMaxWeightKg] = useState(slot.max_weight_kg?.toString() || "");
  const [minWins, setMinWins] = useState(slot.min_wins?.toString() || "");
  const [maxWins, setMaxWins] = useState(slot.max_wins?.toString() || "");

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("fight_slots")
      .update({
        weight_class: weightClass,
        card_position: cardPosition,
        experience_level: experienceLevel || null,
        min_weight_kg: minWeightKg ? parseFloat(minWeightKg) : null,
        max_weight_kg: maxWeightKg ? parseFloat(maxWeightKg) : null,
        min_wins: minWins ? parseInt(minWins) : null,
        max_wins: maxWins ? parseInt(maxWins) : null,
      })
      .eq("id", slot.id);

    setLoading(false);
    if (error) {
      toast({ title: "Error updating slot", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Fight slot updated" });
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Fight #{slot.slot_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Card Position</Label>
            <Select value={cardPosition} onValueChange={setCardPosition}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CARD_POSITIONS.map((cp) => (
                  <SelectItem key={cp} value={cp}>{formatEnum(cp)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Weight Class</Label>
            <Select value={weightClass} onValueChange={(v) => setWeightClass(v as WeightClass)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEIGHT_CLASSES.map((wc) => (
                  <SelectItem key={wc} value={wc}>{formatEnum(wc)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Experience Level</Label>
            <Select value={experienceLevel || "any"} onValueChange={(v) => setExperienceLevel(v === "any" ? "" : v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {EXPERIENCE_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{formatEnum(l)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Weight Range (kg)</Label>
            <div className="flex gap-2">
              <Input type="number" placeholder="Min" value={minWeightKg} onChange={(e) => setMinWeightKg(e.target.value)} className="h-9 text-sm" />
              <Input type="number" placeholder="Max" value={maxWeightKg} onChange={(e) => setMaxWeightKg(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Win Record Range</Label>
            <div className="flex gap-2">
              <Input type="number" placeholder="Min wins" value={minWins} onChange={(e) => setMinWins(e.target.value)} className="h-9 text-sm" />
              <Input type="number" placeholder="Max wins" value={maxWins} onChange={(e) => setMaxWins(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
