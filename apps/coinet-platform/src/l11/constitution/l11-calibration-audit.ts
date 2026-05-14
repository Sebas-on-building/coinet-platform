/**
 * L11.6 — Calibration Audit Surface (§11.6.17)
 *
 * Deterministic audit emitter for L11.6 violations. Distinct from
 * earlier L11 audits so calibration failures can be reasoned about
 * independently.
 *
 * Audit subjects:
 *   - calibration target
 *   - outcome metric
 *   - expected direction
 *   - calibration cohort
 *   - exclusion rule
 *   - calibration hook
 *   - readiness class
 *   - replay identity
 *   - invariant
 */

import {
  L11CalibrationIssue,
  L11CalibrationSeverity,
  L11CalibrationViolationCode,
  severityForL11CalibrationCode,
} from '../validation/l11-calibration-violation-codes';

export enum L11CalibrationAuditSubjectClass {
  CALIBRATION_TARGET = 'CALIBRATION_TARGET',
  OUTCOME_METRIC = 'OUTCOME_METRIC',
  EXPECTED_DIRECTION = 'EXPECTED_DIRECTION',
  CALIBRATION_COHORT = 'CALIBRATION_COHORT',
  EXCLUSION_RULE = 'EXCLUSION_RULE',
  CALIBRATION_HOOK = 'CALIBRATION_HOOK',
  READINESS_CLASS = 'READINESS_CLASS',
  REPLAY_IDENTITY = 'REPLAY_IDENTITY',
  INVARIANT = 'INVARIANT',
}

export const ALL_L11_CALIBRATION_AUDIT_SUBJECT_CLASSES:
  readonly L11CalibrationAuditSubjectClass[] =
  Object.values(L11CalibrationAuditSubjectClass);

export interface L11CalibrationAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L11CalibrationAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L11CalibrationViolationCode;
  readonly severity: L11CalibrationSeverity;
  readonly explanation: string;
  readonly emitted_at: string;
  readonly target_id?: string;
  readonly hook_id?: string;
  readonly score_id?: string;
  readonly score_family?: string;
  readonly cohort_id?: string;
  readonly exclusion_rule_id?: string;
  readonly metric?: string;
}

export function makeL11CalibrationAuditRecord(
  subject_class: L11CalibrationAuditSubjectClass,
  subject_ref: string,
  issue: L11CalibrationIssue,
  emitted_at: string,
): L11CalibrationAuditRecord {
  return {
    audit_id: deterministicAuditId(subject_class, subject_ref, issue.code, emitted_at),
    subject_class,
    subject_ref,
    violation_code: issue.code,
    severity: issue.severity ?? severityForL11CalibrationCode(issue.code),
    explanation: issue.message,
    emitted_at,
    target_id: issue.target_id,
    hook_id: issue.hook_id,
    score_id: issue.score_id,
    score_family: issue.score_family,
    cohort_id: issue.cohort_id,
    exclusion_rule_id: issue.exclusion_rule_id,
    metric: issue.metric,
  };
}

export function emitL11CalibrationAuditRecords(
  subject_class: L11CalibrationAuditSubjectClass,
  subject_ref: string,
  issues: readonly L11CalibrationIssue[],
  emitted_at: string,
): readonly L11CalibrationAuditRecord[] {
  return issues.map(i =>
    makeL11CalibrationAuditRecord(subject_class, subject_ref, i, emitted_at));
}

export function emitL11CalibrationAuditBatch(
  subject_class: L11CalibrationAuditSubjectClass,
  default_subject_ref: string,
  issues: readonly L11CalibrationIssue[],
  emitted_at: string,
): readonly L11CalibrationAuditRecord[] {
  return issues.map(i => {
    const ref =
      i.hook_id ??
      i.target_id ??
      i.cohort_id ??
      i.exclusion_rule_id ??
      i.score_id ??
      default_subject_ref;
    return makeL11CalibrationAuditRecord(subject_class, ref, i, emitted_at);
  });
}

function deterministicAuditId(
  subject_class: L11CalibrationAuditSubjectClass,
  subject_ref: string,
  code: L11CalibrationViolationCode,
  emitted_at: string,
): string {
  const seed = `${subject_class}::${subject_ref}::${code}::${emitted_at}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `l11c.audit.${h.toString(16).padStart(8, '0')}`;
}
