/**
 * L5.5 Write Coordination — WriteCoordinator
 *
 * §5.5.4 — The legal coordinated write path
 * §5.5.8 — Write flow in exact order (7 phases)
 *
 * This is the ONLY legal entry point for coordinated multi-store writes.
 */

import type { ResolvedStorageEnvelope } from '../envelope';
import { L5ManifestState, L5ProjectionStatus, L5FailureClass, type L5CoordinationOutcome } from './coordination-state';
import type { L5CoordinationResult, L5CoordinationManifest } from './consistency-model';
import { runExecutionPreflight } from './execution-preflight';
import { routeEnvelope, type StoreRoutingDecision } from './store-router';
import { evaluateArchiveFirstPolicy } from './archive-first-policy';
import { checkDedupeGate, recordDedupeReceipt, dedupeVerdictToFailureClass } from './dedupe-gate';
import { writeArchive, type ArchiveProof } from './archive-writer';
import {
  createManifest, transitionManifest, markArchiveCompleted,
  markPrimaryAuthorityCommitted, addProjectionJob, updateProjectionJobStatus,
  getRequiredProjectionCompletion, getOptionalProjectionCompletion,
} from './write-manifest.service';
import { executeAuthorityCommit } from './authority-write.service';
import { emitProjectionPlan, markDispatched, getPendingOutboxJobs } from './outbox-dispatcher';
import { executeProjectionJob, isProjectionAlreadyExecuted, recordProjectionExecution } from './projection-executor';
import { checkFinalizationEligibility } from './manifest-finalizer';
import { assessLateData, isLateDataSilentOverwrite } from './late-data-policy';
import { loadReplayEnvelope } from './replay-loader';
import * as observer from './coordination-observer';

