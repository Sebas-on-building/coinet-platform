/**
 * L9.5 — Decay Policy
 *
 * §9.5.8 — Semantic decay. Decay is distinct from staleness (§9.5.8.2):
 * staleness asks whether data is current; decay asks whether earlier
 * signal meaning still governs present temporal interpretation. Decay
 * must stay explicit (INV-9.2-F / §9.5.8 / §9.5.10.2).
 */

import { L9DecayClass, L9DecayReasonCode } from './decay-profile';

/**
 * §9.5.8.4 — Semantic decay-dominance band. Sits one level above
 * `L9DecayClass` and tells later engines whether the chain is still
 * governed by its earlier structure, dominated by later evidence, or
 * unresolved.
 */
export enum L9DecayDominance {
  LOW_DECAY = 'LOW_DECAY',
  MODERATE_DECAY = 'MODERATE_DECAY',
  HIGH_DECAY = 'HIGH_DECAY',
  DOMINANT_DECAY = 'DOMINANT_DECAY',
  UNRESOLVED_DECAY = 'UNRESOLVED_DECAY',
}

export const ALL_L9_DECAY_DOMINANCES: readonly L9DecayDominance[] =
  Object.values(L9DecayDominance);

/**
 * §9.5.8.5 — Canonical decay factors. Decay score is built by
 * combining weighted contributions from these factors — never a single
 * opaque number.
 */
export enum L9DecayFactor {
  TIME_ELAPSED = 'TIME_ELAPSED',
  CONTRADICTION_BURDEN = 'CONTRADICTION_BURDEN',
  PHASE_DISPLACEMENT = 'PHASE_DISPLACEMENT',
  REGIME_SHIFT = 'REGIME_SHIFT',
  POST_EVENT_PERSISTENCE = 'POST_EVENT_PERSISTENCE',
  STRONGER_LATER_SIGNAL = 'STRONGER_LATER_SIGNAL',
  ORIGINAL_SUPPORT_DEGRADED = 'ORIGINAL_SUPPORT_DEGRADED',
}

export const ALL_L9_DECAY_FACTORS: readonly L9DecayFactor[] =
  Object.values(L9DecayFactor);

/**
 * §9.5.8.5 — Frozen weight per factor used when composing a decay
 * score. Weights sum to 1.0.
 */
export const L9_DECAY_FACTOR_WEIGHTS:
  Readonly<Record<L9DecayFactor, number>> = {
    [L9DecayFactor.TIME_ELAPSED]: 0.20,
    [L9DecayFactor.CONTRADICTION_BURDEN]: 0.20,
    [L9DecayFactor.PHASE_DISPLACEMENT]: 0.15,
    [L9DecayFactor.REGIME_SHIFT]: 0.10,
    [L9DecayFactor.POST_EVENT_PERSISTENCE]: 0.10,
    [L9DecayFactor.STRONGER_LATER_SIGNAL]: 0.15,
    [L9DecayFactor.ORIGINAL_SUPPORT_DEGRADED]: 0.10,
  };

/**
 * §9.5.8.5 — Compose a decay score in 0..1 from per-factor
 * contributions. Missing factors default to 0. Contributions are
 * clamped to [0,1] before weighting.
 */
export function composeL9DecayScore(
  contributions: Partial<Record<L9DecayFactor, number>>,
): number {
  let score = 0;
  for (const f of ALL_L9_DECAY_FACTORS) {
    const raw = contributions[f];
    const clamped = !Number.isFinite(raw ?? 0) ? 0
      : Math.max(0, Math.min(1, raw ?? 0));
    score += clamped * L9_DECAY_FACTOR_WEIGHTS[f];
  }
  return Math.max(0, Math.min(1, score));
}

/**
 * §9.5.8.4 — Band a decay score into an `L9DecayDominance`. This is the
 * semantic-layer classification; the raw `L9DecayClass` is the numeric
 * band owned by L9.3.
 */
export function classifyL9DecayDominance(
  decay_score: number,
): L9DecayDominance {
  if (!Number.isFinite(decay_score) || decay_score < 0) {
    return L9DecayDominance.UNRESOLVED_DECAY;
  }
  if (decay_score < 0.20) return L9DecayDominance.LOW_DECAY;
  if (decay_score < 0.50) return L9DecayDominance.MODERATE_DECAY;
  if (decay_score < 0.75) return L9DecayDominance.HIGH_DECAY;
  return L9DecayDominance.DOMINANT_DECAY;
}

/**
 * §9.5.8.4 — Convenience: convert an L9.3 `L9DecayClass` banding to the
 * L9.5 semantic dominance band. Lossy by design — use only for
 * compatibility, not for score recomputation.
 */
