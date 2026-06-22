import { useState } from "react";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const METHODS = ["KO", "TKO", "Submission", "Decision", "No Contest"] as const;
const RESULTS = ["win", "loss", "draw"] as const;

const schema = z.object({
  opponent_name: z.string().trim().min(1, "Opponent name is required").max(120),
  opponent_gym: z.string().trim().max(120).optional().or(z.literal("")),
  event_name: z.string().trim().max(160).optional().or(z.literal("")),
  event_date: z.string().min(1, "Event date is required"),
  result: z.enum(RESULTS),
  method: z.enum(METHODS),
  round: z.string().optional(),
  total_rounds: z.string().optional(),
  is_amateur: z.boolean(),
});

interface Props {
  fighterId: string;
}

export function LogFightDialog({ fighterId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [opponentName, setOpponentName] = useState("");
  const [opponentGym, setOpponentGym] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [result, setResult] = useState<typeof RESULTS[number]>("win");
  const [method, setMethod] = useState<typeof METHODS[number]>("Decision");
  const [round, setRound] = useState("");
  const [totalRounds, setTotalRounds] = useState("");
  const [isAmateur, setIsAmateur] = useState(false);

  const reset = () => {
    setOpponentName(""); setOpponentGym(""); setEventName(""); setEventDate("");
    setResult("win"); setMethod("Decision"); setRound(""); setTotalRounds(""); setIsAmateur(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      opponent_name: opponentName,
      opponent_gym: opponentGym,
      event_name: eventName,
      event_date: eventDate,
      result,
      method,
      round,
      total_rounds: totalRounds,
      is_amateur: isAmateur,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const roundNum = round ? parseInt(round, 10) : null;
    const totalNum = totalRounds ? parseInt(totalRounds, 10) : null;
    if (round && (Number.isNaN(roundNum!) || roundNum! < 1 || roundNum! > 99)) {
      toast.error("Round must be a number between 1 and 99"); return;
    }
    if (totalRounds && (Number.isNaN(totalNum!) || totalNum! < 1 || totalNum! > 99)) {
      toast.error("Total rounds must be a number between 1 and 99"); return;
    }

    setSaving(true);
    const { error } = await supabase.from("fights").insert({
      fighter_a_id: fighterId,
      opponent_name: parsed.data.opponent_name,
      opponent_gym: parsed.data.opponent_gym || null,
      event_name: parsed.data.event_name || null,
      event_date: parsed.data.event_date,
      result: parsed.data.result,
      method: parsed.data.method,
      round: roundNum,
      total_rounds: totalNum,
      is_amateur: parsed.data.is_amateur,
      verification_status: "self_reported",
    });
    setSaving(false);

    if (error) {
      toast.error(error.message || "Failed to log fight");
      return;
    }
    toast.success("Fight logged successfully");
    qc.invalidateQueries({ queryKey: ["fighter-record-fights", fighterId] });
    qc.invalidateQueries({ queryKey: ["fighter-fights", fighterId] });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Log a Fight
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a Fight</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="opp">Opponent name *</Label>
            <Input id="opp" value={opponentName} onChange={(e) => setOpponentName(e.target.value)} maxLength={120} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oppgym">Opponent gym</Label>
            <Input id="oppgym" value={opponentGym} onChange={(e) => setOpponentGym(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="evt">Event name</Label>
            <Input id="evt" value={eventName} onChange={(e) => setEventName(e.target.value)} maxLength={160} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="evtdate">Event date *</Label>
            <Input id="evtdate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Result *</Label>
              <Select value={result} onValueChange={(v) => setResult(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="win">Win</SelectItem>
                  <SelectItem value="loss">Loss</SelectItem>
                  <SelectItem value="draw">Draw</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Method *</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rnd">Round</Label>
              <Input id="rnd" type="number" min={1} max={99} value={round} onChange={(e) => setRound(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trnd">Total rounds</Label>
              <Input id="trnd" type="number" min={1} max={99} value={totalRounds} onChange={(e) => setTotalRounds(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md p-3 bg-muted/30">
            <div>
              <Label htmlFor="amateur" className="cursor-pointer">Amateur fight</Label>
              <p className="text-xs text-muted-foreground">Toggle off if this was a pro bout</p>
            </div>
            <Switch id="amateur" checked={isAmateur} onCheckedChange={setIsAmateur} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Log Fight"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
