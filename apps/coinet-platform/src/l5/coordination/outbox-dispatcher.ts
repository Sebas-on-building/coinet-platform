/**
 * L5.5 Write Coordination — Outbox Dispatcher
 *
 * §5.5.5.6 — OutboxDispatcher
 * §5.5.4.8 — Post-commit dispatch
 */

import { randomUUID } from 'crypto';
import { L5ProjectionStatus } from './coordination-state';
import type { L5ProjectionJob } from './consistency-model';

// ═══════════════════════════════════════════════════════════════════════════════
// OUTBOX ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

export interface OutboxEntry {
  readonly outbox_id: string;
  readonly job: L5ProjectionJob;
  dispatched: boolean;
  dispatch_attempts: number;
  last_dispatch_at: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTBOX STORE (in-memory; production uses Postgres outbox table)
// ═══════════════════════════════════════════════════════════════════════════════

const outbox = new Map<string, OutboxEntry>();

export function resetOutbox(): void {
  outbox.clear();
}

export function getAllOutboxEntries(): OutboxEntry[] {
  return Array.from(outbox.values());
}

export function getOutboxEntry(outboxId: string): OutboxEntry | undefined {
  return outbox.get(outboxId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMIT OUTBOX JOBS
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmitOutboxInput {
  readonly manifest_id: string;
  readonly target_store: string;
  readonly projection_category: string;
  readonly required: boolean;
  readonly dedupe_key: string;
  readonly trace_id: string;
  readonly projection_natural_key: string;
  readonly payload_ref: string;
  readonly max_attempts: number;
}

export function emitOutboxJob(input: EmitOutboxInput): OutboxEntry {
  const jobId = randomUUID();
  const job: L5ProjectionJob = {
    job_id: jobId,
    manifest_id: input.manifest_id,
    target_store: input.target_store,
    projection_category: input.projection_category,
    required: input.required,
    dedupe_key: input.dedupe_key,
    trace_id: input.trace_id,
    projection_natural_key: input.projection_natural_key,
    payload_ref: input.payload_ref,
    attempt_count: 0,
    max_attempts: input.max_attempts,
    status: L5ProjectionStatus.PENDING,
  };

  const entry: OutboxEntry = {
    outbox_id: randomUUID(),
    job,
    dispatched: false,
    dispatch_attempts: 0,
    last_dispatch_at: null,
  };

  outbox.set(entry.outbox_id, entry);
  return entry;
}

export function emitProjectionPlan(
  manifestId: string,
  dedupeKey: string,
  traceId: string,
  payloadRef: string,
  requiredStores: readonly string[],
  optionalStores: readonly string[],
): OutboxEntry[] {
  const entries: OutboxEntry[] = [];

  for (const store of requiredStores) {
    entries.push(emitOutboxJob({
      manifest_id: manifestId,
      target_store: store,
      projection_category: 'REQUIRED',
      required: true,
      dedupe_key: dedupeKey,
      trace_id: traceId,
      projection_natural_key: `${store}:${dedupeKey}`,
      payload_ref: payloadRef,
      max_attempts: 5,
    }));
  }

  for (const store of optionalStores) {
    entries.push(emitOutboxJob({
      manifest_id: manifestId,
      target_store: store,
      projection_category: 'OPTIONAL',
      required: false,
      dedupe_key: dedupeKey,
      trace_id: traceId,
      projection_natural_key: `${store}:${dedupeKey}`,
      payload_ref: payloadRef,
      max_attempts: 3,
    }));
  }

  return entries;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCH
// ═══════════════════════════════════════════════════════════════════════════════

export function getPendingOutboxJobs(manifestId?: string): OutboxEntry[] {
  const all = Array.from(outbox.values()).filter(e => !e.dispatched);
  if (manifestId) return all.filter(e => e.job.manifest_id === manifestId);
  return all;
}

export function markDispatched(outboxId: string): void {
  const entry = outbox.get(outboxId);
  if (entry) {
    entry.dispatched = true;
    entry.dispatch_attempts += 1;
    entry.last_dispatch_at = new Date().toISOString();
  }
}
