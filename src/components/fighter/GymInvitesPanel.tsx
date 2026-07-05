import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
    <div
      style={{
        background: "hsl(var(--card))",
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
        GYM <span style={{ color: "hsl(var(--primary))" }}>REQUESTS</span>
      </h3>
      <div className="space-y-2">
        {pendingLinks.map((link: any) => {
          const gym = link.gyms;
          return (
            <div
              key={link.id}
              className="flex items-center justify-between"
              style={{ background: "hsl(var(--muted))", borderRadius: 10, padding: "10px 12px" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(239,68,68,0.12)" }}
                >
                  <Building2 className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <div className="min-w-0">
                  <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>
                    {gym?.name ?? "Unknown Gym"}
                  </p>
                  <p className="truncate" style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                    {[gym?.location, gym?.country].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <span
                className="shrink-0"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "hsl(var(--primary))",
                  background: "rgba(239,68,68,0.12)",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                Pending
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
