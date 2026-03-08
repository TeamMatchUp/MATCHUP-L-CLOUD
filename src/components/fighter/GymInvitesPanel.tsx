import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Building2 } from "lucide-react";

function formatEnum(val: string) {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface GymInvitesPanelProps {
  fighterProfileId: string;
}

export function GymInvitesPanel({ fighterProfileId }: GymInvitesPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pendingInvites = [] } = useQuery({
    queryKey: ["fighter-gym-invites", fighterProfileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("id, status, gym_id, gyms(id, name, location, country)")
        .eq("fighter_id", fighterProfileId)
        .eq("status", "pending");
      return data ?? [];
    },
    enabled: !!fighterProfileId,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ linkId, accept }: { linkId: string; accept: boolean }) => {
      if (accept) {
        const { error } = await supabase
          .from("fighter_gym_links")
          .update({ status: "accepted" })
          .eq("id", linkId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("fighter_gym_links")
          .delete()
          .eq("id", linkId);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["fighter-gym-invites"] });
      toast({ title: vars.accept ? "Gym invite accepted" : "Gym invite declined" });
    },
    onError: (e: any) => {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    },
  });

  if (pendingInvites.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="font-heading text-2xl text-foreground mb-4">
        GYM <span className="text-primary">INVITES</span>
      </h2>
      <div className="space-y-3">
        {pendingInvites.map((invite: any) => {
          const gym = invite.gyms;
          return (
            <div
              key={invite.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{gym?.name ?? "Unknown Gym"}</p>
                  <p className="text-xs text-muted-foreground">
                    {gym?.location} · {gym?.country}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">
                  Pending
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-success border-success/30 hover:bg-success/10"
                  onClick={() => respondMutation.mutate({ linkId: invite.id, accept: true })}
                  disabled={respondMutation.isPending}
                >
                  <Check className="h-3 w-3" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => respondMutation.mutate({ linkId: invite.id, accept: false })}
                  disabled={respondMutation.isPending}
                >
                  <X className="h-3 w-3" /> Decline
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
