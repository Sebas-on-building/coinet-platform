/**
 * L2.6 — Trace Graph
 *
 * Per-request ingress lineage as a typed causal graph, not logs.
 * Nodes represent ingress artifacts; edges represent causal
 * relationships (selection, rejection, fallback, survival).
 *
 * Traceability is causal, not chronological.
 */

export const L26_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST KINDS & INTENTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type RequestKind =
  | 'USER_QUERY'
  | 'ALERT_EVALUATION'
  | 'BACKGROUND_REFRESH'
  | 'DRILLDOWN'
  | 'FORENSIC_RECONSTRUCTION'
  | 'BACKFILL_RUN';

export type RequestIntention =
  | 'LIVE_THESIS'
  | 'LIVE_DISPLAY'
  | 'DEEP_VERIFICATION'
  | 'FORENSIC_REPLAY'
  | 'HISTORICAL_BACKFILL'
  | 'CALIBRATION_BUILD'
  | 'INCIDENT_RECOVERY';

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH NODE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TraceNodeKind =
  | 'REQUEST'
  | 'ROUTE_DECISION'
  | 'ROUTE_CANDIDATE'
  | 'ENVELOPE'
  | 'RAW_PAYLOAD'
  | 'NORMALIZED_ARTIFACT'
  | 'FRESHNESS_DECISION'
  | 'IDENTITY_DECISION'
  | 'BLIND_SPOT'
  | 'LINEAGE_PACK'
  | 'CLAIM'
  | 'SCORE'
  | 'CONTRADICTION'
  | 'SCENARIO'
  | 'JUDGMENT';

export interface TraceNode {
  nodeId: string;
  nodeKind: TraceNodeKind;
  traceId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH EDGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TraceEdgeKind =
  | 'REQUESTED'
  | 'PLANNED_ROUTE'
  | 'REJECTED_ROUTE'
  | 'SELECTED_ROUTE'
  | 'INGESTED_AS'
  | 'NORMALIZED_FROM'
  | 'DEDUPED_AGAINST'
  | 'CORRECTS'
  | 'ISOLATED_AS_REPLAY'
  | 'SUPPRESSED_BY'
  | 'INTRODUCED_BLIND_SPOT'
  | 'SURVIVES_IN'
  | 'SUPPORTS';

export interface TraceEdge {
  fromNodeId: string;
  toNodeId: string;
  edgeKind: TraceEdgeKind;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVELOPE DISPOSITION
// ═══════════════════════════════════════════════════════════════════════════════

export type IngressDisposition =
  | 'SURVIVED'
  | 'DEDUPED'
  | 'CORRECTED'
  | 'REPLAY_ISOLATED'
  | 'SUPPRESSED'
  | 'QUARANTINED'
  | 'REJECTED';

export type SurvivalMode =
  | 'DIRECT_SURVIVOR'
  | 'SURVIVOR_AFTER_DEDUP'
  | 'SURVIVOR_AFTER_CORRECTION'
  | 'SURVIVOR_WITH_DEGRADED_FRESHNESS'
  | 'SURVIVOR_WITH_ROUTE_SCAR'
  | 'NON_SURVIVOR';

// ═══════════════════════════════════════════════════════════════════════════════
// BLIND SPOT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type BlindSpotType =
  | 'OWNER_UNAVAILABLE'
  | 'CONFIRMER_UNAVAILABLE'
  | 'REALTIME_LOST'
  | 'HISTORICAL_GAP'
  | 'PARTIAL_FIELD_MISSING'
  | 'NO_LEGAL_SUBSTITUTE'
  | 'ROUTE_DEGRADED'
  | 'FALLBACK_WITH_SEMANTIC_LOSS'
  | 'TRACE_INCOMPLETE';

export type BlindSpotSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// ═══════════════════════════════════════════════════════════════════════════════
// TRACE OBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface RequestIngressSummary {
  requestedFieldFamilies: number;
  observedFieldFamilies: number;
  survivingEnvelopes: number;
  suppressedEnvelopes: number;
  dedupedEnvelopes: number;
  rejectedEnvelopes: number;
  blindSpots: number;
  fallbackCount: number;
  traceConfidence: number;
}

export interface RequestTrace {
  requestId: string;
  traceId: string;
  requestKind: RequestKind;
  requestIntention: RequestIntention;
  requestedEntities: string[];
  requestedFieldFamilies: string[];
  createdAt: string;
  sealedAt?: string;

  routeTraceIds: string[];
  envelopeTraceIds: string[];
  blindSpotTraceIds: string[];
  lineagePackId?: string;

