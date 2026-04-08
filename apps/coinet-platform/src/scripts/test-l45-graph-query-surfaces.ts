/**
 * L4.5 — Graph Query Surfaces: Certification Test
 *
 * Eight suites, 100+ assertions.
 *   A — Query registry and policy
 *   B — Subject resolution
 *   C — Traversal and result building
 *   D — Confidence-aware pruning
 *   E — Temporal-aware pruning
 *   F — Summaries and evidence
 *   G — Anti-fake suite
 *   H — Historical and replay
 */

import {
  getQueryPolicy, registerLiveGraphEdge, getLiveGraphEdge, resolveSubjectNode,
  executeGraphQuery, pruneQueryGraph,
  summarizeQueryConfidence, summarizeQueryTemporalState, collectQueryEvidenceRefs,
  getProtocolContextForAsset, getChainContextForProtocol, getNarrativeContextForObject,
  getPeerSetByProtocol, getPeerSetBySector, getSharedDependencyGraph,
  getSpilloverPathsFromEvent, getExposureRadius,
  getSectorCluster, getEcosystemCluster,
  getCompetitorSet, getNarrativeOverlapCompetitors,
  executeGraphQueryAtTime, executeHistoricalGraphQuery,
  resetGraphQuerySurfaces,
} from '../services/knowledge-graph/graph-query-surfaces';
import type {
  LiveGraphEdge, EdgeRightsMap, GraphQueryOptions,
} from '../services/knowledge-graph/graph-query-surfaces';

import { registerGraphNode, resetGraphNodeRegistry } from '../services/knowledge-graph/graph-node-registry';
import type { GraphNodeRecord } from '../services/knowledge-graph/graph-node-types';
import { getDefaultCanonicalCapabilities, getDefaultCanonicalRestrictions, getDefaultGraphNativeCapabilities, getDefaultGraphNativeRestrictions } from '../services/knowledge-graph/graph-node-types';

let passed = 0;
let failed = 0;

function ok(id: string, expr: boolean, msg: string): void {
  if (expr) { passed++; }
  else { failed++; console.error(`  FAIL ${id}: ${msg}`); }
}

// ── helpers ──────────────────────────────────────────────────────────────────

const ALLOW_ALL: EdgeRightsMap = {
  contextEnrichment: 'ALLOW', comparison: 'ALLOW', clustering: 'ALLOW',
  propagation: 'ALLOW', judgmentSupport: 'ALLOW', explanation: 'ALLOW',
  competitorDiscovery: 'ALLOW',
};

