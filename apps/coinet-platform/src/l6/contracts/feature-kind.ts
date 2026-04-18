/**
 * L6.2 — Feature Kind Contract
 *
 * §6.2.5.2 — Legal feature kinds.
 * §6.2.5.6 — Kind-specific contract obligations.
 *
 * A feature is a STATE descriptor. Every feature must declare exactly one kind.
 * Each kind imposes structural requirements that the runtime must honor.
 */

export enum L6FeatureKind {
  SCALAR_NUMERIC = 'SCALAR_NUMERIC',
  SCALAR_BOOLEAN = 'SCALAR_BOOLEAN',
  SCALAR_ORDINAL = 'SCALAR_ORDINAL',
  VECTOR_MULTI_HORIZON = 'VECTOR_MULTI_HORIZON',
  PERCENTILE_NORMALIZED = 'PERCENTILE_NORMALIZED',
  Z_SCORE_NORMALIZED = 'Z_SCORE_NORMALIZED',
  RATIO_OR_SPREAD = 'RATIO_OR_SPREAD',
  DETERMINISTIC_COMPOSITE = 'DETERMINISTIC_COMPOSITE',
  DIVERGENCE_FEATURE = 'DIVERGENCE_FEATURE',
  STATE_FLAG = 'STATE_FLAG',
}

export const ALL_FEATURE_KINDS: readonly L6FeatureKind[] = Object.values(L6FeatureKind);

export type FeatureValueShape =
  | 'NUMBER'
  | 'BOOLEAN'
  | 'ORDINAL'
  | 'NUMBER_VECTOR'
  | 'COMPOSITE'
  | 'DIVERGENCE_PAIR';

export interface FeatureKindDescriptor {
  readonly kind: L6FeatureKind;
  readonly semanticDescription: string;
  readonly requiredContractFields: readonly string[];
  readonly forbiddenContractFields: readonly string[];
  readonly allowedValueShapes: readonly FeatureValueShape[];
  readonly minEvidenceExpectation:
    | 'NONE'
    | 'INPUT_REFERENCES'
    | 'INPUT_REFERENCES_AND_BASELINE'
    | 'COMPOSITE_CONSTITUENTS';
  readonly downstreamCompatibilityNotes: string;
}
