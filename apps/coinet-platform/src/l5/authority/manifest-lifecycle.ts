/**
 * L5.2 Authority Model — Manifest Lifecycle
 *
 * §5.2.10 — Manifest Truth
 *
 * The manifest is the authoritative lifecycle record of cross-store
 * write progress. It does not pretend to be a global ACID transaction.
 * It preserves determinism, repairability, visibility, idempotency,
 * and anti-fake honesty.
 */

import { L5AuthorityError, L5AuthorityErrorCode } from './authority-errors';

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST STATE
// ═══════════════════════════════════════════════════════════════════════════════

export enum ManifestState {
  DECLARED                        = 'DECLARED',
  ARCHIVE_PENDING                 = 'ARCHIVE_PENDING',
  ARCHIVE_WRITTEN                 = 'ARCHIVE_WRITTEN',
  PRIMARY_AUTHORITY_COMMITTED     = 'PRIMARY_AUTHORITY_COMMITTED',
  REQUIRED_PROJECTIONS_PENDING    = 'REQUIRED_PROJECTIONS_PENDING',
  REQUIRED_PROJECTIONS_PARTIAL    = 'REQUIRED_PROJECTIONS_PARTIAL',
  REQUIRED_PROJECTIONS_COMPLETE   = 'REQUIRED_PROJECTIONS_COMPLETE',
  OPTIONAL_PROJECTIONS_PARTIAL    = 'OPTIONAL_PROJECTIONS_PARTIAL',
  FINALIZED                       = 'FINALIZED',
  QUARANTINED                     = 'QUARANTINED',
  FAILED_RETRYABLE                = 'FAILED_RETRYABLE',
  FAILED_FATAL                    = 'FAILED_FATAL',
}

export const ALL_MANIFEST_STATES: readonly ManifestState[] = Object.values(ManifestState);

export const TERMINAL_STATES: readonly ManifestState[] = [
  ManifestState.FINALIZED,
  ManifestState.QUARANTINED,
  ManifestState.FAILED_FATAL,
];

