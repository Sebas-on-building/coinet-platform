/**
 * L7.1 — Constitutional Audit Surface
 *
 * §7.1.8.4 — Emits durable audit records for every boundary violation:
 * illegal dependency requests, forbidden actions, illegal capability
 * claims, illegal output classes, recommendation/scenario/judgment
 * leakage, and contradiction/ambiguity/staleness laundering.
 */

import { L7BoundaryViolationCode } from '../contracts/l7-violation-codes';

export interface ConstitutionalAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L7BoundaryViolationCode;
  readonly source: string;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const auditLog: ConstitutionalAuditRecord[] = [];

export function resetConstitutionalAuditLog(): void {
  auditLog.length = 0;
}

export function emitAuditRecord(
  record: Omit<ConstitutionalAuditRecord, 'timestamp'>,
): ConstitutionalAuditRecord {
  const full: ConstitutionalAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getConstitutionalAuditLog(): readonly ConstitutionalAuditRecord[] {
  return [...auditLog];
}

export function getCriticalViolations(): readonly ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getViolationsByCode(
  code: L7BoundaryViolationCode,
): readonly ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function hasAnyViolations(): boolean {
  return auditLog.length > 0;
}

export function getViolationCount(): number {
  return auditLog.length;
}

export function emitDependencyViolation(
  surfaceId: string,
  requestor: string,
  reason: string,
): void {
  emitAuditRecord({
    violationCode: L7BoundaryViolationCode.UNREGISTERED_DEPENDENCY,
    source: requestor,
    detail: reason,
    context: { surfaceId },
    severity: 'CRITICAL',
  });
}

export function emitOutputViolation(
  surfaceId: string,
  emitter: string,
  reason: string,
): void {
  emitAuditRecord({
    violationCode: L7BoundaryViolationCode.UNREGISTERED_OUTPUT,
    source: emitter,
    detail: reason,
    context: { surfaceId },
    severity: 'CRITICAL',
  });
}

export function emitNamingViolation(name: string, source: string): void {
  emitAuditRecord({
    violationCode: L7BoundaryViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
    source,
    detail: `Forbidden judgment/recommendation semantics in name: "${name}"`,
    context: { name },
    severity: 'HIGH',
  });
}

export function emitContradictionLaunderingViolation(
  componentId: string,
  source: string,
  strategy: string,
): void {
  emitAuditRecord({
    violationCode: L7BoundaryViolationCode.CONTRADICTION_LAUNDERING,
    source,
    detail: `Contradiction laundering via "${strategy}"`,
    context: { componentId, strategy },
    severity: 'CRITICAL',
  });
}

export function emitAmbiguityViolation(
  componentId: string,
  source: string,
  strategy: string,
): void {
  emitAuditRecord({
    violationCode: L7BoundaryViolationCode.AMBIGUITY_SILENT_RESOLUTION,
    source,
    detail: `Silent ambiguity resolution via "${strategy}"`,
    context: { componentId, strategy },
    severity: 'CRITICAL',
  });
}

export function emitStalenessViolation(componentId: string, source: string): void {
  emitAuditRecord({
    violationCode: L7BoundaryViolationCode.STALE_SUPPORT_MASQUERADE,
    source,
    detail: `Stale support treated as fresh in "${componentId}"`,
    context: { componentId },
    severity: 'HIGH',
  });
}

export function emitIncompletenessViolation(
  componentId: string,
  source: string,
): void {
  emitAuditRecord({
    violationCode: L7BoundaryViolationCode.INCOMPLETENESS_NEGLECT,
    source,
    detail: `Incompleteness silently ignored in "${componentId}"`,
    context: { componentId },
    severity: 'HIGH',
  });
}

export function emitStorageBypassViolation(source: string, detail: string): void {
  emitAuditRecord({
    violationCode: L7BoundaryViolationCode.STORAGE_BYPASS,
    source,
    detail,
    context: {},
    severity: 'CRITICAL',
  });
}

export function emitLowerLayerRedefinitionViolation(
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitAuditRecord({
    violationCode: L7BoundaryViolationCode.LOWER_LAYER_REDEFINITION,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}
