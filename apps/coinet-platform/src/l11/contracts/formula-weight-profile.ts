/**
 * L11.3 — Formula Weight Profile (§11.3.5)
 *
 * Declares the weight profile a formula uses. Production v1
 * formulas use POSITIVE_COMPONENTS_SUM_TO_ONE (§11.3.5.3) so that
 * direction is unambiguous and penalties are explicit deductions.
 */

import { L11ScoreFamily } from './score-family';

export enum L11WeightSumPolicy {
  POSITIVE_COMPONENTS_SUM_TO_ONE = 'POSITIVE_COMPONENTS_SUM_TO_ONE',
  ABSOLUTE_COMPONENTS_SUM_TO_ONE = 'ABSOLUTE_COMPONENTS_SUM_TO_ONE',
  POSITIVE_MINUS_PENALTY = 'POSITIVE_MINUS_PENALTY',
  FAMILY_DEFINED = 'FAMILY_DEFINED',
}

export const ALL_L11_WEIGHT_SUM_POLICIES: readonly L11WeightSumPolicy[] =
  Object.values(L11WeightSumPolicy);

export interface L11FormulaWeightProfile {
  readonly weight_profile_id: string;
  readonly score_family: L11ScoreFamily;
  readonly formula_version: string;

  /** Component-id → weight. Penalties may carry their own non-positive
   * contribution as separate L11FormulaPenaltyRule entries. */
  readonly component_weights: Readonly<Record<string, number>>;

  readonly positive_weight_sum: number;
  readonly penalty_weight_sum: number;
  readonly total_absolute_weight_sum: number;

  readonly weight_sum_policy: L11WeightSumPolicy;
  readonly policy_version: string;
}

const WEIGHT_TOLERANCE = 1e-6;

/**
 * §11.3.5.3 — For POSITIVE_COMPONENTS_SUM_TO_ONE, positive weights
 * must sum to ~1.00 (within float tolerance).
 */
export function isL11WeightSumLegal(p: L11FormulaWeightProfile): {
  ok: boolean; reason: string;
} {
  switch (p.weight_sum_policy) {
    case L11WeightSumPolicy.POSITIVE_COMPONENTS_SUM_TO_ONE:
      if (Math.abs(p.positive_weight_sum - 1) > WEIGHT_TOLERANCE) {
        return {
          ok: false,
          reason: `positive weights must sum to 1, got ${p.positive_weight_sum}`,
        };
      }
      return { ok: true, reason: 'ok' };
    case L11WeightSumPolicy.ABSOLUTE_COMPONENTS_SUM_TO_ONE:
      if (Math.abs(p.total_absolute_weight_sum - 1) > WEIGHT_TOLERANCE) {
        return {
          ok: false,
          reason: `absolute weights must sum to 1, got ${p.total_absolute_weight_sum}`,
        };
      }
      return { ok: true, reason: 'ok' };
    case L11WeightSumPolicy.POSITIVE_MINUS_PENALTY: {
      if (Math.abs(p.positive_weight_sum - 1) > WEIGHT_TOLERANCE) {
        return {
          ok: false,
          reason: `positive component sum must equal 1 under positive-minus-penalty, got ${p.positive_weight_sum}`,
        };
      }
      if (p.penalty_weight_sum > 0) {
        return {
          ok: false,
          reason: `penalty component sum must be ≤0 under positive-minus-penalty, got ${p.penalty_weight_sum}`,
        };
      }
      return { ok: true, reason: 'ok' };
    }
    case L11WeightSumPolicy.FAMILY_DEFINED:
      return { ok: true, reason: 'family-defined' };
    default:
      return { ok: false, reason: 'unknown weight sum policy' };
  }
}

export function computeL11WeightSums(
  weights: Readonly<Record<string, number>>,
): { positive: number; penalty: number; absolute: number } {
  let positive = 0;
  let penalty = 0;
  let absolute = 0;
  for (const w of Object.values(weights)) {
    if (!Number.isFinite(w)) continue;
    absolute += Math.abs(w);
    if (w >= 0) positive += w;
    else penalty += w;
  }
  return { positive, penalty, absolute };
}
