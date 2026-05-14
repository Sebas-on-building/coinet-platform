/**
 * L13.2 — Input Package Audit Surface
 *
 * §13.2.21 — Deterministic audit log for AI input package
 * violations. Mirrors `l13-constitutional-audit` pattern: same
 * (subject_class, subject_ref, code, message, evidence, lineage)
 * produces the same audit_id and replay_hash.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13InputPackageViolationCode } from '../validation/l13-input-package-violation-codes';
import { fnv1a } from '../context/_fnv1a';

/**
 * §13.2.21 — Audit subject classes.
 */
export enum L13InputPackageAuditSubjectClass {
  INPUT_PACKAGE = 'INPUT_PACKAGE',
  ENTITY_SUMMARY = 'ENTITY_SUMMARY',
  VALIDATION_SUMMARY = 'VALIDATION_SUMMARY',
  CONTRADICTION_SUMMARY = 'CONTRADICTION_SUMMARY',
  REGIME_SUMMARY = 'REGIME_SUMMARY',
  SEQUENCE_SUMMARY = 'SEQUENCE_SUMMARY',
  HYPOTHESIS_SUMMARY = 'HYPOTHESIS_SUMMARY',
  SCORE_SUMMARY = 'SCORE_SUMMARY',
  SCENARIO_SUMMARY = 'SCENARIO_SUMMARY',
  EVIDENCE_DIGEST = 'EVIDENCE_DIGEST',
  CONFIDENCE_BREAKDOWN = 'CONFIDENCE_BREAKDOWN',
  UNCERTAINTY_PROFILE = 'UNCERTAINTY_PROFILE',
  RESTRICTION_PROFILE = 'RESTRICTION_PROFILE',
  PROMPT_BUDGET = 'PROMPT_BUDGET',
  CONTEXT_PRIORITY = 'CONTEXT_PRIORITY',
  CONTEXT_COMPRESSION = 'CONTEXT_COMPRESSION',
  CONTRADICTION_PRESERVATION = 'CONTRADICTION_PRESERVATION',
  INVARIANT = 'INVARIANT',
}

export const ALL_L13_INPUT_PACKAGE_AUDIT_SUBJECT_CLASSES:
  readonly L13InputPackageAuditSubjectClass[] =
  Object.values(L13InputPackageAuditSubjectClass);

export interface L13InputPackageAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L13InputPackageAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L13InputPackageViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
  readonly blocking: boolean;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly created_at: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

const POLICY_V = 'l13.input-package.v1';

/**
 * §13.2.19 — Severity mapping for each L13P_ code.
 */
const CRITICAL_CODES = new Set<L13InputPackageViolationCode>([
  // identity
  L13InputPackageViolationCode.L13P_INPUT_PACKAGE_ID_MISSING,
  L13InputPackageViolationCode.L13P_REQUEST_ID_MISSING,
  L13InputPackageViolationCode.L13P_USER_INTENT_MISSING,
  L13InputPackageViolationCode.L13P_SCOPE_MISSING,
  L13InputPackageViolationCode.L13P_AS_OF_MISSING,
  L13InputPackageViolationCode.L13P_POLICY_VERSION_MISSING,
  L13InputPackageViolationCode.L13P_REPLAY_HASH_MISSING,

  // summaries
  L13InputPackageViolationCode.L13P_ENTITY_SUMMARY_MISSING,
  L13InputPackageViolationCode.L13P_VALIDATION_SUMMARY_MISSING,
  L13InputPackageViolationCode.L13P_CONTRADICTION_SUMMARY_MISSING,
  L13InputPackageViolationCode.L13P_REGIME_SUMMARY_MISSING,
  L13InputPackageViolationCode.L13P_SEQUENCE_SUMMARY_MISSING,
  L13InputPackageViolationCode.L13P_HYPOTHESIS_SUMMARY_MISSING,
  L13InputPackageViolationCode.L13P_SCORE_SUMMARY_MISSING,
  L13InputPackageViolationCode.L13P_SCENARIO_SUMMARY_MISSING,
  L13InputPackageViolationCode.L13P_CONFIDENCE_BREAKDOWN_MISSING,
  L13InputPackageViolationCode.L13P_UNCERTAINTY_PROFILE_MISSING,
  L13InputPackageViolationCode.L13P_RESTRICTION_PROFILE_MISSING,

  // trace
  L13InputPackageViolationCode.L13P_EVIDENCE_REFS_MISSING,
  L13InputPackageViolationCode.L13P_LINEAGE_REFS_MISSING,
  L13InputPackageViolationCode.L13P_PROMPT_BUDGET_MISSING,
  L13InputPackageViolationCode.L13P_ALLOWED_ANSWER_MODES_MISSING,
  L13InputPackageViolationCode.L13P_BLOCKED_ANSWER_MODES_MISSING,

  // bypass
  L13InputPackageViolationCode.L13P_RAW_LOWER_LAYER_CONTEXT,
  L13InputPackageViolationCode.L13P_NAKED_L11_SCORE_CONTEXT,
  L13InputPackageViolationCode.L13P_INCOMPLETE_L11_SCORE_CONTEXT,
  L13InputPackageViolationCode.L13P_NAKED_L12_SCENARIO_CONTEXT,
  L13InputPackageViolationCode.L13P_INCOMPLETE_L12_SCENARIO_CONTEXT,

  // adverse
  L13InputPackageViolationCode.L13P_ACTIVE_CONTRADICTION_OMITTED,
  L13InputPackageViolationCode.L13P_ACTIVE_INVALIDATION_OMITTED,
  L13InputPackageViolationCode.L13P_TRIGGER_CONTEXT_OMITTED,
  L13InputPackageViolationCode.L13P_CONFIDENCE_CAP_OMITTED,
  L13InputPackageViolationCode.L13P_MISSING_DATA_DISCLOSURE_OMITTED,
  L13InputPackageViolationCode.L13P_DRIFT_DISCLOSURE_OMITTED,

  // priority + compression
  L13InputPackageViolationCode.L13P_CONTRADICTION_DROPPED_BEFORE_POSITIVE,
  L13InputPackageViolationCode.L13P_REQUIRED_CONTEXT_DROPPED,

  // restriction binding
  L13InputPackageViolationCode.L13P_BLOCKED_ANSWER_MODE_ALLOWED,
  L13InputPackageViolationCode.L13P_RESTRICTION_BYPASS,

  // intent law
  L13InputPackageViolationCode.L13P_FORWARD_INTENT_WITHOUT_SCENARIO,
  L13InputPackageViolationCode.L13P_SCORE_INTENT_WITHOUT_SCORE,
  L13InputPackageViolationCode.L13P_HYPOTHESIS_INTENT_WITHOUT_HYPOTHESIS,
  L13InputPackageViolationCode.L13P_COMPARISON_INTENT_WITHOUT_PEER,
]);

