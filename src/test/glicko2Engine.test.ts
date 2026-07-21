import { describe, it, expect } from "vitest";
import {
  glickoStep,
  updateBout,
  seedFromRecord,
  effectiveRd,
  displayedMuScore,
  DEFAULT_RATING,
  DEFAULT_RD,
  DEFAULT_VOL,
  MAX_RD,
} from "@/lib/glicko2Engine";

describe("glickoStep — Glickman published anchor", () => {
  // From Glickman, "Example calculation" (Glicko-2, 2013).
  // Player: (1500, 200, 0.06) vs three opponents in a single rating period:
  //   (1400, 30, W) (1550, 100, L) (1700, 300, L)
  // Expected: rating ≈ 1464.06, RD ≈ 151.52, vol ≈ 0.05999.
  it("reproduces 1464.06 / 151.52 / 0.05999 in a multi-opponent single period", () => {
    const result = glickoStep(
      { rating: 1500, rd: 200, volatility: 0.06 },
      [
        { rating: 1400, rd: 30, score: 1 },
        { rating: 1550, rd: 100, score: 0 },
        { rating: 1700, rd: 300, score: 0 },
      ],
      0.5
    );
    expect(result.rating).toBeCloseTo(1464.06, 1);
    expect(result.rd).toBeCloseTo(151.52, 1);
    expect(result.volatility).toBeCloseTo(0.05999, 4);
  });

  it("no games in period → RD grows via volatility only, rating unchanged", () => {
    const r = glickoStep({ rating: 1500, rd: 200, volatility: 0.06 }, []);
    expect(r.rating).toBe(1500);
    expect(r.rd).toBeGreaterThan(200);
    expect(r.volatility).toBe(0.06);
  });
});

describe("seedFromRecord", () => {
  it("true debut → 1500 / 350 / 0.06", () => {
    const s = seedFromRecord({
      pro: { wins: 0, losses: 0, draws: 0 },
      amateur: { wins: 0, losses: 0, draws: 0 },
      hasApprovedGymLink: false,
      isTrueDebut: true,
    });
    expect(s.rating).toBe(DEFAULT_RATING);
    expect(s.rd).toBe(DEFAULT_RD);
    expect(s.volatility).toBe(DEFAULT_VOL);
  });

  it("5W-5D-0L seeds strictly higher than 5W-0D-5L (draws ≠ losses)", () => {
    const withDraws = seedFromRecord({
      pro: { wins: 5, losses: 0, draws: 5 },
      amateur: { wins: 0, losses: 0, draws: 0 },
      hasApprovedGymLink: false,
      isTrueDebut: false,
    });
    const withLosses = seedFromRecord({
      pro: { wins: 5, losses: 5, draws: 0 },
      amateur: { wins: 0, losses: 0, draws: 0 },
      hasApprovedGymLink: false,
      isTrueDebut: false,
    });
    expect(withDraws.rating).toBeGreaterThan(withLosses.rating);
  });

  it("amateur record seeds closer to 1500 than the same record logged pro", () => {
    const proSeed = seedFromRecord({
      pro: { wins: 10, losses: 0, draws: 0 },
      amateur: { wins: 0, losses: 0, draws: 0 },
      hasApprovedGymLink: false,
      isTrueDebut: false,
    });
    const amSeed = seedFromRecord({
      pro: { wins: 0, losses: 0, draws: 0 },
      amateur: { wins: 10, losses: 0, draws: 0 },
      hasApprovedGymLink: false,
      isTrueDebut: false,
    });
    expect(proSeed.rating).toBeGreaterThan(amSeed.rating);
    expect(Math.abs(amSeed.rating - 1500)).toBeLessThan(Math.abs(proSeed.rating - 1500));
  });

  it("approved gym link + ≥3 fights → tighter RD tier", () => {
    const noLink = seedFromRecord({
      pro: { wins: 2, losses: 1, draws: 0 },
      amateur: { wins: 0, losses: 0, draws: 0 },
      hasApprovedGymLink: false,
      isTrueDebut: false,
    });
    const withLink = seedFromRecord({
      pro: { wins: 2, losses: 1, draws: 0 },
      amateur: { wins: 0, losses: 0, draws: 0 },
      hasApprovedGymLink: true,
      isTrueDebut: false,
    });
    expect(withLink.rd).toBeLessThan(noLink.rd);
  });
});

