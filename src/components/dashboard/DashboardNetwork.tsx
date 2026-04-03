import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, ChevronRight, X, UserMinus } from "lucide-react";
import { Link } from "react-router-dom";

export function DashboardNetwork() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sheet, setSheet] = useState<"followers" | "following" | null>(null);

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["follower-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ["following-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["followers-list", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_follows")
        .select("follower_id, created_at")
        .eq("following_id", user!.id)
        .order("created_at", { ascending: false });
      if (!data || data.length === 0) return [];
      const ids = data.map((d) => d.follower_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return data.map((d) => ({
        userId: d.follower_id,
        profile: profileMap.get(d.follower_id),
        role: roleMap.get(d.follower_id),
      }));
    },
    enabled: !!user && sheet === "followers",
  });

  const { data: following = [] } = useQuery({
    queryKey: ["following-list", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_follows")
        .select("following_id, created_at")
        .eq("follower_id", user!.id)
        .order("created_at", { ascending: false });
      if (!data || data.length === 0) return [];
      const ids = data.map((d) => d.following_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return data.map((d) => ({
        userId: d.following_id,
        profile: profileMap.get(d.following_id),
        role: roleMap.get(d.following_id),
      }));
    },
    enabled: !!user && sheet === "following",
  });

  const handleUnfollow = async (targetId: string) => {
    if (!user) return;
    await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetId);
    queryClient.invalidateQueries({ queryKey: ["following-list"] });
    queryClient.invalidateQueries({ queryKey: ["following-count"] });
    queryClient.invalidateQueries({ queryKey: ["follower-count"] });
  };

  const getInitials = (name?: string | null) =>
    name
      ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
      : "?";

  const ROLE_LABELS: Record<string, string> = {
    fighter: "Fighter",
    coach: "Coach",
    organiser: "Organiser",
    gym_owner: "Coach",
    admin: "Admin",
  };

  const renderList = (
    items: { userId: string; profile?: any; role?: string }[],
    showUnfollow: boolean
  ) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <Users style={{ width: 32, height: 32, color: "#555b6b", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 13, color: "#8b909e" }}>
            {showUnfollow ? "Not following anyone" : "No followers yet"}
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.userId}
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: "50%", background: "#1a1e28",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 600, color: "#8b909e", overflow: "hidden", flexShrink: 0,
              }}
            >
              {item.profile?.avatar_url ? (
                <img src={item.profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                getInitials(item.profile?.full_name)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "#e8eaf0" }}>
                {item.profile?.full_name || "Unknown"}
              </p>
              {item.role && (
                <span
                  style={{
                    fontSize: 10, fontWeight: 600, color: "#e8a020",
                    background: "rgba(232,160,32,0.1)", border: "1px solid rgba(232,160,32,0.25)",
                    borderRadius: 4, padding: "2px 6px",
                  }}
                >
                  {ROLE_LABELS[item.role] || item.role}
                </span>
              )}
            </div>
            {showUnfollow && (
              <button
                onClick={() => handleUnfollow(item.userId)}
                style={{
                  fontSize: 11, fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, padding: "4px 10px",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                Unfollow
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="coach-card">
        <div style={{ height: 3, background: "linear-gradient(90deg, #e8a020, rgba(232,160,32,0.3))", borderRadius: "12px 12px 0 0" }} />
        <div className="p-5">
          <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: "#e8eaf0", marginBottom: 16 }}>
            Your Network
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSheet("followers")}
              className="text-left rounded-lg p-4 transition-all"
              style={{ background: "#1a1e28", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}
            >
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#e8a020" }}>
                {followerCount}
              </span>
              <p style={{ fontSize: 12, color: "#8b909e", marginTop: 2 }}>Followers</p>
            </button>
            <button
              onClick={() => setSheet("following")}
              className="text-left rounded-lg p-4 transition-all"
              style={{ background: "#1a1e28", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}
            >
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#e8a020" }}>
                {followingCount}
              </span>
              <p style={{ fontSize: 12, color: "#8b909e", marginTop: 2 }}>Following</p>
            </button>
          </div>
        </div>
      </div>

      {sheet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSheet(null); }}
        >
          <div
            className="w-full max-w-md mx-4 overflow-hidden"
            style={{ background: "#14171e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, maxHeight: "70vh" }}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "#e8eaf0" }}>
                {sheet === "followers" ? "Followers" : "Following"}
              </h3>
              <button onClick={() => setSheet(null)} style={{ color: "#8b909e", cursor: "pointer" }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(70vh - 60px)" }}>
              {sheet === "followers"
                ? renderList(followers, false)
                : renderList(following, true)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
