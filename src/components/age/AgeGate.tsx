import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DateOfBirthModal } from "./DateOfBirthModal";
import { ResponsiblePersonModal } from "./ResponsiblePersonModal";
import { computeIsMinor } from "@/hooks/useIsMinor";

/**
 * Mounts blocking modals for the current user:
 * 1. If DOB is missing → DateOfBirthModal.
 * 2. If DOB indicates under-18 AND no responsible-person on file → ResponsiblePersonModal.
 * Adults with DOB set see nothing. No user is funneled into the guardian modal without first
 * having supplied a DOB that is genuinely under 18.
 */
export function AgeGate() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["age-gate", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("date_of_birth, responsible_person_confirmed_at")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  if (!user || !data) return null;

  const dob = (data.date_of_birth as string | null) ?? null;
  const responsibleConfirmed = !!data.responsible_person_confirmed_at;

  const needsDob = !dob;
  const isMinor = !needsDob && computeIsMinor(dob);
  const needsResponsible = isMinor && !responsibleConfirmed;

  const refresh = () => qc.invalidateQueries({ queryKey: ["age-gate", user.id] });

  return (
    <>
      <DateOfBirthModal open={needsDob} onSaved={refresh} />
      <ResponsiblePersonModal open={!needsDob && needsResponsible} onConfirmed={refresh} />
    </>
  );
}
