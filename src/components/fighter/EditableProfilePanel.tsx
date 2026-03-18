import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Share2, Save, Pencil } from "lucide-react";
import { formatEnum } from "@/lib/format";
import { FighterFightHistory } from "./FighterFightHistory";
import { Constants } from "@/integrations/supabase/types";

interface EditableProfilePanelProps {
  fighterProfile: any;
  userId: string;
  onRefresh: () => void;
}

const DISCIPLINES = ["boxing", "muay_thai", "mma", "kickboxing", "bjj"];
const STANCES = ["Orthodox", "Southpaw", "Switch"];

export function EditableProfilePanel({ fighterProfile, userId, onRefresh }: EditableProfilePanelProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

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
    },
  });

  const onSubmit = async (data: any) => {
    setSaving(true);
    const { error } = await supabase
      .from("fighter_profiles")
      .update({
        name: data.name,
        date_of_birth: data.date_of_birth || null,
        weight_class: data.weight_class,
        discipline: data.discipline || null,
        stance: data.stance || null,
        fighting_substyle: data.fighting_substyle || null,
        height: data.height ? parseInt(data.height) : null,
        reach: data.reach ? parseInt(data.reach) : null,
        walk_around_weight_kg: data.walk_around_weight_kg ? parseFloat(data.walk_around_weight_kg) : null,
        bio: data.bio || null,
        country: data.country,
      })
      .eq("id", fighterProfile.id);

    setSaving(false);
    if (error) {
      toast.error("Failed to update profile");
      return;
    }
    toast.success("Profile updated");
    setEditing(false);
    onRefresh();
  };

  const handleShare = () => {
    const url = `${window.location.origin}/fighters/${fighterProfile.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied to clipboard");
  };

  const handleCancel = () => {
    reset();
    setEditing(false);
  };

  const p = fighterProfile;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-foreground">
          MY <span className="text-primary">PROFILE</span>
        </h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input {...register("name")} />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" {...register("date_of_birth")} />
            </div>
            <div>
              <Label>Weight Class</Label>
              <Select value={watch("weight_class")} onValueChange={(v) => setValue("weight_class", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.weight_class.map((wc) => (
                    <SelectItem key={wc} value={wc}>{formatEnum(wc)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Discipline</Label>
              <Select value={watch("discipline")} onValueChange={(v) => setValue("discipline", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISCIPLINES.map((d) => (
                    <SelectItem key={d} value={d}>{formatEnum(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stance</Label>
              <Select value={watch("stance")} onValueChange={(v) => setValue("stance", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STANCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fighting Substyle</Label>
              <Input {...register("fighting_substyle")} placeholder="e.g. Clinch-Heavy" />
            </div>
            <div>
              <Label>Height (cm)</Label>
              <Input type="number" {...register("height")} />
            </div>
            <div>
              <Label>Reach (cm)</Label>
              <Input type="number" {...register("reach")} />
            </div>
            <div>
              <Label>Walk-around Weight (kg)</Label>
              <Input type="number" step="0.1" {...register("walk_around_weight_kg")} />
            </div>
            <div>
              <Label>Country</Label>
              <Select value={watch("country")} onValueChange={(v) => setValue("country", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.country_code.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea {...register("bio")} rows={3} placeholder="Tell your story..." />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Read-only profile display */}
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
              { label: "Pro Record", value: `${p.record_wins}W-${p.record_losses}L-${p.record_draws}D` },
              { label: "Amateur Record", value: `${p.amateur_wins ?? 0}W-${p.amateur_losses ?? 0}L-${p.amateur_draws ?? 0}D` },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="font-medium text-foreground mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          {p.bio && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Bio</p>
              <p className="text-foreground text-sm leading-relaxed">{p.bio}</p>
            </div>
          )}
        </div>
      )}

      {/* Fight History Section */}
      <FighterFightHistory fighterId={fighterProfile.id} fighterUserId={userId} isOwner={true} />
    </div>
  );
}
