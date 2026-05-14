/**
 * L11.3 — Formula Evaluation Result Validator (§11.3.8)
 */

import {
  L11FormulaEvaluationResult,
  L11FormulaReadinessClass,
  canonicalFormulaEvaluationReplayHash,
} from '../contracts/formula-evaluation-result';
import { L11ScoreFormulaDefinition } from '../contracts/score-formula';
import {
  L11ScoreFormulaIssue,
  L11ScoreFormulaViolationCode,
  makeL11ScoreFormulaIssue,
} from './l11-score-formula-violation-codes';

export interface L11FormulaEvaluationValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreFormulaIssue[];
}

const RAW_SCORE_TOLERANCE = 1e-6;

export function validateL11FormulaEvaluationResult(
  e: L11FormulaEvaluationResult,
  formula: L11ScoreFormulaDefinition,
): L11FormulaEvaluationValidationResult {
  const issues: L11ScoreFormulaIssue[] = [];

  if (e.formula_id !== formula.formula_id) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_FORMULA_EVALUATION_FAMILY_MISMATCH,
      `evaluation formula_id ${e.formula_id} != formula ${formula.formula_id}`,
      { formula_id: formula.formula_id },
    ));
  }
  if (e.score_family !== formula.score_family) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_FORMULA_EVALUATION_FAMILY_MISMATCH,
      `evaluation score_family ${e.score_family} != formula ${formula.score_family}`,
      { formula_id: formula.formula_id },
    ));
  }
  if (e.formula_version !== formula.formula_version) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_FORMULA_EVALUATION_FAMILY_MISMATCH,
      `evaluation formula_version ${e.formula_version} != formula ${formula.formula_version}`,
      { formula_id: formula.formula_id },
    ));
  }

  // Raw score bounds
  if (!Number.isFinite(e.raw_score)) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_RAW_SCORE_NOT_FINITE,
      `raw_score not finite: ${e.raw_score}`,
      { formula_id: formula.formula_id },
    ));
  } else if (e.raw_score < 0 - RAW_SCORE_TOLERANCE ||
             e.raw_score > 100 + RAW_SCORE_TOLERANCE) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_RAW_SCORE_OUT_OF_RANGE,
      `raw_score ${e.raw_score} out of [0,100]`,
      { formula_id: formula.formula_id },
    ));
  }

  // Component results — required components must be present unless omitted
  const componentDefs = new Map(
    formula.component_definitions.map(c => [c.component_id, c]),
  );
  const componentResultIds = new Set(e.component_results.map(c => c.component_id));
  for (const c of formula.component_definitions) {
    if (c.required_for_formula && !componentResultIds.has(c.component_id)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_REQUIRED_COMPONENT_RESULT_MISSING,
        `required component_result ${c.component_id} missing`,
        { formula_id: formula.formula_id, component_id: c.component_id },
      ));
    }
  }
  for (const cr of e.component_results) {
    const def = componentDefs.get(cr.component_id);
    if (!def) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_COMPONENT_MISSING,
        `evaluation references unknown component_id ${cr.component_id}`,
        { formula_id: formula.formula_id, component_id: cr.component_id },
      ));
      continue;
    }
    if (!cr.omitted) {
      if (!Number.isFinite(cr.value)) {
        issues.push(makeL11ScoreFormulaIssue(
          L11ScoreFormulaViolationCode.L11F_COMPONENT_RESULT_OUT_OF_BOUNDS,
          `component value not finite for ${cr.component_id}`,
          { formula_id: formula.formula_id, component_id: cr.component_id },
        ));
      } else if (cr.value < def.min_value - RAW_SCORE_TOLERANCE ||
                 cr.value > def.max_value + RAW_SCORE_TOLERANCE) {
        issues.push(makeL11ScoreFormulaIssue(
          L11ScoreFormulaViolationCode.L11F_COMPONENT_RESULT_OUT_OF_BOUNDS,
          `component value ${cr.value} for ${cr.component_id} out of [${def.min_value},${def.max_value}]`,
          { formula_id: formula.formula_id, component_id: cr.component_id },
        ));
      }
    }
  }

  // Applied penalties / caps / modifiers must reference declared rules
  const declaredPenaltyIds = new Set(formula.penalty_rules.map(p => p.penalty_rule_id));
  for (const ap of e.applied_penalties) {
    if (!declaredPenaltyIds.has(ap.penalty_rule_id)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_PENALTY_APPLIED_NOT_DECLARED,
        `applied penalty ${ap.penalty_rule_id} not declared`,
        { formula_id: formula.formula_id },
      ));
    }
  }
  const declaredCapIds = new Set(formula.cap_rules.map(c => c.cap_rule_id));
  for (const ac of e.applied_caps) {
    if (!declaredCapIds.has(ac.cap_rule_id)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_CAP_APPLIED_NOT_DECLARED,
        `applied cap ${ac.cap_rule_id} not declared`,
        { formula_id: formula.formula_id },
      ));
    }
  }
  const declaredModIds = new Set(formula.modifier_rules.map(m => m.modifier_rule_id));
  for (const am of e.applied_modifiers) {
    if (!declaredModIds.has(am.modifier_rule_id)) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_MODIFIER_APPLIED_NOT_DECLARED,
        `applied modifier ${am.modifier_rule_id} not declared`,
        { formula_id: formula.formula_id },
      ));
    }
  }

  // Missing-data effect law: if any component_result is omitted or any
  // applied cap has reason "required_data_missing", missing_data_effects
  // must be non-empty.
  const anyOmitted = e.component_results.some(cr => cr.omitted);
  if (anyOmitted && e.missing_data_effects.length === 0) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_MISSING_DATA_EFFECT_ABSENT,
      'omitted component without missing_data_effects',
      { formula_id: formula.formula_id },
    ));
  }

  // Readiness consistency
  const ready = e.formula_readiness;
  if (!ready) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_FORMULA_READINESS_INCONSISTENT,
      'formula_readiness missing',
      { formula_id: formula.formula_id },
    ));
  } else if (ready === L11FormulaReadinessClass.FORMULA_READY &&
             (anyOmitted || e.missing_data_effects.length > 0 || e.applied_caps.length > 0)) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_FORMULA_READINESS_INCONSISTENT,
      'FORMULA_READY contradicted by omitted components, missing-data effects, or applied caps',
      { formula_id: formula.formula_id },
    ));
  }

  // Replay hash
  if (!e.replay_hash) {
    issues.push(makeL11ScoreFormulaIssue(
      L11ScoreFormulaViolationCode.L11F_REPLAY_HASH_MISSING,
      'evaluation replay_hash missing',
      { formula_id: formula.formula_id },
    ));
  } else {
    const expected = canonicalFormulaEvaluationReplayHash(e);
    if (expected !== e.replay_hash) {
      issues.push(makeL11ScoreFormulaIssue(
        L11ScoreFormulaViolationCode.L11F_REPLAY_HASH_MISMATCH,
        `evaluation replay_hash mismatch (expected ${expected}, got ${e.replay_hash})`,
        { formula_id: formula.formula_id },
      ));
    }
  }

  return { ok: issues.length === 0, issues };
}
