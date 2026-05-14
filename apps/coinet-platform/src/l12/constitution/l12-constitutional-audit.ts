/**
 * L12.1 — Constitutional Audit Surface
 *
 * §12.1.14 — Emits durable audit records for every boundary violation
 * across mission, dependency access, output surface emission,
 * capability claim, forbidden actions, conditionality, invalidation,
 * trigger, L11 score-context, lower-layer interaction, boundary
 * validation, and invariant evaluation.
 */

import { L12ConstitutionalViolationCode } from '../contracts/l12-violation-codes';

/**
 * §12.1.14.1 — Audit subject classes.
 */
export enum L12ConstitutionalAuditSubjectClass {
  MISSION = 'MISSION',
  DEPENDENCY_ACCESS = 'DEPENDENCY_ACCESS',
  OUTPUT_SURFACE = 'OUTPUT_SURFACE',
  CAPABILITY_CLAIM = 'CAPABILITY_CLAIM',
  FORBIDDEN_ACTION = 'FORBIDDEN_ACTION',
  CONDITIONALITY = 'CONDITIONALITY',
  INVALIDATION = 'INVALIDATION',
  TRIGGER = 'TRIGGER',
  L11_SCORE_CONTEXT = 'L11_SCORE_CONTEXT',
  LOWER_LAYER_INTERACTION = 'LOWER_LAYER_INTERACTION',
  BOUNDARY_VALIDATION = 'BOUNDARY_VALIDATION',
  INVARIANT = 'INVARIANT',
}

export const ALL_L12_AUDIT_SUBJECT_CLASSES:
  readonly L12ConstitutionalAuditSubjectClass[] =
  Object.values(L12ConstitutionalAuditSubjectClass);

export type L12AuditSeverity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';

export interface L12ConstitutionalAuditRecord {
  readonly audit_id: string;
  readonly timestamp: string;
  readonly subjectClass: L12ConstitutionalAuditSubjectClass;
  readonly violationCode: L12ConstitutionalViolationCode;
  readonly source: string;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: L12AuditSeverity;
}

const auditLog: L12ConstitutionalAuditRecord[] = [];
let auditCounter = 0;

function nextAuditId(): string {
  auditCounter += 1;
  return `l12.audit.${auditCounter.toString().padStart(8, '0')}`;
}

export function resetL12ConstitutionalAuditLog(): void {
  auditLog.length = 0;
  auditCounter = 0;
}

/**
 * §12.1.14.2 — Severity mapping. CRITICAL, ERROR, WARNING.
 */
const CRITICAL_CODES = new Set<L12ConstitutionalViolationCode>([
  L12ConstitutionalViolationCode.L12C_PREDICTION_THEATER,
  L12ConstitutionalViolationCode.L12C_CERTAINTY_CLAIM,
  L12ConstitutionalViolationCode.L12C_RECOMMENDATION_LEAK,
  L12ConstitutionalViolationCode.L12C_JUDGMENT_LEAK,
  L12ConstitutionalViolationCode.L12C_TRADE_ACTION_LEAK,
  L12ConstitutionalViolationCode.L12C_SCENARIO_AS_GUARANTEE,
  L12ConstitutionalViolationCode.L12C_SINGLE_PATH_FAKE_CERTAINTY,
  L12ConstitutionalViolationCode.L12C_LOWER_LAYER_REDEFINITION,
  L12ConstitutionalViolationCode.L12C_VALIDATION_REBUILD,
  L12ConstitutionalViolationCode.L12C_REGIME_REBUILD,
  L12ConstitutionalViolationCode.L12C_SEQUENCE_REBUILD,
  L12ConstitutionalViolationCode.L12C_HYPOTHESIS_REBUILD,
  L12ConstitutionalViolationCode.L12C_SCORE_REBUILD,
  L12ConstitutionalViolationCode.L12C_L11_SCORE_VALUE_ONLY,
  L12ConstitutionalViolationCode.L12C_INVALIDATION_OMITTED,
  L12ConstitutionalViolationCode.L12C_L5_BYPASS,
  L12ConstitutionalViolationCode.L12C_RAW_STORAGE_BYPASS,
  L12ConstitutionalViolationCode.L12C_LATE_LAYER_CONSUMPTION,
  L12ConstitutionalViolationCode.L12C_RESTRICTION_BYPASS,
  L12ConstitutionalViolationCode.L12C_CONTRADICTION_DOWNGRADED,
  L12ConstitutionalViolationCode.L12C_REGIME_POSTURE_IGNORED,
  L12ConstitutionalViolationCode.L12C_SEQUENCE_POSTURE_IGNORED,
  L12ConstitutionalViolationCode.L12C_HYPOTHESIS_POSTURE_IGNORED,
  L12ConstitutionalViolationCode.L12C_ACTIVE_INVALIDATION_HIDDEN,
  L12ConstitutionalViolationCode.L12C_MISSION_MISMATCH,
]);

