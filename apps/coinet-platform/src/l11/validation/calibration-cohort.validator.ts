/**
 * L11.6 — Calibration Cohort Validator (§11.6.9.4)
 */

import {
  L11CalibrationCohortDefinition,
  isL11CalibrationCohortStructurallyValid,
} from '../contracts/calibration-cohort';
import { L11ScoreFamily } from '../contracts/score-family';
import {
  L11CalibrationIssue,
  L11CalibrationViolationCode,
  makeL11CalibrationIssue,
} from './l11-calibration-violation-codes';

export function validateL11CalibrationCohort(
  c: L11CalibrationCohortDefinition | null | undefined,
  expectedFamily: L11ScoreFamily,
  ctx: { target_id?: string } = {},
): readonly L11CalibrationIssue[] {
  const issues: L11CalibrationIssue[] = [];
  if (!c) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_COHORT_DEFINITION_MISSING,
      'cohort_definition missing', ctx));
    return issues;
  }
  const sv = isL11CalibrationCohortStructurallyValid(c);
  if (!sv.ok) {
    if (sv.reason.includes('migration')) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_COHORT_MIXES_DEPRECATED_WITHOUT_MIGRATION_FLAG,
        sv.reason, { ...ctx, cohort_id: c.cohort_id }));
    } else if (sv.reason.includes('minimum_observation_count')) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_COHORT_MIN_OBSERVATION_COUNT_INVALID,
        sv.reason, { ...ctx, cohort_id: c.cohort_id }));
    } else if (sv.reason.includes('score_band_filters')) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_COHORT_LACKS_BAND_FILTER_CAPABILITY,
        sv.reason, { ...ctx, cohort_id: c.cohort_id }));
    } else if (sv.reason.includes('formula_version_filters')) {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_COHORT_IGNORES_FORMULA_VERSION,
        sv.reason, { ...ctx, cohort_id: c.cohort_id }));
    } else {
      issues.push(makeL11CalibrationIssue(
        L11CalibrationViolationCode.L11C_COHORT_DEFINITION_MISSING,
        sv.reason, { ...ctx, cohort_id: c.cohort_id }));
    }
  }
  if (c.score_family !== expectedFamily) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_COHORT_FAMILY_MISMATCH,
      `cohort family ${c.score_family} != target family ${expectedFamily}`,
      { ...ctx, cohort_id: c.cohort_id, score_family: c.score_family }));
  }
  if (c.formula_version_filters.length === 0) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_COHORT_IGNORES_FORMULA_VERSION,
      'cohort has empty formula_version_filters',
      { ...ctx, cohort_id: c.cohort_id }));
  }
  if (c.visibility_class_filters.length === 0) {
    issues.push(makeL11CalibrationIssue(
      L11CalibrationViolationCode.L11C_COHORT_IGNORES_VISIBILITY_CLASS,
      'cohort has empty visibility_class_filters',
      { ...ctx, cohort_id: c.cohort_id }));
  }
  return issues;
}
