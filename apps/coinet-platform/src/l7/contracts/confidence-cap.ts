/**
 * L7.6 — Confidence Cap-Chain Policy
 *
 * §7.6.4.4–§7.6.4.7 — A cap is a *truth-safety ceiling* applied AFTER
 * raw-score derivation. The cap chain is:
 *
 *   1. evaluated independently of factor weights
 *   2. each cap declares a maximum legal score on the 0..100 scale
 *   3. when multiple caps apply, the MOST truth-restrictive (lowest)
 *      ceiling wins (cap-precedence law, §7.6.4.7)
 *   4. cap chain is recorded as ordered evidence in the confidence
 *      assessment so consumers can audit it
 *
 * Caps are SEPARATE from contradiction penalties (§7.6.4.6): the penalty
 * shapes the raw score; the cap bounds the final score.
 */

export enum L7ConfidenceCapClass {
  STALE_SUPPORT_CAP = 'STALE_SUPPORT_CAP',
  INCOMPLETE_SUPPORT_CAP = 'INCOMPLETE_SUPPORT_CAP',
  CRITICAL_CONTRADICTION_CAP = 'CRITICAL_CONTRADICTION_CAP',
  HIGH_AMBIGUITY_CAP = 'HIGH_AMBIGUITY_CAP',
  WEAK_HISTORICAL_RELIABILITY_CAP = 'WEAK_HISTORICAL_RELIABILITY_CAP',
  UNRESOLVED_RISK_OVERHANG_CAP = 'UNRESOLVED_RISK_OVERHANG_CAP',
  DEGRADED_SOURCE_CAP = 'DEGRADED_SOURCE_CAP',
  INSUFFICIENT_CHALLENGE_COVERAGE_CAP = 'INSUFFICIENT_CHALLENGE_COVERAGE_CAP',
}

export const ALL_L7_CONFIDENCE_CAP_CLASSES: readonly L7ConfidenceCapClass[] =
  Object.values(L7ConfidenceCapClass);

/**
 * §7.6.4.4 — Maximum legal score (0..100) when each cap is *applied*.
 * These values represent the highest value the capped score may take.
 */
export const L7_CONFIDENCE_CAP_CEILINGS: Record<L7ConfidenceCapClass, number> = {
  [L7ConfidenceCapClass.STALE_SUPPORT_CAP]: 55,
  [L7ConfidenceCapClass.INCOMPLETE_SUPPORT_CAP]: 50,
  [L7ConfidenceCapClass.CRITICAL_CONTRADICTION_CAP]: 35,
  [L7ConfidenceCapClass.HIGH_AMBIGUITY_CAP]: 50,
  [L7ConfidenceCapClass.WEAK_HISTORICAL_RELIABILITY_CAP]: 70,
  [L7ConfidenceCapClass.UNRESOLVED_RISK_OVERHANG_CAP]: 35,
  [L7ConfidenceCapClass.DEGRADED_SOURCE_CAP]: 40,
  [L7ConfidenceCapClass.INSUFFICIENT_CHALLENGE_COVERAGE_CAP]: 60,
};

export interface L7ConfidenceCapDescriptor {
  readonly capClass: L7ConfidenceCapClass;
  readonly description: string;
  /** Maximum 0..100 score allowed when this cap is applied. */
  readonly ceilingScore100: number;
  /**
   * Whether the cap is mandatory under the named state condition.
   * Used by the cap-chain validator to enforce
   * `CAP_REQUIRED_BUT_NOT_APPLIED`.
   */
  readonly mandatoryWhen: readonly L7ConfidenceCapTrigger[];
  /** Audit reason category for downstream consumers. */
  readonly reasonCategory:
    | 'TEMPORAL'
    | 'COVERAGE'
    | 'CONTRADICTION'
    | 'AMBIGUITY'
    | 'RELIABILITY'
    | 'OVERHANG'
    | 'SOURCE_QUALITY';
}

/** §7.6.4.5 — declarative trigger set. Engines/validators may extend with additional conditions. */
export type L7ConfidenceCapTrigger =
  | 'STALENESS_MATERIAL'
  | 'STALENESS_BLOCKING'
  | 'INCOMPLETENESS_MATERIAL'
  | 'INCOMPLETENESS_BLOCKING'
  | 'CRITICAL_CONTRADICTION_PRESENT'
  | 'BLOCKING_CONTRADICTION_PRESENT'
  | 'AMBIGUITY_HIGH'
  | 'HISTORICAL_RELIABILITY_WEAK'
  | 'UNRESOLVED_RISK_OVERHANG'
  | 'DEGRADED_SOURCE'
  | 'CHALLENGE_COVERAGE_INSUFFICIENT';

