import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Sparkles, PlusCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { FighterSearchDropdown } from "./FighterSearchDropdown";
import { MatchSuggestionsPanel } from "./MatchSuggestionsPanel";
import { Constants } from "@/integrations/supabase/types";
import { formatEnum } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];
type WeightClass = Database["public"]["Enums"]["weight_class"];
type FightSlot = Database["public"]["Tables"]["fight_slots"]["Row"];

const WEIGHT_CLASSES = Constants.public.Enums.weight_class;
const DISCIPLINES = Constants.public.Enums.fighting_style;
const ROUND_TIMES = [1, 2, 3, 5, 10];

interface AddFightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  sectionType: "Main Event" | "Undercard";
  nextSlotNumber: number;
  onSuccess: () => void;
  existingFighterIds: string[];
  fightSlot?: FightSlot | null;
  /** Pre-fill for Find Matches mode */
  prefillSlot?: any;
  mode?: "add" | "find";
}

async function notifyBoutParties(fighterA: FighterProfile, fighterB: FighterProfile, eventId: string, slotId: string) {
  const notifyIds = new Set<string>();
  if (fighterA.user_id) notifyIds.add(fighterA.user_id);
  if (fighterB.user_id) notifyIds.add(fighterB.user_id);
  if (fighterA.created_by_coach_id) notifyIds.add(fighterA.created_by_coach_id);
  if (fighterB.created_by_coach_id) notifyIds.add(fighterB.created_by_coach_id);
  const { data: gymLinks } = await supabase
    .from("fighter_gym_links")
    .select("fighter_id, gym:gyms(coach_id)")
    .in("fighter_id", [fighterA.id, fighterB.id])
    .eq("status", "approved");
  (gymLinks ?? []).forEach((link: any) => {
    const gym = Array.isArray(link.gym) ? link.gym[0] : link.gym;
    if (gym?.coach_id) notifyIds.add(gym.coach_id);
  });
  const { data: evt } = await supabase.from("events").select("title").eq("id", eventId).single();
  const eventTitle = evt?.title ?? "an event";
  await Promise.all(
    Array.from(notifyIds).map((uid) =>
      supabase.rpc("create_notification", {
        _user_id: uid,
        _title: "New Fight Proposal",
        _message: `${fighterA.name} vs ${fighterB.name} has been proposed for ${eventTitle}.`,
        _type: "match_proposed" as any,
        _reference_id: slotId,
      })
    )
  );
}

type Step = "menu" | "manual" | "suggested" | "open";

