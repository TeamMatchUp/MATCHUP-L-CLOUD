import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { STYLE_LABELS } from "@/lib/format";

type WeightClass = Database["public"]["Enums"]["weight_class"];
type FightingStyle = Database["public"]["Enums"]["fighting_style"];
type CountryCode = Database["public"]["Enums"]["country_code"];

const WEIGHT_CLASSES = Constants.public.Enums.weight_class;
const STYLES = Constants.public.Enums.fighting_style;

const ALL_COUNTRIES = [
  { code: "UK", label: "United Kingdom" }, { code: "USA", label: "United States" }, { code: "AUS", label: "Australia" },
  { code: "IE", label: "Ireland" }, { code: "FR", label: "France" }, { code: "DE", label: "Germany" },
  { code: "ES", label: "Spain" }, { code: "IT", label: "Italy" }, { code: "NL", label: "Netherlands" },
  { code: "PT", label: "Portugal" }, { code: "BE", label: "Belgium" }, { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" }, { code: "DK", label: "Denmark" }, { code: "FI", label: "Finland" },
  { code: "PL", label: "Poland" }, { code: "RU", label: "Russia" }, { code: "CA", label: "Canada" },
  { code: "BR", label: "Brazil" }, { code: "MX", label: "Mexico" }, { code: "AR", label: "Argentina" },
  { code: "CO", label: "Colombia" }, { code: "JP", label: "Japan" }, { code: "TH", label: "Thailand" },
  { code: "PH", label: "Philippines" }, { code: "CN", label: "China" }, { code: "KR", label: "South Korea" },
  { code: "IN", label: "India" }, { code: "PK", label: "Pakistan" }, { code: "NG", label: "Nigeria" },
  { code: "ZA", label: "South Africa" }, { code: "GH", label: "Ghana" }, { code: "KE", label: "Kenya" },
  { code: "EG", label: "Egypt" }, { code: "NZ", label: "New Zealand" }, { code: "AT", label: "Austria" },
  { code: "CH", label: "Switzerland" }, { code: "CZ", label: "Czech Republic" }, { code: "HU", label: "Hungary" },
  { code: "RO", label: "Romania" }, { code: "HR", label: "Croatia" }, { code: "RS", label: "Serbia" },
  { code: "BG", label: "Bulgaria" }, { code: "GR", label: "Greece" }, { code: "TR", label: "Turkey" },
  { code: "UA", label: "Ukraine" }, { code: "JM", label: "Jamaica" }, { code: "TT", label: "Trinidad and Tobago" },
];

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

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
  const [country, setCountry] = useState<string>("UK");
  const [countrySearch, setCountrySearch] = useState("");
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
        country: country as CountryCode,
        height: height ? parseInt(height) : null,
        reach: reach ? parseInt(reach) : null,
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
          <Label>Nationality</Label>
          <Select value={country} onValueChange={(v) => setCountry(v)}>
            <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
            <SelectContent>
              <div className="px-2 pb-2 pt-1">
                <Input
                  placeholder="Search countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="h-8 text-sm"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              {ALL_COUNTRIES
                .filter(c => !countrySearch || c.label.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase()))
                .map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Height (cm)</Label>
          <Input type="number" min="0" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 178" />
        </div>
        <div className="space-y-1">
          <Label>Reach (cm)</Label>
          <Input type="number" min="0" value={reach} onChange={(e) => setReach(e.target.value)} placeholder="e.g. 183" />
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
