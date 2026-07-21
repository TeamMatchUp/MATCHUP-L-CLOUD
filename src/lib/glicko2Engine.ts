// Glicko-2 rating engine (internal). Publicly the app still displays a single
// "MU Score" number. Rating deviation and volatility are internal only.
//
// The general primitive is `glickoStep` — a full Glicko-2 rating-period update
// that accepts a list of opponents. It is the unit under test against
// Glickman's published anchor. `updateBout` is a thin per-fight wrapper that
// calls `glickoStep` with a single-item opponent list. Level-weight (amateur
// discount) and finish bonus are applied by the wrapper *outside* the core
// math, so the primitive stays a pure Glicko-2 implementation.

export const TAU = 0.5;
export const SCALE = 173.7178;
export const DEFAULT_RATING = 1500;
export const DEFAULT_RD = 350;
export const DEFAULT_VOL = 0.06;
export const MAX_RD = 350;

export const FINISH_BONUS_PRO = 8;
export const PRO_LEVEL_WEIGHT = 1.0;
export const AM_LEVEL_WEIGHT = 0.55;

// Inactivity RD growth: `c` chosen so that starting from RD=50 it takes ~100
// months to grow back to RD=350 (typical Glicko-2 tuning). Applied per month.
export const INACTIVITY_C = 64.5;

export interface Rating {
  rating: number;
  rd: number;
  volatility: number;
}

export interface OpponentEntry {
  rating: number;
  rd: number;
  score: number; // 0, 0.5, or 1
}

// ---------- Core Glicko-2 primitive ----------

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function e(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

/**
 * General Glicko-2 rating-period update. Processes any number of opponents
 * within a single period, per Glickman (2013). This is the primitive validated
 * against the published worked example.
 */
export function glickoStep(
  player: Rating,
  opponents: OpponentEntry[],
  tau = TAU
): Rating {
  // Scale to internal (mu, phi, sigma).
  const mu = (player.rating - DEFAULT_RATING) / SCALE;
  const phi = player.rd / SCALE;
  const sigma = player.volatility;

  // No games this period → only RD grows via volatility (§Step 6 special case).
  if (opponents.length === 0) {
    const phiPrime = Math.sqrt(phi * phi + sigma * sigma);
    return {
      rating: player.rating,
      rd: Math.min(phiPrime * SCALE, MAX_RD),
      volatility: sigma,
    };
  }

  // Convert opponents.
  const conv = opponents.map((o) => ({
    muJ: (o.rating - DEFAULT_RATING) / SCALE,
    phiJ: o.rd / SCALE,
    s: o.score,
  }));

  // Step 3: v (estimated variance).
  let vInv = 0;
  for (const c of conv) {
    const gj = g(c.phiJ);
    const ej = e(mu, c.muJ, c.phiJ);
    vInv += gj * gj * ej * (1 - ej);
  }
  const v = 1 / vInv;

  // Step 4: Δ (estimated improvement).
  let delta = 0;
  for (const c of conv) {
    delta += g(c.phiJ) * (c.s - e(mu, c.muJ, c.phiJ));
  }
  delta *= v;

  // Step 5: new volatility via iterative algorithm (Illinois method).
  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * Math.pow(phi * phi + v + ex, 2);
    return num / den - (x - a) / (tau * tau);
  };
  const epsilon = 1e-6;
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) k++;
    B = a - k * tau;
  }
  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > epsilon) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }
  const sigmaPrime = Math.exp(A / 2);

  // Step 6: pre-rating-period RD.
  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime);

  // Step 7: new rating & RD.
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  let muPrime = mu;
  for (const c of conv) {
    muPrime += phiPrime * phiPrime * g(c.phiJ) * (c.s - e(mu, c.muJ, c.phiJ));
  }

  return {
    rating: muPrime * SCALE + DEFAULT_RATING,
    rd: Math.min(phiPrime * SCALE, MAX_RD),
    volatility: sigmaPrime,
  };
}

// ---------- Wrapper: per-fight update ----------

function isFinish(method: string | null | undefined): boolean {
  if (!method) return false;
  const u = method.toUpperCase();
  return u.includes("KO") || u.includes("TKO") || u.includes("SUB");
}
function isDq(method: string | null | undefined): boolean {
  return !!method && method.toUpperCase().includes("DQ");
}

export function levelWeight(isAmateur: boolean): number {
  return isAmateur ? AM_LEVEL_WEIGHT : PRO_LEVEL_WEIGHT;
}

/**
 * Per-fight update. Thin wrapper: calls `glickoStep` twice (once per fighter,
 * each seeing the other's pre-fight state), applies the amateur/pro level
 * discount to the rating delta, then applies a level-scaled finish bonus.
 *
 * `s` passed to `glickoStep` is always in {0, 0.5, 1}. The finish bonus is a
 * post-hoc rating adjustment — encoding it into `s` would break the volatility
 * iteration (which assumes s ∈ [0, 1]).
 *
 * Amateur discount is uniform across seed, base delta, and finish bonus (all
 * ×0.55). RD & volatility movement is level-agnostic — any real fight reduces
 * uncertainty regardless of level.
 */
