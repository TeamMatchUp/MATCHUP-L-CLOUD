import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useDashboardData() {
  const { user, effectiveRoles } = useAuth();
  const queryClient = useQueryClient();

  const isCoachOrOwner = effectiveRoles.includes("gym_owner") || effectiveRoles.includes("coach");
  const isOrganiser = effectiveRoles.includes("organiser");
  const isFighter = effectiveRoles.includes("fighter");

  // Gyms owned by user OR linked via approved gym_claims
  const { data: myGyms = [], isLoading: gymsLoading } = useQuery({
    queryKey: ["dash-gyms", user?.id],
    queryFn: async () => {
      const gymSelect = "id, name, location, city, address, country, description, contact_email, phone, website, fighter_gym_links(fighter_id)";

      // Fetch gyms where coach_id matches
      const ownedPromise = supabase
        .from("gyms")
        .select(gymSelect)
        .eq("coach_id", user!.id)
        .order("name");

      // Fetch gym_ids from approved claims
      const claimedPromise = supabase
        .from("gym_claims")
        .select("gym_id")
        .eq("user_id", user!.id)
        .eq("status", "approved");

      const [ownedRes, claimedRes] = await Promise.all([ownedPromise, claimedPromise]);

      const ownedGyms = ownedRes.data ?? [];
      const claimedGymIds = (claimedRes.data ?? []).map((c) => c.gym_id);

      // Fetch claimed gyms not already in owned set
      const ownedIds = new Set(ownedGyms.map((g) => g.id));
      const missingIds = claimedGymIds.filter((id) => !ownedIds.has(id));

      let claimedGyms: typeof ownedGyms = [];
      if (missingIds.length > 0) {
        const { data } = await supabase
          .from("gyms")
          .select(gymSelect)
          .in("id", missingIds)
          .order("name");
        claimedGyms = data ?? [];
      }

      return [...ownedGyms, ...claimedGyms];
    },
    enabled: !!user && isCoachOrOwner,
    refetchOnMount: true,
    staleTime: 0,
  });

  const primaryGym = myGyms[0] ?? null;

  // Fighter profile (for fighter role)
  const { data: fighterProfile } = useQuery({
    queryKey: ["dash-fighter-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && isFighter,
  });

  // Fighters created by user (as coach)
  const { data: createdFighters = [] } = useQuery({
    queryKey: ["dash-created-fighters", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("*")
        .eq("created_by_coach_id", user!.id)
        .order("name");
      return data ?? [];
    },
    enabled: !!user && isCoachOrOwner,
  });

  // Fighter-gym links
  const gymIds = myGyms.map((g) => g.id);
  const { data: fighterGymLinks = [] } = useQuery({
    queryKey: ["dash-fgl", gymIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("fighter_id, gym_id")
        .in("gym_id", gymIds);
      return data ?? [];
    },
    enabled: gymIds.length > 0,
  });

  // Gym-linked fighters
  const linkedFighterIds = useMemo(
    () => [...new Set(fighterGymLinks.map((l) => l.fighter_id))],
    [fighterGymLinks]
  );

  const { data: gymFighters = [] } = useQuery({
    queryKey: ["dash-gym-fighters", linkedFighterIds],
    queryFn: async () => {
      if (linkedFighterIds.length === 0) return [];
      const { data } = await supabase
        .from("fighter_profiles")
        .select("*")
        .in("id", linkedFighterIds);
      return data ?? [];
    },
    enabled: linkedFighterIds.length > 0,
  });

  // Combine unique fighters
  const allFighters = useMemo(() => {
    const map = new Map<string, any>();
    [...createdFighters, ...gymFighters].forEach((f) => map.set(f.id, f));
    return Array.from(map.values());
  }, [createdFighters, gymFighters]);

  const allFighterIds = useMemo(() => allFighters.map((f) => f.id), [allFighters]);

  // Proposals
  const proposalFighterIds = useMemo(() => {
    const ids = [...allFighterIds];
    if (fighterProfile) ids.push(fighterProfile.id);
    return ids;
  }, [allFighterIds, fighterProfile]);

  const { data: proposals = [] } = useQuery({
    queryKey: ["dash-proposals", proposalFighterIds],
    queryFn: async () => {
      if (proposalFighterIds.length === 0) return [];
      const sel =
        "*, fighter_a:fighter_profiles!match_proposals_fighter_a_id_fkey(*), fighter_b:fighter_profiles!match_proposals_fighter_b_id_fkey(*), fight_slot:fight_slots!match_proposals_fight_slot_id_fkey(*, events(*))";
      const { data: pA } = await supabase
        .from("match_proposals")
        .select(sel)
        .in("fighter_a_id", proposalFighterIds)
        .in("status", ["pending", "confirmed"]);
      const { data: pB } = await supabase
        .from("match_proposals")
        .select(sel)
        .in("fighter_b_id", proposalFighterIds)
        .in("status", ["pending", "confirmed"]);
      const map = new Map<string, any>();
      [...(pA || []), ...(pB || [])].forEach((p) => map.set(p.id, p));
      return Array.from(map.values());
    },
    enabled: proposalFighterIds.length > 0,
  });

  // Events created by user
  const { data: events = [] } = useQuery({
    queryKey: ["dash-events", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*, fight_slots(*)")
        .eq("organiser_id", user!.id)
        .order("date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user && (isOrganiser || isCoachOrOwner),
  });

  // Published events for calendar
  const { data: calendarEvents = [] } = useQuery({
    queryKey: ["dash-calendar-events"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("events")
        .select("id, title, date, location, status")
        .eq("status", "published")
        .gte("date", today)
        .order("date")
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Highlighted dates for calendar based on role
  const { data: highlightedDates = [] } = useQuery({
    queryKey: ["dash-highlighted-dates", user?.id, isFighter, isCoachOrOwner, isOrganiser],
    queryFn: async () => {
      const dates = new Set<string>();

      if (isOrganiser) {
        // Organiser: events they own
        const { data } = await supabase
          .from("events")
          .select("date")
          .eq("organiser_id", user!.id);
        (data ?? []).forEach((e) => dates.add(e.date));
      }

      if (isFighter) {
        // Fighter: confirmed event_fight_slots
        const { data: fp } = await supabase
          .from("fighter_profiles")
          .select("id")
          .eq("user_id", user!.id)
          .maybeSingle();
        if (fp) {
          const { data: slots } = await supabase
            .from("event_fight_slots")
            .select("event_id")
            .or(`fighter_a_id.eq.${fp.id},fighter_b_id.eq.${fp.id}`)
            .eq("status", "confirmed");
          const eventIds = [...new Set((slots ?? []).map((s) => s.event_id))];
          if (eventIds.length > 0) {
            const { data: evts } = await supabase
              .from("events")
              .select("date")
              .in("id", eventIds);
            (evts ?? []).forEach((e) => dates.add(e.date));
          }
        }
      }

      if (isCoachOrOwner) {
        // Coach: roster fighters in confirmed slots
        const { data: rosterFighters } = await supabase
          .from("fighter_profiles")
          .select("id")
          .eq("created_by_coach_id", user!.id);
        const rosterIds = (rosterFighters ?? []).map((f) => f.id);
        
        // Also include gym-linked fighters
        const { data: coachGyms } = await supabase
          .from("gyms")
          .select("id")
          .eq("coach_id", user!.id);
        const gymIds = (coachGyms ?? []).map((g) => g.id);
        if (gymIds.length > 0) {
          const { data: links } = await supabase
            .from("fighter_gym_links")
            .select("fighter_id")
            .in("gym_id", gymIds)
            .eq("status", "approved");
          (links ?? []).forEach((l) => { if (!rosterIds.includes(l.fighter_id)) rosterIds.push(l.fighter_id); });
        }

        if (rosterIds.length > 0) {
          const { data: slotsA } = await supabase
            .from("event_fight_slots")
            .select("event_id")
            .in("fighter_a_id", rosterIds)
            .eq("status", "confirmed");
          const { data: slotsB } = await supabase
            .from("event_fight_slots")
            .select("event_id")
            .in("fighter_b_id", rosterIds)
            .eq("status", "confirmed");
          const eIds = [...new Set([...(slotsA ?? []), ...(slotsB ?? [])].map((s) => s.event_id))];
          if (eIds.length > 0) {
            const { data: evts } = await supabase
              .from("events")
              .select("date")
              .in("id", eIds);
            (evts ?? []).forEach((e) => dates.add(e.date));
          }
        }
      }

      return Array.from(dates);
    },
    enabled: !!user,
  });

  // Notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["dash-notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  const pendingProposals = proposals.filter((p: any) => p.status === "pending");
  const confirmedProposals = proposals.filter((p: any) => p.status === "confirmed");
  const unreadNotifications = notifications.filter((n: any) => !n.read);

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && key.startsWith("dash-");
      },
    });
  };

  return {
    user,
    effectiveRoles,
    isCoachOrOwner,
    isOrganiser,
    isFighter,
    myGyms,
    primaryGym,
    gymsLoading,
    fighterProfile,
    allFighters,
    allFighterIds,
    fighterGymLinks,
    proposals,
    pendingProposals,
    confirmedProposals,
    events,
    calendarEvents,
    notifications,
    unreadNotifications,
    handleRefresh,
  };
}
