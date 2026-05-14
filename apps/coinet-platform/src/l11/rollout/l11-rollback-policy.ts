/**
 * L11.9 — Rollback Policy (§11.9.16)
 *
 * Modes and validation rules for governed Layer 11 rollback. A
 * rollback may never delete or mutate historical truth; it must
 * preserve lineage and append failure / rollback records.
 */

export const L11_ROLLBACK_POLICY_VERSION = 'l11.9.rollback.v1';

export enum L11RollbackMode {
  DISABLE_CURRENT_SERVING = 'DISABLE_CURRENT_SERVING',
  REVERT_TO_PRIOR_FORMULA_VERSION = 'REVERT_TO_PRIOR_FORMULA_VERSION',
  REVERT_THRESHOLD_POLICY = 'REVERT_THRESHOLD_POLICY',
  DISABLE_SCORE_FAMILY = 'DISABLE_SCORE_FAMILY',
  FREEZE_DOWNSTREAM_CONSUMPTION = 'FREEZE_DOWNSTREAM_CONSUMPTION',
  REPAIR_AND_REMATERIALIZE = 'REPAIR_AND_REMATERIALIZE',
  FULL_LAYER_SAFE_MODE = 'FULL_LAYER_SAFE_MODE',
}

export const ALL_L11_ROLLBACK_MODES:
  readonly L11RollbackMode[] = Object.values(L11RollbackMode);

export interface L11RollbackRequest {
  readonly rollback_request_id: string;
  readonly mode: L11RollbackMode;
  readonly reason: string;
  readonly affected_score_families: readonly string[];
  readonly affected_formula_versions: readonly string[];

  readonly deletes_historical_facts: boolean;
  readonly mutates_prior_score_outputs: boolean;
  readonly erases_attribution: boolean;
  readonly erases_drift_reports: boolean;
  readonly removes_calibration_hooks: boolean;
  readonly reinterprets_historical_scores: boolean;
  readonly hides_failure_reason: boolean;
  readonly bypasses_l5_persistence: boolean;

  readonly preserves_lineage: boolean;
  readonly appends_rollback_record: boolean;
  readonly maintains_evidence: boolean;
  readonly notifies_downstream_via_read_surface_status: boolean;

  readonly policy_version: string;
}

export enum L11RollbackViolationCode {
  L11R_REASON_MISSING = 'L11R_REASON_MISSING',
  L11R_DELETES_HISTORICAL_FACT = 'L11R_DELETES_HISTORICAL_FACT',
  L11R_MUTATES_PRIOR_SCORE_OUTPUTS = 'L11R_MUTATES_PRIOR_SCORE_OUTPUTS',
  L11R_ERASES_ATTRIBUTION = 'L11R_ERASES_ATTRIBUTION',
  L11R_ERASES_DRIFT = 'L11R_ERASES_DRIFT',
  L11R_REMOVES_CALIBRATION_HOOKS = 'L11R_REMOVES_CALIBRATION_HOOKS',
  L11R_REINTERPRETS_HISTORICAL_SCORES = 'L11R_REINTERPRETS_HISTORICAL_SCORES',
  L11R_HIDES_FAILURE_REASON = 'L11R_HIDES_FAILURE_REASON',
  L11R_BYPASSES_L5 = 'L11R_BYPASSES_L5',
  L11R_LINEAGE_NOT_PRESERVED = 'L11R_LINEAGE_NOT_PRESERVED',
  L11R_NO_ROLLBACK_RECORD = 'L11R_NO_ROLLBACK_RECORD',
  L11R_EVIDENCE_NOT_MAINTAINED = 'L11R_EVIDENCE_NOT_MAINTAINED',
  L11R_DOWNSTREAM_NOT_NOTIFIED = 'L11R_DOWNSTREAM_NOT_NOTIFIED',
  L11R_AFFECTED_FAMILIES_MISSING = 'L11R_AFFECTED_FAMILIES_MISSING',
  L11R_AFFECTED_FORMULAS_MISSING = 'L11R_AFFECTED_FORMULAS_MISSING',
}

export interface L11RollbackIssue {
  readonly code: L11RollbackViolationCode;
  readonly message: string;
  readonly rollback_request_id?: string;
}

