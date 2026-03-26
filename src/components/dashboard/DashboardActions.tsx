import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, X, Eye, Undo2, Clock, Swords, Building2, Send, Calendar, Users, Search, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { formatEnum } from "@/lib/format";

function unwrap<T>(val: T | T[] | null | undefined): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val ?? null;
}

interface ActionItem {
  id: string;
  type: "gym_request" | "trial_lead" | "match_suggestion" | "event_interest" | "match_proposal" | "event_claim" | "fight_proposal" | "bout_proposal";
  title: string;
  subtitle: string;
  timestamp: string;
  status: string;
  meta?: any;
}

interface RecentAction {
  itemId: string;
  action: "accepted" | "declined";
  previousStatus: string;
  at: number;
}

interface DiscardedItem {
  item: ActionItem;
  discardedAt: number;
  previousStatus: string;
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
  const [trialModal, setTrialModal] = useState<ActionItem | null>(null);
  const [trialMessage, setTrialMessage] = useState("");
  const [trialSending, setTrialSending] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"active" | "completed" | "bin">("active");
  const [searchFilter, setSearchFilter] = useState("");
  const [discardedItems, setDiscardedItems] = useState<DiscardedItem[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const gymIds = myGyms.map((g) => g.id);

  // ── ACTIVE QUERIES (pending/unresolved items) ──

  // Coach: pending gym join requests
  const { data: gymRequestsActive = [] } = useQuery({
    queryKey: ["actions-gym-requests-active", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("id, fighter_id, gym_id, status, created_at, fighter:fighter_profiles(id, name, discipline, weight_class), gym:gyms(id, name)")
        .in("gym_id", gymIds)
        .eq("status", "pending");
      return (data ?? []).map((r: any) => ({
        id: r.id, type: "gym_request" as const,
        title: `${unwrap(r.fighter)?.name ?? "Fighter"} wants to join ${unwrap(r.gym)?.name ?? "your gym"}`,
        subtitle: `${unwrap(r.fighter)?.discipline ?? ""} · ${formatEnum(unwrap(r.fighter)?.weight_class ?? "")}`,
        timestamp: r.created_at, status: r.status,
        meta: { fighterId: r.fighter_id, gymId: r.gym_id, fighter: unwrap(r.fighter), gym: unwrap(r.gym) },
      }));
    },
    enabled: isCoachOrOwner && gymIds.length > 0,
  });

  // Coach: completed gym join requests
  const { data: gymRequestsCompleted = [] } = useQuery({
    queryKey: ["actions-gym-requests-completed", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("id, fighter_id, gym_id, status, created_at, fighter:fighter_profiles(id, name, discipline, weight_class), gym:gyms(id, name)")
        .in("gym_id", gymIds)
        .in("status", ["approved", "declined"]);
      return (data ?? []).map((r: any) => ({
        id: r.id, type: "gym_request" as const,
        title: `${unwrap(r.fighter)?.name ?? "Fighter"} — ${r.status === "approved" ? "Approved" : "Declined"}`,
        subtitle: `${unwrap(r.gym)?.name ?? "Gym"} · ${unwrap(r.fighter)?.discipline ?? ""}`,
        timestamp: r.created_at, status: r.status,
        meta: { fighterId: r.fighter_id, gymId: r.gym_id, fighter: unwrap(r.fighter), gym: unwrap(r.gym) },
      }));
    },
    enabled: isCoachOrOwner && gymIds.length > 0,
  });

  // Coach: trial session leads (pending = active)
  const { data: trialLeadsActive = [] } = useQuery({
    queryKey: ["actions-trial-leads-active", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const { data } = await supabase
        .from("gym_leads")
        .select("id, name, email, type, status, created_at, gym_id, user_id, gym:gyms(name)")
        .in("gym_id", gymIds)
        .eq("status", "pending");
      return (data ?? []).map((l: any) => ({
        id: l.id, type: "trial_lead" as const,
        title: `${l.name} — ${l.type === "trial_request" ? "Trial session request" : "Interest registered"}`,
        subtitle: unwrap(l.gym)?.name ?? "Your gym",
        timestamp: l.created_at, status: l.status, meta: l,
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
        id: r.id, type: "gym_request" as const,
        title: `Pending join request — ${unwrap(r.gym)?.name ?? "Gym"}`,
        subtitle: "Awaiting coach approval",
        timestamp: r.created_at, status: "pending", meta: r,
      }));
    },
    enabled: isFighter && !!fighterProfile,
  });

  // Fighter: match suggestions (suggested status = active)
  const { data: matchSuggestions = [] } = useQuery({
    queryKey: ["actions-match-suggestions", fighterProfile?.id],
    queryFn: async () => {
      const { data: asA } = await supabase
        .from("match_suggestions")
        .select("id, composite_score, status, created_at, event_id, event:events(title), fighter_a:fighter_profiles!match_suggestions_fighter_a_id_fkey(name), fighter_b:fighter_profiles!match_suggestions_fighter_b_id_fkey(name)")
        .eq("fighter_a_id", fighterProfile!.id).eq("status", "suggested");
      const { data: asB } = await supabase
        .from("match_suggestions")
        .select("id, composite_score, status, created_at, event_id, event:events(title), fighter_a:fighter_profiles!match_suggestions_fighter_a_id_fkey(name), fighter_b:fighter_profiles!match_suggestions_fighter_b_id_fkey(name)")
        .eq("fighter_b_id", fighterProfile!.id).eq("status", "suggested");
      const map = new Map<string, any>();
      [...(asA ?? []), ...(asB ?? [])].forEach((s) => map.set(s.id, s));
      return Array.from(map.values()).map((s: any) => ({
        id: s.id, type: "match_suggestion" as const,
        title: `Match suggestion: ${unwrap(s.fighter_a)?.name} vs ${unwrap(s.fighter_b)?.name}`,
        subtitle: `${unwrap(s.event)?.title ?? "Event"} · Score: ${Math.round((s.composite_score ?? 0) * 100)}%`,
        timestamp: s.created_at, status: "suggested", meta: s,
      }));
    },
    enabled: isFighter && !!fighterProfile,
  });

  // Fighter: confirmed fight proposals (completed)
  const { data: fightProposals = [] } = useQuery({
    queryKey: ["actions-fight-proposals", fighterProfile?.id],
    queryFn: async () => {
      const { data: asA } = await supabase
        .from("match_suggestions")
        .select("id, composite_score, status, created_at, event_id, event:events(title), fighter_a:fighter_profiles!match_suggestions_fighter_a_id_fkey(name), fighter_b:fighter_profiles!match_suggestions_fighter_b_id_fkey(name)")
        .eq("fighter_a_id", fighterProfile!.id).eq("status", "confirmed");
      const { data: asB } = await supabase
        .from("match_suggestions")
        .select("id, composite_score, status, created_at, event_id, event:events(title), fighter_a:fighter_profiles!match_suggestions_fighter_a_id_fkey(name), fighter_b:fighter_profiles!match_suggestions_fighter_b_id_fkey(name)")
        .eq("fighter_b_id", fighterProfile!.id).eq("status", "confirmed");
      const map = new Map<string, any>();
      [...(asA ?? []), ...(asB ?? [])].forEach((s) => map.set(s.id, s));
      return Array.from(map.values()).map((s: any) => ({
        id: s.id, type: "fight_proposal" as const,
        title: `Proposed fight: ${unwrap(s.fighter_a)?.name} vs ${unwrap(s.fighter_b)?.name}`,
        subtitle: unwrap(s.event)?.title ?? "Event",
        timestamp: s.created_at, status: "confirmed",
        meta: { ...s, eventId: s.event_id },
      }));
    },
    enabled: isFighter && !!fighterProfile,
  });

  // Fighter/Coach: bout proposals (proposed = active)
  const { data: boutProposalsActive = [] } = useQuery({
    queryKey: ["actions-bout-proposals-active", fighterProfile?.id, allFighterIds],
    queryFn: async () => {
      const ids = fighterProfile ? [fighterProfile.id, ...allFighterIds] : allFighterIds;
      if (ids.length === 0) return [];
      const uniqueIds = [...new Set(ids)];
      const { data: asA } = await supabase
        .from("event_fight_slots")
        .select("id, event_id, fighter_a_id, fighter_b_id, weight_class, bout_type, status, created_at, fighter_a:fighter_profiles!event_fight_slots_fighter_a_id_fkey(name), fighter_b:fighter_profiles!event_fight_slots_fighter_b_id_fkey(name), event:events!event_fight_slots_event_id_fkey(title, date)")
        .in("fighter_a_id", uniqueIds).eq("status", "proposed");
      const { data: asB } = await supabase
        .from("event_fight_slots")
        .select("id, event_id, fighter_a_id, fighter_b_id, weight_class, bout_type, status, created_at, fighter_a:fighter_profiles!event_fight_slots_fighter_a_id_fkey(name), fighter_b:fighter_profiles!event_fight_slots_fighter_b_id_fkey(name), event:events!event_fight_slots_event_id_fkey(title, date)")
        .in("fighter_b_id", uniqueIds).eq("status", "proposed");
      const map = new Map<string, any>();
      [...(asA ?? []), ...(asB ?? [])].forEach((s) => map.set(s.id, s));
      let myAcceptances = new Set<string>();
      const slotIds = Array.from(map.keys());
      if (slotIds.length > 0) {
        const { data: accs } = await supabase.from("bout_acceptances").select("slot_id").eq("user_id", userId).in("slot_id", slotIds);
        myAcceptances = new Set((accs ?? []).map((a: any) => a.slot_id));
      }
      return Array.from(map.values())
        .filter((s: any) => !myAcceptances.has(s.id))
        .map((s: any) => {
          const fA = Array.isArray(s.fighter_a) ? s.fighter_a[0] : s.fighter_a;
          const fB = Array.isArray(s.fighter_b) ? s.fighter_b[0] : s.fighter_b;
          const evt = Array.isArray(s.event) ? s.event[0] : s.event;
          return {
            id: s.id, type: "bout_proposal" as const,
            title: `Fight proposal: ${fA?.name ?? "TBA"} vs ${fB?.name ?? "TBA"}`,
            subtitle: `${evt?.title ?? "Event"} · ${s.bout_type ?? "Undercard"} · ${formatEnum(s.weight_class ?? "")}`,
            timestamp: s.created_at, status: "proposed",
            meta: { ...s, eventId: s.event_id, fighterAName: fA?.name, fighterBName: fB?.name, eventTitle: evt?.title },
          };
        });
    },
    enabled: (isFighter && !!fighterProfile) || (isCoachOrOwner && allFighterIds.length > 0),
  });

  // Fighter/Coach: bout proposals (confirmed/declined = completed)
  const { data: boutProposalsCompleted = [] } = useQuery({
    queryKey: ["actions-bout-proposals-completed", fighterProfile?.id, allFighterIds],
    queryFn: async () => {
      const ids = fighterProfile ? [fighterProfile.id, ...allFighterIds] : allFighterIds;
      if (ids.length === 0) return [];
      const uniqueIds = [...new Set(ids)];
      const { data: asA } = await supabase
        .from("event_fight_slots")
        .select("id, event_id, fighter_a_id, fighter_b_id, weight_class, bout_type, status, created_at, fighter_a:fighter_profiles!event_fight_slots_fighter_a_id_fkey(name), fighter_b:fighter_profiles!event_fight_slots_fighter_b_id_fkey(name), event:events!event_fight_slots_event_id_fkey(title, date)")
        .in("fighter_a_id", uniqueIds).in("status", ["confirmed", "declined"]);
      const { data: asB } = await supabase
        .from("event_fight_slots")
        .select("id, event_id, fighter_a_id, fighter_b_id, weight_class, bout_type, status, created_at, fighter_a:fighter_profiles!event_fight_slots_fighter_a_id_fkey(name), fighter_b:fighter_profiles!event_fight_slots_fighter_b_id_fkey(name), event:events!event_fight_slots_event_id_fkey(title, date)")
        .in("fighter_b_id", uniqueIds).in("status", ["confirmed", "declined"]);
      const map = new Map<string, any>();
      [...(asA ?? []), ...(asB ?? [])].forEach((s) => map.set(s.id, s));
      return Array.from(map.values()).map((s: any) => {
        const fA = Array.isArray(s.fighter_a) ? s.fighter_a[0] : s.fighter_a;
        const fB = Array.isArray(s.fighter_b) ? s.fighter_b[0] : s.fighter_b;
        const evt = Array.isArray(s.event) ? s.event[0] : s.event;
        return {
          id: s.id, type: "bout_proposal" as const,
          title: `${fA?.name ?? "TBA"} vs ${fB?.name ?? "TBA"} — ${s.status === "confirmed" ? "Confirmed" : "Declined"}`,
          subtitle: `${evt?.title ?? "Event"} · ${s.bout_type ?? "Undercard"} · ${formatEnum(s.weight_class ?? "")}`,
          timestamp: s.created_at, status: s.status,
          meta: { ...s, eventId: s.event_id, fighterAName: fA?.name, fighterBName: fB?.name, eventTitle: evt?.title },
        };
      });
    },
    enabled: (isFighter && !!fighterProfile) || (isCoachOrOwner && allFighterIds.length > 0),
  });

  // Fighter: event interests (informational - active)
  const { data: eventInterests = [] } = useQuery({
    queryKey: ["actions-event-interests", fighterProfile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_event_interests")
        .select("id, created_at, event:events(id, title, date, city)")
        .eq("fighter_id", fighterProfile!.id);
      return (data ?? []).map((i: any) => ({
        id: i.id, type: "event_interest" as const,
        title: `Interested in ${unwrap(i.event)?.title ?? "Event"}`,
        subtitle: `${unwrap(i.event)?.city ?? ""} · ${unwrap(i.event)?.date ?? ""}`,
        timestamp: i.created_at, status: "info",
        meta: { eventId: unwrap(i.event)?.id },
      }));
    },
    enabled: isFighter && !!fighterProfile,
  });

  // Organiser: pending event claims (active)
  const { data: eventClaims = [] } = useQuery({
    queryKey: ["actions-event-claims", userId],
    queryFn: async () => {
      const { data: myEvents } = await supabase.from("events").select("id").eq("organiser_id", userId);
      if (!myEvents || myEvents.length === 0) return [];
      const eventIds = myEvents.map((e) => e.id);
      const { data } = await supabase.from("event_claims").select("*").in("event_id", eventIds).eq("status", "pending");
      return (data ?? []).map((c: any) => ({
        id: c.id, type: "event_claim" as const,
        title: `Event claim from ${c.claimant_name}`,
        subtitle: `${c.claimant_role} · ${c.claimant_email}`,
        timestamp: c.created_at, status: "pending", meta: c,
      }));
    },
    enabled: isOrganiser,
  });

  // Organiser: match suggestions for their events
  const { data: organiserSuggestionsActive = [] } = useQuery({
    queryKey: ["actions-organiser-suggestions-active", userId],
    queryFn: async () => {
      const { data: myEvents } = await supabase.from("events").select("id").eq("organiser_id", userId);
      if (!myEvents || myEvents.length === 0) return [];
      const eventIds = myEvents.map((e) => e.id);
      const { data } = await supabase
        .from("match_suggestions")
        .select("id, composite_score, status, created_at, event_id, event:events(title), fighter_a:fighter_profiles!match_suggestions_fighter_a_id_fkey(name), fighter_b:fighter_profiles!match_suggestions_fighter_b_id_fkey(name)")
        .in("event_id", eventIds).eq("status", "suggested");
      return (data ?? []).map((s: any) => ({
        id: s.id, type: "match_suggestion" as const,
        title: `${unwrap(s.fighter_a)?.name} vs ${unwrap(s.fighter_b)?.name}`,
        subtitle: `${unwrap(s.event)?.title ?? "Event"} · Score: ${Math.round((s.composite_score ?? 0) * 100)}%`,
        timestamp: s.created_at, status: s.status, meta: { ...s, eventId: s.event_id },
      }));
    },
    enabled: isOrganiser,
  });

  const { data: organiserSuggestionsCompleted = [] } = useQuery({
    queryKey: ["actions-organiser-suggestions-completed", userId],
    queryFn: async () => {
      const { data: myEvents } = await supabase.from("events").select("id").eq("organiser_id", userId);
      if (!myEvents || myEvents.length === 0) return [];
      const eventIds = myEvents.map((e) => e.id);
      const { data } = await supabase
        .from("match_suggestions")
        .select("id, composite_score, status, created_at, event_id, event:events(title), fighter_a:fighter_profiles!match_suggestions_fighter_a_id_fkey(name), fighter_b:fighter_profiles!match_suggestions_fighter_b_id_fkey(name)")
        .in("event_id", eventIds).in("status", ["confirmed", "dismissed"]);
      return (data ?? []).map((s: any) => ({
        id: s.id, type: "match_suggestion" as const,
        title: `${unwrap(s.fighter_a)?.name} vs ${unwrap(s.fighter_b)?.name} — ${s.status === "confirmed" ? "Confirmed" : "Dismissed"}`,
        subtitle: `${unwrap(s.event)?.title ?? "Event"}`,
        timestamp: s.created_at, status: s.status, meta: { ...s, eventId: s.event_id },
      }));
    },
    enabled: isOrganiser,
  });

  // Build active + completed lists
  const activeItems: ActionItem[] = [
    ...gymRequestsActive,
    ...trialLeadsActive,
    ...fighterGymRequests,
    ...matchSuggestions,
    ...boutProposalsActive,
    ...eventInterests,
    ...eventClaims,
    ...organiserSuggestionsActive,
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const completedItems: ActionItem[] = [
    ...gymRequestsCompleted,
    ...fightProposals,
    ...boutProposalsCompleted,
    ...organiserSuggestionsCompleted,
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const recentlyActioned = recentActions.filter((a) => Date.now() - a.at < 24 * 60 * 60 * 1000);

  // ── Action handlers ──

  const handleAcceptGymRequest = async (item: ActionItem) => {
    try {
      await supabase.from("fighter_gym_links").update({ status: "approved" }).eq("id", item.id);
      if (item.meta?.fighter?.id) {
        const { data: fp } = await supabase.from("fighter_profiles").select("user_id").eq("id", item.meta.fighterId).single();
        if (fp?.user_id) await supabase.from("profiles").update({ gym_id: item.meta.gymId }).eq("id", fp.user_id);
      }
      setRecentActions((prev) => [...prev, { itemId: item.id, action: "accepted", previousStatus: "pending", at: Date.now() }]);
      toast.success("Request approved");
      invalidate();
    } catch { toast.error("Failed to approve"); }
  };

  const handleDeclineGymRequest = async (item: ActionItem) => {
    try {
      await supabase.from("fighter_gym_links").update({ status: "declined" }).eq("id", item.id);
      setRecentActions((prev) => [...prev, { itemId: item.id, action: "declined", previousStatus: "pending", at: Date.now() }]);
      toast.success("Request declined");
      invalidate();
    } catch { toast.error("Failed to decline"); }
  };

  const handleTrialAccept = async () => {
    if (!trialModal) return;
    setTrialSending(true);
    try {
      if (trialModal.meta?.user_id) {
        await supabase.rpc("create_notification", {
          _user_id: trialModal.meta.user_id, _title: "Trial session accepted!",
          _message: trialMessage || `Your trial session request at ${trialModal.subtitle} has been accepted.`,
          _type: "system", _reference_id: trialModal.meta.gym_id,
        });
      }
      setRecentActions((prev) => [...prev, { itemId: trialModal.id, action: "accepted", previousStatus: "pending", at: Date.now() }]);
      toast.success("Trial session accepted, fighter notified");
      setTrialModal(null); setTrialMessage(""); invalidate();
    } catch { toast.error("Failed to accept"); } finally { setTrialSending(false); }
  };

  const handleTrialDecline = async () => {
    if (!trialModal) return;
    setTrialSending(true);
    try {
      if (trialModal.meta?.user_id) {
        await supabase.rpc("create_notification", {
          _user_id: trialModal.meta.user_id, _title: "Trial session declined",
          _message: trialMessage || `Your trial session request at ${trialModal.subtitle} was not accepted at this time.`,
          _type: "system", _reference_id: trialModal.meta.gym_id,
        });
      }
      setRecentActions((prev) => [...prev, { itemId: trialModal.id, action: "declined", previousStatus: "pending", at: Date.now() }]);
      toast.success("Trial session declined, fighter notified");
      setTrialModal(null); setTrialMessage(""); invalidate();
    } catch { toast.error("Failed to decline"); } finally { setTrialSending(false); }
  };

  const handleAcceptBoutProposal = async (item: ActionItem) => {
    try {
      await supabase.from("bout_acceptances").insert({ slot_id: item.id, user_id: userId, role: isFighter ? "fighter" : "coach" });
      const { data: accs } = await supabase.from("bout_acceptances").select("user_id").eq("slot_id", item.id);
      const acceptedIds = new Set((accs ?? []).map((a: any) => a.user_id));
      const meta = item.meta;
      const requiredIds = new Set<string>();
      const { data: slotData } = await supabase.from("event_fight_slots")
        .select("fighter_a_id, fighter_b_id, event_id, fighter_a:fighter_profiles!event_fight_slots_fighter_a_id_fkey(user_id, created_by_coach_id), fighter_b:fighter_profiles!event_fight_slots_fighter_b_id_fkey(user_id, created_by_coach_id)")
        .eq("id", item.id).single();
      if (slotData) {
        const fA = Array.isArray(slotData.fighter_a) ? slotData.fighter_a[0] : slotData.fighter_a;
        const fB = Array.isArray(slotData.fighter_b) ? slotData.fighter_b[0] : slotData.fighter_b;
        if (fA?.user_id) requiredIds.add(fA.user_id);
        if (fB?.user_id) requiredIds.add(fB.user_id);
        if (fA?.created_by_coach_id) requiredIds.add(fA.created_by_coach_id);
        if (fB?.created_by_coach_id) requiredIds.add(fB.created_by_coach_id);
        const { data: gymLinks } = await supabase.from("fighter_gym_links")
          .select("gym:gyms(coach_id)").in("fighter_id", [slotData.fighter_a_id, slotData.fighter_b_id]).eq("status", "approved");
        (gymLinks ?? []).forEach((l: any) => { const g = Array.isArray(l.gym) ? l.gym[0] : l.gym; if (g?.coach_id) requiredIds.add(g.coach_id); });
        const allAccepted = Array.from(requiredIds).every((id) => acceptedIds.has(id));
        if (allAccepted) {
          await supabase.from("event_fight_slots").update({ status: "confirmed" }).eq("id", item.id);
          const { data: evt } = await supabase.from("events").select("organiser_id, title").eq("id", slotData.event_id).single();
          const notifyIds = new Set(requiredIds);
          if (evt?.organiser_id) notifyIds.add(evt.organiser_id);
          notifyIds.delete(userId);
          for (const nid of notifyIds) {
            await supabase.rpc("create_notification", { _user_id: nid, _title: "Bout Confirmed", _message: `${meta.fighterAName ?? "Fighter"} vs ${meta.fighterBName ?? "Fighter"} is now confirmed for ${evt?.title ?? "an event"}.`, _type: "match_confirmed" as any, _reference_id: item.id });
          }
          toast.success("Bout confirmed — all parties accepted!");
        } else {
          toast.success("Accepted — waiting for other parties");
        }
      }
      setRecentActions((prev) => [...prev, { itemId: item.id, action: "accepted", previousStatus: "proposed", at: Date.now() }]);
      invalidate();
    } catch { toast.error("Failed to accept"); }
  };

  const handleDeclineBoutProposal = async (item: ActionItem) => {
    try {
      await supabase.from("event_fight_slots").update({ status: "declined" }).eq("id", item.id);
      const { data: slotData } = await supabase.from("event_fight_slots").select("event_id").eq("id", item.id).single();
      if (slotData) {
        const { data: evt } = await supabase.from("events").select("organiser_id, title").eq("id", slotData.event_id).single();
        if (evt?.organiser_id) {
          await supabase.rpc("create_notification", { _user_id: evt.organiser_id, _title: "Proposal Declined", _message: `A fight proposal for ${evt.title} was declined.`, _type: "match_declined" as any, _reference_id: item.id });
        }
      }
      setRecentActions((prev) => [...prev, { itemId: item.id, action: "declined", previousStatus: "proposed", at: Date.now() }]);
      toast.success("Proposal declined");
      invalidate();
    } catch { toast.error("Failed to decline"); }
  };

  const handleUndo = async (ra: RecentAction) => {
    if (ra.previousStatus === "pending") {
      // gym_request or trial_lead — revert to pending
      const item = [...activeItems, ...completedItems].find((i) => i.id === ra.itemId);
      if (item?.type === "gym_request") {
        await supabase.from("fighter_gym_links").update({ status: "pending" }).eq("id", ra.itemId);
      }
    }
    if (ra.previousStatus === "proposed") {
      await supabase.from("bout_acceptances").delete().eq("slot_id", ra.itemId).eq("user_id", userId);
      await supabase.from("event_fight_slots").update({ status: "proposed" }).eq("id", ra.itemId);
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
      case "match_suggestion": case "fight_proposal": case "bout_proposal": return Swords;
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
      case "fight_proposal": return { label: "Fight proposal", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
      case "bout_proposal": return { label: "Bout proposal", className: "bg-primary/15 text-primary border-primary/30" };
      case "event_interest": return { label: "Event interest", className: "bg-purple-500/15 text-purple-400 border-purple-500/30" };
      case "event_claim": return { label: "Event claim", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
      default: return { label: type, className: "" };
    }
  };

  const categoryOptions = (() => {
    if (isFighter) return ["All", "Fight Proposals", "Session Invites", "Gym Requests"];
    if (isCoachOrOwner) return ["All", "Gym Join Requests", "Roster Proposals"];
    if (isOrganiser) return ["All", "Bout Proposals"];
    return ["All"];
  })();

  const categoryTypeMap: Record<string, string[]> = {
    "Fight Proposals": ["bout_proposal", "fight_proposal", "match_suggestion"],
    "Session Invites": ["trial_lead"],
    "Gym Requests": ["gym_request"],
    "Gym Join Requests": ["gym_request", "trial_lead"],
    "Roster Proposals": ["bout_proposal", "fight_proposal"],
    "Bout Proposals": ["bout_proposal", "match_suggestion"],
  };

  const applyFilters = (items: ActionItem[]) => {
    return items.filter((item) => {
      if (categoryFilter !== "All") {
        const types = categoryTypeMap[categoryFilter] || [];
        if (!types.includes(item.type)) return false;
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        if (!item.title.toLowerCase().includes(q) && !item.subtitle.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  };

  const displayItems = statusFilter === "active" ? applyFilters(activeItems) : applyFilters(completedItems);
  const isCompletedView = statusFilter === "completed";

  const renderActionButtons = (item: ActionItem) => {
    if (isCompletedView) {
      // Check for undo within 24h
      const ra = recentlyActioned.find((a) => a.itemId === item.id);
      if (ra) {
        return (
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary" onClick={() => handleUndo(ra)}>
            <Undo2 className="h-3 w-3" /> Undo
          </Button>
        );
      }
      // View buttons for completed items
      if (item.meta?.eventId) {
        return (
          <Button size="sm" variant="outline" className="h-8 px-3 text-xs" asChild>
            <Link to={`/events/${item.meta.eventId}`}><Eye className="h-3 w-3 mr-1" /> View</Link>
          </Button>
        );
      }
      return null;
    }

    const isCoachGymRequest = item.type === "gym_request" && isCoachOrOwner && item.status === "pending";
    const isTrialLead = item.type === "trial_lead" && isCoachOrOwner;

    return (
      <>
        {isCoachGymRequest && (
          <>
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => handleAcceptGymRequest(item)}>
              <Check className="h-3 w-3 mr-1" /> Accept
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleDeclineGymRequest(item)}>
              <X className="h-3 w-3 mr-1" /> Decline
            </Button>
          </>
        )}
        {isTrialLead && (
          <>
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => { setTrialModal(item); setTrialMessage(""); }}>
              <Check className="h-3 w-3 mr-1" /> Accept
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => { setTrialModal(item); setTrialMessage(""); }}>
              <X className="h-3 w-3 mr-1" /> Decline
            </Button>
          </>
        )}
        {item.type === "bout_proposal" && (
          <>
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => handleAcceptBoutProposal(item)}>
              <Check className="h-3 w-3 mr-1" /> Accept
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleDeclineBoutProposal(item)}>
              <X className="h-3 w-3 mr-1" /> Decline
            </Button>
          </>
        )}
        {item.type === "event_interest" && item.meta?.eventId && (
          <Button size="sm" variant="outline" className="h-8 px-3 text-xs" asChild>
            <Link to={`/events/${item.meta.eventId}`}><Eye className="h-3 w-3 mr-1" /> View</Link>
          </Button>
        )}
        {item.type === "fight_proposal" && item.meta?.eventId && (
          <Button size="sm" variant="outline" className="h-8 px-3 text-xs" asChild>
            <Link to={`/events/${item.meta.eventId}`}><Eye className="h-3 w-3 mr-1" /> View</Link>
          </Button>
        )}
        {item.type === "match_suggestion" && item.meta?.eventId && (
          <Button size="sm" variant="outline" className="h-8 px-3 text-xs" asChild>
            <Link to={isFighter ? `/events/${item.meta.eventId}` : `/events/${item.meta.eventId}/matchmaking`}>
              <Eye className="h-3 w-3 mr-1" /> View
            </Link>
          </Button>
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-2xl text-foreground">
        ACTION <span className="text-primary">CENTRE</span>
      </h2>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button size="sm" variant={statusFilter === "active" ? "default" : "outline"} className="h-9 text-xs" onClick={() => setStatusFilter("active")}>
            Active ({activeItems.length})
          </Button>
          <Button size="sm" variant={statusFilter === "completed" ? "default" : "outline"} className="h-9 text-xs" onClick={() => setStatusFilter("completed")}>
            Completed ({completedItems.length})
          </Button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Search by name or event..." className="pl-9 h-9 text-xs" />
        </div>
      </div>

      {displayItems.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-border bg-card">
          <Check className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {isCompletedView ? "No completed actions yet." : "All caught up — no actions required."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item) => {
            const Icon = getIcon(item.type);
            const badge = getTypeBadge(item.type);
            const isCompleted = isCompletedView;
            return (
              <div
                key={item.id}
                className={`rounded-lg border bg-card p-4 flex items-start gap-4 transition-colors ${isCompleted ? "border-border/50 opacity-60" : "border-border hover:border-primary/20"}`}
              >
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className={badge.className + " text-[10px]"}>{badge.label}</Badge>
                    {isCompleted && (
                      <Badge variant="outline" className="text-[10px] bg-muted/50 text-muted-foreground">
                        {item.status === "approved" || item.status === "confirmed" ? "✓ Resolved" : "✗ Declined"}
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={`text-sm font-medium ${isCompleted ? "text-muted-foreground" : "text-foreground"}`}>{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {renderActionButtons(item)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trial Session Accept/Decline Modal */}
      <Dialog open={!!trialModal} onOpenChange={(open) => { if (!open) setTrialModal(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Respond to Trial Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-foreground font-medium">{trialModal?.title}</p>
              <p className="text-xs text-muted-foreground">{trialModal?.subtitle}</p>
              {trialModal?.meta?.email && <p className="text-xs text-muted-foreground mt-1">Contact: {trialModal.meta.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Message to fighter (optional)</label>
              <Textarea placeholder="e.g. Come to the gym on Saturday at 10am for a trial..." value={trialMessage} onChange={(e) => setTrialMessage(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleTrialDecline} disabled={trialSending}>
              <X className="h-4 w-4 mr-1" /> Decline
            </Button>
            <Button className="flex-1" onClick={handleTrialAccept} disabled={trialSending}>
              <Check className="h-4 w-4 mr-1" /> {trialSending ? "Sending..." : "Accept"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      if (isCoachOrOwner && gymIds.length > 0) {
        const { count: c } = await supabase.from("fighter_gym_links").select("id", { count: "exact", head: true }).in("gym_id", gymIds).eq("status", "pending");
        total += c ?? 0;
        const { count: t } = await supabase.from("gym_leads").select("id", { count: "exact", head: true }).in("gym_id", gymIds).eq("status", "pending");
        total += t ?? 0;
      }
      if (isFighter && fighterProfile) {
        const { count: s } = await supabase.from("match_suggestions").select("id", { count: "exact", head: true }).or(`fighter_a_id.eq.${fighterProfile.id},fighter_b_id.eq.${fighterProfile.id}`).eq("status", "suggested");
        total += s ?? 0;
      }
      if (isOrganiser) {
        const { data: myEvents } = await supabase.from("events").select("id").eq("organiser_id", userId);
        if (myEvents && myEvents.length > 0) {
          const eventIds = myEvents.map((e) => e.id);
          const { count: ec } = await supabase.from("event_claims").select("id", { count: "exact", head: true }).in("event_id", eventIds).eq("status", "pending");
          total += ec ?? 0;
        }
      }
      return total;
    },
    enabled: !!userId,
  });
  return count;
}
