import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEnum } from "@/lib/format";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

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
        .select("id, fighter_id, gym_id, fighter:fighter_profiles!fighter_gym_links_fighter_id_fkey(id, name, discipline, weight_class, user_id), gym:gyms!fighter_gym_links_gym_id_fkey(name)")
        .in("gym_id", gymIds)
        .eq("status", "pending");
      return data ?? [];
    },
    enabled: gymIds.length > 0,
  });

  if (pendingLinks.length === 0) return null;

  const handleAccept = async (link: any) => {
    // Update fighter_gym_links status
    const { error: linkError } = await supabase
      .from("fighter_gym_links")
      .update({ status: "approved" })
      .eq("id", link.id);

    if (linkError) {
      toast.error("Failed to accept request");
      return;
    }

    // Update profiles.gym_id for the fighter's user
    if (link.fighter?.user_id) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ gym_id: link.gym_id })
        .eq("id", link.fighter.user_id);

      if (profileError) {
        // Rollback the link status
        await supabase
          .from("fighter_gym_links")
          .update({ status: "pending" })
          .eq("id", link.id);
        toast.error("Failed to update fighter profile — request reverted");
        return;
      }

      // Both writes succeeded — now send notification
      await supabase.rpc("create_notification", {
        _user_id: link.fighter.user_id,
        _title: "Gym request approved",
        _message: `Your request to join ${link.gym?.name ?? "the gym"} has been approved.`,
        _type: "gym_request" as const,
        _reference_id: link.gym_id,
      });
    }

    toast.success(`${link.fighter?.name ?? "Fighter"} accepted to your gym`);
    queryClient.invalidateQueries({ queryKey: ["gym-pending-requests"] });
    queryClient.invalidateQueries({ queryKey: ["coach-fighter-gym-links"] });
    queryClient.invalidateQueries({ queryKey: ["coach-gym-fighters"] });
    queryClient.invalidateQueries({ queryKey: ["dash-"] });
  };

  const handleDecline = async (link: any) => {
    const { error } = await supabase
      .from("fighter_gym_links")
      .update({ status: "declined" })
      .eq("id", link.id);

    if (error) {
      toast.error("Failed to decline request");
      return;
    }

    // Notify the fighter
    if (link.fighter?.user_id) {
      await supabase.rpc("create_notification", {
        _user_id: link.fighter.user_id,
        _title: "Gym request declined",
        _message: `Your request to join ${link.gym?.name ?? "the gym"} was not approved.`,
        _type: "gym_request" as const,
        _reference_id: link.gym_id,
      });
    }

    toast.success("Request declined");
    queryClient.invalidateQueries({ queryKey: ["gym-pending-requests"] });
    queryClient.invalidateQueries({ queryKey: ["dash-"] });
  };

  return (
    <div className="mb-8">
      <h2 className="font-heading text-2xl text-foreground mb-4">
        GYM <span className="text-primary">REQUESTS</span>
      </h2>
      <div className="space-y-3">
        {pendingLinks.map((link: any) => (
          <div
            key={link.id}
            className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4"
          >
            <div>
              <p className="font-medium text-foreground">{link.fighter?.name ?? "Unknown"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {link.fighter?.discipline ? formatEnum(link.fighter.discipline) : "—"} · {formatEnum(link.fighter?.weight_class)}
              </p>
              <p className="text-xs text-muted-foreground">
                Wants to join <span className="text-foreground">{link.gym?.name}</span>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => handleDecline(link)}>
                <X className="h-3.5 w-3.5 mr-1" /> Decline
              </Button>
              <Button size="sm" onClick={() => handleAccept(link)}>
                <Check className="h-3.5 w-3.5 mr-1" /> Accept
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
