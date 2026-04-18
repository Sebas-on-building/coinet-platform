/**
 * L6.5 — L6 Temporal Audit Log
 *
 * §6.5.7.9 / §6.5.9.2 — Emits typed, deterministic audit records whenever a
 * temporal validator rejects a declaration or runtime decision. Records are
 * queryable by primitive, scope, trace, and violation code. This log is the
 * constitutional trail that proves replay and live share the same temporal
 * law.
 */

import {
  L6TemporalViolationCode,
  L6TemporalHonestyClass,
} from '../contracts/temporal-honesty';
import { L6LateDataClass, L6LateDataDecisionCode } from '../contracts/late-data-classification';

export enum L6TemporalAuditSeverity {
  INFO = 'INFO',
  WARN = 'WARN',
  BLOCKING = 'BLOCKING',
  FATAL = 'FATAL',
}

export interface L6TemporalAuditRecord {
  readonly id: string;
  readonly emittedAt: string;
  readonly code: L6TemporalViolationCode;
  readonly severity: L6TemporalAuditSeverity;
  readonly field: string;
  readonly detail: string;
  readonly primitive_id: string | null;
  readonly primitive_version: string | null;
  readonly scope_type: string | null;
  readonly scope_id: string | null;
  readonly trace_id: string | null;
  readonly compute_run_id: string | null;
  readonly temporal_honesty_class: L6TemporalHonestyClass | null;
  readonly late_data_class: L6LateDataClass | null;
  readonly late_data_decision_code: L6LateDataDecisionCode | null;
  readonly context: Record<string, unknown>;
}

export interface L6TemporalAuditContext {
  readonly primitive_id?: string;
  readonly primitive_version?: string;
  readonly scope_type?: string;
  readonly scope_id?: string;
  readonly trace_id?: string;
  readonly compute_run_id?: string;
  readonly temporal_honesty_class?: L6TemporalHonestyClass;
  readonly late_data_class?: L6LateDataClass;
  readonly late_data_decision_code?: L6LateDataDecisionCode;
  readonly extra?: Record<string, unknown>;
}

const SEVERITY_BY_CODE: Readonly<Record<L6TemporalViolationCode, L6TemporalAuditSeverity>> = Object.freeze({
  [L6TemporalViolationCode.TIME_SURFACE_MISSING]: L6TemporalAuditSeverity.FATAL,
  [L6TemporalViolationCode.TIME_SURFACE_COLLAPSED]: L6TemporalAuditSeverity.FATAL,
  [L6TemporalViolationCode.TIME_ORDERING_VIOLATED]: L6TemporalAuditSeverity.FATAL,
  [L6TemporalViolationCode.WINDOW_NOT_FROM_GOVERNED_LIBRARY]: L6TemporalAuditSeverity.BLOCKING,
  [L6TemporalViolationCode.WINDOW_IDENTITY_NON_DETERMINISTIC]: L6TemporalAuditSeverity.FATAL,
  [L6TemporalViolationCode.WINDOW_COVERAGE_INSUFFICIENT]: L6TemporalAuditSeverity.BLOCKING,
  [L6TemporalViolationCode.WINDOW_ANCHOR_UNDECLARED]: L6TemporalAuditSeverity.BLOCKING,
  [L6TemporalViolationCode.BASELINE_ILLEGAL]: L6TemporalAuditSeverity.BLOCKING,
  [L6TemporalViolationCode.BASELINE_REPLAY_NOT_RECONSTRUCTABLE]: L6TemporalAuditSeverity.FATAL,
  [L6TemporalViolationCode.WARMUP_NOT_SATISFIED]: L6TemporalAuditSeverity.BLOCKING,
  [L6TemporalViolationCode.NULL_POLICY_MISSING]: L6TemporalAuditSeverity.FATAL,
  [L6TemporalViolationCode.NULL_POLICY_FORBIDDEN_FALLBACK]: L6TemporalAuditSeverity.FATAL,
  [L6TemporalViolationCode.NULL_STATE_INCONSISTENT_WITH_VALIDITY]: L6TemporalAuditSeverity.FATAL,
  [L6TemporalViolationCode.LATE_DATA_CLASS_MISSING]: L6TemporalAuditSeverity.BLOCKING,
  [L6TemporalViolationCode.LATE_DATA_SILENT_CURRENT_MUTATION]: L6TemporalAuditSeverity.FATAL,
  [L6TemporalViolationCode.TEMPORAL_HONESTY_MISCLASSIFIED]: L6TemporalAuditSeverity.FATAL,
  [L6TemporalViolationCode.HISTORICAL_OUTPUT_MISSING_MARKERS]: L6TemporalAuditSeverity.BLOCKING,
});

export interface L6TemporalAuditInput {
  readonly code: L6TemporalViolationCode;
  readonly field: string;
  readonly detail: string;
}

const log: L6TemporalAuditRecord[] = [];
let seq = 0;

export function emitTemporalAudit(
  v: L6TemporalAuditInput,
  context: L6TemporalAuditContext = {},
): L6TemporalAuditRecord {
  seq++;
  const record: L6TemporalAuditRecord = {
    id: `l6t-audit-${seq.toString().padStart(8, '0')}`,
    emittedAt: new Date().toISOString(),
    code: v.code,
    severity: SEVERITY_BY_CODE[v.code] ?? L6TemporalAuditSeverity.BLOCKING,
    field: v.field,
    detail: v.detail,
    primitive_id: context.primitive_id ?? null,
    primitive_version: context.primitive_version ?? null,
    scope_type: context.scope_type ?? null,
    scope_id: context.scope_id ?? null,
    trace_id: context.trace_id ?? null,
    compute_run_id: context.compute_run_id ?? null,
    temporal_honesty_class: context.temporal_honesty_class ?? null,
    late_data_class: context.late_data_class ?? null,
    late_data_decision_code: context.late_data_decision_code ?? null,
    context: { ...(context.extra ?? {}) },
  };
  log.push(record);
  return record;
}

export function emitTemporalAudits(
  violations: readonly L6TemporalAuditInput[],
  context: L6TemporalAuditContext = {},
): readonly L6TemporalAuditRecord[] {
  return violations.map(v => emitTemporalAudit(v, context));
}

export function getTemporalAuditLog(): readonly L6TemporalAuditRecord[] {
  return [...log];
}

export function findTemporalAuditsByCode(code: L6TemporalViolationCode): readonly L6TemporalAuditRecord[] {
  return log.filter(r => r.code === code);
}

export function findTemporalAuditsByTrace(trace_id: string): readonly L6TemporalAuditRecord[] {
  return log.filter(r => r.trace_id === trace_id);
}

export function findTemporalAuditsByComputeRun(compute_run_id: string): readonly L6TemporalAuditRecord[] {
  return log.filter(r => r.compute_run_id === compute_run_id);
}

export function clearTemporalAuditLog(): void {
  log.length = 0;
  seq = 0;
}
