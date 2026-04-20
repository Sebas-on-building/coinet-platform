/**
 * L9.2 — LeadLagRelation Contract
 *
 * §9.2.4.4 — Governed temporal interpretation over linked signals. A
 * lead-lag is NOT the same as causality and must never be treated as
 * such by default (§9.1.3.5 / §9.1.6.1 / INV-9.1-E).
 */

/**
 * §9.2.4.4 — Lag class: the banded form of `lag_duration_ms` kept
 * alongside the raw number so downstream consumers never derive bands
 * on their own.
 */
export enum L9LagClass {
  ZERO = 'ZERO',
  TIGHT = 'TIGHT',
  NORMAL = 'NORMAL',
  LOOSE = 'LOOSE',
  BEYOND_WINDOW = 'BEYOND_WINDOW',
}

export const ALL_L9_LAG_CLASSES: readonly L9LagClass[] = Object.values(L9LagClass);

/**
 * §9.2.4.4 — How much support the lag pattern lends to the temporal
 * reading. This is interpretive support only — never final scoring.
 */
export enum L9LagSupportStrength {
  STRONG_SUPPORT = 'STRONG_SUPPORT',
  MODERATE_SUPPORT = 'MODERATE_SUPPORT',
  WEAK_SUPPORT = 'WEAK_SUPPORT',
  AMBIGUOUS = 'AMBIGUOUS',
  NON_SUPPORTIVE = 'NON_SUPPORTIVE',
}

export const ALL_L9_LAG_SUPPORT_STRENGTHS: readonly L9LagSupportStrength[] =
  Object.values(L9LagSupportStrength);

/**
 * §9.2.4.4 — Contradiction posture on the relation. If the source's
 * direction contradicts the target, this must be reflected and can not
 * be silently omitted (INV-9.1-C).
 */
export enum L9LagContradictionPosture {
  NONE = 'NONE',
  MILD = 'MILD',
  MATERIAL = 'MATERIAL',
  DECISIVE = 'DECISIVE',
}

export const ALL_L9_LAG_CONTRADICTION_POSTURES: readonly L9LagContradictionPosture[] =
  Object.values(L9LagContradictionPosture);

/**
 * §9.2.4.4 — Causal-restraint flag on the relation. Governed per
 * relation so every downstream consumer of a lead-lag must see the
 * causal-restraint declaration explicitly.
 */
export interface L9CausalRestraintFlags {
  readonly treated_as_temporal_only: true;
  readonly causal_inference_disclaimer: string;
}

/**
 * §9.2.4.4 — The LeadLagRelation contract.
 */
export interface L9LeadLagRelation {
  readonly lead_lag_id: string;
  readonly sequence_subject_id: string;
  readonly leading_signal_ref: string;
  readonly lagging_signal_ref: string;
  readonly lag_duration_ms: number;
  readonly lag_class: L9LagClass;
  readonly support_strength: L9LagSupportStrength;
  readonly contradiction_posture: L9LagContradictionPosture;
  /** §9.2.4.8 — Decay adjustment so support is still weighted correctly over time. */
  readonly decay_adjustment: number; // 0..1
  /**
   * §9.2.4.4 — Historical reliability of this specific lead-lag pattern,
   * where available. 0..1. Interpretive only — never final confidence.
   */
  readonly historical_reliability: number;
  readonly causal_restraint: L9CausalRestraintFlags;
  readonly lineage_refs: readonly string[];
}
