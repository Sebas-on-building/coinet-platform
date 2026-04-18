/**
 * L5.7 Assurance — Replay Loader
 *
 * §5.7.5.3 — Loads raw archive, envelope, manifest, transitions,
 * outbox, receipts, authority, analytics, derived artifacts.
 */

export interface ReplayArtifact {
  readonly kind: ReplayArtifactKind;
  readonly id: string;
  readonly data: Record<string, unknown>;
  readonly loaded_at: string;
}

export type ReplayArtifactKind =
  | 'RAW_ARCHIVE'
  | 'NORMALIZED_ENVELOPE'
  | 'MANIFEST'
  | 'MANIFEST_TRANSITION'
  | 'OUTBOX_JOB'
  | 'PROJECTION_RECEIPT'
  | 'ARCHIVE_POINTER'
  | 'AUTHORITY_RECORD'
  | 'ANALYTICAL_ROW'
  | 'FEATURE_HISTORY'
  | 'SCORE_HISTORY'
  | 'DERIVED_ARTIFACT'
  | 'AUDIT_EVENT'
  | 'REPAIR_HISTORY';

export const ALL_ARTIFACT_KINDS: readonly ReplayArtifactKind[] = [
  'RAW_ARCHIVE', 'NORMALIZED_ENVELOPE', 'MANIFEST', 'MANIFEST_TRANSITION',
  'OUTBOX_JOB', 'PROJECTION_RECEIPT', 'ARCHIVE_POINTER', 'AUTHORITY_RECORD',
  'ANALYTICAL_ROW', 'FEATURE_HISTORY', 'SCORE_HISTORY', 'DERIVED_ARTIFACT',
  'AUDIT_EVENT', 'REPAIR_HISTORY',
];

const artifactStore = new Map<string, ReplayArtifact[]>();

export function resetReplayArtifactStore(): void { artifactStore.clear(); }

export function storeReplayArtifact(traceId: string, artifact: ReplayArtifact): void {
  const existing = artifactStore.get(traceId) ?? [];
  existing.push(artifact);
  artifactStore.set(traceId, existing);
}

export interface ReplayLoadResult {
  readonly trace_id: string;
  readonly artifacts_loaded: readonly ReplayArtifact[];
  readonly artifact_count_by_kind: Record<string, number>;
  readonly total_artifacts: number;
  readonly missing_kinds: readonly ReplayArtifactKind[];
}

export function loadReplayArtifacts(traceId: string, requiredKinds: readonly ReplayArtifactKind[]): ReplayLoadResult {
  const artifacts = artifactStore.get(traceId) ?? [];
  const kindCounts: Record<string, number> = {};
  for (const a of artifacts) {
    kindCounts[a.kind] = (kindCounts[a.kind] ?? 0) + 1;
  }

  const presentKinds = new Set(artifacts.map(a => a.kind));
  const missing = requiredKinds.filter(k => !presentKinds.has(k));

  return {
    trace_id: traceId,
    artifacts_loaded: artifacts,
    artifact_count_by_kind: kindCounts,
    total_artifacts: artifacts.length,
    missing_kinds: missing,
  };
}