const ERROR_CODES = new Set<L13InputPackageViolationCode>([
  L13InputPackageViolationCode.L13P_CONTEXT_PRIORITY_VIOLATED,
  L13InputPackageViolationCode.L13P_ILLEGAL_COMPRESSION,
  L13InputPackageViolationCode.L13P_PROMPT_BUDGET_INVALID,
  L13InputPackageViolationCode.L13P_PACKAGE_READINESS_ILLEGAL,
  L13InputPackageViolationCode.L13P_EVIDENCE_DIGEST_INVALID,
  L13InputPackageViolationCode.L13P_CONFIDENCE_BREAKDOWN_INVALID,
  L13InputPackageViolationCode.L13P_UNCERTAINTY_PROFILE_INVALID,
]);

export function severityForL13InputPackageCode(
  code: L13InputPackageViolationCode,
): L13ViolationSeverity {
  if (CRITICAL_CODES.has(code)) return L13ViolationSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L13ViolationSeverity.ERROR;
  return L13ViolationSeverity.WARNING;
}

const BLOCKING_ERRORS = new Set<L13InputPackageViolationCode>([
  L13InputPackageViolationCode.L13P_ILLEGAL_COMPRESSION,
  L13InputPackageViolationCode.L13P_CONTEXT_PRIORITY_VIOLATED,
  L13InputPackageViolationCode.L13P_PACKAGE_READINESS_ILLEGAL,
  L13InputPackageViolationCode.L13P_PROMPT_BUDGET_INVALID,
  L13InputPackageViolationCode.L13P_EVIDENCE_DIGEST_INVALID,
  L13InputPackageViolationCode.L13P_CONFIDENCE_BREAKDOWN_INVALID,
  L13InputPackageViolationCode.L13P_UNCERTAINTY_PROFILE_INVALID,
]);

export function isL13InputPackageBlockingCode(
  code: L13InputPackageViolationCode,
): boolean {
  if (CRITICAL_CODES.has(code)) return true;
  if (BLOCKING_ERRORS.has(code)) return true;
  return false;
}

const auditLog: L13InputPackageAuditRecord[] = [];

export function resetL13InputPackageAuditLog(): void {
  auditLog.length = 0;
}

export interface L13InputPackageAuditEmissionInput {
  readonly subjectClass: L13InputPackageAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCode: L13InputPackageViolationCode;
  readonly message: string;
  readonly evidenceRefs?: readonly string[];
  readonly lineageRefs?: readonly string[];
  readonly createdAt?: string;
}

export function emitL13InputPackageAuditRecord(
  input: L13InputPackageAuditEmissionInput,
): L13InputPackageAuditRecord {
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
  const auditId = `l13p.audit.${replayHash}`;
  const severity = severityForL13InputPackageCode(input.violationCode);
  const blocking = isL13InputPackageBlockingCode(input.violationCode);
  const record: L13InputPackageAuditRecord = {
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

export function emitL13InputPackageAuditRecords(
  inputs: readonly L13InputPackageAuditEmissionInput[],
): readonly L13InputPackageAuditRecord[] {
  return inputs.map(emitL13InputPackageAuditRecord);
}

export function getL13InputPackageAuditLog():
  readonly L13InputPackageAuditRecord[] {
  return [...auditLog];
}

export function getL13InputPackageCriticalViolations():
  readonly L13InputPackageAuditRecord[] {
  return auditLog.filter(
    r => r.severity === L13ViolationSeverity.CRITICAL,
  );
}

export function getL13InputPackageBlockingViolations():
  readonly L13InputPackageAuditRecord[] {
  return auditLog.filter(r => r.blocking);
}

export function getL13InputPackageViolationsByCode(
  code: L13InputPackageViolationCode,
): readonly L13InputPackageAuditRecord[] {
  return auditLog.filter(r => r.violation_code === code);
}

export function getL13InputPackageViolationsBySubjectClass(
  cls: L13InputPackageAuditSubjectClass,
): readonly L13InputPackageAuditRecord[] {
  return auditLog.filter(r => r.subject_class === cls);
}

export function hasAnyL13InputPackageViolations(): boolean {
  return auditLog.length > 0;
}

export function getL13InputPackageViolationCount(): number {
  return auditLog.length;
}
