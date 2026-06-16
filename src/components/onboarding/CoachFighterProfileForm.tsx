import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import type { Database } from "@/integrations/supabase/types";

type WeightClass = Database["public"]["Enums"]["weight_class"];

const WEIGHT_CLASSES: { value: WeightClass; label: string }[] = [
  { value: "strawweight", label: "Strawweight" },
  { value: "flyweight", label: "Flyweight" },
  { value: "bantamweight", label: "Bantamweight" },
  { value: "featherweight", label: "Featherweight" },
  { value: "lightweight", label: "Lightweight" },
  { value: "super_lightweight", label: "Super Lightweight" },
  { value: "welterweight", label: "Welterweight" },
  { value: "super_welterweight", label: "Super Welterweight" },
  { value: "middleweight", label: "Middleweight" },
  { value: "super_middleweight", label: "Super Middleweight" },
  { value: "light_heavyweight", label: "Light Heavyweight" },
  { value: "cruiserweight", label: "Cruiserweight" },
  { value: "heavyweight", label: "Heavyweight" },
  { value: "super_heavyweight", label: "Super Heavyweight" },
];

const DISCIPLINES = ["Boxing", "Muay Thai", "MMA", "BJJ", "Kickboxing", "Wrestling", "Other"];
const STANCES = ["Orthodox", "Southpaw", "Switch"];

const FIGHTING_SUBSTYLES: Record<string, string[]> = {
  Boxing: ["Out-Boxer", "Pressure", "In-Fighter", "Counter-Puncher", "Brawler"],
  "Muay Thai": ["Teep", "Rhythm", "Aggressive", "Forward", "Clinch-Heavy", "Aggressive Striker", "All-Range"],
  MMA: ["Striker", "Wrestler", "BJJ-Submission", "Kickboxer-based", "Balanced"],
  Kickboxing: ["Out-Fighter", "Pressure", "Combo", "Counter", "Switch Kicker"],
};

interface Props {
  userId: string;
  displayName: string;
  onSaved: () => void;
  onCancel?: () => void;
}