const ERROR_CODES = new Set<L12ConstitutionalViolationCode>([
  L12ConstitutionalViolationCode.L12C_TRIGGER_OMITTED,
  L12ConstitutionalViolationCode.L12C_CONDITION_OMITTED,
  L12ConstitutionalViolationCode.L12C_LINEAGE_MISSING,
  L12ConstitutionalViolationCode.L12C_REPLAY_HASH_MISSING,
  L12ConstitutionalViolationCode.L12C_SCORE_CONTEXT_INCOMPLETE,
  L12ConstitutionalViolationCode.L12C_OUTPUT_SURFACE_UNREGISTERED,
  L12ConstitutionalViolationCode.L12C_DEPENDENCY_SURFACE_UNREGISTERED,
  L12ConstitutionalViolationCode.L12C_ILLEGAL_DEPENDENCY_USAGE,
  L12ConstitutionalViolationCode.L12C_ILLEGAL_OUTPUT_CLASS,
  L12ConstitutionalViolationCode.L12C_ILLEGAL_CAPABILITY_CLAIM,
  L12ConstitutionalViolationCode.L12C_FORBIDDEN_NAMING,
  L12ConstitutionalViolationCode.L12C_PATH_CONFIDENCE_LAUNDERING,
  L12ConstitutionalViolationCode.L12C_SCENARIO_SPREAD_HIDDEN,
  L12ConstitutionalViolationCode.L12C_DRIFT_STATUS_HIDDEN,
  L12ConstitutionalViolationCode.L12C_MISSING_VISIBILITY_HIDDEN,
]);

export function severityForL12ViolationCode(
  code: L12ConstitutionalViolationCode,
): L12AuditSeverity {
  if (CRITICAL_CODES.has(code)) return 'CRITICAL';
  if (ERROR_CODES.has(code)) return 'ERROR';
  return 'WARNING';
}

export function emitL12AuditRecord(
  record: Omit<L12ConstitutionalAuditRecord, 'timestamp' | 'audit_id'>,
): L12ConstitutionalAuditRecord {
  const full: L12ConstitutionalAuditRecord = {
    ...record,
    audit_id: nextAuditId(),
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function makeL12AuditRecord(
  subjectClass: L12ConstitutionalAuditSubjectClass,
  violationCode: L12ConstitutionalViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): L12ConstitutionalAuditRecord {
  return emitL12AuditRecord({
    subjectClass,
    violationCode,
    source,
    detail,
    context,
    severity: severityForL12ViolationCode(violationCode),
  });
}

export function getL12ConstitutionalAuditLog():
  readonly L12ConstitutionalAuditRecord[] {
  return [...auditLog];
}

export function getL12CriticalViolations():
  readonly L12ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getL12ViolationsByCode(
  code: L12ConstitutionalViolationCode,
): readonly L12ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function getL12ViolationsBySubjectClass(
  cls: L12ConstitutionalAuditSubjectClass,
): readonly L12ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.subjectClass === cls);
}

export function hasAnyL12Violations(): boolean {
  return auditLog.length > 0;
}

export function getL12ViolationCount(): number {
  return auditLog.length;
}
