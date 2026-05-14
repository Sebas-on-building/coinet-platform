/**
 * L11.3 — Formula Missing-Data Rules (§11.3.7)
 */

import { L11ScoreFamily } from './score-family';
import { L11FormulaInputSurface } from './formula-input-surface';
import { L11MissingDataBehaviorClass } from './score-component';

/**
 * §11.3.7.2 — Each formula must declare missing-data rules for every
 * input class: required, optional, stale, degraded, restricted,
 * evidence-only, conflicting.
 */
export enum L11InputConditionClass {
  REQUIRED_MISSING = 'REQUIRED_MISSING',
  OPTIONAL_MISSING = 'OPTIONAL_MISSING',
  STALE = 'STALE',
  DEGRADED = 'DEGRADED',
  RESTRICTED = 'RESTRICTED',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
  CONFLICTING = 'CONFLICTING',
}

export const ALL_L11_INPUT_CONDITION_CLASSES: readonly L11InputConditionClass[] =
  Object.values(L11InputConditionClass);

export interface L11FormulaMissingDataRule {
  readonly missing_data_rule_id: string;
  readonly score_family: L11ScoreFamily;

  readonly applies_to_input?: L11FormulaInputSurface;
  readonly input_condition: L11InputConditionClass;
  readonly behavior: L11MissingDataBehaviorClass;

  readonly reason_code: string;
  readonly attribution_required: boolean;
  readonly policy_version: string;
}

/**
 * §11.3.7.3 — Disallowed missing-data behaviors per input condition.
 *  - REQUIRED_MISSING may not be OMIT_OPTIONAL_COMPONENT or LOWER_CONFIDENCE.
 *  - STALE/DEGRADED required inputs may not be OMIT or BLOCK_SCORE silently
 *    (must REQUIRE_DISCLOSURE or PENALIZE / CAP).
 *  - EVIDENCE_ONLY may not be treated as a decisive component (BLOCK_SCORE).
 *  - RESTRICTED may not be promoted beyond declared rights (so cannot
 *    be OMIT_OPTIONAL_COMPONENT or BLOCK_SCORE either).
 */
const ILLEGAL_BEHAVIOR_BY_CONDITION:
  Readonly<Record<L11InputConditionClass, readonly L11MissingDataBehaviorClass[]>> = {
  [L11InputConditionClass.REQUIRED_MISSING]: [
    L11MissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
    L11MissingDataBehaviorClass.LOWER_CONFIDENCE,
  ],
  [L11InputConditionClass.OPTIONAL_MISSING]: [],
  [L11InputConditionClass.STALE]: [
    L11MissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
  ],
  [L11InputConditionClass.DEGRADED]: [
    L11MissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
  ],
  [L11InputConditionClass.RESTRICTED]: [
    L11MissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
    L11MissingDataBehaviorClass.BLOCK_SCORE,
  ],
  [L11InputConditionClass.EVIDENCE_ONLY]: [
    L11MissingDataBehaviorClass.BLOCK_SCORE,
    L11MissingDataBehaviorClass.PENALIZE_SCORE,
    L11MissingDataBehaviorClass.CAP_SCORE,
  ],
  [L11InputConditionClass.CONFLICTING]: [
    L11MissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
  ],
};

export function isL11MissingDataRuleLegal(r: L11FormulaMissingDataRule): {
  ok: boolean; reason: string;
} {
  if (!r.missing_data_rule_id) return { ok: false, reason: 'missing_data_rule_id missing' };
  if (!r.reason_code) return { ok: false, reason: 'reason_code missing' };
  const illegal = ILLEGAL_BEHAVIOR_BY_CONDITION[r.input_condition] ?? [];
  if (illegal.includes(r.behavior)) {
    return {
      ok: false,
      reason: `behavior ${r.behavior} is illegal for input_condition ${r.input_condition}`,
    };
  }
  return { ok: true, reason: 'ok' };
}
