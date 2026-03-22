import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Eye, Undo2, Clock, Swords, Building2, Send, Calendar, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { formatEnum } from "@/lib/format";

function unwrap<T>(val: T | T[] | null | undefined): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val ?? null;
}

interface ActionItem {
  id: string;
  type: "gym_request" | "trial_lead" | "match_suggestion" | "event_interest" | "match_proposal" | "event_claim";
  title: string;
  subtitle: string;
  timestamp: string;
  status: string;
  meta?: any;
}

interface RecentAction {
  itemId: string;
  action: "accepted" | "declined";
  at: number;
}

interface DashboardActionsProps {
  userId: string;
  isCoachOrOwner: boolean;
  isFighter: boolean;
  isOrganiser: boolean;
  fighterProfile: any | null;
  myGyms: any[];
  allFighterIds: string[];
  onRefresh: () => void;
}

export function DashboardActions({
  userId,
  isCoachOrOwner,
  isFighter,
  isOrganiser,
  fighterProfile,
  myGyms,
  allFighterIds,
  onRefresh,
}: DashboardActionsProps) {
  const queryClient = useQueryClient();
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);

  const gymIds = myGyms.map((g) => g.id);

  // Coach: pending gym join requests
  const { data: gymRequests = [] } = useQuery({
    queryKey: ["actions-gym-requests", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("id, fighter_id, gym_id, status, created_at, fighter:fighter_profiles(id, name, discipline, weight_class), gym:gyms(id, name)")
        .in("gym_id", gymIds)
        .eq("status", "pending");
      return (data ?? []).map((r: any) => ({
        id: r.id,
        type: "gym_request" as const,
        title: `${unwrap(r.fighter)?.name ?? "Fighter"} wants to join ${unwrap(r.gym)?.name ?? "your gym"}`,
        subtitle: `${unwrap(r.fighter)?.discipline ?? ""} · ${formatEnum(unwrap(r.fighter)?.weight_class ?? "")}`,
        timestamp: r.created_at,
        status: r.status,
        meta: { fighterId: r.fighter_id, gymId: r.gym_id, fighter: unwrap(r.fighter), gym: unwrap(r.gym) },
      }));
    },
    enabled: isCoachOrOwner && gymIds.length > 0,
  });

  // Coach: trial session leads
  const { data: trialLeads = [] } = useQuery({
    queryKey: ["actions-trial-leads", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const { data } = await supabase
        .from("gym_leads")
        .select("id, name, email, type, status, created_at, gym_id, user_id, gym:gyms(name)")
        .in("gym_id", gymIds)
        .eq("status", "pending");
      return (data ?? []).map((l: any) => ({
        id: l.id,
        type: "trial_lead" as const,
        title: `${l.name} — ${l.type === "trial_request" ? "Trial session request" : "Interest registered"}`,
        subtitle: unwrap(l.gym)?.name ?? "Your gym",
        timestamp: l.created_at,
        status: l.status,
        meta: l,
      }));
    },
    enabled: isCoachOrOwner && gymIds.length > 0,
  });

  // Fighter: pending gym requests they sent
  const { data: fighterGymRequests = [] } = useQuery({
    queryKey: ["actions-fighter-gym-reqs", fighterProfile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("id, gym_id, status, created_at, gym:gyms(name)")
        .eq("fighter_id", fighterProfile!.id)
        .eq("status", "pending");
      return (data ?? []).map((r: any) => ({
        id: r.id,
        type: "gym_request" as const,
        title: `Pending join request — ${unwrap(r.gym)?.name ?? "Gym"}`,
        subtitle: "Awaiting coach approval",
        timestamp: r.created_at,
        status: "info",
        meta: r,
      }));
    },
    enabled: isFighter && !!fighterProfile,
  });

  // Fighter: match suggestions
  const { data: matchSuggestions = [] } = useQuery({
    queryKey: ["actions-match-suggestions", fighterProfile?.id],
    queryFn: async () => {
      const { data: asA } = await supabase
        .from("match_suggestions")
        .select("id, composite_score, status, created_at, event:events(title), fighter_a:fighter_profiles!match_suggestions_fighter_a_id_fkey(name), fighter_b:fighter_profiles!match_suggestions_fighter_b_id_fkey(name)")
        .eq("fighter_a_id", fighterProfile!.id)
        .eq("status", "suggested");
      const { data: asB } = await supabase
        .from("match_suggestions")
        .select("id, composite_score, status, created_at, event:events(title), fighter_a:fighter_profiles!match_suggestions_fighter_a_id_fkey(name), fighter_b:fighter_profiles!match_suggestions_fighter_b_id_fkey(name)")
        .eq("fighter_b_id", fighterProfile!.id)
        .eq("status", "suggested");
      const map = new Map<string, any>();
      [...(asA ?? []), ...(asB ?? [])].forEach((s) => map.set(s.id, s));
      return Array.from(map.values()).map((s: any) => ({
        id: s.id,
        type: "match_suggestion" as const,
        title: `Match suggestion: ${unwrap(s.fighter_a)?.name} vs ${unwrap(s.fighter_b)?.name}`,
        subtitle: `${unwrap(s.event)?.title ?? "Event"} · Score: ${Math.round((s.composite_score ?? 0) * 100)}%`,
        timestamp: s.created_at,
        status: "suggested",
        meta: s,
      }));
    },
    enabled: isFighter && !!fighterProfile,
  });

  // Fighter: event interests
  const { data: eventInterests = [] } = useQuery({
    queryKey: ["actions-event-interests", fighterProfile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_event_interests")
        .select("id, created_at, event:events(id, title, date, city)")
        .eq("fighter_id", fighterProfile!.id);
      return (data ?? []).map((i: any) => ({
        id: i.id,
        type: "event_interest" as const,
        title: `Interested in ${unwrap(i.event)?.title ?? "Event"}`,
        subtitle: `${unwrap(i.event)?.city ?? ""} · ${unwrap(i.event)?.date ?? ""}`,
        timestamp: i.created_at,
        status: "info",
        meta: { eventId: unwrap(i.event)?.id },
      }));
    },
    enabled: isFighter && !!fighterProfile,
  });

  // Organiser: pending event claims
  const { data: eventClaims = [] } = useQuery({
    queryKey: ["actions-event-claims", userId],
    queryFn: async () => {
      // Get event IDs this organiser owns
      const { data: myEvents } = await supabase
        .from("events")
        .select("id")
        .eq("organiser_id", userId);
      if (!myEvents || myEvents.length === 0) return [];
      const eventIds = myEvents.map((e) => e.id);
      const { data } = await supabase
        .from("event_claims")
        .select("*")
        .in("event_id", eventIds)
        .eq("status", "pending");
      return (data ?? []).map((c: any) => ({
        id: c.id,
        type: "event_claim" as const,
        title: `Event claim from ${c.claimant_name}`,
        subtitle: `${c.claimant_role} · ${c.claimant_email}`,
        timestamp: c.created_at,
        status: "pending",
        meta: c,
      }));
    },
    enabled: isOrganiser,
  });

  // Organiser: match suggestions for their events
  const { data: organiserSuggestions = [] } = useQuery({
    queryKey: ["actions-organiser-suggestions", userId],
    queryFn: async () => {
      const { data: myEvents } = await supabase
        .from("events")
        .select("id")
        .eq("organiser_id", userId);
      if (!myEvents || myEvents.length === 0) return [];
      const eventIds = myEvents.map((e) => e.id);
      const { data } = await supabase
        .from("match_suggestions")
        .select("id, composite_score, status, created_at, event:events(title), fighter_a:fighter_profiles!match_suggestions_fighter_a_id_fkey(name), fighter_b:fighter_profiles!match_suggestions_fighter_b_id_fkey(name)")
        .in("event_id", eventIds)
        .in("status", ["suggested", "confirmed"]);
      return (data ?? []).map((s: any) => ({
        id: s.id,
        type: "match_suggestion" as const,
        title: `${unwrap(s.fighter_a)?.name} vs ${unwrap(s.fighter_b)?.name}`,
        subtitle: `${unwrap(s.event)?.title ?? "Event"} · ${s.status === "confirmed" ? "Confirmed" : `Score: ${Math.round((s.composite_score ?? 0) * 100)}%`}`,
        timestamp: s.created_at,
        status: s.status,
        meta: s,
      }));
    },
    enabled: isOrganiser,
  });

  // Combine all items
  const allItems: ActionItem[] = [
    ...gymRequests,
    ...trialLeads,
    ...fighterGymRequests,
    ...matchSuggestions,
    ...eventInterests,
    ...eventClaims,
    ...organiserSuggestions,
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const recentlyActioned = recentActions.filter((a) => Date.now() - a.at < 24 * 60 * 60 * 1000);
  const actionedIds = new Set(recentlyActioned.map((a) => a.itemId));
  const activeItems = allItems.filter((item) => !actionedIds.has(item.id));

  const handleAcceptGymRequest = async (item: ActionItem) => {
    try {
      await supabase
        .from("fighter_gym_links")
        .update({ status: "approved" })
        .eq("id", item.id);

      // Update profiles.gym_id
      if (item.meta?.fighter?.id) {
        const { data: fp } = await supabase
          .from("fighter_profiles")
          .select("user_id")
          .eq("id", item.meta.fighterId)
          .single();
        if (fp?.user_id) {
          await supabase.from("profiles").update({ gym_id: item.meta.gymId }).eq("id", fp.user_id);
        }
      }

      setRecentActions((prev) => [...prev, { itemId: item.id, action: "accepted", at: Date.now() }]);
      toast.success("Request approved");
      invalidate();
    } catch {
      toast.error("Failed to approve");
    }
  };

  const handleDeclineGymRequest = async (item: ActionItem) => {
    try {
      await supabase.from("fighter_gym_links").update({ status: "declined" }).eq("id", item.id);
      setRecentActions((prev) => [...prev, { itemId: item.id, action: "declined", at: Date.now() }]);
      toast.success("Request declined");
      invalidate();
    } catch {
      toast.error("Failed to decline");
    }
  };

  const handleUndo = async (ra: RecentAction) => {
    const item = allItems.find((i) => i.id === ra.itemId);
    if (!item) return;
    if (item.type === "gym_request") {
      await supabase.from("fighter_gym_links").update({ status: "pending" }).eq("id", item.id);
    }
    setRecentActions((prev) => prev.filter((a) => a.itemId !== ra.itemId));
    toast.success("Action undone");
    invalidate();
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.startsWith("actions-") });
    onRefresh();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "gym_request": return Building2;
      case "trial_lead": return Send;
      case "match_suggestion": return Swords;
      case "event_interest": return Calendar;
      case "match_proposal": return Swords;
      case "event_claim": return Users;
      default: return Clock;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "gym_request": return { label: "Gym request", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
      case "trial_lead": return { label: "Trial request", className: "bg-green-500/15 text-green-400 border-green-500/30" };
      case "match_suggestion": return { label: "Match", className: "bg-primary/15 text-primary border-primary/30" };
      case "event_interest": return { label: "Event interest", className: "bg-purple-500/15 text-purple-400 border-purple-500/30" };
      case "event_claim": return { label: "Event claim", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
      default: return { label: type, className: "" };
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-2xl text-foreground">
        ACTION <span className="text-primary">CENTRE</span>
      </h2>

      {/* Recently actioned - undo section */}
      {recentlyActioned.length > 0 && (
        <div className="space-y-2 mb-4">
          {recentlyActioned.map((ra) => {
            const item = allItems.find((i) => i.id === ra.itemId);
            if (!item) return null;
            return (
              <div
                key={ra.itemId}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 text-sm"
              >
                <span className="text-muted-foreground">
                  {ra.action === "accepted" ? "✓ Accepted" : "✗ Declined"}: {item.title}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs text-primary"
                  onClick={() => handleUndo(ra)}
                >
                  <Undo2 className="h-3 w-3" /> Undo
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {activeItems.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-border bg-card">
          <Check className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">All caught up — no actions required.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeItems.map((item) => {
            const Icon = getIcon(item.type);
            const badge = getTypeBadge(item.type);
            const isCoachGymRequest = item.type === "gym_request" && isCoachOrOwner && item.status === "pending";

            return (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-card p-4 flex items-start gap-4 hover:border-primary/20 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className={badge.className + " text-[10px]"}>
                      {badge.label}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isCoachGymRequest && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                        onClick={() => handleAcceptGymRequest(item)}
                      >
                        <Check className="h-3 w-3 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeclineGymRequest(item)}
                      >
                        <X className="h-3 w-3 mr-1" /> Decline
                      </Button>
                    </>
                  )}
                  {item.type === "event_interest" && item.meta?.eventId && (
                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs" asChild>
                      <Link to={`/events/${item.meta.eventId}`}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Link>
                    </Button>
                  )}
                  {item.type === "match_suggestion" && (
                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs" asChild>
                      <Link to={`/matchmaking?event=${item.meta?.event_id ?? ""}`}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Link>
                    </Button>
                  )}
                  {item.type === "trial_lead" && (
                    <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function useActionsCount(
  userId: string,
  isCoachOrOwner: boolean,
  isFighter: boolean,
  isOrganiser: boolean,
  fighterProfile: any | null,
  gymIds: string[],
) {
  const { data: count = 0 } = useQuery({
    queryKey: ["actions-count", userId, gymIds, fighterProfile?.id],
    queryFn: async () => {
      let total = 0;
      // Coach gym requests
      if (isCoachOrOwner && gymIds.length > 0) {
        const { count: c } = await supabase
          .from("fighter_gym_links")
          .select("id", { count: "exact", head: true })
          .in("gym_id", gymIds)
          .eq("status", "pending");
        total += c ?? 0;
      }
      // Coach trial leads
      if (isCoachOrOwner && gymIds.length > 0) {
        const { count: c } = await supabase
          .from("gym_leads")
          .select("id", { count: "exact", head: true })
          .in("gym_id", gymIds)
          .eq("status", "pending");
        total += c ?? 0;
      }
      // Fighter gym requests
      if (isFighter && fighterProfile) {
        const { count: c } = await supabase
          .from("fighter_gym_links")
          .select("id", { count: "exact", head: true })
          .eq("fighter_id", fighterProfile.id)
          .eq("status", "pending");
        total += c ?? 0;
      }
      return total;
    },
    enabled: !!userId,
    staleTime: 30000,
  });
  return count;
}
