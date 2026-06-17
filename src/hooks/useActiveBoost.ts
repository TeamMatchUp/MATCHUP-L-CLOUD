import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveBoost {
  id: string;
  tier: string;
  starts_at: string;
  expires_at: string;
  created_at: string;
}

export function useActiveBoost(eventId: string | undefined) {
  return useQuery({
    queryKey: ["active-boost", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<ActiveBoost | null> => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("event_boosts")
        .select("id, tier, starts_at, expires_at, created_at")
        .eq("event_id", eventId!)
        .eq("payment_status", "paid")
        .gt("expires_at", nowIso)
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as ActiveBoost) ?? null;
    },
  });
}

export function isEventBoosted(boosts: Array<{ payment_status?: string | null; expires_at?: string | null }> | null | undefined) {
  if (!boosts || boosts.length === 0) return false;
  const now = Date.now();
  return boosts.some((b) => b.payment_status === "paid" && b.expires_at && new Date(b.expires_at).getTime() > now);
}

export function latestBoostCreatedAt(boosts: Array<{ payment_status?: string | null; expires_at?: string | null; created_at?: string | null }> | null | undefined) {
  if (!boosts || boosts.length === 0) return 0;
  const now = Date.now();
  let max = 0;
  for (const b of boosts) {
    if (b.payment_status === "paid" && b.expires_at && new Date(b.expires_at).getTime() > now && b.created_at) {
      const t = new Date(b.created_at).getTime();
      if (t > max) max = t;
    }
  }
  return max;
}
