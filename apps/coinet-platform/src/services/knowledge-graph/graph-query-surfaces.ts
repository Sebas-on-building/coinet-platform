/**
 * L4.5 — Graph Query Surfaces
 *
 * Makes graph intelligence reusable. Every query returns confidence,
 * temporal honesty, evidence visibility, and blocked-section disclosure.
 * No raw adjacency-only query surfaces above Layer 4.
 *
 * Nine sections:
 *   1. Type declarations
 *   2. Query registry / family policies
 *   3. Edge registry and subject resolution
 *   4. Traversal engine
 *   5. Confidence and temporal pruning
 *   6. Summarization
 *   7. Core query execution
 *   8. Specialized query builders
 *   9. Historical / replay + reset
 */

import { getGraphNodeById } from './graph-node-registry';
import {
  getPropagationEventsForNode,
  getActivePropagationForNodeAtTime,
} from './graph-propagation-engine';

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 1 — TYPE DECLARATIONS                                               ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export type GraphQueryType =
  | 'PROTOCOL_CONTEXT_FOR_ASSET'
  | 'CHAIN_CONTEXT_FOR_PROTOCOL'
  | 'NARRATIVE_CONTEXT_FOR_OBJECT'
  | 'PEER_SET_BY_PROTOCOL'
  | 'PEER_SET_BY_SECTOR'
  | 'SHARED_DEPENDENCY_GRAPH'
  | 'SPILLOVER_FROM_EVENT'
  | 'EXPOSURE_RADIUS'
  | 'CAPITAL_ROTATION_GRAPH'
  | 'SECTOR_CLUSTER'
  | 'ECOSYSTEM_CLUSTER'
  | 'BEHAVIORAL_CLUSTER'
  | 'COMPETITOR_SET'
  | 'CLOSEST_SUBSTITUTES'
  | 'NARRATIVE_OVERLAP_COMPETITORS';

export type QueryFamily =
  | 'CONTEXT_ENRICHMENT'
  | 'COMPARISON'
  | 'SPILLOVER'
  | 'CLUSTERING'
  | 'COMPETITOR_DISCOVERY';

export type QConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';
export type QTemporalStatus = 'ACTIVE' | 'PROVISIONAL' | 'STALE' | 'EXPIRED' | 'HISTORICAL' | 'CONTESTED';
export type QEdgeRight = 'ALLOW' | 'ALLOW_WITH_SCAR' | 'CONDITIONAL' | 'DENY';

export interface EdgeRightsMap {
  contextEnrichment: QEdgeRight;
  comparison: QEdgeRight;
  clustering: QEdgeRight;
  propagation: QEdgeRight;
  judgmentSupport: QEdgeRight;
  explanation: QEdgeRight;
  competitorDiscovery: QEdgeRight;
}

export interface LiveGraphEdge {
  edgeId: string;
  edgeType: string;
  subjectNodeId: string;
  objectNodeId: string;
  subjectNodeType: string;
  objectNodeType: string;
  confidenceBand: QConfidenceBand;
  temporalStatus: QTemporalStatus;
  rights: EdgeRightsMap;
  evidenceRefs: string[];
  semanticFamily: string;
  scars: string[];
  validFrom?: string;
  validTo?: string;
}

export interface GraphQueryOptions {
  asOfTime?: string;
  replayGenerationRef?: string;
  maxDepth?: number;
  includeLowConfidence?: boolean;
  includeStale?: boolean;
  includeHistorical?: boolean;
  allowConditionalOnly?: boolean;
  resultLimit?: number;
  requireActivePaths?: boolean;
  requireEvidenceRefs?: boolean;
  pruneDeniedEdges?: boolean;
}

export interface PathSummary {
  targetNodeId: string;
  pathLength: number;
  strongestEdgeBand: QConfidenceBand;
  weakestEdgeBand: QConfidenceBand;
  containsStaleEdge: boolean;
  containsContestedEdge: boolean;
}

export interface GraphQueryResult {
  queryId: string;
  queryType: string;
  subjectNodeIds: string[];
  resultNodeIds: string[];
  traversedEdgeIds: string[];
  confidenceSummary: { high: number; medium: number; low: number; unresolved: number };
  temporalSummary: { activeEdges: number; staleEdges: number; provisionalEdges: number; contestedEdges: number; expiredEdges: number };
  blockedSections: string[];
  evidenceRefs: string[];
  explanationNotes: string[];
  replayGenerationRef?: string;
  queryWindow?: { asOfTime?: string; historical: boolean };
  prunedEdgeIds: string[];
  prunedNodeIds: string[];
  blockedReasonCodes: string[];
  pathSummaries: PathSummary[];
  schemaVersion: string;
}

