/**
 * L11.9 — Enable / Disable Policy (§11.9.15)
 *
 * Governs enabling and disabling of L11 score families and
 * read surfaces at runtime. Disable must never silently drop
 * historical truth or erase score law.
 */

export const L11_ENABLE_DISABLE_POLICY_VERSION = 'l11.9.enable-disable.v1';

export enum L11EnableDisableSubject {
  SCORE_FAMILY = 'SCORE_FAMILY',
  FORMULA_VERSION = 'FORMULA_VERSION',
  READ_SURFACE = 'READ_SURFACE',
  CALIBRATION_HOOK_REGISTRATION = 'CALIBRATION_HOOK_REGISTRATION',
  DRIFT_MONITOR = 'DRIFT_MONITOR',
}

export const ALL_L11_ENABLE_DISABLE_SUBJECTS:
  readonly L11EnableDisableSubject[] =
  Object.values(L11EnableDisableSubject);

export enum L11EnableDisableAction {
  ENABLE = 'ENABLE',
  DISABLE = 'DISABLE',
}

export interface L11EnableDisableRequest {
  readonly request_id: string;
  readonly subject_class: L11EnableDisableSubject;
  readonly subject_ref: string;
  readonly action: L11EnableDisableAction;
  readonly reason: string;
  readonly preserves_historical_truth: boolean;
  readonly preserves_lineage: boolean;
  readonly preserves_evidence: boolean;
  readonly notifies_downstream: boolean;
  readonly policy_version: string;
}

export enum L11EnableDisableViolationCode {
  L11ED_REASON_MISSING = 'L11ED_REASON_MISSING',
  L11ED_HISTORICAL_TRUTH_NOT_PRESERVED = 'L11ED_HISTORICAL_TRUTH_NOT_PRESERVED',
  L11ED_LINEAGE_NOT_PRESERVED = 'L11ED_LINEAGE_NOT_PRESERVED',
  L11ED_EVIDENCE_NOT_PRESERVED = 'L11ED_EVIDENCE_NOT_PRESERVED',
  L11ED_DOWNSTREAM_NOT_NOTIFIED = 'L11ED_DOWNSTREAM_NOT_NOTIFIED',
  L11ED_SUBJECT_REF_MISSING = 'L11ED_SUBJECT_REF_MISSING',
}

export interface L11EnableDisableIssue {
  readonly code: L11EnableDisableViolationCode;
  readonly message: string;
  readonly request_id?: string;
}

export function validateL11EnableDisableRequest(
  r: L11EnableDisableRequest,
): readonly L11EnableDisableIssue[] {
  const issues: L11EnableDisableIssue[] = [];
  const ref = r?.request_id;
  if (!r) {
    issues.push({ code: L11EnableDisableViolationCode.L11ED_REASON_MISSING,
      message: 'request null' });
    return issues;
  }
  if (!r.reason) {
    issues.push({ code: L11EnableDisableViolationCode.L11ED_REASON_MISSING,
      message: 'reason missing', request_id: ref });
  }
  if (!r.subject_ref) {
    issues.push({ code: L11EnableDisableViolationCode.L11ED_SUBJECT_REF_MISSING,
      message: 'subject_ref missing', request_id: ref });
  }
  if (r.action === L11EnableDisableAction.DISABLE) {
    if (!r.preserves_historical_truth) {
      issues.push({
        code: L11EnableDisableViolationCode.L11ED_HISTORICAL_TRUTH_NOT_PRESERVED,
        message: 'disable must preserve historical truth', request_id: ref });
    }
    if (!r.preserves_lineage) {
      issues.push({
        code: L11EnableDisableViolationCode.L11ED_LINEAGE_NOT_PRESERVED,
        message: 'disable must preserve lineage', request_id: ref });
    }
    if (!r.preserves_evidence) {
      issues.push({
        code: L11EnableDisableViolationCode.L11ED_EVIDENCE_NOT_PRESERVED,
        message: 'disable must preserve evidence', request_id: ref });
    }
    if (!r.notifies_downstream) {
      issues.push({
        code: L11EnableDisableViolationCode.L11ED_DOWNSTREAM_NOT_NOTIFIED,
        message: 'disable must notify downstream consumers', request_id: ref });
    }
  }
  return issues;
}
