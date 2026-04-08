/**
 * L2.5 — Replay Index
 *
 * Index all ingress objects for deterministic replay and forensic lookup.
 * Every envelope in the system must be indexable. Every correction link
 * must resolve. Replay generation must be explicit. Historical and live
 * records must never blur implicitly.
 */

import type {
  ReplayIndexRecord, IngressVersionPins, LineageEdge, LineageEdgeKind,
} from './replay-types';

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX STORE
// ═══════════════════════════════════════════════════════════════════════════════

const indexByEnvelope = new Map<string, ReplayIndexRecord>();
const indexByTrace = new Map<string, string[]>();
const indexByBatch = new Map<string, string[]>();
const indexByRoute = new Map<string, string[]>();
const indexByDedup = new Map<string, string[]>();
const indexByIdempotency = new Map<string, string[]>();
const lineageEdges: LineageEdge[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════════════════════════

export function registerInReplayIndex(record: ReplayIndexRecord): void {
  indexByEnvelope.set(record.envelopeId, record);

  appendToIndex(indexByTrace, record.traceId, record.envelopeId);
  appendToIndex(indexByRoute, record.routeId, record.envelopeId);
  appendToIndex(indexByDedup, record.dedupFingerprint, record.envelopeId);
  appendToIndex(indexByIdempotency, record.idempotencyKey, record.envelopeId);

  if (record.backfillBatchId) {
    appendToIndex(indexByBatch, record.backfillBatchId, record.envelopeId);
  }

  addLineageEdge(record.envelopeId, 'envelope', record.routeId, 'route', 'ARRIVED_VIA');
  addLineageEdge(record.envelopeId, 'envelope', record.rawPayloadRef, 'raw_payload', 'NORMALIZED_FROM');

  if (record.correctionOfEnvelopeId) {
    addLineageEdge(record.envelopeId, 'envelope', record.correctionOfEnvelopeId, 'envelope', 'CORRECTS');
  }
  if (record.backfillBatchId) {
    addLineageEdge(record.envelopeId, 'envelope', record.backfillBatchId, 'batch', 'BACKFILL_OF');
  }
}

function appendToIndex(map: Map<string, string[]>, key: string, envelopeId: string): void {
  const existing = map.get(key);
  if (existing) {
    if (!existing.includes(envelopeId)) existing.push(envelopeId);
  } else {
    map.set(key, [envelopeId]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY — by envelope
// ═══════════════════════════════════════════════════════════════════════════════

export function getByEnvelopeId(envelopeId: string): ReplayIndexRecord | undefined {
  return indexByEnvelope.get(envelopeId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY — by trace
// ═══════════════════════════════════════════════════════════════════════════════

export function getByTraceId(traceId: string): ReplayIndexRecord[] {
  const ids = indexByTrace.get(traceId) ?? [];
  return ids.map(id => indexByEnvelope.get(id)!).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY — by batch
// ═══════════════════════════════════════════════════════════════════════════════

export function getByBatchId(batchId: string): ReplayIndexRecord[] {
  const ids = indexByBatch.get(batchId) ?? [];
  return ids.map(id => indexByEnvelope.get(id)!).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY — by route
// ═══════════════════════════════════════════════════════════════════════════════

export function getByRouteId(routeId: string): ReplayIndexRecord[] {
  const ids = indexByRoute.get(routeId) ?? [];
  return ids.map(id => indexByEnvelope.get(id)!).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY — by dedup fingerprint
// ═══════════════════════════════════════════════════════════════════════════════

export function getByDedupFingerprint(fp: string): ReplayIndexRecord[] {
  const ids = indexByDedup.get(fp) ?? [];
  return ids.map(id => indexByEnvelope.get(id)!).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY — by idempotency key
// ═══════════════════════════════════════════════════════════════════════════════

export function getByIdempotencyKey(key: string): ReplayIndexRecord[] {
  const ids = indexByIdempotency.get(key) ?? [];
  return ids.map(id => indexByEnvelope.get(id)!).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY — correction chain
// ═══════════════════════════════════════════════════════════════════════════════

export function getCorrectionChain(rootEnvelopeId: string): ReplayIndexRecord[] {
  const chain: ReplayIndexRecord[] = [];
  const root = indexByEnvelope.get(rootEnvelopeId);
  if (root) chain.push(root);

  for (const [, record] of indexByEnvelope) {
    if (record.correctionOfEnvelopeId === rootEnvelopeId) {
      chain.push(record);
    }
    if (record.supersessionChainRootId === rootEnvelopeId && record.envelopeId !== rootEnvelopeId) {
      chain.push(record);
    }
  }

  return chain;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY — by replay generation
// ═══════════════════════════════════════════════════════════════════════════════

export function getByReplayGeneration(generation: number): ReplayIndexRecord[] {
  return Array.from(indexByEnvelope.values())
    .filter(r => r.replayGeneration === generation);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY — time range slice for replay
// ═══════════════════════════════════════════════════════════════════════════════

export function getReplaySlice(startTime: string, endTime: string): ReplayIndexRecord[] {
  return Array.from(indexByEnvelope.values())
    .filter(r => r.createdAt >= startTime && r.createdAt <= endTime);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINEAGE GRAPH
// ═══════════════════════════════════════════════════════════════════════════════

function addLineageEdge(
  fromId: string, fromType: string,
  toId: string, toType: string,
  edgeKind: LineageEdgeKind,
  metadata?: Record<string, string>,
): void {
  lineageEdges.push({
    fromId, fromType, toId, toType, edgeKind,
    metadata,
    createdAt: new Date().toISOString(),
  });
}

export function addDownstreamEdge(
  envelopeId: string, downstreamId: string, downstreamType: string,
  edgeKind: LineageEdgeKind = 'SUPPORTED',
): void {
  addLineageEdge(envelopeId, 'envelope', downstreamId, downstreamType, edgeKind);
}

export function getLineageEdgesFrom(fromId: string): LineageEdge[] {
  return lineageEdges.filter(e => e.fromId === fromId);
}

export function getLineageEdgesTo(toId: string): LineageEdge[] {
  return lineageEdges.filter(e => e.toId === toId);
}

export function getFullLineageGraph(): LineageEdge[] {
  return [...lineageEdges];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS & RESET
// ═══════════════════════════════════════════════════════════════════════════════

export function getIndexSize(): number {
  return indexByEnvelope.size;
}

export function getLineageEdgeCount(): number {
  return lineageEdges.length;
}

export function resetReplayIndex(): void {
  indexByEnvelope.clear();
  indexByTrace.clear();
  indexByBatch.clear();
  indexByRoute.clear();
  indexByDedup.clear();
  indexByIdempotency.clear();
  lineageEdges.length = 0;
}
