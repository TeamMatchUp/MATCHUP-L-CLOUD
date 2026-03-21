import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Check, X, Search, AlertTriangle, Swords } from "lucide-react";
import { toast } from "sonner";
import {
  PRESETS,
  enrichFighter,
  runMatchmakingEngine,
  type FighterWithStats,
  type ScoredMatch,
  type Preset,
} from "@/lib/matchmakingEngine";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

export default function Matchmaking() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [presetKey, setPresetKey] = useState("action_night");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState("");

  const preset = PRESETS[presetKey];

  // Fetch event
  const { data: event } = useQuery({
    queryKey: ["matchmaking-event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, discipline, date, location, city")
        .eq("id", eventId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  // Fetch fighters pool
  const { data: fighters = [], isLoading: loadingFighters } = useQuery({
    queryKey: ["matchmaking-pool", eventId, event?.discipline],
    queryFn: async () => {
      let query = supabase
        .from("fighter_profiles")
        .select("*")
        .eq("available", true);

      if (event?.discipline) {
        query = query.eq("discipline", event.discipline);
      }

      const { data: rawFighters, error } = await query;
      if (error) throw error;
      if (!rawFighters) return [];

      // Fetch fights for finish rate
      const fighterIds = rawFighters.map((f) => f.id);
      const { data: fights = [] } = await supabase
        .from("fights")
        .select("fighter_a_id, result, method")
        .in("fighter_a_id", fighterIds);

      // Fetch gym links
      const { data: gymLinks = [] } = await supabase
        .from("fighter_gym_links")
        .select("fighter_id, gym_id")
        .eq("status", "approved")
        .in("fighter_id", fighterIds);

      const gymMap = new Map<string, string[]>();
      gymLinks.forEach((gl) => {
        const arr = gymMap.get(gl.fighter_id) || [];
        arr.push(gl.gym_id);
        gymMap.set(gl.fighter_id, arr);
      });

      return rawFighters.map((f) =>
        enrichFighter(f, fights || [], gymMap.get(f.id) || [])
      );
    },
    enabled: !!event,
  });

  // Run engine
  const suggestions = useMemo(() => {
    if (fighters.length < 2) return [];
    return runMatchmakingEngine(fighters, preset);
  }, [fighters, preset]);

  // Apply text filter + dismissed
  const filtered = useMemo(() => {
    let list = suggestions.filter(
      (s) => !dismissed.has(`${s.fighterA.id}-${s.fighterB.id}`)
    );

    if (filterText.trim()) {
      const lower = filterText.toLowerCase();
      // Simple keyword filters
      if (lower.includes("finisher")) {
        list = list.filter((s) => s.entertainment > 0.5);
      } else if (lower.includes("local")) {
        list = list.filter(
          (s) => s.fighterA.region && s.fighterB.region && s.fighterA.region === s.fighterB.region
        );
      } else if (lower.includes("undefeated")) {
        list = list.filter(
          (s) => s.fighterA.record_losses === 0 && s.fighterB.record_losses === 0
        );
      } else if (lower.includes("debut")) {
        list = list.filter((s) => s.flags.includes("Debut"));
      } else {
        // General name search
        list = list.filter(
          (s) =>
            s.fighterA.name.toLowerCase().includes(lower) ||
            s.fighterB.name.toLowerCase().includes(lower)
        );
      }
    }

    return list;
  }, [suggestions, dismissed, filterText]);

  const handleConfirm = async (match: ScoredMatch) => {
    if (!eventId || !user) return;
    try {
      // Save to event_fight_slots
      await supabase.from("event_fight_slots").insert({
        event_id: eventId,
        weight_class: match.fighterA.weight_class,
        discipline: match.fighterA.discipline,
        fighter_a_id: match.fighterA.id,
        fighter_b_id: match.fighterB.id,
        status: "confirmed",
      });

      // Save to match_suggestions
      await supabase.from("match_suggestions").insert({
        event_id: eventId,
        fighter_a_id: match.fighterA.id,
        fighter_b_id: match.fighterB.id,
        composite_score: match.composite,
        competitiveness: match.competitiveness,
        entertainment: match.entertainment,
        style_contrast: match.styleContrast,
        narrative: match.narrative,
        flags: match.flags,
        preset_used: presetKey,
        status: "confirmed",
      });

      setDismissed((prev) => new Set(prev).add(`${match.fighterA.id}-${match.fighterB.id}`));
      toast.success(`${match.fighterA.name} vs ${match.fighterB.name} confirmed!`);
    } catch {
      toast.error("Failed to confirm match");
    }
  };

  const handleDismiss = async (match: ScoredMatch) => {
    if (!eventId) return;
    try {
      await supabase.from("match_suggestions").insert({
        event_id: eventId,
        fighter_a_id: match.fighterA.id,
        fighter_b_id: match.fighterB.id,
        composite_score: match.composite,
        competitiveness: match.competitiveness,
        entertainment: match.entertainment,
        style_contrast: match.styleContrast,
        narrative: match.narrative,
        flags: match.flags,
        preset_used: presetKey,
        status: "dismissed",
      });
    } catch {
      // silent
    }
    setDismissed((prev) => new Set(prev).add(`${match.fighterA.id}-${match.fighterB.id}`));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="container py-8">
          <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Event
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
            {/* Left Panel — Event info + preset */}
            <div className="space-y-6">
              <div className="rounded-lg border border-primary/30 bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-xl text-foreground">MATCHMAKER</h2>
                </div>

                {event && (
                  <div className="space-y-2 mb-6">
                    <h3 className="font-heading text-lg text-foreground">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">{event.city || event.location}</p>
                    {event.discipline && (
                      <Badge variant="outline" className="capitalize">{event.discipline}</Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {fighters.length} fighters in pool
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Preset</label>
                  <Select value={presetKey} onValueChange={setPresetKey}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom">
                      {Object.entries(PRESETS).map(([key, p]) => (
                        <SelectItem key={key} value={key}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Weight breakdown */}
                  <div className="space-y-2 pt-2">
                    <WeightRow label="Competitiveness" value={preset.w_comp} />
                    <WeightRow label="Entertainment" value={preset.w_ent} />
                    <WeightRow label="Style Contrast" value={preset.w_style} />
                    <WeightRow label="Narrative" value={preset.w_narr} />
                  </div>
                </div>
              </div>

              {/* Text filter */}
              <div className="rounded-lg border border-border bg-card p-4">
                <label className="text-sm font-medium text-foreground mb-2 block">Quick Filter</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder='e.g. "finishers only" or "local fighters"'
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Try: finishers, local, undefeated, debut, or a fighter name
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">
                  <strong>{filtered.length}</strong> suggestions · <strong>{dismissed.size}</strong> reviewed
                </p>
              </div>
            </div>

            {/* Right Panel — Suggestions */}
            <div className="space-y-4">
              <h2 className="font-heading text-2xl text-foreground">
                RANKED <span className="text-primary">SUGGESTIONS</span>
              </h2>

              {loadingFighters ? (
                <div className="text-muted-foreground animate-pulse py-12 text-center">
                  Analysing fighter pool...
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-12 text-center">
                  <Swords className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {suggestions.length === 0
                      ? "Not enough eligible fighters to generate suggestions."
                      : "No matches left — adjust your filter or preset."}
                  </p>
                </div>
              ) : (
                filtered.slice(0, 20).map((match, idx) => (
                  <MatchCard
                    key={`${match.fighterA.id}-${match.fighterB.id}`}
                    match={match}
                    rank={idx + 1}
                    onConfirm={() => handleConfirm(match)}
                    onDismiss={() => handleDismiss(match)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function WeightRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <Progress value={value * 100} className="h-2 flex-1" />
      <span className="text-xs font-medium text-foreground w-10 text-right">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

function DimensionBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-medium text-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

interface MatchCardProps {
  match: ScoredMatch;
  rank: number;
  onConfirm: () => void;
  onDismiss: () => void;
}

function MatchCard({ match, rank, onConfirm, onDismiss }: MatchCardProps) {
  const { fighterA: a, fighterB: b } = match;
  const compositePct = Math.round(match.composite * 100);

  return (
    <div className="rounded-lg border border-border bg-card p-5 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <span className="font-heading text-lg text-muted-foreground">#{rank}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/fighters/${a.id}`} className="font-medium text-foreground hover:text-primary">
                {a.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                ({a.record_wins}W-{a.record_losses}L-{a.record_draws}D)
              </span>
              <span className="text-primary font-heading text-sm">VS</span>
              <Link to={`/fighters/${b.id}`} className="font-medium text-foreground hover:text-primary">
                {b.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                ({b.record_wins}W-{b.record_losses}L-{b.record_draws}D)
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {a.weight_class && (
                <Badge variant="outline" className="text-[10px]">
                  {WEIGHT_CLASS_LABELS[a.weight_class] || a.weight_class}
                </Badge>
              )}
              {a.fighting_substyle && (
                <Badge variant="secondary" className="text-[10px]">{a.fighting_substyle}</Badge>
              )}
              {b.fighting_substyle && (
                <Badge variant="secondary" className="text-[10px]">{b.fighting_substyle}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-heading text-2xl text-primary">{compositePct}%</p>
          <p className="text-[10px] text-muted-foreground">Match Score</p>
        </div>
      </div>

      {/* Dimension bars */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
        <DimensionBar label="Competitive" value={match.competitiveness} />
        <DimensionBar label="Entertainment" value={match.entertainment} />
        <DimensionBar label="Style Clash" value={match.styleContrast} />
        <DimensionBar label="Narrative" value={match.narrative} />
      </div>

      {/* Flags */}
      {match.flags.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          {match.flags.map((flag) => (
            <Badge
              key={flag}
              variant="outline"
              className={
                flag === "Welfare"
                  ? "text-destructive border-destructive/40 text-[10px]"
                  : "text-amber-500 border-amber-500/40 text-[10px]"
              }
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {flag}
            </Badge>
          ))}
        </div>
      )}

      {/* Explanation */}
      <p className="text-xs text-muted-foreground mb-4 italic">{match.explanation}</p>

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onDismiss} className="gap-1 text-muted-foreground">
          <X className="h-3 w-3" /> Dismiss
        </Button>
        <Button size="sm" onClick={onConfirm} className="gap-1">
          <Check className="h-3 w-3" /> Confirm
        </Button>
      </div>
    </div>
  );
}
