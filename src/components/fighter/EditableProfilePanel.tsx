import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Share2, Save, Pencil, ShieldCheck, Info, Search, Upload, Camera } from "lucide-react";
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [heroRecordFilter, setHeroRecordFilter] = useState<"pro" | "amateur" | "total">("pro");

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
      postcode: fighterProfile.postcode || "",
    },
  });

  const watchedDiscipline = watch("discipline");
  const substyleOptions = SUBSTYLE_MAP[watchedDiscipline] ?? [];

  const { data: gymAffiliation, refetch: refetchGym } = useQuery({
    queryKey: ["fighter-gym-affiliation", fighterProfile.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("id, status, gym:gyms!fighter_gym_links_gym_id_fkey(name)")
        .eq("fighter_id", fighterProfile.id)
        .in("status", ["approved", "pending"])
        .limit(1);
      if (!data || data.length === 0) return null;
      const link = data[0] as any;
      return { id: link.id, name: link.gym?.name ?? "Unknown", status: link.status };
    },
    enabled: !!fighterProfile.id,
  });

  // Fetch fights for analytics
  const { data: fights = [] } = useQuery({
    queryKey: ["fighter-fights-profile", fighterProfile.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fights")
        .select("*")
        .eq("fighter_a_id", fighterProfile.id)
        .order("event_date", { ascending: false });
      return data ?? [];
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

  const handleLeaveGym = async () => {
    if (!gymAffiliation) return;
    await supabase.from("fighter_gym_links").update({ status: "declined" }).eq("id", gymAffiliation.id);
    toast.success("Left gym");
    refetchGym();
  };

  const handleCancelRequest = async () => {
    if (!gymAffiliation) return;
    await supabase.from("fighter_gym_links").delete().eq("id", gymAffiliation.id);
    toast.success("Request cancelled");
    refetchGym();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed"); setUploadingPhoto(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("fighter_profiles").update({ profile_image: urlData.publicUrl }).eq("id", fighterProfile.id);
    toast.success("Photo updated");
    setUploadingPhoto(false);
    onRefresh();
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
      postcode: data.postcode || null,
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

  // Computed stats
  const proFights = fights.filter((f: any) => !f.is_amateur);
  const amFights = fights.filter((f: any) => f.is_amateur);
  const totalFights = fights.length;
  const proWins = proFights.filter((f: any) => f.result === "win").length;
  const proLosses = proFights.filter((f: any) => f.result === "loss").length;
  const proDraws = proFights.filter((f: any) => f.result === "draw").length;
  const amWins = amFights.filter((f: any) => f.result === "win").length;
  const amLosses = amFights.filter((f: any) => f.result === "loss").length;
  const amDraws = amFights.filter((f: any) => f.result === "draw").length;
  const winPct = totalFights > 0 ? Math.round((fights.filter((f: any) => f.result === "win").length / totalFights) * 100) : 0;
  const finishes = fights.filter((f: any) => f.result === "win" && f.method && !f.method.toLowerCase().includes("decision")).length;
  const finishRate = proWins > 0 ? Math.round((finishes / proWins) * 100) : 0;
  const koCount = fights.filter((f: any) => f.result === "win" && f.method && (f.method.toLowerCase().includes("ko") || f.method.toLowerCase().includes("tko"))).length;
  const koPct = proWins > 0 ? Math.round((koCount / proWins) * 100) : 0;
  const expTier = proFights.length === 0 ? "T0" : proFights.length <= 3 ? "T1" : proFights.length <= 9 ? "T2" : "T3";

  const age = p.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;


  return (
    <div className="space-y-8">
      <ProfileCompletionBar fighterId={fighterProfile.id} fighterProfile={fighterProfile} />

      <div className="flex items-center justify-between">
        <div />
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
              <div><Label>Region</Label><Input {...register("region")} placeholder="e.g. South London" /></div>
              <div><Label>Postcode</Label><Input {...register("postcode")} placeholder="e.g. SW1A 1AA" /></div>
            </div>
          </div>

          <div>
            <h3 className="font-heading text-sm text-muted-foreground mb-3 uppercase tracking-wide">Training Background</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Training Background</Label>
                <Textarea {...register("training_background")} rows={4} placeholder="e.g. Wrestling base, BJJ, Boxing" />
              </div>
              <div><Label>Years Training</Label><Input type="number" {...register("years_training")} placeholder="e.g. 5" /></div>
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
          {/* === HERO SECTION === */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* Photo - Left ~35% */}
              <div className="relative w-full md:w-[35%] aspect-square md:aspect-auto bg-muted flex items-center justify-center min-h-[200px] md:min-h-[280px]">
                {p.profile_image ? (
                  <img src={p.profile_image} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-heading text-6xl text-primary">
                    {p.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                )}
                <label className="absolute bottom-3 right-3 cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                  <div className="h-9 w-9 rounded-full bg-card/80 backdrop-blur flex items-center justify-center border border-border hover:bg-card transition-colors">
                    <Camera className="h-4 w-4 text-foreground" />
                  </div>
                </label>
              </div>

              {/* Right side info */}
              <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                <div>
                  <h2 className="font-heading text-2xl md:text-3xl text-foreground">{p.name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {gymAffiliation?.status === "approved" ? gymAffiliation.name : gymAffiliation?.status === "pending" ? `Pending — ${gymAffiliation.name}` : "No gym affiliated"}
                  </p>
                </div>

                {/* Pro / Amateur / Total toggle + W / L / D / Win% boxes */}
                {(() => {
                  const [recordFilter, setRecordFilter] = [heroRecordFilter, setHeroRecordFilter];
                  const filtered = recordFilter === "pro" ? fights.filter((f: any) => !f.is_amateur) : recordFilter === "amateur" ? fights.filter((f: any) => f.is_amateur) : fights;
                  const w = filtered.filter((f: any) => f.result === "win").length;
                  const l = filtered.filter((f: any) => f.result === "loss").length;
                  const d = filtered.filter((f: any) => f.result === "draw").length;
                  const total = filtered.length;
                  const wp = total > 0 ? Math.round((w / total) * 100) : 0;
                  return (
                    <>
                      <div className="flex gap-1 mt-4 mb-2">
                        {(["pro", "amateur", "total"] as const).map((opt) => (
                          <button key={opt} onClick={() => setRecordFilter(opt)} className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${recordFilter === opt ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="rounded-lg bg-primary p-3 text-center">
                          <p className="text-[10px] uppercase tracking-widest text-primary-foreground/70">Wins</p>
                          <p className="font-heading text-3xl text-primary-foreground">{w}</p>
                        </div>
                        <div className="rounded-lg bg-destructive p-3 text-center">
                          <p className="text-[10px] uppercase tracking-widest text-destructive-foreground/70">Losses</p>
                          <p className="font-heading text-3xl text-destructive-foreground">{l}</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3 text-center">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Draws</p>
                          <p className="font-heading text-3xl text-foreground">{d}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-3 text-center">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Win%</p>
                          <p className="font-heading text-3xl text-primary">{wp}%</p>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Physical stats 2x2 */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Height</p>
                    <p className="font-heading text-lg text-foreground">{p.height ? `${p.height} cm` : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Walk-Around</p>
                    <p className="font-heading text-lg text-foreground">{p.walk_around_weight_kg ? `${p.walk_around_weight_kg} kg` : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Age</p>
                    <p className="font-heading text-lg text-foreground">{age ?? "—"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Country / Region</p>
                    <p className="font-heading text-lg text-foreground">{[p.country, p.region].filter(Boolean).join(", ") || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* === CAREER STATS BAR === */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Fights</p>
                <p className="font-heading text-xl text-foreground">{totalFights}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Pro Record</p>
                <p className="font-heading text-xl text-foreground">{proWins}W-{proLosses}L-{proDraws}D</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Amateur Record</p>
                <p className="font-heading text-xl text-foreground">{amWins}W-{amLosses}L-{amDraws}D</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Finish Rate</p>
                <p className="font-heading text-xl text-primary">{finishRate}%</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">KO%</p>
                <p className="font-heading text-xl text-primary">{koPct}%</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Experience</p>
                <p className="font-heading text-xl text-foreground">{expTier}</p>
              </div>
            </div>
          </div>


          {/* === TRAINING BACKGROUND === */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-heading text-sm text-foreground mb-2 uppercase tracking-wide">Training Background</h3>
            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {p.training_background || "No training background added yet."}
            </p>
            {p.years_training && (
              <p className="text-xs text-muted-foreground mt-3">{p.years_training} years training</p>
            )}
          </div>

          {/* === GYM AFFILIATION === */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-heading text-sm text-foreground mb-3 uppercase tracking-wide">Gym Affiliation</h3>
            {gymAffiliation?.status === "approved" ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-foreground font-medium">{gymAffiliation.name}</p>
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px]">
                    <ShieldCheck className="h-3 w-3 mr-0.5" /> Member
                  </Badge>
                </div>
                <Button variant="outline" size="sm" className="text-destructive" onClick={handleLeaveGym}>Leave Gym</Button>
              </div>
            ) : gymAffiliation?.status === "pending" ? (
              <div className="flex items-center justify-between">
                <p className="text-foreground">
                  <span className="text-amber-500">Pending</span> — {gymAffiliation.name}
                </p>
                <Button variant="outline" size="sm" onClick={handleCancelRequest}>Cancel Request</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">No gym affiliated. Search to join one.</p>
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

          {/* Bio */}
          {p.bio && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Bio</p>
              <p className="text-foreground text-sm leading-relaxed">{p.bio}</p>
            </div>
          )}

          {/* === FIGHT HISTORY (at the very bottom) === */}
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
