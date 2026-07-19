import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Computes minor status from profiles.date_of_birth. Missing DOB = treat as minor (fail-safe). */
export function computeIsMinor(dob?: string | null): boolean {
  if (!dob) return true;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return true;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age < 18;
}

/** Live minor status for a user id, keyed on the profiles.date_of_birth column. */
export function useIsMinor(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["is-minor", userId],
    queryFn: async () => {
      if (!userId) return { isMinor: false, dob: null as string | null, hasDob: false };
      const { data } = await supabase
        .from("profiles")
        .select("date_of_birth")
        .eq("id", userId)
        .maybeSingle();
      const dob = (data?.date_of_birth as string | null) ?? null;
      return { isMinor: computeIsMinor(dob), dob, hasDob: !!dob };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

/** Current user's minor status. */
export function useMyMinorStatus() {
  const { user } = useAuth();
  return useIsMinor(user?.id);
}
