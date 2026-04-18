/**
 * L5.5 Write Coordination — Coordination State Enums
 *
 * §5.5.6 — Consistency Model
 * §5.5.7 — Manifest Lifecycle (enriched)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION MODE
// ═══════════════════════════════════════════════════════════════════════════════

export enum L5ExecutionMode {
  /** Immutable evidence must exist before authority acceptance. */
  ARCHIVE_FIRST = 'ARCHIVE_FIRST',
  /** Authority commit can occur before secondary projections. */
  AUTHORITY_TX_FIRST = 'AUTHORITY_TX_FIRST',
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENRICHED MANIFEST STATE — §5.5.7.1
// ═══════════════════════════════════════════════════════════════════════════════

export enum L5ManifestState {
  DECLARED = 'DECLARED',
  EXECUTION_PREFLIGHT_PASSED = 'EXECUTION_PREFLIGHT_PASSED',
  ARCHIVE_PENDING = 'ARCHIVE_PENDING',
  ARCHIVE_COMPLETED = 'ARCHIVE_COMPLETED',
  AUTHORITY_TX_PENDING = 'AUTHORITY_TX_PENDING',
  PRIMARY_AUTHORITY_COMMITTED = 'PRIMARY_AUTHORITY_COMMITTED',
  OUTBOX_EMITTED = 'OUTBOX_EMITTED',
  REQUIRED_PROJECTIONS_PENDING = 'REQUIRED_PROJECTIONS_PENDING',
  REQUIRED_PROJECTIONS_PARTIAL = 'REQUIRED_PROJECTIONS_PARTIAL',
  REQUIRED_PROJECTIONS_COMPLETE = 'REQUIRED_PROJECTIONS_COMPLETE',
  OPTIONAL_PROJECTIONS_PARTIAL = 'OPTIONAL_PROJECTIONS_PARTIAL',
  FINALIZED = 'FINALIZED',
  QUARANTINED = 'QUARANTINED',
  FAILED_RETRYABLE = 'FAILED_RETRYABLE',
  FAILED_FATAL = 'FAILED_FATAL',
}

export const ALL_MANIFEST_STATES: readonly L5ManifestState[] = Object.values(L5ManifestState);

export const TERMINAL_MANIFEST_STATES: readonly L5ManifestState[] = [
  L5ManifestState.FINALIZED,
  L5ManifestState.QUARANTINED,
  L5ManifestState.FAILED_FATAL,
];

