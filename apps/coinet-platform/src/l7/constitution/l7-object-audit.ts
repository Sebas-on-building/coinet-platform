/**
 * L7.2 — Object-Model Audit Surface
 *
 * §7.2.7.6 — Emits durable audit records whenever an L7.2 validator or
 * registry rejects a subject, output object, contradiction bundle,
 * confidence assessment, or restriction profile. This log is separate
 * from the L7.1 constitutional audit because §7.2.7.6 violations
 * concern object legality rather than boundary/dependency law.
 */

import { L7ObjectViolationCode } from '../contracts/validation-output-class';

export interface L7ObjectAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L7ObjectViolationCode;
  readonly source: string;
  readonly subjectId: string | null;
  readonly outputClass: string | null;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const auditLog: L7ObjectAuditRecord[] = [];

export function resetObjectAuditLog(): void {
  auditLog.length = 0;
}

export function emitObjectAuditRecord(
  record: Omit<L7ObjectAuditRecord, 'timestamp'>,
): L7ObjectAuditRecord {
  const full: L7ObjectAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getObjectAuditLog(): readonly L7ObjectAuditRecord[] {
  return [...auditLog];
}

export function getObjectCriticalViolations(): readonly L7ObjectAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getObjectViolationsByCode(
  code: L7ObjectViolationCode,
): readonly L7ObjectAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function hasAnyObjectViolations(): boolean {
  return auditLog.length > 0;
}

export function getObjectViolationCount(): number {
  return auditLog.length;
}

export function emitInvalidSubjectViolation(
  source: string,
  code: L7ObjectViolationCode,
  subjectId: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L7ObjectAuditRecord {
  return emitObjectAuditRecord({
    violationCode: code,
    source,
    subjectId,
    outputClass: null,
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitInvalidOutputViolation(
  source: string,
  code: L7ObjectViolationCode,
  outputClass: string,
  detail: string,
  context: Record<string, unknown> = {},
): L7ObjectAuditRecord {
  return emitObjectAuditRecord({
    violationCode: code,
    source,
    subjectId: null,
    outputClass,
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitContradictionLeakViolation(
  source: string,
  subjectId: string,
  detail: string,
  context: Record<string, unknown> = {},
): L7ObjectAuditRecord {
  return emitObjectAuditRecord({
    violationCode: L7ObjectViolationCode.ASSESSMENT_CONTRADICTION_MISSING,
    source,
    subjectId,
    outputClass: 'VALIDATION_ASSESSMENT',
    detail,
    context,
    severity: 'CRITICAL',
  });
}

export function emitConfidenceFactorViolation(
  source: string,
  subjectId: string,
  detail: string,
  context: Record<string, unknown> = {},
): L7ObjectAuditRecord {
  return emitObjectAuditRecord({
    violationCode: L7ObjectViolationCode.CONFIDENCE_MISSING_FACTORS,
    source,
    subjectId,
    outputClass: 'CONFIDENCE_ASSESSMENT',
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitRestrictionClarityViolation(
  source: string,
  subjectId: string,
  detail: string,
  context: Record<string, unknown> = {},
): L7ObjectAuditRecord {
  return emitObjectAuditRecord({
    violationCode: L7ObjectViolationCode.RESTRICTION_MISSING_REASONS,
    source,
    subjectId,
    outputClass: 'CLAIM_RESTRICTION_PROFILE',
    detail,
    context,
    severity: 'HIGH',
  });
}

export function emitSubjectJudgmentLeakViolation(
  source: string,
  subjectId: string,
  detail: string,
  context: Record<string, unknown> = {},
): L7ObjectAuditRecord {
  return emitObjectAuditRecord({
    violationCode: L7ObjectViolationCode.SUBJECT_JUDGMENT_LEAK,
    source,
    subjectId,
    outputClass: null,
    detail,
    context,
    severity: 'CRITICAL',
  });
}
