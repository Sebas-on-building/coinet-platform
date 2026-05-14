/**
 * L11.6 — Calibration Target Validator (§11.6.4 / §11.6.16)
 *
 * Master validator that composes all sub-validators and checks
 * structural completeness, family/version legality, replay
 * determinism, and causality boundary.
 */

import {
  L11ScoreCalibrationTarget,
  isL11CalibrationTargetStructurallyValid,
  extractL11CalibrationTargetReplayMaterial,
  canonicalCalibrationTargetReplayHash,
} from '../contracts/calibration-target';
import {
  isL11ProductionScoreFamily,
  isL11ReservedScoreFamily,
} from '../contracts/score-family';
import {
  isL11HorizonAllowedForFamily,
} from '../contracts/calibration-horizon';
import {
  L11CalibrationIssue,
  L11CalibrationViolationCode,
  makeL11CalibrationIssue,
} from './l11-calibration-violation-codes';
import { validateL11OutcomeMetricForFamily } from './outcome-metric.validator';
import {
  validateL11ExpectedDirection,
  validateL11CalibrationDescription,
} from './expected-direction.validator';
import { validateL11CalibrationCohort } from './calibration-cohort.validator';
import { validateL11CalibrationExclusionRuleSet } from './calibration-exclusion.validator';

export function validateL11CalibrationTarget(
  t: L11ScoreCalibrationTarget,
): readonly L11CalibrationIssue[] {
  const ctx = { target_id: t.calibration_target_id };
  const issues: L11CalibrationIssue[] = [];

  if (!t.calibration_target_id) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_CALIBRATION_TARGET_ID_MISSING,
      'calibration_target_id missing'));
  }
  if (!t.target_version) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_TARGET_VERSION_MISSING,
      'target_version missing', ctx));
  }
  if (!t.policy_version) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_TARGET_POLICY_VERSION_MISSING,
      'policy_version missing', ctx));
  }
  if (!t.lineage_refs || t.lineage_refs.length === 0) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_TARGET_LINEAGE_MISSING,
      'lineage_refs missing or empty', ctx));
  }
  if (!Number.isFinite(t.minimum_sample_size) || t.minimum_sample_size <= 0) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_MINIMUM_SAMPLE_SIZE_MISSING,
      'minimum_sample_size missing or non-positive', ctx));
  }

  if (isL11ReservedScoreFamily(t.score_family)) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_RESERVED_FAMILY_HAS_TARGET,
      `reserved family ${t.score_family} cannot have a calibration target`,
      { ...ctx, score_family: t.score_family }));
  } else if (!isL11ProductionScoreFamily(t.score_family)) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_RESERVED_FAMILY_HAS_TARGET,
      `unknown family ${t.score_family}`,
      { ...ctx, score_family: t.score_family }));
  }

  if (!t.horizon) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HORIZON_MISSING,
      'horizon missing', ctx));
  } else if (!isL11HorizonAllowedForFamily(t.score_family, t.horizon)) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_HORIZON_UNSUPPORTED_FOR_FAMILY,
      `horizon ${t.horizon} not allowed for family ${t.score_family}`,
      { ...ctx, score_family: t.score_family }));
  }

  if (!t.evaluation_window ||
      !Number.isFinite(t.evaluation_window.window_offset_ms) ||
      t.evaluation_window.window_offset_ms < 0) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_EVALUATION_WINDOW_INVALID,
      'evaluation_window invalid', ctx));
  }

  issues.push(...validateL11OutcomeMetricForFamily(
    t.outcome_metric, t.score_family, t.horizon, ctx));
  issues.push(...validateL11ExpectedDirection(
    t.score_family, t.outcome_metric, t.expected_direction, ctx));
  issues.push(...validateL11CalibrationDescription(t.description, ctx));
  issues.push(...validateL11CalibrationCohort(
    t.cohort_definition, t.score_family, ctx));
  issues.push(...validateL11CalibrationExclusionRuleSet(t.exclusion_rules, ctx));

  // Structural sanity from contract helper
  const sv = isL11CalibrationTargetStructurallyValid(t);
  if (!sv.ok) {
    if (sv.reason.includes('replay_hash missing')) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_TARGET_REPLAY_HASH_MISSING,
        sv.reason, ctx));
    } else if (sv.reason.includes('exclusion_rules')) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_EXCLUSION_RULES_MISSING,
        sv.reason, ctx));
    } else {
      // Already covered above; fall back to a generic error on the
      // most relevant code.
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_CALIBRATION_TARGET_ID_MISSING,
        sv.reason, ctx));
    }
  }

  if (t.replay_hash) {
    const expected = canonicalCalibrationTargetReplayHash(
      extractL11CalibrationTargetReplayMaterial(t));
    if (expected !== t.replay_hash) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_TARGET_REPLAY_HASH_MISMATCH,
        `replay hash drift: expected ${expected}, got ${t.replay_hash}`,
        ctx));
    }
  }
  return issues;
}
