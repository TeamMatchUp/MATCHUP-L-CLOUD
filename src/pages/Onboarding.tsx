import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AppLogo } from "@/components/AppLogo";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Copy, Check, CalendarIcon, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
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

const ROSTER_SIZES = ["1–5", "6–15", "16–30", "30+"];

const ROLE_PATHS: Record<string, string> = {
  organiser: "/organiser/dashboard",
  fighter: "/fighter/dashboard",
  gym_owner: "/gym-owner/dashboard",
  coach: "/coach/dashboard",
  admin: "/admin",
};

interface GymResult {
  id: string;
  name: string;
  city: string | null;
  coach_id: string | null;
  claimed: boolean | null;
}

async function markOnboardingComplete() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
}

function FighterForm({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [weightClass, setWeightClass] = useState<WeightClass | "">("");
  const [discipline, setDiscipline] = useState("");
  const [stance, setStance] = useState("");
  const [fightingSubstyle, setFightingSubstyle] = useState("");
  const [postcode, setPostcode] = useState("");
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
  const [hasGym, setHasGym] = useState(false);
  const [gymSearch, setGymSearch] = useState("");
  const [gymResults, setGymResults] = useState<GymResult[]>([]);
  const [selectedGym, setSelectedGym] = useState<GymResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const substyleOptions = FIGHTING_SUBSTYLES[discipline] ?? [];

  useEffect(() => {
    setFightingSubstyle("");
  }, [discipline]);

  useEffect(() => {
    if (!gymSearch || gymSearch.length < 2) {
      setGymResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("gyms")
        .select("id, name, city, coach_id, claimed")
        .ilike("name", `%${gymSearch}%`)
        .limit(5);
      setGymResults(data ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [gymSearch]);

  const handleCopySignupUrl = () => {
    const url = `${window.location.origin}/auth?mode=signup`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!weightClass || !discipline) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { data: existing } = await supabase
      .from("fighter_profiles")
      .select("id")
      .eq("user_id", user!.id)
      .maybeSingle();

    let fighterId = existing?.id;

    const styleValue = discipline === "Wrestling" || discipline === "Other" || discipline === "BJJ"
      ? null
      : (discipline.toLowerCase().replace(/ /g, "_") as Database["public"]["Enums"]["fighting_style"]);

    const profileData = {
      weight_class: weightClass as WeightClass,
      style: styleValue,
      stance: stance || null,
      fighting_substyle: fightingSubstyle || null,
      discipline: discipline,
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
    };

    if (!existing) {
      const { data: created, error } = await supabase.from("fighter_profiles").insert({
        user_id: user!.id,
        name: user!.user_metadata?.full_name || user!.email || "Fighter",
        ...profileData,
      }).select("id").single();
      if (error) console.error("Fighter profile error:", error);
      fighterId = created?.id;
    } else {
      const { error } = await supabase.from("fighter_profiles")
        .update(profileData)
        .eq("id", existing.id);
      if (error) console.error("Fighter profile update error:", error);
    }

    if (hasGym && selectedGym && fighterId) {
      const { data: linkData } = await supabase.from("fighter_gym_links").insert({
        fighter_id: fighterId,
        gym_id: selectedGym.id,
        status: "pending",
      }).select("id").single();

      // Notify the gym's coach if the gym is claimed and has a coach
      if (selectedGym.claimed && selectedGym.coach_id && linkData) {
        const fighterName = user!.user_metadata?.full_name || user!.email || "A fighter";
        await supabase.rpc("create_notification", {
          _user_id: selectedGym.coach_id,
          _title: "New gym join request",
          _message: `${fighterName} has requested to join ${selectedGym.name}`,
          _type: "gym_request",
          _reference_id: linkData.id,
        });
      }
    }

    await markOnboardingComplete();
    setLoading(false);
    onComplete();
  };

  return (
    <div className="space-y-5">
      <h3 className="font-heading text-xl text-foreground">Fighter Setup</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 col-span-2">
          <Label>Date of Birth</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !dateOfBirth && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateOfBirth ? format(dateOfBirth, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateOfBirth}
                onSelect={setDateOfBirth}
                disabled={(date) => date > new Date() || date < new Date("1940-01-01")}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Weight Class *</Label>
          <Select value={weightClass} onValueChange={(v) => setWeightClass(v as WeightClass)}>
            <SelectTrigger><SelectValue placeholder="Select weight class" /></SelectTrigger>
            <SelectContent>
              {WEIGHT_CLASSES.map((wc) => (
                <SelectItem key={wc.value} value={wc.value}>{wc.label}</SelectItem>
              ))}
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
            <SelectContent>
              {DISCIPLINES.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 col-span-2">
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
          <div className="space-y-2 col-span-2">
            <Label>Fighting Style</Label>
            <Select value={fightingSubstyle} onValueChange={setFightingSubstyle}>
              <SelectTrigger><SelectValue placeholder="Select fighting style" /></SelectTrigger>
              <SelectContent>
                {substyleOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-3">
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

      <div className="space-y-3">
        <Label className="text-sm font-medium">Pro Record</Label>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wins</Label>
            <Input type="number" min="0" value={proWins} onChange={(e) => setProWins(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Losses</Label>
            <Input type="number" min="0" value={proLosses} onChange={(e) => setProLosses(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Draws</Label>
            <Input type="number" min="0" value={proDraws} onChange={(e) => setProDraws(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Postcode</Label>
        <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="e.g. SW1A 1AA" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox checked={hasGym} onCheckedChange={(v) => { setHasGym(!!v); if (!v) { setSelectedGym(null); setGymSearch(""); } }} />
          <Label className="cursor-pointer">I train at a gym</Label>
        </div>

        {hasGym && (
          <div className="space-y-2 pl-6">
            <Input
              value={gymSearch}
              onChange={(e) => { setGymSearch(e.target.value); setSelectedGym(null); }}
              placeholder="Search gyms..."
            />
            {gymResults.length > 0 && !selectedGym && (
              <div className="border border-border rounded-md overflow-hidden">
                {gymResults.map((gym) => (
                  <button
                    key={gym.id}
                    onClick={() => { setSelectedGym(gym); setGymSearch(gym.name); setGymResults([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors text-foreground"
                  >
                    {gym.name}{gym.city ? ` — ${gym.city}` : ""}
                  </button>
                ))}
              </div>
            )}
            {selectedGym && selectedGym.claimed === false && (
              <div className="rounded-md border border-border bg-muted/50 p-3 space-y-2">
                <p className="text-sm text-muted-foreground">
                  This gym hasn't been claimed yet — share this link to invite the coach to sign up and claim it.
                </p>
                <button
                  onClick={handleCopySignupUrl}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy signup URL"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <Button variant="hero" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </Button>
        <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Skip for now
        </button>
      </div>
    </div>
  );
}

function CoachForm({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gymName, setGymName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [rosterSize, setRosterSize] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleDiscipline = (d: string) => {
    setDisciplines((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const handleSubmit = async () => {
    if (!gymName) {
      toast({ title: "Please enter your gym name", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { error } = await supabase.from("gyms").insert({
      name: gymName,
      postcode: postcode || null,
      claimed: true,
      listing_tier: "free",
      coach_id: user!.id,
      discipline_tags: disciplines.length > 0 ? disciplines.join(", ") : null,
    });
    if (error) console.error("Gym creation error:", error);

    await markOnboardingComplete();
    setLoading(false);
    onComplete();
  };

  return (
    <div className="space-y-5">
      <h3 className="font-heading text-xl text-foreground">Coach Setup</h3>

      <div className="space-y-2">
        <Label>Gym Name *</Label>
        <Input value={gymName} onChange={(e) => setGymName(e.target.value)} placeholder="Your gym name" />
      </div>

      <div className="space-y-2">
        <Label>Postcode</Label>
        <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="e.g. SW1A 1AA" />
      </div>

      <div className="space-y-2">
        <Label>Disciplines</Label>
        <div className="grid grid-cols-2 gap-2">
          {DISCIPLINES.filter((d) => d !== "Other").map((d) => (
            <label key={d} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={disciplines.includes(d)} onCheckedChange={() => toggleDiscipline(d)} />
              <span className="text-sm text-foreground">{d}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Roster Size</Label>
        <Select value={rosterSize} onValueChange={setRosterSize}>
          <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
          <SelectContent>
            {ROSTER_SIZES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <Button variant="hero" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </Button>
        <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Skip for now
        </button>
      </div>
    </div>
  );
}

function OrganiserLanding() {
  const navigate = useNavigate();

  const handleCreateEvent = async () => {
    await markOnboardingComplete();
    navigate("/organiser/create-event", { replace: true });
  };

  const handleBrowseEvents = async () => {
    await markOnboardingComplete();
    navigate("/events", { replace: true });
  };

  return (
    <div className="space-y-6">
      <h3 className="font-heading text-xl text-foreground text-center">
        WELCOME, <span className="text-primary">ORGANISER</span>
      </h3>
      <p className="text-sm text-muted-foreground text-center">What would you like to do first?</p>

      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={handleCreateEvent}
          className="group rounded-lg border border-border bg-card hover:border-primary/50 transition-all p-6 text-left space-y-3"
        >
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-heading text-lg text-foreground">Create your first event</h4>
            <p className="text-sm text-muted-foreground">Set up a fight night, build a card, and start matchmaking.</p>
          </div>
        </button>

        <button
          onClick={handleBrowseEvents}
          className="group rounded-lg border border-border bg-card hover:border-primary/50 transition-all p-6 text-left space-y-3"
        >
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-heading text-lg text-foreground">Browse existing events</h4>
            <p className="text-sm text-muted-foreground">See what's coming up and explore the fight calendar.</p>
          </div>
        </button>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const { user, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    if (!authLoading && user && roles.length > 0) {
      setRolesLoaded(true);
    }
  }, [authLoading, user, roles]);

  const primaryRole: AppRole | null = roles.includes("gym_owner")
    ? "gym_owner"
    : roles.includes("fighter")
      ? "fighter"
      : roles.includes("organiser")
        ? "organiser"
        : roles.includes("coach")
          ? "coach"
          : roles[0] ?? null;

  const goToDashboard = () => {
    const path = primaryRole ? (ROLE_PATHS[primaryRole] ?? "/coach/dashboard") : "/dashboard";
    navigate(path, { replace: true });
  };

  const handleSkip = async () => {
    await markOnboardingComplete();
    goToDashboard();
  };

  // Show loading until auth is resolved AND roles are loaded
  if (authLoading || !user || !rolesLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-6">
          <AppLogo className="h-10 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Let's get you set up</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 sm:p-8">
          {primaryRole === "fighter" && (
            <FighterForm onComplete={goToDashboard} onSkip={handleSkip} />
          )}
          {(primaryRole === "coach" || primaryRole === "gym_owner") && (
            <CoachForm onComplete={goToDashboard} onSkip={handleSkip} />
          )}
          {primaryRole === "organiser" && (
            <OrganiserLanding />
          )}
        </div>
      </motion.div>
    </div>
  );
}
