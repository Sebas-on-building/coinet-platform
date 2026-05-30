/**
 * L13.10 — Persistence / Feedback Audit Surface
 *
 * §13.10.32 / §13.10.33 — Deterministic audit log for L13D
 * persistence and feedback violations. Distinct from L13.3's
 * L13M output audit; this audit owns the durability surface.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13PersistenceFeedbackViolationCode } from '../validation/l13-persistence-feedback-violation-codes';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.persistence.v1';

export enum L13PersistenceFeedbackAuditSubjectClass {
  PERSISTENCE_ENVELOPE = 'PERSISTENCE_ENVELOPE',
  CURRENT_OUTPUT_RECORD = 'CURRENT_OUTPUT_RECORD',
  HISTORICAL_OUTPUT_FACT = 'HISTORICAL_OUTPUT_FACT',
  USER_FEEDBACK_RECORD = 'USER_FEEDBACK_RECORD',
  FEEDBACK_SUMMARY_RECORD = 'FEEDBACK_SUMMARY_RECORD',
  OUTPUT_QUALITY_METRIC = 'OUTPUT_QUALITY_METRIC',
  OUTPUT_QUALITY_EVALUATION = 'OUTPUT_QUALITY_EVALUATION',
  OUTPUT_FAILURE_RECORD = 'OUTPUT_FAILURE_RECORD',
  READ_SURFACE = 'READ_SURFACE',
  L5_PERSISTENCE_ROUTE = 'L5_PERSISTENCE_ROUTE',
  INVARIANT = 'INVARIANT',
}

export const ALL_L13_PERSISTENCE_FEEDBACK_AUDIT_SUBJECT_CLASSES:
  readonly L13PersistenceFeedbackAuditSubjectClass[] =
  Object.values(L13PersistenceFeedbackAuditSubjectClass);

export interface L13PersistenceFeedbackAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L13PersistenceFeedbackAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L13PersistenceFeedbackViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
  readonly blocking: boolean;
  readonly output_id?: string;
  readonly runtime_run_id?: string;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly created_at: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

const C = L13PersistenceFeedbackViolationCode;

const CRITICAL = new Set<L13PersistenceFeedbackViolationCode>([
  C.L13D_PERSISTENCE_ENVELOPE_MISSING,
  C.L13D_L5_ROUTE_MISSING,
  C.L13D_DIRECT_WRITE_ATTEMPT,
  C.L13D_STORAGE_AUTHORITY_ILLEGAL,
  C.L13D_INPUT_PACKAGE_NOT_PERSISTED,
  C.L13D_OUTPUT_NOT_PERSISTED,
  C.L13D_MODEL_RUN_NOT_PERSISTED,
  C.L13D_MODEL_RESPONSE_ARTIFACT_NOT_PERSISTED,
  C.L13D_SAFETY_GATE_RESULT_NOT_PERSISTED,
  C.L13D_FINAL_GATE_RESULT_NOT_PERSISTED,
  C.L13D_HISTORICAL_FACT_MUTATION_ATTEMPT,
  C.L13D_CURRENT_OUTPUT_AUTHORITY_MISSING,
  C.L13D_CURRENT_OUTPUT_SUPERSESSION_ILLEGAL,
  C.L13D_AUDIT_EVENT_NOT_DETERMINISTIC,
  C.L13D_OUTPUT_FAILURE_NOT_RECORDED,
  C.L13D_REPLAY_HASH_MISSING,
  C.L13D_QUALITY_METRIC_DEFINITION_INVALID,
  C.L13D_QUALITY_EVALUATION_MISSING,
  C.L13D_READ_SURFACE_UNREGISTERED,
  C.L13D_READ_SURFACE_EXPOSES_RAW_AUTHORITY,
  C.L13D_FEEDBACK_OUTPUT_REF_MISSING,
  C.L13D_FEEDBACK_RECORD_INVALID,
]);

const ERROR_CODES = new Set<L13PersistenceFeedbackViolationCode>([
  C.L13D_GROUNDED_CLAIM_NOT_PERSISTED,
  C.L13D_BLOCKED_CLAIM_NOT_PERSISTED,
  C.L13D_HISTORICAL_FACT_APPEND_MISSING,
  C.L13D_FEEDBACK_REASON_CODES_MISSING,
  C.L13D_FEEDBACK_SUMMARY_NOT_RECOMPUTABLE,
  C.L13D_QUALITY_METRIC_DENOMINATOR_INVALID,
  C.L13D_LINEAGE_MISSING,
]);

export function severityForL13PersistenceFeedbackCode(
  code: L13PersistenceFeedbackViolationCode,
): L13ViolationSeverity {
  if (CRITICAL.has(code)) return L13ViolationSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L13ViolationSeverity.ERROR;
  return L13ViolationSeverity.WARNING;
}

export function isL13PersistenceFeedbackBlockingCode(
  code: L13PersistenceFeedbackViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L13PersistenceFeedbackAuditRecord[] = [];

export function resetL13PersistenceFeedbackAuditLog(): void {
  auditLog.length = 0;
}

export interface L13PersistenceFeedbackAuditEmissionInput {
  readonly subjectClass: L13PersistenceFeedbackAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCode: L13PersistenceFeedbackViolationCode;
  readonly message: string;
  readonly outputId?: string;
  readonly runtimeRunId?: string;
  readonly evidenceRefs?: readonly string[];
  readonly lineageRefs?: readonly string[];
  readonly createdAt?: string;
}

export function emitL13PersistenceFeedbackAuditRecord(
  input: L13PersistenceFeedbackAuditEmissionInput,
): L13PersistenceFeedbackAuditRecord {
  const evidence = input.evidenceRefs ?? [];
  const lineage = input.lineageRefs ?? [];
  const replayHash = fnv1a(
    [
      input.subjectClass,
      input.subjectRef,
      input.violationCode,
      input.message,
      input.outputId ?? '',
      input.runtimeRunId ?? '',
      evidence.join(','),
      lineage.join(','),
      POLICY_V,
    ].join('|'),
  );
  const record: L13PersistenceFeedbackAuditRecord = {
    audit_id: `l13d.audit.${replayHash}`,
    subject_class: input.subjectClass,
    subject_ref: input.subjectRef,
    violation_code: input.violationCode,
    severity: severityForL13PersistenceFeedbackCode(input.violationCode),
    message: input.message,
    blocking: isL13PersistenceFeedbackBlockingCode(input.violationCode),
    output_id: input.outputId,
    runtime_run_id: input.runtimeRunId,
    evidence_refs: evidence,
    lineage_refs: lineage,
    created_at: input.createdAt ?? new Date().toISOString(),
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  auditLog.push(record);
  return record;
}

export function getL13PersistenceFeedbackAuditLog():
  readonly L13PersistenceFeedbackAuditRecord[] {
  return [...auditLog];
}

export function getL13PersistenceFeedbackCriticalViolations():
  readonly L13PersistenceFeedbackAuditRecord[] {
  return auditLog.filter(
    r => r.severity === L13ViolationSeverity.CRITICAL,
  );
}

export function getL13PersistenceFeedbackBlockingViolations():
  readonly L13PersistenceFeedbackAuditRecord[] {
  return auditLog.filter(r => r.blocking);
}

export function getL13PersistenceFeedbackViolationsByCode(
  code: L13PersistenceFeedbackViolationCode,
): readonly L13PersistenceFeedbackAuditRecord[] {
  return auditLog.filter(r => r.violation_code === code);
}

export function getL13PersistenceFeedbackViolationsByOutputId(
  outputId: string,
): readonly L13PersistenceFeedbackAuditRecord[] {
  return auditLog.filter(r => r.output_id === outputId);
}

export function getL13PersistenceFeedbackViolationsByRunId(
  runId: string,
): readonly L13PersistenceFeedbackAuditRecord[] {
  return auditLog.filter(r => r.runtime_run_id === runId);
}
