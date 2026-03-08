import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type WeightClass = Database["public"]["Enums"]["weight_class"];

const WEIGHT_CLASSES = Constants.public.Enums.weight_class;
const EXPERIENCE_LEVELS = ["debut", "amateur", "semi-pro", "professional"] as const;
const CARD_POSITIONS = ["main_card", "undercard"] as const;

import { formatEnum } from "@/lib/format";

interface AddFightSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  nextSlotNumber: number;
  onSuccess: () => void;
}

export function AddFightSlotDialog({ open, onOpenChange, eventId, nextSlotNumber, onSuccess }: AddFightSlotDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [weightClass, setWeightClass] = useState<WeightClass>("lightweight");
  const [cardPosition, setCardPosition] = useState("undercard");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [minWeightKg, setMinWeightKg] = useState("");
  const [maxWeightKg, setMaxWeightKg] = useState("");
  const [minWins, setMinWins] = useState("");
  const [maxWins, setMaxWins] = useState("");

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("fight_slots")
      .insert({
        event_id: eventId,
        slot_number: nextSlotNumber,
        weight_class: weightClass,
        card_position: cardPosition,
        experience_level: experienceLevel || null,
        min_weight_kg: minWeightKg ? parseFloat(minWeightKg) : null,
        max_weight_kg: maxWeightKg ? parseFloat(maxWeightKg) : null,
        min_wins: minWins ? parseInt(minWins) : null,
        max_wins: maxWins ? parseInt(maxWins) : null,
      });

    setLoading(false);
    if (error) {
      toast({ title: "Error adding fight slot", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Fight slot added" });
      // Reset form
      setWeightClass("lightweight");
      setCardPosition("undercard");
      setExperienceLevel("");
      setMinWeightKg("");
      setMaxWeightKg("");
      setMinWins("");
      setMaxWins("");
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Add Fight Slot #{nextSlotNumber}</DialogTitle>
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
            {loading ? "Adding..." : "Add Fight Slot"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
