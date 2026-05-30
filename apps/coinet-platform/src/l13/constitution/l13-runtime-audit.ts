/**
 * L13.6 — Runtime Audit Surface
 *
 * §13.6.23 — Deterministic runtime governance audit. Mirrors the
 * L13.5 expression-governance audit pattern. Audit records are
 * stored in an in-memory log; persistence is a downstream concern.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13RuntimeViolationCode } from '../validation/l13-runtime-violation-codes';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.runtime.v1';

/**
 * §13.6.23 — Runtime audit subject classes.
 */
export enum L13RuntimeAuditSubjectClass {
  INTENT_CLASSIFICATION = 'INTENT_CLASSIFICATION',
  SCOPE_RESOLUTION = 'SCOPE_RESOLUTION',
  READ_PLAN = 'READ_PLAN',
  INPUT_PACKAGE_GATE = 'INPUT_PACKAGE_GATE',
  PROMPT_TEMPLATE = 'PROMPT_TEMPLATE',
  PROMPT_ASSEMBLY = 'PROMPT_ASSEMBLY',
  MODEL_GATEWAY_REQUEST = 'MODEL_GATEWAY_REQUEST',
  MODEL_GATEWAY_RESPONSE = 'MODEL_GATEWAY_RESPONSE',
  DRAFT_OUTPUT = 'DRAFT_OUTPUT',
  POSTPROCESSOR = 'POSTPROCESSOR',
  REWRITE_REQUEST = 'REWRITE_REQUEST',
  REFUSAL_ENVELOPE = 'REFUSAL_ENVELOPE',
  FINAL_OUTPUT_GATE = 'FINAL_OUTPUT_GATE',
  RUNTIME_RUN_RECORD = 'RUNTIME_RUN_RECORD',
  INVARIANT = 'INVARIANT',
}

export const ALL_L13_RUNTIME_AUDIT_SUBJECT_CLASSES:
  readonly L13RuntimeAuditSubjectClass[] =
  Object.values(L13RuntimeAuditSubjectClass);

export interface L13RuntimeAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L13RuntimeAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L13RuntimeViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
  readonly blocking: boolean;
  readonly request_id?: string;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly created_at: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

const CRITICAL = new Set<L13RuntimeViolationCode>([
  L13RuntimeViolationCode.L13R_INTENT_CLASSIFICATION_MISSING,
  L13RuntimeViolationCode.L13R_OUT_OF_SCOPE_CONTINUED_TO_MODEL,
  L13RuntimeViolationCode.L13R_SCOPE_RESOLUTION_MISSING,
  L13RuntimeViolationCode.L13R_AMBIGUOUS_SCOPE_CONTINUED,
  L13RuntimeViolationCode.L13R_READ_PLAN_MISSING,
  L13RuntimeViolationCode.L13R_ILLEGAL_READ_SURFACE_SELECTED,
  L13RuntimeViolationCode.L13R_REQUIRED_SURFACE_MISSING,
  L13RuntimeViolationCode.L13R_INPUT_PACKAGE_MISSING,
  L13RuntimeViolationCode.L13R_INPUT_PACKAGE_BLOCKED_BUT_MODEL_CALLED,
  L13RuntimeViolationCode.L13R_PROMPT_TEMPLATE_MISSING,
  L13RuntimeViolationCode.L13R_PROMPT_TEMPLATE_UNAPPROVED,
  L13RuntimeViolationCode.L13R_PROMPT_POLICY_BLOCK_MISSING,
  L13RuntimeViolationCode.L13R_PROMPT_ASSEMBLY_MISSING,
  L13RuntimeViolationCode.L13R_RAW_LOWER_LAYER_DATA_IN_PROMPT,
  L13RuntimeViolationCode.L13R_MODEL_GATEWAY_INPUT_PACKAGE_MISSING,
  L13RuntimeViolationCode.L13R_MODEL_GATEWAY_POLICY_REF_MISSING,
  L13RuntimeViolationCode.L13R_MODEL_GATEWAY_TEMPERATURE_ILLEGAL,
  L13RuntimeViolationCode.L13R_MODEL_GATEWAY_RAW_BYPASS,
  L13RuntimeViolationCode.L13R_OUTPUT_OBJECT_BUILD_SKIPPED,
  L13RuntimeViolationCode.L13R_GROUNDING_PASS_SKIPPED,
  L13RuntimeViolationCode.L13R_EXPRESSION_PASS_SKIPPED,
  L13RuntimeViolationCode.L13R_ILLEGAL_OUTPUT_REACHED_FINAL_GATE,
  L13RuntimeViolationCode.L13R_FINAL_GATE_BYPASSED,
  L13RuntimeViolationCode.L13R_FINAL_GATE_EMITTED_BLOCKED_OUTPUT,
  L13RuntimeViolationCode.L13R_REWRITE_REQUIRED_BUT_SKIPPED,
  L13RuntimeViolationCode.L13R_REWRITE_ATTEMPT_LIMIT_EXCEEDED,
  L13RuntimeViolationCode.L13R_REFUSAL_REQUIRED_BUT_NOT_EMITTED,
  L13RuntimeViolationCode.L13R_RUNTIME_REPLAY_HASH_MISSING,
  L13RuntimeViolationCode.L13R_CAPTURED_RESPONSE_REPLAY_MISMATCH,
  L13RuntimeViolationCode.L13R_STAGE_BYPASS_DETECTED,
  L13RuntimeViolationCode.L13R_REFUSAL_ENVELOPE_INVALID,
]);

