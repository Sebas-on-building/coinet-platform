/**
 * L11.7 — Drift / Threshold / Formula-change Audit Surface
 * (§11.7.19)
 *
 * Deterministic `l11g.audit.…` emitter for L11.7 violations.
 *
 * Audit subject classes:
 *   - drift report
 *   - drift statistic
 *   - threshold policy
 *   - threshold change
 *   - formula change
 *   - recommended action
 *   - replay identity
 *   - invariant
 */

import {
  L11DriftIssue,
  L11DriftSeverityClass,
  L11DriftViolationCode,
  severityForL11DriftCode,
} from '../validation/l11-drift-violation-codes';

export enum L11DriftAuditSubjectClass {
  DRIFT_REPORT = 'DRIFT_REPORT',
  DRIFT_STATISTIC = 'DRIFT_STATISTIC',
  THRESHOLD_POLICY = 'THRESHOLD_POLICY',
  THRESHOLD_CHANGE = 'THRESHOLD_CHANGE',
  FORMULA_CHANGE = 'FORMULA_CHANGE',
  RECOMMENDED_ACTION = 'RECOMMENDED_ACTION',
  REPLAY_IDENTITY = 'REPLAY_IDENTITY',
  INVARIANT = 'INVARIANT',
}

export const ALL_L11_DRIFT_AUDIT_SUBJECT_CLASSES:
  readonly L11DriftAuditSubjectClass[] =
  Object.values(L11DriftAuditSubjectClass);

export interface L11DriftAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L11DriftAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L11DriftViolationCode;
  readonly severity: L11DriftSeverityClass;
  readonly explanation: string;
  readonly emitted_at: string;
  readonly drift_report_id?: string;
  readonly threshold_policy_id?: string;
  readonly formula_change_assessment_id?: string;
  readonly statistic_id?: string;
  readonly score_family?: string;
}

export function makeL11DriftAuditRecord(
  subject_class: L11DriftAuditSubjectClass,
  subject_ref: string,
  issue: L11DriftIssue,
  emitted_at: string,
): L11DriftAuditRecord {
  return {
    audit_id: deterministicAuditId(subject_class, subject_ref, issue.code, emitted_at),
    subject_class,
    subject_ref,
    violation_code: issue.code,
    severity: issue.severity ?? severityForL11DriftCode(issue.code),
    explanation: issue.message,
    emitted_at,
    drift_report_id: issue.drift_report_id,
    threshold_policy_id: issue.threshold_policy_id,
    formula_change_assessment_id: issue.formula_change_assessment_id,
    statistic_id: issue.statistic_id,
    score_family: issue.score_family,
  };
}

export function emitL11DriftAuditRecords(
  subject_class: L11DriftAuditSubjectClass,
  subject_ref: string,
  issues: readonly L11DriftIssue[],
  emitted_at: string,
): readonly L11DriftAuditRecord[] {
  return issues.map(i =>
    makeL11DriftAuditRecord(subject_class, subject_ref, i, emitted_at));
}

export function emitL11DriftAuditBatch(
  subject_class: L11DriftAuditSubjectClass,
  default_subject_ref: string,
  issues: readonly L11DriftIssue[],
  emitted_at: string,
): readonly L11DriftAuditRecord[] {
  return issues.map(i => {
    const ref =
      i.drift_report_id ??
      i.threshold_policy_id ??
      i.formula_change_assessment_id ??
      i.statistic_id ??
      i.subject_ref ??
      default_subject_ref;
    return makeL11DriftAuditRecord(subject_class, ref, i, emitted_at);
  });
}

function deterministicAuditId(
  subject_class: L11DriftAuditSubjectClass,
  subject_ref: string,
  code: L11DriftViolationCode,
  emitted_at: string,
): string {
  const seed = `${subject_class}::${subject_ref}::${code}::${emitted_at}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `l11g.audit.${h.toString(16).padStart(8, '0')}`;
}
