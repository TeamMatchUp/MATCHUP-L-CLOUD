import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import { formatEnum } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type WeightClass = Database["public"]["Enums"]["weight_class"];
const WEIGHT_CLASSES = Constants.public.Enums.weight_class;

interface AddOpenSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  sectionType: "Main Event" | "Undercard";
  nextSlotNumber: number;
  onSuccess: () => void;
}

export function AddOpenSlotDialog({ open, onOpenChange, eventId, sectionType, nextSlotNumber, onSuccess }: AddOpenSlotDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [weightClass, setWeightClass] = useState<WeightClass>("lightweight");
  const [discipline, setDiscipline] = useState("");

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.from("event_fight_slots").insert({
      event_id: eventId,
      slot_number: nextSlotNumber,
      fighter_a_id: null,
      fighter_b_id: null,
      weight_class: weightClass,
      discipline: discipline || null,
      bout_type: sectionType,
      status: "open",
      is_public: true,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Error adding open slot", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Open slot added" });
      setWeightClass("lightweight");
      setDiscipline("");
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            Add Open Slot — <span className="text-primary">{sectionType}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
            <Label className="text-xs">Discipline (optional)</Label>
            <Select value={discipline || "none"} onValueChange={(v) => setDiscipline(v === "none" ? "" : v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any</SelectItem>
                {Constants.public.Enums.fighting_style.map((s) => (
                  <SelectItem key={s} value={s}>{formatEnum(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Adding..." : "Add Open Slot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
