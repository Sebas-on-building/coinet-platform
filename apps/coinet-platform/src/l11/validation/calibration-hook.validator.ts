/**
 * L11.6 — Calibration Hook Validator (§11.6.5 / §11.6.16)
 */

import {
  L11ScoreCalibrationHook,
  extractL11CalibrationHookReplayMaterial,
  canonicalCalibrationHookReplayHash,
} from '../contracts/calibration-hook';
import {
  L11ScoreCalibrationTarget,
} from '../contracts/calibration-target';
import {
  isL11CalibrationReadinessReady,
} from '../contracts/calibration-readiness';
import {
  L11CalibrationIssue,
  L11CalibrationViolationCode,
  makeL11CalibrationIssue,
} from './l11-calibration-violation-codes';

export function validateL11CalibrationHook(
  h: L11ScoreCalibrationHook,
  resolvedTarget: L11ScoreCalibrationTarget | null,
): readonly L11CalibrationIssue[] {
  const ctx = { hook_id: h.calibration_hook_id, score_id: h.score_id,
    score_family: h.score_family };
  const issues: L11CalibrationIssue[] = [];

  if (!h.calibration_hook_id) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_ID_MISSING,
      'calibration_hook_id missing'));
  }
  if (!h.score_id) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_SCORE_REF_MISSING,
      'score_id missing', ctx));
  }
  if (!h.calibration_target_ref) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_TARGET_REF_MISSING,
      'calibration_target_ref missing', ctx));
  }
  if (!h.horizon) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_HORIZON_MISSING,
      'horizon missing', ctx));
  }
  if (!h.outcome_metric) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_OUTCOME_METRIC_MISSING,
      'outcome_metric missing', ctx));
  }
  if (!h.expected_direction) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_EXPECTED_DIRECTION_MISSING,
      'expected_direction missing', ctx));
  }
  if (!h.cohort_key) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_COHORT_KEY_MISSING,
      'cohort_key missing', ctx));
  }
  if (!h.cohort_definition_ref) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_COHORT_REF_MISSING,
      'cohort_definition_ref missing', ctx));
  }
  if (!h.evaluation_window_start || !h.evaluation_window_end) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_EVAL_WINDOW_MISSING,
      'evaluation_window missing', ctx));
  }
  if (!Array.isArray(h.lineage_refs) || h.lineage_refs.length === 0) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_LINEAGE_MISSING,
      'lineage_refs missing or empty', ctx));
  }
  if (!h.replay_hash) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_REPLAY_HASH_MISSING,
      'replay_hash missing', ctx));
  } else {
    const expected = canonicalCalibrationHookReplayHash(
      extractL11CalibrationHookReplayMaterial(h));
    if (expected !== h.replay_hash) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_HOOK_REPLAY_HASH_MISMATCH,
        `hook replay hash drift: expected ${expected}, got ${h.replay_hash}`,
        ctx));
    }
  }

  if (!resolvedTarget) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_TARGET_REF_UNRESOLVED,
      `calibration_target_ref ${h.calibration_target_ref} unresolved`,
      ctx));
    return issues;
  }
  if (resolvedTarget.score_family !== h.score_family) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_TARGET_FAMILY_MISMATCH,
      `target family ${resolvedTarget.score_family} != hook family ${h.score_family}`,
      ctx));
  }
  if (resolvedTarget.outcome_metric !== h.outcome_metric) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_TARGET_METRIC_MISMATCH,
      `target metric ${resolvedTarget.outcome_metric} != hook metric ${h.outcome_metric}`,
      ctx));
  }
  if (resolvedTarget.horizon !== h.horizon) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_TARGET_HORIZON_MISMATCH,
      `target horizon ${resolvedTarget.horizon} != hook horizon ${h.horizon}`, ctx));
  }
  if (resolvedTarget.expected_direction !== h.expected_direction) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_TARGET_DIRECTION_MISMATCH,
      `target direction ${resolvedTarget.expected_direction} != hook direction ${h.expected_direction}`, ctx));
  }
  if (resolvedTarget.cohort_definition.cohort_id !== h.cohort_definition_ref) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HOOK_TARGET_COHORT_MISMATCH,
      `target cohort ${resolvedTarget.cohort_definition.cohort_id} != hook cohort ${h.cohort_definition_ref}`, ctx));
  }
  if (!resolvedTarget.allowed_score_versions.includes(h.score_version)) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_SCORE_VERSION_MISMATCH,
      `score_version ${h.score_version} not in target.allowed_score_versions`, ctx));
  }
  if (!resolvedTarget.allowed_formula_versions.includes(h.formula_version)) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_FORMULA_VERSION_MISMATCH,
      `formula_version ${h.formula_version} not in target.allowed_formula_versions`, ctx));
  }

  if (!h.calibration_readiness_class) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_READINESS_CLASS_MISSING,
      'calibration_readiness_class missing', ctx));
  }
  void isL11CalibrationReadinessReady;
  return issues;
}
