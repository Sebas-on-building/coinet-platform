/**
 * L7.6 — Confidence Factor Model
 *
 * §7.6.3 — The seven governed factor groups whose weighted combination
 * yields the raw confidence score. Factors are policy-versioned and
 * registry-bound; ad-hoc factors are illegal in production.
 *
 * Raw score formula (§7.6.4.2):
 *
 *     raw = Σ (w_i · v_i)  for i in {A,B,C,D,E,F}  −  w_G · v_G
 *
 * where w_G is the contradiction-severity penalty weight applied
 * separately so the contradiction-penalty chain remains visible
 * (§7.6.4.6).
 *
 * Factor groups MAP onto the runtime `L7ConfidenceComponents` shape from
 * L7.2 so the L7.4 engine can emit policy-bound components without
 * inventing a parallel structure.
 */

import type { L7ConfidenceComponents } from './confidence-assessment';

export enum L7ConfidenceFactorGroup {
  SOURCE_TRUST = 'SOURCE_TRUST',
  FRESHNESS = 'FRESHNESS',
  FEATURE_COMPLETENESS = 'FEATURE_COMPLETENESS',
  CROSS_SOURCE_AGREEMENT = 'CROSS_SOURCE_AGREEMENT',
  REGIME_COMPATIBILITY = 'REGIME_COMPATIBILITY',
  HISTORICAL_RELIABILITY = 'HISTORICAL_RELIABILITY',
  CONTRADICTION_SEVERITY = 'CONTRADICTION_SEVERITY',
}

export const ALL_L7_CONFIDENCE_FACTOR_GROUPS: readonly L7ConfidenceFactorGroup[] =
  Object.values(L7ConfidenceFactorGroup);

/** §7.6.3.6 + §7.6.6 — these factor groups are CAPPED in influence. */
export const L7_BOUNDED_FACTOR_GROUPS: readonly L7ConfidenceFactorGroup[] = [
  L7ConfidenceFactorGroup.REGIME_COMPATIBILITY,
  L7ConfidenceFactorGroup.HISTORICAL_RELIABILITY,
];

/**
 * Per §7.6.6, regime compatibility may NEVER drive an outcome on its own.
 * Per §7.6.3.7, historical reliability may NEVER overpower contradiction.
 * These limits are the maximum legal weight (in raw-score weight units)
 * those factor groups may carry.
 */
export const L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT: Record<
  L7ConfidenceFactorGroup,
  number
> = {
  [L7ConfidenceFactorGroup.SOURCE_TRUST]: 0.4,
  [L7ConfidenceFactorGroup.FRESHNESS]: 0.4,
  [L7ConfidenceFactorGroup.FEATURE_COMPLETENESS]: 0.4,
  [L7ConfidenceFactorGroup.CROSS_SOURCE_AGREEMENT]: 0.4,
  [L7ConfidenceFactorGroup.REGIME_COMPATIBILITY]: 0.15,
  [L7ConfidenceFactorGroup.HISTORICAL_RELIABILITY]: 0.15,
  [L7ConfidenceFactorGroup.CONTRADICTION_SEVERITY]: 0.6,
};

export interface L7ConfidenceFactorDescriptor {
  readonly group: L7ConfidenceFactorGroup;
  readonly description: string;
  /** Range that valid factor values must inhabit. */
  readonly valueRange: { readonly min: number; readonly max: number };
  /** Whether this factor acts as a positive contribution (+) or penalty (−). */
  readonly polarity: 'POSITIVE' | 'PENALTY';
  /** §7.6.3.6/7 — bounded factors can never overpower contradiction law. */
  readonly bounded: boolean;
  /** Default weight if a policy version omits an explicit weight. */
  readonly defaultWeight: number;
  /** Maximum legal weight for this factor group, per policy law. */
  readonly maxLegalWeight: number;
  /** Component name in L7.2's `L7ConfidenceComponents` shape. */
  readonly componentKey: keyof L7ConfidenceComponents;
}

