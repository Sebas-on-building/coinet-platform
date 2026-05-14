/**
 * L12.5 — Path confidence policy (§12.5.13).
 *
 * Path confidence is *not* prediction probability. It is the degree to which
 * governed evidence supports the current conditional path relative to
 * alternatives. The policy declares the factor groups, their weights, and
 * each factor's direction (positive vs. inverted).
 */

export enum L12PathConfidenceFactorGroup {
  VALIDATION_SUPPORT = 'VALIDATION_SUPPORT',
  CONTRADICTION_PRESSURE = 'CONTRADICTION_PRESSURE',
  REGIME_COMPATIBILITY = 'REGIME_COMPATIBILITY',
  TRANSITION_RISK = 'TRANSITION_RISK',
  SEQUENCE_QUALITY = 'SEQUENCE_QUALITY',
  SEQUENCE_DECAY = 'SEQUENCE_DECAY',
  HYPOTHESIS_STRENGTH = 'HYPOTHESIS_STRENGTH',
  HYPOTHESIS_SPREAD = 'HYPOTHESIS_SPREAD',
  SCORE_CONTEXT_SUPPORT = 'SCORE_CONTEXT_SUPPORT',
  SCORE_ATTRIBUTION_SUPPORT = 'SCORE_ATTRIBUTION_SUPPORT',
  MISSING_VISIBILITY = 'MISSING_VISIBILITY',
  DRIFT_PRESSURE = 'DRIFT_PRESSURE',
  TRIGGER_COMPLETENESS = 'TRIGGER_COMPLETENESS',
  INVALIDATION_PRESSURE = 'INVALIDATION_PRESSURE',
  SCENARIO_SPREAD = 'SCENARIO_SPREAD',
}

export const ALL_L12_PATH_CONFIDENCE_FACTOR_GROUPS: readonly L12PathConfidenceFactorGroup[] =
  Object.values(L12PathConfidenceFactorGroup);

/** Direction of a confidence factor. */
export enum L12PathConfidenceFactorDirection {
  POSITIVE = 'POSITIVE',
  INVERTED = 'INVERTED',
}

/**
 * Production v1 weights (§12.5.13.3). Sum = 1.00 exactly.
 *
 * (The §12.5.13.3 reference table sums to 1.10; these production weights
 * preserve the spec's relative ordering while normalising to unit total.)
 */
export const L12_DEFAULT_PATH_CONFIDENCE_WEIGHTS: Readonly<
  Record<L12PathConfidenceFactorGroup, number>
> = {
  [L12PathConfidenceFactorGroup.VALIDATION_SUPPORT]: 0.09,
  [L12PathConfidenceFactorGroup.CONTRADICTION_PRESSURE]: 0.09,
  [L12PathConfidenceFactorGroup.REGIME_COMPATIBILITY]: 0.07,
  [L12PathConfidenceFactorGroup.TRANSITION_RISK]: 0.06,
  [L12PathConfidenceFactorGroup.SEQUENCE_QUALITY]: 0.07,
  [L12PathConfidenceFactorGroup.SEQUENCE_DECAY]: 0.06,
  [L12PathConfidenceFactorGroup.HYPOTHESIS_STRENGTH]: 0.08,
  [L12PathConfidenceFactorGroup.HYPOTHESIS_SPREAD]: 0.07,
  [L12PathConfidenceFactorGroup.SCORE_CONTEXT_SUPPORT]: 0.07,
  [L12PathConfidenceFactorGroup.SCORE_ATTRIBUTION_SUPPORT]: 0.05,
  [L12PathConfidenceFactorGroup.MISSING_VISIBILITY]: 0.06,
  [L12PathConfidenceFactorGroup.DRIFT_PRESSURE]: 0.05,
  [L12PathConfidenceFactorGroup.TRIGGER_COMPLETENESS]: 0.05,
  [L12PathConfidenceFactorGroup.INVALIDATION_PRESSURE]: 0.09,
  [L12PathConfidenceFactorGroup.SCENARIO_SPREAD]: 0.04,
};

/** Direction of each factor (§12.5.13.4). */
export const L12_PATH_CONFIDENCE_FACTOR_DIRECTIONS: Readonly<
  Record<L12PathConfidenceFactorGroup, L12PathConfidenceFactorDirection>
> = {
  [L12PathConfidenceFactorGroup.VALIDATION_SUPPORT]: L12PathConfidenceFactorDirection.POSITIVE,
  [L12PathConfidenceFactorGroup.CONTRADICTION_PRESSURE]: L12PathConfidenceFactorDirection.INVERTED,
  [L12PathConfidenceFactorGroup.REGIME_COMPATIBILITY]: L12PathConfidenceFactorDirection.POSITIVE,
  [L12PathConfidenceFactorGroup.TRANSITION_RISK]: L12PathConfidenceFactorDirection.INVERTED,
  [L12PathConfidenceFactorGroup.SEQUENCE_QUALITY]: L12PathConfidenceFactorDirection.POSITIVE,
  [L12PathConfidenceFactorGroup.SEQUENCE_DECAY]: L12PathConfidenceFactorDirection.INVERTED,
  [L12PathConfidenceFactorGroup.HYPOTHESIS_STRENGTH]: L12PathConfidenceFactorDirection.POSITIVE,
  [L12PathConfidenceFactorGroup.HYPOTHESIS_SPREAD]: L12PathConfidenceFactorDirection.INVERTED,
  [L12PathConfidenceFactorGroup.SCORE_CONTEXT_SUPPORT]: L12PathConfidenceFactorDirection.POSITIVE,
  [L12PathConfidenceFactorGroup.SCORE_ATTRIBUTION_SUPPORT]: L12PathConfidenceFactorDirection.POSITIVE,
  [L12PathConfidenceFactorGroup.MISSING_VISIBILITY]: L12PathConfidenceFactorDirection.INVERTED,
  [L12PathConfidenceFactorGroup.DRIFT_PRESSURE]: L12PathConfidenceFactorDirection.INVERTED,
  [L12PathConfidenceFactorGroup.TRIGGER_COMPLETENESS]: L12PathConfidenceFactorDirection.POSITIVE,
  [L12PathConfidenceFactorGroup.INVALIDATION_PRESSURE]: L12PathConfidenceFactorDirection.INVERTED,
  [L12PathConfidenceFactorGroup.SCENARIO_SPREAD]: L12PathConfidenceFactorDirection.POSITIVE,
};

/**
 * Path confidence policy (§12.5.13). Frozen once registered.
 */
export interface L12PathConfidencePolicy {
  readonly policy_id: string;
  readonly policy_version: string;
  readonly weights: Readonly<Record<L12PathConfidenceFactorGroup, number>>;
  readonly directions: Readonly<Record<L12PathConfidenceFactorGroup, L12PathConfidenceFactorDirection>>;
  readonly weight_sum_tolerance: number;
}

export function l12PathConfidenceWeightSum(
  weights: Readonly<Record<L12PathConfidenceFactorGroup, number>>,
): number {
  let sum = 0;
  for (const f of ALL_L12_PATH_CONFIDENCE_FACTOR_GROUPS) sum += weights[f];
  return sum;
}

export function l12IsLegalPathConfidenceWeightSum(
  weights: Readonly<Record<L12PathConfidenceFactorGroup, number>>,
  tolerance = 1e-6,
): boolean {
  return Math.abs(l12PathConfidenceWeightSum(weights) - 1) <= tolerance;
}