export function isTerminal(state: ManifestState): boolean {
  return TERMINAL_STATES.includes(state);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGAL TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const LEGAL_TRANSITIONS: Record<ManifestState, readonly ManifestState[]> = {
  [ManifestState.DECLARED]:                       [ManifestState.ARCHIVE_PENDING, ManifestState.PRIMARY_AUTHORITY_COMMITTED, ManifestState.FAILED_RETRYABLE, ManifestState.QUARANTINED, ManifestState.FAILED_FATAL],
  [ManifestState.ARCHIVE_PENDING]:                [ManifestState.ARCHIVE_WRITTEN, ManifestState.FAILED_RETRYABLE, ManifestState.QUARANTINED, ManifestState.FAILED_FATAL],
  [ManifestState.ARCHIVE_WRITTEN]:                [ManifestState.PRIMARY_AUTHORITY_COMMITTED, ManifestState.FAILED_RETRYABLE, ManifestState.QUARANTINED, ManifestState.FAILED_FATAL],
  [ManifestState.PRIMARY_AUTHORITY_COMMITTED]:     [ManifestState.REQUIRED_PROJECTIONS_PENDING, ManifestState.FINALIZED, ManifestState.FAILED_RETRYABLE, ManifestState.QUARANTINED, ManifestState.FAILED_FATAL],
  [ManifestState.REQUIRED_PROJECTIONS_PENDING]:    [ManifestState.REQUIRED_PROJECTIONS_PARTIAL, ManifestState.REQUIRED_PROJECTIONS_COMPLETE, ManifestState.FAILED_RETRYABLE, ManifestState.QUARANTINED, ManifestState.FAILED_FATAL],
  [ManifestState.REQUIRED_PROJECTIONS_PARTIAL]:    [ManifestState.REQUIRED_PROJECTIONS_COMPLETE, ManifestState.FAILED_RETRYABLE, ManifestState.QUARANTINED, ManifestState.FAILED_FATAL],
  [ManifestState.REQUIRED_PROJECTIONS_COMPLETE]:   [ManifestState.OPTIONAL_PROJECTIONS_PARTIAL, ManifestState.FINALIZED, ManifestState.FAILED_RETRYABLE, ManifestState.QUARANTINED],
  [ManifestState.OPTIONAL_PROJECTIONS_PARTIAL]:    [ManifestState.FINALIZED, ManifestState.FAILED_RETRYABLE, ManifestState.QUARANTINED],
  [ManifestState.FINALIZED]:                       [],
  [ManifestState.QUARANTINED]:                     [],
  [ManifestState.FAILED_RETRYABLE]:                [ManifestState.DECLARED, ManifestState.ARCHIVE_PENDING, ManifestState.PRIMARY_AUTHORITY_COMMITTED, ManifestState.REQUIRED_PROJECTIONS_PENDING, ManifestState.QUARANTINED, ManifestState.FAILED_FATAL],
  [ManifestState.FAILED_FATAL]:                    [],
};

export function isLegalTransition(from: ManifestState, to: ManifestState): boolean {
  return LEGAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getLegalTransitions(from: ManifestState): readonly ManifestState[] {
  return LEGAL_TRANSITIONS[from] ?? [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST RECORD
// ═══════════════════════════════════════════════════════════════════════════════

export interface ManifestRecord {
  readonly manifestId: string;
  state: ManifestState;
  readonly intendedAuthorityStore: string;
  readonly intendedRequiredProjections: string[];
  readonly intendedOptionalProjections: string[];
  readonly archiveRequired: boolean;
  archiveWritten: boolean;
  primaryAuthorityCommitted: boolean;
  requiredProjectionsComplete: boolean;
  optionalProjectionsComplete: boolean;
  readonly createdAt: string;
  updatedAt: string;
  failureReason: string | null;
  readonly traceId: string;
  readonly schemaVersion: string;
}

const _manifests = new Map<string, ManifestRecord>();

export function createManifest(record: ManifestRecord): ManifestRecord {
  if (record.state !== ManifestState.DECLARED) {
    throw new L5AuthorityError(
      L5AuthorityErrorCode.ILLEGAL_MANIFEST_TRANSITION,
      `Manifest must be created in DECLARED state, got '${record.state}'`,
    );
  }
  _manifests.set(record.manifestId, record);
  return record;
}

export function transitionManifest(manifestId: string, to: ManifestState): ManifestRecord {
  const m = _manifests.get(manifestId);
  if (!m) throw new L5AuthorityError(L5AuthorityErrorCode.ILLEGAL_MANIFEST_TRANSITION, `Manifest '${manifestId}' not found`);

  if (!isLegalTransition(m.state, to)) {
    throw new L5AuthorityError(
      L5AuthorityErrorCode.ILLEGAL_MANIFEST_TRANSITION,
      `Transition '${m.state}' → '${to}' is illegal`,
      { manifestId, from: m.state, to },
    );
  }

  m.state = to;
  m.updatedAt = new Date().toISOString();
  return m;
}

/**
 * Validate that a manifest is legally finalizable.
 */
export function validateFinalization(m: ManifestRecord): { legal: boolean; violations: string[] } {
  const violations: string[] = [];

  if (m.archiveRequired && !m.archiveWritten) {
    violations.push('Archive required but not written');
  }
  if (!m.primaryAuthorityCommitted) {
    violations.push('Primary authority not committed');
  }
  if (m.intendedRequiredProjections.length > 0 && !m.requiredProjectionsComplete) {
    violations.push('Required projections not complete');
  }

  return { legal: violations.length === 0, violations };
}

export function getManifest(manifestId: string): ManifestRecord | undefined {
  return _manifests.get(manifestId);
}

export function getAllManifests(): readonly ManifestRecord[] {
  return [..._manifests.values()];
}

export function resetManifestRegistry(): void {
  _manifests.clear();
}
