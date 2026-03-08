import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type WeightClass = Database["public"]["Enums"]["weight_class"];
type CountryCode = Database["public"]["Enums"]["country_code"];
type FightingStyle = Database["public"]["Enums"]["fighting_style"];

const WEIGHT_CLASSES = Constants.public.Enums.weight_class;
const COUNTRIES = Constants.public.Enums.country_code;
const STYLES = Constants.public.Enums.fighting_style;

import { formatEnum } from "@/lib/format";

interface AddFighterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId: string;
  gymId?: string;
  onSuccess: () => void;
}

export function AddFighterDialog({
  open,
  onOpenChange,
  coachId,
  gymId,
  onSuccess,
}: AddFighterDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [weightClass, setWeightClass] = useState<WeightClass>("lightweight");
  const [country, setCountry] = useState<CountryCode>("UK");
  const [style, setStyle] = useState<FightingStyle | "">("");
  const [wins, setWins] = useState("0");
  const [losses, setLosses] = useState("0");
  const [draws, setDraws] = useState("0");
  const [height, setHeight] = useState("");
  const [reach, setReach] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
        record_wins: parseInt(wins) || 0,
        record_losses: parseInt(losses) || 0,
        record_draws: parseInt(draws) || 0,
        height: height || null,
        reach: reach || null,
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

    // Link to gym if provided
    if (gymId && fighter) {
      await supabase.from("fighter_gym_links").insert({
        fighter_id: fighter.id,
        gym_id: gymId,
        is_primary: true,
      });
    }

    setLoading(false);
    toast({ title: "Fighter added", description: `${name} has been added to your roster.` });
    // Reset form
    setName("");
    setEmail("");
    setWins("0");
    setLosses("0");
    setDraws("0");
    setHeight("");
    setReach("");
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
              <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Style</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as FightingStyle)}>
                <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s} value={s}>{formatEnum(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Wins</Label>
              <Input type="number" min="0" value={wins} onChange={(e) => setWins(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Losses</Label>
              <Input type="number" min="0" value={losses} onChange={(e) => setLosses(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Draws</Label>
              <Input type="number" min="0" value={draws} onChange={(e) => setDraws(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Height</Label>
              <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 5'10&quot;" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Reach</Label>
              <Input value={reach} onChange={(e) => setReach(e.target.value)} placeholder='e.g. 72"' />
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
