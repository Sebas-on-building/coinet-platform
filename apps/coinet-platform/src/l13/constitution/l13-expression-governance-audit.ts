/**
 * L13.5 — Expression Governance Audit Surface
 *
 * §13.5.25 — Deterministic audit log for L13.5 violations. Mirrors
 * the L13.1 / L13.2 / L13.3 / L13.4 audit pattern.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13ExpressionViolationCode } from '../validation/l13-expression-violation-codes';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.expression.v1';

/**
 * §13.5.25 — Audit subject classes.
 */
export enum L13ExpressionGovernanceAuditSubjectClass {
  UNCERTAINTY_DISCLOSURE_PROFILE = 'UNCERTAINTY_DISCLOSURE_PROFILE',
  CONTRADICTION_DISCLOSURE_PROFILE = 'CONTRADICTION_DISCLOSURE_PROFILE',
  CONFIDENCE_PHRASING_PROFILE = 'CONFIDENCE_PHRASING_PROFILE',
  RESTRICTION_COMPOSITION_PROFILE = 'RESTRICTION_COMPOSITION_PROFILE',
  CONFIDENCE_CEILING = 'CONFIDENCE_CEILING',
  PHRASE_STRENGTH = 'PHRASE_STRENGTH',
  EXPRESSION_GOVERNANCE_ENVELOPE = 'EXPRESSION_GOVERNANCE_ENVELOPE',
  INVARIANT = 'INVARIANT',
}

export const ALL_L13_EXPRESSION_GOVERNANCE_AUDIT_SUBJECT_CLASSES:
  readonly L13ExpressionGovernanceAuditSubjectClass[] =
  Object.values(L13ExpressionGovernanceAuditSubjectClass);

export interface L13ExpressionGovernanceAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L13ExpressionGovernanceAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L13ExpressionViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
  readonly blocking: boolean;
  readonly output_id?: string;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly created_at: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

// ── Severity mapping ────────────────────────────────────────────────

const CRITICAL = new Set<L13ExpressionViolationCode>([
  L13ExpressionViolationCode.L13U_UNCERTAINTY_PROFILE_MISSING,
  L13ExpressionViolationCode.L13U_CONFIDENCE_CEILING_MISSING,
  L13ExpressionViolationCode.L13U_FORBIDDEN_CERTAINTY_PHRASE_PRESENT,
  L13ExpressionViolationCode.L13U_CONTRADICTION_DISCLOSURE_MISSING,
  L13ExpressionViolationCode.L13U_CONTRADICTION_MINIMIZED,
  L13ExpressionViolationCode.L13U_CONTRADICTION_OVERRIDDEN,
  L13ExpressionViolationCode.L13U_CONTRADICTION_HIDDEN,
  L13ExpressionViolationCode.L13U_ACTIVE_INVALIDATION_NOT_DISCLOSED,
  L13ExpressionViolationCode.L13U_UNRESOLVED_TRIGGER_NOT_DISCLOSED,
  L13ExpressionViolationCode.L13U_MISSING_DATA_NOT_DISCLOSED,
  L13ExpressionViolationCode.L13U_CONFIDENCE_OUTRUN,
  L13ExpressionViolationCode.L13U_ASSERTIVE_LANGUAGE_UNDER_LOW_CONFIDENCE,
  L13ExpressionViolationCode.L13U_CLEAN_LANGUAGE_UNDER_ACTIVE_INVALIDATION,
  L13ExpressionViolationCode.L13U_CERTAINTY_LANGUAGE_UNDER_NARROW_SPREAD,
  L13ExpressionViolationCode.L13U_RESTRICTION_COMPOSITION_ILLEGAL,
  L13ExpressionViolationCode.L13U_BLOCKED_USE_REOPENED,
  L13ExpressionViolationCode.L13U_ALLOWED_PHRASE_STRENGTH_EXCEEDS_RESTRICTION,
  L13ExpressionViolationCode.L13U_BLOCKED_OUTPUT_USE_EMITTED,
  L13ExpressionViolationCode.L13U_EXPRESSION_READINESS_ILLEGAL,
  L13ExpressionViolationCode.L13U_REWRITE_REQUIRED_BUT_NOT_MARKED,
  L13ExpressionViolationCode.L13U_REFUSAL_REQUIRED_BUT_NOT_MARKED,
  L13ExpressionViolationCode.L13U_BLOCK_REQUIRED_BUT_OUTPUT_ALLOWED,
  L13ExpressionViolationCode.L13U_REPLAY_HASH_MISSING,
  L13ExpressionViolationCode.L13U_CONFIDENCE_RAISED_ABOVE_INHERITED,
  L13ExpressionViolationCode.L13U_ENVELOPE_REF_MISMATCH,
  L13ExpressionViolationCode.L13U_PHRASE_CLASS_NOT_PERMITTED,
  L13ExpressionViolationCode.L13U_RESTRICTION_PROFILE_MISSING,
  L13ExpressionViolationCode.L13U_REQUIRED_DISCLOSURE_PHRASE_MISSING,
]);

