/**
 * L13.12 — Final Audit Surface
 *
 * §13.12.18 — Deterministic audit log for L13F final-layer
 * findings (ratification, freeze, rollout, handoff).
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13FinalViolationCode } from '../validation/l13-final-violation-codes';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.final.v1';

export enum L13FinalAuditSubjectClass {
  FINAL_DEFINITION = 'FINAL_DEFINITION',
  COMPLETION_STANDARD = 'COMPLETION_STANDARD',
  CERTIFICATION_REPORT = 'CERTIFICATION_REPORT',
  RATIFICATION_ARTIFACT = 'RATIFICATION_ARTIFACT',
  FREEZE_POLICY = 'FREEZE_POLICY',
  EXTENSION_POLICY = 'EXTENSION_POLICY',
  ROLLOUT_GATE = 'ROLLOUT_GATE',
  ROLLBACK_POLICY = 'ROLLBACK_POLICY',
  FAILURE_PLAYBOOK = 'FAILURE_PLAYBOOK',
  L14_HANDOFF = 'L14_HANDOFF',
  FINAL_INVARIANT = 'FINAL_INVARIANT',
}

export interface L13FinalAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L13FinalAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L13FinalViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
  readonly blocking: boolean;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly created_at: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

const C = L13FinalViolationCode;

const CRITICAL = new Set<L13FinalViolationCode>([
  C.L13F_FINAL_DEFINITION_MISSING,
  C.L13F_COMPLETION_STANDARD_MISSING,
  C.L13F_REQUIRED_SUBLAYER_NOT_GREEN,
  C.L13F_REQUIRED_BAND_NOT_GREEN,
  C.L13F_FINAL_INVARIANT_NOT_GREEN,
  C.L13F_CERTIFICATION_REPORT_MISSING,
  C.L13F_CERTIFICATION_LEVEL_ILLEGAL,
  C.L13F_CRITICAL_VIOLATION_COUNT_NONZERO,
  C.L13F_ROLLOUT_BLOCKING_REGRESSION_NONZERO,
  C.L13F_RATIFICATION_ARTIFACT_MISSING,
  C.L13F_RATIFICATION_FINGERPRINT_MISSING,
  C.L13F_RATIFICATION_EMITTED_BEFORE_GREEN,
  C.L13F_ROLLOUT_GATE_NOT_APPROVED,
  C.L13F_FREEZE_POLICY_MISSING,
  C.L13F_FREEZE_ACTIVATED_WITHOUT_GREEN,
  C.L13F_PROHIBITED_EXTENSION_ALLOWED,
  C.L13F_L14_HANDOFF_NOT_APPROVED,
  C.L13F_L14_REBUILD_ALLOWANCE_DETECTED,
  C.L13F_FINAL_AUDIT_NONDETERMINISTIC,
  C.L13F_REPLAY_HASH_MISSING,
]);

const ERROR_CODES = new Set<L13FinalViolationCode>([
  C.L13F_ROLLBACK_POLICY_MISSING,
  C.L13F_FAILURE_PLAYBOOKS_MISSING,
  C.L13F_LINEAGE_MISSING,
]);

export function severityForL13FinalCode(
  code: L13FinalViolationCode,
): L13ViolationSeverity {
  if (CRITICAL.has(code)) return L13ViolationSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L13ViolationSeverity.ERROR;
  return L13ViolationSeverity.WARNING;
}

export function isL13FinalBlockingCode(
  code: L13FinalViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L13FinalAuditRecord[] = [];

export function resetL13FinalAuditLog(): void {
  auditLog.length = 0;
}

export interface L13FinalAuditEmissionInput {
  readonly subjectClass: L13FinalAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCode: L13FinalViolationCode;
  readonly message: string;
  readonly evidenceRefs?: readonly string[];
  readonly lineageRefs?: readonly string[];
  readonly createdAt?: string;
}

export function emitL13FinalAuditRecord(
  input: L13FinalAuditEmissionInput,
): L13FinalAuditRecord {
  const evidence = input.evidenceRefs ?? [];
  const lineage = input.lineageRefs ?? [];
  const replayHash = fnv1a(
    [
      input.subjectClass,
      input.subjectRef,
      input.violationCode,
      input.message,
      evidence.join(','),
      lineage.join(','),
      POLICY_V,
    ].join('|'),
  );
  const record: L13FinalAuditRecord = {
    audit_id: `l13f.audit.${replayHash}`,
    subject_class: input.subjectClass,
    subject_ref: input.subjectRef,
    violation_code: input.violationCode,
    severity: severityForL13FinalCode(input.violationCode),
    message: input.message,
    blocking: isL13FinalBlockingCode(input.violationCode),
    evidence_refs: evidence,
    lineage_refs: lineage,
    created_at: input.createdAt ?? new Date().toISOString(),
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  auditLog.push(record);
  return record;
}

export function getL13FinalAuditLog():
  readonly L13FinalAuditRecord[] {
  return [...auditLog];
}

export function getL13FinalCriticalViolations():
  readonly L13FinalAuditRecord[] {
  return auditLog.filter(r => r.severity === L13ViolationSeverity.CRITICAL);
}
