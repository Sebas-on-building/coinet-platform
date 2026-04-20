/**
 * L10.3 — Hypothesis Materialization and Freshness Policy
 *
 * §10.3.9 / §10.3.5.5 — Subjects must declare how their explanatory
 * outputs are materialized, when evidence packs are captured, and how
 * tolerant the pipeline is to staleness or late data. Runtime may not
 * invent its own hidden emission logic (§10.3.9.1).
 *
 * Vocabularies are aligned with L9.3 so L10 can consume lower-layer
 * posture without translating enum meaning at a boundary.
 */

export type L10HypothesisStalenessPolicy =
  | 'STRICT'
  | 'TOLERANT'
  | 'PERMISSIVE'
  | 'DEGRADED_OK';

export const ALL_L10_HYPOTHESIS_STALENESS_POLICIES:
  readonly L10HypothesisStalenessPolicy[] = [
    'STRICT',
    'TOLERANT',
    'PERMISSIVE',
    'DEGRADED_OK',
  ];

export type L10HypothesisMaterializationPolicy =
  | 'EAGER'
  | 'ON_DEMAND'
  | 'REPLAY_ONLY'
  | 'REPAIR_ONLY';

export const ALL_L10_HYPOTHESIS_MATERIALIZATION_POLICIES:
  readonly L10HypothesisMaterializationPolicy[] = [
    'EAGER',
    'ON_DEMAND',
    'REPLAY_ONLY',
    'REPAIR_ONLY',
  ];

export type L10HypothesisEvidencePackPolicy =
  | 'REQUIRED'
  | 'OPTIONAL'
  | 'ON_MATERIAL_CONFLICT';

export const ALL_L10_HYPOTHESIS_EVIDENCE_PACK_POLICIES:
  readonly L10HypothesisEvidencePackPolicy[] = [
    'REQUIRED',
    'OPTIONAL',
    'ON_MATERIAL_CONFLICT',
  ];

export type L10HypothesisLateDataClass =
  | 'NONE'
  | 'LATE_MINOR'
  | 'LATE_MATERIAL'
  | 'LATE_CRITICAL';

export const ALL_L10_HYPOTHESIS_LATE_DATA_CLASSES:
  readonly L10HypothesisLateDataClass[] = [
    'NONE',
    'LATE_MINOR',
    'LATE_MATERIAL',
    'LATE_CRITICAL',
  ];

export type L10HypothesisReplayIdentityMode =
  | 'LIVE'
  | 'REPLAY'
  | 'REPAIR'
  | 'HISTORICAL_RECONSTRUCTION';

export const ALL_L10_HYPOTHESIS_REPLAY_IDENTITY_MODES:
  readonly L10HypothesisReplayIdentityMode[] = [
    'LIVE',
    'REPLAY',
    'REPAIR',
    'HISTORICAL_RECONSTRUCTION',
  ];

/**
 * §10.3.9.2 — Emission readiness classes. A hypothesis output moves
 * through these states based on contract validation + cleanliness law.
 * Distinct from L10.2's draft/provisional/ready object-readiness, which
 * is coarser.
 */
export enum L10HypothesisEmissionReadinessClass {
  CLEAN_EMISSION = 'CLEAN_EMISSION',
  MODIFIER_REQUIRED = 'MODIFIER_REQUIRED',
  CAPPED_EMISSION = 'CAPPED_EMISSION',
  DEGRADED_EMISSION = 'DEGRADED_EMISSION',
  BLOCKED_EMISSION = 'BLOCKED_EMISSION',
}

export const ALL_L10_HYPOTHESIS_EMISSION_READINESS_CLASSES:
  readonly L10HypothesisEmissionReadinessClass[] =
    Object.values(L10HypothesisEmissionReadinessClass);

/**
 * §10.3.5.5 / §10.3.9.5 — Material-posture thresholds used by
 * cleanliness law. Kept in one place so subject/output/readiness
 * validators remain consistent.
 *
 *   - contradictionMaterial : contradiction_pressure_score above this is
 *     material and forbids `CLEAN_EMISSION`.
 *   - confirmationGapMaterial : confirmation_gap_score above this is
 *     material and forbids `CLEAN_EMISSION`.
 *   - invalidationRiskMaterial : invalidation_risk_score above this is
 *     material and forbids `CLEAN_EMISSION`.
 *   - narrowSpread : confidence_spread below this is "narrow"; the
 *     output must carry the narrow-spread flag and narrowing_reasons.
 *   - stalenessMaterial / degradationMaterial : freshness / degradation
 *     posture thresholds consumed from L7/L9 downstream.
 */
export interface L10HypothesisOutputCleanlinessThresholds {
  readonly contradictionMaterial: number;
  readonly confirmationGapMaterial: number;
  readonly invalidationRiskMaterial: number;
  readonly narrowSpread: number;
  readonly stalenessMaterial: number;
  readonly degradationMaterial: number;
}

export const L10_HYPOTHESIS_OUTPUT_CLEANLINESS_THRESHOLDS:
  L10HypothesisOutputCleanlinessThresholds = {
    contradictionMaterial: 0.3,
    confirmationGapMaterial: 0.3,
    invalidationRiskMaterial: 0.3,
    narrowSpread: 0.15,
    stalenessMaterial: 0.3,
    degradationMaterial: 0.3,
  };