  finalIngressSummary?: RequestIngressSummary;
}

export interface RouteCandidateTrace {
  routeMode: string;
  connector: string;
  truthFidelityScore: number;
  freshnessFitnessScore: number;
  failureResilienceScore: number;
  costDisciplineScore: number;
  compositeScore: number;
  rejectionReasons: string[];
}

export interface FallbackTraceStep {
  position: number;
  routeMode: string;
  connector: string;
  expectedBlindSpots: string[];
  expectedDegradation?: string;
}

export interface RouteTrace {
  routeTraceId: string;
  requestId: string;
  traceId: string;
  fieldFamily: string;
  sourceClass: string;
  claimUsage: string;
  selectedRouteId: string;
  selectedRouteMode: string;
  selectedConnector: string;
  truthFidelityScore: number;
  freshnessFitnessScore: number;
  failureResilienceScore: number;
  costDisciplineScore: number;
  provenanceScore: number;
  admittedCandidates: RouteCandidateTrace[];
  rejectedCandidates: RouteCandidateTrace[];
  fallbackLadder: FallbackTraceStep[];
  routeState: string;
  routeProbationState?: string;
  blindSpotFlags: string[];
  reasonCodes: string[];
  bestRejectedRoute?: RouteCandidateTrace;
  createdAt: string;
}

export interface EnvelopeTrace {
  envelopeTraceId: string;
  requestId: string;
  traceId: string;
  routeTraceId: string;
  envelopeId: string;
  rawPayloadRef: string;
  normalizedArtifactRef?: string;
  providerId: string;
  sourceClass: string;
  fieldFamily?: string;
  canonicalCandidateIds: string[];
  canonicalResolutionState: 'resolved' | 'ambiguous' | 'unresolved';
  freshnessState?: string;
  identityVerdict?: string;
  ingressDisposition: IngressDisposition;
  survivalMode: SurvivalMode;
  correctionTargetEnvelopeId?: string;
  replayGeneration: number;
  survivedIntoLineagePack: boolean;
  reasonCodes: string[];
  createdAt: string;
}

export interface BlindSpotTrace {
  blindSpotTraceId: string;
  requestId: string;
  traceId: string;
  sourceClass: string;
  fieldFamily?: string;
  relatedRouteTraceId?: string;
  relatedEnvelopeTraceId?: string;
  blindSpotType: BlindSpotType;
  severity: BlindSpotSeverity;
  disclosureRequired: boolean;
  reasonCodes: string[];
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH STORE
// ═══════════════════════════════════════════════════════════════════════════════

const nodes = new Map<string, TraceNode>();
const edges: TraceEdge[] = [];

export function addNode(node: TraceNode): void {
  nodes.set(node.nodeId, node);
}

export function addEdge(edge: TraceEdge): void {
  edges.push(edge);
}

export function getNode(nodeId: string): TraceNode | undefined {
  return nodes.get(nodeId);
}

export function getNodesOfKind(kind: TraceNodeKind): TraceNode[] {
  return Array.from(nodes.values()).filter(n => n.nodeKind === kind);
}

export function getEdgesFrom(nodeId: string): TraceEdge[] {
  return edges.filter(e => e.fromNodeId === nodeId);
}

export function getEdgesTo(nodeId: string): TraceEdge[] {
  return edges.filter(e => e.toNodeId === nodeId);
}

export function getEdgesOfKind(kind: TraceEdgeKind): TraceEdge[] {
  return edges.filter(e => e.edgeKind === kind);
}

export function getNodeCount(): number { return nodes.size; }
export function getEdgeCount(): number { return edges.length; }

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH INVARIANT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export function validateGraphInvariants(traceId: string): string[] {
  const violations: string[] = [];
  const traceNodes = Array.from(nodes.values()).filter(n => n.traceId === traceId);
  const traceEdgeSet = edges.filter(e => {
    const from = nodes.get(e.fromNodeId);
    return from && from.traceId === traceId;
  });

  const packNodes = traceNodes.filter(n => n.nodeKind === 'LINEAGE_PACK');
  for (const pack of packNodes) {
    const survivorEdges = traceEdgeSet.filter(
      e => e.toNodeId === pack.nodeId && e.edgeKind === 'SURVIVES_IN',
    );
    if (survivorEdges.length === 0) {
      violations.push(`LINEAGE_PACK_NO_SURVIVORS: ${pack.nodeId}`);
    }
    for (const se of survivorEdges) {
      if (!nodes.has(se.fromNodeId)) {
        violations.push(`LINEAGE_PACK_ORPHAN_SURVIVOR: ${se.fromNodeId}`);
      }
    }
  }

  const envelopeNodes = traceNodes.filter(n => n.nodeKind === 'ENVELOPE');
  for (const env of envelopeNodes) {
    const routeEdge = traceEdgeSet.find(
      e => e.fromNodeId === env.nodeId && e.edgeKind === 'INGESTED_AS',
    );
    if (!routeEdge) {
      const isSuppressed = traceEdgeSet.some(
        e => e.fromNodeId === env.nodeId && e.edgeKind === 'SUPPRESSED_BY',
      );
      const isDeduped = traceEdgeSet.some(
        e => e.fromNodeId === env.nodeId && e.edgeKind === 'DEDUPED_AGAINST',
      );
      if (!isSuppressed && !isDeduped) {
        violations.push(`ENVELOPE_NO_ROUTE_PARENT: ${env.nodeId}`);
      }
    }
  }

  const blindSpotNodes = traceNodes.filter(n => n.nodeKind === 'BLIND_SPOT');
  for (const bs of blindSpotNodes) {
    const bsEdges = traceEdgeSet.filter(e => e.toNodeId === bs.nodeId);
    if (bsEdges.length === 0) {
      violations.push(`BLIND_SPOT_UNLINKED: ${bs.nodeId}`);
    }
  }

  return violations;
}

export function resetTraceGraph(): void {
  nodes.clear();
  edges.length = 0;
}
