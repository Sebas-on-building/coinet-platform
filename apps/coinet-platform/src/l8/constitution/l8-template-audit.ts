/**
 * L8.6 — Template Audit Surface
 *
 * §8.6.9.2 Band E — Emits durable audit records whenever an L8.6
 * template, rollout, or consistency validator rejects a template or
 * registry state. Disjoint from:
 *   - L8.1 constitutional audit
 *   - L8.2 object audit
 *   - L8.3 contract audit
 *   - L8.4 runtime audit (via runtime violation codes)
 *   - L8.5 input audit
 *
 * so the template-tier log remains unambiguous.
 */

import { L8RegimeTemplateViolationCode } from '../validation/l8-template-violation-codes';

export interface L8TemplateAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L8RegimeTemplateViolationCode;
  readonly source: string;
  readonly templateId: string | null;
  readonly family: string | null;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const auditLog: L8TemplateAuditRecord[] = [];

export function resetL8TemplateAuditLog(): void {
  auditLog.length = 0;
}

export function emitL8TemplateAuditRecord(
  record: Omit<L8TemplateAuditRecord, 'timestamp'>,
): L8TemplateAuditRecord {
  const full: L8TemplateAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getL8TemplateAuditLog():
  readonly L8TemplateAuditRecord[] {
  return [...auditLog];
}

export function getL8TemplateCriticalViolations():
  readonly L8TemplateAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getL8TemplateViolationsByCode(
  code: L8RegimeTemplateViolationCode,
): readonly L8TemplateAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function getL8TemplateViolationsByFamily(
  family: string,
): readonly L8TemplateAuditRecord[] {
  return auditLog.filter(r => r.family === family);
}

export function hasAnyL8TemplateViolations(): boolean {
  return auditLog.length > 0;
}

export function getL8TemplateViolationCount(): number {
  return auditLog.length;
}

export function emitL8TemplateMissingFieldViolation(
  source: string,
  code: L8RegimeTemplateViolationCode,
  templateId: string | null,
  family: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8TemplateAuditRecord {
  return emitL8TemplateAuditRecord({
    violationCode: code, source, templateId, family,
    detail, context, severity: 'HIGH',
  });
}

export function emitL8TemplateConsistencyViolation(
  source: string,
  code: L8RegimeTemplateViolationCode,
  templateId: string | null,
  family: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8TemplateAuditRecord {
  return emitL8TemplateAuditRecord({
    violationCode: code, source, templateId, family,
    detail, context, severity: 'HIGH',
  });
}

export function emitL8TemplateRolloutViolation(
  source: string,
  code: L8RegimeTemplateViolationCode,
  templateId: string | null,
  family: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8TemplateAuditRecord {
  return emitL8TemplateAuditRecord({
    violationCode: code, source, templateId, family,
    detail, context, severity: 'CRITICAL',
  });
}

export function emitL8TemplateJudgmentLeakViolation(
  source: string,
  templateId: string | null,
  family: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8TemplateAuditRecord {
  return emitL8TemplateAuditRecord({
    violationCode: L8RegimeTemplateViolationCode.TEMPLATE_JUDGMENT_LEAK,
    source, templateId, family,
    detail, context, severity: 'CRITICAL',
  });
}

export function emitL8TemplateSemanticDriftViolation(
  source: string,
  templateId: string | null,
  family: string | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8TemplateAuditRecord {
  return emitL8TemplateAuditRecord({
    violationCode: L8RegimeTemplateViolationCode.TEMPLATE_SEMANTIC_DRIFT,
    source, templateId, family,
    detail, context, severity: 'CRITICAL',
  });
}
