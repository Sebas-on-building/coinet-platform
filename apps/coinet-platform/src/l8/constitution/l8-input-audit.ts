/**
 * L8.5 — Input Audit Surface
 *
 * §8.5.9.4 — Emits durable audit records whenever an L8.5 binding,
 * admissibility, or consumption validator rejects an artifact. Disjoint
 * from:
 *   - L8.1 constitutional audit (boundary/dependency law)
 *   - L8.2 object audit       (object-shape law)
 *   - L8.3 contract audit     (contract legality)
 *   - L8.4 runtime audit      (runtime execution)
 *
 * so the input-tier log remains unambiguous.
 */

import { L8RegimeInputViolationCode } from '../contracts/regime-consumption-rights';

export interface L8InputAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L8RegimeInputViolationCode;
  readonly source: string;
  readonly subjectId: string | null;
  readonly bindingId: string | null;
  readonly ref: string | null;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const auditLog: L8InputAuditRecord[] = [];

export function resetL8InputAuditLog(): void {
  auditLog.length = 0;
}

export function emitL8InputAuditRecord(
  record: Omit<L8InputAuditRecord, 'timestamp'>,
): L8InputAuditRecord {
  const full: L8InputAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getL8InputAuditLog(): readonly L8InputAuditRecord[] {
  return [...auditLog];
}

export function getL8InputCriticalViolations(): readonly L8InputAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getL8InputViolationsByCode(
  code: L8RegimeInputViolationCode,
): readonly L8InputAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function hasAnyL8InputViolations(): boolean {
  return auditLog.length > 0;
}

export function getL8InputViolationCount(): number {
  return auditLog.length;
}

export function emitL8BindingViolation(
  source: string,
  code: L8RegimeInputViolationCode,
  bindingId: string | null,
  ref: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8InputAuditRecord {
  return emitL8InputAuditRecord({
    violationCode: code, source,
    subjectId: null, bindingId, ref,
    detail, context,
    severity: 'HIGH',
  });
}

export function emitL8AdmissibilityViolation(
  source: string,
  code: L8RegimeInputViolationCode,
  ref: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8InputAuditRecord {
  return emitL8InputAuditRecord({
    violationCode: code, source,
    subjectId: null, bindingId: null, ref,
    detail, context,
    severity: 'HIGH',
  });
}

export function emitL8ConsumptionViolation(
  source: string,
  code: L8RegimeInputViolationCode,
  ref: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8InputAuditRecord {
  return emitL8InputAuditRecord({
    violationCode: code, source,
    subjectId: null, bindingId: null, ref,
    detail, context,
    severity: 'HIGH',
  });
}

export function emitL8LowerLayerConsumptionViolation(
  source: string,
  code: L8RegimeInputViolationCode,
  subjectId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8InputAuditRecord {
  return emitL8InputAuditRecord({
    violationCode: code, source,
    subjectId, bindingId: null, ref: null,
    detail, context,
    severity: 'CRITICAL',
  });
}

export function emitL8JudgmentLeakViolation(
  source: string,
  ref: string,
  detail: string,
  context: Record<string, unknown> = {},
): L8InputAuditRecord {
  return emitL8InputAuditRecord({
    violationCode: L8RegimeInputViolationCode.JUDGMENT_SURFACE_LEAK,
    source, subjectId: null, bindingId: null, ref,
    detail, context,
    severity: 'CRITICAL',
  });
}
