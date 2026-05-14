/**
 * L12.3 — Contract audit log (§12.3.19).
 *
 * Deterministic audit trail for contract-level violations (`L12K_*`).
 * Severity is mapped from the violation code per §12.3.19.
 */

import {
  L12ContractViolation,
  L12ContractViolationCode,
} from '../validation/l12-contract-violation-codes';

export enum L12ContractAuditSubjectClass {
  SUBJECT_CONTRACT = 'SUBJECT_CONTRACT',
  SET_CONTRACT = 'SET_CONTRACT',
  SCENARIO_CONTRACT = 'SCENARIO_CONTRACT',
  CONDITION_CONTRACT = 'CONDITION_CONTRACT',
  TRIGGER_CONTRACT = 'TRIGGER_CONTRACT',
  INVALIDATION_CONTRACT = 'INVALIDATION_CONTRACT',
  CONFIDENCE_CONTRACT = 'CONFIDENCE_CONTRACT',
  SHIFT_CONDITION_CONTRACT = 'SHIFT_CONDITION_CONTRACT',
  RESTRICTION_CONTRACT = 'RESTRICTION_CONTRACT',
  EVIDENCE_PACK_CONTRACT = 'EVIDENCE_PACK_CONTRACT',
  REPLAY_IDENTITY = 'REPLAY_IDENTITY',
  READINESS = 'READINESS',
  COMPATIBILITY = 'COMPATIBILITY',
  INVARIANT = 'INVARIANT',
}

export const ALL_L12_CONTRACT_AUDIT_SUBJECT_CLASSES: readonly L12ContractAuditSubjectClass[] =
  Object.values(L12ContractAuditSubjectClass);

export type L12ContractAuditSeverity = 'CRITICAL' | 'ERROR' | 'WARNING';

const CRITICAL_CODES: ReadonlySet<L12ContractViolationCode> = new Set([
  L12ContractViolationCode.L12K_INVALIDATION_ABSENT,
  L12ContractViolationCode.L12K_INVALIDATION_REFS_ABSENT,
  L12ContractViolationCode.L12K_INVALIDATION_CONTRACT_INCOMPLETE,
  L12ContractViolationCode.L12K_INVALIDATION_LAW_WEAKENED,
  L12ContractViolationCode.L12K_INVALIDATION_HIDDEN,
  L12ContractViolationCode.L12K_ACTIVE_INVALIDATION_NOT_REFLECTED_IN_CONFIDENCE,
  L12ContractViolationCode.L12K_TRIGGER_PROFILE_ABSENT,
  L12ContractViolationCode.L12K_TRIGGER_REFS_ABSENT,
  L12ContractViolationCode.L12K_TRIGGER_CONTRACT_INCOMPLETE,
  L12ContractViolationCode.L12K_TRIGGER_LAW_WEAKENED,
  L12ContractViolationCode.L12K_TRIGGER_GUARANTEED_OUTCOME,
  L12ContractViolationCode.L12K_TRIGGER_TRADE_INSTRUCTION,
  L12ContractViolationCode.L12K_PREDICTION_THEATER,
  L12ContractViolationCode.L12K_RECOMMENDATION_LEAK,
  L12ContractViolationCode.L12K_JUDGMENT_LEAK,
  L12ContractViolationCode.L12K_TRADE_ACTION_LEAK,
  L12ContractViolationCode.L12K_CERTAINTY_LANGUAGE,
  L12ContractViolationCode.L12K_PREDICTION_THEATER_SCAN_REMOVED,
  L12ContractViolationCode.L12K_SCORE_CONTEXT_POLICY_MISSING,
  L12ContractViolationCode.L12K_SCORE_CONTEXT_POLICY_WEAKENED,
  L12ContractViolationCode.L12K_SCORE_CONTEXT_LAW_WEAKENED,
  L12ContractViolationCode.L12K_RESTRICTION_LAW_WEAKENED,
  L12ContractViolationCode.L12K_RESTRICTION_RECOMMENDATION_NOT_BLOCKED,
  L12ContractViolationCode.L12K_RESTRICTION_PREDICTION_NOT_BLOCKED,
  L12ContractViolationCode.L12K_RESTRICTION_TRADE_NOT_BLOCKED,
  L12ContractViolationCode.L12K_RESTRICTION_FINAL_JUDGMENT_NOT_BLOCKED,
  L12ContractViolationCode.L12K_RESTRICTION_CERTAINTY_NOT_BLOCKED,
  L12ContractViolationCode.L12K_BASE_CASE_ABSENT,
  L12ContractViolationCode.L12K_BASE_CASE_GUARANTEED_OUTCOME,
  L12ContractViolationCode.L12K_PRIMARY_FINAL_WINNER,
  L12ContractViolationCode.L12K_OUTPUT_LEAKAGE_DETECTED,
  L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_INVALIDATION_ACTIVE,
  L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_TRIGGER_MISSING,
  L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_INVALIDATION_MISSING,
  L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_SCORE_CONTEXT_INCOMPLETE,
  L12ContractViolationCode.L12K_REPLAY_MATERIAL_CHANGED_WITHOUT_VERSION,
  L12ContractViolationCode.L12K_OLD_OUTPUTS_REINTERPRETED,
  L12ContractViolationCode.L12K_REQUIRED_FIELD_REMOVED,
  L12ContractViolationCode.L12K_SUBJECT_TRADE_INTENT,
  L12ContractViolationCode.L12K_SUBJECT_REFERENCES_L13_PLUS,
]);