export interface QueryFamilyPolicy {
  queryType: GraphQueryType;
  family: QueryFamily;
  defaultMaxDepth: number;
  allowedFamilies: string[];
  rightDomain: keyof EdgeRightsMap;
  allowedTemporalStates: QTemporalStatus[];
  pruneUnresolved: boolean;
  pruneLowConfidence: boolean;
  pruneStale: boolean;
  pruneContested: boolean;
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 2 — QUERY REGISTRY / FAMILY POLICIES                               ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const ACTIVE_PROVISIONAL: QTemporalStatus[] = ['ACTIVE', 'PROVISIONAL'];
const ACTIVE_PROV_STALE: QTemporalStatus[] = ['ACTIVE', 'PROVISIONAL', 'STALE'];

function policy(
  queryType: GraphQueryType, family: QueryFamily,
  allowedFamilies: string[], rightDomain: keyof EdgeRightsMap,
  depth: number, overrides: Partial<QueryFamilyPolicy> = {},
): QueryFamilyPolicy {
  return {
    queryType, family, defaultMaxDepth: depth, allowedFamilies, rightDomain,
    allowedTemporalStates: ACTIVE_PROVISIONAL,
    pruneUnresolved: true, pruneLowConfidence: false,
    pruneStale: false, pruneContested: false,
    ...overrides,
  };
}

const QUERY_POLICIES: Record<GraphQueryType, QueryFamilyPolicy> = {
  PROTOCOL_CONTEXT_FOR_ASSET: policy('PROTOCOL_CONTEXT_FOR_ASSET', 'CONTEXT_ENRICHMENT',
    ['STRUCTURAL', 'NARRATIVE', 'EVENT_IMPACT'], 'contextEnrichment', 2),
  CHAIN_CONTEXT_FOR_PROTOCOL: policy('CHAIN_CONTEXT_FOR_PROTOCOL', 'CONTEXT_ENRICHMENT',
    ['STRUCTURAL', 'EVENT_IMPACT'], 'contextEnrichment', 2),
  NARRATIVE_CONTEXT_FOR_OBJECT: policy('NARRATIVE_CONTEXT_FOR_OBJECT', 'CONTEXT_ENRICHMENT',
    ['NARRATIVE'], 'contextEnrichment', 1),
  PEER_SET_BY_PROTOCOL: policy('PEER_SET_BY_PROTOCOL', 'COMPARISON',
    ['COMPETITIVE', 'STRUCTURAL'], 'comparison', 2,
    { pruneStale: true, pruneContested: true }),
  PEER_SET_BY_SECTOR: policy('PEER_SET_BY_SECTOR', 'COMPARISON',
    ['DERIVED_CLUSTER', 'STRUCTURAL'], 'comparison', 2, { pruneStale: true }),
  SHARED_DEPENDENCY_GRAPH: policy('SHARED_DEPENDENCY_GRAPH', 'COMPARISON',
    ['STRUCTURAL'], 'comparison', 2, { pruneStale: true }),
  SPILLOVER_FROM_EVENT: policy('SPILLOVER_FROM_EVENT', 'SPILLOVER',
    ['EVENT_IMPACT', 'NARRATIVE', 'EXPOSURE'], 'propagation', 2,
    { pruneStale: true, pruneContested: true }),
  EXPOSURE_RADIUS: policy('EXPOSURE_RADIUS', 'SPILLOVER',
    ['EXPOSURE', 'STRUCTURAL'], 'contextEnrichment', 3),
  CAPITAL_ROTATION_GRAPH: policy('CAPITAL_ROTATION_GRAPH', 'SPILLOVER',
    ['INTERACTIONAL', 'DERIVED_CLUSTER'], 'contextEnrichment', 2),
  SECTOR_CLUSTER: policy('SECTOR_CLUSTER', 'CLUSTERING',
    ['DERIVED_CLUSTER'], 'clustering', 2),
  ECOSYSTEM_CLUSTER: policy('ECOSYSTEM_CLUSTER', 'CLUSTERING',
    ['DERIVED_CLUSTER'], 'clustering', 2),
  BEHAVIORAL_CLUSTER: policy('BEHAVIORAL_CLUSTER', 'CLUSTERING',
    ['INTERACTIONAL'], 'clustering', 2),
  COMPETITOR_SET: policy('COMPETITOR_SET', 'COMPETITOR_DISCOVERY',
    ['COMPETITIVE', 'DERIVED_CLUSTER'], 'competitorDiscovery', 2,
    { pruneStale: true }),
  CLOSEST_SUBSTITUTES: policy('CLOSEST_SUBSTITUTES', 'COMPETITOR_DISCOVERY',
    ['COMPETITIVE', 'DERIVED_CLUSTER', 'STRUCTURAL'], 'competitorDiscovery', 2,
    { pruneStale: true }),
  NARRATIVE_OVERLAP_COMPETITORS: policy('NARRATIVE_OVERLAP_COMPETITORS', 'COMPETITOR_DISCOVERY',
    ['NARRATIVE'], 'competitorDiscovery', 2),
};

export function getQueryPolicy(qt: GraphQueryType): QueryFamilyPolicy {
  return QUERY_POLICIES[qt];
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 3 — EDGE REGISTRY AND SUBJECT RESOLUTION                           ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const _edgesById = new Map<string, LiveGraphEdge>();
const _edgesBySubject = new Map<string, LiveGraphEdge[]>();
const _edgesByObject = new Map<string, LiveGraphEdge[]>();

export function registerLiveGraphEdge(e: LiveGraphEdge): void {
  _edgesById.set(e.edgeId, e);
  const sub = _edgesBySubject.get(e.subjectNodeId) ?? [];
  sub.push(e); _edgesBySubject.set(e.subjectNodeId, sub);
  const obj = _edgesByObject.get(e.objectNodeId) ?? [];
  obj.push(e); _edgesByObject.set(e.objectNodeId, obj);
}

export function getLiveGraphEdge(edgeId: string): LiveGraphEdge | undefined {
  return _edgesById.get(edgeId);
}

function getConnectedEdges(nodeId: string): LiveGraphEdge[] {
  return [
    ...(_edgesBySubject.get(nodeId) ?? []),
    ...(_edgesByObject.get(nodeId) ?? []),
  ];
}

function otherEnd(edge: LiveGraphEdge, nodeId: string): string {
  return edge.subjectNodeId === nodeId ? edge.objectNodeId : edge.subjectNodeId;
}

export function resolveSubjectNode(nodeId: string): { resolved: boolean; nodeId: string } {
  const node = getGraphNodeById(nodeId);
  return { resolved: !!node, nodeId };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 4 — TRAVERSAL ENGINE                                                ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const BAND_RANK: Record<QConfidenceBand, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNRESOLVED: 0 };

function bandMin(a: QConfidenceBand, b: QConfidenceBand): QConfidenceBand {
  return BAND_RANK[a] <= BAND_RANK[b] ? a : b;
}
function bandMax(a: QConfidenceBand, b: QConfidenceBand): QConfidenceBand {
  return BAND_RANK[a] >= BAND_RANK[b] ? a : b;
}

interface TraversalState {
  resultNodeIds: Set<string>;
  traversedEdges: LiveGraphEdge[];
  prunedEdges: LiveGraphEdge[];
  blockedSections: string[];
  blockedReasonCodes: string[];
  explanationNotes: string[];
  pathsToNode: Map<string, LiveGraphEdge[]>;
}

function isEdgeAdmissible(
  edge: LiveGraphEdge,
  pol: QueryFamilyPolicy,
  opts: GraphQueryOptions,
  asOfTime: string | undefined,
): 'ADMIT' | 'PRUNE_DENIED' | 'PRUNE_FAMILY' | 'PRUNE_TEMPORAL' | 'PRUNE_CONFIDENCE' | 'PRUNE_HISTORICAL' {
  if (!pol.allowedFamilies.includes(edge.semanticFamily)) return 'PRUNE_FAMILY';

  const right = edge.rights[pol.rightDomain];
  if (right === 'DENY') return 'PRUNE_DENIED';
  if (right === 'CONDITIONAL' && !opts.allowConditionalOnly) return 'PRUNE_DENIED';

  if (!pol.allowedTemporalStates.includes(edge.temporalStatus) && !opts.includeStale) {
    if (edge.temporalStatus === 'EXPIRED' || edge.temporalStatus === 'HISTORICAL') {
      if (!opts.includeHistorical) return 'PRUNE_HISTORICAL';
    }
    if (edge.temporalStatus === 'STALE' && pol.pruneStale && !opts.includeStale) return 'PRUNE_TEMPORAL';
    if (edge.temporalStatus === 'CONTESTED' && pol.pruneContested) return 'PRUNE_TEMPORAL';
  }

  if (edge.confidenceBand === 'UNRESOLVED' && pol.pruneUnresolved && !opts.includeLowConfidence) return 'PRUNE_CONFIDENCE';
  if (edge.confidenceBand === 'LOW' && pol.pruneLowConfidence && !opts.includeLowConfidence) return 'PRUNE_CONFIDENCE';

  if (asOfTime) {
    const t = new Date(asOfTime).getTime();
    const from = edge.validFrom ? new Date(edge.validFrom).getTime() : 0;
    const to = edge.validTo ? new Date(edge.validTo).getTime() : Infinity;
    if (t < from || t >= to) return 'PRUNE_HISTORICAL';
  }

  return 'ADMIT';
}

function traverse(
  subjectNodeIds: string[],
  pol: QueryFamilyPolicy,
  opts: GraphQueryOptions,
): TraversalState {
  const maxDepth = opts.maxDepth ?? pol.defaultMaxDepth;
  const asOfTime = opts.asOfTime;
  const state: TraversalState = {
    resultNodeIds: new Set<string>(),
    traversedEdges: [], prunedEdges: [],
    blockedSections: [], blockedReasonCodes: [],
    explanationNotes: [], pathsToNode: new Map(),
  };

  const visited = new Set<string>(subjectNodeIds);
  const visitedEdges = new Set<string>();

  interface QItem { nodeId: string; depth: number; pathEdges: LiveGraphEdge[] }
  const queue: QItem[] = subjectNodeIds.map(id => ({ nodeId: id, depth: 0, pathEdges: [] }));

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.depth >= maxDepth) continue;

    for (const edge of getConnectedEdges(cur.nodeId)) {
      if (visitedEdges.has(edge.edgeId)) continue;

      const targetId = otherEnd(edge, cur.nodeId);
      const verdict = isEdgeAdmissible(edge, pol, opts, asOfTime);

      if (verdict !== 'ADMIT') {
        state.prunedEdges.push(edge);
        const code = verdict.replace('PRUNE_', '');
        if (!state.blockedReasonCodes.includes(code)) state.blockedReasonCodes.push(code);
        state.blockedSections.push(`${code}:${edge.edgeId}:${edge.edgeType}`);
        if (verdict === 'PRUNE_TEMPORAL' || verdict === 'PRUNE_CONFIDENCE') {
          state.explanationNotes.push(
            `Edge ${edge.edgeId} (${edge.edgeType}) excluded: ${edge.temporalStatus}/${edge.confidenceBand}`,
          );
        }
        visitedEdges.add(edge.edgeId);
        continue;
      }

      visitedEdges.add(edge.edgeId);
      state.traversedEdges.push(edge);
      const nextPath = [...cur.pathEdges, edge];

      if (!visited.has(targetId)) {
        visited.add(targetId);
        state.resultNodeIds.add(targetId);
        state.pathsToNode.set(targetId, nextPath);
        queue.push({ nodeId: targetId, depth: cur.depth + 1, pathEdges: nextPath });
      }

      if (edge.rights[pol.rightDomain] === 'ALLOW_WITH_SCAR') {
        state.explanationNotes.push(
          `Edge ${edge.edgeId} (${edge.edgeType}) retained with uncertainty: scars [${edge.scars.join(', ')}]`,
        );
      }
    }
  }

