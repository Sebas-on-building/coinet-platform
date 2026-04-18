/**
 * L6.6 — Family Audit Log
 *
 * Emits typed, deterministic audit records when family validators reject
 * definitions, surfaces, or dependency bindings. Queryable by family, trace,
 * and violation code.
 */

import { L6FamilyViolationCode } from '../validation/legal-input.validator';

export enum L6FamilyAuditSeverity {
  INFO = 'INFO',
  WARN = 'WARN',
  BLOCKING = 'BLOCKING',
  FATAL = 'FATAL',
}

export interface L6FamilyAuditRecord {
  readonly id: string;
  readonly emittedAt: string;
  readonly code: L6FamilyViolationCode;
  readonly severity: L6FamilyAuditSeverity;
  readonly field: string;
  readonly detail: string;
  readonly family_id: string | null;
  readonly primitive_id: string | null;
  readonly trace_id: string | null;
  readonly context: Record<string, unknown>;
}

export interface L6FamilyAuditContext {
  readonly family_id?: string;
  readonly primitive_id?: string;
  readonly trace_id?: string;
  readonly extra?: Record<string, unknown>;
}

const SEVERITY_BY_CODE: Partial<Record<L6FamilyViolationCode, L6FamilyAuditSeverity>> = {
  [L6FamilyViolationCode.ILLEGAL_INPUT_SURFACE]: L6FamilyAuditSeverity.FATAL,
  [L6FamilyViolationCode.DEPENDENCY_MISUSE]: L6FamilyAuditSeverity.FATAL,
  [L6FamilyViolationCode.FAMILY_BYPASSES_LOWER_LAW]: L6FamilyAuditSeverity.FATAL,
  [L6FamilyViolationCode.EVENT_TRIGGER_MISSING]: L6FamilyAuditSeverity.BLOCKING,
  [L6FamilyViolationCode.EVENT_SUPPRESSION_MISSING]: L6FamilyAuditSeverity.BLOCKING,
  [L6FamilyViolationCode.SUPPRESSION_CONFLICT]: L6FamilyAuditSeverity.BLOCKING,
};

const log: L6FamilyAuditRecord[] = [];
let seq = 0;

export function emitFamilyAudit(
  v: { code: L6FamilyViolationCode; field: string; detail: string },
  context: L6FamilyAuditContext = {},
): L6FamilyAuditRecord {
  seq++;
  const record: L6FamilyAuditRecord = {
    id: `l6f-audit-${seq.toString().padStart(8, '0')}`,
    emittedAt: new Date().toISOString(),
    code: v.code,
    severity: SEVERITY_BY_CODE[v.code] ?? L6FamilyAuditSeverity.BLOCKING,
    field: v.field,
    detail: v.detail,
    family_id: context.family_id ?? null,
    primitive_id: context.primitive_id ?? null,
    trace_id: context.trace_id ?? null,
    context: { ...(context.extra ?? {}) },
  };
  log.push(record);
  return record;
}

export function getFamilyAuditLog(): readonly L6FamilyAuditRecord[] {
  return [...log];
}

export function findFamilyAuditsByCode(code: L6FamilyViolationCode): readonly L6FamilyAuditRecord[] {
  return log.filter(r => r.code === code);
}

export function findFamilyAuditsByFamily(family_id: string): readonly L6FamilyAuditRecord[] {
  return log.filter(r => r.family_id === family_id);
}

export function clearFamilyAuditLog(): void {
  log.length = 0;
  seq = 0;
}
