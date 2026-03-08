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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { UserPlus, Search } from "lucide-react";

type WeightClass = Database["public"]["Enums"]["weight_class"];
type CountryCode = Database["public"]["Enums"]["country_code"];
type FightingStyle = Database["public"]["Enums"]["fighting_style"];

const WEIGHT_CLASSES = Constants.public.Enums.weight_class;
const COUNTRIES = Constants.public.Enums.country_code;
const STYLES = Constants.public.Enums.fighting_style;

function formatEnum(val: string) {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface AddFighterToGymDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gymId: string;
  coachId: string;
  onSuccess: () => void;
}

export function AddFighterToGymDialog({
  open,
  onOpenChange,
  gymId,
  coachId,
  onSuccess,
}: AddFighterToGymDialogProps) {
  // Create new fighter state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [weightClass, setWeightClass] = useState<WeightClass>("lightweight");
  const [country, setCountry] = useState<CountryCode>("UK");
  const [style, setStyle] = useState<FightingStyle | "">("");
  const [wins, setWins] = useState("0");
  const [losses, setLosses] = useState("0");
  const [draws, setDraws] = useState("0");
  const [loading, setLoading] = useState(false);

  // Invite existing fighter state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const { toast } = useToast();

  const resetForm = () => {
    setName("");
    setEmail("");
    setWins("0");
    setLosses("0");
    setDraws("0");
    setInviteEmail("");
  };

  const handleCreateFighter = async (e: React.FormEvent) => {
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
        created_by_coach_id: coachId,
        available: true,
      })
      .select("id")
      .single();

    if (error) {
      setLoading(false);
      toast({ title: "Failed to create fighter", description: error.message, variant: "destructive" });
      return;
    }

    // Link to gym
    const { error: linkError } = await supabase.from("fighter_gym_links").insert({
      fighter_id: fighter.id,
      gym_id: gymId,
      is_primary: true,
      status: "accepted",
    });

    if (linkError) {
      toast({ title: "Fighter created but gym link failed", description: linkError.message, variant: "destructive" });
    } else {
      toast({ title: "Fighter added", description: `${name} has been added to the gym roster.` });
    }

    setLoading(false);
    resetForm();
    onSuccess();
    onOpenChange(false);
  };

  const handleInviteFighter = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);

    // Look up fighter by email
    const { data: existingFighter } = await supabase
      .from("fighter_profiles")
      .select("id, name")
      .eq("email", inviteEmail.trim())
      .maybeSingle();

    if (!existingFighter) {
      setInviteLoading(false);
      toast({
        title: "Fighter not found",
        description: "No fighter profile exists with that email. Try creating a new fighter instead.",
        variant: "destructive",
      });
      return;
    }

    // Check if already linked
    const { data: existingLink } = await supabase
      .from("fighter_gym_links")
      .select("id, status")
      .eq("fighter_id", existingFighter.id)
      .eq("gym_id", gymId)
      .maybeSingle();

    if (existingLink) {
      setInviteLoading(false);
      toast({
        title: "Already linked",
        description: `${existingFighter.name} is already ${existingLink.status === "accepted" ? "a member of" : "invited to"} this gym.`,
      });
      return;
    }

    // Create pending link
    const { error } = await supabase.from("fighter_gym_links").insert({
      fighter_id: existingFighter.id,
      gym_id: gymId,
      is_primary: false,
      status: "pending",
    });

    if (error) {
      setInviteLoading(false);
      toast({ title: "Failed to send invite", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Invite sent", description: `${existingFighter.name} has been invited to join the gym.` });
    setInviteLoading(false);
    resetForm();
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
            Create a new fighter or invite an existing one to your gym.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="mt-2">
          <TabsList className="w-full bg-card border border-border">
            <TabsTrigger value="create" className="flex-1 gap-1">
              <UserPlus className="h-3.5 w-3.5" /> Create New
            </TabsTrigger>
            <TabsTrigger value="invite" className="flex-1 gap-1">
              <Search className="h-3.5 w-3.5" /> Invite Existing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <form onSubmit={handleCreateFighter} className="space-y-3 mt-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Fighter name" />
              </div>
              <div className="space-y-1">
                <Label>Email <span className="text-xs text-muted-foreground">(optional, for account sync)</span></Label>
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
              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={loading || !name}>
                  {loading ? "Creating..." : "Create & Add"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="invite">
            <form onSubmit={handleInviteFighter} className="space-y-4 mt-3">
              <div className="space-y-1">
                <Label>Fighter Email</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  placeholder="Enter fighter's email address"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If a fighter profile exists with this email, they'll receive an invite to join your gym.
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={inviteLoading || !inviteEmail}>
                  {inviteLoading ? "Sending..." : "Send Invite"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
