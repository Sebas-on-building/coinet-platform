/**
 * L10.4 — ShiftConditionEngine
 *
 * §10.4.14 — Derives the conditions under which the current primary
 * would (a) collapse, (b) be reinforced, (c) be replaced by the
 * secondary. Required whenever spread is narrow; optional otherwise.
 * Never invented: every condition must tie back to a candidate's
 * pattern surface.
 */

import {
  L10RuntimeViolation,
  L10RuntimeViolationCode,
} from '../validation/l10-runtime-violation-codes';
import { L10EngineResult, fail, ok } from './engine-types';
import type {
  L10HypothesisCandidateInstance,
  L10HypothesisRankingOutput,
  L10HypothesisShiftConditionOutput,
  L10HypothesisSpreadOutput,
} from '../runtime/hypothesis-execution-context';

export interface L10ShiftConditionInput {
  readonly ranking: L10HypothesisRankingOutput;
  readonly spread: L10HypothesisSpreadOutput;
  readonly candidates_by_id: ReadonlyMap<string, L10HypothesisCandidateInstance>;
}

export function deriveShiftConditions(
  input: L10ShiftConditionInput,
): L10EngineResult<L10HypothesisShiftConditionOutput> {
  const violations: L10RuntimeViolation[] = [];
  const r = input.ranking;
  const v = (
    code: L10RuntimeViolationCode, detail: string,
  ): L10RuntimeViolation => ({
    code,
    source: 'ShiftConditionEngine',
    nodeId: null,
    hypothesis_run_id: null,
    hypothesis_subject_id: r.hypothesis_subject_id,
    hypothesis_candidate_id: null,
    detail,
    context: { ranking: r.ranking_id },
  });

  const primary = input.candidates_by_id.get(r.primary_hypothesis_ref);
  const secondary = r.secondary_hypothesis_ref
    ? input.candidates_by_id.get(r.secondary_hypothesis_ref)
    : null;

  if (!primary) {
    violations.push(v(
      L10RuntimeViolationCode.SHIFT_DETACHED_FROM_CANDIDATE,
      `primary candidate ${r.primary_hypothesis_ref} not in candidate set`,
    ));
    return fail(violations);
  }

  const promotion: string[] = secondary
    ? [
        `SEC_SUPPORT_UP:${secondary.hypothesis_candidate_id}`,
        ...secondary.required_support_pattern_refs
          .map(p => `SEC_CONFIRM:${p}`),
      ]
    : [];
  const reinforcement: string[] = primary.required_confirmation_pattern_refs
    .map(p => `PRI_CONFIRM:${p}`);
  const collapse: string[] = primary.invalidation_pattern_refs
    .map(p => `PRI_INVALIDATE:${p}`);
  const narrowing: string[] = input.spread.narrow_spread_flag
    ? promotion.slice(0, Math.min(promotion.length, 3))
    : [];

  promotion.sort(); reinforcement.sort(); collapse.sort(); narrowing.sort();

  if (input.spread.narrow_spread_flag && promotion.length === 0) {
    violations.push(v(
      L10RuntimeViolationCode.SHIFT_MISSING_PROMOTION,
      'narrow spread but no promotion conditions derivable',
    ));
  }
  if (collapse.length === 0) {
    violations.push(v(
      L10RuntimeViolationCode.SHIFT_MISSING_COLLAPSE,
      'primary has no derivable collapse conditions',
    ));
  }

  if (violations.length > 0) return fail(violations);

  const out: L10HypothesisShiftConditionOutput = {
    shift_condition_set_id: `lhshi:${r.hypothesis_subject_id}`,
    hypothesis_subject_id: r.hypothesis_subject_id,
    ranking_ref: r.ranking_id,
    current_primary_ref: r.primary_hypothesis_ref,
    current_secondary_ref: r.secondary_hypothesis_ref,
    promotion_conditions_for_secondary: promotion,
    reinforcement_conditions_for_primary: reinforcement,
    collapse_conditions_for_primary: collapse,
    spread_narrowing_conditions: narrowing,
  };
  return ok(out);
}
