import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Share2, Save, Pencil, ShieldCheck, Info, Search } from "lucide-react";
import { formatEnum } from "@/lib/format";
import { FighterFightHistory } from "./FighterFightHistory";
import { ProfileCompletionBar } from "./ProfileCompletionBar";
import { Constants } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";


interface EditableProfilePanelProps {
  fighterProfile: any;
  userId: string;
  onRefresh: () => void;
}

const DISCIPLINES = ["boxing", "muay_thai", "mma", "kickboxing", "bjj"];
const STANCES = ["Orthodox", "Southpaw", "Switch"];

const SUBSTYLE_MAP: Record<string, string[]> = {
  boxing: ["Out-Boxer", "Pressure", "In-Fighter", "Counter-Puncher", "Brawler"],
  muay_thai: ["Teep", "Rhythm", "Aggressive", "Forward", "Clinch-Heavy", "Aggressive Striker", "All-Range"],
  mma: ["Striker", "Wrestler", "BJJ-Submission", "Kickboxer-based", "Balanced", "All-Round"],
  kickboxing: ["Out-Fighter", "Pressure", "Combo", "Counter", "Switch Kicker"],
};

interface GymResult {
  id: string;
  name: string;
  city: string | null;
  claimed: boolean | null;
  coach_id: string | null;
}

