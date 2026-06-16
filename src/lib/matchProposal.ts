import { supabase } from "@/integrations/supabase/client";

export type PartyRole = "fighter" | "coach";
export type Decision = "accepted" | "declined";

export interface PartyMember {
  userId: string;
  role: PartyRole;
  name: string;
}

export interface ProposalSide {
  fighterId: string;
  fighterName: string;
  fighterUserId: string | null;
  coachUserId: string | null;
  coachName: string | null;
  /** users whose decision is required for this side (fighter required; coach required if assigned) */
  requiredUserIds: string[];
}

export interface ProposalParties {
  proposal: any;
  event: any;
  organiserId: string;
  sideA: ProposalSide;
  sideB: ProposalSide;
  /** the event_fight_slots row (if found) — authoritative slot per spec */
  eventFightSlot: any | null;
  /** legacy fight_slots row */
  fightSlot: any | null;
}

export interface ConfirmationRow {
  id: string;
  match_proposal_id: string;
  user_id: string;
  role: string;
  decision: Decision;
  comment: string | null;
  decided_at: string;
}

export type SideStatus = "accepted" | "declined" | "awaiting";

export interface SideStatusBreakdown {
  fighterA: SideStatus;
  coachA: SideStatus | "none";
  fighterB: SideStatus;
  coachB: SideStatus | "none";
}

export interface Evaluation {
  status: "pending" | "confirmed" | "declined";
  breakdown: SideStatusBreakdown;
}

async function resolveSide(
  fighterId: string,
): Promise<{
  fighterId: string;
  fighterName: string;
  fighterUserId: string | null;
  coachUserId: string | null;
  coachName: string | null;
}> {
  const { data: fp } = await supabase
    .from("fighter_profiles")
    .select("id, name, user_id, created_by_coach_id")
    .eq("id", fighterId)
    .maybeSingle();

  let coachUserId: string | null = null;
  let coachName: string | null = null;

  // Prefer the coach attached to an approved gym link, fall back to creator coach.
  const { data: links } = await supabase
    .from("fighter_gym_links")
    .select("gym_id, status")
    .eq("fighter_id", fighterId)
    .eq("status", "approved");

  const gymIds = (links ?? []).map((l) => l.gym_id);
  if (gymIds.length > 0) {
    const { data: gyms } = await supabase
      .from("gyms")
      .select("coach_id, name")
      .in("id", gymIds);
    const withCoach = gyms?.find((g) => g.coach_id);
    if (withCoach) {
      coachUserId = withCoach.coach_id;
    }
  }

  if (!coachUserId && fp?.created_by_coach_id) {
    coachUserId = fp.created_by_coach_id;
  }

  if (coachUserId) {
    const { data: coachProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", coachUserId)
      .maybeSingle();
    coachName = coachProfile?.full_name ?? "Coach";
  }

  return {
    fighterId,
    fighterName: fp?.name ?? "Fighter",
    fighterUserId: fp?.user_id ?? null,
    coachUserId,
    coachName,
  };
}

export async function getProposalParties(proposalId: string): Promise<ProposalParties | null> {
  const { data: proposal } = await supabase
    .from("match_proposals")
    .select("*")
    .eq("id", proposalId)
    .maybeSingle();
  if (!proposal) return null;

  const { data: fightSlot } = await supabase
    .from("fight_slots")
    .select("*, events(*)")
    .eq("id", proposal.fight_slot_id)
    .maybeSingle();

  const event = fightSlot?.events ?? null;
  const organiserId = event?.organiser_id ?? proposal.proposed_by;

  // Resolve the authoritative event_fight_slots row for this pairing.
  let eventFightSlot: any = null;
  if (event?.id) {
    const { data: efs } = await supabase
      .from("event_fight_slots")
      .select("*")
      .eq("event_id", event.id)
      .or(
        `and(fighter_a_id.eq.${proposal.fighter_a_id},fighter_b_id.eq.${proposal.fighter_b_id}),and(fighter_a_id.eq.${proposal.fighter_b_id},fighter_b_id.eq.${proposal.fighter_a_id})`,
      )
      .maybeSingle();
    eventFightSlot = efs ?? null;
  }

  const [a, b] = await Promise.all([
    resolveSide(proposal.fighter_a_id),
    resolveSide(proposal.fighter_b_id),
  ]);

  const buildSide = (s: Awaited<ReturnType<typeof resolveSide>>): ProposalSide => {
    const required: string[] = [];
    if (s.fighterUserId) required.push(s.fighterUserId);
    if (s.coachUserId) required.push(s.coachUserId);
    return { ...s, requiredUserIds: required };
  };

  return {
    proposal,
    event,
    organiserId,
    sideA: buildSide(a),
    sideB: buildSide(b),
    eventFightSlot,
    fightSlot,
  };
}

export function getRequiredUserIds(parties: ProposalParties): string[] {
  return Array.from(new Set([...parties.sideA.requiredUserIds, ...parties.sideB.requiredUserIds]));
}

export function getAllPartyUserIds(parties: ProposalParties): string[] {
  return Array.from(
    new Set([
      ...parties.sideA.requiredUserIds,
      ...parties.sideB.requiredUserIds,
      parties.organiserId,
    ].filter(Boolean)),
  );
}

function sideStatusFor(side: ProposalSide, confirmations: ConfirmationRow[]): SideStatus {
  if (side.requiredUserIds.length === 0) return "accepted"; // no required parties = auto-satisfied
  const sideConfs = confirmations.filter((c) => side.requiredUserIds.includes(c.user_id));
  if (sideConfs.some((c) => c.decision === "declined")) return "declined";
  const acceptedUsers = new Set(sideConfs.filter((c) => c.decision === "accepted").map((c) => c.user_id));
  const allAccepted = side.requiredUserIds.every((u) => acceptedUsers.has(u));
  return allAccepted ? "accepted" : "awaiting";
}

export function evaluateProposal(parties: ProposalParties, confirmations: ConfirmationRow[]): Evaluation {
  const a = sideStatusFor(parties.sideA, confirmations);
  const b = sideStatusFor(parties.sideB, confirmations);

  // Per-party breakdown for the UI
  const userDecision = (uid: string | null): SideStatus => {
    if (!uid) return "awaiting";
    const c = confirmations.find((x) => x.user_id === uid);
    if (!c) return "awaiting";
    return c.decision === "accepted" ? "accepted" : "declined";
  };

  const breakdown: SideStatusBreakdown = {
    fighterA: userDecision(parties.sideA.fighterUserId),
    coachA: parties.sideA.coachUserId ? userDecision(parties.sideA.coachUserId) : "none",
    fighterB: userDecision(parties.sideB.fighterUserId),
    coachB: parties.sideB.coachUserId ? userDecision(parties.sideB.coachUserId) : "none",
  };

  let status: Evaluation["status"] = "pending";
  if (a === "declined" || b === "declined") status = "declined";
  else if (a === "accepted" && b === "accepted") status = "confirmed";

  return { status, breakdown };
}

export async function fetchConfirmations(proposalId: string): Promise<ConfirmationRow[]> {
  const { data } = await supabase
    .from("confirmations")
    .select("*")
    .eq("match_proposal_id", proposalId);
  return (data ?? []) as ConfirmationRow[];
}

/** Insert-or-update a user's decision. Allows changing accept↔decline while proposal is not yet final. */
export async function recordDecision(args: {
  proposalId: string;
  userId: string;
  role: "fighter" | "coach" | "organiser";
  decision: Decision;
  comment?: string;
}): Promise<ConfirmationRow[]> {
  const { proposalId, userId, role, decision, comment } = args;

  const { data: existing } = await supabase
    .from("confirmations")
    .select("id")
    .eq("match_proposal_id", proposalId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("confirmations")
      .update({ decision, comment: comment || null, decided_at: new Date().toISOString(), role: role as any })
      .eq("id", existing.id);
  } else {
    await supabase.from("confirmations").insert({
      match_proposal_id: proposalId,
      user_id: userId,
      role: role as any,
      decision,
      comment: comment || null,
    });
  }

  return fetchConfirmations(proposalId);
}

async function notify(userIds: string[], title: string, message: string, type: string, refId: string) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  await Promise.all(
    unique.map((uid) =>
      supabase.rpc("create_notification", {
        _user_id: uid,
        _title: title,
        _message: message,
        _type: type as any,
        _reference_id: refId,
      }),
    ),
  );
}