export function updateBout(
  a: Rating,
  b: Rating,
  opts: {
    /** A's outcome: 1 = win, 0.5 = draw, 0 = loss. */
    outcomeA: 0 | 0.5 | 1;
    method: string | null | undefined;
    isAmateur: boolean;
  }
): { a: Rating; b: Rating } {
  const { outcomeA, method, isAmateur } = opts;
  const lw = levelWeight(isAmateur);
  const outcomeB = (1 - outcomeA) as 0 | 0.5 | 1;

  // Snapshot pre-fight for symmetric application.
  const aPre = { ...a };
  const bPre = { ...b };

  const aRaw = glickoStep(aPre, [{ rating: bPre.rating, rd: bPre.rd, score: outcomeA }]);
  const bRaw = glickoStep(bPre, [{ rating: aPre.rating, rd: aPre.rd, score: outcomeB }]);

  // Level-weight scaling on the rating delta only.
  let aRating = aPre.rating + (aRaw.rating - aPre.rating) * lw;
  let bRating = bPre.rating + (bRaw.rating - bPre.rating) * lw;

  // Finish bonus: only on decisive win/loss with KO/TKO/Sub, never on DQ or
  // draw. Scaled by the same level_weight (amateur finish = ±4.4, pro = ±8).
  if (outcomeA !== 0.5 && isFinish(method) && !isDq(method)) {
    const bonus = FINISH_BONUS_PRO * lw;
    if (outcomeA === 1) {
      aRating += bonus;
      bRating -= bonus;
    } else {
      aRating -= bonus;
      bRating += bonus;
    }
  }

  return {
    a: { rating: aRating, rd: aRaw.rd, volatility: aRaw.volatility },
    b: { rating: bRating, rd: bRaw.rd, volatility: bRaw.volatility },
  };
}

// ---------- Seeding from prior record ----------

export interface SeedInput {
  pro: { wins: number; losses: number; draws: number };
  amateur: { wins: number; losses: number; draws: number };
  hasApprovedGymLink: boolean;
  /** True 0-0-0 debut (no reported record at all). */
  isTrueDebut: boolean;
}

/**
 * Compute a starting Rating from a fighter's reported historical record.
 * Draws counted as ½ win. Amateur results discounted by 0.55. Laplace smoothing
 * pulls small samples toward 0.5. RD tiered by data quality.
 */
export function seedFromRecord(input: SeedInput): Rating {
  const { pro, amateur, hasApprovedGymLink, isTrueDebut } = input;

  if (isTrueDebut) {
    return { rating: DEFAULT_RATING, rd: DEFAULT_RD, volatility: DEFAULT_VOL };
  }

  // Adjusted wins (draws as ½).
  const proAdjWins = pro.wins + 0.5 * pro.draws;
  const proN = pro.wins + pro.losses + pro.draws;
  const amAdjWins = amateur.wins + 0.5 * amateur.draws;
  const amN = amateur.wins + amateur.losses + amateur.draws;

  // Weighted combination — amateur ×0.55.
  const combinedWins = proAdjWins + AM_LEVEL_WEIGHT * amAdjWins;
  const combinedN = proN + AM_LEVEL_WEIGHT * amN;

  // Laplace: (w+2)/(n+4).
  const awr = (combinedWins + 2) / (combinedN + 4);

  const rating = DEFAULT_RATING + (awr - 0.5) * 600;

  // RD tier by data quality.
  let rd: number;
  if (proN + amN === 0) rd = DEFAULT_RD;
  else if (hasApprovedGymLink && proN + amN >= 3) rd = 250;
  else rd = 300;

  return { rating, rd, volatility: DEFAULT_VOL };
}

// ---------- Inactivity + display ----------

export function monthsBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 30.4375);
}

/**
 * Effective RD after inactivity: sqrt(rd² + c²·months), clamped at MAX_RD.
 * `lastResultAt` null → months = 0 (never fought → RD unchanged from stored).
 */
export function effectiveRd(
  storedRd: number,
  lastResultAt: Date | string | null | undefined,
  now: Date = new Date()
): number {
  let months = 0;
  if (lastResultAt) {
    const d = typeof lastResultAt === "string" ? new Date(lastResultAt) : lastResultAt;
    months = monthsBetween(d, now);
  }
  const grown = Math.sqrt(storedRd * storedRd + INACTIVITY_C * INACTIVITY_C * months);
  return Math.min(grown, MAX_RD);
}

/** Displayed MU Score: rating − 2·effectiveRD, rounded. */
export function displayedMuScore(rating: number, effRd: number): number {
  return Math.round(rating - 2 * effRd);
}
