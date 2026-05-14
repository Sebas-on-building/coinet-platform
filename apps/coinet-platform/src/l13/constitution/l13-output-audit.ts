/**
 * L13.3 — Output Audit Surface
 *
 * §13.3.19 — Deterministic audit log for AI output violations.
 * Mirrors the L13.1/L13.2 audit pattern.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13OutputViolationCode } from '../validation/l13-output-violation-codes';
import { fnv1a } from '../context/_fnv1a';

/**
 * §13.3.19 — Audit subject classes.
 */
export enum L13OutputAuditSubjectClass {
  AI_OUTPUT = 'AI_OUTPUT',
  OUTPUT_SECTION = 'OUTPUT_SECTION',
  CONFIDENCE_DISCLOSURE = 'CONFIDENCE_DISCLOSURE',
  RESTRICTION_DISCLOSURE = 'RESTRICTION_DISCLOSURE',
  BLOCKED_CLAIM = 'BLOCKED_CLAIM',
  MODEL_METADATA = 'MODEL_METADATA',
  OUTPUT_READINESS = 'OUTPUT_READINESS',
  SEMANTIC_LEAKAGE = 'SEMANTIC_LEAKAGE',
  REPLAY_IDENTITY = 'REPLAY_IDENTITY',
  INVARIANT = 'INVARIANT',
}

export const ALL_L13_OUTPUT_AUDIT_SUBJECT_CLASSES:
  readonly L13OutputAuditSubjectClass[] =
  Object.values(L13OutputAuditSubjectClass);

export interface L13OutputAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L13OutputAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L13OutputViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
  readonly blocking: boolean;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly created_at: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

const POLICY_V = 'l13.output.v1';

/**
 * §13.3.17 — Severity mapping.
 */
const CRITICAL_CODES = new Set<L13OutputViolationCode>([
  // identity
  L13OutputViolationCode.L13O_OUTPUT_ID_MISSING,
  L13OutputViolationCode.L13O_REQUEST_ID_MISSING,
  L13OutputViolationCode.L13O_INPUT_PACKAGE_REF_MISSING,
  L13OutputViolationCode.L13O_OUTPUT_CLASS_MISSING,
  L13OutputViolationCode.L13O_OUTPUT_CLASS_ILLEGAL,
  L13OutputViolationCode.L13O_ANSWER_MODE_MISSING,
  L13OutputViolationCode.L13O_SCOPE_MISSING,
  L13OutputViolationCode.L13O_AS_OF_MISSING,
  L13OutputViolationCode.L13O_POLICY_VERSION_MISSING,
  L13OutputViolationCode.L13O_REPLAY_HASH_MISSING,

  // content
  L13OutputViolationCode.L13O_HEADLINE_MISSING,
  L13OutputViolationCode.L13O_SUMMARY_MISSING,
  L13OutputViolationCode.L13O_OBSERVATION_SECTION_MISSING,
  L13OutputViolationCode.L13O_INFERENCE_SECTION_MISSING,
  L13OutputViolationCode.L13O_UNCERTAINTY_SECTION_MISSING,
  L13OutputViolationCode.L13O_CONTRADICTION_SECTION_MISSING,
  L13OutputViolationCode.L13O_SCENARIO_SECTION_MISSING,
  L13OutputViolationCode.L13O_TRIGGER_INVALIDATION_SECTION_MISSING,
  L13OutputViolationCode.L13O_CONFIDENCE_DISCLOSURE_MISSING,
  L13OutputViolationCode.L13O_RESTRICTION_DISCLOSURE_MISSING,

  // trace
  L13OutputViolationCode.L13O_EVIDENCE_REFS_MISSING,
  L13OutputViolationCode.L13O_LINEAGE_REFS_MISSING,
  L13OutputViolationCode.L13O_MODEL_METADATA_MISSING,

  // section discipline
  L13OutputViolationCode.L13O_OBSERVATION_INFERENCE_MIXED,
  L13OutputViolationCode.L13O_INFERENCE_PRESENTED_AS_FACT,
  L13OutputViolationCode.L13O_SECTION_REFS_MISSING,

  // adverse omission
  L13OutputViolationCode.L13O_CONTRADICTION_OMITTED,
  L13OutputViolationCode.L13O_UNCERTAINTY_OMITTED,
  L13OutputViolationCode.L13O_ACTIVE_INVALIDATION_OMITTED,
  L13OutputViolationCode.L13O_TRIGGER_CONTEXT_OMITTED,

  // semantic leakage
  L13OutputViolationCode.L13O_RECOMMENDATION_LEAK,
  L13OutputViolationCode.L13O_PREDICTION_THEATER,
  L13OutputViolationCode.L13O_FINAL_JUDGMENT_LEAK,
  L13OutputViolationCode.L13O_TRADE_ACTION_LEAK,
  L13OutputViolationCode.L13O_CERTAINTY_LEAK,
  L13OutputViolationCode.L13O_SCORE_AS_RECOMMENDATION,
  L13OutputViolationCode.L13O_SCENARIO_AS_CERTAINTY,
  L13OutputViolationCode.L13O_CONFIDENCE_AS_PROBABILITY,
  L13OutputViolationCode.L13O_HYPOTHESIS_AS_FINAL_TRUTH,

  // restriction
  L13OutputViolationCode.L13O_BLOCKED_ANSWER_MODE_VIOLATED,
  L13OutputViolationCode.L13O_RESTRICTION_BYPASS,

  // readiness
  L13OutputViolationCode.L13O_CLEAN_OUTPUT_UNDER_DISCLOSURE_REQUIREMENT,
  L13OutputViolationCode.L13O_BLOCKED_UNGROUNDED_EMITTED,
  L13OutputViolationCode.L13O_REFUSAL_NOT_REFUSAL_SHAPED,

  // disclosures
  L13OutputViolationCode.L13O_CONFIDENCE_DISCLOSURE_INVALID,
  L13OutputViolationCode.L13O_RESTRICTION_DISCLOSURE_INVALID,
]);

