import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { formatEnum } from "@/lib/format";
import { SearchableCountrySelect } from "@/components/SearchableCountrySelect";

type WeightClass = Database["public"]["Enums"]["weight_class"];
type CountryCode = Database["public"]["Enums"]["country_code"];
type FightingStyle = Database["public"]["Enums"]["fighting_style"];

const WEIGHT_CLASSES = Constants.public.Enums.weight_class;
const STYLES = Constants.public.Enums.fighting_style;

const DISCIPLINES = ["Boxing", "Muay Thai", "MMA", "BJJ", "Kickboxing", "Wrestling", "Other"];
const STANCES = ["Orthodox", "Southpaw", "Switch"];
const FIGHTING_SUBSTYLES: Record<string, string[]> = {
  Boxing: ["Out-Boxer", "Pressure", "In-Fighter", "Counter-Puncher", "Brawler"],
  "Muay Thai": ["Teep", "Rhythm", "Aggressive", "Forward", "Clinch-Heavy", "Aggressive Striker", "All-Range"],
  MMA: ["Striker", "Wrestler", "BJJ-Submission", "Kickboxer-based", "Balanced"],
  Kickboxing: ["Out-Fighter", "Pressure", "Combo", "Counter", "Switch Kicker"],
};

interface AddFighterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId: string;
  gymId?: string;
  onSuccess: () => void;
}

export function AddFighterDialog({ open, onOpenChange, coachId, gymId, onSuccess }: AddFighterDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [weightClass, setWeightClass] = useState<WeightClass>("lightweight");
  const [country, setCountry] = useState<CountryCode>("UK");
  const [style, setStyle] = useState<FightingStyle | "">("");
  const [discipline, setDiscipline] = useState("");
  const [stance, setStance] = useState("");
  const [fightingSubstyle, setFightingSubstyle] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [walkAroundWeight, setWalkAroundWeight] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [reachCm, setReachCm] = useState("");
  const [wins, setWins] = useState("0");
  const [losses, setLosses] = useState("0");
  const [draws, setDraws] = useState("0");
  const [amateurWins, setAmateurWins] = useState("0");
  const [amateurLosses, setAmateurLosses] = useState("0");
  const [amateurDraws, setAmateurDraws] = useState("0");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const substyleOptions = FIGHTING_SUBSTYLES[discipline] ?? [];
  useEffect(() => { setFightingSubstyle(""); }, [discipline]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: fighter, error } = await supabase
      .from("fighter_profiles")
      .insert({
        name,
        email: email || null,
        weight_class: weightClass,
        country,
        style: style || null,
        discipline: discipline || null,
        stance: stance || null,
        fighting_substyle: fightingSubstyle || null,
        date_of_birth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : null,
        walk_around_weight_kg: walkAroundWeight ? parseFloat(walkAroundWeight) : null,
        height: heightCm ? parseInt(heightCm) : null,
        reach: reachCm ? parseInt(reachCm) : null,
        record_wins: parseInt(wins) || 0,
        record_losses: parseInt(losses) || 0,
        record_draws: parseInt(draws) || 0,
        amateur_wins: parseInt(amateurWins) || 0,
        amateur_losses: parseInt(amateurLosses) || 0,
        amateur_draws: parseInt(amateurDraws) || 0,
        created_by_coach_id: coachId,
        available: true,
      })
      .select("id")
      .single();

    if (error) {
      setLoading(false);
      toast({ title: "Failed to add fighter", description: error.message, variant: "destructive" });
      return;
    }

    if (gymId && fighter) {
      await supabase.from("fighter_gym_links").insert({
        fighter_id: fighter.id,
        gym_id: gymId,
        is_primary: true,
        status: "approved",
      });
    }

    setLoading(false);
    toast({ title: "Fighter added", description: `${name} has been added to your roster.` });
    setName(""); setEmail(""); setWins("0"); setLosses("0"); setDraws("0");
    setAmateurWins("0"); setAmateurLosses("0"); setAmateurDraws("0");
    setHeightCm(""); setReachCm(""); setWalkAroundWeight("");
    setDiscipline(""); setStance(""); setFightingSubstyle("");
    setDateOfBirth(undefined);
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            ADD <span className="text-primary">FIGHTER</span>
          </DialogTitle>
          <DialogDescription>
            Add a fighter to your roster. If they sign up with the same email, their account will auto-sync.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label htmlFor="fighter-name">Name</Label>
              <Input id="fighter-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Fighter name" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="fighter-email">Email <span className="text-xs text-muted-foreground">(for account sync)</span></Label>
              <Input id="fighter-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="fighter@email.com" />
            </div>

            <div className="space-y-1 col-span-2">
              <Label>Date of Birth</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateOfBirth && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateOfBirth ? format(dateOfBirth, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateOfBirth} onSelect={setDateOfBirth} disabled={(date) => date > new Date() || date < new Date("1940-01-01")} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label>Weight Class</Label>
              <Select value={weightClass} onValueChange={(v) => setWeightClass(v as WeightClass)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEIGHT_CLASSES.map((wc) => (
                    <SelectItem key={wc} value={wc}>{formatEnum(wc)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <SearchableCountrySelect value={country} onValueChange={(v) => setCountry(v as CountryCode)} />
            </div>

            <div className="space-y-1">
              <Label>Walk-around Weight (kg)</Label>
              <Input type="number" min="0" value={walkAroundWeight} onChange={(e) => setWalkAroundWeight(e.target.value)} placeholder="e.g. 75" />
            </div>
            <div className="space-y-1">
              <Label>Height (cm)</Label>
              <Input type="number" min="0" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="e.g. 178" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Reach (cm)</Label>
              <Input type="number" min="0" value={reachCm} onChange={(e) => setReachCm(e.target.value)} placeholder="e.g. 183" />
            </div>

            <div className="space-y-1 col-span-2">
              <Label>Discipline</Label>
              <Select value={discipline} onValueChange={setDiscipline}>
                <SelectTrigger><SelectValue placeholder="Select discipline" /></SelectTrigger>
                <SelectContent>
                  {DISCIPLINES.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Style (DB enum)</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as FightingStyle)}>
                <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s} value={s}>{formatEnum(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Stance</Label>
              <Select value={stance} onValueChange={setStance}>
                <SelectTrigger><SelectValue placeholder="Select stance" /></SelectTrigger>
                <SelectContent>
                  {STANCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {substyleOptions.length > 0 && (
              <div className="space-y-1 col-span-2">
                <Label>Fighting Sub-style</Label>
                <Select value={fightingSubstyle} onValueChange={setFightingSubstyle}>
                  <SelectTrigger><SelectValue placeholder="Select sub-style" /></SelectTrigger>
                  <SelectContent>
                    {substyleOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Pro Record</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Wins</Label>
                <Input type="number" min="0" value={wins} onChange={(e) => setWins(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Losses</Label>
                <Input type="number" min="0" value={losses} onChange={(e) => setLosses(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Draws</Label>
                <Input type="number" min="0" value={draws} onChange={(e) => setDraws(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Amateur Record</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Wins</Label>
                <Input type="number" min="0" value={amateurWins} onChange={(e) => setAmateurWins(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Losses</Label>
                <Input type="number" min="0" value={amateurLosses} onChange={(e) => setAmateurLosses(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Draws</Label>
                <Input type="number" min="0" value={amateurDraws} onChange={(e) => setAmateurDraws(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Fighter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
