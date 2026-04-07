import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAnalytics() {
  const { user } = useAuth();

  const track = useCallback(
    async (eventType: string, data?: object, page?: string) => {
      try {
        await supabase.from("analytics_events").insert({
          user_id: user?.id ?? null,
          event_type: eventType,
          event_data: data ?? {},
          page: page ?? window.location.pathname,
        });
      } catch (e) {
        console.error("Analytics error:", e);
      }
    },
    [user?.id]
  );

  return { track };
}