const WARNING_CODES: ReadonlySet<L12ContractViolationCode> = new Set([
  L12ContractViolationCode.L12K_PATH_CONFIDENCE_BAND_MISMATCH,
  L12ContractViolationCode.L12K_CONFIDENCE_BAND_MISMATCH,
  L12ContractViolationCode.L12K_OUTPUT_READINESS_DERIVATION_MISMATCH,
]);

export function severityForL12ContractViolationCode(
  code: L12ContractViolationCode,
): L12ContractAuditSeverity {
  if (CRITICAL_CODES.has(code)) return 'CRITICAL';
  if (WARNING_CODES.has(code)) return 'WARNING';
  return 'ERROR';
}

export interface L12ContractAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L12ContractAuditSubjectClass;
  readonly violation_code: L12ContractViolationCode;
  readonly severity: L12ContractAuditSeverity;
  readonly subject_id: string;
  readonly detail: string;
  readonly emitted_at: string;
  readonly source: string;
}

const AUDIT_LOG: L12ContractAuditRecord[] = [];
let SEQ = 0;

function nextAuditId(): string {
  SEQ += 1;
  return `l12.contract_audit.${String(SEQ).padStart(8, '0')}`;
}

export function makeL12ContractAuditRecord(
  subjectClass: L12ContractAuditSubjectClass,
  code: L12ContractViolationCode,
  source: string,
  subjectId: string,
  detail: string,
): L12ContractAuditRecord {
  const rec: L12ContractAuditRecord = {
    audit_id: nextAuditId(),
    subject_class: subjectClass,
    violation_code: code,
    severity: severityForL12ContractViolationCode(code),
    subject_id: subjectId,
    detail,
    emitted_at: new Date().toISOString(),
    source,
  };
  AUDIT_LOG.push(rec);
  return rec;
}

export function emitL12ContractAuditRecords(
  subjectClass: L12ContractAuditSubjectClass,
  source: string,
  violations: readonly L12ContractViolation[],
): readonly L12ContractAuditRecord[] {
  return violations.map(v =>
    makeL12ContractAuditRecord(
      subjectClass,
      v.code,
      source,
      v.subject_id,
      v.detail,
    ),
  );
}

export function getL12ContractAuditLog(): readonly L12ContractAuditRecord[] {
  return [...AUDIT_LOG];
}

export function resetL12ContractAuditLog(): void {
  AUDIT_LOG.length = 0;
  SEQ = 0;
}

export function getL12ContractViolationCount(): number {
  return AUDIT_LOG.length;
}

export function hasAnyL12ContractViolations(): boolean {
  return AUDIT_LOG.length > 0;
}

export function getL12ContractCriticalViolations(): readonly L12ContractAuditRecord[] {
  return AUDIT_LOG.filter(r => r.severity === 'CRITICAL');
}

export function getL12ContractViolationsBySubjectClass(
  cls: L12ContractAuditSubjectClass,
): readonly L12ContractAuditRecord[] {
  return AUDIT_LOG.filter(r => r.subject_class === cls);
}

export function getL12ContractViolationsByCode(
  code: L12ContractViolationCode,
): readonly L12ContractAuditRecord[] {
  return AUDIT_LOG.filter(r => r.violation_code === code);
}
