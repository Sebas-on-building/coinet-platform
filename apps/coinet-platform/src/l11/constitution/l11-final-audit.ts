/**
 * L11.9 — Final Audit Surface (§11.9.18)
 *
 * Deterministic `l11r.audit.…` emitter for L11.9 (closure-time)
 * findings. The L11.9 namespace covers:
 *
 *   COMPLETION_STANDARD, LAYER_INVENTORY, FREEZE_POLICY,
 *   EXTENSION_POLICY, DOWNSTREAM_DEPENDENCY, CERTIFICATION_BAND,
 *   ROLLOUT_GATE, ROLLBACK_POLICY, FAILURE_PLAYBOOK,
 *   RATIFICATION_ARTIFACT, MASTER_INVARIANT
 *
 * Lower-sublayer audit events keep their existing namespaces
 * (`l11.audit.`, `l11d.audit.`, `l11f.audit.`, `l11a.audit.`,
 * `l11m.audit.`, `l11c.audit.`, `l11g.audit.`, `l11p.audit.`).
 */

export const L11_FINAL_AUDIT_POLICY_VERSION = 'l11.9.final-audit.v1';

export enum L11FinalAuditSubjectClass {
  COMPLETION_STANDARD = 'COMPLETION_STANDARD',
  LAYER_INVENTORY = 'LAYER_INVENTORY',
  FREEZE_POLICY = 'FREEZE_POLICY',
  EXTENSION_POLICY = 'EXTENSION_POLICY',
  DOWNSTREAM_DEPENDENCY = 'DOWNSTREAM_DEPENDENCY',
  CERTIFICATION_BAND = 'CERTIFICATION_BAND',
  ROLLOUT_GATE = 'ROLLOUT_GATE',
  ROLLBACK_POLICY = 'ROLLBACK_POLICY',
  FAILURE_PLAYBOOK = 'FAILURE_PLAYBOOK',
  RATIFICATION_ARTIFACT = 'RATIFICATION_ARTIFACT',
  MASTER_INVARIANT = 'MASTER_INVARIANT',
}

export const ALL_L11_FINAL_AUDIT_SUBJECT_CLASSES:
  readonly L11FinalAuditSubjectClass[] =
  Object.values(L11FinalAuditSubjectClass);

