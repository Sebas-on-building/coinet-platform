/**
 * L5.5 Write Coordination — Write Manifest Service
 *
 * §5.5.5.3 — WriteManifestService
 * §5.5.7 — Manifest Lifecycle (enriched state machine)
 */

import { randomUUID } from 'crypto';
import {
  L5ManifestState, L5ExecutionMode, L5ProjectionStatus,
  isLegalManifestTransition, isTerminalManifestState,
  type L5FailureClass,
} from './coordination-state';
import type { L5CoordinationManifest, L5ProjectionJob } from './consistency-model';
import { L5CoordinationError, L5CoordinationErrorCode } from './coordination-errors';

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST STORE (in-memory; production uses Postgres)
// ═══════════════════════════════════════════════════════════════════════════════

const manifestStore = new Map<string, L5CoordinationManifest>();

export function resetManifestStore(): void {
  manifestStore.clear();
}

export function getManifest(manifestId: string): L5CoordinationManifest | undefined {
  return manifestStore.get(manifestId);
}

export function getAllManifests(): L5CoordinationManifest[] {
  return Array.from(manifestStore.values());
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE MANIFEST
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateManifestInput {
  readonly envelope_id: string;
  readonly dedupe_key: string;
  readonly trace_id: string;
  readonly write_class: string;
  readonly primary_authority_store: string;
  readonly execution_mode: L5ExecutionMode;
  readonly archive_required: boolean;
}

export function createManifest(input: CreateManifestInput): L5CoordinationManifest {
  const now = new Date().toISOString();
  const manifest: L5CoordinationManifest = {
    manifest_id: randomUUID(),
    state: L5ManifestState.DECLARED,
    envelope_id: input.envelope_id,
    dedupe_key: input.dedupe_key,
    trace_id: input.trace_id,
    write_class: input.write_class,
    primary_authority_store: input.primary_authority_store,
    execution_mode: input.execution_mode,
    archive_required: input.archive_required,
    archive_completed: false,
    primary_authority_committed: false,
    projection_jobs: [],
    created_at: now,
    updated_at: now,
    finalized_at: null,
    failure_class: null,
    failure_reason: null,
  };
  manifestStore.set(manifest.manifest_id, manifest);
  return manifest;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITION MANIFEST
// ═══════════════════════════════════════════════════════════════════════════════

export function transitionManifest(
  manifestId: string,
  targetState: L5ManifestState,
  failureInfo?: { failureClass: L5FailureClass; reason: string },
): L5CoordinationManifest {
  const m = manifestStore.get(manifestId);
  if (!m) {
    throw new L5CoordinationError(L5CoordinationErrorCode.ILLEGAL_MANIFEST_TRANSITION, `Manifest ${manifestId} not found`, {});
  }
  if (!isLegalManifestTransition(m.state, targetState)) {
    throw new L5CoordinationError(
      L5CoordinationErrorCode.ILLEGAL_MANIFEST_TRANSITION,
      `Manifest transition '${m.state}' → '${targetState}' is illegal`,
      { manifest_id: manifestId, from: m.state, to: targetState },
    );
  }
  m.state = targetState;
  m.updated_at = new Date().toISOString();

  if (targetState === L5ManifestState.FINALIZED) {
    m.finalized_at = m.updated_at;
  }
  if (failureInfo) {
    m.failure_class = failureInfo.failureClass;
    m.failure_reason = failureInfo.reason;
  }
  return m;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORITY/ARCHIVE STATUS UPDATES
// ═══════════════════════════════════════════════════════════════════════════════

export function markArchiveCompleted(manifestId: string): void {
  const m = manifestStore.get(manifestId);
  if (m) m.archive_completed = true;
}

export function markPrimaryAuthorityCommitted(manifestId: string): void {
  const m = manifestStore.get(manifestId);
  if (m) m.primary_authority_committed = true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTION JOB MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export function addProjectionJob(manifestId: string, job: L5ProjectionJob): void {
  const m = manifestStore.get(manifestId);
  if (m) (m.projection_jobs as L5ProjectionJob[]).push(job);
}

export function updateProjectionJobStatus(manifestId: string, jobId: string, status: L5ProjectionStatus): void {
  const m = manifestStore.get(manifestId);
  if (!m) return;
  const job = m.projection_jobs.find(j => j.job_id === jobId);
  if (job) (job as L5ProjectionJob).status = status;
}

export function getRequiredProjectionCompletion(manifestId: string): number {
  const m = manifestStore.get(manifestId);
  if (!m) return 0;
  const required = m.projection_jobs.filter(j => j.required);
  if (required.length === 0) return 1;
  const done = required.filter(j => j.status === L5ProjectionStatus.SUCCEEDED);
  return done.length / required.length;
}

export function getOptionalProjectionCompletion(manifestId: string): number {
  const m = manifestStore.get(manifestId);
  if (!m) return 1;
  const optional = m.projection_jobs.filter(j => !j.required);
  if (optional.length === 0) return 1;
  const done = optional.filter(j => j.status === L5ProjectionStatus.SUCCEEDED || j.status === L5ProjectionStatus.SKIPPED_OPTIONAL);
  return done.length / optional.length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STALE MANIFEST DETECTION (for repair worker)
// ═══════════════════════════════════════════════════════════════════════════════

export function getStaleNonFinalManifests(staleSinceMs: number): L5CoordinationManifest[] {
  const cutoff = Date.now() - staleSinceMs;
  return getAllManifests().filter(m =>
    !isTerminalManifestState(m.state) &&
    m.state !== L5ManifestState.FAILED_FATAL &&
    new Date(m.updated_at).getTime() < cutoff
  );
}
