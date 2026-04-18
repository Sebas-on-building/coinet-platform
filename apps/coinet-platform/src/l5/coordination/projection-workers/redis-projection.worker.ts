/**
 * L5.5 Write Coordination — Redis Projection Worker
 *
 * §5.5.5.7 — ProjectionExecutor (Redis specialization)
 * §5.5.12.3 — Redis primary for ephemeral hot state
 */

import { L5ProjectionStatus } from '../coordination-state';
import type { L5ProjectionJob } from '../consistency-model';
import type { ProjectionWorker, ProjectionResult } from '../projection-executor';
import { isProjectionAlreadyExecuted, recordProjectionExecution } from '../projection-executor';

const redisStore = new Map<string, { job_id: string; payload_ref: string; written_at: string; ttl_seconds: number | null }>();

export function resetRedisStore(): void {
  redisStore.clear();
}

export function getRedisRecord(naturalKey: string) {
  return redisStore.get(naturalKey);
}

export function getAllRedisRecords() {
  return Array.from(redisStore.values());
}

export const redisProjectionWorker: ProjectionWorker = {
  targetStore: 'REDIS',

  execute(job: L5ProjectionJob): ProjectionResult {
    const now = new Date().toISOString();

    if (isProjectionAlreadyExecuted(job.dedupe_key, job.trace_id, job.projection_natural_key)) {
      return {
        job_id: job.job_id,
        target_store: 'REDIS',
        status: L5ProjectionStatus.SUCCEEDED,
        retryable: false,
        failure_reason: null,
        executed_at: now,
      };
    }

    redisStore.set(job.projection_natural_key, {
      job_id: job.job_id,
      payload_ref: job.payload_ref,
      written_at: now,
      ttl_seconds: 3600,
    });

    recordProjectionExecution(job.dedupe_key, job.trace_id, job.projection_natural_key, job.job_id);

    return {
      job_id: job.job_id,
      target_store: 'REDIS',
      status: L5ProjectionStatus.SUCCEEDED,
      retryable: false,
      failure_reason: null,
      executed_at: now,
    };
  },
};
