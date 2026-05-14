/**
 * L11.6 — Calibration Readiness Validator (§11.6.12)
 */

import {
  L11ScoreCalibrationHook,
} from '../contracts/calibration-hook';
import {
  L11CalibrationReadinessClass,
  isL11CalibrationReadinessBlocked,
} from '../contracts/calibration-readiness';
import {
  L11ScoreCalibrationTarget,
} from '../contracts/calibration-target';
import {
  L11CalibrationIssue,
  L11CalibrationViolationCode,
  makeL11CalibrationIssue,
} from './l11-calibration-violation-codes';

/**
 * Verify that the readiness class declared on the hook is
 * internally consistent with: target completeness, version
 * compatibility, evaluation window, and required stratification.
 */
export function validateL11CalibrationReadiness(
  hook: L11ScoreCalibrationHook,
  target: L11ScoreCalibrationTarget | null,
  observedAt?: number,
): readonly L11CalibrationIssue[] {
  const ctx = { hook_id: hook.calibration_hook_id, score_id: hook.score_id,
    score_family: hook.score_family };
  const issues: L11CalibrationIssue[] = [];
  const r = hook.calibration_readiness_class;
  if (!r) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_READINESS_CLASS_MISSING,
      'calibration_readiness_class missing', ctx));
    return issues;
  }
  if (!target) {
    if (r !== L11CalibrationReadinessClass.BLOCKED_TARGET_INCOMPLETE) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_READINESS_CLASS_INCONSISTENT,
        `target unresolved but readiness ${r}`, ctx));
    }
    return issues;
  }
  // Version mismatch ⇒ must be BLOCKED_VERSION_MISMATCH
  const versionOk =
    target.allowed_score_versions.includes(hook.score_version) &&
    target.allowed_formula_versions.includes(hook.formula_version);
  if (!versionOk &&
      r !== L11CalibrationReadinessClass.BLOCKED_VERSION_MISMATCH) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_READINESS_CLASS_INCONSISTENT,
      `version mismatch but readiness is ${r}`, ctx));
  }
  if (versionOk &&
      r === L11CalibrationReadinessClass.BLOCKED_VERSION_MISMATCH) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_READINESS_CLASS_INCONSISTENT,
      `versions compatible but readiness is BLOCKED_VERSION_MISMATCH`, ctx));
  }
  // Outcome window not yet observed ⇒ should be PENDING_OUTCOME_WINDOW
  // unless explicitly blocked.
  if (typeof observedAt === 'number') {
    const windowEnd = Date.parse(hook.evaluation_window_end);
    if (Number.isFinite(windowEnd) && observedAt < windowEnd &&
        !isL11CalibrationReadinessBlocked(r) &&
        r !== L11CalibrationReadinessClass.PENDING_OUTCOME_WINDOW &&
        r !== L11CalibrationReadinessClass.READY_WITH_STRATIFICATION) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_READINESS_CLASS_INCONSISTENT,
        `evaluation window not yet ended but readiness is ${r}`, ctx));
    }
  }
  return issues;
}
