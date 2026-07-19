import { describe, it, expect } from "vitest";
import { replayElo, START_ELO, type FightRow } from "@/lib/eloEngine";

function mkFight(partial: Partial<FightRow> & Pick<FightRow, "id" | "fighter_a_id">): FightRow {
  return {
    fighter_b_id: null,
    winner_id: null,
    result: "win",
    method: null,
    is_amateur: false,
    verification_status: "self_reported",
    event_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
    ...partial,
  };
}

describe("eloEngine — worked example", () => {
  it("Muay Thai fighter 4W-2D (2am KO wins, 1am DQ win, 2am draws, 1 pro dec win) → 1047.68", () => {
    const A = "A";
    const fights: FightRow[] = [
      mkFight({ id: "1", fighter_a_id: A, method: "KO", is_amateur: true, result: "win", event_date: "2024-01-01" }),
      mkFight({ id: "2", fighter_a_id: A, method: "KO", is_amateur: true, result: "win", event_date: "2024-02-01" }),
      mkFight({ id: "3", fighter_a_id: A, method: "DQ", is_amateur: true, result: "win", event_date: "2024-03-01" }),
      mkFight({ id: "4", fighter_a_id: A, method: "Decision", is_amateur: true, result: "draw", event_date: "2024-04-01" }),
      mkFight({ id: "5", fighter_a_id: A, method: "Decision", is_amateur: true, result: "draw", event_date: "2024-05-01" }),
      mkFight({ id: "6", fighter_a_id: A, method: "Decision", is_amateur: false, result: "win", event_date: "2024-06-01" }),
    ];
    const { ratings } = replayElo(fights);
    expect(ratings.get(A)).toBeCloseTo(1047.68, 2);
  });
});

describe("eloEngine — global chronological pass", () => {
  it("rematch: second bout uses post-first-bout Elos, not starting 1000s", () => {
    const A = "A";
    const B = "B";
    const fights: FightRow[] = [
      mkFight({ id: "1", fighter_a_id: A, fighter_b_id: B, result: "win", method: "KO", verification_status: "event_verified", event_date: "2024-01-01" }),
      mkFight({ id: "2", fighter_a_id: B, fighter_b_id: A, result: "win", method: "KO", verification_status: "event_verified", event_date: "2024-06-01" }),
    ];
    const { log, ratings } = replayElo(fights);
    // Second fight's "before" for B should equal the "after" of the first fight for B.
    const firstBAfter = log.find((l) => l.fightId === "1" && l.fighterId === B)!.after;
    const secondBBefore = log.find((l) => l.fightId === "2" && l.fighterId === B)!.before;
    expect(secondBBefore).toBe(firstBAfter);
    // Both fighters have moved from START_ELO.
    expect(ratings.get(A)).not.toBe(START_ELO);
    expect(ratings.get(B)).not.toBe(START_ELO);
  });

  it("shared-opponent chain: C's Elo at each lookup reflects only prior fights", () => {
    const A = "A", B = "B", C = "C";
    const fights: FightRow[] = [
      mkFight({ id: "1", fighter_a_id: A, fighter_b_id: C, result: "win", verification_status: "event_verified", event_date: "2024-01-01" }),
      mkFight({ id: "2", fighter_a_id: B, fighter_b_id: C, result: "win", verification_status: "event_verified", event_date: "2024-02-01" }),
      mkFight({ id: "3", fighter_a_id: A, fighter_b_id: B, result: "win", verification_status: "event_verified", event_date: "2024-03-01" }),
    ];
    const { log } = replayElo(fights);
    const cInFight1 = log.find((l) => l.fightId === "1" && l.fighterId === C)!;
    const cInFight2 = log.find((l) => l.fightId === "2" && l.fighterId === C)!;
    // C's pre-fight Elo in fight 2 must equal C's post-fight Elo from fight 1.
    expect(cInFight2.before).toBe(cInFight1.after);
    // Fight 3 doesn't involve C, so nothing further logged for C.
    expect(log.filter((l) => l.fighterId === C).length).toBe(2);
  });
});
