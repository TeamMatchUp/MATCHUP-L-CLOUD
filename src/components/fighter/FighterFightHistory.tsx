import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trophy, Target, Award, Flame, Shield, Star } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface FighterFightHistoryProps {
  fighterId: string;
  fighterUserId?: string;
  isOwner?: boolean;
}

const METHODS = ["KO", "TKO", "Decision", "Submission", "DQ", "NC"];
const RESULTS = ["win", "loss", "draw"];

export function FighterFightHistory({ fighterId, fighterUserId, isOwner = false }: FighterFightHistoryProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [opponentName, setOpponentName] = useState("");
  const [opponentGym, setOpponentGym] = useState("");
  const [result, setResult] = useState("win");
  const [method, setMethod] = useState("Decision");
  const [round, setRound] = useState("");
  const [totalRounds, setTotalRounds] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventName, setEventName] = useState("");
  const [isAmateur, setIsAmateur] = useState(false);

  const { data: fights = [] } = useQuery({
    queryKey: ["fighter-fights", fighterId],
    queryFn: async () => {
      const { data: asA } = await supabase
        .from("fights")
        .select("*")
        .eq("fighter_a_id", fighterId);
      const { data: asB } = await supabase
        .from("fights")
        .select("*")
        .eq("fighter_b_id", fighterId);
      const map = new Map<string, any>();
      [...(asA || []), ...(asB || [])].forEach((f) => map.set(f.id, f));
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.event_date || b.created_at).getTime() - new Date(a.event_date || a.created_at).getTime()
      );
    },
    enabled: !!fighterId,
  });

  // Career stats
  const stats = useMemo(() => {
    const total = fights.length;
    const wins = fights.filter((f: any) =>
      (f.result === "win" && f.fighter_a_id === fighterId) ||
      (f.result === "loss" && f.fighter_b_id === fighterId) ||
      (f.winner_id === fighterId)
    ).length;
    const losses = fights.filter((f: any) =>
      (f.result === "loss" && f.fighter_a_id === fighterId) ||
      (f.result === "win" && f.fighter_b_id === fighterId) ||
      (f.winner_id && f.winner_id !== fighterId && f.result !== "draw")
    ).length;
    const draws = fights.filter((f: any) => f.result === "draw").length;
    const finishes = fights.filter((f: any) =>
      ((f.result === "win" && f.fighter_a_id === fighterId) || f.winner_id === fighterId) &&
      ["KO", "TKO", "Submission"].includes(f.method || "")
    ).length;
    const winPct = total > 0 ? Math.round((wins / total) * 100) : 0;
    const finishRate = wins > 0 ? Math.round((finishes / wins) * 100) : 0;

    return { total, wins, losses, draws, winPct, finishRate, finishes };
  }, [fights, fighterId]);

  // Milestone badges
  const milestones = useMemo(() => {
    const badges: { label: string; icon: any; earned: boolean }[] = [
      { label: "First Win", icon: Trophy, earned: stats.wins >= 1 },
      { label: "5-Fight Veteran", icon: Shield, earned: stats.total >= 5 },
      { label: "10-Fight Veteran", icon: Star, earned: stats.total >= 10 },
      { label: "Undefeated", icon: Award, earned: stats.losses === 0 && stats.total >= 3 },
      { label: "Finisher", icon: Flame, earned: stats.finishRate > 70 && stats.wins >= 3 },
    ];
    return badges;
  }, [stats]);

  const handleAddResult = async () => {
    if (!opponentName.trim()) {
      toast.error("Opponent name is required");
      return;
    }
    setSaving(true);

    const { error } = await supabase.from("fights").insert({
      fighter_a_id: fighterId,
      fighter_b_id: fighterId, // self-reported: both point to self
      opponent_name: opponentName,
      opponent_gym: opponentGym || null,
      result,
      method,
      round: round ? parseInt(round) : null,
      total_rounds: totalRounds ? parseInt(totalRounds) : null,
      event_date: eventDate || null,
      event_name: eventName || null,
      is_amateur: isAmateur,
      verification_status: "self_reported" as any,
      winner_id: result === "win" ? fighterId : null,
    });

    setSaving(false);
    if (error) {
      toast.error("Failed to add result");
      return;
    }
    toast.success("Fight result added");
    setOpen(false);
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["fighter-fights", fighterId] });
  };

  const resetForm = () => {
    setOpponentName("");
    setOpponentGym("");
    setResult("win");
    setMethod("Decision");
    setRound("");
    setTotalRounds("");
    setEventDate("");
    setEventName("");
    setIsAmateur(false);
  };

  const getResultForFighter = (fight: any) => {
    if (fight.result === "draw") return "D";
    if (fight.winner_id === fighterId) return "W";
    if (fight.result === "win" && fight.fighter_a_id === fighterId) return "W";
    if (fight.result === "loss" && fight.fighter_a_id === fighterId) return "L";
    if (fight.result === "win" && fight.fighter_b_id === fighterId) return "L";
    if (fight.result === "loss" && fight.fighter_b_id === fighterId) return "W";
    return "—";
  };

  return (
    <div className="space-y-6">
      {/* Career Stats */}
      <div>
        <h3 className="font-heading text-xl text-foreground mb-3">
          CAREER <span className="text-primary">STATS</span>
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Total", value: stats.total },
            { label: "Wins", value: stats.wins },
            { label: "Losses", value: stats.losses },
            { label: "Draws", value: stats.draws },
            { label: "Win %", value: `${stats.winPct}%` },
            { label: "Finish Rate", value: `${stats.finishRate}%` },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-heading text-xl text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="flex flex-wrap gap-2">
        {milestones.filter((m) => m.earned).map((m) => (
          <Badge key={m.label} className="bg-primary/10 text-primary border-primary/30 gap-1.5 py-1 px-3">
            <m.icon className="h-3.5 w-3.5" />
            {m.label}
          </Badge>
        ))}
      </div>

      {/* Fight History Table */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xl text-foreground">
          FIGHT <span className="text-primary">HISTORY</span>
        </h3>
        {isOwner && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Result
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading">ADD FIGHT RESULT</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Opponent Name *</Label>
                  <Input value={opponentName} onChange={(e) => setOpponentName(e.target.value)} />
                </div>
                <div>
                  <Label>Opponent Gym</Label>
                  <Input value={opponentGym} onChange={(e) => setOpponentGym(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Result</Label>
                    <Select value={result} onValueChange={setResult}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RESULTS.map((r) => (
                          <SelectItem key={r} value={r}>{r === "win" ? "Win" : r === "loss" ? "Loss" : "Draw"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Method</Label>
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {METHODS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Round</Label>
                    <Input type="number" value={round} onChange={(e) => setRound(e.target.value)} />
                  </div>
                  <div>
                    <Label>Total Rounds</Label>
                    <Input type="number" value={totalRounds} onChange={(e) => setTotalRounds(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>
                <div>
                  <Label>Event Name</Label>
                  <Input value={eventName} onChange={(e) => setEventName(e.target.value)} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={isAmateur} onCheckedChange={setIsAmateur} />
                  <Label className="text-sm">{isAmateur ? "Amateur" : "Professional"}</Label>
                </div>
                <Button onClick={handleAddResult} disabled={saving} className="w-full">
                  {saving ? "Saving..." : "Add Result"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {fights.length === 0 ? (
        <p className="text-muted-foreground text-sm">No fight history recorded yet.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opponent</TableHead>
                <TableHead className="hidden md:table-cell">Gym</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="hidden md:table-cell">Rd</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden lg:table-cell">Event</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fights.map((fight: any) => {
                const res = getResultForFighter(fight);
                const verLabel =
                  fight.verification_status === "self_reported"
                    ? "Self-reported"
                    : fight.verification_status === "coach_verified"
                    ? "Coach-verified"
                    : "Event Verified";
                return (
                  <TableRow key={fight.id}>
                    <TableCell className="font-medium">
                      {fight.opponent_name || "Unknown"}
                      {fight.is_amateur && (
                        <Badge variant="outline" className="ml-2 text-[10px]">AM</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {fight.opponent_gym || "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-heading text-sm ${
                          res === "W" ? "text-success" : res === "L" ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {res}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{fight.method || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {fight.round ? `R${fight.round}${fight.total_rounds ? `/${fight.total_rounds}` : ""}` : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {fight.event_date ? format(new Date(fight.event_date), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground truncate max-w-[150px]">
                      {fight.event_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          fight.verification_status === "self_reported"
                            ? "border-muted-foreground/30 text-muted-foreground"
                            : "border-success/30 text-success"
                        }`}
                      >
                        {verLabel}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
