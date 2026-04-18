/**
 * L5.5 Write Coordination — Projection Repair Worker
 *
 * §5.5.5.8 — ProjectionRepairWorker
 * §5.5.10.3 — Repair-level idempotency
 */

import { L5ManifestState, L5ProjectionStatus, L5FailureClass } from './coordination-state';
import type { L5CoordinationManifest, L5ProjectionJob } from './consistency-model';
import { getStaleNonFinalManifests, updateProjectionJobStatus, transitionManifest, getManifest } from './write-manifest.service';
import { executeProjectionJob } from './projection-executor';

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface RepairResult {
  readonly manifest_id: string;
  readonly repaired_jobs: number;
  readonly still_failing: number;
  readonly escalated: boolean;
  readonly escalation_reason: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_STALE_THRESHOLD_MS = 5 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// SCAN & REPAIR
// ═══════════════════════════════════════════════════════════════════════════════

export function scanAndRepair(staleThresholdMs: number = DEFAULT_STALE_THRESHOLD_MS): RepairResult[] {
  const stale = getStaleNonFinalManifests(staleThresholdMs);
  return stale.map(m => repairManifest(m.manifest_id));
}

export function repairManifest(manifestId: string): RepairResult {
  const manifest = getManifest(manifestId);
  if (!manifest) {
    return { manifest_id: manifestId, repaired_jobs: 0, still_failing: 0, escalated: true, escalation_reason: 'Manifest not found' };
  }

  const failedJobs = manifest.projection_jobs.filter(
    j => j.status === L5ProjectionStatus.FAILED_RETRYABLE && j.attempt_count < j.max_attempts,
  );

  let repaired = 0;
  let stillFailing = 0;

  for (const job of failedJobs) {
    (job as L5ProjectionJob).attempt_count += 1;
    const result = executeProjectionJob(job);
    updateProjectionJobStatus(manifestId, job.job_id, result.status);

    if (result.status === L5ProjectionStatus.SUCCEEDED) {
      repaired++;
    } else {
      stillFailing++;
    }
  }

  const exhaustedRequired = manifest.projection_jobs.filter(
    j => j.required && j.status === L5ProjectionStatus.FAILED_RETRYABLE && j.attempt_count >= j.max_attempts,
  );
  const escalated = exhaustedRequired.length > 0;

  if (escalated) {
    for (const j of exhaustedRequired) {
      updateProjectionJobStatus(manifestId, j.job_id, L5ProjectionStatus.FAILED_FATAL);
    }
    transitionManifest(manifestId, L5ManifestState.FAILED_FATAL, {
      failureClass: L5FailureClass.REPAIR_EXHAUSTED,
      reason: `${exhaustedRequired.length} required projection(s) exhausted max retries`,
    });
  }

  return {
    manifest_id: manifestId,
    repaired_jobs: repaired,
    still_failing: stillFailing,
    escalated,
    escalation_reason: escalated ? `${exhaustedRequired.length} required projection(s) exhausted` : null,
  };
}
