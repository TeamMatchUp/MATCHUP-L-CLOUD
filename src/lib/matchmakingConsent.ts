import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Bump this to force every user to re-consent. */
export const MATCHMAKING_CONSENT_VERSION = 1;

export function useMatchmakingConsent() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["matchmaking-consent", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("has_consented_matchmaking, matchmaking_consent_version, matchmaking_consent_at")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const needsConsent =
    !!user &&
    !query.isLoading &&
    (!query.data?.has_consented_matchmaking ||
      (query.data?.matchmaking_consent_version ?? 0) < MATCHMAKING_CONSENT_VERSION);

  async function recordConsent() {
    const { error } = await (supabase.rpc as any)("record_matchmaking_consent", {
      _version: MATCHMAKING_CONSENT_VERSION,
    });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["matchmaking-consent", user?.id] });
  }

  return {
    loading: query.isLoading,
    needsConsent,
    recordConsent,
  };
}
