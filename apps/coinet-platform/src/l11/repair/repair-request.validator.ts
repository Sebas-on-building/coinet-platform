/**
 * L11.8 — Repair Request Validator (§11.8.16.3)
 */

import {
  L11RepairRequest,
} from './l11-repair-adapter';
import {
  L11MaterializationMode,
} from '../contracts/l11-persistence-surface';
import {
  L11PersistenceViolationCode,
  L11PersistenceIssue,
  makeL11PersistenceIssue,
} from '../persistence/l11-persistence-violation-codes';

export function validateL11RepairRequest(
  r: L11RepairRequest,
): L11PersistenceIssue[] {
  const issues: L11PersistenceIssue[] = [];
  const ctx = { repair_request_id: r?.repair_request_id };

  if (!r) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPAIR_REQUEST_INCOMPLETE,
      'repair request is null/undefined'));
    return issues;
  }
  if (!r.repair_request_id || !r.score_family || !r.policy_version ||
      !r.materialization_mode || !r.trigger) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPAIR_REQUEST_INCOMPLETE,
      'one or more required fields missing on repair request', ctx));
  }
  if (!r.parent_run_id) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPAIR_PARENT_RUN_MISSING,
      'parent_run_id missing', ctx));
  }
  if (!r.repair_reason) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPAIR_REASON_MISSING,
      'repair_reason missing', ctx));
  }
  if (!r.new_run_id || r.new_run_id === r.parent_run_id) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPAIR_REUSES_RUN_ID,
      'repair must produce a new run_id distinct from parent', ctx));
  }
  if (!Array.isArray(r.correction_lineage_refs) ||
      r.correction_lineage_refs.length === 0) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPAIR_NO_CORRECTION_REFS,
      'correction_lineage_refs missing or empty', ctx));
  }
  if (r.invents_new_evidence) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPAIR_INVENTS_EVIDENCE,
      'repair invents new evidence', ctx));
  }
  if (r.masquerades_as_live) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPAIR_MASQUERADES_AS_LIVE,
      'repair masquerades as live run', ctx));
  }
  if (r.destructive_historical_mutation) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPAIR_DESTRUCTIVE_HISTORICAL_MUTATION,
      'repair performs destructive historical mutation', ctx));
  }
  if (r.materialization_mode &&
      r.materialization_mode !== L11MaterializationMode.REPAIR_REBUILD &&
      r.materialization_mode !== L11MaterializationMode.LATE_DATA_REMATERIALIZATION) {
    issues.push(makeL11PersistenceIssue(
      L11PersistenceViolationCode.L11P_REPAIR_MASQUERADES_AS_LIVE,
      `materialization mode ${r.materialization_mode} not allowed for repair`,
      ctx));
  }
  return issues;
}
