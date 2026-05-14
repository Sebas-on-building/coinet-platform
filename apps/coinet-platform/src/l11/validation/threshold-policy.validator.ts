/**
 * L11.7 — Threshold policy validator (§11.7.11)
 */

import {
  L11ThresholdPolicy,
  L11ThresholdPolicyStatus,
  checkL11ThresholdPolicyIntegrity,
  isL11ThresholdPolicyCoveringFullRange,
  extractL11ThresholdPolicyReplayMaterial,
  canonicalThresholdPolicyReplayHash,
} from '../contracts/threshold-policy';
import {
  L11DriftViolationCode,
  L11DriftIssue,
  makeL11DriftIssue,
} from './l11-drift-violation-codes';

export function validateL11ThresholdPolicy(
  p: L11ThresholdPolicy,
): L11DriftIssue[] {
  const issues: L11DriftIssue[] = [];
  const ref = p.threshold_policy_id;
  if (!p.threshold_policy_id) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_THRESHOLD_POLICY_ID_MISSING,
      'threshold_policy_id missing'));
  }
  if (!p.score_family) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_THRESHOLD_SCORE_FAMILY_MISSING,
      'score_family missing', { threshold_policy_id: ref }));
  }
  if (!p.formula_id || !p.formula_version) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_THRESHOLD_FORMULA_VERSION_MISSING,
      'formula_id / formula_version missing',
      { threshold_policy_id: ref }));
  }
  if (!p.threshold_version) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_THRESHOLD_VERSION_MISSING,
      'threshold_version missing', { threshold_policy_id: ref }));
  }
  // Per-rule structural checks.
  const labels = new Set<string>();
  for (const rule of p.thresholds) {
    if (!rule.semantic_label) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_SEMANTIC_LABEL_MISSING,
        `band ${rule.score_band} missing semantic_label`,
        { threshold_policy_id: ref }));
    }
    labels.add(rule.score_band);
  }
  if (labels.size !== p.thresholds.length) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_THRESHOLD_DUPLICATE_BAND,
      'duplicate band in thresholds', { threshold_policy_id: ref }));
  }
  // Integrity (gaps / overlaps / boundary law).
  const integrity = checkL11ThresholdPolicyIntegrity(p.thresholds);
  if (!integrity.ok) {
    if (integrity.reason.includes('overlap')) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_POLICY_OVERLAP,
        integrity.reason, { threshold_policy_id: ref }));
    } else if (integrity.reason.includes('gap')) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_POLICY_GAP,
        integrity.reason, { threshold_policy_id: ref }));
    } else if (integrity.reason.includes('boundary')) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_POLICY_BOUNDARY_AMBIGUOUS,
        integrity.reason, { threshold_policy_id: ref }));
    } else if (integrity.reason.includes('semantic_label')) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_SEMANTIC_LABEL_MISSING,
        integrity.reason, { threshold_policy_id: ref }));
    } else {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_POLICY_GAP,
        integrity.reason, { threshold_policy_id: ref }));
    }
  }
  if (p.threshold_status === L11ThresholdPolicyStatus.ACTIVE) {
    const coverage = isL11ThresholdPolicyCoveringFullRange(p.thresholds);
    if (!coverage.ok) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_POLICY_DOES_NOT_COVER_FULL_RANGE,
        coverage.reason, { threshold_policy_id: ref }));
    }
    if (p.calibration_target_refs.length === 0) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_ACTIVE_THRESHOLD_LACKS_CALIBRATION_TARGET,
        'active threshold policy lacks calibration target ref',
        { threshold_policy_id: ref }));
    }
    if (!p.replay_hash) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_ACTIVE_THRESHOLD_LACKS_REPLAY_HASH,
        'active threshold policy lacks replay_hash',
        { threshold_policy_id: ref }));
    }
  }
  if (!p.replay_hash) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_THRESHOLD_REPLAY_HASH_MISSING,
      'replay_hash missing', { threshold_policy_id: ref }));
  } else {
    try {
      const expected = canonicalThresholdPolicyReplayHash(
        extractL11ThresholdPolicyReplayMaterial(p));
      if (expected !== p.replay_hash) {
        issues.push(makeL11DriftIssue(
          L11DriftViolationCode.L11G_THRESHOLD_REPLAY_HASH_MISMATCH,
          `replay_hash declared=${p.replay_hash} expected=${expected}`,
          { threshold_policy_id: ref }));
      }
    } catch (e) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_REPLAY_HASH_MISMATCH,
        `replay_hash recomputation failed: ${(e as Error).message}`,
        { threshold_policy_id: ref }));
    }
  }
  return issues;
}
