/**
 * L9.2 — SequenceRestrictionProfile Contract
 *
 * §9.2.4.11 — Defines how later layers may rely on sequence truth.
 * Sequence truth is not equally usable everywhere (§9.2.4.11 law).
 *
 * This is L9's object-model counterpart to L7's restriction profile —
 * it governs downstream reliance on this specific SequenceAssessment,
 * not raw validation rights.
 */

/**
 * §9.2.4.11 — Reliance band for a sequence assessment. Determines how
 * much weight downstream layers may place on the temporal verdict.
 */
export enum L9SequenceRelianceBand {
  DECISIVE = 'DECISIVE',
  PRIMARY = 'PRIMARY',
  SUPPORTING = 'SUPPORTING',
  CORROBORATING = 'CORROBORATING',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
  BLOCKED = 'BLOCKED',
}

export const ALL_L9_SEQUENCE_RELIANCE_BANDS:
  readonly L9SequenceRelianceBand[] =
    Object.values(L9SequenceRelianceBand);

/**
 * §9.2.4.11 — Allowed downstream use contexts. These describe *what*
 * later layers may do with the assessment, not *who* may consume it.
 */
export enum L9AllowedDownstreamUse {
  SCENARIO_INPUT = 'SCENARIO_INPUT',
  JUDGMENT_INPUT = 'JUDGMENT_INPUT',
  RECOMMENDATION_CONTEXT = 'RECOMMENDATION_CONTEXT',
  RISK_CONDITIONING = 'RISK_CONDITIONING',
  AUDIT_REFERENCE = 'AUDIT_REFERENCE',
}

export const ALL_L9_ALLOWED_DOWNSTREAM_USES:
  readonly L9AllowedDownstreamUse[] =
    Object.values(L9AllowedDownstreamUse);

/**
 * §9.2.4.11 — Typed narrowing reasons. A restriction profile that
 * narrows downstream rights must declare *why* so replay and audit can
 * reason about the decision.
 */
export enum L9SequenceNarrowingReason {
  HIGH_AMBIGUITY = 'HIGH_AMBIGUITY',
  HIGH_DECAY = 'HIGH_DECAY',
  MATERIAL_CONTRADICTION = 'MATERIAL_CONTRADICTION',
  REGIME_POSTURE_UNSTABLE = 'REGIME_POSTURE_UNSTABLE',
  RESTRICTION_POSTURE_UNSTABLE = 'RESTRICTION_POSTURE_UNSTABLE',
  INCOMPLETE_CHAIN = 'INCOMPLETE_CHAIN',
  MISSING_POST_EVENT_ANCHOR = 'MISSING_POST_EVENT_ANCHOR',
  STALENESS = 'STALENESS',
  CAUSAL_RESTRAINT = 'CAUSAL_RESTRAINT',
}

export const ALL_L9_SEQUENCE_NARROWING_REASONS:
  readonly L9SequenceNarrowingReason[] =
    Object.values(L9SequenceNarrowingReason);

/**
 * §9.2.4.11 — The SequenceRestrictionProfile object.
 */
export interface L9SequenceRestrictionProfile {
  readonly sequence_restriction_profile_id: string;
  readonly sequence_assessment_id: string;
  readonly reliance_band: L9SequenceRelianceBand;
  readonly allowed_downstream_uses: readonly L9AllowedDownstreamUse[];
  readonly required_disclosures: readonly string[];
  readonly narrowing_reasons: readonly L9SequenceNarrowingReason[];
  readonly blocked_uses: readonly L9AllowedDownstreamUse[];
  readonly lineage_refs: readonly string[];
}
