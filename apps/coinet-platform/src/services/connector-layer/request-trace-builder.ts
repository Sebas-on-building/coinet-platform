/**
 * L2.6 — Request Trace Builder
 *
 * Assembles request-scoped ingress lineage as the request executes.
 * Five phases: open → route planning → ingress outcomes → survival
 * pass → seal. Produces a lineage pack as the downstream evidence spine.
 */

import { createHash } from 'crypto';
import type {
  RequestTrace, RequestKind, RequestIntention,
  RouteTrace, EnvelopeTrace, BlindSpotTrace,
  RequestIngressSummary,
} from './trace-graph';
import { addNode, addEdge } from './trace-graph';
import { buildLineagePack, type LineagePack } from './lineage-pack';

// ═══════════════════════════════════════════════════════════════════════════════
// TRACE STORE
// ═══════════════════════════════════════════════════════════════════════════════

const requestTraces = new Map<string, RequestTrace>();
const routeTraces = new Map<string, RouteTrace>();
const envelopeTraces = new Map<string, EnvelopeTrace>();
const blindSpotTraces = new Map<string, BlindSpotTrace>();

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — OPEN
// ═══════════════════════════════════════════════════════════════════════════════

export interface RequestTraceOpenInput {
  requestKind: RequestKind;
  requestIntention: RequestIntention;
  requestedEntities: string[];
  requestedFieldFamilies: string[];
}

