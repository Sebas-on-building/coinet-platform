/**
 * L7.3 — Contract Audit Surface
 *
 * §7.3.8.4 — Emits durable audit records whenever an L7.3 contract
 * validator rejects an artifact, when compatibility classification
 * fails, when replay-hash anomalies are detected, or when runtime-status
 * cleanliness is violated.
 *
 * Disjoint from:
 *   - L7.1 constitutional audit (boundary/dependency law)
 *   - L7.2 object audit       (object-shape law)
 *
 * so that an audit record's tier is unambiguous from its violation code.
 */

import { L7ContractViolationCode } from '../validation/contract-violation-codes';

export interface L7ContractAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L7ContractViolationCode;
  readonly source: string;
  readonly contractSurface: string;
  readonly subjectId: string | null;
  readonly outputId: string | null;
  readonly contractVersion: string | null;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const auditLog: L7ContractAuditRecord[] = [];

export function resetContractAuditLog(): void {
  auditLog.length = 0;
}

export function emitContractAuditRecord(
  record: Omit<L7ContractAuditRecord, 'timestamp'>,
): L7ContractAuditRecord {
  const full: L7ContractAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getContractAuditLog(): readonly L7ContractAuditRecord[] {
  return [...auditLog];
}

export function getContractCriticalViolations(): readonly L7ContractAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getContractViolationsByCode(
  code: L7ContractViolationCode,
): readonly L7ContractAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function hasAnyContractViolations(): boolean {
  return auditLog.length > 0;
}

export function getContractViolationCount(): number {
  return auditLog.length;
}

export function emitMalformedContractViolation(
  source: string,
  code: L7ContractViolationCode,
  contractSurface: string,
  subjectOrOutputId: string | null,
  contractVersion: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L7ContractAuditRecord {
  return emitContractAuditRecord({
    violationCode: code,
    source,
    contractSurface,
    subjectId: subjectOrOutputId,
    outputId: null,
    contractVersion,
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitCompatibilityViolation(
  source: string,
  code: L7ContractViolationCode,
  contractSurface: string,
  fromVersion: string,
  toVersion: string,
  detail: string,
  context: Record<string, unknown> = {},
): L7ContractAuditRecord {
  return emitContractAuditRecord({
    violationCode: code,
    source,
    contractSurface,
    subjectId: null,
    outputId: null,
    contractVersion: `${fromVersion}->${toVersion}`,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitReplayAnomaly(
  source: string,
  code: L7ContractViolationCode,
  outputId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L7ContractAuditRecord {
  return emitContractAuditRecord({
    violationCode: code,
    source,
    contractSurface: 'REPLAY_IDENTITY',
    subjectId: null,
    outputId,
    contractVersion: null,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitCleanlinessViolation(
  source: string,
  outputId: string,
  detail: string,
  context: Record<string, unknown> = {},
): L7ContractAuditRecord {
  return emitContractAuditRecord({
    violationCode: L7ContractViolationCode.OUTPUT_CONTRACT_HIDDEN_CLEANLINESS,
    source,
    contractSurface: 'OUTPUT',
    subjectId: null,
    outputId,
    contractVersion: null,
    detail,
    context,
    severity: 'CRITICAL',
  });
}
