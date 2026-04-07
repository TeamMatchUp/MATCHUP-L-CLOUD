import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalytics } from "@/hooks/useAnalytics";

export function useFollow(targetUserId: string | null | undefined) {
  const { user } = useAuth();
  const { track } = useAnalytics();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (!user || !targetUserId || user.id === targetUserId) return;
    supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle()
      .then(({ data }) => setIsFollowing(!!data));
  }, [targetUserId, user?.id]);

  useEffect(() => {
    if (!targetUserId) return;
    supabase
      .from("user_follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", targetUserId)
      .then(({ count }) => setFollowerCount(count ?? 0));
  }, [targetUserId]);

  const toggle = useCallback(async () => {
    if (!user || !targetUserId || loading) return;
    setLoading(true);
    const was = isFollowing;
    setIsFollowing(!was);
    setFollowerCount((c) => c + (was ? -1 : 1));
    void track("follow_toggled", { target_id: targetUserId, action: was ? "unfollow" : "follow" });
    try {
      if (was) {
        await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
      } else {
        await supabase.from("user_follows").insert({
          follower_id: user.id,
          following_id: targetUserId,
        });
        // Notification — best effort, ignore type mismatch
        try {
          await supabase.rpc("create_notification", {
            _user_id: targetUserId,
            _title: "New Follower",
            _message: `Someone started following you`,
            _type: "system",
            _reference_id: user.id,
          });
        } catch {}
      }
    } catch {
      setIsFollowing(was);
      setFollowerCount((c) => c + (was ? 1 : -1));
    }
    setLoading(false);
  }, [user, targetUserId, isFollowing, loading]);

  return { isFollowing, toggle, loading, followerCount };
}
