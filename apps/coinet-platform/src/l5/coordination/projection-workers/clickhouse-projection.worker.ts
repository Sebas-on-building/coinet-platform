/**
 * L5.5 Write Coordination — ClickHouse Projection Worker
 *
 * §5.5.5.7 — ProjectionExecutor (ClickHouse specialization)
 * §5.5.12.2 — ClickHouse primary authority
 */

import { L5ProjectionStatus } from '../coordination-state';
import type { L5ProjectionJob } from '../consistency-model';
import type { ProjectionWorker, ProjectionResult } from '../projection-executor';
import { isProjectionAlreadyExecuted, recordProjectionExecution } from '../projection-executor';

const clickhouseStore = new Map<string, { job_id: string; payload_ref: string; written_at: string }>();

export function resetClickHouseStore(): void {
  clickhouseStore.clear();
}

export function getClickHouseRecord(naturalKey: string) {
  return clickhouseStore.get(naturalKey);
}

export function getAllClickHouseRecords() {
  return Array.from(clickhouseStore.values());
}

export const clickHouseProjectionWorker: ProjectionWorker = {
  targetStore: 'CLICKHOUSE',

  execute(job: L5ProjectionJob): ProjectionResult {
    const now = new Date().toISOString();

    if (isProjectionAlreadyExecuted(job.dedupe_key, job.trace_id, job.projection_natural_key)) {
      return {
        job_id: job.job_id,
        target_store: 'CLICKHOUSE',
        status: L5ProjectionStatus.SUCCEEDED,
        retryable: false,
        failure_reason: null,
        executed_at: now,
      };
    }

    clickhouseStore.set(job.projection_natural_key, {
      job_id: job.job_id,
      payload_ref: job.payload_ref,
      written_at: now,
    });

    recordProjectionExecution(job.dedupe_key, job.trace_id, job.projection_natural_key, job.job_id);

    return {
      job_id: job.job_id,
      target_store: 'CLICKHOUSE',
      status: L5ProjectionStatus.SUCCEEDED,
      retryable: false,
      failure_reason: null,
      executed_at: now,
    };
  },
};