export function CoachFighterProfileForm({ userId, displayName, onSaved, onCancel }: Props) {
  const { toast } = useToast();
  const [weightClass, setWeightClass] = useState<WeightClass | "">("");
  const [discipline, setDiscipline] = useState("");
  const [stance, setStance] = useState("");
  const [fightingSubstyle, setFightingSubstyle] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [walkAroundWeight, setWalkAroundWeight] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [reachCm, setReachCm] = useState("");
  const [amateurWins, setAmateurWins] = useState("0");
  const [amateurLosses, setAmateurLosses] = useState("0");
  const [amateurDraws, setAmateurDraws] = useState("0");
  const [proWins, setProWins] = useState("0");
  const [proLosses, setProLosses] = useState("0");
  const [proDraws, setProDraws] = useState("0");
  const [loading, setLoading] = useState(false);

  const substyleOptions = FIGHTING_SUBSTYLES[discipline] ?? [];
  useEffect(() => { setFightingSubstyle(""); }, [discipline]);

  const handleSubmit = async () => {
    if (!weightClass || !discipline) {
      toast({ title: "Please fill in weight class and discipline", variant: "destructive" });
      return;
    }
    setLoading(true);

    const styleValue = discipline === "Wrestling" || discipline === "Other" || discipline === "BJJ"
      ? null
      : (discipline.toLowerCase().replace(/ /g, "_") as Database["public"]["Enums"]["fighting_style"]);

    const { data: existing } = await supabase.from("fighter_profiles").select("id").eq("user_id", userId).maybeSingle();

    const profileData = {
      weight_class: weightClass as WeightClass,
      style: styleValue,
      stance: stance || null,
      fighting_substyle: fightingSubstyle || null,
      discipline,
      date_of_birth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : null,
      walk_around_weight_kg: walkAroundWeight ? parseFloat(walkAroundWeight) : null,
      height: heightCm ? parseInt(heightCm) : null,
      reach: reachCm ? parseInt(reachCm) : null,
      amateur_wins: parseInt(amateurWins) || 0,
      amateur_losses: parseInt(amateurLosses) || 0,
      amateur_draws: parseInt(amateurDraws) || 0,
      record_wins: parseInt(proWins) || 0,
      record_losses: parseInt(proLosses) || 0,
      record_draws: parseInt(proDraws) || 0,
      created_by_coach_id: userId,
    };

    if (!existing) {
      const { error } = await supabase.from("fighter_profiles").insert({
        user_id: userId,
        name: displayName || "Coach",
        ...profileData,
      });
      if (error) {
        toast({ title: "Failed to create fighter profile", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
    } else {
      await supabase.from("fighter_profiles").update(profileData).eq("id", existing.id);
    }

    setLoading(false);
    toast({ title: "Fighter profile saved" });
    onSaved();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 col-span-2">
          <Label>Date of Birth</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateOfBirth && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateOfBirth ? format(dateOfBirth, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="bottom">
              <Calendar mode="single" selected={dateOfBirth} onSelect={setDateOfBirth} />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Weight Class *</Label>
          <Select value={weightClass} onValueChange={(v) => setWeightClass(v as WeightClass)}>
            <SelectTrigger><SelectValue placeholder="Select weight class" /></SelectTrigger>
            <SelectContent position="popper" side="bottom">
              {WEIGHT_CLASSES.map((wc) => (<SelectItem key={wc.value} value={wc.value}>{wc.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Walk-around Weight (kg)</Label>
          <Input type="number" min="0" value={walkAroundWeight} onChange={(e) => setWalkAroundWeight(e.target.value)} placeholder="e.g. 75" />
        </div>
        <div className="space-y-2">
          <Label>Height (cm)</Label>
          <Input type="number" min="0" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="e.g. 178" />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Reach (cm)</Label>
          <Input type="number" min="0" value={reachCm} onChange={(e) => setReachCm(e.target.value)} placeholder="e.g. 183" />
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Discipline *</Label>
          <Select value={discipline} onValueChange={setDiscipline}>
            <SelectTrigger><SelectValue placeholder="Select discipline" /></SelectTrigger>
            <SelectContent position="popper" side="bottom">
              {DISCIPLINES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Stance</Label>
          <Select value={stance} onValueChange={setStance}>
            <SelectTrigger><SelectValue placeholder="Select stance" /></SelectTrigger>
            <SelectContent position="popper" side="bottom">
              {STANCES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {substyleOptions.length > 0 && (
          <div className="space-y-2 col-span-2">
            <Label>Fighting Style</Label>
            <Select value={fightingSubstyle} onValueChange={setFightingSubstyle}>
              <SelectTrigger><SelectValue placeholder="Select fighting style" /></SelectTrigger>
              <SelectContent position="popper" side="bottom">
                {substyleOptions.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-3 mt-3">
        <Label className="text-sm font-medium">Amateur Record</Label>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Wins</Label><Input type="number" min="0" value={amateurWins} onChange={(e) => setAmateurWins(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Losses</Label><Input type="number" min="0" value={amateurLosses} onChange={(e) => setAmateurLosses(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Draws</Label><Input type="number" min="0" value={amateurDraws} onChange={(e) => setAmateurDraws(e.target.value)} /></div>
        </div>
      </div>

      <div className="space-y-3 mt-3">
        <Label className="text-sm font-medium">Pro Record</Label>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Wins</Label><Input type="number" min="0" value={proWins} onChange={(e) => setProWins(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Losses</Label><Input type="number" min="0" value={proLosses} onChange={(e) => setProLosses(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Draws</Label><Input type="number" min="0" value={proDraws} onChange={(e) => setProDraws(e.target.value)} /></div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        )}
        <Button variant="hero" onClick={handleSubmit} disabled={loading}>
          {loading ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>) : "Save fighter profile"}
        </Button>
      </div>
    </div>
  );
}
