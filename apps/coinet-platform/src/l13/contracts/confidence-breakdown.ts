/**
 * L13.2 — Confidence Breakdown Contract
 *
 * §13.2.7 — The L13 explanation confidence band is derived from the
 * narrowest of the lower-layer confidences. L13 may never raise
 * confidence above L7/L8/L9/L10/L11/L12 posture. Active
 * invalidation, narrow spread, missing data, drift, transition risk,
 * decay, unresolved triggers, and contradictions all narrow.
 */

export enum L13ExplanationConfidenceBand {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
  BLOCKED = 'BLOCKED',
}

export const ALL_L13_EXPLANATION_CONFIDENCE_BANDS:
  readonly L13ExplanationConfidenceBand[] =
  Object.values(L13ExplanationConfidenceBand);

const BAND_RANK: Record<L13ExplanationConfidenceBand, number> = {
  [L13ExplanationConfidenceBand.BLOCKED]: -1,
  [L13ExplanationConfidenceBand.VERY_LOW]: 0,
  [L13ExplanationConfidenceBand.LOW]: 1,
  [L13ExplanationConfidenceBand.MEDIUM]: 2,
  [L13ExplanationConfidenceBand.HIGH]: 3,
  [L13ExplanationConfidenceBand.VERY_HIGH]: 4,
};

/**
 * §13.2.7 — Order-aware comparator used by the confidence-breakdown
 * builder to never raise above lower-layer posture.
 */
export function compareL13ExplanationConfidenceBands(
  a: L13ExplanationConfidenceBand,
  b: L13ExplanationConfidenceBand,
): number {
  return BAND_RANK[a] - BAND_RANK[b];
}

export function rankL13ExplanationConfidenceBand(
  band: L13ExplanationConfidenceBand,
): number {
  return BAND_RANK[band];
}

export enum L13ConfidenceNarrowingReason {
  ACTIVE_CONTRADICTION = 'ACTIVE_CONTRADICTION',
  ACTIVE_INVALIDATION = 'ACTIVE_INVALIDATION',
  NARROW_SCENARIO_SPREAD = 'NARROW_SCENARIO_SPREAD',
  NARROW_HYPOTHESIS_SPREAD = 'NARROW_HYPOTHESIS_SPREAD',
  MISSING_DATA = 'MISSING_DATA',
  DRIFT = 'DRIFT',
  TRANSITION_RISK = 'TRANSITION_RISK',
  SEQUENCE_DECAY = 'SEQUENCE_DECAY',
  UNRESOLVED_TRIGGER = 'UNRESOLVED_TRIGGER',
  RESTRICTION = 'RESTRICTION',
}

export const ALL_L13_CONFIDENCE_NARROWING_REASONS:
  readonly L13ConfidenceNarrowingReason[] =
  Object.values(L13ConfidenceNarrowingReason);

export interface L13ConfidenceBreakdown {
  readonly confidence_breakdown_id: string;

  readonly overall_explanation_confidence_band:
    L13ExplanationConfidenceBand;

  readonly validation_confidence_band: string;
  readonly regime_confidence_band: string;
  readonly sequence_confidence_band: string;
  readonly hypothesis_confidence_band: string;
  readonly score_confidence_band: string;
  readonly scenario_confidence_band: string;

  readonly confidence_cap_refs: readonly string[];
  readonly confidence_narrowing_reasons:
    readonly L13ConfidenceNarrowingReason[];

  readonly may_use_confident_language: boolean;
  readonly must_use_uncertainty_language: boolean;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}