// ═══════════════════════════════════════════════════════════════════════════════
// COORDINATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function coordinateWrite(env: ResolvedStorageEnvelope): L5CoordinationResult {
  observer.recordEnvelopeReceived();

  // ─── PHASE 1: Ingress handoff ──────────────────────────────────────────────
  const preflight = runExecutionPreflight(env);
  if (!preflight.passed) {
    observer.recordPreflightReject();
    const isQuarantine = preflight.violations.some(v => v.severity === 'QUARANTINE');
    return makeResult(null, isQuarantine ? 'QUARANTINED' : 'REJECTED', false, false, 0, 0, null,
      L5FailureClass.PREFLIGHT_REJECTED, preflight.violations.map(v => v.reason).join('; '));
  }

  const dedupeCheck = checkDedupeGate(env.dedupe_key, env.payload_hash_sha256);
  if (dedupeCheck.verdict === 'IDEMPOTENT_ACCEPT') {
    observer.recordIdempotentDuplicate();
    return makeResult(dedupeCheck.existing_manifest_id, 'IDEMPOTENT_ACCEPT', true, true, 1, 1,
      dedupeCheck.existing_manifest_id, null, null);
  }
  if (dedupeCheck.verdict === 'DUPLICATE_CONFLICT') {
    observer.recordDuplicateConflict();
    return makeResult(null, 'QUARANTINED', false, false, 0, 0, dedupeCheck.existing_manifest_id,
      L5FailureClass.DUPLICATE_CONFLICT, dedupeCheck.detection_reason);
  }

  const lateCheck = assessLateData(env);
  if (lateCheck.isLate && isLateDataSilentOverwrite(lateCheck, false)) {
    return makeResult(null, 'QUARANTINED', false, false, 0, 0, null,
      L5FailureClass.PREFLIGHT_REJECTED, 'Late data would silently overwrite authority without governed rematerialization');
  }

  const routing = routeEnvelope(env);
  const archivePolicy = evaluateArchiveFirstPolicy(env);

  // ─── PHASE 2: Archive branch ──────────────────────────────────────────────
  let archiveProof: ArchiveProof | null = null;
  if (archivePolicy.archiveFirstRequired) {
    const t0 = Date.now();
    const archiveResult = writeArchive(env);
    observer.recordArchiveLatency(Date.now() - t0);

    if (!archiveResult.success) {
      const failureClass = archiveResult.failureRetryable ? L5FailureClass.ARCHIVE_WRITE_RETRYABLE : L5FailureClass.ARCHIVE_INTEGRITY_FATAL;
      return makeResult(null, archiveResult.failureRetryable ? 'FAILED_RETRYABLE' : 'FAILED_FATAL', false, false, 0, 0,
        null, failureClass, archiveResult.failureReason);
    }
    archiveProof = archiveResult.proof;
  }

  // ─── PHASE 3: Transactional coordination ──────────────────────────────────
  const manifest = createManifest({
    envelope_id: env.envelope_id,
    dedupe_key: env.dedupe_key,
    trace_id: env.trace_id,
    write_class: env.write_class,
    primary_authority_store: routing.primaryAuthorityStore,
    execution_mode: routing.executionMode,
    archive_required: env.archive_required,
  });
  observer.recordManifestCreated();
  transitionManifest(manifest.manifest_id, L5ManifestState.EXECUTION_PREFLIGHT_PASSED);

  if (archiveProof) {
    transitionManifest(manifest.manifest_id, L5ManifestState.ARCHIVE_PENDING);
    markArchiveCompleted(manifest.manifest_id);
    transitionManifest(manifest.manifest_id, L5ManifestState.ARCHIVE_COMPLETED);
  }

  // Authority commit
  const t1 = Date.now();
  transitionManifest(manifest.manifest_id, L5ManifestState.AUTHORITY_TX_PENDING);
  const authResult = executeAuthorityCommit(env, manifest.manifest_id);
  observer.recordAuthorityTxLatency(Date.now() - t1);

  if (!authResult.success) {
    transitionManifest(manifest.manifest_id, L5ManifestState.FAILED_RETRYABLE, {
      failureClass: L5FailureClass.AUTHORITY_TX_FAILED,
      reason: authResult.failure_reason ?? 'Authority commit failed',
    });
    return makeResult(manifest.manifest_id, 'FAILED_RETRYABLE', false, !!archiveProof, 0, 0,
      null, L5FailureClass.AUTHORITY_TX_FAILED, authResult.failure_reason);
  }

  markPrimaryAuthorityCommitted(manifest.manifest_id);
  observer.recordAuthorityCommit();
  transitionManifest(manifest.manifest_id, L5ManifestState.PRIMARY_AUTHORITY_COMMITTED);

  // Outbox emission
  const outboxEntries = emitProjectionPlan(
    manifest.manifest_id,
    env.dedupe_key,
    env.trace_id,
    env.envelope_id,
    routing.requiredProjectionStores,
    routing.optionalProjectionStores,
  );

  for (const entry of outboxEntries) {
    addProjectionJob(manifest.manifest_id, entry.job);
  }

  if (outboxEntries.length > 0) {
    transitionManifest(manifest.manifest_id, L5ManifestState.OUTBOX_EMITTED);
  }

  // Record dedupe receipt
  recordDedupeReceipt({
    dedupe_key: env.dedupe_key,
    payload_hash_sha256: env.payload_hash_sha256,
    manifest_id: manifest.manifest_id,
    finalized: false,
    received_at: new Date().toISOString(),
    producer_service: env.producer_service,
    write_class: env.write_class,
  });

  // ─── PHASE 4: Post-commit activation ──────────────────────────────────────
  // No-op outbox entries to dispatch
  const pendingJobs = getPendingOutboxJobs(manifest.manifest_id);
  for (const entry of pendingJobs) {
    markDispatched(entry.outbox_id);
  }

  // ─── PHASE 5: Projection execution ────────────────────────────────────────
  if (outboxEntries.length > 0) {
    transitionManifest(manifest.manifest_id, L5ManifestState.REQUIRED_PROJECTIONS_PENDING);
  }

  for (const entry of outboxEntries) {
    const projResult = executeProjectionJob(entry.job);
    updateProjectionJobStatus(manifest.manifest_id, entry.job.job_id, projResult.status);

    if (projResult.status !== L5ProjectionStatus.SUCCEEDED) {
      observer.recordProjectionLatency(entry.job.target_store, 0);
    }
  }

  // ─── PHASE 6: Completion reconciliation ───────────────────────────────────
  const reqRatio = getRequiredProjectionCompletion(manifest.manifest_id);
  const optRatio = getOptionalProjectionCompletion(manifest.manifest_id);

  if (outboxEntries.length > 0 && reqRatio > 0 && reqRatio < 1) {
    transitionManifest(manifest.manifest_id, L5ManifestState.REQUIRED_PROJECTIONS_PARTIAL);
  }
  if (reqRatio === 1 && outboxEntries.some(e => e.job.required)) {
    transitionManifest(manifest.manifest_id, L5ManifestState.REQUIRED_PROJECTIONS_COMPLETE);
  }

  if (optRatio < 1 && outboxEntries.some(e => !e.job.required)) {
    transitionManifest(manifest.manifest_id, L5ManifestState.OPTIONAL_PROJECTIONS_PARTIAL);
  }

  const finCheck = checkFinalizationEligibility(manifest);
  if (finCheck.canFinalize) {
    transitionManifest(manifest.manifest_id, L5ManifestState.FINALIZED);
    observer.recordFinalized();

    loadReplayEnvelope(env, manifest, archiveProof);

    return makeResult(manifest.manifest_id, 'FINALIZED', true, !!archiveProof || !env.archive_required,
      reqRatio, optRatio, null, null, null);
  }

  const hasRequiredFailures = manifest.projection_jobs.some(
    j => j.required && (j.status === L5ProjectionStatus.FAILED_RETRYABLE || j.status === L5ProjectionStatus.FAILED_FATAL),
  );

  if (hasRequiredFailures) {
    return makeResult(manifest.manifest_id, 'FAILED_RETRYABLE', true, !!archiveProof || !env.archive_required,
      reqRatio, optRatio, null, L5FailureClass.PROJECTION_RETRYABLE, 'One or more required projections failed');
  }

  loadReplayEnvelope(env, manifest, archiveProof);

  return makeResult(manifest.manifest_id, 'IN_PROGRESS', true, !!archiveProof || !env.archive_required,
    reqRatio, optRatio, null, null, null);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function makeResult(
  manifestId: string | null,
  outcome: L5CoordinationOutcome,
  authorityCommitted: boolean,
  archiveCompleted: boolean,
  reqRatio: number,
  optRatio: number,
  duplicateManifestId: string | null,
  failureCode: L5FailureClass | null,
  failureReason: string | null,
): L5CoordinationResult {
  return {
    manifest_id: manifestId,
    outcome,
    primary_authority_committed: authorityCommitted,
    archive_completed: archiveCompleted,
    required_projection_completion_ratio: reqRatio,
    optional_projection_completion_ratio: optRatio,
    duplicate_of_manifest_id: duplicateManifestId,
    failure_code: failureCode,
    failure_reason: failureReason,
  };
}
