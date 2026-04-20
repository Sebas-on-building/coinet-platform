/**
 * L9.2 — Object-Layer Audit Surface
 *
 * §9.2.10.4 — Durable audit log for object-level violations. Disjoint
 * from the L9.1 constitutional audit (which uses
 * L9ConstitutionalViolationCode + `l9-constitutional-audit`), so each
 * audit record is unambiguous about which tier rejected an artifact.
 */

import { L9SequenceObjectViolationCode } from '../contracts/sequence-output-class';

export interface L9ObjectAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L9SequenceObjectViolationCode;
  readonly source: string;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const objectAuditLog: L9ObjectAuditRecord[] = [];

export function resetL9ObjectAuditLog(): void {
  objectAuditLog.length = 0;
}

export function emitL9ObjectAuditRecord(
  record: Omit<L9ObjectAuditRecord, 'timestamp'>,
): L9ObjectAuditRecord {
  const full: L9ObjectAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  objectAuditLog.push(full);
  return full;
}

export function getL9ObjectAuditLog(): readonly L9ObjectAuditRecord[] {
  return [...objectAuditLog];
}

export function getL9ObjectCriticalViolations():
  readonly L9ObjectAuditRecord[] {
  return objectAuditLog.filter(r => r.severity === 'CRITICAL');
}

export function getL9ObjectViolationsByCode(
  code: L9SequenceObjectViolationCode,
): readonly L9ObjectAuditRecord[] {
  return objectAuditLog.filter(r => r.violationCode === code);
}

export function hasAnyL9ObjectViolations(): boolean {
  return objectAuditLog.length > 0;
}

export function getL9ObjectViolationCount(): number {
  return objectAuditLog.length;
}

// ── Specialized emission helpers ──

export function emitL9SubjectViolation(
  code: L9SequenceObjectViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ObjectAuditRecord({
    violationCode: code,
    source,
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitL9FamilyViolation(
  code: L9SequenceObjectViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ObjectAuditRecord({
    violationCode: code,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL9StateViolation(
  code: L9SequenceObjectViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ObjectAuditRecord({
    violationCode: code,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL9CoexistenceViolation(
  code: L9SequenceObjectViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ObjectAuditRecord({
    violationCode: code,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL9AssessmentViolation(
  code: L9SequenceObjectViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ObjectAuditRecord({
    violationCode: code,
    source,
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitL9OutputObjectViolation(
  code: L9SequenceObjectViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ObjectAuditRecord({
    violationCode: code,
    source,
    detail,
    context,
    severity: 'CRITICAL',
  });
}
