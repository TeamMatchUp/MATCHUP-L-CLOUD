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
const ROSTER_SIZES = ["1–5", "6–15", "16–30", "30+"];
const SHOW_SIZES = ["Amateur <50", "Regional 50–200", "Major 200+"];
const FREQUENCIES = ["Monthly", "Quarterly", "Annually", "One-off"];

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
}

function FighterForm({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weightClass, setWeightClass] = useState<WeightClass | "">("");
  const [discipline, setDiscipline] = useState("");
  const [postcode, setPostcode] = useState("");
  const [hasGym, setHasGym] = useState(false);
  const [gymSearch, setGymSearch] = useState("");
  const [gymResults, setGymResults] = useState<GymResult[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gymSearch || gymSearch.length < 2) {
      setGymResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("gyms")
        .select("id, name, city")
        .ilike("name", `%${gymSearch}%`)
        .limit(5);
      setGymResults(data ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [gymSearch]);

  const handleSubmit = async () => {
    if (!weightClass || !discipline) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Check if fighter profile already exists for this user
    const { data: existing } = await supabase
      .from("fighter_profiles")
      .select("id")
      .eq("user_id", user!.id)
      .maybeSingle();

    let fighterId = existing?.id;

    if (!existing) {
      const { data: created, error } = await supabase.from("fighter_profiles").insert({
        user_id: user!.id,
        name: user!.user_metadata?.full_name || user!.email || "Fighter",
        weight_class: weightClass as WeightClass,
        style: discipline === "Wrestling" || discipline === "Other"
          ? null
          : (discipline.toLowerCase().replace(/ /g, "_") as Database["public"]["Enums"]["fighting_style"]),
      }).select("id").single();
      if (error) console.error("Fighter profile error:", error);
      fighterId = created?.id;
    }

    // If gym selected, create a pending link and save to profile
    if (hasGym && selectedGymId) {
      if (fighterId) {
        await supabase.from("fighter_gym_links").insert({
          fighter_id: fighterId,
          gym_id: selectedGymId,
          status: "pending",
        });
      }
      // Save gym affiliation to profile
      await supabase.from("profiles").update({ gym_id: selectedGymId } as any).eq("id", user!.id);
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
        <Label>Postcode</Label>
        <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="e.g. SW1A 1AA" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox checked={hasGym} onCheckedChange={(v) => { setHasGym(!!v); if (!v) { setSelectedGymId(null); setGymSearch(""); } }} />
          <Label className="cursor-pointer">I train at a gym</Label>
        </div>

        {hasGym && (
          <div className="space-y-2 pl-6">
            <Input
              value={gymSearch}
              onChange={(e) => { setGymSearch(e.target.value); setSelectedGymId(null); }}
              placeholder="Search gyms..."
            />
            {gymResults.length > 0 && (
              <div className="border border-border rounded-md overflow-hidden">
                {gymResults.map((gym) => (
                  <button
                    key={gym.id}
                    onClick={() => { setSelectedGymId(gym.id); setGymSearch(gym.name); setGymResults([]); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${selectedGymId === gym.id ? "bg-primary/10 text-primary" : "text-foreground"}`}
                  >
                    {gym.name}{gym.city ? ` — ${gym.city}` : ""}
                  </button>
                ))}
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

    // Create gym row
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

function OrganiserForm({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const { toast } = useToast();
  const [promotionName, setPromotionName] = useState("");
  const [showSize, setShowSize] = useState("");
  const [frequency, setFrequency] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!promotionName) {
      toast({ title: "Please enter your promotion name", variant: "destructive" });
      return;
    }
    setLoading(true);
    await markOnboardingComplete();
    setLoading(false);
    onComplete();
  };

  return (
    <div className="space-y-5">
      <h3 className="font-heading text-xl text-foreground">Organiser Setup</h3>

      <div className="space-y-2">
        <Label>Promotion Name *</Label>
        <Input value={promotionName} onChange={(e) => setPromotionName(e.target.value)} placeholder="Your promotion name" />
      </div>

      <div className="space-y-2">
        <Label>Show Size</Label>
        <Select value={showSize} onValueChange={setShowSize}>
          <SelectTrigger><SelectValue placeholder="Select show size" /></SelectTrigger>
          <SelectContent>
            {SHOW_SIZES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Frequency</Label>
        <Select value={frequency} onValueChange={setFrequency}>
          <SelectTrigger><SelectValue placeholder="How often?" /></SelectTrigger>
          <SelectContent>
            {FREQUENCIES.map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
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

async function markOnboardingComplete() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ onboarding_completed: true } as any).eq("id", user.id);
}

export default function Onboarding() {
  const { user, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rolesLoaded, setRolesLoaded] = useState(false);

  // Wait for roles to actually load (they arrive async after auth)
  useEffect(() => {
    if (!authLoading && user && roles.length > 0) {
      setRolesLoaded(true);
    }
    // Also mark loaded after a timeout to handle users with no roles
    if (!authLoading && user) {
      const t = setTimeout(() => setRolesLoaded(true), 1500);
      return () => clearTimeout(t);
    }
  }, [authLoading, user, roles]);

  // Determine primary role for which form to show
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

  if (authLoading) {
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
          {primaryRole === "organiser" && (
            <OrganiserForm onComplete={goToDashboard} onSkip={handleSkip} />
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