export function EditableProfilePanel({ fighterProfile, userId, onRefresh }: EditableProfilePanelProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gymSearch, setGymSearch] = useState("");
  const [gymResults, setGymResults] = useState<GymResult[]>([]);
  const [joiningGym, setJoiningGym] = useState(false);

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      name: fighterProfile.name || "",
      date_of_birth: fighterProfile.date_of_birth || "",
      weight_class: fighterProfile.weight_class || "",
      discipline: fighterProfile.discipline || "",
      stance: fighterProfile.stance || "",
      fighting_substyle: fighterProfile.fighting_substyle || "",
      height: fighterProfile.height || "",
      reach: fighterProfile.reach || "",
      walk_around_weight_kg: fighterProfile.walk_around_weight_kg || "",
      bio: fighterProfile.bio || "",
      country: fighterProfile.country || "UK",
      training_background: fighterProfile.training_background || "",
      years_training: fighterProfile.years_training || "",
      region: fighterProfile.region || "",
    },
  });

  const watchedDiscipline = watch("discipline");
  const substyleOptions = SUBSTYLE_MAP[watchedDiscipline] ?? [];

  const { data: gymAffiliation, refetch: refetchGym } = useQuery({
    queryKey: ["fighter-gym-affiliation", fighterProfile.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("status, gym:gyms!fighter_gym_links_gym_id_fkey(name)")
        .eq("fighter_id", fighterProfile.id)
        .in("status", ["approved", "pending"])
        .limit(1);
      if (!data || data.length === 0) return null;
      const link = data[0] as any;
      return { name: link.gym?.name ?? "Unknown", status: link.status };
    },
    enabled: !!fighterProfile.id,
  });

  useEffect(() => {
    if (!gymSearch || gymSearch.length < 2) { setGymResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase.from("gyms").select("id, name, city, claimed, coach_id").ilike("name", `%${gymSearch}%`).limit(5);
      setGymResults(data ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [gymSearch]);

  const handleJoinGym = async (gym: GymResult) => {
    setJoiningGym(true);
    const { data: linkData, error } = await supabase.from("fighter_gym_links").insert({
      fighter_id: fighterProfile.id, gym_id: gym.id, status: "pending", is_primary: false,
    }).select("id").single();
    if (error) { toast.error("Failed to send request: " + error.message); setJoiningGym(false); return; }
    if (gym.claimed && gym.coach_id && linkData) {
      await supabase.rpc("create_notification", {
        _user_id: gym.coach_id, _title: "New gym join request",
        _message: `${fighterProfile.name} has requested to join ${gym.name}`,
        _type: "gym_request" as const, _reference_id: linkData.id,
      });
    }
    toast.success("Request sent — waiting for coach approval");
    setGymSearch(""); setGymResults([]); setJoiningGym(false); refetchGym();
  };

  const onSubmit = async (data: any) => {
    setSaving(true);
    const { error } = await supabase.from("fighter_profiles").update({
      name: data.name, date_of_birth: data.date_of_birth || null, weight_class: data.weight_class,
      discipline: data.discipline || null, stance: data.stance || null,
      fighting_substyle: data.fighting_substyle || null,
      height: data.height ? parseInt(data.height) : null, reach: data.reach ? parseInt(data.reach) : null,
      walk_around_weight_kg: data.walk_around_weight_kg ? parseFloat(data.walk_around_weight_kg) : null,
      bio: data.bio || null, country: data.country, training_background: data.training_background || null,
      years_training: data.years_training ? parseInt(data.years_training) : null, region: data.region || null,
    }).eq("id", fighterProfile.id);
    setSaving(false);
    if (error) { toast.error("Failed to update profile"); return; }
    toast.success("Profile updated"); setEditing(false); onRefresh();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/fighters/${fighterProfile.id}`);
    toast.success("Profile link copied to clipboard");
  };

  const handleCancel = () => { reset(); setEditing(false); };

  const p = fighterProfile;
  const gymDisplayName = gymAffiliation
    ? gymAffiliation.status === "approved" ? gymAffiliation.name : `Pending — ${gymAffiliation.name}`
    : "None";

  // Career stats
  const totalFights = p.record_wins + p.record_losses + p.record_draws;
  const winPct = totalFights > 0 ? Math.round((p.record_wins / totalFights) * 100) : 0;

  return (
    <div className="space-y-8">
      <ProfileCompletionBar fighterId={fighterProfile.id} fighterProfile={fighterProfile} />

      <div className="flex items-center justify-between">
        <div /> {/* No duplicate heading */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5 mr-1" /> Share Profile
          </Button>
          {!editing && (
            <Button size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <h3 className="font-heading text-sm text-muted-foreground mb-3 uppercase tracking-wide">Core Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Name</Label><Input {...register("name")} /></div>
              <div><Label>Date of Birth</Label><Input type="date" {...register("date_of_birth")} /></div>
              <div>
                <Label>Weight Class</Label>
                <Select value={watch("weight_class")} onValueChange={(v) => setValue("weight_class", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" side="bottom">
                    {Constants.public.Enums.weight_class.map((wc) => (<SelectItem key={wc} value={wc}>{formatEnum(wc)}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discipline</Label>
                <Select value={watch("discipline")} onValueChange={(v) => { setValue("discipline", v); setValue("fighting_substyle", ""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" side="bottom">
                    {DISCIPLINES.map((d) => (<SelectItem key={d} value={d}>{formatEnum(d)}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stance</Label>
                <Select value={watch("stance")} onValueChange={(v) => setValue("stance", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" side="bottom">
                    {STANCES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Height (cm)</Label><Input type="number" {...register("height")} /></div>
              <div><Label>Reach (cm)</Label><Input type="number" {...register("reach")} /></div>
              <div><Label>Walk-around Weight (kg)</Label><Input type="number" step="0.1" {...register("walk_around_weight_kg")} /></div>
              <div>
                <Label>Country</Label>
                <Select value={watch("country")} onValueChange={(v) => setValue("country", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" side="bottom">
                    {Constants.public.Enums.country_code.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-heading text-sm text-muted-foreground mb-3 uppercase tracking-wide">Training Background</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Training Background</Label>
                <Textarea {...register("training_background")} rows={2} placeholder="e.g. Wrestling base, BJJ, Boxing" />
              </div>
              <div><Label>Years Training</Label><Input type="number" {...register("years_training")} placeholder="e.g. 5" /></div>
              <div><Label>Region</Label><Input {...register("region")} placeholder="e.g. South London" /></div>
            </div>
          </div>

          <div>
            <h3 className="font-heading text-sm text-muted-foreground mb-3 uppercase tracking-wide">Fighting Style</h3>
            {watchedDiscipline && substyleOptions.length > 0 ? (
              <>
                <Select value={watch("fighting_substyle")} onValueChange={(v) => setValue("fighting_substyle", v)}>
                  <SelectTrigger className="w-full md:w-64"><SelectValue placeholder="Select your style" /></SelectTrigger>
                  <SelectContent position="popper" side="bottom">
                    {substyleOptions.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Without a fighting style, the matchmaking style contrast dimension defaults to 0.50.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Set your discipline above to unlock style options.</p>
            )}
          </div>

          <div><Label>Bio</Label><Textarea {...register("bio")} rows={3} placeholder="Tell your story..." /></div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}><Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving..." : "Save Changes"}</Button>
            <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Profile Details */}
          <div>
            <h3 className="font-heading text-lg text-foreground mb-4">
              PROFILE <span className="text-primary">DETAILS</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Name", value: p.name },
                { label: "Date of Birth", value: p.date_of_birth || "—" },
                { label: "Weight Class", value: formatEnum(p.weight_class) },
                { label: "Discipline", value: p.discipline ? formatEnum(p.discipline) : "—" },
                { label: "Stance", value: p.stance || "—" },
                { label: "Substyle", value: p.fighting_substyle || "—" },
                { label: "Height", value: p.height ? `${p.height} cm` : "—" },
                { label: "Reach", value: p.reach ? `${p.reach} cm` : "—" },
                { label: "Walk-around Weight", value: p.walk_around_weight_kg ? `${p.walk_around_weight_kg} kg` : "—" },
                { label: "Country", value: p.country },
                { label: "Region", value: p.region || "—" },
                { label: "Years Training", value: p.years_training || "—" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-medium text-foreground mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Training background text block */}
            {p.training_background && (
              <div className="mt-4 rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">Training Background</p>
                <p className="text-foreground text-sm leading-relaxed">{p.training_background}</p>
              </div>
            )}

            {/* Gym affiliation */}
            <div className="mt-4 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Gym Affiliation</p>
                  <p className="font-medium text-foreground mt-0.5">{gymDisplayName}</p>
                </div>
                {p.verified ? (
                  <Badge className="bg-success/10 text-success border-success/30 text-[10px] gap-1">
                    <ShieldCheck className="h-3 w-3" /> Coach Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">Self-reported</Badge>
                )}
              </div>
            </div>

            {/* Join a gym */}
            {!gymAffiliation && (
              <div className="mt-4 rounded-lg border border-border bg-card p-4 space-y-3">
                <h4 className="font-heading text-sm text-foreground">JOIN A GYM</h4>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={gymSearch} onChange={(e) => setGymSearch(e.target.value)} placeholder="Search gyms..." className="pl-9" />
                </div>
                {gymResults.length > 0 && (
                  <div className="border border-border rounded-md overflow-hidden">
                    {gymResults.map((gym) => (
                      <button key={gym.id} onClick={() => handleJoinGym(gym)} disabled={joiningGym} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors text-foreground">
                        {gym.name}{gym.city ? ` — ${gym.city}` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>


            {/* Physical Stats 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Height</p>
                <p className="font-heading text-xl text-foreground">{p.height ? `${p.height} cm` : "—"}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Walk-Around Weight</p>
                <p className="font-heading text-xl text-foreground">{p.walk_around_weight_kg ? `${p.walk_around_weight_kg} kg` : "—"}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Age</p>
                <p className="font-heading text-xl text-foreground">{p.date_of_birth ? `${Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}` : "—"}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Country / Region</p>
                <p className="font-heading text-xl text-foreground">{[p.country, p.region].filter(Boolean).join(", ") || "—"}</p>
              </div>
            </div>

          {/* Bio */}
          {p.bio && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Bio</p>
              <p className="text-foreground text-sm leading-relaxed">{p.bio}</p>
            </div>
          )}

          {/* Section 3: Fight History */}
          <div>
            <h3 className="font-heading text-lg text-foreground mb-4">
              FIGHT <span className="text-primary">HISTORY</span>
            </h3>
            <FighterFightHistory fighterId={fighterProfile.id} fighterUserId={userId} isOwner={true} />
          </div>
        </div>
      )}
    </div>
  );
}
