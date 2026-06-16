import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEnum } from "@/lib/format";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

function unwrap<T>(val: T | T[] | null | undefined): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val ?? null;
}

interface GymRequestsPanelProps {
  gymIds: string[];
  coachId: string;
}

export function GymRequestsPanel({ gymIds, coachId }: GymRequestsPanelProps) {
  const queryClient = useQueryClient();

  const { data: pendingLinks = [] } = useQuery({
    queryKey: ["gym-pending-requests", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("id, fighter_id, gym_id, fighter:fighter_profiles!fighter_gym_links_fighter_id_fkey(id, name, discipline, weight_class, stance, user_id), gym:gyms!fighter_gym_links_gym_id_fkey(name)")
        .in("gym_id", gymIds)
        .eq("status", "pending");
      return data ?? [];
    },
    enabled: gymIds.length > 0,
  });

  if (pendingLinks.length === 0) return null;

  const handleAccept = async (link: any) => {
    const fighter = unwrap(link.fighter);
    const gym = unwrap(link.gym);

    const { error: linkError } = await supabase
      .from("fighter_gym_links")
      .update({ status: "approved" })
      .eq("id", link.id);

    if (linkError) {
      toast.error("Failed to accept request");
      return;
    }

    const fighterUserId = fighter?.user_id;
    if (fighterUserId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ gym_id: link.gym_id })
        .eq("id", fighterUserId);

      if (profileError) {
        await supabase
          .from("fighter_gym_links")
          .update({ status: "pending" })
          .eq("id", link.id);
        toast.error("Failed to update fighter profile — request reverted");
        return;
      }

      await supabase.rpc("create_notification", {
        _user_id: fighterUserId,
        _title: "Gym request approved",
        _message: `Your request to join ${gym?.name ?? "the gym"} has been approved.`,
        _type: "gym_request" as const,
        _reference_id: link.gym_id,
      });
    }

    toast.success(`${fighter?.name ?? "Fighter"} accepted to your gym`);
    queryClient.invalidateQueries({ queryKey: ["gym-pending-requests"] });
    queryClient.invalidateQueries({ queryKey: ["coach-fighter-gym-links"] });
    queryClient.invalidateQueries({ queryKey: ["coach-gym-fighters"] });
    queryClient.invalidateQueries({ queryKey: ["dash-"] });
  };

  const handleDecline = async (link: any) => {
    const fighter = unwrap(link.fighter);
    const gym = unwrap(link.gym);

    const { error } = await supabase
      .from("fighter_gym_links")
      .update({ status: "declined" })
      .eq("id", link.id);

    if (error) {
      toast.error("Failed to decline request");
      return;
    }

    if (fighter?.user_id) {
      await supabase.rpc("create_notification", {
        _user_id: fighter.user_id,
        _title: "Gym request declined",
        _message: `Your request to join ${gym?.name ?? "the gym"} was not approved.`,
        _type: "gym_request" as const,
        _reference_id: link.gym_id,
      });
    }

    toast.success("Request declined");
    queryClient.invalidateQueries({ queryKey: ["gym-pending-requests"] });
    queryClient.invalidateQueries({ queryKey: ["dash-"] });
  };

  return (
    <div
      style={{
        background: "#111318",
        borderRadius: 16,
        padding: 20,
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <h3
        className="font-heading text-foreground mb-4"
        style={{ fontSize: 18, letterSpacing: "0.04em", textTransform: "uppercase" }}
      >
        GYM <span style={{ color: "#e8a020" }}>REQUESTS</span>
      </h3>
      <div className="space-y-2">
        {pendingLinks.map((link: any) => {
          const fighter = unwrap(link.fighter);
          const gym = unwrap(link.gym);
          return (
            <div
              key={link.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              style={{ background: "#181c24", borderRadius: 10, padding: "10px 12px" }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>
                  {fighter?.name ?? "Unknown"}
                </p>
                <p className="truncate" style={{ fontSize: 11, color: "#8b909e", marginTop: 2 }}>
                  {fighter?.discipline ? formatEnum(fighter.discipline) : "—"} · {formatEnum(fighter?.weight_class)}
                  {fighter?.stance ? ` · ${fighter.stance}` : ""}
                </p>
                <p className="truncate" style={{ fontSize: 11, color: "#8b909e" }}>
                  Wants to join <span style={{ color: "#e8eaf0" }}>{gym?.name}</span>
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => handleDecline(link)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Decline
                </Button>
                <Button size="sm" className="h-8 px-3 text-xs" onClick={() => handleAccept(link)}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Accept
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

