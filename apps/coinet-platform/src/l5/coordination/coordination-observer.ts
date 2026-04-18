/**
 * L5.5 Write Coordination — Coordination Observer
 *
 * §5.5.5.12 — CoordinationObserver
 * §5.5.16 — Observability doctrine
 */

import { L5ManifestState, L5ProjectionStatus } from './coordination-state';
import type { L5CoordinationManifest } from './consistency-model';
import { getAllManifests } from './write-manifest.service';

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTERS — §5.5.16.1
// ═══════════════════════════════════════════════════════════════════════════════

export interface CoordinationCounters {
  envelopes_received: number;
  preflight_rejects: number;
  idempotent_duplicates: number;
  duplicate_conflicts: number;
  manifests_created: number;
  authority_commits_succeeded: number;
  required_projections_pending: number;
  required_projections_failed: number;
  optional_projections_failed: number;
  finalized_writes: number;
  quarantine_count: number;
  repair_attempts: number;
  repair_successes: number;
  stale_manifest_count: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMERS — §5.5.16.2
// ═══════════════════════════════════════════════════════════════════════════════

export interface CoordinationTimers {
  archive_latency_ms: number[];
  authority_tx_latency_ms: number[];
  dispatcher_delay_ms: number[];
  projection_latency_by_store: Record<string, number[]>;
  finalize_latency_ms: number[];
  repair_cycle_latency_ms: number[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAUGES — §5.5.16.3
// ═══════════════════════════════════════════════════════════════════════════════

export interface CoordinationGauges {
  manifest_backlog_by_state: Record<string, number>;
  required_projection_lag: number;
  optional_projection_lag: number;
  archive_proof_backlog: number;
  late_data_backlog: number;
  stuck_nonfinal_manifests: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVER STATE
// ═══════════════════════════════════════════════════════════════════════════════

let counters: CoordinationCounters = createEmptyCounters();
let timers: CoordinationTimers = createEmptyTimers();

function createEmptyCounters(): CoordinationCounters {
  return {
    envelopes_received: 0, preflight_rejects: 0, idempotent_duplicates: 0,
    duplicate_conflicts: 0, manifests_created: 0, authority_commits_succeeded: 0,
    required_projections_pending: 0, required_projections_failed: 0,
    optional_projections_failed: 0, finalized_writes: 0, quarantine_count: 0,
    repair_attempts: 0, repair_successes: 0, stale_manifest_count: 0,
  };
}

function createEmptyTimers(): CoordinationTimers {
  return {
    archive_latency_ms: [], authority_tx_latency_ms: [], dispatcher_delay_ms: [],
    projection_latency_by_store: {}, finalize_latency_ms: [], repair_cycle_latency_ms: [],
  };
}

export function resetObserver(): void {
  counters = createEmptyCounters();
  timers = createEmptyTimers();
}

export function getCounters(): Readonly<CoordinationCounters> { return counters; }
export function getTimers(): Readonly<CoordinationTimers> { return timers; }

// ═══════════════════════════════════════════════════════════════════════════════
// INCREMENT COUNTERS
// ═══════════════════════════════════════════════════════════════════════════════

export function recordEnvelopeReceived(): void { counters.envelopes_received++; }
export function recordPreflightReject(): void { counters.preflight_rejects++; }
export function recordIdempotentDuplicate(): void { counters.idempotent_duplicates++; }
export function recordDuplicateConflict(): void { counters.duplicate_conflicts++; }
export function recordManifestCreated(): void { counters.manifests_created++; }
export function recordAuthorityCommit(): void { counters.authority_commits_succeeded++; }
export function recordFinalized(): void { counters.finalized_writes++; }
export function recordQuarantine(): void { counters.quarantine_count++; }
export function recordRepairAttempt(): void { counters.repair_attempts++; }
export function recordRepairSuccess(): void { counters.repair_successes++; }

// ═══════════════════════════════════════════════════════════════════════════════
// RECORD TIMERS
// ═══════════════════════════════════════════════════════════════════════════════

export function recordArchiveLatency(ms: number): void { timers.archive_latency_ms.push(ms); }
export function recordAuthorityTxLatency(ms: number): void { timers.authority_tx_latency_ms.push(ms); }
export function recordDispatcherDelay(ms: number): void { timers.dispatcher_delay_ms.push(ms); }
export function recordProjectionLatency(store: string, ms: number): void {
  if (!timers.projection_latency_by_store[store]) timers.projection_latency_by_store[store] = [];
  timers.projection_latency_by_store[store].push(ms);
}
export function recordFinalizeLatency(ms: number): void { timers.finalize_latency_ms.push(ms); }

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTE GAUGES
// ═══════════════════════════════════════════════════════════════════════════════

export function computeGauges(): CoordinationGauges {
  const manifests = getAllManifests();
  const backlog: Record<string, number> = {};
  let reqLag = 0;
  let optLag = 0;
  let archiveBacklog = 0;
  let stuckNonfinal = 0;

  for (const m of manifests) {
    backlog[m.state] = (backlog[m.state] ?? 0) + 1;

    const reqPending = m.projection_jobs.filter(j => j.required && j.status === L5ProjectionStatus.PENDING);
    reqLag += reqPending.length;

    const optPending = m.projection_jobs.filter(j => !j.required && j.status === L5ProjectionStatus.PENDING);
    optLag += optPending.length;

    if (m.archive_required && !m.archive_completed) archiveBacklog++;

    if (m.state !== L5ManifestState.FINALIZED && m.state !== L5ManifestState.QUARANTINED && m.state !== L5ManifestState.FAILED_FATAL) {
      const ageMs = Date.now() - new Date(m.updated_at).getTime();
      if (ageMs > 5 * 60 * 1000) stuckNonfinal++;
    }
  }

  return {
    manifest_backlog_by_state: backlog,
    required_projection_lag: reqLag,
    optional_projection_lag: optLag,
    archive_proof_backlog: archiveBacklog,
    late_data_backlog: 0,
    stuck_nonfinal_manifests: stuckNonfinal,
  };
}
