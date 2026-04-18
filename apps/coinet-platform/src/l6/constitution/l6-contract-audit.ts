/**
 * L6.3 — L6 Contract Audit Log
 *
 * §6.3.7.4 / §6.3.7.5 — Emits typed, deterministic, stable audit records any
 * time an L6.3 contract validator rejects a definition, rejects a runtime
 * output, or a compatibility check fails. Records are queryable by primitive
 * id, version, scope, and trace id.
 */

import {
  L6ContractValidationResult,
  L6ContractViolation,
  L6ContractViolationCode,
} from '../validation/contract-violation-codes';

export enum L6ContractAuditSeverity {
  INFO = 'INFO',
  WARN = 'WARN',
  BLOCKING = 'BLOCKING',
  FATAL = 'FATAL',
}

export interface L6ContractAuditRecord {
  readonly id: string;
  readonly emittedAt: string;
  readonly code: L6ContractViolationCode;
  readonly severity: L6ContractAuditSeverity;
  readonly path: string;
  readonly detail: string;
  readonly primitive_id: string | null;
  readonly primitive_version: string | null;
  readonly scope_type: string | null;
  readonly scope_id: string | null;
  readonly trace_id: string | null;
  readonly context: Record<string, unknown>;
}

export interface L6ContractAuditContext {
  readonly primitive_id?: string;
  readonly primitive_version?: string;
  readonly scope_type?: string;
  readonly scope_id?: string;
  readonly trace_id?: string;
  readonly extra?: Record<string, unknown>;
}

const SEVERITY_BY_CODE: Partial<Record<L6ContractViolationCode, L6ContractAuditSeverity>> = {
  [L6ContractViolationCode.DEF_UNDERLYING_PRIMITIVE_INVALID]: L6ContractAuditSeverity.BLOCKING,
  [L6ContractViolationCode.OUT_ILLEGAL_VALID_EMISSION]: L6ContractAuditSeverity.FATAL,
  [L6ContractViolationCode.OUT_ILLEGAL_CONFIRMATION]: L6ContractAuditSeverity.FATAL,
  [L6ContractViolationCode.OUT_IMPOSSIBLE_TIMESTAMP_ORDER]: L6ContractAuditSeverity.FATAL,
  [L6ContractViolationCode.OUT_MISSING_REPLAY_HASH]: L6ContractAuditSeverity.FATAL,
  [L6ContractViolationCode.OUT_UNSTABLE_REPLAY_HASH]: L6ContractAuditSeverity.FATAL,
  [L6ContractViolationCode.COMPAT_PRIMITIVE_ID_CHANGED]: L6ContractAuditSeverity.FATAL,
  [L6ContractViolationCode.COMPAT_VERSION_NOT_MONOTONIC]: L6ContractAuditSeverity.FATAL,
  [L6ContractViolationCode.COMPAT_BREAKING_VALUE_KIND_CHANGE]: L6ContractAuditSeverity.BLOCKING,
  [L6ContractViolationCode.COMPAT_BREAKING_SCOPE_CHANGE]: L6ContractAuditSeverity.BLOCKING,
  [L6ContractViolationCode.COMPAT_BREAKING_UNIT_CHANGE]: L6ContractAuditSeverity.BLOCKING,
  [L6ContractViolationCode.COMPAT_BREAKING_MATERIALIZATION_CHANGE]: L6ContractAuditSeverity.BLOCKING,
  [L6ContractViolationCode.COMPAT_BREAKING_NORMALIZATION_CHANGE]: L6ContractAuditSeverity.BLOCKING,
  [L6ContractViolationCode.COMPAT_BREAKING_LIFECYCLE_CHANGE]: L6ContractAuditSeverity.BLOCKING,
  [L6ContractViolationCode.COMPAT_BREAKING_DEDUPE_CHANGE]: L6ContractAuditSeverity.BLOCKING,
  [L6ContractViolationCode.COMPAT_BREAKING_SUPPRESSION_CHANGE]: L6ContractAuditSeverity.BLOCKING,
  [L6ContractViolationCode.COMPAT_BREAKING_TRIGGER_CHANGE]: L6ContractAuditSeverity.BLOCKING,
};

const log: L6ContractAuditRecord[] = [];
let seq = 0;

function classifySeverity(code: L6ContractViolationCode): L6ContractAuditSeverity {
  return SEVERITY_BY_CODE[code] ?? L6ContractAuditSeverity.BLOCKING;
}

export function emitContractAudit(
  v: L6ContractViolation,
  context: L6ContractAuditContext = {},
): L6ContractAuditRecord {
  seq++;
  const record: L6ContractAuditRecord = {
    id: `l6c-audit-${seq.toString().padStart(8, '0')}`,
    emittedAt: new Date().toISOString(),
    code: v.code,
    severity: classifySeverity(v.code),
    path: v.path,
    detail: v.detail,
    primitive_id: context.primitive_id ?? null,
    primitive_version: context.primitive_version ?? null,
    scope_type: context.scope_type ?? null,
    scope_id: context.scope_id ?? null,
    trace_id: context.trace_id ?? null,
    context: { ...v.context, ...(context.extra ?? {}) },
  };
  log.push(record);
  return record;
}

export function emitContractAuditResult(
  result: L6ContractValidationResult,
  context: L6ContractAuditContext = {},
): readonly L6ContractAuditRecord[] {
  if (result.valid) return [];
  return result.violations.map(v => emitContractAudit(v, context));
}

export function getContractAuditLog(): readonly L6ContractAuditRecord[] {
  return [...log];
}

export function findContractAuditsByPrimitive(primitive_id: string): readonly L6ContractAuditRecord[] {
  return log.filter(r => r.primitive_id === primitive_id);
}

export function findContractAuditsByTrace(trace_id: string): readonly L6ContractAuditRecord[] {
  return log.filter(r => r.trace_id === trace_id);
}

export function findContractAuditsByCode(code: L6ContractViolationCode): readonly L6ContractAuditRecord[] {
  return log.filter(r => r.code === code);
}

export function clearContractAuditLog(): void {
  log.length = 0;
  seq = 0;
}
