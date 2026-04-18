/**
 * L8.1 — Constitutional Audit Surface
 *
 * §8.1.7.4 — Emits durable audit records for every boundary violation:
 * illegal dependency requests, forbidden actions, illegal capability
 * claims, illegal output classes, recommendation/scenario/judgment
 * leakage, restriction bypass attempts, ambiguity laundering,
 * stale-regime masquerade, and raw-data regime invention.
 */

import { L8ConstitutionalViolationCode } from '../contracts/l8-violation-codes';

export interface L8ConstitutionalAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L8ConstitutionalViolationCode;
  readonly source: string;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const auditLog: L8ConstitutionalAuditRecord[] = [];

export function resetL8ConstitutionalAuditLog(): void {
  auditLog.length = 0;
}

export function emitL8AuditRecord(
  record: Omit<L8ConstitutionalAuditRecord, 'timestamp'>,
): L8ConstitutionalAuditRecord {
  const full: L8ConstitutionalAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getL8ConstitutionalAuditLog(): readonly L8ConstitutionalAuditRecord[] {
  return [...auditLog];
}

export function getL8CriticalViolations(): readonly L8ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getL8ViolationsByCode(
  code: L8ConstitutionalViolationCode,
): readonly L8ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function hasAnyL8Violations(): boolean {
  return auditLog.length > 0;
}

export function getL8ViolationCount(): number {
  return auditLog.length;
}

export function emitL8DependencyViolation(
  surfaceId: string,
  requestor: string,
  reason: string,
): void {
  emitL8AuditRecord({
    violationCode: L8ConstitutionalViolationCode.UNREGISTERED_DEPENDENCY,
    source: requestor,
    detail: reason,
    context: { surfaceId },
    severity: 'CRITICAL',
  });
}

export function emitL8OutputViolation(
  surfaceId: string,
  emitter: string,
  reason: string,
): void {
  emitL8AuditRecord({
    violationCode: L8ConstitutionalViolationCode.UNREGISTERED_OUTPUT,
    source: emitter,
    detail: reason,
    context: { surfaceId },
    severity: 'CRITICAL',
  });
}

export function emitL8NamingViolation(name: string, source: string): void {
  emitL8AuditRecord({
    violationCode: L8ConstitutionalViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
    source,
    detail: `Forbidden judgment/scenario/recommendation semantics in name: "${name}"`,
    context: { name },
    severity: 'HIGH',
  });
}

export function emitL8ActionBiasViolation(name: string, source: string): void {
  emitL8AuditRecord({
    violationCode: L8ConstitutionalViolationCode.FORBIDDEN_ACTION_BIAS,
    source,
    detail: `Action-biased regime label: "${name}"`,
    context: { name },
    severity: 'HIGH',
  });
}

export function emitL8AmbiguityLaunderingViolation(
  componentId: string,
  source: string,
  strategy: string,
): void {
  emitL8AuditRecord({
    violationCode: L8ConstitutionalViolationCode.AMBIGUITY_LAUNDERING,
    source,
    detail: `Multi-regime ambiguity laundering via "${strategy}"`,
    context: { componentId, strategy },
    severity: 'CRITICAL',
  });
}

export function emitL8ContradictionIgnoredViolation(
  componentId: string,
  source: string,
): void {
  emitL8AuditRecord({
    violationCode: L8ConstitutionalViolationCode.CONTRADICTION_POSTURE_IGNORED,
    source,
    detail: `Contradiction posture ignored in "${componentId}"`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL8RestrictionBypassViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL8AuditRecord({
    violationCode: L8ConstitutionalViolationCode.RESTRICTION_BYPASS,
    source,
    detail: `Restriction bypass in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL8StaleRegimeViolation(componentId: string, source: string): void {
  emitL8AuditRecord({
    violationCode: L8ConstitutionalViolationCode.STALE_REGIME_MASQUERADE,
    source,
    detail: `Stale regime masquerading as current in "${componentId}"`,
    context: { componentId },
    severity: 'HIGH',
  });
}

export function emitL8RawDataInventionViolation(
  componentId: string,
  source: string,
  detail: string,
): void {
  emitL8AuditRecord({
    violationCode: L8ConstitutionalViolationCode.RAW_DATA_REGIME_INVENTION,
    source,
    detail: `Raw-data regime invention in "${componentId}": ${detail}`,
    context: { componentId },
    severity: 'CRITICAL',
  });
}

export function emitL8StorageBypassViolation(source: string, detail: string): void {
  emitL8AuditRecord({
    violationCode: L8ConstitutionalViolationCode.STORAGE_BYPASS,
    source,
    detail,
    context: {},
    severity: 'CRITICAL',
  });
}

export function emitL8LowerLayerRedefinitionViolation(
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL8AuditRecord({
    violationCode: L8ConstitutionalViolationCode.LOWER_LAYER_REDEFINITION,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL8ValidationRedefinitionViolation(
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL8AuditRecord({
    violationCode: L8ConstitutionalViolationCode.VALIDATION_TRUTH_REDEFINITION,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}
