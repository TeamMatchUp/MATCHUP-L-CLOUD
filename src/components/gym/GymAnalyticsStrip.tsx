import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Users, UserPlus, MapPin, Lock } from "lucide-react";

interface GymAnalyticsStripProps {
  gymId: string;
  listingTier: string | null;
}

export function GymAnalyticsStrip({ gymId, listingTier }: GymAnalyticsStripProps) {
  const isPaidTier = listingTier === "pro" || listingTier === "featured";

  const { data: analytics } = useQuery({
    queryKey: ["gym-analytics", gymId],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [viewsRes, leadsRes, trialsRes] = await Promise.all([
        supabase
          .from("gym_profile_views" as any)
          .select("id", { count: "exact", head: true })
          .eq("gym_id", gymId)
          .gte("viewed_at", weekAgo.toISOString()),
        supabase
          .from("gym_leads")
          .select("id", { count: "exact", head: true })
          .eq("gym_id", gymId),
        supabase
          .from("gym_leads")
          .select("id", { count: "exact", head: true })
          .eq("gym_id", gymId)
          .eq("type", "trial_request")
          .gte("created_at", monthStart.toISOString()),
      ]);

      return {
        viewsThisWeek: viewsRes.count ?? 0,
        totalLeads: leadsRes.count ?? 0,
        trialsThisMonth: trialsRes.count ?? 0,
      };
    },
    enabled: !!gymId,
  });

  const stats = [
    { label: "Views This Week", value: analytics?.viewsThisWeek ?? 0, icon: Eye },
    { label: "Total Leads", value: analytics?.totalLeads ?? 0, icon: Users },
    { label: "Trial Requests", value: analytics?.trialsThisMonth ?? 0, icon: UserPlus },
    { label: "Nearby Fighters", value: "—", icon: MapPin },
  ];

  return (
    <div className="relative mt-3">
      <div className={`grid grid-cols-4 gap-2 ${!isPaidTier ? "blur-sm select-none" : ""}`}>
        {stats.map((s) => (
          <div key={s.label} className="text-center p-2">
            <s.icon className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
            <p className="font-heading text-lg text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
      {!isPaidTier && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm border border-border rounded-full px-3 py-1.5">
            <Lock className="h-3 w-3" />
            Upgrade to Pro to unlock analytics
          </div>
        </div>
      )}
    </div>
  );
}
