import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditFightSlotDialog } from "@/components/organiser/EditFightSlotDialog";
import { AddFightSlotDialog } from "@/components/organiser/AddFightSlotDialog";
import { EditEventDialog } from "@/components/organiser/EditEventDialog";
import { ArrowLeft, Globe, Users, Sparkles, Pencil, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FighterSearchPanel } from "@/components/organiser/FighterSearchPanel";
import { ProposeMatchDialog } from "@/components/organiser/ProposeMatchDialog";
import { MatchSuggestionsPanel } from "@/components/organiser/MatchSuggestionsPanel";
import { ManageTicketsPanel } from "@/components/organiser/ManageTicketsPanel";
import type { Database } from "@/integrations/supabase/types";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];
type FightSlot = Database["public"]["Tables"]["fight_slots"]["Row"];

import { formatEnum } from "@/lib/format";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-success/20 text-success border-success/30",
  proposed: "bg-primary/20 text-primary border-primary/30",
  confirmed: "bg-secondary/20 text-secondary border-secondary/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function EventManager() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeSlot, setActiveSlot] = useState<FightSlot | null>(null);
  const [suggestSlot, setSuggestSlot] = useState<FightSlot | null>(null);
  const [selectedFighterA, setSelectedFighterA] = useState<FighterProfile | null>(null);
  const [selectedFighterB, setSelectedFighterB] = useState<FighterProfile | null>(null);
  const [showProposeDialog, setShowProposeDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<FightSlot | null>(null);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["organiser-event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: slots = [] } = useQuery({
    queryKey: ["event-slots", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fight_slots")
        .select("*")
        .eq("event_id", id!)
        .order("slot_number");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["event-proposals", id],
    queryFn: async () => {
      const slotIds = slots.map((s) => s.id);
      if (slotIds.length === 0) return [];
      const { data, error } = await supabase
        .from("match_proposals")
        .select("*, fighter_a:fighter_profiles!match_proposals_fighter_a_id_fkey(*), fighter_b:fighter_profiles!match_proposals_fighter_b_id_fkey(*)")
        .in("fight_slot_id", slotIds);
      if (error) throw error;
      return data;
    },
    enabled: slots.length > 0,
  });

  // Fetch confirmations for active proposals
  const activeProposalIds = proposals
    .filter((p) => p.status === "pending" || p.status === "confirmed")
    .map((p) => p.id);

  const { data: confirmations = [] } = useQuery({
    queryKey: ["event-confirmations", activeProposalIds],
    queryFn: async () => {
      if (activeProposalIds.length === 0) return [];
      const { data } = await supabase
        .from("confirmations")
        .select("*")
        .in("match_proposal_id", activeProposalIds);
      return data ?? [];
    },
    enabled: activeProposalIds.length > 0,
  });

  // Collect all user IDs we need to resolve names for (confirmation users + coaches + fighters)
  const allRelevantUserIds = (() => {
    const ids = new Set<string>();
    confirmations.forEach((c) => ids.add(c.user_id));
    proposals.forEach((p: any) => {
      if (p.fighter_a?.user_id) ids.add(p.fighter_a.user_id);
      if (p.fighter_b?.user_id) ids.add(p.fighter_b.user_id);
      if (p.fighter_a?.created_by_coach_id) ids.add(p.fighter_a.created_by_coach_id);
      if (p.fighter_b?.created_by_coach_id) ids.add(p.fighter_b.created_by_coach_id);
    });
    return Array.from(ids);
  })();

  // Fetch gym coach IDs for fighters in proposals
  const proposalFighterIds = proposals.flatMap((p) => [p.fighter_a_id, p.fighter_b_id]);

  const { data: fighterGymLinks = [] } = useQuery({
    queryKey: ["event-fighter-gym-links", proposalFighterIds],
    queryFn: async () => {
      if (proposalFighterIds.length === 0) return [];
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("fighter_id, gym_id")
        .in("fighter_id", proposalFighterIds)
        .eq("status", "accepted");
      return data ?? [];
    },
    enabled: proposalFighterIds.length > 0,
  });

  const gymIdsForProposals = fighterGymLinks.map((gl) => gl.gym_id);

  const { data: gymsForProposals = [] } = useQuery({
    queryKey: ["event-gyms-for-proposals", gymIdsForProposals],
    queryFn: async () => {
      if (gymIdsForProposals.length === 0) return [];
      const { data } = await supabase
        .from("gyms")
        .select("id, coach_id")
        .in("id", gymIdsForProposals);
      return data ?? [];
    },
    enabled: gymIdsForProposals.length > 0,
  });

  // Build a combined set of all user IDs (including gym coaches)
  const allUserIds = (() => {
    const ids = new Set(allRelevantUserIds);
    gymsForProposals.forEach((g) => { if (g.coach_id) ids.add(g.coach_id); });
    return Array.from(ids);
  })();

  const { data: userProfiles = [] } = useQuery({
    queryKey: ["event-user-profiles", allUserIds],
    queryFn: async () => {
      if (allUserIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", allUserIds);
      return data ?? [];
    },
    enabled: allUserIds.length > 0,
  });

  const profileMap = new Map(userProfiles.map((p) => [p.id, p.full_name || "Unknown"]));

  // Compute required parties for a proposal (excluding organiser)
  const getRequiredParties = (proposal: any) => {
    const parties = new Map<string, { label: string }>(); // userId -> label
    const fighterA = proposal.fighter_a;
    const fighterB = proposal.fighter_b;

    // Coaches via created_by_coach_id
    if (fighterA?.created_by_coach_id) {
      parties.set(fighterA.created_by_coach_id, { label: `Coach (${fighterA.name})` });
    }
    if (fighterB?.created_by_coach_id) {
      parties.set(fighterB.created_by_coach_id, { label: `Coach (${fighterB.name})` });
    }

    // Coaches via gym links
    const aGymLinks = fighterGymLinks.filter((gl) => gl.fighter_id === proposal.fighter_a_id);
    const bGymLinks = fighterGymLinks.filter((gl) => gl.fighter_id === proposal.fighter_b_id);
    aGymLinks.forEach((gl) => {
      const gym = gymsForProposals.find((g) => g.id === gl.gym_id);
      if (gym?.coach_id && !parties.has(gym.coach_id)) {
        parties.set(gym.coach_id, { label: `Coach (${fighterA?.name})` });
      }
    });
    bGymLinks.forEach((gl) => {
      const gym = gymsForProposals.find((g) => g.id === gl.gym_id);
      if (gym?.coach_id && !parties.has(gym.coach_id)) {
        parties.set(gym.coach_id, { label: `Coach (${fighterB?.name})` });
      }
    });

    // Registered fighters only
    if (fighterA?.user_id) {
      parties.set(fighterA.user_id, { label: fighterA.name });
    }
    if (fighterB?.user_id) {
      parties.set(fighterB.user_id, { label: fighterB.name });
    }

    // Remove organiser
    parties.delete(proposal.proposed_by);
    return parties;
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("events")
        .update({ status: "published" })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organiser-event", id] });
      toast({ title: "Event published", description: "Your event is now visible to everyone." });
    },
  });

  const handleSelectFighter = (fighter: FighterProfile) => {
    if (!selectedFighterA) {
      setSelectedFighterA(fighter);
    } else if (!selectedFighterB && fighter.id !== selectedFighterA.id) {
      setSelectedFighterB(fighter);
      setShowProposeDialog(true);
    }
  };

  const handleSuggestionSelect = (fighterA: FighterProfile, fighterB: FighterProfile) => {
    setSelectedFighterA(fighterA);
    setSelectedFighterB(fighterB);
    setActiveSlot(suggestSlot);
    setShowProposeDialog(true);
  };

  const handleCancelSearch = () => {
    setActiveSlot(null);
    setSuggestSlot(null);
    setSelectedFighterA(null);
    setSelectedFighterB(null);
  };

  const handleProposalCreated = () => {
    setShowProposeDialog(false);
    setActiveSlot(null);
    setSuggestSlot(null);
    setSelectedFighterA(null);
    setSelectedFighterB(null);
    queryClient.invalidateQueries({ queryKey: ["event-slots", id] });
    queryClient.invalidateQueries({ queryKey: ["event-proposals", id] });
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="container py-16">
            <div className="animate-pulse text-muted-foreground">Loading event...</div>
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="container py-16 text-center">
            <p className="text-muted-foreground">Event not found.</p>
            <Button variant="outline" asChild className="mt-4">
              <Link to="/organiser/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const getActiveProposal = (slotId: string) =>
    proposals.find((p) => p.fight_slot_id === slotId && p.status !== "declined" && p.status !== "withdrawn");

  const getDeclinedProposals = (slotId: string) =>
    proposals.filter((p) => p.fight_slot_id === slotId && p.status === "declined");

  const getProposalConfirmations = (proposalId: string) =>
    confirmations.filter((c) => c.match_proposal_id === proposalId);

  const activeProposalFighterIds = proposals
    .filter((p) => p.status !== "declined" && p.status !== "withdrawn")
    .flatMap((p) => [p.fighter_a_id, p.fighter_b_id]);

  // Group slots by card position
  const mainCardSlots = slots.filter((s) => (s as any).card_position === "main_card");
  const undercardSlots = slots.filter((s) => (s as any).card_position !== "main_card");

  const renderSlotCard = (slot: FightSlot) => {
    const activeProposal = getActiveProposal(slot.id);
    const declinedCount = getDeclinedProposals(slot.id).length;
    const slotExtra = slot as any;

    return (
      <div key={slot.id} className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-heading text-lg text-muted-foreground">
              #{slot.slot_number}
            </span>
            <span className="text-sm font-medium text-foreground">
              {formatEnum(slot.weight_class)}
            </span>
            {slotExtra.experience_level && (
              <Badge variant="outline" className="text-xs">
                {formatEnum(slotExtra.experience_level)}
              </Badge>
            )}
            {(slotExtra.min_weight_kg || slotExtra.max_weight_kg) && (
              <Badge variant="outline" className="text-xs">
                {slotExtra.min_weight_kg || "?"}–{slotExtra.max_weight_kg || "?"}kg
              </Badge>
            )}
            {(slotExtra.min_wins !== null || slotExtra.max_wins !== null) && (
              <Badge variant="outline" className="text-xs">
                {slotExtra.min_wins ?? 0}–{slotExtra.max_wins ?? "∞"} wins
              </Badge>
            )}
            <Badge
              variant="outline"
              className={STATUS_COLORS[slot.status] || ""}
            >
              {slot.status}
            </Badge>
            {declinedCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({declinedCount} declined)
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {slot.status === "open" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    setSuggestSlot(slot);
                    setActiveSlot(null);
                    setSelectedFighterA(null);
                    setSelectedFighterB(null);
                  }}
                >
                  <Sparkles className="h-3 w-3" /> Suggestions
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    setActiveSlot(slot);
                    setSuggestSlot(null);
                    setSelectedFighterA(null);
                    setSelectedFighterB(null);
                  }}
                >
                  <Users className="h-3 w-3" /> Manual Search
                </Button>
              </>
            )}
            {(slot.status === "open" || slot.status === "proposed") && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => setEditingSlot(slot)}
              >
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            )}
          </div>
        </div>

        {activeProposal && (() => {
          const proposalConfs = getProposalConfirmations(activeProposal.id);
          const requiredParties = getRequiredParties(activeProposal);
          const confirmedUserIds = new Set(proposalConfs.filter((c) => c.decision === "accepted").map((c) => c.user_id));
          const declinedUserIds = new Set(proposalConfs.filter((c) => c.decision === "declined").map((c) => c.user_id));
          const pendingParties = Array.from(requiredParties.entries()).filter(([uid]) => !confirmedUserIds.has(uid) && !declinedUserIds.has(uid));
          const respondedParties = proposalConfs.map((c) => ({
            userId: c.user_id,
            decision: c.decision,
            label: requiredParties.get(c.user_id)?.label || profileMap.get(c.user_id) || "Unknown",
          }));
          const totalRequired = requiredParties.size;
          const totalAccepted = confirmedUserIds.size;

          return (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="text-foreground font-medium">
                  {(activeProposal as any).fighter_a?.name || "Fighter A"}
                </span>
                <span className="text-primary font-heading">VS</span>
                <span className="text-foreground font-medium">
                  {(activeProposal as any).fighter_b?.name || "Fighter B"}
                </span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {activeProposal.status === "pending"
                    ? `${totalAccepted}/${totalRequired} confirmed`
                    : activeProposal.status === "confirmed"
                    ? "Confirmed"
                    : formatEnum(activeProposal.status)}
                </Badge>
              </div>

              {activeProposal.status === "pending" && (
                <div className="mt-3 space-y-1.5">
                  {respondedParties.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Responded</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {respondedParties.map((rp) => (
                          <Badge
                            key={rp.userId}
                            variant="outline"
                            className={
                              rp.decision === "accepted"
                                ? "text-xs bg-success/10 text-success border-success/30"
                                : "text-xs bg-destructive/10 text-destructive border-destructive/30"
                            }
                          >
                            {rp.label} · {rp.decision}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {pendingParties.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Awaiting</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {pendingParties.map(([uid, info]) => (
                          <Badge
                            key={uid}
                            variant="outline"
                            className="text-xs bg-muted text-muted-foreground"
                          >
                            {info.label} · pending
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container">
            <Link
              to="/organiser/dashboard"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>

            <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-heading text-4xl text-foreground">
                    {event.title}
                  </h1>
                  <Badge
                    variant="outline"
                    className={STATUS_COLORS[event.status] || ""}
                  >
                    {event.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {event.date} · {event.location} · {event.country}
                </p>
                {event.promotion_name && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.promotion_name}
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setShowAddSlot(true)}
                >
                  <Plus className="h-3 w-3" /> Add Fight
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setShowEditEvent(true)}
                >
                  <Pencil className="h-3 w-3" /> Edit Event
                </Button>
                {event.status === "draft" && (
                  <Button
                    onClick={() => publishMutation.mutate()}
                    disabled={publishMutation.isPending}
                    className="gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    {publishMutation.isPending ? "Publishing..." : "Publish Event"}
                  </Button>
                )}
              </div>
            </div>

            {event.description && (
              <p className="text-muted-foreground mb-8 max-w-2xl">
                {event.description}
              </p>
            )}

            {/* Main Card */}
            <h2 className="font-heading text-2xl text-foreground mb-4">
              MAIN <span className="text-primary">CARD</span>
            </h2>
            <div className="space-y-3 mb-10">
              {mainCardSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-md text-center">
                  No main card fights.
                </p>
              ) : (
                mainCardSlots.map(renderSlotCard)
              )}
            </div>

            {/* Undercard */}
            <h2 className="font-heading text-2xl text-foreground mb-4">
              UNDER<span className="text-primary">CARD</span>
            </h2>
            <div className="space-y-3 mb-8">
              {undercardSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-md text-center">
                  No undercard fights.
                </p>
              ) : (
                undercardSlots.map(renderSlotCard)
              )}
            </div>

            {/* Tickets Panel */}
            <div className="mb-10">
              <ManageTicketsPanel eventId={id!} />
            </div>

            {/* AI Suggestions Panel */}
            {suggestSlot && (
              <div className="mb-8">
                <MatchSuggestionsPanel
                  slot={suggestSlot}
                  existingProposalFighterIds={activeProposalFighterIds}
                  onSelectPair={handleSuggestionSelect}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSuggestSlot(null)}
                  className="mt-2"
                >
                  Close Suggestions
                </Button>
              </div>
            )}

            {/* Fighter Search Panel */}
            {activeSlot && !showProposeDialog && (
              <FighterSearchPanel
                slot={activeSlot}
                eventId={id!}
                selectedFighterA={selectedFighterA}
                selectedFighterB={selectedFighterB}
                onSelectFighter={handleSelectFighter}
                onCancel={handleCancelSearch}
              />
            )}

            {/* Propose Match Dialog */}
            {showProposeDialog && (activeSlot || suggestSlot) && selectedFighterA && selectedFighterB && user && (
              <ProposeMatchDialog
                open={showProposeDialog}
                onOpenChange={setShowProposeDialog}
                slot={(activeSlot || suggestSlot)!}
                fighterA={selectedFighterA}
                fighterB={selectedFighterB}
                proposedBy={user.id}
                onSuccess={handleProposalCreated}
              />
            )}

            {/* Edit Fight Slot Dialog */}
            {editingSlot && (
              <EditFightSlotDialog
                open={!!editingSlot}
                onOpenChange={(open) => { if (!open) setEditingSlot(null); }}
                slot={editingSlot}
                onSuccess={() => {
                  setEditingSlot(null);
                  queryClient.invalidateQueries({ queryKey: ["event-slots", id] });
                }}
              />
            )}

            {/* Edit Event Dialog */}
            {showEditEvent && event && (
              <EditEventDialog
                open={showEditEvent}
                onOpenChange={setShowEditEvent}
                event={event}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["organiser-event", id] });
                }}
                onDelete={() => {
                  navigate("/organiser/dashboard");
                }}
              />
            )}

            {/* Add Fight Slot Dialog */}
            <AddFightSlotDialog
              open={showAddSlot}
              onOpenChange={setShowAddSlot}
              eventId={id!}
              nextSlotNumber={slots.length + 1}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["event-slots", id] });
              }}
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
