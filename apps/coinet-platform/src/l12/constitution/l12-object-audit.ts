/**
 * L12.2 — Object audit log (§12.2.20).
 *
 * Deterministic audit trail for object-level violations (`L12O_*`).
 * Severity is mapped from the violation code.
 */

import {
  L12ObjectViolation,
  L12ObjectViolationCode,
} from '../validation/l12-object-violation-codes';

export enum L12ObjectAuditSubjectClass {
  SCENARIO_SUBJECT = 'SCENARIO_SUBJECT',
  SCENARIO_FAMILY = 'SCENARIO_FAMILY',
  SCENARIO_SET = 'SCENARIO_SET',
  SCENARIO = 'SCENARIO',
  CONDITION = 'CONDITION',
  TRIGGER = 'TRIGGER',
  INVALIDATION = 'INVALIDATION',
  PATH_CONFIDENCE = 'PATH_CONFIDENCE',
  SHIFT_CONDITION = 'SHIFT_CONDITION',
  RESTRICTION_PROFILE = 'RESTRICTION_PROFILE',
  COEXISTENCE = 'COEXISTENCE',
  INVARIANT = 'INVARIANT',
}

export const ALL_L12_OBJECT_AUDIT_SUBJECT_CLASSES: readonly L12ObjectAuditSubjectClass[] =
  Object.values(L12ObjectAuditSubjectClass);

export type L12ObjectAuditSeverity = 'CRITICAL' | 'ERROR' | 'WARNING';

const CRITICAL_CODES: ReadonlySet<L12ObjectViolationCode> = new Set([
  L12ObjectViolationCode.L12O_BASE_CASE_MISSING,
  L12ObjectViolationCode.L12O_PRIMARY_SCENARIO_MISSING,
  L12ObjectViolationCode.L12O_SINGLE_PATH_FAKE_CERTAINTY,
  L12ObjectViolationCode.L12O_BASE_CASE_AS_FINAL_JUDGMENT,
  L12ObjectViolationCode.L12O_PRIMARY_AS_GUARANTEED_WINNER,
  L12ObjectViolationCode.L12O_INVALIDATION_REFS_MISSING,
  L12ObjectViolationCode.L12O_INVALIDATION_HIDDEN,
  L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_ACTIVE_INVALIDATION,
  L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_UNRESOLVED_CONTRADICTION,
  L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_MISSING_VISIBILITY,
  L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_CRITICAL_DRIFT,
  L12ObjectViolationCode.L12O_RECOMMENDATION_LEAK,
  L12ObjectViolationCode.L12O_JUDGMENT_LEAK,
  L12ObjectViolationCode.L12O_PREDICTION_THEATER,
  L12ObjectViolationCode.L12O_TRADE_ACTION_LEAK,
  L12ObjectViolationCode.L12O_CERTAINTY_LANGUAGE,
  L12ObjectViolationCode.L12O_RESTRICTION_RECOMMENDATION_NOT_BLOCKED,
  L12ObjectViolationCode.L12O_RESTRICTION_PREDICTION_NOT_BLOCKED,
  L12ObjectViolationCode.L12O_RESTRICTION_TRADE_NOT_BLOCKED,
  L12ObjectViolationCode.L12O_RESTRICTION_FINAL_JUDGMENT_NOT_BLOCKED,
  L12ObjectViolationCode.L12O_RESTRICTION_CERTAINTY_NOT_BLOCKED,
  L12ObjectViolationCode.L12O_RESTRICTION_SCORE_REPLACEMENT_NOT_BLOCKED,
  L12ObjectViolationCode.L12O_COEXISTENCE_ILLEGAL_COLLAPSED_SINGLE_PATH,
  L12ObjectViolationCode.L12O_COEXISTENCE_HIDDEN_CONTRADICTORY_PATHS,
  L12ObjectViolationCode.L12O_COEXISTENCE_SINGLE_PATH_WITHOUT_DISCLOSURE,
  L12ObjectViolationCode.L12O_FAMILY_BLOCKED,
  L12ObjectViolationCode.L12O_FAMILY_UNREGISTERED,
  L12ObjectViolationCode.L12O_FAMILY_NO_INVALIDATION_REQUIREMENT,
  L12ObjectViolationCode.L12O_FAMILY_NO_SCORE_CONTEXT_REQUIREMENT,
  L12ObjectViolationCode.L12O_TRIGGER_GUARANTEED_OUTCOME,
  L12ObjectViolationCode.L12O_TRIGGER_TRADE_INSTRUCTION,
  L12ObjectViolationCode.L12O_SHIFT_CONDITIONS_TRADE_LANGUAGE,
  L12ObjectViolationCode.L12O_SUBJECT_TRADE_INTENT,
  L12ObjectViolationCode.L12O_SUBJECT_REFERENCES_L13_PLUS,
  L12ObjectViolationCode.L12O_SUBJECT_REQUESTED_BLOCKED_FAMILY,
  L12ObjectViolationCode.L12O_SUBJECT_SCORE_CONTEXT_REFS_ABSENT,
  L12ObjectViolationCode.L12O_CONDITION_RECOMMENDATION_LANGUAGE,
  L12ObjectViolationCode.L12O_CONDITION_CERTAINTY_LANGUAGE,
  L12ObjectViolationCode.L12O_CONDITION_USES_RAW_DATA,
]);

