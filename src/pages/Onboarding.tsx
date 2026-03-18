import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AppLogo } from "@/components/AppLogo";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
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
  Boxing: ["Out-Boxer", "Pressure", "Swarmer", "Counter Puncher", "Brawler"],
  "Muay Thai": ["Teep", "Rhythm", "Aggressive", "Forward", "Clinch", "Knee", "Counter", "Timing"],
  MMA: ["Pure Striker", "Wrestler", "Takedown", "BJJ", "Sub Grappler", "Dirty Boxer"],
  Kickboxing: ["Out-Fighter", "Pressure", "Combo", "Power", "Counter"],
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
}

async function markOnboardingComplete() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
}

function FighterForm({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weightClass, setWeightClass] = useState<WeightClass | "">("");
  const [discipline, setDiscipline] = useState("");
  const [stance, setStance] = useState("");
  const [fightingSubstyle, setFightingSubstyle] = useState("");
  const [postcode, setPostcode] = useState("");
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
        .select("id, name, city, coach_id")
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

    if (!existing) {
      const styleValue = discipline === "Wrestling" || discipline === "Other" || discipline === "BJJ"
        ? null
        : (discipline.toLowerCase().replace(/ /g, "_") as Database["public"]["Enums"]["fighting_style"]);

      const { data: created, error } = await supabase.from("fighter_profiles").insert({
        user_id: user!.id,
        name: user!.user_metadata?.full_name || user!.email || "Fighter",
        weight_class: weightClass as WeightClass,
        style: styleValue,
        stance: stance || null,
        fighting_substyle: fightingSubstyle || null,
      } as any).select("id").single();
      if (error) console.error("Fighter profile error:", error);
      fighterId = created?.id;
    }

    // If gym selected, create a pending fighter_gym_link
    if (hasGym && selectedGym && fighterId) {
      await supabase.from("fighter_gym_links").insert({
        fighter_id: fighterId,
        gym_id: selectedGym.id,
        status: "pending",
      });
    }

    await markOnboardingComplete();
    setLoading(false);
    onComplete();
  };

  return (
    <div className="space-y-5">
      <h3 className="font-heading text-xl text-foreground">Fighter Setup</h3>

      <div className="space-y-2">
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

      <div className="space-y-2">
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
        <div className="space-y-2">
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
            {selectedGym && !selectedGym.coach_id && (
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

export default function Onboarding() {
  const { user, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    if (!authLoading && user && roles.length > 0) {
      setRolesLoaded(true);
    }
    if (!authLoading && user) {
      const t = setTimeout(() => setRolesLoaded(true), 1500);
      return () => clearTimeout(t);
    }
  }, [authLoading, user, roles]);

  // Determine primary role
  const primaryRole: AppRole | null = roles.includes("gym_owner")
    ? "gym_owner"
    : roles.includes("fighter")
      ? "fighter"
      : roles.includes("organiser")
        ? "organiser"
        : roles[0] ?? null;

  const goToDashboard = () => {
    const path = primaryRole ? (ROLE_PATHS[primaryRole] ?? "/coach/dashboard") : "/dashboard";
    navigate(path, { replace: true });
  };

  const handleSkip = async () => {
    await markOnboardingComplete();
    goToDashboard();
  };

  // Organisers skip onboarding entirely — redirect to events page
  useEffect(() => {
    if (rolesLoaded && primaryRole === "organiser") {
      markOnboardingComplete().then(() => {
        navigate("/events", { replace: true });
      });
    }
  }, [rolesLoaded, primaryRole, navigate]);

  if (authLoading || !rolesLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth", { replace: true });
    return null;
  }

  // If organiser, show loading while we redirect
  if (primaryRole === "organiser") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Redirecting...</div>
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
          {primaryRole === "gym_owner" && (
            <CoachForm onComplete={goToDashboard} onSkip={handleSkip} />
          )}
          {!primaryRole && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">No role assigned yet.</p>
              <Button variant="hero" onClick={handleSkip}>Go to Dashboard</Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
