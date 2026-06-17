import { supabase } from "@/integrations/supabase/client";

const MATCH_TYPES = new Set([
  "match_proposed",
  "match_accepted",
  "match_declined",
  "match_confirmed",
  "match_withdrawn",
]);

/**
 * Resolve where a notification should navigate to.
 *
 * `match_*` notifications are produced by two subsystems that store different
 * ids in `reference_id`:
 *   - `match_proposals.id`  → /proposals/:id
 *   - `event_fight_slots.id` → /dashboard?actionItem=…
 * We probe both tables to figure out which one this notification points at.
 */
export async function resolveNotificationTarget(notification: {
  type: string;
  reference_id: string | null;
}): Promise<string> {
  const refId = notification.reference_id;

  if (MATCH_TYPES.has(notification.type) && refId) {
    const { data: prop } = await supabase
      .from("match_proposals")
      .select("id")
      .eq("id", refId)
      .maybeSingle();
    if (prop?.id) return `/proposals/${refId}`;

    const { data: slot } = await supabase
      .from("event_fight_slots")
      .select("id")
      .eq("id", refId)
      .maybeSingle();
    if (slot?.id) {
      return `/dashboard?section=actions&actionItem=${refId}&actionTab=auto`;
    }

    return "/dashboard?section=actions";
  }

  return "/dashboard?section=actions";
}
