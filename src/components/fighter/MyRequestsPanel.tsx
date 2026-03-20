import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Send } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  confirmed: "bg-success/10 text-success border-success/30",
  declined: "bg-destructive/10 text-destructive border-destructive/30",
};

export function MyRequestsPanel() {
  const { user } = useAuth();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["fighter-gym-leads", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("gym_leads")
        .select("id, gym_id, type, created_at, status, gyms:gym_id(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <Send className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No requests sent yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req: any) => {
        const gymName = req.gyms?.name ?? "Unknown Gym";
        const typeLabel = req.type === "trial_request" ? "Trial Request" : "Interest";
        const statusClass = STATUS_COLORS[req.status] ?? STATUS_COLORS.pending;

        return (
          <div key={req.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{gymName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {typeLabel} · {format(new Date(req.created_at), "dd MMM yyyy")}
              </p>
            </div>
            <Badge variant="outline" className={statusClass}>
              {req.status ? req.status.charAt(0).toUpperCase() + req.status.slice(1) : "Pending"}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
