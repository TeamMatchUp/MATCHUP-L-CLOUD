import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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

interface FighterData {
  id: string;
  name: string;
  email: string | null;
  weight_class: WeightClass;
  country: CountryCode;
  style: FightingStyle | null;
  record_wins: number;
  record_losses: number;
  record_draws: number;
  height: string | null;
  reach: string | null;
  bio: string | null;
  available: boolean;
}

interface EditFighterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fighter: FighterData;
  onSuccess: () => void;
}

export function EditFighterDialog({ open, onOpenChange, fighter, onSuccess }: EditFighterDialogProps) {
  const [name, setName] = useState(fighter.name);
  const [email, setEmail] = useState(fighter.email ?? "");
  const [weightClass, setWeightClass] = useState<WeightClass>(fighter.weight_class);
  const [country, setCountry] = useState<CountryCode>(fighter.country);
  const [style, setStyle] = useState<FightingStyle | "">(fighter.style ?? "");
  const [wins, setWins] = useState(String(fighter.record_wins));
  const [losses, setLosses] = useState(String(fighter.record_losses));
  const [draws, setDraws] = useState(String(fighter.record_draws));
  const [height, setHeight] = useState(fighter.height ?? "");
  const [reach, setReach] = useState(fighter.reach ?? "");
  const [bio, setBio] = useState(fighter.bio ?? "");
  const [available, setAvailable] = useState(fighter.available);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("fighter_profiles")
      .update({
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
        bio: bio || null,
        available,
      })
      .eq("id", fighter.id);

    setLoading(false);

    if (error) {
      toast({ title: "Failed to update fighter", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Fighter updated", description: `${name}'s profile has been updated.` });
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            EDIT <span className="text-primary">FIGHTER</span>
          </DialogTitle>
          <DialogDescription>
            Update {fighter.name}'s profile details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="fighter@email.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <div className="space-y-1">
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
          <div className="grid grid-cols-3 gap-3">
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Height</Label>
              <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 5'10&quot;" />
            </div>
            <div className="space-y-1">
              <Label>Reach</Label>
              <Input value={reach} onChange={(e) => setReach(e.target.value)} placeholder='e.g. 72"' />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Fighter bio..." rows={2} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Available for fights</Label>
            <Switch checked={available} onCheckedChange={setAvailable} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !name}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