export function AddFightModal({
  open,
  onOpenChange,
  eventId,
  sectionType,
  nextSlotNumber,
  onSuccess,
  existingFighterIds,
  fightSlot,
  prefillSlot,
  mode = "add",
}: AddFightModalProps) {
  const { toast } = useToast();
  const { user, effectiveRoles } = useAuth();
  const isCoach = effectiveRoles.includes("coach");
  const [step, setStep] = useState<Step>("menu");
  const [loading, setLoading] = useState(false);

  // Manual state
  const [fighterA, setFighterA] = useState<FighterProfile | null>(null);
  const [fighterB, setFighterB] = useState<FighterProfile | null>(null);
  const [manualWc, setManualWc] = useState<string>("");
  const [manualDisc, setManualDisc] = useState<string>("");
  const [manualRounds, setManualRounds] = useState<string>("");
  const [manualRoundTime, setManualRoundTime] = useState<string>("");
  const [manualWeightKg, setManualWeightKg] = useState<string>("");
  const [manualWeightLbs, setManualWeightLbs] = useState<string>("");

  // Open slot state
  const [openWc, setOpenWc] = useState<string>("");
  const [openDisc, setOpenDisc] = useState<string>("");
  const [openRounds, setOpenRounds] = useState<string>("");
  const [openRoundTime, setOpenRoundTime] = useState<string>("");
  const [openWeightKg, setOpenWeightKg] = useState<string>("");
  const [openWeightLbs, setOpenWeightLbs] = useState<string>("");

  const reset = () => {
    setStep("menu");
    setFighterA(null);
    setFighterB(null);
    setManualWc("");
    setManualDisc("");
    setManualRounds("");
    setManualRoundTime("");
    setManualWeightKg("");
    setManualWeightLbs("");
    setOpenWc("");
    setOpenDisc("");
    setOpenRounds("");
    setOpenRoundTime("");
    setOpenWeightKg("");
    setOpenWeightLbs("");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleManualSave = async () => {
    if (!fighterA && !fighterB) {
      toast({ title: "Select at least one fighter", variant: "destructive" });
      return;
    }
    setLoading(true);
    const wc = manualWc || fighterA?.weight_class || fighterB?.weight_class || null;

    if (prefillSlot && mode === "find") {
      // Update existing slot
      const update: any = {};
      if (fighterA && !prefillSlot.fighter_a_id) update.fighter_a_id = fighterA.id;
      if (fighterB && !prefillSlot.fighter_b_id) update.fighter_b_id = fighterB.id;
      if (fighterA && fighterB) update.status = "proposed";
      if (wc) update.weight_class = wc;
      if (manualRounds) update.rounds = parseInt(manualRounds);
      if (manualRoundTime) update.round_duration_minutes = parseInt(manualRoundTime);

      const { error } = await supabase.from("event_fight_slots").update(update).eq("id", prefillSlot.id);
      if (error) {
        toast({ title: "Error updating slot", description: error.message, variant: "destructive" });
      } else {
        if (fighterA && fighterB) {
          await notifyBoutParties(fighterA, fighterB, eventId, prefillSlot.id);
          toast({ title: "Fight proposed — awaiting acceptance" });
        } else {
          toast({ title: "Fighter added to slot" });
        }
        onSuccess();
        handleClose(false);
      }
    } else {
      // Create new slot
      const { data: inserted, error } = await supabase
        .from("event_fight_slots")
        .insert({
          event_id: eventId,
          slot_number: nextSlotNumber,
          fighter_a_id: fighterA?.id || null,
          fighter_b_id: fighterB?.id || null,
          weight_class: wc,
          discipline: manualDisc || null,
          bout_type: sectionType,
          status: fighterA && fighterB ? "proposed" : "open",
          is_public: false,
          rounds: manualRounds ? parseInt(manualRounds) : null,
          round_duration_minutes: manualRoundTime ? parseInt(manualRoundTime) : null,
        })
        .select("id")
        .single();

      if (error) {
        toast({ title: "Error adding fight", description: error.message, variant: "destructive" });
      } else if (inserted && fighterA && fighterB) {
        await notifyBoutParties(fighterA, fighterB, eventId, inserted.id);
        toast({ title: "Fight proposed — awaiting acceptance" });
        onSuccess();
        handleClose(false);
      } else {
        toast({ title: fighterA || fighterB ? "Fighter added — other side TBA" : "Open slot created" });
        onSuccess();
        handleClose(false);
      }
    }
    setLoading(false);
  };

  const handleOpenSlotSave = async () => {
    setLoading(true);
    const { error } = await supabase.from("event_fight_slots").insert({
      event_id: eventId,
      slot_number: nextSlotNumber,
      fighter_a_id: null,
      fighter_b_id: null,
      weight_class: openWc || null,
      discipline: openDisc || null,
      bout_type: sectionType,
      status: "open",
      is_public: true,
      rounds: openRounds ? parseInt(openRounds) : null,
      round_duration_minutes: openRoundTime ? parseInt(openRoundTime) : null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error adding open slot", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Open slot added" });
      onSuccess();
      handleClose(false);
    }
  };

  const handleSuggestionSelect = async (a: FighterProfile, b: FighterProfile) => {
    setLoading(true);
    const wc = a.weight_class || b.weight_class;

    if (prefillSlot && mode === "find") {
      // Scenario B/C — update existing TBA slot
      const update: any = {};
      if (!prefillSlot.fighter_a_id) update.fighter_a_id = a.id;
      else update.fighter_b_id = b.id;
      if (!prefillSlot.fighter_b_id && prefillSlot.fighter_a_id) update.fighter_b_id = b.id;
      else if (!prefillSlot.fighter_a_id) { update.fighter_a_id = a.id; update.fighter_b_id = b.id; }
      update.status = "proposed";
      if (wc) update.weight_class = wc;

      const { error } = await supabase.from("event_fight_slots").update(update).eq("id", prefillSlot.id);
      if (!error) {
        await notifyBoutParties(a, b, eventId, prefillSlot.id);
        toast({ title: "Fight proposed — awaiting acceptance" });
        onSuccess();
        handleClose(false);
      } else {
        toast({ title: "Error updating slot", description: error.message, variant: "destructive" });
      }
    } else {
      // Scenario A — create new slot with suggested fighters
      const { data: inserted, error } = await supabase
        .from("event_fight_slots")
        .insert({
          event_id: eventId,
          slot_number: nextSlotNumber,
          fighter_a_id: a.id,
          fighter_b_id: b.id,
          weight_class: wc,
          bout_type: sectionType,
          status: "proposed",
          is_public: false,
        })
        .select("id")
        .single();

      if (!error && inserted) {
        await notifyBoutParties(a, b, eventId, inserted.id);
      }
      toast({ title: error ? "Error" : "Fight proposed — awaiting acceptance", variant: error ? "destructive" : undefined });
      if (!error) {
        onSuccess();
        handleClose(false);
      }
    }
    setLoading(false);
  };

  const title = mode === "find" ? "Find Matches" : "Add Fight";

  const optionCard = (icon: React.ReactNode, label: string, desc: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 text-left transition-all duration-150"
      style={{
        background: "#1a1e28",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
        padding: "14px 16px",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#222736";
        e.currentTarget.style.borderColor = "rgba(232,160,32,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#1a1e28";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
      }}
    >
      <div style={{ color: "#e8a020", flexShrink: 0 }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p style={{ fontWeight: 600, fontSize: 15, color: "#e8eaf0" }}>{label}</p>
        <p style={{ fontSize: 13, color: "#8b909e", marginTop: 2 }}>{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "#555b6b" }} />
    </button>
  );

  const paramFields = (
    wc: string, setWc: (v: string) => void,
    disc: string, setDisc: (v: string) => void,
    rounds: string, setRounds: (v: string) => void,
    roundTime: string, setRoundTime: (v: string) => void,
    weightKg: string, setWeightKg: (v: string) => void,
    weightLbs: string, setWeightLbs: (v: string) => void,
  ) => (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label style={{ fontSize: 11, color: "#8b909e" }}>Weight Class</Label>
        <Select value={wc || "any"} onValueChange={(v) => setWc(v === "any" ? "" : v)}>
          <SelectTrigger className="h-9 text-sm" style={{ background: "#1a1e28" }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {WEIGHT_CLASSES.map((w) => (
              <SelectItem key={w} value={w}>{formatEnum(w)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label style={{ fontSize: 11, color: "#8b909e" }}>Discipline</Label>
        <Select value={disc || "any"} onValueChange={(v) => setDisc(v === "any" ? "" : v)}>
          <SelectTrigger className="h-9 text-sm" style={{ background: "#1a1e28" }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {DISCIPLINES.map((d) => (
              <SelectItem key={d} value={d}>{formatEnum(d)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label style={{ fontSize: 11, color: "#8b909e" }}>Specific Weight (kg)</Label>
        <Input
          type="number"
          min={40}
          max={120}
          step={0.1}
          placeholder="e.g. 70.0"
          value={weightKg}
          onChange={(e) => {
            const kg = e.target.value;
            setWeightKg(kg);
            if (kg) setWeightLbs((parseFloat(kg) * 2.2046).toFixed(1));
            else setWeightLbs("");
          }}
          className="h-9 text-sm"
          style={{ background: "#1a1e28" }}
        />
      </div>
      <div className="space-y-1">
        <Label style={{ fontSize: 11, color: "#8b909e" }}>Specific Weight (lbs)</Label>
        <Input
          type="number"
          min={88}
          max={265}
          step={0.1}
          placeholder="e.g. 154.3"
          value={weightLbs}
          onChange={(e) => {
            const lbs = e.target.value;
            setWeightLbs(lbs);
            if (lbs) setWeightKg((parseFloat(lbs) / 2.2046).toFixed(1));
            else setWeightKg("");
          }}
          className="h-9 text-sm"
          style={{ background: "#1a1e28" }}
        />
      </div>
      <div className="space-y-1">
        <Label style={{ fontSize: 11, color: "#8b909e" }}>Rounds</Label>
        <Input
          type="number"
          min={1}
          max={15}
          placeholder="e.g. 3"
          value={rounds}
          onChange={(e) => setRounds(e.target.value)}
          className="h-9 text-sm"
          style={{ background: "#1a1e28" }}
        />
      </div>
      <div className="space-y-1">
        <Label style={{ fontSize: 11, color: "#8b909e" }}>Time / Round</Label>
        <Select value={roundTime || "any"} onValueChange={(v) => setRoundTime(v === "any" ? "" : v)}>
          <SelectTrigger className="h-9 text-sm" style={{ background: "#1a1e28" }}>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {ROUND_TIMES.map((t) => (
              <SelectItem key={t} value={String(t)}>{t} min</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto"
        style={{
          background: "#14171e",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          width: "min(540px, 95vw)",
          maxWidth: "95vw",
          padding: 24,
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        }}
      >
        {step === "menu" && (
          <>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#e8eaf0" }}>
                {title}
              </DialogTitle>
              {mode === "find" && prefillSlot && (
                <p style={{ fontSize: 12, color: "#8b909e", marginTop: 4 }}>
                  {prefillSlot.weight_class ? formatEnum(prefillSlot.weight_class) : "Open Weight"}
                  {prefillSlot.discipline ? ` · ${formatEnum(prefillSlot.discipline)}` : ""}
                </p>
              )}
            </DialogHeader>
            <div className="space-y-2 mt-4">
              {optionCard(
                <UserPlus className="h-5 w-5" />,
                "Add Fight Manually",
                "Choose fighters and parameters yourself",
                () => setStep("manual")
              )}
              {optionCard(
                <Sparkles className="h-5 w-5" />,
                "Add Suggested Fight",
                "Get AI-matched suggestions based on your event goals",
                () => setStep("suggested")
              )}
              {mode === "add" && optionCard(
                <PlusCircle className="h-5 w-5" />,
                "Add Open Slot",
                "Reserve a slot with parameters but no fighters yet",
                () => setStep("open")
              )}
            </div>
          </>
        )}

        {step === "manual" && (
          <>
            <button
              onClick={() => setStep("menu")}
              className="flex items-center gap-1 mb-3 text-sm transition-colors"
              style={{ color: "#8b909e", background: "none", border: "none", cursor: "pointer" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#e8eaf0" }}>
                Manual Fighter Selection
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-3">
              {paramFields(manualWc, setManualWc, manualDisc, setManualDisc, manualRounds, setManualRounds, manualRoundTime, setManualRoundTime)}

              <FighterSearchDropdown
                label="Fighter A"
                selected={fighterA}
                onSelect={setFighterA}
                onClear={() => setFighterA(null)}
                excludeId={fighterB?.id}
                coachId={isCoach ? user?.id : null}
                eventId={eventId}
              />
              <FighterSearchDropdown
                label="Fighter B"
                selected={fighterB}
                onSelect={setFighterB}
                onClear={() => setFighterB(null)}
                excludeId={fighterA?.id}
                coachId={isCoach ? user?.id : null}
                eventId={eventId}
              />

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={() => handleClose(false)} style={{ color: "#8b909e" }}>Cancel</Button>
                <Button
                  onClick={handleManualSave}
                  disabled={loading || (!fighterA && !fighterB)}
                  style={{
                    background: "#e8a020",
                    color: "#0d0f12",
                    fontWeight: 600,
                    borderRadius: 8,
                  }}
                >
                  {loading ? "Saving..." : fighterA && fighterB ? "Create Proposal" : "Add Fighter"}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "suggested" && (
          <>
            <button
              onClick={() => setStep("menu")}
              className="flex items-center gap-1 mb-3 text-sm transition-colors"
              style={{ color: "#8b909e", background: "none", border: "none", cursor: "pointer" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#e8eaf0" }}>
                Suggested Matches
              </DialogTitle>
            </DialogHeader>
            <div className="mt-3">
              {!fightSlot && !prefillSlot && (
                <div
                  style={{
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 12,
                    fontSize: 12,
                    color: "#f59e0b",
                  }}
                >
                  No open slots found — a new slot will be created when you confirm a match
                </div>
              )}
              <MatchSuggestionsPanel
                slot={fightSlot ?? undefined}
                existingProposalFighterIds={existingFighterIds}
                onSelectPair={handleSuggestionSelect}
                eventId={eventId}
                weightClassOverride={prefillSlot?.weight_class ?? null}
                disciplineOverride={prefillSlot?.discipline ?? null}
              />
            </div>
          </>
        )}

        {step === "open" && (
          <>
            <button
              onClick={() => setStep("menu")}
              className="flex items-center gap-1 mb-3 text-sm transition-colors"
              style={{ color: "#8b909e", background: "none", border: "none", cursor: "pointer" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#e8eaf0" }}>
                Add Open Slot
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-3">
              {paramFields(openWc, setOpenWc, openDisc, setOpenDisc, openRounds, setOpenRounds, openRoundTime, setOpenRoundTime)}
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={() => handleClose(false)} style={{ color: "#8b909e" }}>Cancel</Button>
                <Button
                  onClick={handleOpenSlotSave}
                  disabled={loading}
                  style={{
                    background: "#e8a020",
                    color: "#0d0f12",
                    fontWeight: 600,
                    borderRadius: 8,
                  }}
                >
                  {loading ? "Adding..." : "Add Slot"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