function actorLabel(parties: ProposalParties, userId: string): string {
  if (parties.sideA.fighterUserId === userId) return parties.sideA.fighterName;
  if (parties.sideB.fighterUserId === userId) return parties.sideB.fighterName;
  if (parties.sideA.coachUserId === userId) return parties.sideA.coachName ?? "Coach";
  if (parties.sideB.coachUserId === userId) return parties.sideB.coachName ?? "Coach";
  if (parties.organiserId === userId) return "Organiser";
  return "A party";
}

/** Apply the outcome of an evaluation: status writes + cross-party notifications. */
export async function applyOutcome(
  parties: ProposalParties,
  confirmations: ConfirmationRow[],
  actorUserId: string,
  actorDecision: Decision,
) {
  const ev = evaluateProposal(parties, confirmations);
  const matchup = `${parties.sideA.fighterName} vs ${parties.sideB.fighterName}`;
  const eventTitle = parties.event?.title ?? "the event";
  const refId = parties.proposal.id;
  const otherParties = getAllPartyUserIds(parties).filter((u) => u !== actorUserId);

  if (ev.status === "confirmed") {
    // 1. Update match_proposals
    await supabase.from("match_proposals").update({ status: "confirmed" }).eq("id", parties.proposal.id);
    // 2. Update event_fight_slots (authoritative)
    if (parties.eventFightSlot?.id) {
      await supabase
        .from("event_fight_slots")
        .update({ status: "confirmed" })
        .eq("id", parties.eventFightSlot.id);
      // 3. Write bout_acceptances rows for every accepting user
      const acceptingUsers = confirmations.filter((c) => c.decision === "accepted");
      for (const c of acceptingUsers) {
        await supabase
          .from("bout_acceptances")
          .upsert(
            {
              slot_id: parties.eventFightSlot.id,
              user_id: c.user_id,
              role: c.role,
            },
            { onConflict: "slot_id,user_id" },
          );
      }
    }
    // 4. Legacy fight_slots
    if (parties.fightSlot?.id) {
      await supabase.from("fight_slots").update({ status: "confirmed" }).eq("id", parties.fightSlot.id);
    }
    // 5. Notify everyone
    const allParties = getAllPartyUserIds(parties);
    await notify(
      allParties,
      "Bout confirmed",
      `${matchup} is locked in for ${eventTitle}.`,
      "match_confirmed",
      refId,
    );
    return ev;
  }

  if (ev.status === "declined") {
    await supabase.from("match_proposals").update({ status: "declined" }).eq("id", parties.proposal.id);
    if (parties.eventFightSlot?.id) {
      await supabase
        .from("event_fight_slots")
        .update({ status: "open", fighter_a_id: null, fighter_b_id: null })
        .eq("id", parties.eventFightSlot.id);
    }
    if (parties.fightSlot?.id) {
      await supabase.from("fight_slots").update({ status: "open" }).eq("id", parties.fightSlot.id);
    }
    const who = actorLabel(parties, actorUserId);
    await notify(
      otherParties,
      "Bout declined",
      `${who} declined ${matchup} for ${eventTitle}.`,
      "match_declined",
      refId,
    );
    return ev;
  }

  // Still pending — notify other parties of the actor's decision
  const who = actorLabel(parties, actorUserId);
  const verb = actorDecision === "accepted" ? "accepted" : "declined";
  const type = actorDecision === "accepted" ? "match_accepted" : "match_declined";
  await notify(
    otherParties,
    `${who} ${verb} the bout`,
    `${matchup} — waiting on remaining parties.`,
    type,
    refId,
  );
  return ev;
}