  return state;
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 5 — PRUNING (exported helpers)                                      ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export function pruneQueryGraph(
  edges: LiveGraphEdge[],
  rightDomain: keyof EdgeRightsMap,
  opts: { pruneDenied?: boolean; pruneLow?: boolean; pruneUnresolved?: boolean },
): { kept: LiveGraphEdge[]; pruned: LiveGraphEdge[] } {
  const kept: LiveGraphEdge[] = [];
  const pruned: LiveGraphEdge[] = [];
  for (const e of edges) {
    const right = e.rights[rightDomain];
    if (opts.pruneDenied && right === 'DENY') { pruned.push(e); continue; }
    if (opts.pruneLow && e.confidenceBand === 'LOW') { pruned.push(e); continue; }
    if (opts.pruneUnresolved && e.confidenceBand === 'UNRESOLVED') { pruned.push(e); continue; }
    kept.push(e);
  }
  return { kept, pruned };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 6 — SUMMARIZATION                                                   ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export function summarizeQueryConfidence(edges: LiveGraphEdge[]): GraphQueryResult['confidenceSummary'] {
  const s = { high: 0, medium: 0, low: 0, unresolved: 0 };
  for (const e of edges) {
    if (e.confidenceBand === 'HIGH') s.high++;
    else if (e.confidenceBand === 'MEDIUM') s.medium++;
    else if (e.confidenceBand === 'LOW') s.low++;
    else s.unresolved++;
  }
  return s;
}

export function summarizeQueryTemporalState(edges: LiveGraphEdge[]): GraphQueryResult['temporalSummary'] {
  const s = { activeEdges: 0, staleEdges: 0, provisionalEdges: 0, contestedEdges: 0, expiredEdges: 0 };
  for (const e of edges) {
    if (e.temporalStatus === 'ACTIVE') s.activeEdges++;
    else if (e.temporalStatus === 'STALE') s.staleEdges++;
    else if (e.temporalStatus === 'PROVISIONAL') s.provisionalEdges++;
    else if (e.temporalStatus === 'CONTESTED') s.contestedEdges++;
    else if (e.temporalStatus === 'EXPIRED' || e.temporalStatus === 'HISTORICAL') s.expiredEdges++;
  }
  return s;
}

export function collectQueryEvidenceRefs(edges: LiveGraphEdge[]): string[] {
  const refs = new Set<string>();
  for (const e of edges) for (const r of e.evidenceRefs) refs.add(r);
  return [...refs];
}

function buildPathSummaries(pathsToNode: Map<string, LiveGraphEdge[]>): PathSummary[] {
  const summaries: PathSummary[] = [];
  for (const [targetId, path] of pathsToNode) {
    if (path.length === 0) continue;
    let strongest: QConfidenceBand = 'UNRESOLVED';
    let weakest: QConfidenceBand = 'HIGH';
    let hasStale = false;
    let hasContested = false;
    for (const e of path) {
      strongest = bandMax(strongest, e.confidenceBand);
      weakest = bandMin(weakest, e.confidenceBand);
      if (e.temporalStatus === 'STALE') hasStale = true;
      if (e.temporalStatus === 'CONTESTED') hasContested = true;
    }
    summaries.push({
      targetNodeId: targetId, pathLength: path.length,
      strongestEdgeBand: strongest, weakestEdgeBand: weakest,
      containsStaleEdge: hasStale, containsContestedEdge: hasContested,
    });
  }
  return summaries;
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 7 — CORE QUERY EXECUTION                                            ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

let _queryCounter = 0;

export function executeGraphQuery(
  queryType: GraphQueryType,
  subjectNodeIds: string[],
  opts: GraphQueryOptions = {},
): GraphQueryResult {
  const pol = QUERY_POLICIES[queryType];
  const ts = traverse(subjectNodeIds, pol, opts);

  let resultNodes = [...ts.resultNodeIds];
  if (opts.resultLimit && resultNodes.length > opts.resultLimit) {
    resultNodes = resultNodes.slice(0, opts.resultLimit);
  }

  const prunedNodeIds: string[] = [];
  for (const pe of ts.prunedEdges) {
    const target = otherEnd(pe, pe.subjectNodeId);
    if (!ts.resultNodeIds.has(target) && !prunedNodeIds.includes(target)) {
      prunedNodeIds.push(target);
    }
  }

  _queryCounter++;
  return {
    queryId: `qry_${_queryCounter}_${Date.now()}`,
    queryType,
    subjectNodeIds,
    resultNodeIds: resultNodes,
    traversedEdgeIds: ts.traversedEdges.map(e => e.edgeId),
    confidenceSummary: summarizeQueryConfidence(ts.traversedEdges),
    temporalSummary: summarizeQueryTemporalState(ts.traversedEdges),
    blockedSections: ts.blockedSections,
    evidenceRefs: collectQueryEvidenceRefs(ts.traversedEdges),
    explanationNotes: ts.explanationNotes,
    replayGenerationRef: opts.replayGenerationRef,
    queryWindow: opts.asOfTime ? { asOfTime: opts.asOfTime, historical: true } : undefined,
    prunedEdgeIds: ts.prunedEdges.map(e => e.edgeId),
    prunedNodeIds,
    blockedReasonCodes: ts.blockedReasonCodes,
    pathSummaries: buildPathSummaries(ts.pathsToNode),
    schemaVersion: 'v1',
  };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 8 — SPECIALIZED QUERY BUILDERS                                      ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

// -- Context Enrichment --

export function getProtocolContextForAsset(assetId: string, opts?: GraphQueryOptions): GraphQueryResult {
  return executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', [assetId], opts);
}

export function getChainContextForProtocol(protocolId: string, opts?: GraphQueryOptions): GraphQueryResult {
  return executeGraphQuery('CHAIN_CONTEXT_FOR_PROTOCOL', [protocolId], opts);
}

export function getNarrativeContextForObject(objectId: string, opts?: GraphQueryOptions): GraphQueryResult {
  return executeGraphQuery('NARRATIVE_CONTEXT_FOR_OBJECT', [objectId], opts);
}

// -- Comparison --

export function getPeerSetByProtocol(protocolId: string, opts?: GraphQueryOptions): GraphQueryResult {
  return executeGraphQuery('PEER_SET_BY_PROTOCOL', [protocolId], opts);
}

export function getPeerSetBySector(assetId: string, opts?: GraphQueryOptions): GraphQueryResult {
  return executeGraphQuery('PEER_SET_BY_SECTOR', [assetId], opts);
}

export function getSharedDependencyGraph(
  idA: string, idB: string, opts?: GraphQueryOptions,
): GraphQueryResult {
  const resA = executeGraphQuery('SHARED_DEPENDENCY_GRAPH', [idA], opts);
  const resB = executeGraphQuery('SHARED_DEPENDENCY_GRAPH', [idB], opts);
  const aNodes = new Set(resA.resultNodeIds);
  const shared = resB.resultNodeIds.filter(n => aNodes.has(n));

  const allEdgeIds = [...new Set([...resA.traversedEdgeIds, ...resB.traversedEdgeIds])];
  const allEvidence = [...new Set([...resA.evidenceRefs, ...resB.evidenceRefs])];

  _queryCounter++;
  return {
    queryId: `qry_${_queryCounter}_${Date.now()}`,
    queryType: 'SHARED_DEPENDENCY_GRAPH',
    subjectNodeIds: [idA, idB],
    resultNodeIds: shared,
    traversedEdgeIds: allEdgeIds,
    confidenceSummary: resA.confidenceSummary,
    temporalSummary: resA.temporalSummary,
    blockedSections: [...resA.blockedSections, ...resB.blockedSections],
    evidenceRefs: allEvidence,
    explanationNotes: [
      `Shared dependencies between ${idA} and ${idB}: ${shared.length} common nodes`,
      ...resA.explanationNotes, ...resB.explanationNotes,
    ],
    replayGenerationRef: opts?.replayGenerationRef,
    queryWindow: opts?.asOfTime ? { asOfTime: opts.asOfTime, historical: true } : undefined,
    prunedEdgeIds: [...new Set([...resA.prunedEdgeIds, ...resB.prunedEdgeIds])],
    prunedNodeIds: [...new Set([...resA.prunedNodeIds, ...resB.prunedNodeIds])],
    blockedReasonCodes: [...new Set([...resA.blockedReasonCodes, ...resB.blockedReasonCodes])],
    pathSummaries: [...resA.pathSummaries, ...resB.pathSummaries].filter(p => shared.includes(p.targetNodeId)),
    schemaVersion: 'v1',
  };
}

// -- Spillover Reasoning --

export function getSpilloverPathsFromEvent(nodeId: string, opts?: GraphQueryOptions): GraphQueryResult {
  const base = executeGraphQuery('SPILLOVER_FROM_EVENT', [nodeId], opts);

  const propEvents = opts?.asOfTime
    ? getActivePropagationForNodeAtTime(nodeId, opts.asOfTime)
    : getPropagationEventsForNode(nodeId);

  const propNodeIds = propEvents.map(e => e.targetNodeId);
  const propEdgeIds = propEvents.flatMap(e => e.traversedEdgeIds);
  const propEvidence = propEvents.flatMap(e => e.evidenceRefs);
  const propNotes = propEvents.map(e =>
    `Propagation ${e.propagationEventId}: ${e.effectClass} → ${e.targetNodeId} (strength ${e.strengthScore})`,
  );

  return {
    ...base,
    resultNodeIds: [...new Set([...base.resultNodeIds, ...propNodeIds])],
    traversedEdgeIds: [...new Set([...base.traversedEdgeIds, ...propEdgeIds])],
    evidenceRefs: [...new Set([...base.evidenceRefs, ...propEvidence])],
    explanationNotes: [...base.explanationNotes, ...propNotes],
  };
}

export function getExposureRadius(objectId: string, maxDepth?: number, opts?: GraphQueryOptions): GraphQueryResult {
  return executeGraphQuery('EXPOSURE_RADIUS', [objectId], { ...opts, maxDepth: maxDepth ?? 3 });
}

export function getCapitalRotationGraph(cohortId: string, opts?: GraphQueryOptions): GraphQueryResult {
  return executeGraphQuery('CAPITAL_ROTATION_GRAPH', [cohortId], opts);
}

// -- Clustering --

export function getSectorCluster(objectId: string, opts?: GraphQueryOptions): GraphQueryResult {
  return executeGraphQuery('SECTOR_CLUSTER', [objectId], opts);
}

export function getEcosystemCluster(objectId: string, opts?: GraphQueryOptions): GraphQueryResult {
  return executeGraphQuery('ECOSYSTEM_CLUSTER', [objectId], opts);
}

export function getBehavioralCluster(entityId: string, opts?: GraphQueryOptions): GraphQueryResult {
  return executeGraphQuery('BEHAVIORAL_CLUSTER', [entityId], opts);
}

// -- Competitor Discovery --

export function getCompetitorSet(objectId: string, opts?: GraphQueryOptions): GraphQueryResult {
  return executeGraphQuery('COMPETITOR_SET', [objectId], opts);
}

export function getClosestSubstitutes(objectId: string, opts?: GraphQueryOptions): GraphQueryResult {
  return executeGraphQuery('CLOSEST_SUBSTITUTES', [objectId], opts);
}

export function getNarrativeOverlapCompetitors(objectId: string, opts?: GraphQueryOptions): GraphQueryResult {
  const narResult = executeGraphQuery('NARRATIVE_OVERLAP_COMPETITORS', [objectId], opts);

  const narrativeNodes = narResult.resultNodeIds;
  const overlapResults: string[] = [];
  for (const narNode of narrativeNodes) {
    const connected = getConnectedEdges(narNode)
      .filter(e => e.semanticFamily === 'NARRATIVE' && otherEnd(e, narNode) !== objectId);
    for (const e of connected) {
      const peer = otherEnd(e, narNode);
      if (!overlapResults.includes(peer) && !narResult.subjectNodeIds.includes(peer)) {
        overlapResults.push(peer);
      }
    }
  }

  return {
    ...narResult,
    resultNodeIds: overlapResults,
    explanationNotes: [
      ...narResult.explanationNotes,
      `Narrative overlap competitors for ${objectId}: ${overlapResults.length} peers via shared narratives`,
    ],
  };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 9 — HISTORICAL / REPLAY + RESET                                    ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export function executeGraphQueryAtTime(
  queryType: GraphQueryType, subjectNodeIds: string[], t: string, opts?: GraphQueryOptions,
): GraphQueryResult {
  return executeGraphQuery(queryType, subjectNodeIds, {
    ...opts, asOfTime: t, includeHistorical: true, includeStale: true,
  });
}

export function executeHistoricalGraphQuery(
  queryType: GraphQueryType, subjectNodeIds: string[], t: string,
  replayGeneration?: string, opts?: GraphQueryOptions,
): GraphQueryResult {
  return executeGraphQuery(queryType, subjectNodeIds, {
    ...opts, asOfTime: t, replayGenerationRef: replayGeneration,
    includeHistorical: true, includeStale: true,
  });
}

export function resetGraphQuerySurfaces(): void {
  _edgesById.clear(); _edgesBySubject.clear(); _edgesByObject.clear();
  _queryCounter = 0;
}
