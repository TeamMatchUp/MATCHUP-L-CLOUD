import { Trophy, ChevronRight, Heart, Check, UserMinus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

interface FighterCardProps {
  fighter: any;
  index: number;
  onClick: () => void;
}

export function FighterCard({ fighter, index, onClick }: FighterCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const record = fighter._record || { wins: 0, losses: 0, draws: 0 };
  const totalFights = record.wins + record.losses + record.draws;
  const winRate = totalFights > 0 ? Math.round((record.wins / totalFights) * 100) : 0;
  const primaryGym = fighter.fighter_gym_links?.find((l: any) => l.is_primary && l.status === "approved");
  const gymName = primaryGym?.gyms?.name ?? "Independent";
  const [followHover, setFollowHover] = useState(false);

  const { data: isFollowing } = useQuery({
    queryKey: ["follow-state", user?.id, fighter.user_id],
    queryFn: async () => {
      if (!user || !fighter.user_id) return false;
      const { data } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", fighter.user_id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!fighter.user_id,
  });

  const toggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !fighter.user_id) return;
    if (isFollowing) {
      await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", fighter.user_id);
    } else {
      await supabase.from("user_follows").insert({ follower_id: user.id, following_id: fighter.user_id });
    }
    queryClient.invalidateQueries({ queryKey: ["follow-state", user.id, fighter.user_id] });
  };

  return (
    <div
      onClick={onClick}
      className="cursor-pointer group relative"
      style={{
        background: "#14171e",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color 0.2s, transform 0.15s, box-shadow 0.2s",
        willChange: "transform",
        animation: `fadeUp 0.35s cubic-bezier(0.25,0.46,0.45,0.94) ${Math.min(index * 50, 300)}ms forwards`,
        opacity: 0,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(232,160,32,0.25)";
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(232,160,32,0.1)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(255,255,255,0.06)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Profile photo */}
      <div style={{ width: "100%", height: 200, overflow: "hidden", position: "relative" }}>
        {fighter._avatar ? (
          <img
            src={fighter._avatar}
            alt={fighter.name}
            className="w-full h-full object-cover object-top transition-transform duration-400 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "#1a1e28" }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: "#555b6b" }}>
              {fighter.name.split(" ").filter((n: string) => !n.startsWith('"')).map((n: string) => n[0]).join("").slice(0, 2)}
            </span>
          </div>
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(20,23,30,1) 100%)" }}
        />
        {/* Win Rate badge */}
        <div
          className="absolute top-3 right-3 transition-all duration-200 group-hover:border-[rgba(232,160,32,0.5)] group-hover:shadow-[0_0_10px_rgba(232,160,32,0.2)]"
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 9999,
            padding: "6px 12px",
            textAlign: "center",
          }}
        >
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 9, color: "#8b909e", display: "block" }}>Win Rate</span>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700, color: "#e8a020" }}>{winRate}%</span>
        </div>
        {/* Follow button */}
        {user && fighter.user_id && user.id !== fighter.user_id && (
          <button
            onClick={toggleFollow}
            onMouseEnter={() => setFollowHover(true)}
            onMouseLeave={() => setFollowHover(false)}
            className="absolute top-3 left-3 transition-all duration-150"
            style={{
              background: isFollowing
                ? (followHover ? "rgba(239,68,68,0.1)" : "rgba(232,160,32,0.15)")
                : "rgba(0,0,0,0.6)",
              border: `1px solid ${isFollowing ? (followHover ? "rgba(239,68,68,0.4)" : "#e8a020") : "rgba(232,160,32,0.4)"}`,
              color: isFollowing ? (followHover ? "#ef4444" : "#e8a020") : "#e8a020",
              borderRadius: 20,
              padding: "4px 12px",
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
            }}
          >
            {isFollowing ? (
              followHover ? (
                <><UserMinus className="h-3 w-3" /> Unfollow</>
              ) : (
                <><Check className="h-3 w-3" /> Following</>
              )
            ) : (
              "Follow"
            )}
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 16 }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 9, color: "#8b909e", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          FIGHTER
        </p>
        <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 16, color: "#e8eaf0", marginTop: 2 }}>
          {fighter.name}
        </h3>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8b909e" }}>
          {WEIGHT_CLASS_LABELS[fighter.weight_class] || fighter.weight_class}
        </p>

        {/* Record row */}
        <div className="flex items-end gap-4" style={{ marginTop: 10 }}>
          <div>
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 20, color: "#e8eaf0" }}>
              {record.wins}-{record.losses}-{record.draws}
            </span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 9, color: "#8b909e", textTransform: "uppercase", display: "block" }}>
              WIN-LOSS-DRAW
            </span>
          </div>
        </div>

        {/* Gym */}
        <div className="flex items-center gap-1.5" style={{ marginTop: 8 }}>
          <Trophy className="h-3.5 w-3.5" style={{ color: "#e8a020" }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8b909e" }}>{gymName}</span>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <span
          className="group-hover:underline"
          style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#e8a020" }}
        >
          View Profile
        </span>
        <div
          className="flex items-center justify-center transition-all duration-150 group-hover:translate-x-0.5"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(232,160,32,0.12)",
            border: "1px solid rgba(232,160,32,0.25)",
          }}
        >
          <ChevronRight className="h-4 w-4" style={{ color: "#e8a020" }} />
        </div>
      </div>
    </div>
  );
}