/** Notify all parties when an organiser deletes a fight slot. */
export async function notifyCancellationForSlot(eventFightSlotId: string) {
  const { data: slot } = await supabase
    .from("event_fight_slots")
    .select("*, events(title)")
    .eq("id", eventFightSlotId)
    .maybeSingle();
  if (!slot) return;

  const notifyIds = new Set<string>();
  const matchupParts: string[] = [];

  // Gather from any match_proposals for this pairing
  if (slot.event_id && slot.fighter_a_id && slot.fighter_b_id) {
    const { data: props } = await supabase
      .from("match_proposals")
      .select("id, proposed_by, fighter_a_id, fighter_b_id")
      .or(
        `and(fighter_a_id.eq.${slot.fighter_a_id},fighter_b_id.eq.${slot.fighter_b_id}),and(fighter_a_id.eq.${slot.fighter_b_id},fighter_b_id.eq.${slot.fighter_a_id})`,
      );
    for (const p of props ?? []) {
      if (p.proposed_by) notifyIds.add(p.proposed_by);
      const { data: confs } = await supabase
        .from("confirmations")
        .select("user_id")
        .eq("match_proposal_id", p.id);
      confs?.forEach((c) => notifyIds.add(c.user_id));
    }
  }

  // Gather from current fighters + their coaches
  for (const fid of [slot.fighter_a_id, slot.fighter_b_id].filter(Boolean) as string[]) {
    const { data: fp } = await supabase
      .from("fighter_profiles")
      .select("name, user_id, created_by_coach_id")
      .eq("id", fid)
      .maybeSingle();
    if (fp?.name) matchupParts.push(fp.name);
    if (fp?.user_id) notifyIds.add(fp.user_id);
    if (fp?.created_by_coach_id) notifyIds.add(fp.created_by_coach_id);
    const { data: links } = await supabase
      .from("fighter_gym_links")
      .select("gym_id")
      .eq("fighter_id", fid)
      .eq("status", "approved");
    const gymIds = (links ?? []).map((l) => l.gym_id);
    if (gymIds.length > 0) {
      const { data: gyms } = await supabase.from("gyms").select("coach_id").in("id", gymIds);
      gyms?.forEach((g) => g.coach_id && notifyIds.add(g.coach_id));
    }
  }

  // Gather from bout_acceptances on this slot
  const { data: accs } = await supabase
    .from("bout_acceptances")
    .select("user_id")
    .eq("slot_id", eventFightSlotId);
  accs?.forEach((a) => notifyIds.add(a.user_id));

  const matchup = matchupParts.length === 2 ? matchupParts.join(" vs ") : "Your bout";
  const eventTitle = (slot as any).events?.title ?? "the event";

  await notify(
    Array.from(notifyIds),
    "Bout cancelled by organiser",
    `${matchup} for ${eventTitle} has been removed from the card.`,
    "match_withdrawn",
    eventFightSlotId,
  );
}