export function isTerminalManifestState(s: L5ManifestState): boolean {
  return TERMINAL_MANIFEST_STATES.includes(s);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const LEGAL_TRANSITIONS: Record<L5ManifestState, readonly L5ManifestState[]> = {
  [L5ManifestState.DECLARED]:                       [L5ManifestState.EXECUTION_PREFLIGHT_PASSED, L5ManifestState.QUARANTINED, L5ManifestState.FAILED_RETRYABLE, L5ManifestState.FAILED_FATAL],
  [L5ManifestState.EXECUTION_PREFLIGHT_PASSED]:     [L5ManifestState.ARCHIVE_PENDING, L5ManifestState.AUTHORITY_TX_PENDING, L5ManifestState.QUARANTINED, L5ManifestState.FAILED_RETRYABLE, L5ManifestState.FAILED_FATAL],
  [L5ManifestState.ARCHIVE_PENDING]:                [L5ManifestState.ARCHIVE_COMPLETED, L5ManifestState.FAILED_RETRYABLE, L5ManifestState.FAILED_FATAL, L5ManifestState.QUARANTINED],
  [L5ManifestState.ARCHIVE_COMPLETED]:              [L5ManifestState.AUTHORITY_TX_PENDING, L5ManifestState.PRIMARY_AUTHORITY_COMMITTED, L5ManifestState.FAILED_RETRYABLE, L5ManifestState.QUARANTINED],
  [L5ManifestState.AUTHORITY_TX_PENDING]:            [L5ManifestState.PRIMARY_AUTHORITY_COMMITTED, L5ManifestState.FAILED_RETRYABLE, L5ManifestState.FAILED_FATAL, L5ManifestState.QUARANTINED],
  [L5ManifestState.PRIMARY_AUTHORITY_COMMITTED]:     [L5ManifestState.OUTBOX_EMITTED, L5ManifestState.FINALIZED, L5ManifestState.FAILED_RETRYABLE, L5ManifestState.QUARANTINED],
  [L5ManifestState.OUTBOX_EMITTED]:                 [L5ManifestState.REQUIRED_PROJECTIONS_PENDING, L5ManifestState.FINALIZED, L5ManifestState.FAILED_RETRYABLE, L5ManifestState.QUARANTINED],
  [L5ManifestState.REQUIRED_PROJECTIONS_PENDING]:    [L5ManifestState.REQUIRED_PROJECTIONS_PARTIAL, L5ManifestState.REQUIRED_PROJECTIONS_COMPLETE, L5ManifestState.FAILED_RETRYABLE, L5ManifestState.FAILED_FATAL, L5ManifestState.QUARANTINED],
  [L5ManifestState.REQUIRED_PROJECTIONS_PARTIAL]:    [L5ManifestState.REQUIRED_PROJECTIONS_COMPLETE, L5ManifestState.FAILED_RETRYABLE, L5ManifestState.FAILED_FATAL, L5ManifestState.QUARANTINED],
  [L5ManifestState.REQUIRED_PROJECTIONS_COMPLETE]:   [L5ManifestState.OPTIONAL_PROJECTIONS_PARTIAL, L5ManifestState.FINALIZED, L5ManifestState.QUARANTINED],
  [L5ManifestState.OPTIONAL_PROJECTIONS_PARTIAL]:    [L5ManifestState.FINALIZED, L5ManifestState.QUARANTINED],
  [L5ManifestState.FINALIZED]:                       [],
  [L5ManifestState.QUARANTINED]:                     [],
  [L5ManifestState.FAILED_RETRYABLE]:                [L5ManifestState.DECLARED, L5ManifestState.EXECUTION_PREFLIGHT_PASSED, L5ManifestState.ARCHIVE_PENDING, L5ManifestState.AUTHORITY_TX_PENDING, L5ManifestState.REQUIRED_PROJECTIONS_PENDING, L5ManifestState.QUARANTINED, L5ManifestState.FAILED_FATAL],
  [L5ManifestState.FAILED_FATAL]:                    [],
};

export function isLegalManifestTransition(from: L5ManifestState, to: L5ManifestState): boolean {
  return LEGAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getLegalManifestTransitions(from: L5ManifestState): readonly L5ManifestState[] {
  return LEGAL_TRANSITIONS[from] ?? [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTION STATUS
// ═══════════════════════════════════════════════════════════════════════════════

export enum L5ProjectionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED_RETRYABLE = 'FAILED_RETRYABLE',
  FAILED_FATAL = 'FAILED_FATAL',
  QUARANTINED = 'QUARANTINED',
  SKIPPED_OPTIONAL = 'SKIPPED_OPTIONAL',
}

export const ALL_PROJECTION_STATUSES: readonly L5ProjectionStatus[] = Object.values(L5ProjectionStatus);

// ═══════════════════════════════════════════════════════════════════════════════
// COORDINATION OUTCOME
// ═══════════════════════════════════════════════════════════════════════════════

export type L5CoordinationOutcome =
  | 'FINALIZED'
  | 'IN_PROGRESS'
  | 'IDEMPOTENT_ACCEPT'
  | 'QUARANTINED'
  | 'REJECTED'
  | 'FAILED_RETRYABLE'
  | 'FAILED_FATAL';

// ═══════════════════════════════════════════════════════════════════════════════
// FAILURE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export enum L5FailureClass {
  PREFLIGHT_REJECTED = 'PREFLIGHT_REJECTED',
  DUPLICATE_IDEMPOTENT = 'DUPLICATE_IDEMPOTENT',
  DUPLICATE_CONFLICT = 'DUPLICATE_CONFLICT',
  ARCHIVE_WRITE_RETRYABLE = 'ARCHIVE_WRITE_RETRYABLE',
  ARCHIVE_INTEGRITY_FATAL = 'ARCHIVE_INTEGRITY_FATAL',
  AUTHORITY_TX_FAILED = 'AUTHORITY_TX_FAILED',
  AUTHORITY_WRITE_FATAL = 'AUTHORITY_WRITE_FATAL',
  OUTBOX_EMIT_FAILED = 'OUTBOX_EMIT_FAILED',
  PROJECTION_RETRYABLE = 'PROJECTION_RETRYABLE',
  PROJECTION_FATAL = 'PROJECTION_FATAL',
  PROJECTION_QUARANTINED = 'PROJECTION_QUARANTINED',
  FINALIZATION_BLOCKED = 'FINALIZATION_BLOCKED',
  REPAIR_EXHAUSTED = 'REPAIR_EXHAUSTED',
}

export const ALL_FAILURE_CLASSES: readonly L5FailureClass[] = Object.values(L5FailureClass);
