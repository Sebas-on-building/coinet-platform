/**
 * L8.3 — Contract Audit Surface
 *
 * §8.3.10.2 Band E — Emits durable audit records whenever an L8.3
 * contract validator rejects an artifact, when compatibility
 * classification fails, or when runtime cleanliness law is violated.
 *
 * Disjoint from:
 *   - L8.1 constitutional audit (boundary/dependency law)
 *   - L8.2 object audit       (object-shape law)
 *
 * so that an audit record's tier is unambiguous from its violation code.
 */

import { L8RegimeContractViolationCode } from '../validation/l8-contract-violation-codes';

export interface L8ContractAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L8RegimeContractViolationCode;
  readonly source: string;
  readonly contractSurface: 'SUBJECT' | 'OUTPUT' | 'CONFIDENCE' | 'TRANSITION' | 'MULTIPLIER' | 'COMPATIBILITY';
  readonly subjectId: string | null;
  readonly outputId: string | null;
  readonly contractVersion: string | null;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const auditLog: L8ContractAuditRecord[] = [];

export function resetL8ContractAuditLog(): void {
  auditLog.length = 0;
}

export function emitL8ContractAuditRecord(
  record: Omit<L8ContractAuditRecord, 'timestamp'>,
): L8ContractAuditRecord {
  const full: L8ContractAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getL8ContractAuditLog(): readonly L8ContractAuditRecord[] {
  return [...auditLog];
}

export function getL8ContractCriticalViolations(): readonly L8ContractAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getL8ContractViolationsByCode(
  code: L8RegimeContractViolationCode,
): readonly L8ContractAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function getL8ContractViolationsBySurface(
  surface: L8ContractAuditRecord['contractSurface'],
): readonly L8ContractAuditRecord[] {
  return auditLog.filter(r => r.contractSurface === surface);
}

export function hasAnyL8ContractViolations(): boolean {
  return auditLog.length > 0;
}

export function getL8ContractViolationCount(): number {
  return auditLog.length;
}

export function emitL8SubjectContractViolation(
  source: string,
  code: L8RegimeContractViolationCode,
  subjectId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8ContractAuditRecord {
  return emitL8ContractAuditRecord({
    violationCode: code,
    source,
    contractSurface: 'SUBJECT',
    subjectId,
    outputId: null,
    contractVersion: null,
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitL8OutputContractViolation(
  source: string,
  code: L8RegimeContractViolationCode,
  outputId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8ContractAuditRecord {
  return emitL8ContractAuditRecord({
    violationCode: code,
    source,
    contractSurface: 'OUTPUT',
    subjectId: null,
    outputId,
    contractVersion: null,
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitL8ConfidenceContractViolation(
  source: string,
  code: L8RegimeContractViolationCode,
  outputId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8ContractAuditRecord {
  return emitL8ContractAuditRecord({
    violationCode: code,
    source,
    contractSurface: 'CONFIDENCE',
    subjectId: null,
    outputId,
    contractVersion: null,
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitL8TransitionContractViolation(
  source: string,
  code: L8RegimeContractViolationCode,
  outputId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8ContractAuditRecord {
  return emitL8ContractAuditRecord({
    violationCode: code,
    source,
    contractSurface: 'TRANSITION',
    subjectId: null,
    outputId,
    contractVersion: null,
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitL8MultiplierContractViolation(
  source: string,
  code: L8RegimeContractViolationCode,
  outputId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8ContractAuditRecord {
  return emitL8ContractAuditRecord({
    violationCode: code,
    source,
    contractSurface: 'MULTIPLIER',
    subjectId: null,
    outputId,
    contractVersion: null,
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitL8CleanlinessViolation(
  source: string,
  code: L8RegimeContractViolationCode,
  outputId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8ContractAuditRecord {
  return emitL8ContractAuditRecord({
    violationCode: code,
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

export function emitL8CompatibilityViolation(
  source: string,
  code: L8RegimeContractViolationCode,
  contractVersion: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8ContractAuditRecord {
  return emitL8ContractAuditRecord({
    violationCode: code,
    source,
    contractSurface: 'COMPATIBILITY',
    subjectId: null,
    outputId: null,
    contractVersion,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL8MultiplierScoreOverrideViolation(
  source: string,
  outputId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8ContractAuditRecord {
  return emitL8ContractAuditRecord({
    violationCode: L8RegimeContractViolationCode.MULTIPLIER_IS_SCORE_SHAPED,
    source,
    contractSurface: 'MULTIPLIER',
    subjectId: null,
    outputId,
    contractVersion: null,
    detail,
    context,
    severity: 'CRITICAL',
  });
}
