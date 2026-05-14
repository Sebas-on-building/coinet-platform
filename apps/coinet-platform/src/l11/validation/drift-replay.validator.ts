/**
 * L11.7 — Drift / threshold / formula-change replay validator
 * (§11.7.18)
 *
 * Validates the replay hash on each governance object against
 * the deterministic canonical material extractor.
 */

import {
  L11ScoreDriftReport,
  extractL11DriftReportReplayMaterial,
  canonicalDriftReportReplayHash,
} from '../contracts/drift-report';
import {
  L11ThresholdPolicy,
  extractL11ThresholdPolicyReplayMaterial,
  canonicalThresholdPolicyReplayHash,
} from '../contracts/threshold-policy';
import {
  L11FormulaChangeAssessment,
  extractL11FormulaChangeReplayMaterial,
  canonicalFormulaChangeReplayHash,
} from '../contracts/formula-change-assessment';
import {
  L11DriftViolationCode,
  L11DriftIssue,
  makeL11DriftIssue,
} from './l11-drift-violation-codes';

export interface L11DriftReplayValidationInput {
  readonly drift_reports?: readonly L11ScoreDriftReport[];
  readonly threshold_policies?: readonly L11ThresholdPolicy[];
  readonly formula_change_assessments?: readonly L11FormulaChangeAssessment[];
}

export function validateL11DriftReplay(
  inp: L11DriftReplayValidationInput,
): L11DriftIssue[] {
  const issues: L11DriftIssue[] = [];
  for (const r of inp.drift_reports ?? []) {
    if (!r.replay_hash) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_REPLAY_HASH_MISSING,
        'drift report replay_hash missing',
        { drift_report_id: r.drift_report_id }));
      continue;
    }
    try {
      const expected = canonicalDriftReportReplayHash(
        extractL11DriftReportReplayMaterial(r));
      if (expected !== r.replay_hash) {
        issues.push(makeL11DriftIssue(
          L11DriftViolationCode.L11G_REPLAY_HASH_MISMATCH,
          `drift report replay_hash mismatch (declared=${r.replay_hash} expected=${expected})`,
          { drift_report_id: r.drift_report_id }));
      }
    } catch (e) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_REPLAY_HASH_MISMATCH,
        `drift report replay_hash recomputation failed: ${(e as Error).message}`,
        { drift_report_id: r.drift_report_id }));
    }
  }
  for (const p of inp.threshold_policies ?? []) {
    if (!p.replay_hash) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_REPLAY_HASH_MISSING,
        'threshold policy replay_hash missing',
        { threshold_policy_id: p.threshold_policy_id }));
      continue;
    }
    try {
      const expected = canonicalThresholdPolicyReplayHash(
        extractL11ThresholdPolicyReplayMaterial(p));
      if (expected !== p.replay_hash) {
        issues.push(makeL11DriftIssue(
          L11DriftViolationCode.L11G_THRESHOLD_REPLAY_HASH_MISMATCH,
          `threshold policy replay_hash mismatch (declared=${p.replay_hash} expected=${expected})`,
          { threshold_policy_id: p.threshold_policy_id }));
      }
    } catch (e) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_REPLAY_HASH_MISMATCH,
        `threshold policy replay_hash recomputation failed: ${(e as Error).message}`,
        { threshold_policy_id: p.threshold_policy_id }));
    }
  }
  for (const a of inp.formula_change_assessments ?? []) {
    if (!a.replay_hash) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_FORMULA_CHANGE_REPLAY_HASH_MISSING,
        'formula change replay_hash missing',
        { formula_change_assessment_id: a.formula_change_assessment_id }));
      continue;
    }
    try {
      const expected = canonicalFormulaChangeReplayHash(
        extractL11FormulaChangeReplayMaterial(a));
      if (expected !== a.replay_hash) {
        issues.push(makeL11DriftIssue(
          L11DriftViolationCode.L11G_FORMULA_CHANGE_REPLAY_HASH_MISMATCH,
          `formula change replay_hash mismatch (declared=${a.replay_hash} expected=${expected})`,
          { formula_change_assessment_id: a.formula_change_assessment_id }));
      }
    } catch (e) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_FORMULA_CHANGE_REPLAY_HASH_MISMATCH,
        `formula change replay_hash recomputation failed: ${(e as Error).message}`,
        { formula_change_assessment_id: a.formula_change_assessment_id }));
    }
  }
  return issues;
}
