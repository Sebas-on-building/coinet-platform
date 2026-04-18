/**
 * L8.7 — Reliance Audit Surface
 *
 * §8.7.10.2 Band E — Emits durable audit records whenever an L8.7
 * policy validator (confidence / transition / multiplier / cap chain /
 * reliance profile) rejects an artifact or a reliance-decision is
 * narrowed or blocked. Disjoint from every earlier L8 audit log:
 *
 *   - L8.1 constitutional audit (forbidden-naming / capability)
 *   - L8.2 object audit (family / subject / coexistence)
 *   - L8.3 contract audit (contract legality)
 *   - L8.4 runtime audit (runtime DAG violations)
 *   - L8.5 input audit (admissibility / consumption)
 *   - L8.6 template audit (template / rollout / consistency)
 *
 * so reliance-tier events remain unambiguous.
 */

import { L8RegimeRelianceViolationCode }
  from '../validation/l8-reliance-violation-codes';

export type L8RelianceAuditSeverity =
  | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';

export type L8RelianceAuditSurface =
  | 'CONFIDENCE' | 'TRANSITION' | 'MULTIPLIER' | 'CAP_CHAIN'
  | 'RELIANCE_PROFILE' | 'INVARIANT';

export interface L8RelianceAuditRecord {
  readonly timestamp: string;
  readonly surface: L8RelianceAuditSurface;
  readonly violationCode: L8RegimeRelianceViolationCode | null;
  readonly source: string;
  readonly subjectRef: string | null;
  readonly regimeResultId: string | null;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: L8RelianceAuditSeverity;
}

const relianceAuditLog: L8RelianceAuditRecord[] = [];

export function resetL8RelianceAuditLog(): void {
  relianceAuditLog.length = 0;
}

export function emitL8RelianceAuditRecord(
  record: Omit<L8RelianceAuditRecord, 'timestamp'>,
): L8RelianceAuditRecord {
  const full: L8RelianceAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  relianceAuditLog.push(full);
  return full;
}

export function getL8RelianceAuditLog(): readonly L8RelianceAuditRecord[] {
  return [...relianceAuditLog];
}

export function getL8RelianceCriticalViolations():
  readonly L8RelianceAuditRecord[] {
  return relianceAuditLog.filter(r => r.severity === 'CRITICAL');
}

export function getL8RelianceViolationsByCode(
  code: L8RegimeRelianceViolationCode,
): readonly L8RelianceAuditRecord[] {
  return relianceAuditLog.filter(r => r.violationCode === code);
}

export function getL8RelianceViolationsBySurface(
  surface: L8RelianceAuditSurface,
): readonly L8RelianceAuditRecord[] {
  return relianceAuditLog.filter(r => r.surface === surface);
}

export function hasAnyL8RelianceViolations(): boolean {
  return relianceAuditLog.length > 0;
}

export function getL8RelianceViolationCount(): number {
  return relianceAuditLog.length;
}

/**
 * §8.7.10.2 Band E — Typed emitters so call sites remain auditable.
 */

export function emitL8ConfidencePolicyViolation(
  source: string,
  code: L8RegimeRelianceViolationCode,
  subjectRef: string | null,
  regimeResultId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
  severity: L8RelianceAuditSeverity = 'HIGH',
): L8RelianceAuditRecord {
  return emitL8RelianceAuditRecord({
    surface: 'CONFIDENCE', violationCode: code, source,
    subjectRef, regimeResultId, detail, context, severity,
  });
}

export function emitL8TransitionRiskViolation(
  source: string,
  code: L8RegimeRelianceViolationCode,
  subjectRef: string | null,
  regimeResultId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
  severity: L8RelianceAuditSeverity = 'HIGH',
): L8RelianceAuditRecord {
  return emitL8RelianceAuditRecord({
    surface: 'TRANSITION', violationCode: code, source,
    subjectRef, regimeResultId, detail, context, severity,
  });
}

export function emitL8MultiplierPolicyViolation(
  source: string,
  code: L8RegimeRelianceViolationCode,
  subjectRef: string | null,
  regimeResultId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
  severity: L8RelianceAuditSeverity = 'HIGH',
): L8RelianceAuditRecord {
  return emitL8RelianceAuditRecord({
    surface: 'MULTIPLIER', violationCode: code, source,
    subjectRef, regimeResultId, detail, context, severity,
  });
}

export function emitL8CapChainViolation(
  source: string,
  code: L8RegimeRelianceViolationCode,
  subjectRef: string | null,
  regimeResultId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
  severity: L8RelianceAuditSeverity = 'HIGH',
): L8RelianceAuditRecord {
  return emitL8RelianceAuditRecord({
    surface: 'CAP_CHAIN', violationCode: code, source,
    subjectRef, regimeResultId, detail, context, severity,
  });
}

export function emitL8RelianceProfileViolation(
  source: string,
  code: L8RegimeRelianceViolationCode,
  subjectRef: string | null,
  regimeResultId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
  severity: L8RelianceAuditSeverity = 'CRITICAL',
): L8RelianceAuditRecord {
  return emitL8RelianceAuditRecord({
    surface: 'RELIANCE_PROFILE', violationCode: code, source,
    subjectRef, regimeResultId, detail, context, severity,
  });
}

export function emitL8InvariantFailure(
  source: string,
  invariantId: string,
  detail: string,
  context: Record<string, unknown> = {},
): L8RelianceAuditRecord {
  return emitL8RelianceAuditRecord({
    surface: 'INVARIANT', violationCode: null, source,
    subjectRef: null, regimeResultId: null,
    detail: `${invariantId} :: ${detail}`,
    context, severity: 'CRITICAL',
  });
}
