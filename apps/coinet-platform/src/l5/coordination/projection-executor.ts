/**
 * L5.5 Write Coordination — Projection Executor
 *
 * §5.5.5.7 — ProjectionExecutor
 * §5.5.4.9 — Asynchronous projection
 */

import { L5ProjectionStatus } from './coordination-state';
import type { L5ProjectionJob } from './consistency-model';

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProjectionResult {
  readonly job_id: string;
  readonly target_store: string;
  readonly status: L5ProjectionStatus;
  readonly retryable: boolean;
  readonly failure_reason: string | null;
  readonly executed_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTION WORKER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProjectionWorker {
  readonly targetStore: string;
  execute(job: L5ProjectionJob): ProjectionResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const workerRegistry = new Map<string, ProjectionWorker>();

export function registerProjectionWorker(worker: ProjectionWorker): void {
  workerRegistry.set(worker.targetStore, worker);
}

export function getProjectionWorker(targetStore: string): ProjectionWorker | undefined {
  return workerRegistry.get(targetStore);
}

export function resetProjectionWorkerRegistry(): void {
  workerRegistry.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

export function executeProjectionJob(job: L5ProjectionJob): ProjectionResult {
  const worker = workerRegistry.get(job.target_store);
  if (!worker) {
    return {
      job_id: job.job_id,
      target_store: job.target_store,
      status: L5ProjectionStatus.FAILED_RETRYABLE,
      retryable: true,
      failure_reason: `No projection worker registered for store '${job.target_store}'`,
      executed_at: new Date().toISOString(),
    };
  }

  try {
    return worker.execute(job);
  } catch (err) {
    return {
      job_id: job.job_id,
      target_store: job.target_store,
      status: L5ProjectionStatus.FAILED_RETRYABLE,
      retryable: true,
      failure_reason: err instanceof Error ? err.message : 'Unknown projection failure',
      executed_at: new Date().toISOString(),
    };
  }
}

export function executeAllPendingProjections(jobs: L5ProjectionJob[]): ProjectionResult[] {
  return jobs.map(j => executeProjectionJob(j));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTION IDEMPOTENCY TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

const projectionReceipts = new Map<string, string>();

export function resetProjectionReceipts(): void {
  projectionReceipts.clear();
}

function projectionIdempotencyKey(dedupeKey: string, traceId: string, naturalKey: string): string {
  return `${dedupeKey}|${traceId}|${naturalKey}`;
}

export function isProjectionAlreadyExecuted(dedupeKey: string, traceId: string, naturalKey: string): boolean {
  return projectionReceipts.has(projectionIdempotencyKey(dedupeKey, traceId, naturalKey));
}

export function recordProjectionExecution(dedupeKey: string, traceId: string, naturalKey: string, jobId: string): void {
  projectionReceipts.set(projectionIdempotencyKey(dedupeKey, traceId, naturalKey), jobId);
}
