/**
 * L12.7 — Enable / Disable Policy (§12.7.12)
 *
 * Governs enabling/disabling of L12 scenario template families,
 * read surfaces, and downstream consumers at runtime. Disable must
 * never silently drop historical scenario truth or erase scenario law.
 */

export const L12_ENABLE_DISABLE_POLICY_VERSION =
  'l12.7.enable-disable.v1';

export enum L12EnableDisableSubject {
  SCENARIO_TEMPLATE_FAMILY = 'SCENARIO_TEMPLATE_FAMILY',
  READ_SURFACE = 'READ_SURFACE',
  DOWNSTREAM_CONSUMER = 'DOWNSTREAM_CONSUMER',
  PERSISTENCE_SURFACE = 'PERSISTENCE_SURFACE',
  RUNTIME_DAG_NODE = 'RUNTIME_DAG_NODE',
}

export const ALL_L12_ENABLE_DISABLE_SUBJECTS:
  readonly L12EnableDisableSubject[] =
  Object.values(L12EnableDisableSubject);

export enum L12EnableDisableAction {
  ENABLE = 'ENABLE',
  DISABLE = 'DISABLE',
}

export interface L12EnableDisableRequest {
  readonly request_id: string;
  readonly subject_class: L12EnableDisableSubject;
  readonly subject_ref: string;
  readonly action: L12EnableDisableAction;
  readonly reason: string;
  readonly preserves_historical_truth: boolean;
  readonly preserves_lineage: boolean;
  readonly preserves_evidence: boolean;
  readonly notifies_downstream: boolean;
  readonly policy_version: string;
}

export enum L12EnableDisableViolationCode {
  L12ED_REASON_MISSING = 'L12ED_REASON_MISSING',
  L12ED_SUBJECT_REF_MISSING = 'L12ED_SUBJECT_REF_MISSING',
  L12ED_HISTORICAL_TRUTH_NOT_PRESERVED =
    'L12ED_HISTORICAL_TRUTH_NOT_PRESERVED',
  L12ED_LINEAGE_NOT_PRESERVED = 'L12ED_LINEAGE_NOT_PRESERVED',
  L12ED_EVIDENCE_NOT_PRESERVED = 'L12ED_EVIDENCE_NOT_PRESERVED',
  L12ED_DOWNSTREAM_NOT_NOTIFIED = 'L12ED_DOWNSTREAM_NOT_NOTIFIED',
}

export interface L12EnableDisableIssue {
  readonly code: L12EnableDisableViolationCode;
  readonly message: string;
  readonly request_id?: string;
}

export function validateL12EnableDisableRequest(
  r: L12EnableDisableRequest,
): readonly L12EnableDisableIssue[] {
  const issues: L12EnableDisableIssue[] = [];
  const ref = r?.request_id;
  if (!r) {
    issues.push({ code: L12EnableDisableViolationCode.L12ED_REASON_MISSING,
      message: 'request null' });
    return issues;
  }
  if (!r.reason) {
    issues.push({ code: L12EnableDisableViolationCode.L12ED_REASON_MISSING,
      message: 'reason missing', request_id: ref });
  }
  if (!r.subject_ref) {
    issues.push({ code: L12EnableDisableViolationCode.L12ED_SUBJECT_REF_MISSING,
      message: 'subject_ref missing', request_id: ref });
  }
  if (r.action === L12EnableDisableAction.DISABLE) {
    if (!r.preserves_historical_truth) {
      issues.push({
        code: L12EnableDisableViolationCode.L12ED_HISTORICAL_TRUTH_NOT_PRESERVED,
        message: 'disable must preserve historical scenario truth',
        request_id: ref });
    }
    if (!r.preserves_lineage) {
      issues.push({
        code: L12EnableDisableViolationCode.L12ED_LINEAGE_NOT_PRESERVED,
        message: 'disable must preserve lineage', request_id: ref });
    }
    if (!r.preserves_evidence) {
      issues.push({
        code: L12EnableDisableViolationCode.L12ED_EVIDENCE_NOT_PRESERVED,
        message: 'disable must preserve evidence', request_id: ref });
    }
    if (!r.notifies_downstream) {
      issues.push({
        code: L12EnableDisableViolationCode.L12ED_DOWNSTREAM_NOT_NOTIFIED,
        message: 'disable must notify downstream consumers',
        request_id: ref });
    }
  }
  return issues;
}
