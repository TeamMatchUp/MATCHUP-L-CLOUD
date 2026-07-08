import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppLogo } from "@/components/AppLogo";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { CalendarIcon, Plus, Building2, ArrowRight, Loader2 } from "lucide-react";
import { format, setMonth, setYear, getYear, getMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SearchableCountrySelect } from "@/components/SearchableCountrySelect";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type CountryCode = Database["public"]["Enums"]["country_code"];
type WeightClass = Database["public"]["Enums"]["weight_class"];

const STANCES = ["Orthodox", "Southpaw", "Switch"];

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

async function markOnboardingComplete(queryClient: ReturnType<typeof useQueryClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
  queryClient.setQueryData(["onboarding-check", user.id], { onboarding_completed: true });
}

/** DOB picker with year/month selectors for fast decade jumping */
function DOBPicker({ value, onChange }: { value?: Date; onChange: (d: Date | undefined) => void }) {
  const [viewDate, setViewDate] = useState(value || new Date(2000, 0, 1));
  const years = Array.from({ length: 60 }, (_, i) => getYear(new Date()) - i);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Select value={String(getMonth(viewDate))} onValueChange={(v) => setViewDate(setMonth(viewDate, parseInt(v)))}>
          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
          <SelectContent position="popper" side="bottom">
            {months.map((m, i) => (<SelectItem key={m} value={String(i)}>{m}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={String(getYear(viewDate))} onValueChange={(v) => setViewDate(setYear(viewDate, parseInt(v)))}>
          <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
          <SelectContent position="popper" side="bottom">
            {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <Calendar
        mode="single" selected={value} onSelect={onChange} month={viewDate} onMonthChange={setViewDate}
        disabled={(date) => date > new Date() || date < new Date("1940-01-01")}
        className={cn("p-3 pointer-events-auto")}
      />
    </div>
  );
}

// ---------------- Fighter ----------------

function FighterForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { track } = useAnalytics();

  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [heightCm, setHeightCm] = useState("");
  const [walkAroundWeight, setWalkAroundWeight] = useState("");
  const [stance, setStance] = useState("");
  const [level, setLevel] = useState<"amateur" | "pro" | "">("");
  const [country, setCountry] = useState<string>("UK");

  const [showBio, setShowBio] = useState(true);
  const [bio, setBio] = useState("");
  const [showGym, setShowGym] = useState(true);
  const [gymSearch, setGymSearch] = useState("");
  const [gymResults, setGymResults] = useState<GymResult[]>([]);
  const [selectedGym, setSelectedGym] = useState<GymResult | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gymSearch || gymSearch.length < 2) { setGymResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("gyms")
        .select("id, name, city, coach_id, claimed").ilike("name", `%${gymSearch}%`).limit(5);
      setGymResults(data ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [gymSearch]);

  const handleSubmit = async () => {
    if (!dateOfBirth || !heightCm || !walkAroundWeight || !stance || !level || !country) {
      toast({ title: "Please complete all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { data: existing } = await supabase.from("fighter_profiles")
      .select("id")
      .eq("user_id", user!.id).maybeSingle();

    const baseUpdate: any = {
      date_of_birth: format(dateOfBirth, "yyyy-MM-dd"),
      height: parseInt(heightCm),
      walk_around_weight_kg: parseFloat(walkAroundWeight),
      stance,
      country: country as CountryCode,
      bio: showBio && bio ? bio : null,
    };

    let fighterId = existing?.id;

    if (!existing) {
      // First creation only: initialise the appropriate record block at 0-0-0.
      // Existing rows are NEVER overwritten by the level toggle.
      const insertData: any = { ...baseUpdate };
      if (level === "amateur") {
        insertData.amateur_wins = 0; insertData.amateur_losses = 0; insertData.amateur_draws = 0;
      } else {
        insertData.record_wins = 0; insertData.record_losses = 0; insertData.record_draws = 0;
      }
      const { data: created, error } = await supabase.from("fighter_profiles").insert({
        user_id: user!.id,
        email: user!.email ?? null,
        name: user!.user_metadata?.full_name || user!.email || "Fighter",
        weight_class: "unspecified" as WeightClass,
        ...insertData,
      }).select("id").single();
      if (error) {
        console.error("Fighter profile create error:", error);
        toast({ title: "Failed to save profile", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      fighterId = created?.id;
    } else {
      await supabase.from("fighter_profiles").update(baseUpdate).eq("id", existing.id);
    }

    if (showGym && selectedGym && fighterId) {
      const { data: linkData } = await supabase.from("fighter_gym_links").insert({
        fighter_id: fighterId, gym_id: selectedGym.id, status: "pending",
      }).select("id").single();

      if (linkData) {
        const { data: freshGym } = await supabase.from("gyms")
          .select("coach_id, claimed, name").eq("id", selectedGym.id).single();
        if (freshGym?.claimed && freshGym.coach_id) {
          await supabase.rpc("create_notification", {
            _user_id: freshGym.coach_id,
            _title: "New gym join request",
            _message: `${user!.user_metadata?.full_name || user!.email || "A fighter"} has requested to join ${freshGym.name}`,
            _type: "gym_request",
            _reference_id: linkData.id,
          });
        }
      }
    }

    await markOnboardingComplete(queryClient);
    void track("onboarding_completed", { role: "fighter" });
    setLoading(false);
    navigate("/fighter/dashboard", { replace: true });
  };

  return (
    <div className="space-y-5">
      <h3 className="font-heading text-xl text-foreground">Fighter Setup</h3>
      <p className="text-xs text-muted-foreground -mt-3">
        The essentials to get you into matchmaking. You can pick your weight class, discipline and records later from My Profile.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 col-span-2">
          <Label>Date of Birth *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateOfBirth && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateOfBirth ? format(dateOfBirth, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="bottom">
              <DOBPicker value={dateOfBirth} onChange={setDateOfBirth} />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Height (cm) *</Label>
          <Input type="number" min="0" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="e.g. 178" />
        </div>
        <div className="space-y-2">
          <Label>Weight (kg) *</Label>
          <Input type="number" min="0" value={walkAroundWeight} onChange={(e) => setWalkAroundWeight(e.target.value)} placeholder="e.g. 75" />
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Stance *</Label>
          <Select value={stance} onValueChange={setStance}>
            <SelectTrigger><SelectValue placeholder="Select stance" /></SelectTrigger>
            <SelectContent position="popper" side="bottom">
              {STANCES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Level *</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant={level === "amateur" ? "hero" : "outline"} onClick={() => setLevel("amateur")}>Amateur</Button>
            <Button type="button" variant={level === "pro" ? "hero" : "outline"} onClick={() => setLevel("pro")}>Pro</Button>
          </div>
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Country *</Label>
          <SearchableCountrySelect value={country} onValueChange={(v) => setCountry(v)} />
        </div>
      </div>

      {/* Optional: Bio */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm">Bio <span className="text-muted-foreground text-xs">(optional)</span></Label>
          {showBio ? (
            <button type="button" onClick={() => { setShowBio(false); setBio(""); }} className="text-xs text-muted-foreground hover:text-foreground">Skip</button>
          ) : (
            <button type="button" onClick={() => setShowBio(true)} className="text-xs text-primary hover:text-primary/80">Add</button>
          )}
        </div>
        {showBio && (
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} />
        )}
      </div>

      {/* Optional: Gym */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm">Gym affiliation <span className="text-muted-foreground text-xs">(optional)</span></Label>
          {showGym ? (
            <button type="button" onClick={() => { setShowGym(false); setSelectedGym(null); setGymSearch(""); }} className="text-xs text-muted-foreground hover:text-foreground">Skip</button>
          ) : (
            <button type="button" onClick={() => setShowGym(true)} className="text-xs text-primary hover:text-primary/80">Add</button>
          )}
        </div>
        {showGym && (
          <div className="space-y-2">
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
            {selectedGym && (
              <p className="text-xs text-muted-foreground">
                A join request will be sent to <strong className="text-foreground">{selectedGym.name}</strong>.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <Button variant="hero" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}

// ---------------- Coach / Gym owner ----------------

function CoachLanding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { track } = useAnalytics();
  const { activeRole } = useAuth();

  const dashboardPath = activeRole && ROLE_PATHS[activeRole]
    ? ROLE_PATHS[activeRole]
    : ROLE_PATHS.coach;

  const go = async (path: string) => {
    await markOnboardingComplete(queryClient);
    void track("onboarding_completed", { role: activeRole ?? "coach" });
    navigate(path, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-xl text-foreground">Welcome, Coach</h3>
        <p className="text-sm text-muted-foreground mt-1">What would you like to do first?</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => go("/register-gym")}
          className="group rounded-lg border border-border bg-card hover:border-primary/50 transition-all p-5 text-left flex items-start gap-3"
        >
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h4 className="font-heading text-lg text-foreground">Add your first gym</h4>
            <p className="text-sm text-muted-foreground">Register your gym so fighters can find and join it.</p>
          </div>
        </button>

        <button
          onClick={() => go("/organiser/create-event")}
          className="group rounded-lg border border-border bg-card hover:border-primary/50 transition-all p-5 text-left flex items-start gap-3"
        >
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h4 className="font-heading text-lg text-foreground">Add your first event</h4>
            <p className="text-sm text-muted-foreground">Set up a fight night and start building the card.</p>
          </div>
        </button>
      </div>

      <div className="pt-2">
        <Button variant="ghost" className="w-full" onClick={() => go(dashboardPath)}>
          Skip for now <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------- Organiser ----------------

function OrganiserLanding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { track } = useAnalytics();

  const go = async (path: string) => {
    await markOnboardingComplete(queryClient);
    void track("onboarding_completed", { role: "organiser" });
    navigate(path, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-xl text-foreground">
          WELCOME, <span className="text-primary">ORGANISER</span>
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Let's get your first event on the calendar.</p>
      </div>

      <button
        onClick={() => go("/organiser/create-event")}
        className="group w-full rounded-lg border border-border bg-card hover:border-primary/50 transition-all p-5 text-left flex items-start gap-3"
      >
        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
          <Plus className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h4 className="font-heading text-lg text-foreground">Add your first event</h4>
          <p className="text-sm text-muted-foreground">Set up a fight night, build the card, and start matchmaking.</p>
        </div>
      </button>

      <div className="pt-2">
        <Button variant="ghost" className="w-full" onClick={() => go(ROLE_PATHS.organiser)}>
          Skip for now <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------- Shell ----------------

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: freshRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ["onboarding-fresh-roles", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      return (data ?? []).map((r) => r.role) as AppRole[];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const primaryRole: AppRole | null = freshRoles
    ? freshRoles.includes("gym_owner") ? "gym_owner"
      : freshRoles.includes("fighter") ? "fighter"
      : freshRoles.includes("organiser") ? "organiser"
      : freshRoles.includes("coach") ? "coach"
      : freshRoles[0] ?? null
    : null;

  const queryClient = useQueryClient();

  if (authLoading || !user || rolesLoading || !freshRoles) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (freshRoles.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center space-y-4">
          <h2 className="font-heading text-xl text-foreground">We couldn't finish setting up your account</h2>
          <p className="text-sm text-muted-foreground">
            No role is assigned to your profile yet. Please retry, or sign out and sign up again.
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="hero" onClick={() => queryClient.invalidateQueries({ queryKey: ["onboarding-fresh-roles", user.id] })}>
              Retry
            </Button>
            <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); navigate("/auth", { replace: true }); }}>
              Back to sign in
            </Button>
          </div>
        </div>
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
          {primaryRole === "fighter" && <FighterForm />}
          {(primaryRole === "coach" || primaryRole === "gym_owner") && <CoachLanding />}
          {primaryRole === "organiser" && <OrganiserLanding />}
        </div>
      </motion.div>
    </div>
  );
}
