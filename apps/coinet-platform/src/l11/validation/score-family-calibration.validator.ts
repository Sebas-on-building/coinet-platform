/**
 * L11.6 — Score-Family Calibration Validator (§11.6.13 / INV-11.6-A, B)
 *
 * Cross-validator that (a) ensures every production score family
 * has at least one calibration target registered and (b) ensures
 * every emitted production score carries at least one hook.
 */

import {
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
  isL11ReservedScoreFamily,
} from '../contracts/score-family';
import {
  L11ScoreCalibrationTarget,
} from '../contracts/calibration-target';
import {
  L11ScoreCalibrationHook,
} from '../contracts/calibration-hook';
import {
  L11ScoreOutput,
} from '../contracts/score-output';
import {
  L11CalibrationIssue,
  L11CalibrationViolationCode,
  makeL11CalibrationIssue,
} from './l11-calibration-violation-codes';

export function validateL11ScoreFamilyTargetCoverage(
  targets: readonly L11ScoreCalibrationTarget[],
): readonly L11CalibrationIssue[] {
  const issues: L11CalibrationIssue[] = [];
  const families = new Set<L11ScoreFamily>();
  const seenIds = new Set<string>();

  for (const t of targets) {
    if (seenIds.has(t.calibration_target_id)) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_DUPLICATE_TARGET_ID,
        `duplicate calibration_target_id ${t.calibration_target_id}`,
        { target_id: t.calibration_target_id, score_family: t.score_family }));
      continue;
    }
    seenIds.add(t.calibration_target_id);
    if (isL11ReservedScoreFamily(t.score_family)) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_RESERVED_FAMILY_HAS_TARGET,
        `reserved family ${t.score_family} has calibration target ${t.calibration_target_id}`,
        { target_id: t.calibration_target_id, score_family: t.score_family }));
      continue;
    }
    families.add(t.score_family);
  }

  for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
    if (!families.has(f)) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_PRODUCTION_FAMILY_LACKS_TARGET,
        `production family ${f} has no calibration target`,
        { score_family: f }));
    }
  }
  return issues;
}

/**
 * INV-11.6-B — every production score must carry at least one hook.
 */
export function validateL11ScoreHookCoverage(
  scores: readonly L11ScoreOutput[],
  hooks: readonly L11ScoreCalibrationHook[],
): readonly L11CalibrationIssue[] {
  const issues: L11CalibrationIssue[] = [];
  const hooksByScore = new Map<string, number>();
  for (const h of hooks) {
    hooksByScore.set(h.score_id, (hooksByScore.get(h.score_id) ?? 0) + 1);
  }
  for (const s of scores) {
    if (isL11ReservedScoreFamily(s.score_family)) continue;
    if (!hooksByScore.has(s.score_id)) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_SCORE_LACKS_CALIBRATION_HOOK,
        `production score ${s.score_id} (${s.score_family}) has no calibration hook`,
        { score_id: s.score_id, score_family: s.score_family }));
    }
  }
  return issues;
}
