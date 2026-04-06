import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Award, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { formatEnum } from "@/lib/format";

const WEIGHT_CLASSES = [
  "strawweight","flyweight","bantamweight","featherweight","lightweight",
  "super_lightweight","welterweight","super_welterweight","middleweight",
  "super_middleweight","light_heavyweight","cruiserweight","heavyweight","super_heavyweight",
];

interface ManageFighterTitlesProps {
  fighterId: string;
  fighterName: string;
}

export function ManageFighterTitles({ fighterId, fighterName }: ManageFighterTitlesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [titleName, setTitleName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [weightClass, setWeightClass] = useState("");
  const [awardedAt, setAwardedAt] = useState("");
  const [isCurrent, setIsCurrent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: titles = [], isLoading } = useQuery({
    queryKey: ["fighter-titles", fighterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_titles")
        .select("*")
        .eq("fighter_id", fighterId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleAdd = async () => {
    if (!titleName.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("fighter_titles").insert({
      fighter_id: fighterId,
      title: titleName.trim(),
      organisation: organisation.trim() || null,
      weight_class: weightClass || null,
      awarded_by_coach_id: user.id,
      awarded_at: awardedAt || null,
      is_current: isCurrent,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to add title");
    } else {
      toast.success("Title added");
      setTitleName(""); setOrganisation(""); setWeightClass(""); setAwardedAt(""); setIsCurrent(true);
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ["fighter-titles", fighterId] });
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("fighter_titles").delete().eq("id", id);
    toast.success("Title removed");
    setConfirmDelete(null);
    queryClient.invalidateQueries({ queryKey: ["fighter-titles", fighterId] });
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award style={{ width: 14, height: 14, color: "#e8a020" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>Championship Titles</span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            fontSize: 12, fontWeight: 600, color: "#e8a020", background: "none",
            border: "1px solid rgba(232,160,32,0.3)", borderRadius: 6,
            padding: "4px 12px", cursor: "pointer",
          }}
        >
          <Plus style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
          Add Title
        </button>
      </div>

      {showAdd && (
        <div style={{
          background: "#14171e", borderRadius: 12, padding: 20, marginBottom: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}>
          <div className="space-y-3">
            <div>
              <Label style={{ fontSize: 12, color: "#8b909e" }}>Title Name *</Label>
              <Input placeholder="e.g. British Champion" value={titleName} onChange={(e) => setTitleName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label style={{ fontSize: 12, color: "#8b909e" }}>Organisation</Label>
              <Input placeholder="e.g. Cage Warriors" value={organisation} onChange={(e) => setOrganisation(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label style={{ fontSize: 12, color: "#8b909e" }}>Weight Class</Label>
              <Select value={weightClass} onValueChange={setWeightClass}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {WEIGHT_CLASSES.map((wc) => (
                    <SelectItem key={wc} value={wc}>{formatEnum(wc)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label style={{ fontSize: 12, color: "#8b909e" }}>Date Awarded</Label>
              <Input type="date" value={awardedAt} onChange={(e) => setAwardedAt(e.target.value)} className="mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isCurrent} onCheckedChange={setIsCurrent} />
              <Label style={{ fontSize: 12, color: "#8b909e" }}>Current Title</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={!titleName.trim() || saving} size="sm" style={{ background: "#e8a020", color: "#080a0d" }}>
                {saving ? "Adding..." : "Add Title"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {titles.length > 0 && (
        <div className="space-y-2">
          {titles.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between" style={{
              background: "#181c24", borderRadius: 8, padding: "10px 14px",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)",
            }}>
              <div>
                <div className="flex items-center gap-2">
                  <Award style={{ width: 12, height: 12, color: "#e8a020" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>{t.title}</span>
                  {t.is_current ? (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#22c55e", background: "rgba(34,197,94,0.12)", borderRadius: 4, padding: "1px 6px" }}>Current</span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#8b909e", background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "1px 6px" }}>Former</span>
                  )}
                </div>
                <div className="flex gap-2 mt-1" style={{ fontSize: 11, color: "#8b909e" }}>
                  {t.organisation && <span>{t.organisation}</span>}
                  {t.weight_class && <span>· {formatEnum(t.weight_class)}</span>}
                  {t.awarded_at && <span>· {new Date(t.awarded_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>}
                </div>
              </div>
              {confirmDelete === t.id ? (
                <div className="flex gap-1">
                  <button onClick={() => handleDelete(t.id)} style={{ fontSize: 11, color: "#ef4444", cursor: "pointer", background: "none", border: "none" }}>Confirm</button>
                  <button onClick={() => setConfirmDelete(null)} style={{ fontSize: 11, color: "#8b909e", cursor: "pointer", background: "none", border: "none" }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(t.id)} style={{ color: "#ef4444", cursor: "pointer", background: "none", border: "none" }}>
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