export const L7_CONFIDENCE_FACTOR_DESCRIPTORS: readonly L7ConfidenceFactorDescriptor[] = [
  {
    group: L7ConfidenceFactorGroup.SOURCE_TRUST,
    description:
      'How trustworthy the support surfaces are (L3 confidence rights, L6 primitive quality, source-authority class)',
    valueRange: { min: 0, max: 1 },
    polarity: 'POSITIVE',
    bounded: false,
    defaultWeight: 0.18,
    maxLegalWeight: L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[L7ConfidenceFactorGroup.SOURCE_TRUST],
    componentKey: 'source_trust_component',
  },
  {
    group: L7ConfidenceFactorGroup.FRESHNESS,
    description:
      'How temporally current support and challenge surfaces are versus subject freshness budget',
    valueRange: { min: 0, max: 1 },
    polarity: 'POSITIVE',
    bounded: false,
    defaultWeight: 0.16,
    maxLegalWeight: L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[L7ConfidenceFactorGroup.FRESHNESS],
    componentKey: 'freshness_component',
  },
  {
    group: L7ConfidenceFactorGroup.FEATURE_COMPLETENESS,
    description:
      'How complete the required support set is, including required-challenge coverage',
    valueRange: { min: 0, max: 1 },
    polarity: 'POSITIVE',
    bounded: false,
    defaultWeight: 0.16,
    maxLegalWeight:
      L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[L7ConfidenceFactorGroup.FEATURE_COMPLETENESS],
    componentKey: 'feature_completeness_component',
  },
  {
    group: L7ConfidenceFactorGroup.CROSS_SOURCE_AGREEMENT,
    description:
      'Breadth and alignment of confirmation across primitive families and domains',
    valueRange: { min: 0, max: 1 },
    polarity: 'POSITIVE',
    bounded: false,
    defaultWeight: 0.14,
    maxLegalWeight:
      L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[L7ConfidenceFactorGroup.CROSS_SOURCE_AGREEMENT],
    componentKey: 'cross_source_agreement_component',
  },
  {
    group: L7ConfidenceFactorGroup.REGIME_COMPATIBILITY,
    description:
      'LOCAL fit between claim and currently observable regime conditions; never authoritative final regime',
    valueRange: { min: 0, max: 1 },
    polarity: 'POSITIVE',
    bounded: true,
    defaultWeight: 0.08,
    maxLegalWeight:
      L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[L7ConfidenceFactorGroup.REGIME_COMPATIBILITY],
    componentKey: 'regime_compatibility_component',
  },
  {
    group: L7ConfidenceFactorGroup.HISTORICAL_RELIABILITY,
    description:
      'How historically reliable this validation/contradiction pattern has been; bounded',
    valueRange: { min: 0, max: 1 },
    polarity: 'POSITIVE',
    bounded: true,
    defaultWeight: 0.08,
    maxLegalWeight:
      L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[L7ConfidenceFactorGroup.HISTORICAL_RELIABILITY],
    componentKey: 'historical_reliability_component',
  },
  {
    group: L7ConfidenceFactorGroup.CONTRADICTION_SEVERITY,
    description:
      'Penalty derived from contradiction bundle severity / cluster count / unresolved posture',
    valueRange: { min: 0, max: 1 },
    polarity: 'PENALTY',
    bounded: false,
    defaultWeight: 0.4,
    maxLegalWeight:
      L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[L7ConfidenceFactorGroup.CONTRADICTION_SEVERITY],
    componentKey: 'contradiction_penalty_component',
  },
];

export type L7ConfidenceFactorWeights = Readonly<
  Record<L7ConfidenceFactorGroup, number>
>;

export const L7_DEFAULT_FACTOR_WEIGHTS: L7ConfidenceFactorWeights = {
  [L7ConfidenceFactorGroup.SOURCE_TRUST]: 0.18,
  [L7ConfidenceFactorGroup.FRESHNESS]: 0.16,
  [L7ConfidenceFactorGroup.FEATURE_COMPLETENESS]: 0.16,
  [L7ConfidenceFactorGroup.CROSS_SOURCE_AGREEMENT]: 0.14,
  [L7ConfidenceFactorGroup.REGIME_COMPATIBILITY]: 0.08,
  [L7ConfidenceFactorGroup.HISTORICAL_RELIABILITY]: 0.08,
  [L7ConfidenceFactorGroup.CONTRADICTION_SEVERITY]: 0.4,
};

export interface L7ConfidenceFactorValues
  extends Readonly<Record<L7ConfidenceFactorGroup, number>> {}

export function isL7ConfidenceFactorGroup(
  raw: string,
): raw is L7ConfidenceFactorGroup {
  return (ALL_L7_CONFIDENCE_FACTOR_GROUPS as readonly string[]).includes(raw);
}

export function getL7ConfidenceFactorDescriptor(
  group: L7ConfidenceFactorGroup,
): L7ConfidenceFactorDescriptor | undefined {
  return L7_CONFIDENCE_FACTOR_DESCRIPTORS.find(d => d.group === group);
}

/**
 * Convert L7.6 factor values into L7.2's runtime `L7ConfidenceComponents`.
 * Used by the L7.6 engine to emit a runtime-shaped confidence object
 * without bypassing L7.2's contract.
 */
export function factorValuesToRuntimeComponents(
  values: L7ConfidenceFactorValues,
): L7ConfidenceComponents {
  return {
    source_trust_component: values[L7ConfidenceFactorGroup.SOURCE_TRUST],
    freshness_component: values[L7ConfidenceFactorGroup.FRESHNESS],
    feature_completeness_component:
      values[L7ConfidenceFactorGroup.FEATURE_COMPLETENESS],
    cross_source_agreement_component:
      values[L7ConfidenceFactorGroup.CROSS_SOURCE_AGREEMENT],
    regime_compatibility_component:
      values[L7ConfidenceFactorGroup.REGIME_COMPATIBILITY],
    historical_reliability_component:
      values[L7ConfidenceFactorGroup.HISTORICAL_RELIABILITY],
    contradiction_penalty_component:
      values[L7ConfidenceFactorGroup.CONTRADICTION_SEVERITY],
  };
}