describe("updateBout — per-fight wrapper", () => {
  const base = () => ({ rating: 1500, rd: 200, volatility: 0.06 });

  it("both fighters' post-fight values computed from shared pre-fight snapshot", () => {
    // Asymmetry test: if A's update used B's post-fight state (or vice versa),
    // swapping the update order would change results. Verify symmetry.
    const a = base();
    const b = base();
    const r1 = updateBout(a, b, { outcomeA: 1, method: "Decision", isAmateur: false });
    // Independently: mirror the bout (B wins over A) — B's rating gain should
    // equal A's rating gain in the first case (mirror symmetry).
    const r2 = updateBout(a, b, { outcomeA: 0, method: "Decision", isAmateur: false });
    expect(r1.a.rating - 1500).toBeCloseTo(r2.b.rating - 1500, 6);
    expect(r1.b.rating - 1500).toBeCloseTo(r2.a.rating - 1500, 6);
  });

  it("pro KO vs pro decision → exactly +8 rating difference for the winner", () => {
    const a = base();
    const b = base();
    const dec = updateBout(a, b, { outcomeA: 1, method: "Decision", isAmateur: false });
    const ko = updateBout(a, b, { outcomeA: 1, method: "KO", isAmateur: false });
    expect(ko.a.rating - dec.a.rating).toBeCloseTo(8, 6);
    expect(dec.b.rating - ko.b.rating).toBeCloseTo(8, 6);
  });

  it("amateur KO vs amateur decision → exactly +4.4 (finish bonus scaled by 0.55)", () => {
    const a = base();
    const b = base();
    const dec = updateBout(a, b, { outcomeA: 1, method: "Decision", isAmateur: true });
    const ko = updateBout(a, b, { outcomeA: 1, method: "KO", isAmateur: true });
    expect(ko.a.rating - dec.a.rating).toBeCloseTo(4.4, 6);
    expect(dec.b.rating - ko.b.rating).toBeCloseTo(4.4, 6);
  });

  it("DQ carries no finish bonus", () => {
    const a = base();
    const b = base();
    const dec = updateBout(a, b, { outcomeA: 1, method: "Decision", isAmateur: false });
    const dq = updateBout(a, b, { outcomeA: 1, method: "DQ", isAmateur: false });
    expect(dq.a.rating).toBeCloseTo(dec.a.rating, 6);
  });

  it("amateur base delta ≈ 55% of pro base delta (decision only)", () => {
    const a = base();
    const b = base();
    const pro = updateBout(a, b, { outcomeA: 1, method: "Decision", isAmateur: false });
    const am = updateBout(a, b, { outcomeA: 1, method: "Decision", isAmateur: true });
    expect((am.a.rating - 1500) / (pro.a.rating - 1500)).toBeCloseTo(0.55, 6);
  });
});

describe("effectiveRd + displayed MU Score", () => {
  it("24 months inactive from stored RD 150 → grown near cap", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const last = new Date("2024-01-01T00:00:00Z");
    const eff = effectiveRd(150, last, now);
    expect(eff).toBeGreaterThan(300);
    expect(eff).toBeLessThanOrEqual(MAX_RD);
  });

  it("1 month inactive → barely moved", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const last = new Date("2025-12-01T00:00:00Z");
    const eff = effectiveRd(150, last, now);
    expect(eff - 150).toBeLessThan(20);
  });

  it("null last_result_at → no inactivity growth", () => {
    expect(effectiveRd(200, null)).toBe(200);
  });

  it("displayed MU Score is rating − 2·effectiveRd, rounded", () => {
    expect(displayedMuScore(1650, 100)).toBe(1450);
    expect(displayedMuScore(1500.7, 200.3)).toBe(Math.round(1500.7 - 2 * 200.3));
  });

  it("unproven high-RD fighter with high raw rating ranks below proven lower-rated fighter", () => {
    const unproven = displayedMuScore(1700, 340);
    const proven = displayedMuScore(1550, 60);
    expect(proven).toBeGreaterThan(unproven);
  });
});