const ERROR_CODES = new Set<L13ExpressionViolationCode>([
  L13ExpressionViolationCode.L13U_DRIFT_NOT_DISCLOSED,
  L13ExpressionViolationCode.L13U_SCENARIO_SPREAD_NOT_DISCLOSED,
  L13ExpressionViolationCode.L13U_HYPOTHESIS_SPREAD_NOT_DISCLOSED,
  L13ExpressionViolationCode.L13U_TRANSITION_RISK_NOT_DISCLOSED,
  L13ExpressionViolationCode.L13U_SEQUENCE_AMBIGUITY_NOT_DISCLOSED,
  L13ExpressionViolationCode.L13U_LINEAGE_MISSING,
]);

export function severityForL13ExpressionCode(
  code: L13ExpressionViolationCode,
): L13ViolationSeverity {
  if (CRITICAL.has(code)) return L13ViolationSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L13ViolationSeverity.ERROR;
  return L13ViolationSeverity.WARNING;
}

export function isL13ExpressionBlockingCode(
  code: L13ExpressionViolationCode,
): boolean {
  return CRITICAL.has(code);
}

// ── Audit log ───────────────────────────────────────────────────────

const auditLog: L13ExpressionGovernanceAuditRecord[] = [];

export function resetL13ExpressionGovernanceAuditLog(): void {
  auditLog.length = 0;
}

export interface L13ExpressionGovernanceAuditEmissionInput {
  readonly subjectClass: L13ExpressionGovernanceAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCode: L13ExpressionViolationCode;
  readonly message: string;
  readonly outputId?: string;
  readonly evidenceRefs?: readonly string[];
  readonly lineageRefs?: readonly string[];
  readonly createdAt?: string;
}

export function emitL13ExpressionGovernanceAuditRecord(
  input: L13ExpressionGovernanceAuditEmissionInput,
): L13ExpressionGovernanceAuditRecord {
  const evidence = input.evidenceRefs ?? [];
  const lineage = input.lineageRefs ?? [];
  const replayHash = fnv1a(
    [
      input.subjectClass,
      input.subjectRef,
      input.violationCode,
      input.message,
      input.outputId ?? '',
      evidence.join(','),
      lineage.join(','),
      POLICY_V,
    ].join('|'),
  );
  const record: L13ExpressionGovernanceAuditRecord = {
    audit_id: `l13u.audit.${replayHash}`,
    subject_class: input.subjectClass,
    subject_ref: input.subjectRef,
    violation_code: input.violationCode,
    severity: severityForL13ExpressionCode(input.violationCode),
    message: input.message,
    blocking: isL13ExpressionBlockingCode(input.violationCode),
    output_id: input.outputId,
    evidence_refs: evidence,
    lineage_refs: lineage,
    created_at: input.createdAt ?? new Date().toISOString(),
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  auditLog.push(record);
  return record;
}

export function getL13ExpressionGovernanceAuditLog():
  readonly L13ExpressionGovernanceAuditRecord[] {
  return [...auditLog];
}

export function getL13ExpressionGovernanceCriticalViolations():
  readonly L13ExpressionGovernanceAuditRecord[] {
  return auditLog.filter(
    r => r.severity === L13ViolationSeverity.CRITICAL,
  );
}

export function getL13ExpressionGovernanceBlockingViolations():
  readonly L13ExpressionGovernanceAuditRecord[] {
  return auditLog.filter(r => r.blocking);
}

export function getL13ExpressionGovernanceViolationsByCode(
  code: L13ExpressionViolationCode,
): readonly L13ExpressionGovernanceAuditRecord[] {
  return auditLog.filter(r => r.violation_code === code);
}

export function getL13ExpressionGovernanceViolationsByOutputId(
  outputId: string,
): readonly L13ExpressionGovernanceAuditRecord[] {
  return auditLog.filter(r => r.output_id === outputId);
}

export function getL13ExpressionGovernanceViolationsBySubjectClass(
  cls: L13ExpressionGovernanceAuditSubjectClass,
): readonly L13ExpressionGovernanceAuditRecord[] {
  return auditLog.filter(r => r.subject_class === cls);
}

export function hasAnyL13ExpressionGovernanceViolations(): boolean {
  return auditLog.length > 0;
}

export function getL13ExpressionGovernanceViolationCount(): number {
  return auditLog.length;
}
