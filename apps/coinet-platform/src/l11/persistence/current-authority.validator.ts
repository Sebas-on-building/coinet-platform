/**
 * L11.8 — Current Authority Validator (§11.8.7)
 */

import {
  L11CurrentScoreRecord,
  l11SupersessionReasonRequiresPriorRef,
  isL11MaterializationModeAuthorizedForCurrent,
  isL11CurrentScoreRecordStructurallyValid,
} from '../contracts/l11-current-authority';
import {
  L11PersistenceViolationCode,
  L11PersistenceIssue,
  makeL11PersistenceIssue,
} from './l11-persistence-violation-codes';

export function validateL11CurrentScoreRecord(
  r: L11CurrentScoreRecord,
): L11PersistenceIssue[] {
  const issues: L11PersistenceIssue[] = [];
  const ctx = { current_record_id: r?.current_record_id };

  if (!r) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_CURRENT_RECORD_INCOMPLETE,
      'current record is null/undefined'));
    return issues;
  }

  const struct = isL11CurrentScoreRecordStructurallyValid(r);
  if (!struct.ok) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_CURRENT_RECORD_INCOMPLETE,
      struct.reason, ctx));
  }
  if (!r.formula_id || !r.formula_version) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_CURRENT_FORMULA_VERSION_MISSING,
      'formula_id / formula_version missing', ctx));
  }
  if (!r.attribution_ref) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_CURRENT_ATTRIBUTION_REF_MISSING,
      'attribution_ref missing', ctx));
  }
  if (!r.component_breakdown_ref) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_CURRENT_COMPONENT_REF_MISSING,
      'component_breakdown_ref missing', ctx));
  }
  if (!r.missing_data_profile_ref) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_CURRENT_MISSING_DATA_REF_MISSING,
      'missing_data_profile_ref missing', ctx));
  }
  if (!r.replay_hash) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPLAY_HASH_MISSING,
      'replay_hash missing', ctx));
  }
  if (!r.materialization_mode) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_CURRENT_INVALID_MATERIALIZATION_MODE,
      'materialization_mode missing', ctx));
  } else if (!isL11MaterializationModeAuthorizedForCurrent(r.materialization_mode)) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_CURRENT_WRITTEN_UNDER_REPLAY,
      `materialization mode ${r.materialization_mode} not authorized for current authority`,
      ctx));
  }
  if (r.supersession_reason && !r.prior_current_record_ref &&
      l11SupersessionReasonRequiresPriorRef(r.supersession_reason)) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_SUPERSESSION_PRIOR_REF_MISSING,
      `supersession reason ${r.supersession_reason} requires prior_current_record_ref`,
      ctx));
  }
  if (r.prior_current_record_ref && !r.supersession_reason) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_SUPERSESSION_REASON_MISSING,
      'prior_current_record_ref present without supersession_reason',
      ctx));
  }
  return issues;
}
