/**
 * L6.2 — Primitive Audit Surface
 *
 * §6.2.8.4 — A lightweight primitive-audit system emits records any time:
 *  - a primitive contract is rejected
 *  - a kind mismatch occurs
 *  - judgment leakage is detected
 *  - contradiction support is missing where required
 *  - a feature/event boundary violation occurs
 */

import {
  L6PrimitiveValidationResult,
  L6PrimitiveViolation,
  L6PrimitiveViolationCode,
} from '../validation/validation-result';

export type PrimitiveAuditSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';

export interface PrimitiveAuditRecord {
  readonly timestamp: string;
  readonly source: string;
  readonly primitive_id: string | null;
  readonly violationCode: L6PrimitiveViolationCode;
  readonly path: string;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: PrimitiveAuditSeverity;
}

const SEVERITY_BY_CODE: Partial<Record<L6PrimitiveViolationCode, PrimitiveAuditSeverity>> = {
  [L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_NAME]: 'CRITICAL',
  [L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_DESCRIPTION]: 'CRITICAL',
  [L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_TRANSFORM]: 'CRITICAL',
  [L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_SEVERITY]: 'HIGH',
  [L6PrimitiveViolationCode.FEATURE_HAS_EVENT_LIFECYCLE]: 'CRITICAL',
  [L6PrimitiveViolationCode.EVENT_LACKS_TRIGGER]: 'CRITICAL',
  [L6PrimitiveViolationCode.EVENT_LACKS_LIFECYCLE]: 'CRITICAL',
  [L6PrimitiveViolationCode.EVENT_IS_STEADY_STATE]: 'HIGH',
  [L6PrimitiveViolationCode.MIXED_STATE_AND_CHANGE]: 'CRITICAL',
  [L6PrimitiveViolationCode.UNREGISTERED_FEATURE_KIND]: 'CRITICAL',
  [L6PrimitiveViolationCode.UNREGISTERED_EVENT_KIND]: 'CRITICAL',
  [L6PrimitiveViolationCode.FORBIDDEN_NEUTRAL_FILL]: 'CRITICAL',
  [L6PrimitiveViolationCode.CONTRADICTION_COLLAPSE_ATTEMPT]: 'CRITICAL',
  [L6PrimitiveViolationCode.INCOMPATIBLE_TRANSFORMATION_CLASS]: 'HIGH',
  [L6PrimitiveViolationCode.INCOMPLETE_LINEAGE_POLICY]: 'HIGH',
  [L6PrimitiveViolationCode.MISSING_LINEAGE_POLICY]: 'HIGH',
};

const auditLog: PrimitiveAuditRecord[] = [];

export function resetPrimitiveAuditLog(): void {
  auditLog.length = 0;
}

export function emitPrimitiveAudit(
  source: string,
  primitive_id: string | null,
  violation: L6PrimitiveViolation,
): PrimitiveAuditRecord {
  const record: PrimitiveAuditRecord = {
    timestamp: new Date().toISOString(),
    source,
    primitive_id,
    violationCode: violation.code,
    path: violation.path,
    detail: violation.detail,
    context: violation.context,
    severity: SEVERITY_BY_CODE[violation.code] ?? 'MEDIUM',
  };
  auditLog.push(record);
  return record;
}

export function emitValidationResult(
  source: string,
  primitive_id: string | null,
  result: L6PrimitiveValidationResult,
): readonly PrimitiveAuditRecord[] {
  if (result.valid) return [];
  return result.violations.map(vio => emitPrimitiveAudit(source, primitive_id, vio));
}

export function getPrimitiveAuditLog(): readonly PrimitiveAuditRecord[] {
  return [...auditLog];
}

export function getCriticalPrimitiveViolations(): readonly PrimitiveAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getPrimitiveViolationsByCode(
  code: L6PrimitiveViolationCode,
): readonly PrimitiveAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function getPrimitiveAuditCount(): number {
  return auditLog.length;
}
