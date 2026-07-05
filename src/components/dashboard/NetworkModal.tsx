import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { X, Users } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  fighter: "Fighter", coach: "Coach", gym_owner: "Coach", organiser: "Organiser", admin: "Admin",
};

export function NetworkModal({
  type, userId, onClose,
}: {
  type: "followers" | "following";
  userId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: items = [] } = useQuery({
    queryKey: ["network-list", type, userId],
    queryFn: async () => {
      const col = type === "followers" ? "follower_id" : "following_id";
      const filterCol = type === "followers" ? "following_id" : "follower_id";
      const { data } = await supabase.from("user_follows").select(col).eq(filterCol, userId).order("created_at", { ascending: false });
      if (!data || data.length === 0) return [];
      const ids = (data as any[]).map((d) => d[col]);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, gym_id").in("id", ids),
        supabase.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return (profiles ?? []).map((p) => ({
        userId: p.id, name: p.full_name, avatar: p.avatar_url, gym_id: p.gym_id, role: roleMap.get(p.id),
      }));
    },
  });

  const handleUnfollow = async (targetId: string) => {
    await supabase.from("user_follows").delete().eq("follower_id", userId).eq("following_id", targetId);
    queryClient.invalidateQueries({ queryKey: ["network-list"] });
    queryClient.invalidateQueries({ queryKey: ["overview-follower-count"] });
    queryClient.invalidateQueries({ queryKey: ["overview-following-count"] });
    queryClient.invalidateQueries({ queryKey: ["dash-sidebar-followers"] });
    queryClient.invalidateQueries({ queryKey: ["dash-sidebar-following"] });
  };

  const getProfileUrl = (item: any) => {
    if (item.role === "fighter") return `/fighters/${item.userId}`;
    if ((item.role === "coach" || item.role === "gym_owner") && item.gym_id) return `/gyms/${item.gym_id}`;
    if (item.role === "organiser") return `/explore?tab=events`;
    return `/fighters/${item.userId}`;
  };

  const handleRowClick = (item: any) => {
    onClose();
    navigate(getProfileUrl(item));
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "hsl(var(--card))", borderRadius: 12, width: "min(480px, 95vw)", maxHeight: "80vh", overflowY: "auto", padding: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "hsl(var(--foreground))" }}>{type === "followers" ? "Followers" : "Following"}</h3>
          <button onClick={onClose} style={{ color: "hsl(var(--muted-foreground))", cursor: "pointer" }}><X style={{ width: 20, height: 20 }} /></button>
        </div>
        {items.length === 0 && (
          <div className="text-center py-8">
            <Users style={{ width: 32, height: 32, color: "hsl(var(--muted-foreground))", margin: "0 auto 8px" }} />
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>{type === "followers" ? "No followers yet" : "Not following anyone"}</p>
          </div>
        )}
        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.userId} className="flex items-center gap-3 p-3 rounded-lg transition-all duration-150"
              style={{ background: "rgba(255,255,255,0.02)", cursor: "pointer" }}
              onClick={() => handleRowClick(item)}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            >
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #ef4444, #c47e10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "white", overflow: "hidden", flexShrink: 0 }}>
                {item.avatar ? <img src={item.avatar} alt="" className="h-full w-full object-cover" /> : (item.name || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="block truncate" style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>{item.name || "Unknown"}</span>
                {item.role && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.1)", borderRadius: 4, padding: "1px 6px", display: "inline-block", marginTop: 2 }}>
                    {ROLE_LABELS[item.role] || item.role}
                  </span>
                )}
              </div>
              {type === "following" && (
                <button onClick={(e) => { e.stopPropagation(); handleUnfollow(item.userId); }} style={{ fontSize: 11, fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.1)", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                  Unfollow
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