export function openRequestTrace(input: RequestTraceOpenInput): RequestTrace {
  const now = new Date().toISOString();
  const traceId = `trace-${createHash('sha256').update(`${now}-${Math.random()}`).digest('hex').slice(0, 16)}`;
  const requestId = `req-${traceId.slice(6)}`;

  const trace: RequestTrace = {
    requestId,
    traceId,
    requestKind: input.requestKind,
    requestIntention: input.requestIntention,
    requestedEntities: input.requestedEntities,
    requestedFieldFamilies: input.requestedFieldFamilies,
    createdAt: now,
    routeTraceIds: [],
    envelopeTraceIds: [],
    blindSpotTraceIds: [],
  };

  requestTraces.set(traceId, trace);

  addNode({
    nodeId: requestId,
    nodeKind: 'REQUEST',
    traceId,
    metadata: {
      requestKind: input.requestKind,
      requestIntention: input.requestIntention,
      entities: input.requestedEntities,
      fieldFamilies: input.requestedFieldFamilies,
    },
    createdAt: now,
  });

  return trace;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — RECORD ROUTE
// ═══════════════════════════════════════════════════════════════════════════════

export function recordRouteTrace(routeTrace: RouteTrace): void {
  routeTraces.set(routeTrace.routeTraceId, routeTrace);

  const req = requestTraces.get(routeTrace.traceId);
  if (req) req.routeTraceIds.push(routeTrace.routeTraceId);

  const now = routeTrace.createdAt;
  addNode({
    nodeId: routeTrace.routeTraceId,
    nodeKind: 'ROUTE_DECISION',
    traceId: routeTrace.traceId,
    metadata: {
      selectedRouteMode: routeTrace.selectedRouteMode,
      selectedConnector: routeTrace.selectedConnector,
      truthFidelityScore: routeTrace.truthFidelityScore,
      provenanceScore: routeTrace.provenanceScore,
      routeState: routeTrace.routeState,
    },
    createdAt: now,
  });

  addEdge({
    fromNodeId: routeTrace.requestId,
    toNodeId: routeTrace.routeTraceId,
    edgeKind: 'PLANNED_ROUTE',
    createdAt: now,
  });

  addEdge({
    fromNodeId: routeTrace.requestId,
    toNodeId: routeTrace.routeTraceId,
    edgeKind: 'SELECTED_ROUTE',
    createdAt: now,
  });

  for (const rej of routeTrace.rejectedCandidates) {
    const rejId = `rej-${routeTrace.routeTraceId}-${rej.routeMode}-${rej.connector}`;
    addNode({
      nodeId: rejId,
      nodeKind: 'ROUTE_CANDIDATE',
      traceId: routeTrace.traceId,
      metadata: { ...rej, rejected: true },
      createdAt: now,
    });
    addEdge({
      fromNodeId: routeTrace.requestId,
      toNodeId: rejId,
      edgeKind: 'REJECTED_ROUTE',
      metadata: { reasons: rej.rejectionReasons },
      createdAt: now,
    });
  }

  for (const bs of routeTrace.blindSpotFlags) {
    const bsId = `bs-route-${routeTrace.routeTraceId}-${bs}`;
    addNode({
      nodeId: bsId,
      nodeKind: 'BLIND_SPOT',
      traceId: routeTrace.traceId,
      metadata: { type: bs, source: 'route' },
      createdAt: now,
    });
    addEdge({
      fromNodeId: routeTrace.routeTraceId,
      toNodeId: bsId,
      edgeKind: 'INTRODUCED_BLIND_SPOT',
      createdAt: now,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — RECORD ENVELOPE
// ═══════════════════════════════════════════════════════════════════════════════

export function recordEnvelopeTrace(envTrace: EnvelopeTrace): void {
  envelopeTraces.set(envTrace.envelopeTraceId, envTrace);

  const req = requestTraces.get(envTrace.traceId);
  if (req) req.envelopeTraceIds.push(envTrace.envelopeTraceId);

  const now = envTrace.createdAt;
  addNode({
    nodeId: envTrace.envelopeTraceId,
    nodeKind: 'ENVELOPE',
    traceId: envTrace.traceId,
    metadata: {
      envelopeId: envTrace.envelopeId,
      disposition: envTrace.ingressDisposition,
      survivalMode: envTrace.survivalMode,
      providerId: envTrace.providerId,
      fieldFamily: envTrace.fieldFamily,
    },
    createdAt: now,
  });

  addEdge({
    fromNodeId: envTrace.envelopeTraceId,
    toNodeId: envTrace.routeTraceId,
    edgeKind: 'INGESTED_AS',
    createdAt: now,
  });

  if (envTrace.rawPayloadRef) {
    addNode({
      nodeId: envTrace.rawPayloadRef,
      nodeKind: 'RAW_PAYLOAD',
      traceId: envTrace.traceId,
      metadata: {},
      createdAt: now,
    });
    addEdge({
      fromNodeId: envTrace.envelopeTraceId,
      toNodeId: envTrace.rawPayloadRef,
      edgeKind: 'NORMALIZED_FROM',
      createdAt: now,
    });
  }

  if (envTrace.ingressDisposition === 'CORRECTED' && envTrace.correctionTargetEnvelopeId) {
    addEdge({
      fromNodeId: envTrace.envelopeTraceId,
      toNodeId: envTrace.correctionTargetEnvelopeId,
      edgeKind: 'CORRECTS',
      createdAt: now,
    });
  }

  if (envTrace.ingressDisposition === 'REPLAY_ISOLATED') {
    addEdge({
      fromNodeId: envTrace.envelopeTraceId,
      toNodeId: envTrace.routeTraceId,
      edgeKind: 'ISOLATED_AS_REPLAY',
      createdAt: now,
    });
  }

  if (envTrace.ingressDisposition === 'DEDUPED') {
    addEdge({
      fromNodeId: envTrace.envelopeTraceId,
      toNodeId: envTrace.routeTraceId,
      edgeKind: 'DEDUPED_AGAINST',
      createdAt: now,
    });
  }

  if (envTrace.ingressDisposition === 'SUPPRESSED') {
    addEdge({
      fromNodeId: envTrace.envelopeTraceId,
      toNodeId: envTrace.routeTraceId,
      edgeKind: 'SUPPRESSED_BY',
      createdAt: now,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3b — RECORD BLIND SPOT
// ═══════════════════════════════════════════════════════════════════════════════

export function recordBlindSpotTrace(bsTrace: BlindSpotTrace): void {
  blindSpotTraces.set(bsTrace.blindSpotTraceId, bsTrace);

  const req = requestTraces.get(bsTrace.traceId);
  if (req) req.blindSpotTraceIds.push(bsTrace.blindSpotTraceId);

  const now = bsTrace.createdAt;
  addNode({
    nodeId: bsTrace.blindSpotTraceId,
    nodeKind: 'BLIND_SPOT',
    traceId: bsTrace.traceId,
    metadata: {
      blindSpotType: bsTrace.blindSpotType,
      severity: bsTrace.severity,
      sourceClass: bsTrace.sourceClass,
      fieldFamily: bsTrace.fieldFamily,
    },
    createdAt: now,
  });

  if (bsTrace.relatedRouteTraceId) {
    addEdge({
      fromNodeId: bsTrace.relatedRouteTraceId,
      toNodeId: bsTrace.blindSpotTraceId,
      edgeKind: 'INTRODUCED_BLIND_SPOT',
      createdAt: now,
    });
  }

  if (bsTrace.relatedEnvelopeTraceId) {
    addEdge({
      fromNodeId: bsTrace.relatedEnvelopeTraceId,
      toNodeId: bsTrace.blindSpotTraceId,
      edgeKind: 'INTRODUCED_BLIND_SPOT',
      createdAt: now,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4+5 — FINALIZE (survival pass + seal)
// ═══════════════════════════════════════════════════════════════════════════════

export function finalizeRequestTrace(traceId: string): LineagePack {
  const req = requestTraces.get(traceId);
  if (!req) throw new Error(`Request trace ${traceId} not found`);

  const envTraceList = req.envelopeTraceIds
    .map(id => envelopeTraces.get(id))
    .filter(Boolean) as EnvelopeTrace[];

  const bsTraceList = req.blindSpotTraceIds
    .map(id => blindSpotTraces.get(id))
    .filter(Boolean) as BlindSpotTrace[];

  const pack = buildLineagePack({
    requestId: req.requestId,
    traceId: req.traceId,
    targetedEntities: req.requestedEntities,
    targetedFieldFamilies: req.requestedFieldFamilies,
    envelopeTraces: envTraceList,
    blindSpotTraces: bsTraceList,
    routeTraceIds: req.routeTraceIds,
  });

  req.lineagePackId = pack.lineagePackId;

  const now = new Date().toISOString();
  addNode({
    nodeId: pack.lineagePackId,
    nodeKind: 'LINEAGE_PACK',
    traceId,
    metadata: {
      survivingCount: pack.survivingEnvelopeIds.length,
      suppressedCount: pack.suppressedEnvelopeIds.length,
      blindSpotCount: pack.blindSpotTraceIds.length,
    },
    createdAt: now,
  });

  for (const envId of pack.survivingEnvelopeIds) {
    addEdge({
      fromNodeId: envId,
      toNodeId: pack.lineagePackId,
      edgeKind: 'SURVIVES_IN',
      createdAt: now,
    });
  }

  const observedFamilies = new Set(envTraceList.filter(e => e.fieldFamily).map(e => e.fieldFamily!));
  const survivors = envTraceList.filter(e => e.survivedIntoLineagePack);
  const suppressed = envTraceList.filter(e =>
    e.ingressDisposition === 'SUPPRESSED' || e.ingressDisposition === 'QUARANTINED');
  const deduped = envTraceList.filter(e => e.ingressDisposition === 'DEDUPED');
  const rejected = envTraceList.filter(e => e.ingressDisposition === 'REJECTED');
  const fallbacks = req.routeTraceIds.map(id => routeTraces.get(id))
    .filter(Boolean)
    .reduce((n, rt) => n + rt!.fallbackLadder.length, 0);

  const totalReq = req.requestedFieldFamilies.length || 1;
  const traceConfidence = Math.min(1, Math.max(0,
    (survivors.length / Math.max(envTraceList.length, 1)) *
    (1 - bsTraceList.length * 0.1) *
    (observedFamilies.size / totalReq),
  ));

  req.finalIngressSummary = {
    requestedFieldFamilies: req.requestedFieldFamilies.length,
    observedFieldFamilies: observedFamilies.size,
    survivingEnvelopes: survivors.length,
    suppressedEnvelopes: suppressed.length,
    dedupedEnvelopes: deduped.length,
    rejectedEnvelopes: rejected.length,
    blindSpots: bsTraceList.length,
    fallbackCount: fallbacks,
    traceConfidence: Math.round(traceConfidence * 1000) / 1000,
  };

  req.sealedAt = now;

  return pack;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export function getRequestTrace(traceId: string): RequestTrace | undefined {
  return requestTraces.get(traceId);
}

export function getRouteTrace(routeTraceId: string): RouteTrace | undefined {
  return routeTraces.get(routeTraceId);
}

export function getEnvelopeTrace(envelopeTraceId: string): EnvelopeTrace | undefined {
  return envelopeTraces.get(envelopeTraceId);
}

export function getBlindSpotTrace(bsTraceId: string): BlindSpotTrace | undefined {
  return blindSpotTraces.get(bsTraceId);
}

export function getAllRequestTraces(): RequestTrace[] {
  return Array.from(requestTraces.values());
}

export function getRouteTracesForRequest(traceId: string): RouteTrace[] {
  const req = requestTraces.get(traceId);
  if (!req) return [];
  return req.routeTraceIds.map(id => routeTraces.get(id)!).filter(Boolean);
}

export function getEnvelopeTracesForRequest(traceId: string): EnvelopeTrace[] {
  const req = requestTraces.get(traceId);
  if (!req) return [];
  return req.envelopeTraceIds.map(id => envelopeTraces.get(id)!).filter(Boolean);
}

export function getBlindSpotTracesForRequest(traceId: string): BlindSpotTrace[] {
  const req = requestTraces.get(traceId);
  if (!req) return [];
  return req.blindSpotTraceIds.map(id => blindSpotTraces.get(id)!).filter(Boolean);
}

export function resetTraceBuilder(): void {
  requestTraces.clear();
  routeTraces.clear();
  envelopeTraces.clear();
  blindSpotTraces.clear();
}
