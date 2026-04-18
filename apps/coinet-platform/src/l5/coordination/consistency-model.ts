/**
 * L5.5 Write Coordination — Consistency Model
 *
 * §5.5.6 — Consistency Model
 * §5.5.9 — Transaction Boundary Law
 *
 * Single-authority transactional commit + asynchronous idempotent
 * secondary projection consistency.
 */

import type { ResolvedStorageEnvelope } from '../envelope';

// ═══════════════════════════════════════════════════════════════════════════════
// COORDINATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface L5CoordinationResult {
  readonly manifest_id: string | null;
  readonly outcome: import('./coordination-state').L5CoordinationOutcome;
  readonly primary_authority_committed: boolean;
  readonly archive_completed: boolean;
  readonly required_projection_completion_ratio: number;
  readonly optional_projection_completion_ratio: number;
  readonly duplicate_of_manifest_id: string | null;
  readonly failure_code: string | null;
  readonly failure_reason: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTION JOB
// ═══════════════════════════════════════════════════════════════════════════════

export interface L5ProjectionJob {
  readonly job_id: string;
  readonly manifest_id: string;
  readonly target_store: string;
  readonly projection_category: string;
  readonly required: boolean;
  readonly dedupe_key: string;
  readonly trace_id: string;
  readonly projection_natural_key: string;
  readonly payload_ref: string;
  attempt_count: number;
  readonly max_attempts: number;
  status: import('./coordination-state').L5ProjectionStatus;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COORDINATION MANIFEST (enriched runtime)
// ═══════════════════════════════════════════════════════════════════════════════

export interface L5CoordinationManifest {
  readonly manifest_id: string;
  state: import('./coordination-state').L5ManifestState;
  readonly envelope_id: string;
  readonly dedupe_key: string;
  readonly trace_id: string;
  readonly write_class: string;
  readonly primary_authority_store: string;
  readonly execution_mode: import('./coordination-state').L5ExecutionMode;
  readonly archive_required: boolean;
  archive_completed: boolean;
  primary_authority_committed: boolean;
  readonly projection_jobs: L5ProjectionJob[];
  readonly created_at: string;
  updated_at: string;
  finalized_at: string | null;
  failure_class: import('./coordination-state').L5FailureClass | null;
  failure_reason: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSISTENCY GUARANTEES (declarative)
// ═══════════════════════════════════════════════════════════════════════════════

export const CONSISTENCY_MODEL = {
  name: 'SINGLE_AUTHORITY_TX_PLUS_ASYNC_IDEMPOTENT_PROJECTIONS',

  guarantees: [
    'One authoritative coordination record per write',
    'One legal primary authority commit per datum family',
    'Explicit incomplete states visible through manifest',
    'Secondary projection repairability',
    'Replayable write lineage',
    'No silent hidden partial completion',
  ] as const,

  nonGuarantees: [
    'Simultaneous atomic commit across all stores',
    'Projection visibility at exact same instant as authority commit',
    'Globally synchronous reads across analytical and speed planes',
  ] as const,

  transactionBoundary: 'Postgres transaction containing manifest + authority + outbox',
} as const;
