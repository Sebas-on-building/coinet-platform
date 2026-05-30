/**
 * L14.10 — Final Audit Surface
 *
 * §14.10.49 — Deterministic audit log for L14F findings.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import { L14FinalViolationCode } from '../validation/l14-final-violation-codes';
import { fnv1a } from '../../l13/context/_fnv1a';

const POLICY_V = 'l14.final.v1';

export enum L14FinalAuditSubjectClass {
  FINAL_DEFINITION = 'FINAL_DEFINITION',
  COMPLETION_STANDARD = 'COMPLETION_STANDARD',
  CERTIFICATION_REPORT = 'CERTIFICATION_REPORT',
  CERTIFICATION_LEVEL = 'CERTIFICATION_LEVEL',
  FREEZE_POLICY = 'FREEZE_POLICY',
  EXTENSION_CLASSIFICATION = 'EXTENSION_CLASSIFICATION',
  ROLLOUT_GATE = 'ROLLOUT_GATE',
  ROLLBACK_POLICY = 'ROLLBACK_POLICY',
  FAILURE_PLAYBOOK = 'FAILURE_PLAYBOOK',
  RATIFICATION_ARTIFACT = 'RATIFICATION_ARTIFACT',
  ARCHITECTURE_COMPLETION_ARTIFACT = 'ARCHITECTURE_COMPLETION_ARTIFACT',
  FINAL_INVARIANT = 'FINAL_INVARIANT',
}

export interface L14FinalAuditRecord {
  readonly audit_id: string;
  readonly audit_subject_class: L14FinalAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_codes: readonly L14FinalViolationCode[];
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly blocking: boolean;
  readonly message: string;
  readonly emitted_at: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

const C = L14FinalViolationCode;

const CRITICAL = new Set<L14FinalViolationCode>([
  C.L14F_FINAL_INVARIANT_FAILED,
  C.L14F_ROLLOUT_GATE_NOT_APPROVED,
  C.L14F_FREEZE_NOT_ACTIVATED,
  C.L14F_RATIFICATION_ARTIFACT_BLOCKED,
  C.L14F_ARCHITECTURE_COMPLETION_BLOCKED,
  C.L14F_CRITICAL_BREACH_PRESENT,
  C.L14F_PUSH_RESERVED_STATUS_NOT_PRESERVED,
  C.L14F_TELEGRAM_GATE_NOT_VALID,
  C.L14F_USER_CONTROL_LAW_NOT_VALID,
  C.L14F_EXPERIMENT_NON_CORRUPTION_NOT_VALID,
  C.L14F_CALIBRATION_NON_AUTO_MUTATION_NOT_VALID,
  C.L14F_REPLAY_REPAIR_HONESTY_NOT_VALID,
  C.L14F_PROHIBITED_POST_FREEZE_CHANGE,
  C.L14F_FINAL_DEFINITION_MISSING,
  C.L14F_COMPLETION_STANDARD_MISSING,
]);

const ERROR_CODES = new Set<L14FinalViolationCode>([
  C.L14F_REQUIRED_SUBLAYER_NOT_GREEN,
  C.L14F_REQUIRED_BAND_NOT_GREEN,
  C.L14F_EXTERNAL_REGRESSION_FAILED,
  C.L14F_FINAL_FINGERPRINT_UNSTABLE,
  C.L14F_UPSTREAM_FINGERPRINT_MISSING,
  C.L14F_EXTENSION_CLASSIFICATION_MISSING,
  C.L14F_AUDIT_EVENT_NOT_DETERMINISTIC,
]);

export function severityForL14FinalCode(
  code: L14FinalViolationCode,
): L14ConstitutionalAuditSeverity {
  if (CRITICAL.has(code)) return L14ConstitutionalAuditSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L14ConstitutionalAuditSeverity.ERROR;
  return L14ConstitutionalAuditSeverity.WARNING;
}

export function isL14FinalBlockingCode(code: L14FinalViolationCode): boolean {
  return CRITICAL.has(code);
}

const auditLog: L14FinalAuditRecord[] = [];

export function resetL14FinalAuditLog(): void {
  auditLog.length = 0;
}

export interface L14FinalAuditEmissionInput {
  readonly subjectClass: L14FinalAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCodes: readonly L14FinalViolationCode[];
  readonly message: string;
  readonly lineageRefs?: readonly string[];
  readonly emittedAt?: string;
}

function aggregateSeverity(codes: readonly L14FinalViolationCode[]): L14ConstitutionalAuditSeverity {
  let top: L14ConstitutionalAuditSeverity = L14ConstitutionalAuditSeverity.WARNING;
  for (const c of codes) {
    const s = severityForL14FinalCode(c);
    if (s === L14ConstitutionalAuditSeverity.CRITICAL) return s;
    if (s === L14ConstitutionalAuditSeverity.ERROR) top = L14ConstitutionalAuditSeverity.ERROR;
  }
  return top;
}

export function emitL14FinalAuditRecord(
  input: L14FinalAuditEmissionInput,
): L14FinalAuditRecord {
  const lineage = input.lineageRefs ?? ['l14.final.lineage'];
  const sortedCodes = [...input.violationCodes].sort();
  const severity = aggregateSeverity(sortedCodes);
  const blocking = sortedCodes.some(c => isL14FinalBlockingCode(c));
  const replayHash = fnv1a([
    input.subjectClass, input.subjectRef, sortedCodes.join(','), input.message,
    severity, String(blocking), lineage.join(','), POLICY_V,
  ].join('|'));
  const record: L14FinalAuditRecord = {
    audit_id: `l14f.audit.${replayHash}`,
    audit_subject_class: input.subjectClass,
    subject_ref: input.subjectRef,
    violation_codes: sortedCodes,
    severity,
    blocking,
    message: input.message,
    emitted_at: input.emittedAt ?? new Date().toISOString(),
    lineage_refs: lineage,
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
  auditLog.push(record);
  return record;
}

export function getL14FinalAuditLog(): readonly L14FinalAuditRecord[] {
  return [...auditLog];
}

export function getL14FinalCriticalViolations(): readonly L14FinalAuditRecord[] {
  return auditLog.filter(r => r.severity === L14ConstitutionalAuditSeverity.CRITICAL);
}