const ERROR_CODES = new Set<L13RuntimeViolationCode>([
  L13RuntimeViolationCode.L13R_MODEL_RESPONSE_NOT_CAPTURED,
  L13RuntimeViolationCode.L13R_DRAFT_PARSE_FAILED,
  L13RuntimeViolationCode.L13R_RUNTIME_LINEAGE_MISSING,
  L13RuntimeViolationCode.L13R_INTENT_CLASSIFICATION_NONDETERMINISTIC,
]);

export function severityForL13RuntimeCode(
  code: L13RuntimeViolationCode,
): L13ViolationSeverity {
  if (CRITICAL.has(code)) return L13ViolationSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L13ViolationSeverity.ERROR;
  return L13ViolationSeverity.WARNING;
}

export function isL13RuntimeBlockingCode(
  code: L13RuntimeViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L13RuntimeAuditRecord[] = [];

export function resetL13RuntimeAuditLog(): void {
  auditLog.length = 0;
}

export interface L13RuntimeAuditEmissionInput {
  readonly subjectClass: L13RuntimeAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCode: L13RuntimeViolationCode;
  readonly message: string;
  readonly requestId?: string;
  readonly evidenceRefs?: readonly string[];
  readonly lineageRefs?: readonly string[];
  readonly createdAt?: string;
}

export function emitL13RuntimeAuditRecord(
  input: L13RuntimeAuditEmissionInput,
): L13RuntimeAuditRecord {
  const evidence = input.evidenceRefs ?? [];
  const lineage = input.lineageRefs ?? [];
  const replayHash = fnv1a(
    [
      input.subjectClass,
      input.subjectRef,
      input.violationCode,
      input.message,
      input.requestId ?? '',
      evidence.join(','),
      lineage.join(','),
      POLICY_V,
    ].join('|'),
  );
  const record: L13RuntimeAuditRecord = {
    audit_id: `l13r.audit.${replayHash}`,
    subject_class: input.subjectClass,
    subject_ref: input.subjectRef,
    violation_code: input.violationCode,
    severity: severityForL13RuntimeCode(input.violationCode),
    message: input.message,
    blocking: isL13RuntimeBlockingCode(input.violationCode),
    request_id: input.requestId,
    evidence_refs: evidence,
    lineage_refs: lineage,
    created_at: input.createdAt ?? new Date().toISOString(),
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  auditLog.push(record);
  return record;
}

export function getL13RuntimeAuditLog():
  readonly L13RuntimeAuditRecord[] {
  return [...auditLog];
}

export function getL13RuntimeCriticalViolations():
  readonly L13RuntimeAuditRecord[] {
  return auditLog.filter(
    r => r.severity === L13ViolationSeverity.CRITICAL,
  );
}

export function getL13RuntimeBlockingViolations():
  readonly L13RuntimeAuditRecord[] {
  return auditLog.filter(r => r.blocking);
}

export function getL13RuntimeViolationsByCode(
  code: L13RuntimeViolationCode,
): readonly L13RuntimeAuditRecord[] {
  return auditLog.filter(r => r.violation_code === code);
}

export function getL13RuntimeViolationsByRequestId(
  requestId: string,
): readonly L13RuntimeAuditRecord[] {
  return auditLog.filter(r => r.request_id === requestId);
}

export function hasAnyL13RuntimeViolations(): boolean {
  return auditLog.length > 0;
}