export const L7_CONFIDENCE_CAP_DESCRIPTORS: readonly L7ConfidenceCapDescriptor[] = [
  {
    capClass: L7ConfidenceCapClass.STALE_SUPPORT_CAP,
    description: 'Material staleness in support surfaces caps reliance on the result',
    ceilingScore100: L7_CONFIDENCE_CAP_CEILINGS[L7ConfidenceCapClass.STALE_SUPPORT_CAP],
    mandatoryWhen: ['STALENESS_MATERIAL', 'STALENESS_BLOCKING'],
    reasonCategory: 'TEMPORAL',
  },
  {
    capClass: L7ConfidenceCapClass.INCOMPLETE_SUPPORT_CAP,
    description: 'Required support is missing or partial',
    ceilingScore100: L7_CONFIDENCE_CAP_CEILINGS[L7ConfidenceCapClass.INCOMPLETE_SUPPORT_CAP],
    mandatoryWhen: ['INCOMPLETENESS_MATERIAL', 'INCOMPLETENESS_BLOCKING'],
    reasonCategory: 'COVERAGE',
  },
  {
    capClass: L7ConfidenceCapClass.CRITICAL_CONTRADICTION_CAP,
    description: 'Critical contradiction outstanding (SEVERE or BLOCKING bundle severity)',
    ceilingScore100:
      L7_CONFIDENCE_CAP_CEILINGS[L7ConfidenceCapClass.CRITICAL_CONTRADICTION_CAP],
    mandatoryWhen: ['CRITICAL_CONTRADICTION_PRESENT', 'BLOCKING_CONTRADICTION_PRESENT'],
    reasonCategory: 'CONTRADICTION',
  },
  {
    capClass: L7ConfidenceCapClass.HIGH_AMBIGUITY_CAP,
    description: 'Ambiguity remains high after evaluation',
    ceilingScore100: L7_CONFIDENCE_CAP_CEILINGS[L7ConfidenceCapClass.HIGH_AMBIGUITY_CAP],
    mandatoryWhen: ['AMBIGUITY_HIGH'],
    reasonCategory: 'AMBIGUITY',
  },
  {
    capClass: L7ConfidenceCapClass.WEAK_HISTORICAL_RELIABILITY_CAP,
    description: 'Historical reliability of this validation pattern is weak',
    ceilingScore100:
      L7_CONFIDENCE_CAP_CEILINGS[L7ConfidenceCapClass.WEAK_HISTORICAL_RELIABILITY_CAP],
    mandatoryWhen: ['HISTORICAL_RELIABILITY_WEAK'],
    reasonCategory: 'RELIABILITY',
  },
  {
    capClass: L7ConfidenceCapClass.UNRESOLVED_RISK_OVERHANG_CAP,
    description: 'Material risk-overhang contradiction remains unresolved',
    ceilingScore100:
      L7_CONFIDENCE_CAP_CEILINGS[L7ConfidenceCapClass.UNRESOLVED_RISK_OVERHANG_CAP],
    mandatoryWhen: ['UNRESOLVED_RISK_OVERHANG'],
    reasonCategory: 'OVERHANG',
  },
  {
    capClass: L7ConfidenceCapClass.DEGRADED_SOURCE_CAP,
    description: 'Required source is degraded or impaired',
    ceilingScore100: L7_CONFIDENCE_CAP_CEILINGS[L7ConfidenceCapClass.DEGRADED_SOURCE_CAP],
    mandatoryWhen: ['DEGRADED_SOURCE'],
    reasonCategory: 'SOURCE_QUALITY',
  },
  {
    capClass: L7ConfidenceCapClass.INSUFFICIENT_CHALLENGE_COVERAGE_CAP,
    description: 'Required challenge surfaces were not legally checked',
    ceilingScore100:
      L7_CONFIDENCE_CAP_CEILINGS[L7ConfidenceCapClass.INSUFFICIENT_CHALLENGE_COVERAGE_CAP],
    mandatoryWhen: ['CHALLENGE_COVERAGE_INSUFFICIENT'],
    reasonCategory: 'COVERAGE',
  },
];

/** A single cap evaluation in the cap chain. */
export interface L7ConfidenceCapEvaluation {
  readonly capClass: L7ConfidenceCapClass;
  /** Whether the trigger matched and the cap is applied. */
  readonly applied: boolean;
  /** Maximum legal score (0..100) under this cap. */
  readonly ceilingScore100: number;
  /** Why the cap fired or did not fire. */
  readonly reason: string;
}

/**
 * §7.6.4.7 — cap-precedence resolution: with a list of evaluated caps,
 * return the lowest applied ceiling. Returns `null` if no cap applied.
 */
export function resolveCapCeiling(
  evaluations: readonly L7ConfidenceCapEvaluation[],
): number | null {
  let lowest: number | null = null;
  for (const e of evaluations) {
    if (!e.applied) continue;
    if (lowest === null || e.ceilingScore100 < lowest) lowest = e.ceilingScore100;
  }
  return lowest;
}

export function isL7ConfidenceCapClass(raw: string): raw is L7ConfidenceCapClass {
  return (ALL_L7_CONFIDENCE_CAP_CLASSES as readonly string[]).includes(raw);
}

export function getL7ConfidenceCapDescriptor(
  capClass: L7ConfidenceCapClass,
): L7ConfidenceCapDescriptor | undefined {
  return L7_CONFIDENCE_CAP_DESCRIPTORS.find(d => d.capClass === capClass);
}
