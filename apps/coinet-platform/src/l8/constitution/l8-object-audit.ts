/**
 * L8.2 — Object-Model Audit Surface
 *
 * §8.2.10.4 — Emits durable audit records whenever an L8.2 validator or
 * registry rejects a regime state, a coexistence claim, or an output
 * object. This log is separate from the L8.1 constitutional audit
 * because §8.2.10.4 violations concern object legality rather than
 * boundary/dependency law.
 */

import { L8RegimeObjectViolationCode } from '../contracts/regime-output-class';

export interface L8ObjectAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L8RegimeObjectViolationCode;
  readonly source: string;
  readonly regimeStateId: string | null;
  readonly regimeSubjectId: string | null;
  readonly outputClass: string | null;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const auditLog: L8ObjectAuditRecord[] = [];

export function resetL8ObjectAuditLog(): void {
  auditLog.length = 0;
}

export function emitL8ObjectAuditRecord(
  record: Omit<L8ObjectAuditRecord, 'timestamp'>,
): L8ObjectAuditRecord {
  const full: L8ObjectAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getL8ObjectAuditLog(): readonly L8ObjectAuditRecord[] {
  return [...auditLog];
}

export function getL8ObjectCriticalViolations(): readonly L8ObjectAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getL8ObjectViolationsByCode(
  code: L8RegimeObjectViolationCode,
): readonly L8ObjectAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function hasAnyL8ObjectViolations(): boolean {
  return auditLog.length > 0;
}

export function getL8ObjectViolationCount(): number {
  return auditLog.length;
}

export function emitL8InvalidRegimeStateViolation(
  source: string,
  code: L8RegimeObjectViolationCode,
  regimeStateId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8ObjectAuditRecord {
  return emitL8ObjectAuditRecord({
    violationCode: code,
    source,
    regimeStateId,
    regimeSubjectId: null,
    outputClass: null,
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitL8IllegalCoexistenceViolation(
  source: string,
  regimeStateId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8ObjectAuditRecord {
  return emitL8ObjectAuditRecord({
    violationCode:
      L8RegimeObjectViolationCode.COEXISTENCE_ILLEGAL_COLLISION,
    source,
    regimeStateId,
    regimeSubjectId: null,
    outputClass: null,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL8FakeCleanSingleViolation(
  source: string,
  regimeStateId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8ObjectAuditRecord {
  return emitL8ObjectAuditRecord({
    violationCode:
      L8RegimeObjectViolationCode.COEXISTENCE_FAKE_CLEAN_SINGLE,
    source,
    regimeStateId,
    regimeSubjectId: null,
    outputClass: null,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL8LifecycleViolation(
  source: string,
  regimeStateId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8ObjectAuditRecord {
  return emitL8ObjectAuditRecord({
    violationCode:
      L8RegimeObjectViolationCode.COEXISTENCE_LIFECYCLE_VIOLATION,
    source,
    regimeStateId,
    regimeSubjectId: null,
    outputClass: null,
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitL8InvalidOutputObjectViolation(
  source: string,
  code: L8RegimeObjectViolationCode,
  outputClass: string,
  detail: string,
  context: Record<string, unknown> = {},
): L8ObjectAuditRecord {
  return emitL8ObjectAuditRecord({
    violationCode: code,
    source,
    regimeStateId: null,
    regimeSubjectId: null,
    outputClass,
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitL8MultiplierWithoutAnchorViolation(
  source: string,
  outputClass: string,
  detail: string,
  context: Record<string, unknown> = {},
): L8ObjectAuditRecord {
  return emitL8ObjectAuditRecord({
    violationCode:
      L8RegimeObjectViolationCode.OUTPUT_MISSING_REGIME_ANCHOR,
    source,
    regimeStateId: null,
    regimeSubjectId: null,
    outputClass,
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitL8OutputJudgmentLeakViolation(
  source: string,
  outputClass: string,
  detail: string,
  context: Record<string, unknown> = {},
): L8ObjectAuditRecord {
  return emitL8ObjectAuditRecord({
    violationCode: L8RegimeObjectViolationCode.OUTPUT_JUDGMENT_LEAK,
    source,
    regimeStateId: null,
    regimeSubjectId: null,
    outputClass,
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitL8OutputScoreOverrideViolation(
  source: string,
  outputClass: string,
  detail: string,
  context: Record<string, unknown> = {},
): L8ObjectAuditRecord {
  return emitL8ObjectAuditRecord({
    violationCode: L8RegimeObjectViolationCode.OUTPUT_SCORE_OVERRIDE,
    source,
    regimeStateId: null,
    regimeSubjectId: null,
    outputClass,
    detail,
    context,
    severity: 'CRITICAL',
  });
}
