import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface MyGymsPanelProps {
  fighterProfileId: string;
}

export function MyGymsPanel({ fighterProfileId }: MyGymsPanelProps) {
  const { data: gymLinks = [] } = useQuery({
    queryKey: ["fighter-gym-memberships", fighterProfileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("id, is_primary, status, gyms(id, name, location, country, city)")
        .eq("fighter_id", fighterProfileId)
        .in("status", ["approved", "pending"]);
      return data ?? [];
    },
    enabled: !!fighterProfileId,
  });

  if (gymLinks.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="font-heading text-2xl text-foreground mb-4">
        MY <span className="text-primary">GYMS</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {gymLinks.map((link: any) => {
          const gym = link.gyms;
          return (
            <Link
              key={link.id}
              to={`/gyms/${gym?.id}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{gym?.name ?? "Unknown Gym"}</p>
                <p className="text-xs text-muted-foreground">
                  {gym?.city ? `${gym.city}, ` : ""}{gym?.country}
                </p>
              </div>
              {link.is_primary && (
                <Badge variant="outline" className="gap-1 shrink-0 border-primary/30 text-primary">
                  <Star className="h-3 w-3" /> Primary
                </Badge>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
