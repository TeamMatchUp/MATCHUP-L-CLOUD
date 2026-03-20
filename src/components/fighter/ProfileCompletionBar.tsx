import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ProfileCompletionBarProps {
  fighterId: string;
  fighterProfile?: any;
  /** When true, show action buttons to open the Add Result modal */
  onOpenAddResult?: () => void;
}

interface Segment {
  label: string;
  complete: boolean;
  prompt: string;
  actions?: { label: string; href?: string; onClick?: () => void }[];
}

export function ProfileCompletionBar({ fighterId, fighterProfile, onOpenAddResult }: ProfileCompletionBarProps) {
  const { data: profile } = useQuery({
    queryKey: ["fighter-profile-completion", fighterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("date_of_birth, walk_around_weight_kg, height, reach, stance, discipline, weight_class, fighting_substyle, training_background")
        .eq("id", fighterId)
        .single();
      return data;
    },
    enabled: !fighterProfile && !!fighterId,
  });

  const { data: hasFightRecord } = useQuery({
    queryKey: ["fighter-has-fights", fighterId],
    queryFn: async () => {
      const { count } = await supabase
        .from("fights")
        .select("id", { count: "exact", head: true })
        .or(`fighter_a_id.eq.${fighterId},fighter_b_id.eq.${fighterId}`);
      return (count ?? 0) > 0;
    },
    enabled: !!fighterId,
  });

  const { data: hasApprovedGym } = useQuery({
    queryKey: ["fighter-has-approved-gym", fighterId],
    queryFn: async () => {
      const { count } = await supabase
        .from("fighter_gym_links")
        .select("id", { count: "exact", head: true })
        .eq("fighter_id", fighterId)
        .eq("status", "approved");
      return (count ?? 0) > 0;
    },
    enabled: !!fighterId,
  });

  const p = fighterProfile ?? profile;
  if (!p) return null;

  const coreComplete = !!(
    p.date_of_birth &&
    p.walk_around_weight_kg &&
    p.height &&
    p.reach &&
    p.stance &&
    p.discipline &&
    p.weight_class
  );

  const fightRecordComplete = !!hasFightRecord;
  const fullProfileComplete = !!(hasApprovedGym && p.training_background && p.fighting_substyle);

  const segments: Segment[] = [
    {
      label: "Core Profile",
      complete: coreComplete,
      prompt: "Unlocks appearing in matchmaking pools",
      actions: !coreComplete ? [
        { label: "Complete your profile", href: "/fighter/dashboard?tab=profile" },
      ] : undefined,
    },
    {
      label: "Fight Record",
      complete: fightRecordComplete,
      prompt: "Unlocks Elo rating and full algorithm scoring",
      actions: !fightRecordComplete ? [
        ...(onOpenAddResult ? [{ label: "Add your first fight result", onClick: onOpenAddResult }] : []),
      ] : undefined,
    },
    {
      label: "Full Profile",
      complete: fullProfileComplete,
      prompt: "Unlocks style contrast matching and same-gym exclusion",
      actions: !fullProfileComplete ? [
        ...(!hasApprovedGym ? [{ label: "Find a gym", href: "/gyms" }] : []),
        ...(!p.fighting_substyle ? [{ label: "Declare your style", href: "/fighter/dashboard?tab=profile" }] : []),
      ] : undefined,
    },
  ];

  const completedCount = segments.filter((s) => s.complete).length;
  const percentage = Math.round((completedCount / segments.length) * 100);

  return (
    <div className="rounded-lg border border-border bg-card p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-lg text-foreground">
          PROFILE <span className="text-primary">COMPLETION</span>
        </h3>
        <span className="font-heading text-2xl text-primary tabular-nums">{percentage}%</span>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 mb-4">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={`h-2 flex-1 rounded-full transition-colors ${
              seg.complete ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Segments detail */}
      <div className="space-y-3">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-start gap-3">
            {seg.complete ? (
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${seg.complete ? "text-foreground" : "text-muted-foreground"}`}>
                {seg.label}
              </p>
              {!seg.complete && (
                <>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <AlertCircle className="h-3 w-3 text-primary" />
                    {seg.prompt}
                  </p>
                  {seg.actions && seg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {seg.actions.map((action) =>
                        action.href ? (
                          <Link key={action.label} to={action.href}>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              {action.label}
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            key={action.label}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={action.onClick}
                          >
                            {action.label}
                          </Button>
                        )
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