function makeEdge(
  id: string, type: string, sub: string, obj: string,
  subType: string, objType: string, family: string,
  overrides: Partial<LiveGraphEdge> = {},
): LiveGraphEdge {
  return {
    edgeId: id, edgeType: type,
    subjectNodeId: sub, objectNodeId: obj,
    subjectNodeType: subType, objectNodeType: objType,
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE',
    rights: { ...ALLOW_ALL }, evidenceRefs: [`ev_${id}`],
    semanticFamily: family, scars: [],
    validFrom: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeNode(id: string, nodeClass: 'CANONICAL' | 'GRAPH_NATIVE', type: string): GraphNodeRecord {
  const isCanonical = nodeClass === 'CANONICAL';
  return {
    nodeId: id, nodeClass, label: id, version: 'v1',
    lifecycleState: 'ACTIVE',
    canonicalNodeType: isCanonical ? type as any : undefined,
    nativeNodeType: !isCanonical ? type as any : undefined,
    origin: isCanonical ? 'L3_CANONICAL_PROJECTION' : 'GRAPH_DERIVED',
    canonicalObjectId: isCanonical ? id : undefined,
    capabilities: isCanonical ? getDefaultCanonicalCapabilities() : getDefaultGraphNativeCapabilities(type as any),
    restrictions: isCanonical ? getDefaultCanonicalRestrictions() : getDefaultGraphNativeRestrictions(),
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    evidenceRefs: [], lineageRefs: [], metadata: {},
  };
}

function buildTestGraph(): void {
  resetGraphNodeRegistry();
  resetGraphQuerySurfaces();

  const nodes: GraphNodeRecord[] = [
    makeNode('ast_eth', 'CANONICAL', 'ASSET'),
    makeNode('ast_btc', 'CANONICAL', 'ASSET'),
    makeNode('ast_sol', 'CANONICAL', 'ASSET'),
    makeNode('proto_uni', 'CANONICAL', 'PROTOCOL'),
    makeNode('proto_aave', 'CANONICAL', 'PROTOCOL'),
    makeNode('chain_eth', 'CANONICAL', 'CHAIN'),
    makeNode('topic_defi', 'CANONICAL', 'NARRATIVE_TOPIC'),
    makeNode('entity_whale', 'CANONICAL', 'ENTITY'),
    makeNode('sector_defi', 'GRAPH_NATIVE', 'SECTOR_CLUSTER'),
    makeNode('eco_eth', 'GRAPH_NATIVE', 'ECOSYSTEM_CLUSTER'),
    makeNode('unlock_sol', 'GRAPH_NATIVE', 'UNLOCK_EVENT'),
    makeNode('comp_defi', 'GRAPH_NATIVE', 'COMPETITOR_CLUSTER'),
    makeNode('wallet_smart', 'GRAPH_NATIVE', 'WALLET_COHORT'),
  ];
  for (const n of nodes) registerGraphNode(n);

  const edges: LiveGraphEdge[] = [
    makeEdge('e1', 'ASSET_BELONGS_TO_PROTOCOL', 'ast_eth', 'proto_uni', 'ASSET', 'PROTOCOL', 'STRUCTURAL'),
    makeEdge('e2', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_uni', 'chain_eth', 'PROTOCOL', 'CHAIN', 'STRUCTURAL'),
    makeEdge('e3', 'PROTOCOL_HAS_TOKEN', 'proto_uni', 'ast_eth', 'PROTOCOL', 'ASSET', 'STRUCTURAL'),
    makeEdge('e4', 'NARRATIVE_AFFECTS_ASSET', 'topic_defi', 'ast_eth', 'NARRATIVE_TOPIC', 'ASSET', 'NARRATIVE',
      { confidenceBand: 'MEDIUM' }),
    makeEdge('e5', 'ASSET_IN_SECTOR', 'ast_eth', 'sector_defi', 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER',
      { confidenceBand: 'MEDIUM' }),
    makeEdge('e6', 'ASSET_IN_ECOSYSTEM', 'ast_eth', 'eco_eth', 'ASSET', 'ECOSYSTEM_CLUSTER', 'DERIVED_CLUSTER'),
    makeEdge('e7', 'PROTOCOL_HAS_COMPETITOR', 'proto_uni', 'proto_aave', 'PROTOCOL', 'PROTOCOL', 'COMPETITIVE',
      { confidenceBand: 'MEDIUM' }),
    makeEdge('e8', 'ASSET_IN_SECTOR', 'ast_btc', 'sector_defi', 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER'),
    makeEdge('e9', 'UNLOCK_IMPACTS_FLOAT', 'unlock_sol', 'ast_sol', 'UNLOCK_EVENT', 'ASSET', 'EVENT_IMPACT',
      { confidenceBand: 'MEDIUM' }),
    makeEdge('e10', 'ASSET_IN_SECTOR', 'ast_sol', 'sector_defi', 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER'),
    makeEdge('e11', 'ASSET_HAS_COMPETITOR', 'ast_eth', 'comp_defi', 'ASSET', 'COMPETITOR_CLUSTER', 'DERIVED_CLUSTER',
      { confidenceBand: 'MEDIUM' }),
    makeEdge('e12', 'ENTITY_EXPOSED_TO_ASSET', 'entity_whale', 'ast_eth', 'ENTITY', 'ASSET', 'EXPOSURE',
      { confidenceBand: 'MEDIUM' }),
    makeEdge('e13', 'WALLET_ROTATES_INTO_ASSET', 'wallet_smart', 'ast_eth', 'WALLET_COHORT', 'ASSET', 'INTERACTIONAL',
      { confidenceBand: 'MEDIUM' }),
    makeEdge('e14', 'NARRATIVE_AFFECTS_PROTOCOL', 'topic_defi', 'proto_uni', 'NARRATIVE_TOPIC', 'PROTOCOL', 'NARRATIVE',
      { confidenceBand: 'MEDIUM' }),

    // Weak edges for pruning tests
    makeEdge('e_deny', 'ASSET_BELONGS_TO_PROTOCOL', 'ast_sol', 'proto_uni', 'ASSET', 'PROTOCOL', 'STRUCTURAL',
      { rights: { ...ALLOW_ALL, contextEnrichment: 'DENY', comparison: 'DENY' } }),
    makeEdge('e_low', 'NARRATIVE_AFFECTS_ASSET', 'topic_defi', 'ast_sol', 'NARRATIVE_TOPIC', 'ASSET', 'NARRATIVE',
      { confidenceBand: 'LOW' }),
    makeEdge('e_unresolved', 'ASSET_IN_SECTOR', 'ast_sol', 'eco_eth', 'ASSET', 'ECOSYSTEM_CLUSTER', 'DERIVED_CLUSTER',
      { confidenceBand: 'UNRESOLVED' }),
    makeEdge('e_stale', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_aave', 'chain_eth', 'PROTOCOL', 'CHAIN', 'STRUCTURAL',
      { temporalStatus: 'STALE' }),
    makeEdge('e_expired', 'NARRATIVE_AFFECTS_ASSET', 'topic_defi', 'ast_btc', 'NARRATIVE_TOPIC', 'ASSET', 'NARRATIVE',
      { temporalStatus: 'EXPIRED' }),
    makeEdge('e_contested', 'PROTOCOL_HAS_COMPETITOR', 'proto_aave', 'proto_uni', 'PROTOCOL', 'PROTOCOL', 'COMPETITIVE',
      { temporalStatus: 'CONTESTED', confidenceBand: 'MEDIUM' }),
    makeEdge('e_scar', 'NARRATIVE_AFFECTS_ASSET', 'topic_defi', 'ast_btc', 'NARRATIVE_TOPIC', 'ASSET', 'NARRATIVE',
      { rights: { ...ALLOW_ALL, contextEnrichment: 'ALLOW_WITH_SCAR' }, scars: ['EVIDENCE_SPARSE'] }),
    makeEdge('e_conditional', 'ASSET_BELONGS_TO_PROTOCOL', 'ast_btc', 'proto_aave', 'ASSET', 'PROTOCOL', 'STRUCTURAL',
      { rights: { ...ALLOW_ALL, contextEnrichment: 'CONDITIONAL' } }),

    // Historical edge
    makeEdge('e_hist', 'ASSET_BELONGS_TO_PROTOCOL', 'ast_btc', 'proto_uni', 'ASSET', 'PROTOCOL', 'STRUCTURAL',
      { temporalStatus: 'HISTORICAL', validFrom: '2025-01-01T00:00:00Z', validTo: '2026-01-01T00:00:00Z' }),
  ];
  for (const e of edges) registerLiveGraphEdge(e);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE A — QUERY REGISTRY AND POLICY
// ═══════════════════════════════════════════════════════════════════════════════

function suiteA(): void {
  console.log('\n--- Suite A: Query Registry & Policy ---');
  buildTestGraph();

  const protCtx = getQueryPolicy('PROTOCOL_CONTEXT_FOR_ASSET');
  ok('A1', protCtx.family === 'CONTEXT_ENRICHMENT', 'Protocol context is CONTEXT_ENRICHMENT family');
  ok('A2', protCtx.defaultMaxDepth === 2, 'Default max depth is 2');
  ok('A3', protCtx.allowedFamilies.includes('STRUCTURAL'), 'Structural edges allowed');
  ok('A4', protCtx.rightDomain === 'contextEnrichment', 'Right domain is contextEnrichment');

  const peerProto = getQueryPolicy('PEER_SET_BY_PROTOCOL');
  ok('A5', peerProto.family === 'COMPARISON', 'Peer set is COMPARISON family');
  ok('A6', peerProto.pruneStale, 'Comparison prunes stale by default');
  ok('A7', peerProto.pruneContested, 'Comparison prunes contested by default');

  const spillover = getQueryPolicy('SPILLOVER_FROM_EVENT');
  ok('A8', spillover.family === 'SPILLOVER', 'Spillover is SPILLOVER family');
  ok('A9', spillover.rightDomain === 'propagation', 'Spillover checks propagation right');

  const compDisc = getQueryPolicy('COMPETITOR_SET');
  ok('A10', compDisc.family === 'COMPETITOR_DISCOVERY', 'Competitor is COMPETITOR_DISCOVERY family');
  ok('A11', compDisc.allowedFamilies.includes('COMPETITIVE'), 'Competitive edges allowed');

  const cluster = getQueryPolicy('SECTOR_CLUSTER');
  ok('A12', cluster.family === 'CLUSTERING', 'Cluster is CLUSTERING family');
  ok('A13', cluster.rightDomain === 'clustering', 'Cluster checks clustering right');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE B — SUBJECT RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

function suiteB(): void {
  console.log('\n--- Suite B: Subject Resolution ---');
  buildTestGraph();

  const assetRes = resolveSubjectNode('ast_eth');
  ok('B1', assetRes.resolved, 'Asset subject resolves');

  const protoRes = resolveSubjectNode('proto_uni');
  ok('B2', protoRes.resolved, 'Protocol subject resolves');

  const nativeRes = resolveSubjectNode('sector_defi');
  ok('B3', nativeRes.resolved, 'Graph-native subject resolves');

  const invalid = resolveSubjectNode('nonexistent_node');
  ok('B4', !invalid.resolved, 'Invalid subject not resolved');

  const multiResult = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', ['ast_eth']);
  ok('B5', multiResult.subjectNodeIds.includes('ast_eth'), 'Subject IDs preserved in result');
  ok('B6', multiResult.resultNodeIds.length > 0, 'Multi-subject query returns results');

  const edgeCheck = getLiveGraphEdge('e1');
  ok('B7', !!edgeCheck, 'Registered edge retrievable');
  ok('B8', edgeCheck!.edgeType === 'ASSET_BELONGS_TO_PROTOCOL', 'Edge type correct');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE C — TRAVERSAL AND RESULT BUILDING
// ═══════════════════════════════════════════════════════════════════════════════

function suiteC(): void {
  console.log('\n--- Suite C: Traversal & Result Building ---');
  buildTestGraph();

  const protCtx = getProtocolContextForAsset('ast_eth');
  ok('C1', protCtx.resultNodeIds.includes('proto_uni'), 'Protocol context finds protocol');
  ok('C2', protCtx.resultNodeIds.includes('chain_eth'), 'Protocol context reaches chain at depth 2');
  ok('C3', protCtx.traversedEdgeIds.includes('e1'), 'ASSET_BELONGS_TO_PROTOCOL traversed');
  ok('C4', protCtx.traversedEdgeIds.includes('e2'), 'PROTOCOL_OPERATES_ON_CHAIN traversed');
  ok('C5', protCtx.queryType === 'PROTOCOL_CONTEXT_FOR_ASSET', 'Query type recorded');
  ok('C6', protCtx.schemaVersion === 'v1', 'Schema version present');

  const chainCtx = getChainContextForProtocol('proto_uni');
  ok('C7', chainCtx.resultNodeIds.includes('chain_eth'), 'Chain context finds chain');

  const narCtx = getNarrativeContextForObject('ast_eth');
  ok('C8', narCtx.resultNodeIds.includes('topic_defi'), 'Narrative context finds topic');

  const peerProto = getPeerSetByProtocol('proto_uni');
  ok('C9', peerProto.resultNodeIds.includes('proto_aave'), 'Peer set finds competitor');

  const peerSector = getPeerSetBySector('ast_eth');
  ok('C10', peerSector.resultNodeIds.includes('sector_defi'), 'Sector peer finds sector');
  ok('C11', peerSector.resultNodeIds.includes('ast_btc'), 'Sector peer finds sector co-member');

  const sectorCluster = getSectorCluster('ast_eth');
  ok('C12', sectorCluster.resultNodeIds.includes('sector_defi'), 'Sector cluster finds sector');

  const ecoCluster = getEcosystemCluster('ast_eth');
  ok('C13', ecoCluster.resultNodeIds.includes('eco_eth'), 'Ecosystem cluster finds ecosystem');

  const competitors = getCompetitorSet('proto_uni');
  ok('C14', competitors.resultNodeIds.includes('proto_aave'), 'Competitor set finds competitor');

  const spillover = getSpilloverPathsFromEvent('unlock_sol');
  ok('C15', spillover.resultNodeIds.includes('ast_sol'), 'Spillover finds affected asset');

  const sharedDep = getSharedDependencyGraph('ast_eth', 'proto_uni');
  ok('C16', sharedDep.subjectNodeIds.includes('ast_eth'), 'Shared dependency preserves subject A');
  ok('C17', sharedDep.subjectNodeIds.includes('proto_uni'), 'Shared dependency preserves subject B');
  ok('C18', sharedDep.queryType === 'SHARED_DEPENDENCY_GRAPH', 'Shared dependency query type correct');
  ok('C19', sharedDep.explanationNotes.some(n => n.includes('Shared dependencies')), 'Shared dependency explanation present');

  const narOverlap = getNarrativeOverlapCompetitors('ast_eth');
  ok('C20', narOverlap.explanationNotes.some(n => n.includes('Narrative overlap')), 'Narrative overlap explanation present');

  const limited = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', ['ast_eth'], { resultLimit: 1 });
  ok('C21', limited.resultNodeIds.length <= 1, 'Result limit respected');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE D — CONFIDENCE-AWARE PRUNING
// ═══════════════════════════════════════════════════════════════════════════════

function suiteD(): void {
  console.log('\n--- Suite D: Confidence-Aware Pruning ---');
  buildTestGraph();

  const ctx = getProtocolContextForAsset('ast_sol');
  ok('D1', ctx.prunedEdgeIds.includes('e_deny'), 'DENY edge pruned');
  ok('D2', ctx.blockedReasonCodes.includes('DENIED'), 'DENIED reason code present');
  ok('D3', ctx.blockedSections.some(s => s.includes('e_deny')), 'Blocked section references denied edge');

  const unresolved = getSectorCluster('ast_sol');
  ok('D4', unresolved.prunedEdgeIds.includes('e_unresolved'), 'UNRESOLVED edge pruned by default');
  ok('D5', unresolved.blockedReasonCodes.includes('CONFIDENCE'), 'CONFIDENCE reason code present');

  const withLow = getNarrativeContextForObject('ast_sol', { includeLowConfidence: true });
  ok('D6', withLow.traversedEdgeIds.includes('e_low') || !withLow.prunedEdgeIds.includes('e_low'),
    'LOW edge NOT pruned when includeLowConfidence');

  const { kept, pruned } = pruneQueryGraph(
    [
      makeEdge('t1', 'X', 'a', 'b', 'A', 'B', 'STRUCTURAL'),
      makeEdge('t2', 'X', 'a', 'c', 'A', 'C', 'STRUCTURAL', { rights: { ...ALLOW_ALL, contextEnrichment: 'DENY' } }),
      makeEdge('t3', 'X', 'a', 'd', 'A', 'D', 'STRUCTURAL', { confidenceBand: 'UNRESOLVED' }),
    ],
    'contextEnrichment',
    { pruneDenied: true, pruneUnresolved: true },
  );
  ok('D7', kept.length === 1, 'pruneQueryGraph keeps 1 edge');
  ok('D8', pruned.length === 2, 'pruneQueryGraph prunes 2 edges');

  const scarResult = getNarrativeContextForObject('ast_btc');
  const hasScarNote = scarResult.explanationNotes.some(n => n.includes('EVIDENCE_SPARSE'));
  ok('D9', hasScarNote, 'ALLOW_WITH_SCAR edge generates explanation note with scar');

  const condResult = getProtocolContextForAsset('ast_btc');
  ok('D10', condResult.prunedEdgeIds.includes('e_conditional'), 'CONDITIONAL edge pruned by default');

  const condAllowed = getProtocolContextForAsset('ast_btc', { allowConditionalOnly: true });
  ok('D11', !condAllowed.prunedEdgeIds.includes('e_conditional'), 'CONDITIONAL edge allowed with option');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE E — TEMPORAL-AWARE PRUNING
// ═══════════════════════════════════════════════════════════════════════════════

function suiteE(): void {
  console.log('\n--- Suite E: Temporal-Aware Pruning ---');
  buildTestGraph();

  const peerResult = getPeerSetByProtocol('proto_aave');
  const staleHandled = peerResult.prunedEdgeIds.includes('e_stale')
    || !peerResult.traversedEdgeIds.includes('e_stale');
  ok('E1', staleHandled, 'Stale edge handled in comparison query');

  const contestedHandled = peerResult.prunedEdgeIds.includes('e_contested')
    || !peerResult.traversedEdgeIds.includes('e_contested');
  ok('E2', contestedHandled, 'Contested edge handled in comparison query');

  const expiredResult = getNarrativeContextForObject('ast_btc');
  ok('E3', !expiredResult.resultNodeIds.includes('topic_defi')
    || expiredResult.prunedEdgeIds.includes('e_expired'),
    'Expired edge excluded or pruned in live mode');

  const withStale = getChainContextForProtocol('proto_aave', { includeStale: true });
  ok('E4', withStale.traversedEdgeIds.includes('e_stale'), 'Stale edge included with includeStale option');

  const historical = executeHistoricalGraphQuery(
    'PROTOCOL_CONTEXT_FOR_ASSET', ['ast_btc'], '2025-06-01T00:00:00Z',
  );
  ok('E5', historical.traversedEdgeIds.includes('e_hist'), 'Historical edge visible in historical mode');
  ok('E6', historical.queryWindow?.historical === true, 'Historical flag set');

  const liveNoHist = getProtocolContextForAsset('ast_btc');
  ok('E7', !liveNoHist.traversedEdgeIds.includes('e_hist'), 'Historical edge not in live query');

  const provisionalEdge = makeEdge('e_prov', 'NARRATIVE_AFFECTS_ASSET', 'topic_defi', 'ast_eth',
    'NARRATIVE_TOPIC', 'ASSET', 'NARRATIVE', { temporalStatus: 'PROVISIONAL' });
  registerLiveGraphEdge(provisionalEdge);
  const ctxWithProv = getNarrativeContextForObject('ast_eth');
  ok('E8', ctxWithProv.traversedEdgeIds.includes('e_prov'), 'Provisional edge retained in context query');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE F — SUMMARIES AND EVIDENCE
// ═══════════════════════════════════════════════════════════════════════════════

function suiteF(): void {
  console.log('\n--- Suite F: Summaries & Evidence ---');
  buildTestGraph();

  const result = getProtocolContextForAsset('ast_eth');

  ok('F1', result.confidenceSummary.high >= 1, 'Confidence summary has HIGH edges');
  ok('F2', typeof result.confidenceSummary.medium === 'number', 'Confidence summary has medium count');
  ok('F3', typeof result.confidenceSummary.low === 'number', 'Confidence summary has low count');
  ok('F4', typeof result.confidenceSummary.unresolved === 'number', 'Confidence summary has unresolved count');

  const totalConf = result.confidenceSummary.high + result.confidenceSummary.medium
    + result.confidenceSummary.low + result.confidenceSummary.unresolved;
  ok('F5', totalConf === result.traversedEdgeIds.length, 'Confidence summary counts match traversed edge count');

  ok('F6', result.temporalSummary.activeEdges >= 1, 'Temporal summary has active edges');
  ok('F7', typeof result.temporalSummary.staleEdges === 'number', 'Temporal summary has stale count');
  ok('F8', typeof result.temporalSummary.provisionalEdges === 'number', 'Temporal summary has provisional count');
  ok('F9', typeof result.temporalSummary.contestedEdges === 'number', 'Temporal summary has contested count');

  ok('F10', result.evidenceRefs.length > 0, 'Evidence refs aggregated');
  ok('F11', result.evidenceRefs.includes('ev_e1'), 'Specific evidence ref present');

  ok('F12', result.pathSummaries.length > 0, 'Path summaries generated');
  const protoPath = result.pathSummaries.find(p => p.targetNodeId === 'proto_uni');
  ok('F13', !!protoPath, 'Protocol path summary exists');
  ok('F14', protoPath!.pathLength === 1, 'Protocol path length is 1');
  ok('F15', protoPath!.strongestEdgeBand === 'HIGH', 'Strongest edge band correct');

  const summary = summarizeQueryConfidence([
    makeEdge('s1', 'X', 'a', 'b', 'A', 'B', 'S'),
    makeEdge('s2', 'X', 'a', 'c', 'A', 'C', 'S', { confidenceBand: 'MEDIUM' }),
    makeEdge('s3', 'X', 'a', 'd', 'A', 'D', 'S', { confidenceBand: 'LOW' }),
  ]);
  ok('F16', summary.high === 1 && summary.medium === 1 && summary.low === 1, 'Manual summary correct');

  const tempSummary = summarizeQueryTemporalState([
    makeEdge('t1', 'X', 'a', 'b', 'A', 'B', 'S'),
    makeEdge('t2', 'X', 'a', 'c', 'A', 'C', 'S', { temporalStatus: 'STALE' }),
  ]);
  ok('F17', tempSummary.activeEdges === 1 && tempSummary.staleEdges === 1, 'Manual temporal summary correct');

  const refs = collectQueryEvidenceRefs([
    makeEdge('r1', 'X', 'a', 'b', 'A', 'B', 'S', { evidenceRefs: ['ref_a', 'ref_b'] }),
    makeEdge('r2', 'X', 'a', 'c', 'A', 'C', 'S', { evidenceRefs: ['ref_b', 'ref_c'] }),
  ]);
  ok('F18', refs.length === 3, 'Evidence refs deduplicated across edges');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE G — ANTI-FAKE
// ═══════════════════════════════════════════════════════════════════════════════

function suiteG(): void {
  console.log('\n--- Suite G: Anti-Fake ---');
  buildTestGraph();

  const ctx = getProtocolContextForAsset('ast_eth');
  ok('G1', !!ctx.confidenceSummary, 'No raw adjacency: confidence summary present');
  ok('G2', !!ctx.temporalSummary, 'No raw adjacency: temporal summary present');
  ok('G3', ctx.evidenceRefs.length > 0, 'No raw adjacency: evidence refs present');
  ok('G4', ctx.schemaVersion === 'v1', 'No raw adjacency: schema version present');

  const narCtx = getNarrativeContextForObject('ast_eth');
  ok('G5', !narCtx.traversedEdgeIds.some(id => {
    const e = getLiveGraphEdge(id);
    return e?.semanticFamily === 'STRUCTURAL';
  }), 'Narrative context excludes structural edges');

  const compResult = getCompetitorSet('proto_uni');
  ok('G6', !compResult.resultNodeIds.includes('proto_uni'), 'Competitor set does not include self');

  const spillResult = getSpilloverPathsFromEvent('unlock_sol');
  ok('G7', spillResult.queryType === 'SPILLOVER_FROM_EVENT', 'Spillover query type preserved');

  const clusterResult = getSectorCluster('ast_eth');
  const weakEdges = clusterResult.traversedEdgeIds.filter(id => {
    const e = getLiveGraphEdge(id);
    return e && (e.confidenceBand === 'LOW' || e.confidenceBand === 'UNRESOLVED');
  });
  const weakPruned = clusterResult.prunedEdgeIds.filter(id => {
    const e = getLiveGraphEdge(id);
    return e && e.confidenceBand === 'UNRESOLVED';
  });
  ok('G8', weakEdges.length === 0 || weakPruned.length > 0,
    'Weak cluster membership handled: pruned or absent');

  const denyCtx = getProtocolContextForAsset('ast_sol');
  ok('G9', denyCtx.prunedEdgeIds.length > 0, 'Denied paths visible in pruned list');
  ok('G10', denyCtx.blockedSections.length > 0, 'Blocked sections present when pruning occurred');
  ok('G11', denyCtx.blockedReasonCodes.length > 0, 'Blocked reason codes present');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE H — HISTORICAL AND REPLAY
// ═══════════════════════════════════════════════════════════════════════════════

function suiteH(): void {
  console.log('\n--- Suite H: Historical & Replay ---');
  buildTestGraph();

  const histResult = executeGraphQueryAtTime(
    'PROTOCOL_CONTEXT_FOR_ASSET', ['ast_btc'], '2025-06-01T00:00:00Z',
  );
  ok('H1', histResult.queryWindow?.asOfTime === '2025-06-01T00:00:00Z', 'Query asOfTime preserved');
  ok('H2', histResult.queryWindow?.historical === true, 'Historical flag set');
  ok('H3', histResult.traversedEdgeIds.includes('e_hist'), 'Historical edge visible at correct time');

  const futureResult = executeGraphQueryAtTime(
    'PROTOCOL_CONTEXT_FOR_ASSET', ['ast_btc'], '2027-01-01T00:00:00Z',
  );
  ok('H4', !futureResult.traversedEdgeIds.includes('e_hist'), 'Historical edge not visible after validTo');

  const replayResult = executeHistoricalGraphQuery(
    'PROTOCOL_CONTEXT_FOR_ASSET', ['ast_btc'], '2025-06-01T00:00:00Z', 'gen_42',
  );
  ok('H5', replayResult.replayGenerationRef === 'gen_42', 'Replay generation ref preserved');
  ok('H6', replayResult.queryWindow?.historical === true, 'Replay query is historical');

  const liveResult = getProtocolContextForAsset('ast_btc');
  ok('H7', !liveResult.queryWindow, 'Live query has no queryWindow');
  ok('H8', !liveResult.traversedEdgeIds.includes('e_hist'), 'Current state does not include historical edge');

  const histCtx = executeHistoricalGraphQuery(
    'CHAIN_CONTEXT_FOR_PROTOCOL', ['proto_aave'], '2026-03-01T00:00:00Z',
  );
  ok('H9', histCtx.traversedEdgeIds.includes('e_stale'), 'Historical mode includes stale edges');
  ok('H10', histCtx.queryWindow?.historical === true, 'Historical context flag correct');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════════════════════════

suiteA();
suiteB();
suiteC();
suiteD();
suiteE();
suiteF();
suiteG();
suiteH();

console.log(`\n${'═'.repeat(60)}`);
console.log(`L4.5 Graph Query Surfaces — TOTAL: ${passed + failed} | ✅ ${passed} | ❌ ${failed}`);
console.log(`${'═'.repeat(60)}`);
if (failed > 0) process.exit(1);
