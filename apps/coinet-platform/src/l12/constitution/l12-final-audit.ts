/**
 * L12.7 — Final Audit Surface (§12.7.16)
 *
 * Deterministic `l12r.audit.…` emitter for L12.7 (closure-time)
 * findings. Lower sublayer audit events keep their existing namespaces
 * (`l12.audit.`, `l12d.audit.`, `l12c.audit.`, `l12r4.audit.`,
 * `l12t.audit.`, `l12p.audit.`).
 */

import { L12FinalViolationCode } from '../validation/l12-final-violation-codes';

export const L12_FINAL_AUDIT_POLICY_VERSION = 'l12.7.final-audit.v1';

/** §12.7.16 — audit subject classes. */
export enum L12FinalAuditSubjectClass {
  COMPLETION_STANDARD = 'COMPLETION_STANDARD',
  CERTIFICATION_REPORT = 'CERTIFICATION_REPORT',
  CERTIFICATION_BAND = 'CERTIFICATION_BAND',
  RATIFICATION_ARTIFACT = 'RATIFICATION_ARTIFACT',
  FREEZE_POLICY = 'FREEZE_POLICY',
  EXTENSION_POLICY = 'EXTENSION_POLICY',
  ROLLOUT_GATE = 'ROLLOUT_GATE',
  DOWNSTREAM_HANDOFF = 'DOWNSTREAM_HANDOFF',
  ROLLBACK_POLICY = 'ROLLBACK_POLICY',
  INVARIANT = 'INVARIANT',
}

export const ALL_L12_FINAL_AUDIT_SUBJECT_CLASSES:
  readonly L12FinalAuditSubjectClass[] =
  Object.values(L12FinalAuditSubjectClass);

export enum L12FinalAuditSeverity {
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

const CRITICAL_CODES: ReadonlySet<L12FinalViolationCode> = new Set([
  L12FinalViolationCode.L12F_PREDICTION_THEATER_BREACH,
  L12FinalViolationCode.L12F_RECOMMENDATION_LEAK,
  L12FinalViolationCode.L12F_FINAL_JUDGMENT_LEAK,
  L12FinalViolationCode.L12F_LOWER_LAYER_REBUILD_ALLOWED,
  L12FinalViolationCode.L12F_CRITICAL_BREACH_PRESENT,
  L12FinalViolationCode.L12F_RATIFICATION_ARTIFACT_INCOMPLETE,
  L12FinalViolationCode.L12F_PROHIBITED_EXTENSION,
  L12FinalViolationCode.L12F_WEAKENS_TRIGGER_REQUIREMENT,
  L12FinalViolationCode.L12F_WEAKENS_INVALIDATION_REQUIREMENT,
  L12FinalViolationCode.L12F_WEAKENS_NO_REBUILD_LAW,
  L12FinalViolationCode.L12F_FINGERPRINT_NON_DETERMINISTIC,
  L12FinalViolationCode.L12F_FREEZE_ACTIVATION_ILLEGAL,
  L12FinalViolationCode.L12F_DONE_DEFINITION_UNSATISFIED,
]);

const ERROR_CODES: ReadonlySet<L12FinalViolationCode> = new Set([
  L12FinalViolationCode.L12F_SUBLAYER_CERTIFICATION_MISSING,
  L12FinalViolationCode.L12F_CERTIFICATION_BAND_MISSING,
  L12FinalViolationCode.L12F_CERTIFICATION_BAND_FAILED,
  L12FinalViolationCode.L12F_INVARIANT_MISSING,
  L12FinalViolationCode.L12F_INVARIANT_FAILED,
  L12FinalViolationCode.L12F_FINGERPRINT_MISSING,
  L12FinalViolationCode.L12F_REPLAY_HASH_MISSING,
  L12FinalViolationCode.L12F_FROZEN_SURFACES_MISSING,
  L12FinalViolationCode.L12F_ROLLOUT_GATE_ILLEGAL,
  L12FinalViolationCode.L12F_ROLLOUT_LEVEL_TOO_LOW,
  L12FinalViolationCode.L12F_L13_HANDOFF_NOT_APPROVED,
  L12FinalViolationCode.L12F_DOWNSTREAM_DEPENDENCY_INVALID,
  L12FinalViolationCode.L12F_TRIGGER_LAW_NOT_CERTIFIED,
  L12FinalViolationCode.L12F_INVALIDATION_LAW_NOT_CERTIFIED,
  L12FinalViolationCode.L12F_CONFIDENCE_CAP_LAW_NOT_CERTIFIED,
  L12FinalViolationCode.L12F_L11_SCORE_CONTEXT_LAW_NOT_CERTIFIED,
  L12FinalViolationCode.L12F_L5_PERSISTENCE_LAW_NOT_CERTIFIED,
  L12FinalViolationCode.L12F_REPLAY_LAW_NOT_CERTIFIED,
  L12FinalViolationCode.L12F_REPAIR_LAW_NOT_CERTIFIED,
  L12FinalViolationCode.L12F_COMPLETION_CLAUSE_UNSATISFIED,
  L12FinalViolationCode.L12F_FREEZE_POLICY_INACTIVE,
  L12FinalViolationCode.L12F_EXTENSION_REQUIRES_RECERT,
  L12FinalViolationCode.L12F_ROLLOUT_FLAG_MISSING,
]);

export function severityForL12FinalViolationCode(
  code: L12FinalViolationCode,
): L12FinalAuditSeverity {
  if (CRITICAL_CODES.has(code)) return L12FinalAuditSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L12FinalAuditSeverity.ERROR;
  return L12FinalAuditSeverity.WARNING;
}

export interface L12FinalAuditIssue {
  readonly code: L12FinalViolationCode;
  readonly message: string;
  readonly subject_ref?: string;
}

export interface L12FinalAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L12FinalAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L12FinalViolationCode;
  readonly severity: L12FinalAuditSeverity;
  readonly explanation: string;
  readonly emitted_at: string;
}

export function makeL12FinalAuditRecord(
  subject_class: L12FinalAuditSubjectClass,
  subject_ref: string,
  issue: L12FinalAuditIssue,
  emitted_at: string,
): L12FinalAuditRecord {
  return {
    audit_id: deterministicL12FinalAuditId(
      subject_class, subject_ref, issue.code, emitted_at),
    subject_class,
    subject_ref,
    violation_code: issue.code,
    severity: severityForL12FinalViolationCode(issue.code),
    explanation: issue.message,
    emitted_at,
  };
}

export function emitL12FinalAuditRecords(
  subject_class: L12FinalAuditSubjectClass,
  subject_ref: string,
  issues: readonly L12FinalAuditIssue[],
  emitted_at: string,
): readonly L12FinalAuditRecord[] {
  return issues.map(i =>
    makeL12FinalAuditRecord(
      subject_class, i.subject_ref ?? subject_ref, i, emitted_at));
}

function deterministicL12FinalAuditId(
  subject_class: L12FinalAuditSubjectClass,
  subject_ref: string,
  code: L12FinalViolationCode,
  emitted_at: string,
): string {
  const seed = `${subject_class}::${subject_ref}::${code}::${emitted_at}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `l12r.audit.${h.toString(16).padStart(8, '0')}`;
}
