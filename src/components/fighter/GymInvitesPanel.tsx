import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

interface GymInvitesPanelProps {
  fighterProfileId: string;
}

export function GymInvitesPanel({ fighterProfileId }: GymInvitesPanelProps) {
  const { data: pendingLinks = [] } = useQuery({
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

  if (pendingLinks.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="font-heading text-2xl text-foreground mb-4">
        GYM <span className="text-primary">REQUESTS</span>
      </h2>
      <div className="space-y-3">
        {pendingLinks.map((link: any) => {
          const gym = link.gyms;
          return (
            <div
              key={link.id}
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
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Pending — {gym?.name ?? "Gym"}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
