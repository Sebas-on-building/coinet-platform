/**
 * L6.1 — Constitutional Audit Surface
 *
 * §6.1.8.4 — Emits boundary audit records for every violation.
 */

import { L6BoundaryViolationCode } from '../contracts/l6-violation-codes';

export interface ConstitutionalAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L6BoundaryViolationCode;
  readonly source: string;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const auditLog: ConstitutionalAuditRecord[] = [];

export function resetConstitutionalAuditLog(): void { auditLog.length = 0; }

export function emitAuditRecord(record: Omit<ConstitutionalAuditRecord, 'timestamp'>): ConstitutionalAuditRecord {
  const full: ConstitutionalAuditRecord = { ...record, timestamp: new Date().toISOString() };
  auditLog.push(full);
  return full;
}

export function getConstitutionalAuditLog(): readonly ConstitutionalAuditRecord[] {
  return [...auditLog];
}

export function getCriticalViolations(): readonly ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getViolationsByCode(code: L6BoundaryViolationCode): readonly ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function hasAnyViolations(): boolean {
  return auditLog.length > 0;
}

export function getViolationCount(): number {
  return auditLog.length;
}

export function emitDependencyViolation(surfaceId: string, requestor: string, reason: string): void {
  emitAuditRecord({
    violationCode: L6BoundaryViolationCode.UNREGISTERED_DEPENDENCY,
    source: requestor, detail: reason,
    context: { surfaceId },
    severity: 'CRITICAL',
  });
}

export function emitOutputViolation(surfaceId: string, emitter: string, reason: string): void {
  emitAuditRecord({
    violationCode: L6BoundaryViolationCode.UNREGISTERED_OUTPUT,
    source: emitter, detail: reason,
    context: { surfaceId },
    severity: 'CRITICAL',
  });
}

export function emitNamingViolation(name: string, source: string): void {
  emitAuditRecord({
    violationCode: L6BoundaryViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
    source, detail: `Forbidden judgment semantics in name: "${name}"`,
    context: { name },
    severity: 'HIGH',
  });
}

export function emitRawInputViolation(inputSource: string, requestor: string): void {
  emitAuditRecord({
    violationCode: L6BoundaryViolationCode.RAW_PROVIDER_INPUT,
    source: requestor, detail: `Raw provider input detected: "${inputSource}"`,
    context: { inputSource },
    severity: 'CRITICAL',
  });
}

export function emitNeutralFillViolation(field: string, handler: string, source: string): void {
  emitAuditRecord({
    violationCode: L6BoundaryViolationCode.SILENT_NEUTRAL_FILL,
    source, detail: `Silent neutral fill in "${field}" via "${handler}"`,
    context: { field, handler },
    severity: 'HIGH',
  });
}
