import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Sparkles, PlusCircle, ArrowLeft, ArrowRight, Search } from "lucide-react";
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
  /** Pre-fill for Find Matches/Fights mode */
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

/**
 * Detect scenario from a prefill slot:
 * - "oneTBA": one fighter assigned, one NULL
 * - "bothTBA": both fighters NULL
 * - null: not a find mode
 */
function detectScenario(slot: any): "oneTBA" | "bothTBA" | null {
  if (!slot) return null;
  const hasA = !!slot.fighter_a_id;
  const hasB = !!slot.fighter_b_id;
  if (hasA && !hasB) return "oneTBA";
  if (!hasA && hasB) return "oneTBA";
  if (!hasA && !hasB) return "bothTBA";
  return null;
}

function getAnchorFighter(slot: any): FighterProfile | null {
  if (!slot) return null;
  const unwrap = (v: any) => Array.isArray(v) ? v[0] : v;
  if (slot.fighter_a_id && !slot.fighter_b_id) return unwrap(slot.fighter_a) ?? null;
  if (!slot.fighter_a_id && slot.fighter_b_id) return unwrap(slot.fighter_b) ?? null;
  return null;
}

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

  const scenario = mode === "find" ? detectScenario(prefillSlot) : null;
  const anchorFighter = scenario === "oneTBA" ? getAnchorFighter(prefillSlot) : null;

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

  // ─── Manual Save ───
  const handleManualSave = async () => {
    if (scenario === "oneTBA") {
      // Only need one fighter for the TBA side
      const selected = fighterA || fighterB;
      if (!selected) {
        toast({ title: "Select a fighter", variant: "destructive" });
        return;
      }
    } else if (!fighterA && !fighterB) {
      toast({ title: "Select at least one fighter", variant: "destructive" });
      return;
    }
    setLoading(true);
    const wc = manualWc || fighterA?.weight_class || fighterB?.weight_class || null;

    if (prefillSlot && mode === "find") {
      // Entry Point 2/3: UPDATE existing slot
      const update: any = {};
      if (scenario === "oneTBA") {
        const selected = fighterA || fighterB;
        if (!prefillSlot.fighter_a_id) update.fighter_a_id = selected!.id;
        else if (!prefillSlot.fighter_b_id) update.fighter_b_id = selected!.id;
        // Check if both sides now have fighters
        const bothFilled = (prefillSlot.fighter_a_id || update.fighter_a_id) && (prefillSlot.fighter_b_id || update.fighter_b_id);
        if (bothFilled) update.status = "proposed";
      } else {
        // bothTBA — need both
        if (fighterA) update.fighter_a_id = fighterA.id;
        if (fighterB) update.fighter_b_id = fighterB.id;
        if (fighterA && fighterB) update.status = "proposed";
      }
      if (wc) update.weight_class = wc;
      if (manualRounds) update.rounds = parseInt(manualRounds);
      if (manualRoundTime) update.round_duration_minutes = parseInt(manualRoundTime);

      const { error } = await supabase.from("event_fight_slots").update(update).eq("id", prefillSlot.id);
      if (error) {
        toast({ title: "Error updating slot", description: error.message, variant: "destructive" });
      } else {
        if (update.status === "proposed" && fighterA && fighterB) {
          await notifyBoutParties(fighterA, fighterB, eventId, prefillSlot.id);
          toast({ title: "Fight proposed — awaiting acceptance" });
        } else {
          toast({ title: "Fighter added to slot" });
        }
        onSuccess();
        handleClose(false);
      }
    } else {
      // Entry Point 1: INSERT new slot
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
          specific_weight_kg: manualWeightKg ? parseFloat(manualWeightKg) : null,
          specific_weight_lbs: manualWeightLbs ? parseFloat(manualWeightLbs) : null,
        } as any)
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
      specific_weight_kg: openWeightKg ? parseFloat(openWeightKg) : null,
      specific_weight_lbs: openWeightLbs ? parseFloat(openWeightLbs) : null,
    } as any);
    setLoading(false);
    if (error) {
      toast({ title: "Error adding open slot", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Open slot added" });
      onSuccess();
      handleClose(false);
    }
  };

  // ─── Suggestion select handler ───
  const handleSuggestionSelect = async (a: FighterProfile, b: FighterProfile) => {
    setLoading(true);
    const wc = a.weight_class || b.weight_class;

    if (prefillSlot && mode === "find") {
      // Entry Point 2/3: UPDATE existing slot
      const update: any = { status: "proposed" };
      if (scenario === "oneTBA") {
        // Only fill the NULL side
        if (!prefillSlot.fighter_a_id) update.fighter_a_id = a.id;
        else if (!prefillSlot.fighter_b_id) update.fighter_b_id = a.id; // 'a' is the selected opponent
      } else {
        // bothTBA — fill both
        update.fighter_a_id = a.id;
        update.fighter_b_id = b.id;
      }
      if (wc) update.weight_class = wc;

      const { error } = await supabase.from("event_fight_slots").update(update).eq("id", prefillSlot.id);
      if (!error) {
        // For oneTBA, we need to construct the full pair for notifications
        if (scenario === "oneTBA" && anchorFighter) {
          const opponent = a;
          await notifyBoutParties(anchorFighter, opponent, eventId, prefillSlot.id);
        } else {
          await notifyBoutParties(a, b, eventId, prefillSlot.id);
        }
        toast({ title: "Fight proposed — awaiting acceptance" });
        onSuccess();
        handleClose(false);
      } else {
        toast({ title: "Error updating slot", description: error.message, variant: "destructive" });
      }
    } else {
      // Entry Point 1: INSERT new slot
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

  // ─── Dynamic labels ───
  const getTitle = () => {
    if (mode === "add") return "Add Fight";
    return scenario === "oneTBA" ? "Find Matches" : "Find Fights";
  };

  const getSubtitle = () => {
    if (mode === "add") return null;
    if (scenario === "oneTBA" && anchorFighter) {
      return `Finding an opponent for ${anchorFighter.name}`;
    }
    return "Finding a complete pairing for this slot";
  };

  const getManualLabel = () => {
    if (mode === "add") return "Add Fight Manually";
    return scenario === "oneTBA" ? "Find Matches Manually" : "Find Fights Manually";
  };

  const getManualDesc = () => {
    if (mode === "add") return "Choose fighters and parameters yourself";
    return scenario === "oneTBA" ? "Browse and select an opponent yourself" : "Browse and select two fighters yourself";
  };

  const getSuggestedLabel = () => {
    if (mode === "add") return "Add Suggested Fight";
    return scenario === "oneTBA" ? "Suggested Matches" : "Suggested Fights";
  };

  const getSuggestedDesc = () => {
    if (mode === "add") return "Get AI-matched suggestions based on your event goals";
    if (scenario === "oneTBA" && anchorFighter) return `Get AI suggestions suited to ${anchorFighter.name}`;
    return "Get AI-ranked fighter pair suggestions";
  };

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
        className={step === "suggested" ? "" : "max-h-[85vh] overflow-y-auto"}
        style={{
          background: "#111318",
          border: "none",
          borderRadius: step === "suggested" ? 14 : 16,
          width: step === "suggested" ? "min(95vw, 1200px)" : "min(540px, 95vw)",
          maxWidth: "95vw",
          padding: step === "suggested" ? 0 : 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          maxHeight: step === "suggested" ? "90vh" : "85vh",
          overflow: step === "suggested" ? "hidden" : undefined,
        }}
      >
        {step === "menu" && (
          <>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#e8eaf0" }}>
                {getTitle()}
              </DialogTitle>
              {getSubtitle() && (
                <p style={{ fontSize: 13, color: "#8b909e", marginTop: 4 }}>
                  {getSubtitle()}
                </p>
              )}
              {mode === "find" && prefillSlot && !getSubtitle() && (
                <p style={{ fontSize: 12, color: "#8b909e", marginTop: 4 }}>
                  {prefillSlot.weight_class ? formatEnum(prefillSlot.weight_class) : "Open Weight"}
                  {prefillSlot.discipline ? ` · ${formatEnum(prefillSlot.discipline)}` : ""}
                </p>
              )}
            </DialogHeader>
            <div className="space-y-2 mt-4">
              {optionCard(
                <Search className="h-5 w-5" />,
                getManualLabel(),
                getManualDesc(),
                () => setStep("manual")
              )}
              {optionCard(
                <Sparkles className="h-5 w-5" />,
                getSuggestedLabel(),
                getSuggestedDesc(),
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
                {scenario === "oneTBA" ? "Manual Fighter Selection" : "Manual Fighter Selection"}
              </DialogTitle>
            </DialogHeader>

            {/* Anchor fighter context for Scenario A */}
            {scenario === "oneTBA" && anchorFighter && (
              <div style={{
                background: "rgba(232,160,32,0.06)", borderRadius: 8, padding: "12px 16px", marginTop: 8, marginBottom: 4,
              }}>
                <p style={{ fontSize: 9, color: "#e8a020", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                  Anchor fighter
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#e8eaf0" }}>
                  {anchorFighter.name}
                  <span style={{ fontSize: 12, color: "#8b909e", marginLeft: 8 }}>
                    {anchorFighter.record_wins}-{anchorFighter.record_losses}-{anchorFighter.record_draws} · {formatEnum(anchorFighter.weight_class)}
                  </span>
                </p>
                <p style={{ fontSize: 12, color: "#8b909e", marginTop: 2 }}>Select an opponent below</p>
              </div>
            )}

            <div className="space-y-4 mt-3">
              {paramFields(manualWc, setManualWc, manualDisc, setManualDisc, manualRounds, setManualRounds, manualRoundTime, setManualRoundTime, manualWeightKg, setManualWeightKg, manualWeightLbs, setManualWeightLbs)}

              {scenario === "oneTBA" ? (
                /* Only one fighter search for the TBA side */
                <FighterSearchDropdown
                  label="Opponent"
                  selected={fighterA}
                  onSelect={setFighterA}
                  onClear={() => setFighterA(null)}
                  excludeId={anchorFighter?.id}
                  coachId={isCoach ? user?.id : null}
                  eventId={eventId}
                />
              ) : (
                /* Both fighters for bothTBA or add mode */
                <>
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
                </>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={() => handleClose(false)} style={{ color: "#8b909e" }}>Cancel</Button>
                <Button
                  onClick={handleManualSave}
                  disabled={loading || (scenario === "oneTBA" ? !fighterA : (!fighterA && !fighterB))}
                  style={{
                    background: "#e8a020",
                    color: "#0d0f12",
                    fontWeight: 600,
                    borderRadius: 8,
                  }}
                >
                  {loading ? "Saving..." : mode === "find" ? "Create Proposal" : fighterA && fighterB ? "Create Proposal" : "Add Fighter"}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "suggested" && (
          <MatchSuggestionsPanel
            slot={fightSlot ?? undefined}
            existingProposalFighterIds={existingFighterIds}
            onSelectPair={handleSuggestionSelect}
            eventId={eventId}
            weightClassOverride={prefillSlot?.weight_class ?? null}
            disciplineOverride={prefillSlot?.discipline ?? null}
            anchorFighter={anchorFighter ?? undefined}
          />
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
              {paramFields(openWc, setOpenWc, openDisc, setOpenDisc, openRounds, setOpenRounds, openRoundTime, setOpenRoundTime, openWeightKg, setOpenWeightKg, openWeightLbs, setOpenWeightLbs)}
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
