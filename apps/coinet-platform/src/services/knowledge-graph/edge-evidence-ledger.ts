/**
 * L4.2 — Edge Confidence and Evidence Lineage: Evidence Ledger
 *
 * Immutable, queryable evidence store for graph relations.
 * Every edge must be backed by one or more evidence records.
 * Without this, edge confidence is opaque and replay is dishonest.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE CLASSES — ordered strongest to weakest by default
// ═══════════════════════════════════════════════════════════════════════════════

export type EdgeEvidenceClass =
  | 'CANONICAL_STRUCTURAL'
  | 'RECONCILIATION_DERIVED'
  | 'METRIC_SUPPORTED'
  | 'MUTATION_DERIVED'
  | 'EVENT_DERIVED'
  | 'BEHAVIORAL_INTERACTION'
  | 'CLUSTER_DERIVED'
  | 'NARRATIVE_SIGNAL'
  | 'MANUAL_CONSTITUTIONAL';

export const ALL_EVIDENCE_CLASSES: readonly EdgeEvidenceClass[] = [
  'CANONICAL_STRUCTURAL', 'RECONCILIATION_DERIVED', 'METRIC_SUPPORTED',
  'MUTATION_DERIVED', 'EVENT_DERIVED', 'BEHAVIORAL_INTERACTION',
  'CLUSTER_DERIVED', 'NARRATIVE_SIGNAL', 'MANUAL_CONSTITUTIONAL',
];

export const EVIDENCE_STRENGTH_RANK: Record<EdgeEvidenceClass, number> = {
  CANONICAL_STRUCTURAL: 1.0,
  RECONCILIATION_DERIVED: 0.9,
  METRIC_SUPPORTED: 0.85,
  MUTATION_DERIVED: 0.8,
  EVENT_DERIVED: 0.7,
  BEHAVIORAL_INTERACTION: 0.55,
  CLUSTER_DERIVED: 0.45,
  NARRATIVE_SIGNAL: 0.35,
  MANUAL_CONSTITUTIONAL: 0.75,
};

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE RECORD
// ═══════════════════════════════════════════════════════════════════════════════

export interface EdgeEvidenceRecord {
  evidenceId: string;
  edgeId?: string;
  edgeType: string;
  evidenceClass: EdgeEvidenceClass;
  sourceModule: string;
  subjectNodeId: string;
  objectNodeId: string;
  subjectCanonicalObjectId?: string;
  objectCanonicalObjectId?: string;
  metricObservationRefs: string[];
  mutationRefs: string[];
  lineageRefs: string[];
  sourceRefs: string[];
  replayCompatibility: {
    schemaVersion: string;
    minReplayGeneration?: string;
    maxReplayGeneration?: string;
  };
  observedAt: string;
  ingestedAt: string;
  lastConfirmedAt?: string;
  confidenceHints?: string[];
  metadata: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY INDEXES
// ═══════════════════════════════════════════════════════════════════════════════

const _byId = new Map<string, EdgeEvidenceRecord>();
const _byEdgeId = new Map<string, EdgeEvidenceRecord[]>();
const _byEdgeType = new Map<string, EdgeEvidenceRecord[]>();
const _bySubjectNode = new Map<string, EdgeEvidenceRecord[]>();
const _byObjectNode = new Map<string, EdgeEvidenceRecord[]>();
const _byNodePair = new Map<string, EdgeEvidenceRecord[]>();
const _bySourceModule = new Map<string, EdgeEvidenceRecord[]>();
const _byClass = new Map<EdgeEvidenceClass, EdgeEvidenceRecord[]>();

function pairKey(s: string, o: string): string { return `${s}::${o}`; }

function pushToIndex<K>(map: Map<K, EdgeEvidenceRecord[]>, key: K, rec: EdgeEvidenceRecord): void {
  const list = map.get(key) ?? [];
  list.push(rec);
  map.set(key, list);
}

function indexRecord(rec: EdgeEvidenceRecord): void {
  _byId.set(rec.evidenceId, rec);
  if (rec.edgeId) pushToIndex(_byEdgeId, rec.edgeId, rec);
  pushToIndex(_byEdgeType, rec.edgeType, rec);
  pushToIndex(_bySubjectNode, rec.subjectNodeId, rec);
  pushToIndex(_byObjectNode, rec.objectNodeId, rec);
  pushToIndex(_byNodePair, pairKey(rec.subjectNodeId, rec.objectNodeId), rec);
  pushToIndex(_bySourceModule, rec.sourceModule, rec);
  pushToIndex(_byClass, rec.evidenceClass, rec);
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPEND
// ═══════════════════════════════════════════════════════════════════════════════

export interface AppendEvidenceResult {
  success: boolean;
  error?: string;
}

export function appendEdgeEvidence(record: EdgeEvidenceRecord): AppendEvidenceResult {
  if (!record.evidenceId) return { success: false, error: 'MISSING_EVIDENCE_ID' };
  if (!record.edgeType) return { success: false, error: 'MISSING_EDGE_TYPE' };
  if (!record.evidenceClass) return { success: false, error: 'MISSING_EVIDENCE_CLASS' };
  if (!record.sourceModule) return { success: false, error: 'MISSING_SOURCE_MODULE' };
  if (!record.subjectNodeId) return { success: false, error: 'MISSING_SUBJECT_NODE' };
  if (!record.objectNodeId) return { success: false, error: 'MISSING_OBJECT_NODE' };
  if (!record.observedAt) return { success: false, error: 'MISSING_OBSERVED_AT' };
  if (!record.ingestedAt) return { success: false, error: 'MISSING_INGESTED_AT' };
  if (!record.replayCompatibility?.schemaVersion) return { success: false, error: 'MISSING_REPLAY_SCHEMA' };

  if (_byId.has(record.evidenceId)) return { success: false, error: 'DUPLICATE_EVIDENCE_ID' };

  indexRecord(record);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY APIs
// ═══════════════════════════════════════════════════════════════════════════════

export function getEvidenceById(evidenceId: string): EdgeEvidenceRecord | undefined {
  return _byId.get(evidenceId);
}

export function getEvidenceForEdge(edgeId: string): readonly EdgeEvidenceRecord[] {
  return _byEdgeId.get(edgeId) ?? [];
}

export function getEvidenceByEdgeType(edgeType: string): readonly EdgeEvidenceRecord[] {
  return _byEdgeType.get(edgeType) ?? [];
}

export function getEvidenceBySource(sourceModule: string): readonly EdgeEvidenceRecord[] {
  return _bySourceModule.get(sourceModule) ?? [];
}

export function getEvidenceByClass(evidenceClass: EdgeEvidenceClass): readonly EdgeEvidenceRecord[] {
  return _byClass.get(evidenceClass) ?? [];
}

export function getEvidenceForNodePair(subjectNodeId: string, objectNodeId: string): readonly EdgeEvidenceRecord[] {
  return _byNodePair.get(pairKey(subjectNodeId, objectNodeId)) ?? [];
}

export function getEvidenceBySubjectNode(subjectNodeId: string): readonly EdgeEvidenceRecord[] {
  return _bySubjectNode.get(subjectNodeId) ?? [];
}

export function getEvidenceByObjectNode(objectNodeId: string): readonly EdgeEvidenceRecord[] {
  return _byObjectNode.get(objectNodeId) ?? [];
}

export function getEvidenceAtReplayTime(
  edgeId: string,
  replayTimestamp: string,
): readonly EdgeEvidenceRecord[] {
  const all = _byEdgeId.get(edgeId) ?? [];
  const cutoff = new Date(replayTimestamp).getTime();
  return all.filter(r => new Date(r.observedAt).getTime() <= cutoff);
}

export function getLatestConfirmationTime(edgeId: string): string | undefined {
  const all = _byEdgeId.get(edgeId) ?? [];
  let latest: string | undefined;
  for (const r of all) {
    const ts = r.lastConfirmedAt ?? r.observedAt;
    if (!latest || ts > latest) latest = ts;
  }
  return latest;
}

export function getAllEvidence(): readonly EdgeEvidenceRecord[] {
  return [..._byId.values()];
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET
// ═══════════════════════════════════════════════════════════════════════════════

export function resetEdgeEvidenceLedger(): void {
  _byId.clear(); _byEdgeId.clear(); _byEdgeType.clear();
  _bySubjectNode.clear(); _byObjectNode.clear(); _byNodePair.clear();
  _bySourceModule.clear(); _byClass.clear();
}
