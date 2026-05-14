/**
 * L11.8 — Replay Result Validator (§11.8.15.4)
 */

import {
  L11ReplayResult,
  L11ReplayStatus,
} from './l11-replay-adapter';
import {
  L11PersistenceViolationCode,
  L11PersistenceIssue,
  makeL11PersistenceIssue,
} from '../persistence/l11-persistence-violation-codes';

export function validateL11ReplayResult(
  r: L11ReplayResult,
): L11PersistenceIssue[] {
  const issues: L11PersistenceIssue[] = [];
  const ctx = { replay_id: r?.replay_id };

  if (!r) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPLAY_RESULT_INCOMPLETE,
      'replay result is null/undefined'));
    return issues;
  }
  if (!r.replay_id || !r.source_run_id || !r.score_family ||
      !r.replay_status || !r.policy_version) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPLAY_RESULT_INCOMPLETE,
      'one or more required fields missing on replay result', ctx));
  }
  if (!r.source_run_id) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPLAY_SOURCE_RUN_MISSING,
      'source_run_id missing', ctx));
  }
  if (!Array.isArray(r.lineage_refs) || r.lineage_refs.length === 0) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_LINEAGE_REFS_MISSING,
      'lineage_refs missing or empty', ctx));
  }

  if (!r.score_hash_match && r.replay_status === L11ReplayStatus.IDENTICAL) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPLAY_HASH_MISMATCH,
      'score hash mismatched but status reports IDENTICAL', ctx));
  }
  if (!r.score_hash_match) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPLAY_HASH_MISMATCH,
      'score replay hash mismatch', ctx));
  }
  if (!r.attribution_hash_match) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPLAY_ATTRIBUTION_MISMATCH,
      'attribution replay hash mismatch', ctx));
  }
  if (!r.missing_data_hash_match) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPLAY_MISSING_DATA_MISMATCH,
      'missing-data replay hash mismatch', ctx));
  }
  if (!r.modifier_hash_match) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPLAY_MODIFIER_MISMATCH,
      'modifier replay hash mismatch', ctx));
  }
  if (!r.calibration_hash_match) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPLAY_CALIBRATION_MISMATCH,
      'calibration replay hash mismatch', ctx));
  }
  if (!r.formula_version_match) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPLAY_FORMULA_VERSION_MISMATCH,
      'formula version mismatch', ctx));
  }
  if (!r.threshold_policy_match) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPLAY_THRESHOLD_POLICY_MISMATCH,
      'threshold policy mismatch', ctx));
  }
  return issues;
}
