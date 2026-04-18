/**
 * L7.6 — Contradiction Penalty Policy
 *
 * §7.6.3.8 + §7.6.4.6 — A contradiction penalty is the *raw-score
 * penalty* applied when the contradiction bundle indicates that
 * support is challenged. It is SEPARATE from cap-chain law:
 *
 *   - the penalty reduces the raw score (§7.6.4.2)
 *   - the cap chain bounds the post-penalty score (§7.6.4.4)
 *
 * Both must remain visible in the confidence assessment so reviewers
 * can audit how reliance was reduced.
 *
 * Unlike caps, penalties may stack: each penalty class contributes a
 * bounded amount, and the engine takes the maximum of all applied
 * penalties (penalty-precedence law) so the chain remains explicit.
 */

import { L7ContradictionSeverity } from './contradiction-bundle';

export enum L7ContradictionPenaltyClass {
  MINOR_CONTRADICTION_PENALTY = 'MINOR_CONTRADICTION_PENALTY',
  MATERIAL_CONTRADICTION_PENALTY = 'MATERIAL_CONTRADICTION_PENALTY',
  SEVERE_CONTRADICTION_PENALTY = 'SEVERE_CONTRADICTION_PENALTY',
  BLOCKING_CONTRADICTION_PENALTY = 'BLOCKING_CONTRADICTION_PENALTY',
  REPEATED_CONTRADICTION_PENALTY = 'REPEATED_CONTRADICTION_PENALTY',
  UNRESOLVED_CONTRADICTION_PENALTY = 'UNRESOLVED_CONTRADICTION_PENALTY',
  CRITICAL_OVERHANG_PENALTY = 'CRITICAL_OVERHANG_PENALTY',
}

export const ALL_L7_CONTRADICTION_PENALTY_CLASSES: readonly L7ContradictionPenaltyClass[] =
  Object.values(L7ContradictionPenaltyClass);

/** Penalty magnitude (0..1). Applied as `raw -= w_G · max(applied)`. */
export const L7_CONTRADICTION_PENALTY_MAGNITUDE: Record<
  L7ContradictionPenaltyClass,
  number
> = {
  [L7ContradictionPenaltyClass.MINOR_CONTRADICTION_PENALTY]: 0.1,
  [L7ContradictionPenaltyClass.MATERIAL_CONTRADICTION_PENALTY]: 0.3,
  [L7ContradictionPenaltyClass.SEVERE_CONTRADICTION_PENALTY]: 0.55,
  [L7ContradictionPenaltyClass.BLOCKING_CONTRADICTION_PENALTY]: 0.85,
  [L7ContradictionPenaltyClass.REPEATED_CONTRADICTION_PENALTY]: 0.4,
  [L7ContradictionPenaltyClass.UNRESOLVED_CONTRADICTION_PENALTY]: 0.45,
  [L7ContradictionPenaltyClass.CRITICAL_OVERHANG_PENALTY]: 0.7,
};

export interface L7ContradictionPenaltyEvaluation {
  readonly penaltyClass: L7ContradictionPenaltyClass;
  readonly applied: boolean;
  /** Magnitude on 0..1 scale. */
  readonly magnitude: number;
  readonly reason: string;
}

/** Returns the maximum applied penalty magnitude (penalty-precedence). */
export function resolvePenaltyMagnitude(
  evaluations: readonly L7ContradictionPenaltyEvaluation[],
): number {
  let max = 0;
  for (const e of evaluations) {
    if (e.applied && e.magnitude > max) max = e.magnitude;
  }
  return max;
}

/** Map runtime contradiction severity to the canonical penalty class. */
export function penaltyClassForSeverity(
  severity: L7ContradictionSeverity,
): L7ContradictionPenaltyClass {
  switch (severity) {
    case L7ContradictionSeverity.BLOCKING:
      return L7ContradictionPenaltyClass.BLOCKING_CONTRADICTION_PENALTY;
    case L7ContradictionSeverity.SEVERE:
      return L7ContradictionPenaltyClass.SEVERE_CONTRADICTION_PENALTY;
    case L7ContradictionSeverity.MATERIAL:
      return L7ContradictionPenaltyClass.MATERIAL_CONTRADICTION_PENALTY;
    case L7ContradictionSeverity.MINOR:
      return L7ContradictionPenaltyClass.MINOR_CONTRADICTION_PENALTY;
    case L7ContradictionSeverity.INFO:
    default:
      return L7ContradictionPenaltyClass.MINOR_CONTRADICTION_PENALTY;
  }
}

export function isL7ContradictionPenaltyClass(
  raw: string,
): raw is L7ContradictionPenaltyClass {
  return (ALL_L7_CONTRADICTION_PENALTY_CLASSES as readonly string[]).includes(raw);
}
