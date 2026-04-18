/**
 * L6.7 — Persistence Audit Log
 *
 * Emits typed, deterministic audit records when persistence, current-authority,
 * evidence, or read-surface validators reject an operation. Queryable by
 * code, primitive, run, and trace.
 */

import { L6PersistenceViolationCode } from '../contracts/l6-persistence-surface';

export enum L6PersistenceAuditSeverity {
  INFO = 'INFO',
  WARN = 'WARN',
  BLOCKING = 'BLOCKING',
  FATAL = 'FATAL',
}

export interface L6PersistenceAuditRecord {
  readonly id: string;
  readonly emittedAt: string;
  readonly code: L6PersistenceViolationCode;
  readonly severity: L6PersistenceAuditSeverity;
  readonly field: string;
  readonly detail: string;
  readonly primitive_id: string | null;
  readonly compute_run_id: string | null;
  readonly trace_id: string | null;
  readonly surface: string | null;
  readonly context: Record<string, unknown>;
}

export interface L6PersistenceAuditContext {
  readonly primitive_id?: string;
  readonly compute_run_id?: string;
  readonly trace_id?: string;
  readonly surface?: string;
  readonly extra?: Record<string, unknown>;
}

const SEVERITY_BY_CODE: Partial<Record<L6PersistenceViolationCode, L6PersistenceAuditSeverity>> = {
  [L6PersistenceViolationCode.DIRECT_STORE_WRITE]: L6PersistenceAuditSeverity.FATAL,
  [L6PersistenceViolationCode.SHADOW_AUTHORITY_WRITE]: L6PersistenceAuditSeverity.FATAL,
  [L6PersistenceViolationCode.REDIS_SHADOW_AUTHORITY]: L6PersistenceAuditSeverity.FATAL,
  [L6PersistenceViolationCode.REPLAY_AS_LIVE_CURRENT]: L6PersistenceAuditSeverity.FATAL,
  [L6PersistenceViolationCode.SILENT_CURRENT_OVERWRITE]: L6PersistenceAuditSeverity.FATAL,
  [L6PersistenceViolationCode.RAW_STORAGE_CONSUMPTION]: L6PersistenceAuditSeverity.FATAL,
  [L6PersistenceViolationCode.AD_HOC_RECOMPUTE]: L6PersistenceAuditSeverity.FATAL,
  [L6PersistenceViolationCode.AUTHORITY_MISROUTE]: L6PersistenceAuditSeverity.FATAL,
  [L6PersistenceViolationCode.HISTORICAL_WRITE_WITHOUT_REPLAY_IDENTITY]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.MISSING_EVIDENCE_ARCHIVE]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.ORPHAN_EVIDENCE_PACK]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.EVIDENCE_REQUIRED_MISSING]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.ILLEGAL_SUPERSESSION]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.ILLEGAL_SINK_SELECTION]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.MISSING_MANIFEST_LINKAGE]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.MUTATION_DISCIPLINE_VIOLATION]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.AMBIGUOUS_READ_MODE]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.IDENTITY_INCOMPLETE]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.UNKNOWN_SURFACE]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.ILLEGAL_MATERIALIZATION_MODE]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.CURRENT_WRITE_WITHOUT_AUTHORITY_CLASS]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.EVIDENCE_WITHOUT_MANIFEST]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.MISSING_REPLAY_IDENTITY]: L6PersistenceAuditSeverity.BLOCKING,
  [L6PersistenceViolationCode.REPAIR_WITHOUT_TAG]: L6PersistenceAuditSeverity.BLOCKING,
};

const log: L6PersistenceAuditRecord[] = [];
let seq = 0;

export function emitPersistenceAudit(
  v: { code: L6PersistenceViolationCode; field: string; detail: string },
  context: L6PersistenceAuditContext = {},
): L6PersistenceAuditRecord {
  seq++;
  const record: L6PersistenceAuditRecord = {
    id: `l6p-audit-${seq.toString().padStart(8, '0')}`,
    emittedAt: new Date().toISOString(),
    code: v.code,
    severity: SEVERITY_BY_CODE[v.code] ?? L6PersistenceAuditSeverity.BLOCKING,
    field: v.field,
    detail: v.detail,
    primitive_id: context.primitive_id ?? null,
    compute_run_id: context.compute_run_id ?? null,
    trace_id: context.trace_id ?? null,
    surface: context.surface ?? null,
    context: { ...(context.extra ?? {}) },
  };
  log.push(record);
  return record;
}

export function getPersistenceAuditLog(): readonly L6PersistenceAuditRecord[] {
  return [...log];
}

export function findPersistenceAuditsByCode(
  code: L6PersistenceViolationCode,
): readonly L6PersistenceAuditRecord[] {
  return log.filter(r => r.code === code);
}

export function findPersistenceAuditsByRun(
  compute_run_id: string,
): readonly L6PersistenceAuditRecord[] {
  return log.filter(r => r.compute_run_id === compute_run_id);
}

export function findPersistenceAuditsBySurface(
  surface: string,
): readonly L6PersistenceAuditRecord[] {
  return log.filter(r => r.surface === surface);
}

export function clearPersistenceAuditLog(): void {
  log.length = 0;
  seq = 0;
}
