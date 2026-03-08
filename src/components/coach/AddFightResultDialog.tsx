import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AddFightResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fighter: { id: string; name: string };
  coachId: string;
  onSuccess: () => void;
}

export function AddFightResultDialog({ open, onOpenChange, fighter, coachId, onSuccess }: AddFightResultDialogProps) {
  const [opponentName, setOpponentName] = useState("");
  const [opponentGym, setOpponentGym] = useState("");
  const [result, setResult] = useState<"win" | "loss" | "draw">("win");
  const [method, setMethod] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Create a placeholder fighter_b entry or use a self-referencing approach
    // For coach-verified fights, we store opponent info in text fields
    const { error } = await supabase.from("fights").insert({
      fighter_a_id: fighter.id,
      fighter_b_id: fighter.id, // self-ref placeholder since opponent may not be on platform
      opponent_name: opponentName,
      opponent_gym: opponentGym || null,
      result,
      method: method || null,
      event_name: eventName || null,
      event_date: eventDate || null,
      created_by_coach_id: coachId,
      verification_status: "coach_verified",
    } as any);

    if (error) {
      toast({ title: "Failed to add fight", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Fight record added", description: `${result} vs ${opponentName} recorded for ${fighter.name}.` });
    setOpponentName("");
    setOpponentGym("");
    setResult("win");
    setMethod("");
    setEventName("");
    setEventDate("");
    setLoading(false);
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            ADD FIGHT <span className="text-primary">RESULT</span>
          </DialogTitle>
          <DialogDescription>
            Record a past fight for {fighter.name}. This will be marked as coach verified.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Opponent Name *</Label>
            <Input value={opponentName} onChange={(e) => setOpponentName(e.target.value)} required placeholder="Opponent's name" />
          </div>
          <div className="space-y-1">
            <Label>Opponent Gym <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input value={opponentGym} onChange={(e) => setOpponentGym(e.target.value)} placeholder="Opponent's gym" />
          </div>
          <div className="space-y-1">
            <Label>Result *</Label>
            <Select value={result} onValueChange={(v) => setResult(v as "win" | "loss" | "draw")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="win">Win</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
                <SelectItem value="draw">Draw</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Decision">Decision</SelectItem>
                <SelectItem value="KO">KO</SelectItem>
                <SelectItem value="TKO">TKO</SelectItem>
                <SelectItem value="Submission">Submission</SelectItem>
                <SelectItem value="DQ">DQ</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Event Name</Label>
              <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Event name" />
            </div>
            <div className="space-y-1">
              <Label>Event Date</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add Fight Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