export function validateL11RollbackRequest(
  r: L11RollbackRequest,
): readonly L11RollbackIssue[] {
  const issues: L11RollbackIssue[] = [];
  const ref = r?.rollback_request_id;
  if (!r) {
    issues.push({ code: L11RollbackViolationCode.L11R_REASON_MISSING,
      message: 'rollback request null' });
    return issues;
  }
  if (!r.reason) {
    issues.push({ code: L11RollbackViolationCode.L11R_REASON_MISSING,
      message: 'reason missing', rollback_request_id: ref });
  }
  if (r.deletes_historical_facts) {
    issues.push({ code: L11RollbackViolationCode.L11R_DELETES_HISTORICAL_FACT,
      message: 'rollback may not delete historical facts',
      rollback_request_id: ref });
  }
  if (r.mutates_prior_score_outputs) {
    issues.push({ code: L11RollbackViolationCode.L11R_MUTATES_PRIOR_SCORE_OUTPUTS,
      message: 'rollback may not mutate prior score outputs',
      rollback_request_id: ref });
  }
  if (r.erases_attribution) {
    issues.push({ code: L11RollbackViolationCode.L11R_ERASES_ATTRIBUTION,
      message: 'rollback may not erase attribution',
      rollback_request_id: ref });
  }
  if (r.erases_drift_reports) {
    issues.push({ code: L11RollbackViolationCode.L11R_ERASES_DRIFT,
      message: 'rollback may not erase drift reports',
      rollback_request_id: ref });
  }
  if (r.removes_calibration_hooks) {
    issues.push({ code: L11RollbackViolationCode.L11R_REMOVES_CALIBRATION_HOOKS,
      message: 'rollback may not remove calibration hooks',
      rollback_request_id: ref });
  }
  if (r.reinterprets_historical_scores) {
    issues.push({
      code: L11RollbackViolationCode.L11R_REINTERPRETS_HISTORICAL_SCORES,
      message: 'rollback may not reinterpret historical scores',
      rollback_request_id: ref });
  }
  if (r.hides_failure_reason) {
    issues.push({ code: L11RollbackViolationCode.L11R_HIDES_FAILURE_REASON,
      message: 'rollback may not hide failure reasons',
      rollback_request_id: ref });
  }
  if (r.bypasses_l5_persistence) {
    issues.push({ code: L11RollbackViolationCode.L11R_BYPASSES_L5,
      message: 'rollback may not bypass L5 persistence',
      rollback_request_id: ref });
  }
  if (!r.preserves_lineage) {
    issues.push({ code: L11RollbackViolationCode.L11R_LINEAGE_NOT_PRESERVED,
      message: 'rollback must preserve lineage',
      rollback_request_id: ref });
  }
  if (!r.appends_rollback_record) {
    issues.push({ code: L11RollbackViolationCode.L11R_NO_ROLLBACK_RECORD,
      message: 'rollback must append a failure/rollback record',
      rollback_request_id: ref });
  }
  if (!r.maintains_evidence) {
    issues.push({ code: L11RollbackViolationCode.L11R_EVIDENCE_NOT_MAINTAINED,
      message: 'rollback must maintain evidence',
      rollback_request_id: ref });
  }
  if (!r.notifies_downstream_via_read_surface_status) {
    issues.push({ code: L11RollbackViolationCode.L11R_DOWNSTREAM_NOT_NOTIFIED,
      message: 'rollback must notify downstream via read surface status',
      rollback_request_id: ref });
  }
  if (!Array.isArray(r.affected_score_families) ||
      r.affected_score_families.length === 0) {
    issues.push({ code: L11RollbackViolationCode.L11R_AFFECTED_FAMILIES_MISSING,
      message: 'affected_score_families missing',
      rollback_request_id: ref });
  }
  if (r.mode === L11RollbackMode.REVERT_TO_PRIOR_FORMULA_VERSION &&
      (!Array.isArray(r.affected_formula_versions) ||
       r.affected_formula_versions.length === 0)) {
    issues.push({ code: L11RollbackViolationCode.L11R_AFFECTED_FORMULAS_MISSING,
      message: 'REVERT_TO_PRIOR_FORMULA_VERSION requires affected_formula_versions',
      rollback_request_id: ref });
  }
  return issues;
}
