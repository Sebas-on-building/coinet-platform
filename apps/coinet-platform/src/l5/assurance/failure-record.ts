/**
 * L5.7 Assurance — Failure Record Contract
 *
 * §5.7.7.2 — Durable failure records with full lineage.
 */

import { L5FailureCode, L5FailureFamily, getFailureFamily } from './failure-family';
import { L5RepairClass } from './repair-class';

export type FailureSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'FATAL';

export interface L5FailureRecord {
  readonly failure_id: string;
  readonly failure_code: L5FailureCode;
  readonly failure_family: L5FailureFamily;
  readonly severity: FailureSeverity;
  readonly manifest_id: string | null;
  readonly trace_id: string | null;
  readonly envelope_id: string | null;
  readonly target_store: string | null;
  readonly repairability_class: L5RepairClass;
  readonly visibility_scope: 'INTERNAL' | 'OPERATOR' | 'AUDIT';
  readonly first_seen_at: string;
  readonly last_seen_at: string;
  readonly attempt_count: number;
  readonly explanation: string;
}

const failureStore = new Map<string, L5FailureRecord>();

export function resetFailureStore(): void { failureStore.clear(); }

export function recordFailure(opts: {
  failure_code: L5FailureCode;
  severity: FailureSeverity;
  manifest_id?: string;
  trace_id?: string;
  envelope_id?: string;
  target_store?: string;
  repairability_class: L5RepairClass;
  explanation: string;
}): L5FailureRecord {
  const now = new Date().toISOString();
  const id = `fail_${Date.now()}_${opts.failure_code.slice(0, 12)}`;

  const record: L5FailureRecord = {
    failure_id: id,
    failure_code: opts.failure_code,
    failure_family: getFailureFamily(opts.failure_code),
    severity: opts.severity,
    manifest_id: opts.manifest_id ?? null,
    trace_id: opts.trace_id ?? null,
    envelope_id: opts.envelope_id ?? null,
    target_store: opts.target_store ?? null,
    repairability_class: opts.repairability_class,
    visibility_scope: opts.severity === 'FATAL' || opts.severity === 'CRITICAL' ? 'AUDIT' : 'OPERATOR',
    first_seen_at: now,
    last_seen_at: now,
    attempt_count: 1,
    explanation: opts.explanation,
  };

  failureStore.set(id, record);
  return record;
}

export function getFailureRecords(): readonly L5FailureRecord[] {
  return Array.from(failureStore.values());
}

export function getFailuresByFamily(family: L5FailureFamily): readonly L5FailureRecord[] {
  return Array.from(failureStore.values()).filter(f => f.failure_family === family);
}

export function getCriticalFailures(): readonly L5FailureRecord[] {
  return Array.from(failureStore.values()).filter(f => f.severity === 'FATAL' || f.severity === 'CRITICAL');
}

export function hasInvisibleFailures(): boolean {
  for (const f of failureStore.values()) {
    if (!f.failure_id || !f.failure_code || !f.explanation) return true;
  }
  return false;
}
