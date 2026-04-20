/**
 * L9.3 — Contract-Layer Audit Surface
 *
 * §9.3.10.2 (Band E) — Durable audit log for contract-layer violations.
 * Disjoint from the L9.1 constitutional audit and the L9.2 object
 * audit so each audit record is unambiguous about which tier rejected
 * an artifact.
 */

import { L9SequenceContractViolationCode } from '../validation/l9-contract-violation-codes';
import { L9ContractSurface } from '../contracts/sequence-contract-versioning';

export interface L9ContractAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L9SequenceContractViolationCode;
  readonly surface: L9ContractSurface | 'READINESS' | 'COMPATIBILITY';
  readonly source: string;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const contractAuditLog: L9ContractAuditRecord[] = [];

export function resetL9ContractAuditLog(): void {
  contractAuditLog.length = 0;
}

export function emitL9ContractAuditRecord(
  record: Omit<L9ContractAuditRecord, 'timestamp'>,
): L9ContractAuditRecord {
  const full: L9ContractAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  contractAuditLog.push(full);
  return full;
}

export function getL9ContractAuditLog(): readonly L9ContractAuditRecord[] {
  return [...contractAuditLog];
}

export function getL9ContractCriticalViolations(): readonly L9ContractAuditRecord[] {
  return contractAuditLog.filter(r => r.severity === 'CRITICAL');
}

export function getL9ContractViolationsByCode(
  code: L9SequenceContractViolationCode,
): readonly L9ContractAuditRecord[] {
  return contractAuditLog.filter(r => r.violationCode === code);
}

export function getL9ContractViolationsBySurface(
  surface: L9ContractAuditRecord['surface'],
): readonly L9ContractAuditRecord[] {
  return contractAuditLog.filter(r => r.surface === surface);
}

export function hasAnyL9ContractViolations(): boolean {
  return contractAuditLog.length > 0;
}

export function getL9ContractViolationCount(): number {
  return contractAuditLog.length;
}

// ── Specialized emission helpers ──

export function emitL9SubjectContractViolation(
  code: L9SequenceContractViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ContractAuditRecord({
    violationCode: code,
    surface: L9ContractSurface.SUBJECT,
    source, detail, context,
    severity: 'HIGH',
  });
}

export function emitL9OutputContractViolation(
  code: L9SequenceContractViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ContractAuditRecord({
    violationCode: code,
    surface: L9ContractSurface.OUTPUT,
    source, detail, context,
    severity: 'CRITICAL',
  });
}

export function emitL9LeadLagContractViolation(
  code: L9SequenceContractViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ContractAuditRecord({
    violationCode: code,
    surface: L9ContractSurface.LEAD_LAG,
    source, detail, context,
    severity: 'HIGH',
  });
}

export function emitL9ChainContractViolation(
  code: L9SequenceContractViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ContractAuditRecord({
    violationCode: code,
    surface: L9ContractSurface.CHAIN,
    source, detail, context,
    severity: 'HIGH',
  });
}

export function emitL9PhaseContractViolation(
  code: L9SequenceContractViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ContractAuditRecord({
    violationCode: code,
    surface: L9ContractSurface.PHASE,
    source, detail, context,
    severity: 'HIGH',
  });
}

export function emitL9DecayContractViolation(
  code: L9SequenceContractViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ContractAuditRecord({
    violationCode: code,
    surface: L9ContractSurface.DECAY,
    source, detail, context,
    severity: 'HIGH',
  });
}

export function emitL9PostEventContractViolation(
  code: L9SequenceContractViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ContractAuditRecord({
    violationCode: code,
    surface: L9ContractSurface.POST_EVENT,
    source, detail, context,
    severity: 'HIGH',
  });
}

export function emitL9RestrictionContractViolation(
  code: L9SequenceContractViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ContractAuditRecord({
    violationCode: code,
    surface: L9ContractSurface.RESTRICTION,
    source, detail, context,
    severity: 'CRITICAL',
  });
}

export function emitL9CompatibilityViolation(
  code: L9SequenceContractViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ContractAuditRecord({
    violationCode: code,
    surface: 'COMPATIBILITY',
    source, detail, context,
    severity: 'CRITICAL',
  });
}

export function emitL9ReadinessViolation(
  code: L9SequenceContractViolationCode,
  source: string,
  detail: string,
  context: Record<string, unknown> = {},
): void {
  emitL9ContractAuditRecord({
    violationCode: code,
    surface: 'READINESS',
    source, detail, context,
    severity: 'HIGH',
  });
}