export function l9DecayClassToDominance(
  cls: L9DecayClass,
): L9DecayDominance {
  switch (cls) {
    case L9DecayClass.FRESH: return L9DecayDominance.LOW_DECAY;
    case L9DecayClass.AGING: return L9DecayDominance.MODERATE_DECAY;
    case L9DecayClass.DECAYING: return L9DecayDominance.HIGH_DECAY;
    case L9DecayClass.DEPRECATED: return L9DecayDominance.DOMINANT_DECAY;
  }
}

/**
 * §9.5.8.6 — Refresh doctrine. A refresh is legal only if the
 * confirming signal is governed, belongs to the same semantic family,
 * and contradiction posture does not nullify the refresh.
 */
export interface L9RefreshCandidate {
  /** The refreshing signal ref. */
  readonly ref: string;
  /** Is this ref governed (came through L7 validation / L8 regime)? */
  readonly governed: boolean;
  /** Does this ref belong to the same semantic signal family? */
  readonly same_family: boolean;
  /** Does contradiction posture nullify refresh? */
  readonly contradiction_nullifies: boolean;
  /** Is the refresh inside the declared refresh window? */
  readonly inside_refresh_window: boolean;
  /** Reason codes carried by the refresh candidate. */
  readonly reason_codes: readonly L9DecayReasonCode[];
}

export interface L9RefreshEvaluation {
  readonly legal: boolean;
  readonly reasons: readonly string[];
}

/**
 * §9.5.8.6 — Decide whether a refresh candidate may legally refresh
 * earlier support. All conditions must hold.
 */
export function evaluateL9Refresh(
  c: L9RefreshCandidate,
): L9RefreshEvaluation {
  const reasons: string[] = [];
  if (!c.governed) reasons.push('REFRESH_UNGOVERNED');
  if (!c.same_family) reasons.push('REFRESH_FAMILY_MISMATCH');
  if (c.contradiction_nullifies) reasons.push('REFRESH_CONTRADICTION_NULLIFIES');
  if (!c.inside_refresh_window) reasons.push('REFRESH_OUTSIDE_WINDOW');
  return { legal: reasons.length === 0, reasons };
}

/**
 * §9.5.8.7 — Decay dominance law. A chain becomes "decay-dominant"
 * when the score is in the HIGH/DOMINANT bands AND at least one of:
 *   - later contradiction pressure is present
 *   - stronger later signal is present
 *   - original support has degraded
 * All three are explicit factors rather than implicit scoring games.
 */
export function l9IsDecayDominant(
  decay_score: number,
  contributions: Partial<Record<L9DecayFactor, number>>,
): boolean {
  const dominance = classifyL9DecayDominance(decay_score);
  if (dominance !== L9DecayDominance.HIGH_DECAY &&
      dominance !== L9DecayDominance.DOMINANT_DECAY) return false;
  const later = Math.max(
    contributions[L9DecayFactor.CONTRADICTION_BURDEN] ?? 0,
    contributions[L9DecayFactor.STRONGER_LATER_SIGNAL] ?? 0,
    contributions[L9DecayFactor.ORIGINAL_SUPPORT_DEGRADED] ?? 0,
  );
  return later >= 0.4;
}

/**
 * §9.5.8.8 — Illegal decay postures — returns a list of violation
 * detail strings when any hold.
 */
export function scanL9IllegalDecayPostures(input: {
  readonly decay_score: number;
  readonly decay_class: L9DecayClass;
  readonly has_dominant_contradiction: boolean;
  readonly claims_still_early: boolean;
  readonly contributions: Partial<Record<L9DecayFactor, number>>;
  readonly post_event_shock_still_dominant: boolean;
  readonly claims_recovery: boolean;
}): string[] {
  const out: string[] = [];
  if (input.has_dominant_contradiction && input.decay_score < 0.2) {
    out.push('DECAY_ZERO_UNDER_DOMINANT_CONTRADICTION');
  }
  if (input.claims_still_early && input.decay_score >= 0.5) {
    out.push('STILL_EARLY_WHILE_MATERIALLY_DECAYED');
  }
  if (input.decay_class === L9DecayClass.FRESH &&
      (input.contributions[L9DecayFactor.CONTRADICTION_BURDEN] ?? 0) > 0.5) {
    out.push('FRESH_CLASS_WITH_HIGH_CONTRADICTION');
  }
  if (input.post_event_shock_still_dominant && input.claims_recovery) {
    out.push('RECOVERY_CLAIM_WHILE_SHOCK_DOMINANT');
  }
  return out;
}
