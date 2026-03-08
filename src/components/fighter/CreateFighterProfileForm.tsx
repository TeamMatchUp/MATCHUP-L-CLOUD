import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
type FightingStyle = Database["public"]["Enums"]["fighting_style"];
type CountryCode = Database["public"]["Enums"]["country_code"];

const WEIGHT_CLASSES = Constants.public.Enums.weight_class;
const STYLES = Constants.public.Enums.fighting_style;
const COUNTRIES = Constants.public.Enums.country_code;

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

import { STYLE_LABELS } from "@/lib/format";

interface Props {
  userId: string;
  userEmail: string;
  onSuccess: () => void;
}

export function CreateFighterProfileForm({ userId, userEmail, onSuccess }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [weightClass, setWeightClass] = useState<WeightClass>("lightweight");
  const [style, setStyle] = useState<FightingStyle | "">("");
  const [country, setCountry] = useState<CountryCode>("UK");
  const [height, setHeight] = useState("");
  const [reach, setReach] = useState("");
  const [bio, setBio] = useState("");

  const createProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fighter_profiles").insert({
        user_id: userId,
        email: userEmail,
        name,
        weight_class: weightClass,
        style: style || null,
        country,
        height: height || null,
        reach: reach || null,
        bio: bio || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Fighter profile created" });
      onSuccess();
    },
    onError: (e: any) => {
      toast({ title: "Failed to create profile", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="font-heading text-2xl text-foreground mb-2">
        CREATE YOUR <span className="text-primary">FIGHTER PROFILE</span>
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Set up your fighter profile to start receiving match proposals. Your official record will be managed by your coach.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <Label>Fighter Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder='e.g. John "The Thunder" Smith' />
        </div>
        <div className="space-y-1">
          <Label>Weight Class *</Label>
          <Select value={weightClass} onValueChange={(v) => setWeightClass(v as WeightClass)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {WEIGHT_CLASSES.map((wc) => (
                <SelectItem key={wc} value={wc}>{WEIGHT_CLASS_LABELS[wc]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Style</Label>
          <Select value={style} onValueChange={(v) => setStyle(v as FightingStyle)}>
            <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
            <SelectContent>
              {STYLES.map((s) => (
                <SelectItem key={s} value={s}>{STYLE_LABELS[s]}</SelectItem>
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
        <div className="space-y-1">
          <Label>Height</Label>
          <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 5'10&quot;" />
        </div>
        <div className="space-y-1">
          <Label>Reach</Label>
          <Input value={reach} onChange={(e) => setReach(e.target.value)} placeholder='e.g. 72"' />
        </div>
      </div>
      <div className="space-y-1 mb-6">
        <Label>Bio</Label>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} />
      </div>
      <Button onClick={() => createProfile.mutate()} disabled={!name || createProfile.isPending}>
        {createProfile.isPending ? "Creating..." : "Create Profile"}
      </Button>
    </div>
  );
}