const ERROR_CODES = new Set<L13OutputViolationCode>([
  L13OutputViolationCode.L13O_SECTION_INVALID,
  L13OutputViolationCode.L13O_SECTION_CONTENT_EMPTY,
  L13OutputViolationCode.L13O_REPLAY_HASH_MISSING,
  L13OutputViolationCode.L13O_OUTPUT_READINESS_ILLEGAL,
  L13OutputViolationCode.L13O_UNSUPPORTED_CLAIM_PRESENT,
  L13OutputViolationCode.L13O_BLOCKED_CLAIM_NOT_RECORDED,
  L13OutputViolationCode.L13O_BLOCKED_CLAIM_INVALID,
  L13OutputViolationCode.L13O_MODEL_METADATA_INVALID,
]);

export function severityForL13OutputCode(
  code: L13OutputViolationCode,
): L13ViolationSeverity {
  if (CRITICAL_CODES.has(code)) return L13ViolationSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L13ViolationSeverity.ERROR;
  return L13ViolationSeverity.WARNING;
}

const BLOCKING_ERRORS = new Set<L13OutputViolationCode>([
  L13OutputViolationCode.L13O_REPLAY_HASH_MISSING,
  L13OutputViolationCode.L13O_OUTPUT_READINESS_ILLEGAL,
  L13OutputViolationCode.L13O_BLOCKED_CLAIM_NOT_RECORDED,
  L13OutputViolationCode.L13O_MODEL_METADATA_INVALID,
]);

export function isL13OutputBlockingCode(
  code: L13OutputViolationCode,
): boolean {
  if (CRITICAL_CODES.has(code)) return true;
  if (BLOCKING_ERRORS.has(code)) return true;
  return false;
}

const auditLog: L13OutputAuditRecord[] = [];

export function resetL13OutputAuditLog(): void {
  auditLog.length = 0;
}

export interface L13OutputAuditEmissionInput {
  readonly subjectClass: L13OutputAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCode: L13OutputViolationCode;
  readonly message: string;
  readonly evidenceRefs?: readonly string[];
  readonly lineageRefs?: readonly string[];
  readonly createdAt?: string;
}

export function emitL13OutputAuditRecord(
  input: L13OutputAuditEmissionInput,
): L13OutputAuditRecord {
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
  const auditId = `l13o.audit.${replayHash}`;
  const severity = severityForL13OutputCode(input.violationCode);
  const blocking = isL13OutputBlockingCode(input.violationCode);
  const record: L13OutputAuditRecord = {
    audit_id: auditId,
    subject_class: input.subjectClass,
    subject_ref: input.subjectRef,
    violation_code: input.violationCode,
    severity,
    message: input.message,
    blocking,
    evidence_refs: evidence,
    lineage_refs: lineage,
    created_at: input.createdAt ?? new Date().toISOString(),
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  auditLog.push(record);
  return record;
}

export function emitL13OutputAuditRecords(
  inputs: readonly L13OutputAuditEmissionInput[],
): readonly L13OutputAuditRecord[] {
  return inputs.map(emitL13OutputAuditRecord);
}

export function getL13OutputAuditLog():
  readonly L13OutputAuditRecord[] {
  return [...auditLog];
}

export function getL13OutputCriticalViolations():
  readonly L13OutputAuditRecord[] {
  return auditLog.filter(
    r => r.severity === L13ViolationSeverity.CRITICAL,
  );
}

export function getL13OutputBlockingViolations():
  readonly L13OutputAuditRecord[] {
  return auditLog.filter(r => r.blocking);
}

export function getL13OutputViolationsByCode(
  code: L13OutputViolationCode,
): readonly L13OutputAuditRecord[] {
  return auditLog.filter(r => r.violation_code === code);
}

export function getL13OutputViolationsBySubjectClass(
  cls: L13OutputAuditSubjectClass,
): readonly L13OutputAuditRecord[] {
  return auditLog.filter(r => r.subject_class === cls);
}

export function hasAnyL13OutputViolations(): boolean {
  return auditLog.length > 0;
}

export function getL13OutputViolationCount(): number {
  return auditLog.length;
}
