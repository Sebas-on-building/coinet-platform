/**
 * L9.3 — Sequence Materialization and Freshness Policy
 *
 * §9.3.2.7 / §9.3.2.8 / §9.3.8 — Subjects must declare how their
 * temporal outputs are materialized, when evidence packs are captured,
 * and how tolerant the pipeline is to staleness or late data. Runtime
 * may not invent its own hidden materialization logic (§9.3.8.4).
 */

/**
 * §9.3.2.7 — Staleness policy classes. Mirrors L8.3 so stacks below the
 * temporal engine can reason uniformly about freshness.
 */
export type L9SequenceStalenessPolicy =
  | 'STRICT'
  | 'TOLERANT'
  | 'PERMISSIVE'
  | 'DEGRADED_OK';

export const ALL_L9_SEQUENCE_STALENESS_POLICIES:
  readonly L9SequenceStalenessPolicy[] = [
    'STRICT',
    'TOLERANT',
    'PERMISSIVE',
    'DEGRADED_OK',
  ];

/**
 * §9.3.2.8 — Materialization policy. Determines when a sequence result
 * is persisted, reconstructed, or recomputed.
 */
export type L9SequenceMaterializationPolicy =
  | 'EAGER'
  | 'ON_DEMAND'
  | 'REPLAY_ONLY'
  | 'REPAIR_ONLY';

export const ALL_L9_SEQUENCE_MATERIALIZATION_POLICIES:
  readonly L9SequenceMaterializationPolicy[] = [
    'EAGER',
    'ON_DEMAND',
    'REPLAY_ONLY',
    'REPAIR_ONLY',
  ];

/**
 * §9.3.2.8 — Evidence-pack policy. Sequence subjects must declare
 * whether evidence is captured always, on demand, or only on material
 * conflict (e.g. late contradiction, decay override, change-point
 * shock).
 */
export type L9SequenceEvidencePackPolicy =
  | 'REQUIRED'
  | 'OPTIONAL'
  | 'ON_MATERIAL_CONFLICT';

export const ALL_L9_SEQUENCE_EVIDENCE_PACK_POLICIES:
  readonly L9SequenceEvidencePackPolicy[] = [
    'REQUIRED',
    'OPTIONAL',
    'ON_MATERIAL_CONFLICT',
  ];

/**
 * §9.3.3.3 / §9.3.7.2 — Late-data class attached to emitted sequence
 * outputs. LIVE emissions are `NONE` by default; repair/replay may mark
 * outputs as `LATE_MATERIAL` or `LATE_CRITICAL`.
 */
export type L9SequenceLateDataClass =
  | 'NONE'
  | 'LATE_MINOR'
  | 'LATE_MATERIAL'
  | 'LATE_CRITICAL';

export const ALL_L9_SEQUENCE_LATE_DATA_CLASSES:
  readonly L9SequenceLateDataClass[] = [
    'NONE',
    'LATE_MINOR',
    'LATE_MATERIAL',
    'LATE_CRITICAL',
  ];

/**
 * §9.3.3.3 — Replay identity mode. Same vocabulary as L7.3 / L8.3 so
 * later layers can reason uniformly about runtime mode.
 */
export type L9SequenceReplayIdentityMode =
  | 'LIVE'
  | 'REPLAY'
  | 'REPAIR'
  | 'HISTORICAL_RECONSTRUCTION';

export const ALL_L9_SEQUENCE_REPLAY_IDENTITY_MODES:
  readonly L9SequenceReplayIdentityMode[] = [
    'LIVE',
    'REPLAY',
    'REPAIR',
    'HISTORICAL_RECONSTRUCTION',
  ];

/**
 * §9.3.8.1 — Readiness classes. A sequence result moves through these
 * states based on contract validation + cleanliness law.
 */
export enum L9SequenceReadinessClass {
  CLEAN_EMISSION = 'CLEAN_EMISSION',
  MODIFIER_REQUIRED = 'MODIFIER_REQUIRED',
  CAPPED_EMISSION = 'CAPPED_EMISSION',
  DEGRADED_EMISSION = 'DEGRADED_EMISSION',
  BLOCKED_EMISSION = 'BLOCKED_EMISSION',
}

export const ALL_L9_SEQUENCE_READINESS_CLASSES:
  readonly L9SequenceReadinessClass[] =
    Object.values(L9SequenceReadinessClass);

/**
 * §9.3.3.5 — Material-posture thresholds used by the cleanliness law
 * and readiness validator. Kept as one constant so subject/output/
 * readiness validators stay consistent.
 */
export interface L9OutputCleanlinessThresholds {
  readonly ambiguityMaterial: number;
  readonly stalenessMaterial: number;
  readonly degradationMaterial: number;
  readonly decayMaterial: number;
  readonly completenessMaterial: number;
}

export const L9_OUTPUT_CLEANLINESS_THRESHOLDS: L9OutputCleanlinessThresholds = {
  ambiguityMaterial: 0.3,
  stalenessMaterial: 0.3,
  degradationMaterial: 0.3,
  decayMaterial: 0.6,
  completenessMaterial: 0.6,
};