const WARNING_CODES: ReadonlySet<L12ObjectViolationCode> = new Set([
  L12ObjectViolationCode.L12O_READINESS_MISMATCH,
  L12ObjectViolationCode.L12O_CONFIDENCE_BAND_MISMATCH,
]);

export function severityForL12ObjectViolationCode(
  code: L12ObjectViolationCode,
): L12ObjectAuditSeverity {
  if (CRITICAL_CODES.has(code)) return 'CRITICAL';
  if (WARNING_CODES.has(code)) return 'WARNING';
  return 'ERROR';
}

export interface L12ObjectAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L12ObjectAuditSubjectClass;
  readonly violation_code: L12ObjectViolationCode;
  readonly severity: L12ObjectAuditSeverity;
  readonly subject_id: string;
  readonly detail: string;
  readonly emitted_at: string;
  readonly source: string;
}

const AUDIT_LOG: L12ObjectAuditRecord[] = [];
let SEQ = 0;

function nextAuditId(): string {
  SEQ += 1;
  return `l12.object_audit.${String(SEQ).padStart(8, '0')}`;
}

export function makeL12ObjectAuditRecord(
  subjectClass: L12ObjectAuditSubjectClass,
  code: L12ObjectViolationCode,
  source: string,
  subjectId: string,
  detail: string,
): L12ObjectAuditRecord {
  const rec: L12ObjectAuditRecord = {
    audit_id: nextAuditId(),
    subject_class: subjectClass,
    violation_code: code,
    severity: severityForL12ObjectViolationCode(code),
    subject_id: subjectId,
    detail,
    emitted_at: new Date().toISOString(),
    source,
  };
  AUDIT_LOG.push(rec);
  return rec;
}

export function emitL12ObjectAuditRecords(
  subjectClass: L12ObjectAuditSubjectClass,
  source: string,
  violations: readonly L12ObjectViolation[],
): readonly L12ObjectAuditRecord[] {
  return violations.map(v =>
    makeL12ObjectAuditRecord(subjectClass, v.code, source, v.subject_id, v.detail),
  );
}

export function getL12ObjectAuditLog(): readonly L12ObjectAuditRecord[] {
  return [...AUDIT_LOG];
}

export function resetL12ObjectAuditLog(): void {
  AUDIT_LOG.length = 0;
  SEQ = 0;
}

export function getL12ObjectViolationCount(): number {
  return AUDIT_LOG.length;
}

export function hasAnyL12ObjectViolations(): boolean {
  return AUDIT_LOG.length > 0;
}

export function getL12ObjectCriticalViolations(): readonly L12ObjectAuditRecord[] {
  return AUDIT_LOG.filter(r => r.severity === 'CRITICAL');
}

export function getL12ObjectViolationsBySubjectClass(
  cls: L12ObjectAuditSubjectClass,
): readonly L12ObjectAuditRecord[] {
  return AUDIT_LOG.filter(r => r.subject_class === cls);
}

export function getL12ObjectViolationsByCode(
  code: L12ObjectViolationCode,
): readonly L12ObjectAuditRecord[] {
  return AUDIT_LOG.filter(r => r.violation_code === code);
}