export enum L11FinalAuditSeverity {
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export enum L11FinalAuditCode {
  L11R_MISSING_SUBLAYER = 'L11R_MISSING_SUBLAYER',
  L11R_PRODUCTION_GREEN_WITH_FAILING_BAND =
    'L11R_PRODUCTION_GREEN_WITH_FAILING_BAND',
  L11R_FREEZE_POLICY_MISSING = 'L11R_FREEZE_POLICY_MISSING',
  L11R_DOWNSTREAM_RECOMPUTE_ALLOWED = 'L11R_DOWNSTREAM_RECOMPUTE_ALLOWED',
  L11R_ARTIFACT_FINGERPRINT_MISSING = 'L11R_ARTIFACT_FINGERPRINT_MISSING',
  L11R_ROLLOUT_WITH_CRITICAL_BREACH = 'L11R_ROLLOUT_WITH_CRITICAL_BREACH',
  L11R_FAILURE_PLAYBOOK_MISSING = 'L11R_FAILURE_PLAYBOOK_MISSING',
  L11R_EXTENSION_POLICY_MISSING = 'L11R_EXTENSION_POLICY_MISSING',
  L11R_COMPLETION_CLAUSE_UNSATISFIED = 'L11R_COMPLETION_CLAUSE_UNSATISFIED',
  L11R_DEPENDENCY_CONTRACT_INVALID = 'L11R_DEPENDENCY_CONTRACT_INVALID',
  L11R_BAND_FAILED = 'L11R_BAND_FAILED',
  L11R_INVARIANT_FAILED = 'L11R_INVARIANT_FAILED',
  L11R_FREEZE_ACTIVATED_BEFORE_PRODUCTION_GREEN =
    'L11R_FREEZE_ACTIVATED_BEFORE_PRODUCTION_GREEN',
  L11R_FINGERPRINT_NON_DETERMINISTIC = 'L11R_FINGERPRINT_NON_DETERMINISTIC',
  L11R_NON_DUPLICATION_VIOLATION = 'L11R_NON_DUPLICATION_VIOLATION',
}

export const ALL_L11_FINAL_AUDIT_CODES:
  readonly L11FinalAuditCode[] = Object.values(L11FinalAuditCode);

const CRITICAL_CODES: ReadonlySet<L11FinalAuditCode> = new Set([
  L11FinalAuditCode.L11R_MISSING_SUBLAYER,
  L11FinalAuditCode.L11R_PRODUCTION_GREEN_WITH_FAILING_BAND,
  L11FinalAuditCode.L11R_FREEZE_POLICY_MISSING,
  L11FinalAuditCode.L11R_DOWNSTREAM_RECOMPUTE_ALLOWED,
  L11FinalAuditCode.L11R_ARTIFACT_FINGERPRINT_MISSING,
  L11FinalAuditCode.L11R_ROLLOUT_WITH_CRITICAL_BREACH,
  L11FinalAuditCode.L11R_FREEZE_ACTIVATED_BEFORE_PRODUCTION_GREEN,
  L11FinalAuditCode.L11R_FINGERPRINT_NON_DETERMINISTIC,
  L11FinalAuditCode.L11R_NON_DUPLICATION_VIOLATION,
]);

const ERROR_CODES: ReadonlySet<L11FinalAuditCode> = new Set([
  L11FinalAuditCode.L11R_FAILURE_PLAYBOOK_MISSING,
  L11FinalAuditCode.L11R_EXTENSION_POLICY_MISSING,
  L11FinalAuditCode.L11R_COMPLETION_CLAUSE_UNSATISFIED,
  L11FinalAuditCode.L11R_DEPENDENCY_CONTRACT_INVALID,
  L11FinalAuditCode.L11R_BAND_FAILED,
  L11FinalAuditCode.L11R_INVARIANT_FAILED,
]);

export function severityForL11FinalAuditCode(
  code: L11FinalAuditCode,
): L11FinalAuditSeverity {
  if (CRITICAL_CODES.has(code)) return L11FinalAuditSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L11FinalAuditSeverity.ERROR;
  return L11FinalAuditSeverity.WARNING;
}

export interface L11FinalAuditIssue {
  readonly code: L11FinalAuditCode;
  readonly message: string;
  readonly subject_ref?: string;
}

export interface L11FinalAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L11FinalAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L11FinalAuditCode;
  readonly severity: L11FinalAuditSeverity;
  readonly explanation: string;
  readonly emitted_at: string;
}

export function makeL11FinalAuditRecord(
  subject_class: L11FinalAuditSubjectClass,
  subject_ref: string,
  issue: L11FinalAuditIssue,
  emitted_at: string,
): L11FinalAuditRecord {
  return {
    audit_id: deterministicL11FinalAuditId(
      subject_class, subject_ref, issue.code, emitted_at),
    subject_class,
    subject_ref,
    violation_code: issue.code,
    severity: severityForL11FinalAuditCode(issue.code),
    explanation: issue.message,
    emitted_at,
  };
}

export function emitL11FinalAuditRecords(
  subject_class: L11FinalAuditSubjectClass,
  subject_ref: string,
  issues: readonly L11FinalAuditIssue[],
  emitted_at: string,
): readonly L11FinalAuditRecord[] {
  return issues.map(i =>
    makeL11FinalAuditRecord(subject_class, i.subject_ref ?? subject_ref,
      i, emitted_at));
}

function deterministicL11FinalAuditId(
  subject_class: L11FinalAuditSubjectClass,
  subject_ref: string,
  code: L11FinalAuditCode,
  emitted_at: string,
): string {
  const seed = `${subject_class}::${subject_ref}::${code}::${emitted_at}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `l11r.audit.${h.toString(16).padStart(8, '0')}`;
}
