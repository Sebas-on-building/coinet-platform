/**
 * L5.5 Write Coordination — Materialization Worker
 *
 * §5.5.5.7 — ProjectionExecutor (Materialization specialization)
 */

import { L5ProjectionStatus } from '../coordination-state';
import type { L5ProjectionJob } from '../consistency-model';
import type { ProjectionWorker, ProjectionResult } from '../projection-executor';
import { isProjectionAlreadyExecuted, recordProjectionExecution } from '../projection-executor';

const materializationStore = new Map<string, { job_id: string; payload_ref: string; written_at: string }>();

export function resetMaterializationStore(): void {
  materializationStore.clear();
}

export function getMaterializedRecord(naturalKey: string) {
  return materializationStore.get(naturalKey);
}

export function getAllMaterializedRecords() {
  return Array.from(materializationStore.values());
}

export const materializationWorker: ProjectionWorker = {
  targetStore: 'MATERIALIZATION',

  execute(job: L5ProjectionJob): ProjectionResult {
    const now = new Date().toISOString();

    if (isProjectionAlreadyExecuted(job.dedupe_key, job.trace_id, job.projection_natural_key)) {
      return {
        job_id: job.job_id,
        target_store: 'MATERIALIZATION',
        status: L5ProjectionStatus.SUCCEEDED,
        retryable: false,
        failure_reason: null,
        executed_at: now,
      };
    }

    materializationStore.set(job.projection_natural_key, {
      job_id: job.job_id,
      payload_ref: job.payload_ref,
      written_at: now,
    });

    recordProjectionExecution(job.dedupe_key, job.trace_id, job.projection_natural_key, job.job_id);

    return {
      job_id: job.job_id,
      target_store: 'MATERIALIZATION',
      status: L5ProjectionStatus.SUCCEEDED,
      retryable: false,
      failure_reason: null,
      executed_at: now,
    };
  },
};
