/**
 * L11.7 — Drift report validator (§11.7.7 / §11.7.18.1)
 */

import {
  L11ScoreDriftReport,
  extractL11DriftReportReplayMaterial,
  canonicalDriftReportReplayHash,
} from '../contracts/drift-report';
import {
  L11DriftStatisticConfidenceClass,
} from '../contracts/drift-statistic';
import {
  L11DriftSeverity, isL11DriftSeverityAtLeast,
} from '../contracts/drift-severity';
import {
  ALL_L11_SCORE_DRIFT_TYPES,
} from '../contracts/drift-type';
import {
  L11DriftViolationCode,
  L11DriftIssue,
  makeL11DriftIssue,
} from './l11-drift-violation-codes';
import { validateL11DriftStatistic } from './drift-statistic.validator';
import { validateL11DriftSeverity } from './drift-severity.validator';
import { validateL11DriftRecommendedAction } from './drift-recommended-action.validator';

export function validateL11ScoreDriftReport(
  r: L11ScoreDriftReport,
): L11DriftIssue[] {
  const issues: L11DriftIssue[] = [];
  const ref = r.drift_report_id;

  if (!r.drift_report_id) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_DRIFT_REPORT_ID_MISSING,
      'drift_report_id missing'));
  }
  if (!r.score_family) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_DRIFT_SCORE_FAMILY_MISSING,
      'score_family missing', { drift_report_id: ref }));
  }
  if (!r.score_version) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_DRIFT_SCORE_VERSION_MISSING,
      'score_version missing', { drift_report_id: ref }));
  }
  if (!r.formula_id || !r.formula_version) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_DRIFT_FORMULA_VERSION_MISSING,
      'formula_id / formula_version missing', { drift_report_id: ref }));
  }
  if (!r.drift_type) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_DRIFT_TYPE_MISSING,
      'drift_type missing', { drift_report_id: ref }));
  } else if (!ALL_L11_SCORE_DRIFT_TYPES.includes(r.drift_type)) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_DRIFT_TYPE_UNKNOWN,
      `drift_type ${r.drift_type} not registered`, { drift_report_id: ref }));
  }
  issues.push(...validateL11DriftSeverity(r.drift_severity).map(i =>
    ({ ...i, drift_report_id: ref })));
  if (!r.cohort_ref) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_DRIFT_COHORT_REF_MISSING,
      'cohort_ref missing', { drift_report_id: ref }));
  }
  if (!r.observation_window_start || !r.observation_window_end) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_OBSERVATION_WINDOW_MISSING,
      'observation_window_start/end missing', { drift_report_id: ref }));
  }
  if (!r.baseline_window_start || !r.baseline_window_end) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_BASELINE_WINDOW_MISSING,
      'baseline_window_start/end missing', { drift_report_id: ref }));
  }
  if (!r.observed_change) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_OBSERVED_CHANGE_MISSING,
      'observed_change missing', { drift_report_id: ref }));
  }
  if (!r.expected_baseline) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_EXPECTED_BASELINE_MISSING,
      'expected_baseline missing', { drift_report_id: ref }));
  } else if (!r.expected_baseline.baseline_version) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_BASELINE_VERSION_MISSING,
      'expected_baseline.baseline_version missing', { drift_report_id: ref }));
  }
  if (!Array.isArray(r.lineage_refs) || r.lineage_refs.length === 0) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_DRIFT_LINEAGE_MISSING,
      'lineage_refs missing or empty', { drift_report_id: ref }));
  }
  if (!r.policy_version) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_DRIFT_POLICY_VERSION_MISSING,
      'policy_version missing', { drift_report_id: ref }));
  }
  if (!r.replay_hash) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_REPLAY_HASH_MISSING,
      'replay_hash missing', { drift_report_id: ref }));
  } else {
    try {
      const expected = canonicalDriftReportReplayHash(
        extractL11DriftReportReplayMaterial(r));
      if (expected !== r.replay_hash) {
        issues.push(makeL11DriftIssue(
          L11DriftViolationCode.L11G_REPLAY_HASH_MISMATCH,
          `replay_hash declared=${r.replay_hash} expected=${expected}`,
          { drift_report_id: ref }));
      }
    } catch (e) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_REPLAY_HASH_MISMATCH,
        `replay_hash recomputation failed: ${(e as Error).message}`,
        { drift_report_id: ref }));
    }
  }

  // Validate each drift statistic.
  for (const stat of r.drift_statistics) {
    issues.push(...validateL11DriftStatistic(stat).map(i =>
      ({ ...i, drift_report_id: ref })));
    if (!isStatSampleSufficient(stat) &&
        isL11DriftSeverityAtLeast(r.drift_severity, L11DriftSeverity.SEVERE) &&
        stat.confidence_class !==
          L11DriftStatisticConfidenceClass.INSUFFICIENT_SAMPLE &&
        stat.confidence_class !==
          L11DriftStatisticConfidenceClass.LOW_CONFIDENCE) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_HIGH_SEVERITY_FROM_INSUFFICIENT_SAMPLE,
        `severity=${r.drift_severity} but stat ${stat.statistic_id} sample is below minimum and confidence not downgraded`,
        { drift_report_id: ref, statistic_id: stat.statistic_id }));
    }
  }

  // Action / severity consistency.
  if (r.drift_severity && r.drift_type) {
    issues.push(...validateL11DriftRecommendedAction({
      action: r.recommended_action,
      severity: r.drift_severity,
      type: r.drift_type,
      drift_report_id: ref,
    }));
  }

  return issues;
}

function isStatSampleSufficient(s: { sample_size: number; minimum_sample_size: number }): boolean {
  return Number.isFinite(s.sample_size) &&
    Number.isFinite(s.minimum_sample_size) &&
    s.sample_size > 0 && s.minimum_sample_size > 0 &&
    s.sample_size >= s.minimum_sample_size;
}
