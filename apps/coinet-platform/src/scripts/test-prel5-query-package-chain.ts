/**
 * Pre-L5 Integrated Systems Certification — Band E
 * Query and Package Chain
 *
 * Seven suites, ~200 assertions
 */

import {
  registerGraphNode,
  getGraphNodeById,
  resetGraphNodeRegistry,
} from '../services/knowledge-graph/graph-node-registry';
import {
  getDefaultCanonicalCapabilities,
  getDefaultCanonicalRestrictions,
  getDefaultGraphNativeCapabilities,
  getDefaultGraphNativeRestrictions,
} from '../services/knowledge-graph/graph-node-types';
import type { GraphNodeRecord } from '../services/knowledge-graph/graph-node-types';
import {
  projectCanonicalObjectToGraphNode,
  buildCanonicalNodeId,
} from '../services/knowledge-graph/graph-node-projection';
import {
  registerLiveGraphEdge,
  resetGraphQuerySurfaces,
  getProtocolContextForAsset,
  getChainContextForProtocol,
  getSectorCluster,
  getPeerSetBySector,
  getCompetitorSet,
  getClosestSubstitutes,
  getNarrativeOverlapCompetitors,
  getNarrativeContextForObject,
  executeGraphQuery,
  executeGraphQueryAtTime,
} from '../services/knowledge-graph/graph-query-surfaces';
import type {
  LiveGraphEdge,
  EdgeRightsMap,
  GraphQueryResult,
} from '../services/knowledge-graph/graph-query-surfaces';
import {
  bootstrapRelationOntology,
  resetRelationOntology,
} from '../services/knowledge-graph/relation-ontology';
import { resetTemporalGraphState } from '../services/knowledge-graph/temporal-graph-state';
import {
  evaluatePropagationTrigger,
  getPropagationEventsForNode,
  bootstrapPropagationRules,
  resetPropagationEngine,
  getPropagationRule,
} from '../services/knowledge-graph/graph-propagation-engine';
import type {
  PropagationTrigger,
  SourceEdgeContext,
  GraphEdgeForTraversal,
} from '../services/knowledge-graph/graph-propagation-engine';
import {
  buildTokenContextPackage,
  buildProtocolContextPackage,
  buildHistoricalGraphContextPackage,
  buildGraphContextPackage,
  summarizeProtocolContext,
  summarizeChainContext,
  summarizeSectorContext,
  summarizeCompetitorContext,
  summarizeNarrativeContext,
  resetGraphContextPackager,
} from '../services/knowledge-graph/graph-context-packager';
import type { GraphContextPackage } from '../services/knowledge-graph/graph-context-packager';

import { resetContractRegistry, bootstrapContracts } from '../services/canonicalization/metric-contracts';
import { resetPathRegistry, bootstrapNamespacePaths } from '../services/canonicalization/metric-namespace';
import { resetMapperState } from '../services/canonicalization/provider-metric-mappers';
import { resetValidatorState } from '../services/canonicalization/metric-namespace-validator';
import { resetGateAuditLog } from '../services/canonicalization/confidence-gate';
import { resetClaimLedger } from '../services/canonicalization/provider-claim-ledger';
import { resetReconciliationState } from '../services/canonicalization/cross-provider-reconciliation';
import { resetMutationLedger } from '../services/canonicalization/mutation-ledger';
import { resetVersionStore } from '../services/canonicalization/canonical-versioning';
import { resetDiffStore } from '../services/canonicalization/entity-diff-engine';
import { resetAuditEvents } from '../services/canonicalization/mutation-control';
import { resetRollbackState } from '../services/canonicalization/rollback-engine';
import { resetMutationHistory } from '../services/canonicalization/entity-merge-split-engine';

let passed = 0;
let failed = 0;
function assert(c: boolean, l: string) { if (c) passed++; else { failed++; console.error(`  FAIL: ${l}`); } }

const ALLOW_ALL: EdgeRightsMap = {
  contextEnrichment: 'ALLOW', comparison: 'ALLOW', clustering: 'ALLOW',
  propagation: 'ALLOW', judgmentSupport: 'ALLOW', explanation: 'ALLOW',
  competitorDiscovery: 'ALLOW',
};

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

function makeEdge(id: string, type: string, sub: string, obj: string, subType: string, objType: string, family: string, overrides: Partial<LiveGraphEdge> = {}): LiveGraphEdge {
  return {
    edgeId: id, edgeType: type, subjectNodeId: sub, objectNodeId: obj,
    subjectNodeType: subType, objectNodeType: objType,
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE',
    rights: { ...ALLOW_ALL }, evidenceRefs: [`ev_${id}`],
    semanticFamily: family, scars: [], validFrom: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function resetAll(): void {
  resetContractRegistry(); bootstrapContracts();
  resetPathRegistry(); bootstrapNamespacePaths();
  resetMapperState(); resetValidatorState();
  resetGateAuditLog(); resetClaimLedger();
  resetReconciliationState(); resetMutationHistory();
  resetMutationLedger(); resetVersionStore();
  resetDiffStore(); resetAuditEvents();
  resetRollbackState();
  resetGraphNodeRegistry(); resetRelationOntology();
  bootstrapRelationOntology();
  resetGraphQuerySurfaces(); resetTemporalGraphState();
  resetPropagationEngine(); resetGraphContextPackager();
}

function buildTestGraph(): void {
  registerGraphNode(makeNode('asset_eth', 'CANONICAL', 'ASSET'));
  registerGraphNode(makeNode('proto_uniswap', 'CANONICAL', 'PROTOCOL'));
  registerGraphNode(makeNode('proto_aave', 'CANONICAL', 'PROTOCOL'));
  registerGraphNode(makeNode('chain_eth', 'CANONICAL', 'CHAIN'));
  registerGraphNode(makeNode('chain_base', 'CANONICAL', 'CHAIN'));
  registerGraphNode(makeNode('asset_sol', 'CANONICAL', 'ASSET'));
  registerGraphNode(makeNode('asset_btc', 'CANONICAL', 'ASSET'));

  registerGraphNode(makeNode('sector_defi', 'GRAPH_NATIVE', 'SECTOR_CLUSTER'));
  registerGraphNode(makeNode('nar_ai', 'GRAPH_NATIVE', 'NARRATIVE_NODE'));
  registerGraphNode(makeNode('nar_rwa', 'GRAPH_NATIVE', 'NARRATIVE_NODE'));
  registerGraphNode(makeNode('comp_sushi', 'GRAPH_NATIVE', 'COMPETITOR_NODE'));
  registerGraphNode(makeNode('sub_pancake', 'GRAPH_NATIVE', 'COMPETITOR_NODE'));
  registerGraphNode(makeNode('nar_overlap_1inch', 'GRAPH_NATIVE', 'COMPETITOR_NODE'));

  registerLiveGraphEdge(makeEdge('e_proto_eth', 'ASSET_BELONGS_TO_PROTOCOL', 'asset_eth', 'proto_uniswap', 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
  registerLiveGraphEdge(makeEdge('e_chain_eth', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_uniswap', 'chain_eth', 'PROTOCOL', 'CHAIN', 'STRUCTURAL'));
  registerLiveGraphEdge(makeEdge('e_chain_base', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_uniswap', 'chain_base', 'PROTOCOL', 'CHAIN', 'STRUCTURAL'));

  registerLiveGraphEdge(makeEdge('e_nar_ai', 'OBJECT_MENTIONED_IN_NARRATIVE', 'asset_eth', 'nar_ai', 'ASSET', 'NARRATIVE_NODE', 'NARRATIVE'));
  registerLiveGraphEdge(makeEdge('e_nar_rwa', 'OBJECT_MENTIONED_IN_NARRATIVE', 'asset_eth', 'nar_rwa', 'ASSET', 'NARRATIVE_NODE', 'NARRATIVE', { confidenceBand: 'LOW', temporalStatus: 'STALE' }));

  registerLiveGraphEdge(makeEdge('e_comp_sushi', 'COMPETES_WITH', 'asset_eth', 'comp_sushi', 'ASSET', 'COMPETITOR_NODE', 'COMPETITIVE'));
  registerLiveGraphEdge(makeEdge('e_sub_pancake', 'SUBSTITUTES_FOR', 'asset_eth', 'sub_pancake', 'ASSET', 'COMPETITOR_NODE', 'COMPETITIVE'));

  registerLiveGraphEdge(makeEdge('e_nar_overlap', 'NARRATIVE_OVERLAP_COMPETITOR', 'asset_eth', 'nar_overlap_1inch', 'ASSET', 'COMPETITOR_NODE', 'NARRATIVE'));
  registerLiveGraphEdge(makeEdge('e_nar_shared', 'OBJECT_MENTIONED_IN_NARRATIVE', 'nar_overlap_1inch', 'nar_ai', 'COMPETITOR_NODE', 'NARRATIVE_NODE', 'NARRATIVE'));

  registerLiveGraphEdge(makeEdge('e_sector_eth', 'ASSET_BELONGS_TO_SECTOR', 'asset_eth', 'sector_defi', 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER'));
  registerLiveGraphEdge(makeEdge('e_sector_sol', 'ASSET_BELONGS_TO_SECTOR', 'asset_sol', 'sector_defi', 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER'));

  registerLiveGraphEdge(makeEdge('e_hist_aave', 'ASSET_BELONGS_TO_PROTOCOL', 'asset_eth', 'proto_aave', 'ASSET', 'PROTOCOL', 'STRUCTURAL', {
    temporalStatus: 'HISTORICAL', validFrom: '2025-01-01T00:00:00Z', validTo: '2025-12-31T23:59:59Z',
  }));

  registerLiveGraphEdge(makeEdge('e_nar_contested', 'OBJECT_MENTIONED_IN_NARRATIVE', 'proto_uniswap', 'nar_rwa', 'PROTOCOL', 'NARRATIVE_NODE', 'NARRATIVE', { temporalStatus: 'CONTESTED', confidenceBand: 'MEDIUM' }));

  registerLiveGraphEdge(makeEdge('e_deny_btc', 'ASSET_BELONGS_TO_PROTOCOL', 'asset_btc', 'proto_aave', 'ASSET', 'PROTOCOL', 'STRUCTURAL', {
    rights: { ...ALLOW_ALL, contextEnrichment: 'DENY' },
  }));
}

function firePropagation(): void {
  bootstrapPropagationRules();
  const rule = getPropagationRule('RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS');
  if (!rule) return;
  const trigger: PropagationTrigger = {
    triggerId: 'trig_pkg_test', triggerType: 'METRIC_THRESHOLD_CROSSED',
    sourceNodeIds: ['chain_eth'], sourceEdgeIds: ['e_chain_eth'],
    supportingMetricObservationRefs: ['mobs_001'], supportingEventNodeIds: [],
    createdAt: '2026-03-01T00:00:00Z', metadata: {},
  };
  const sourceEdge: SourceEdgeContext = {
    edgeId: 'e_chain_eth', edgeType: 'PROTOCOL_OPERATES_ON_CHAIN',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
    subjectNodeId: 'chain_eth', objectNodeId: 'proto_uniswap',
    subjectNodeType: 'CHAIN', objectNodeType: 'PROTOCOL',
  };
  const graphEdges: GraphEdgeForTraversal[] = [{
    edgeId: 'e_chain_eth', edgeType: 'PROTOCOL_OPERATES_ON_CHAIN',
    subjectNodeId: 'chain_eth', objectNodeId: 'proto_uniswap',
    subjectNodeType: 'CHAIN', objectNodeType: 'PROTOCOL',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
  }];
  evaluatePropagationTrigger({ rule, trigger, sourceNodeId: 'chain_eth', sourceEdge, graphEdges, sourceStrength: 80 });
}

function mockQueryResult(
  queryType: string, subjectNodeIds: string[], resultNodeIds: string[],
  traversedEdgeIds: string[], overrides: Partial<GraphQueryResult> = {},
): GraphQueryResult {
  return {
    queryId: `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    queryType: queryType as any,
    subjectNodeIds,
    resultNodeIds,
    traversedEdgeIds,
    confidenceSummary: { high: resultNodeIds.length, medium: 0, low: 0, unresolved: 0 },
    temporalSummary: { activeEdges: resultNodeIds.length, staleEdges: 0, provisionalEdges: 0, contestedEdges: 0, expiredEdges: 0 },
    blockedSections: [],
    evidenceRefs: traversedEdgeIds.map(e => `ev_${e}`),
    explanationNotes: [],
    replayGenerationRef: undefined,
    queryWindow: undefined,
    prunedEdgeIds: [],
    prunedNodeIds: [],
    blockedReasonCodes: [],
      pathSummaries: resultNodeIds.map(n => ({
      targetNodeId: n, pathLength: 1, strongestEdgeBand: 'HIGH' as any,
      weakestEdgeBand: 'HIGH' as any, containsStaleEdge: false, containsContestedEdge: false,
    })),
    schemaVersion: 'v1',
    ...overrides,
  };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SUITE 1 — Token Context Package Complete Assembly (30 assertions)           ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function suite1(): void {
  console.log('\n=== Suite 1 — Token Context Package Complete Assembly ===');
  resetAll(); buildTestGraph(); firePropagation();

  const pkg = buildTokenContextPackage('asset_eth');

  assert(pkg !== undefined, '1.01 package created');
  assert(!!pkg.protocolContext, '1.02 protocolContext section present');
  assert(!!pkg.chainContext, '1.03 chainContext section present');
  assert(!!pkg.sectorContext, '1.04 sectorContext section present');
  assert(!!pkg.competitorContext, '1.05 competitorContext section present');
  assert(!!pkg.narrativeContext, '1.06 narrativeContext section present');

  const sections: Array<[string, GraphContextPackage['protocolContext']]> = [
    ['protocolContext', pkg.protocolContext],
    ['chainContext', pkg.chainContext],
    ['sectorContext', pkg.sectorContext],
    ['competitorContext', pkg.competitorContext],
    ['narrativeContext', pkg.narrativeContext],
  ];
  let idx = 7;
  for (const [name, sec] of sections) {
    assert(Array.isArray(sec.nodeIds), `1.${String(idx).padStart(2, '0')} ${name}.nodeIds is array`); idx++;
    assert(Array.isArray(sec.edgeIds), `1.${String(idx).padStart(2, '0')} ${name}.edgeIds is array`); idx++;
    assert(Array.isArray(sec.summary), `1.${String(idx).padStart(2, '0')} ${name}.summary is array`); idx++;
    assert(Array.isArray(sec.blockedSections), `1.${String(idx).padStart(2, '0')} ${name}.blockedSections is array`); idx++;
  }

  assert(typeof pkg.packageId === 'string' && pkg.packageId.length > 0, '1.27 packageId present');
  assert(pkg.subjectObjectId === 'asset_eth', '1.28 subjectObjectId correct');
  assert(typeof pkg.generatedAt === 'string', '1.29 generatedAt present');
  assert(pkg.schemaVersion === 'v1' && pkg.packageVersion === 'v1', '1.30 schemaVersion and packageVersion are v1');
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SUITE 2 — Protocol Context and Chain Context Correctness (30 assertions)   ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function suite2(): void {
  console.log('\n=== Suite 2 — Protocol Context and Chain Context Correctness ===');
  resetAll(); buildTestGraph(); firePropagation();

  const pkg = buildTokenContextPackage('asset_eth');

  assert(pkg.protocolContext.summary.length > 0, '2.01 protocolContext.summary non-empty');
  assert(Array.isArray(pkg.protocolContext.nodeIds), '2.02 protocolContext.nodeIds is array');
  assert(Array.isArray(pkg.protocolContext.edgeIds), '2.03 protocolContext.edgeIds is array');
  assert(Array.isArray(pkg.protocolContext.blockedSections), '2.04 protocolContext.blockedSections is array');

  assert(pkg.chainContext.summary.length > 0, '2.05 chainContext.summary non-empty');
  assert(Array.isArray(pkg.chainContext.nodeIds), '2.06 chainContext.nodeIds is array');
  assert(Array.isArray(pkg.chainContext.edgeIds), '2.07 chainContext.edgeIds is array');
  assert(Array.isArray(pkg.chainContext.blockedSections), '2.08 chainContext.blockedSections is array');

  const protoQ = getProtocolContextForAsset('asset_eth');
  assert(protoQ.queryType === 'PROTOCOL_CONTEXT_FOR_ASSET', '2.09 protocol query type correct');
  assert(typeof protoQ.queryId === 'string', '2.10 protocol query has queryId');
  assert(protoQ.traversedEdgeIds.length > 0, '2.11 protocol query traverses edges');
  assert(protoQ.traversedEdgeIds.includes('e_proto_eth'), '2.12 traversal includes structural edge e_proto_eth');

  const chainQ = getChainContextForProtocol('proto_uniswap');
  assert(chainQ.queryType === 'CHAIN_CONTEXT_FOR_PROTOCOL', '2.13 chain query type correct');
  assert(typeof chainQ.queryId === 'string', '2.14 chain query has queryId');
  assert(chainQ.traversedEdgeIds.length > 0, '2.15 chain query traverses edges');
  assert(chainQ.traversedEdgeIds.includes('e_chain_eth'), '2.16 traversal includes chain edge e_chain_eth');
  assert(chainQ.traversedEdgeIds.includes('e_chain_base'), '2.17 traversal includes chain edge e_chain_base');

  const mockProtoQ = mockQueryResult('PROTOCOL_CONTEXT_FOR_ASSET', ['asset_eth'],
    ['proto_uniswap'], ['e_proto_eth']);
  const directProtoSection = summarizeProtocolContext(mockProtoQ, 'asset_eth');
  assert(directProtoSection.nodeIds.includes('proto_uniswap'), '2.18 direct summarize includes proto_uniswap');
  assert(directProtoSection.summary.some(s => s.includes('Parent protocol')),
    '2.19 direct summarize mentions "Parent protocol"');
  assert(directProtoSection.summary.some(s => s.includes('proto_uniswap')),
    '2.20 direct summarize mentions proto_uniswap');
  assert(directProtoSection.edgeIds.length > 0, '2.21 direct summarize has edgeIds');

  const mockChainQ = mockQueryResult('CHAIN_CONTEXT_FOR_PROTOCOL', ['proto_uniswap'],
    ['chain_eth', 'chain_base'], ['e_chain_eth', 'e_chain_base']);
  const directChainSection = summarizeChainContext(mockChainQ, 'proto_uniswap');
  assert(directChainSection.nodeIds.includes('chain_eth'), '2.22 direct chain summarize includes chain_eth');
  assert(directChainSection.nodeIds.includes('chain_base'), '2.23 direct chain summarize includes chain_base');
  assert(directChainSection.summary.some(s => s.toLowerCase().includes('multi-chain')),
    '2.24 chain summary says multi-chain');

  const emptyProtoSection = summarizeProtocolContext(undefined, 'orphan');
  assert(emptyProtoSection.nodeIds.length === 0, '2.25 empty query → empty nodeIds');
  assert(emptyProtoSection.summary.length > 0, '2.26 empty query → fallback summary present');

  const emptyChainSection = summarizeChainContext(undefined, undefined);
  assert(emptyChainSection.nodeIds.length === 0, '2.27 empty chain query → empty nodeIds');
  assert(emptyChainSection.summary.some(s => s.toLowerCase().includes('no chain')),
    '2.28 empty chain summary indicates no context');

  const staleChainQ = mockQueryResult('CHAIN_CONTEXT_FOR_PROTOCOL', ['proto_aave'],
    ['chain_base'], ['e_chain_stale'], {
      pathSummaries: [{ targetNodeId: 'chain_base', pathLength: 1, strongestEdgeBand: 'MEDIUM' as any,
        weakestEdgeBand: 'MEDIUM' as any, containsStaleEdge: true, containsContestedEdge: false }],
    });
  const staleChainSection = summarizeChainContext(staleChainQ, 'proto_aave');
  assert(staleChainSection.summary.some(s => s.toLowerCase().includes('stale')),
    '2.29 stale chain edge surfaces as caveat');

  const singleChainQ = mockQueryResult('CHAIN_CONTEXT_FOR_PROTOCOL', ['proto_x'],
    ['chain_only'], ['e_only']);
  const singleSection = summarizeChainContext(singleChainQ, 'proto_x');
  assert(singleSection.summary.some(s => s.toLowerCase().includes('single-chain')),
    '2.30 single chain dependency labeled');
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SUITE 3 — Sector and Competitor Context Correctness (30 assertions)        ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function suite3(): void {
  console.log('\n=== Suite 3 — Sector and Competitor Context Correctness ===');
  resetAll(); buildTestGraph(); firePropagation();

  const pkg = buildTokenContextPackage('asset_eth');

  assert(pkg.sectorContext.summary.length > 0, '3.01 sectorContext.summary non-empty');
  assert(Array.isArray(pkg.sectorContext.nodeIds), '3.02 sectorContext.nodeIds is array');
  assert(Array.isArray(pkg.sectorContext.edgeIds), '3.03 sectorContext.edgeIds is array');
  assert(pkg.competitorContext.summary.length > 0, '3.04 competitorContext.summary non-empty');
  assert(Array.isArray(pkg.competitorContext.nodeIds), '3.05 competitorContext.nodeIds is array');
  assert(Array.isArray(pkg.competitorContext.edgeIds), '3.06 competitorContext.edgeIds is array');

  const sectorQ = getSectorCluster('asset_eth');
  assert(sectorQ.queryType === 'SECTOR_CLUSTER', '3.07 sector query type correct');
  assert(sectorQ.traversedEdgeIds.length > 0, '3.08 sector query traverses edges');

  const compQ = getCompetitorSet('asset_eth');
  assert(compQ.queryType === 'COMPETITOR_SET', '3.09 competitor query type correct');
  assert(compQ.traversedEdgeIds.length > 0, '3.10 competitor query traverses edges');
  assert(compQ.traversedEdgeIds.includes('e_comp_sushi'), '3.11 traversal includes competitor edge');

  const subsQ = getClosestSubstitutes('asset_eth');
  assert(subsQ.queryType === 'CLOSEST_SUBSTITUTES', '3.12 substitutes query type correct');
  assert(subsQ.traversedEdgeIds.includes('e_sub_pancake'), '3.13 traversal includes substitute edge');

  const narOverlapQ = getNarrativeOverlapCompetitors('asset_eth');
  assert(narOverlapQ.queryType === 'NARRATIVE_OVERLAP_COMPETITORS', '3.14 narrative overlap query type correct');

  const peerQ = getPeerSetBySector('asset_eth');
  assert(peerQ.queryType === 'PEER_SET_BY_SECTOR', '3.15 peer set query type correct');
  assert(typeof peerQ.queryId === 'string', '3.16 peer set query has queryId');

  const mockCompQ = mockQueryResult('COMPETITOR_SET', ['asset_eth'],
    ['comp_sushi', 'sub_pancake'], ['e_comp_sushi', 'e_sub_pancake']);
  const mockSubsQ = mockQueryResult('CLOSEST_SUBSTITUTES', ['asset_eth'],
    ['comp_sushi', 'sub_pancake', 'proto_uniswap'], ['e_comp_sushi', 'e_sub_pancake', 'e_proto_eth']);
  const mockNarOverlapQ = mockQueryResult('NARRATIVE_OVERLAP_COMPETITORS', ['asset_eth'],
    ['nar_overlap_1inch'], ['e_nar_overlap']);

  const directCompSection = summarizeCompetitorContext(mockCompQ, mockSubsQ, mockNarOverlapQ);
  assert(directCompSection.nodeIds.includes('comp_sushi'), '3.17 direct summarize includes comp_sushi');
  assert(directCompSection.nodeIds.includes('sub_pancake'), '3.18 direct summarize includes sub_pancake');
  assert(directCompSection.summary.some(s => s.toLowerCase().includes('direct competitor')),
    '3.19 direct summarize labels direct competitors');
  assert(directCompSection.summary.some(s => s.toLowerCase().includes('substitute')),
    '3.20 direct summarize labels substitutes');
  assert(directCompSection.summary.some(s => s.toLowerCase().includes('narrative-overlap')),
    '3.21 direct summarize labels narrative-overlap competitors');
  assert(directCompSection.nodeIds.includes('nar_overlap_1inch'),
    '3.22 narrative-overlap competitor in nodeIds');

  const cappedSection = summarizeCompetitorContext(mockCompQ, mockSubsQ, mockNarOverlapQ, 1);
  assert(cappedSection.summary.length > 0, '3.23 capped competitor summary present');

  const emptyCompSection = summarizeCompetitorContext(undefined, undefined, undefined);
  assert(emptyCompSection.summary.some(s => s.toLowerCase().includes('no competitor')),
    '3.24 empty competitor query → fallback summary');

  const mockSectorQ = mockQueryResult('SECTOR_CLUSTER', ['asset_eth'],
    ['sector_defi'], ['e_sector_eth']);
  const mockPeerQ = mockQueryResult('PEER_SET_BY_SECTOR', ['asset_eth'],
    ['asset_sol', 'asset_btc'], ['e_sector_sol']);
  const directSectorSection = summarizeSectorContext(mockSectorQ, mockPeerQ);
  assert(directSectorSection.nodeIds.includes('sector_defi'), '3.25 direct sector includes sector_defi');
  assert(directSectorSection.summary.some(s => s.toLowerCase().includes('sector')),
    '3.26 direct sector summary mentions sector');
  assert(directSectorSection.summary.some(s => s.toLowerCase().includes('peer')),
    '3.27 direct sector summary mentions peers');

  const emptySectorSection = summarizeSectorContext(undefined, undefined);
  assert(emptySectorSection.summary.some(s => s.toLowerCase().includes('no sector')),
    '3.28 empty sector query → fallback summary');

  assert(Array.isArray(pkg.sectorContext.blockedSections), '3.29 sectorContext.blockedSections is array');
  assert(Array.isArray(pkg.competitorContext.blockedSections), '3.30 competitorContext.blockedSections is array');
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SUITE 4 — Narrative Context and Propagation Notes (30 assertions)          ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function suite4(): void {
  console.log('\n=== Suite 4 — Narrative Context and Propagation Notes ===');
  resetAll(); buildTestGraph(); firePropagation();

  const pkg = buildTokenContextPackage('asset_eth');

  assert(pkg.narrativeContext.summary.length > 0, '4.01 narrativeContext.summary non-empty');
  assert(Array.isArray(pkg.narrativeContext.nodeIds), '4.02 narrativeContext.nodeIds is array');
  assert(Array.isArray(pkg.narrativeContext.edgeIds), '4.03 narrativeContext.edgeIds is array');
  assert(Array.isArray(pkg.narrativeContext.blockedSections), '4.04 narrativeContext.blockedSections is array');

  const narQ = getNarrativeContextForObject('asset_eth');
  assert(narQ.queryType === 'NARRATIVE_CONTEXT_FOR_OBJECT', '4.05 narrative query type correct');
  assert(narQ.traversedEdgeIds.length > 0, '4.06 narrative query traverses edges');
  assert(narQ.traversedEdgeIds.includes('e_nar_ai'), '4.07 traversal includes active narrative edge');

  const mockNarQ = mockQueryResult('NARRATIVE_CONTEXT_FOR_OBJECT', ['asset_eth'],
    ['nar_ai', 'nar_rwa'], ['e_nar_ai', 'e_nar_rwa'], {
      pathSummaries: [
        { targetNodeId: 'nar_ai', pathLength: 1, strongestEdgeBand: 'HIGH' as any,
          weakestEdgeBand: 'HIGH' as any, containsStaleEdge: false, containsContestedEdge: false },
        { targetNodeId: 'nar_rwa', pathLength: 1, strongestEdgeBand: 'LOW' as any,
          weakestEdgeBand: 'LOW' as any, containsStaleEdge: true, containsContestedEdge: false },
      ],
    });
  const directNarSection = summarizeNarrativeContext(mockNarQ, []);
  assert(directNarSection.nodeIds.includes('nar_ai'), '4.08 direct summarize includes nar_ai');
  assert(directNarSection.summary.some(s => s.toLowerCase().includes('active narrative')),
    '4.09 direct summary mentions active narratives');
  assert(directNarSection.summary.some(s =>
    s.toLowerCase().includes('stale') || s.toLowerCase().includes('decaying')),
    '4.10 stale narrative caveat surfaces');
  assert(directNarSection.summary.some(s => s.toLowerCase().includes('low-confidence')),
    '4.11 low-confidence narrative caveat surfaces');

  const protoPkg = buildProtocolContextPackage('proto_uniswap');
  assert(protoPkg.propagationNotes.length > 0, '4.12 protocol package has propagation notes');
  assert(protoPkg.propagationNotes.some(n => n.includes('not deterministic truth')),
    '4.13 propagation notes contain bounded language');
  assert(protoPkg.propagationEventRefs.length > 0, '4.14 propagation event refs populated');

  assert(Array.isArray(protoPkg.explanationFootnotes), '4.15 explanationFootnotes is array');
  assert(protoPkg.explanationFootnotes.some(n => n.toLowerCase().includes('propagation')),
    '4.16 explanation footnotes mention propagation');

  assert(protoPkg.propagationNotes.some(n =>
    n.includes('context_enrichment') || n.includes('scenario_support') || n.includes('explanation') || n.includes('allowed for')),
    '4.17 propagation notes include allowed use domains');
  assert(protoPkg.confidenceSummary.spilloverConfidence !== undefined,
    '4.18 protocol spillover confidence present');

  const noPropPkg = buildGraphContextPackage('proto_uniswap', { includePropagationNotes: false });
  assert(noPropPkg.propagationNotes.length === 0, '4.19 includePropagationNotes=false suppresses notes');
  assert(noPropPkg.propagationEventRefs.length === 0, '4.20 no event refs when propagation disabled');

  assert(protoPkg.propagationNotes.every(n => typeof n === 'string' && n.length > 0),
    '4.21 all propagation notes are non-empty strings');

  const protoEvents = getPropagationEventsForNode('proto_uniswap');
  assert(protoEvents.length > 0, '4.22 proto_uniswap has propagation events');

  assert(protoPkg.propagationNotes.some(n =>
    n.toLowerCase().includes('dependency impact') || n.toLowerCase().includes('impact')),
    '4.23 propagation notes reference dependency impact');
  assert(protoPkg.propagationNotes.some(n => n.includes('chain_eth')),
    '4.24 propagation notes reference source node');

  const cappedNarPkg = buildTokenContextPackage('asset_eth', { maxNarratives: 1 });
  assert(cappedNarPkg.narrativeContext.summary.length > 0,
    '4.25 maxNarratives option produces summary');

  const narWithProp = summarizeNarrativeContext(mockNarQ, ['narrative transmission from chain_eth; not deterministic truth']);
  assert(narWithProp.summary.some(s =>
    s.toLowerCase().includes('narrative spillover') || s.toLowerCase().includes('propagation')),
    '4.26 narrative context integrates propagation notes');

  const noNarNode = summarizeNarrativeContext(undefined, []);
  assert(noNarNode.summary.some(s => s.toLowerCase().includes('no active')),
    '4.27 empty narrative query → fallback summary');

  assert(typeof protoPkg.confidenceSummary.structuralConfidence === 'string',
    '4.28 structural confidence present on protocol package');
  assert(protoPkg.subjectObjectType === 'PROTOCOL', '4.29 protocol package subjectObjectType is PROTOCOL');
  assert(protoPkg.schemaVersion === 'v1', '4.30 protocol package schemaVersion v1');
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SUITE 5 — Historical Package vs Live Package (25 assertions)               ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function suite5(): void {
  console.log('\n=== Suite 5 — Historical Package vs Live Package ===');
  resetAll(); buildTestGraph(); firePropagation();

  const livePkg = buildTokenContextPackage('asset_eth');
  const histPkg = buildHistoricalGraphContextPackage('asset_eth', '2025-06-15T00:00:00Z');

  assert(livePkg.historical === false, '5.01 live package historical is false');
  assert(histPkg.historical === true, '5.02 historical package historical is true');
  assert(histPkg.asOfTime === '2025-06-15T00:00:00Z', '5.03 historical asOfTime set');
  assert(livePkg.asOfTime === undefined, '5.04 live package asOfTime undefined');

  const histQ = executeGraphQueryAtTime('PROTOCOL_CONTEXT_FOR_ASSET', ['asset_eth'], '2025-06-15T00:00:00Z');
  assert(histQ.traversedEdgeIds.includes('e_hist_aave'),
    '5.05 historical query traverses e_hist_aave at 2025-06');

  const liveQ = getProtocolContextForAsset('asset_eth');
  assert(!liveQ.traversedEdgeIds.includes('e_hist_aave'),
    '5.06 live query does not traverse historical edge');

  assert(livePkg.packageId !== histPkg.packageId, '5.07 packages have different packageIds');
  assert(typeof histPkg.packageId === 'string', '5.08 historical package has packageId');
  assert(typeof histPkg.generatedAt === 'string', '5.09 historical package has generatedAt');
  assert(histPkg.schemaVersion === 'v1', '5.10 historical package schema v1');

  const replayPkg = buildHistoricalGraphContextPackage('asset_eth', '2025-06-15T00:00:00Z', {
    replayGenerationRef: 'gen_replay_42',
  });
  assert(replayPkg.replayGenerationRef === 'gen_replay_42', '5.11 replayGenerationRef preserved');
  assert(replayPkg.historical === true, '5.12 replay package is historical');

  assert(!!histPkg.protocolContext, '5.13 historical has protocolContext');
  assert(!!histPkg.chainContext, '5.14 historical has chainContext');
  assert(!!histPkg.sectorContext, '5.15 historical has sectorContext');
  assert(!!histPkg.competitorContext, '5.16 historical has competitorContext');
  assert(!!histPkg.narrativeContext, '5.17 historical has narrativeContext');

  assert(histPkg.queryRefs.length > 0 || histPkg.protocolContext.summary.length > 0,
    '5.18 historical package executed queries');
  assert(histPkg.blockedReasonCodes !== undefined, '5.19 historical has blockedReasonCodes');
  assert(histPkg.pathQualitySummary !== undefined, '5.20 historical has pathQualitySummary');

  assert(livePkg.subjectObjectId === histPkg.subjectObjectId,
    '5.21 live and historical reference same subject');
  assert(livePkg.subjectObjectType === histPkg.subjectObjectType,
    '5.22 live and historical share subject type');

  assert(histPkg.packageVersion === 'v1', '5.23 historical packageVersion v1');
  assert(typeof histPkg.evidenceRefs !== 'undefined', '5.24 historical has evidenceRefs');

  const afterExpiry = executeGraphQueryAtTime('PROTOCOL_CONTEXT_FOR_ASSET', ['asset_eth'], '2026-06-15T00:00:00Z');
  assert(!afterExpiry.traversedEdgeIds.includes('e_hist_aave'),
    '5.25 historical edge not traversed after validTo');
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SUITE 6 — Anti-Dump and Summary Quality (30 assertions)                    ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function suite6(): void {
  console.log('\n=== Suite 6 — Anti-Dump and Summary Quality ===');
  resetAll(); buildTestGraph(); firePropagation();

  const pkg = buildTokenContextPackage('asset_eth');
  const protoPkg = buildProtocolContextPackage('proto_uniswap');

  assert(pkg.protocolContext.summary.length > 0, '6.01 protocolContext summary non-empty');
  assert(pkg.chainContext.summary.length > 0, '6.02 chainContext summary non-empty');
  assert(pkg.sectorContext.summary.length > 0, '6.03 sectorContext summary non-empty');
  assert(pkg.competitorContext.summary.length > 0, '6.04 competitorContext summary non-empty');
  assert(pkg.narrativeContext.summary.length > 0, '6.05 narrativeContext summary non-empty');

  const mockProtoQ = mockQueryResult('PROTOCOL_CONTEXT_FOR_ASSET', ['asset_eth'],
    ['proto_uniswap'], ['e_proto_eth']);
  const readableProto = summarizeProtocolContext(mockProtoQ, 'asset_eth');
  assert(readableProto.summary.some(s =>
    s.includes('proto_uniswap') || s.toLowerCase().includes('protocol') || s.toLowerCase().includes('structural')),
    '6.06 protocol summary is human-readable');

  const mockSectorQ = mockQueryResult('SECTOR_CLUSTER', ['asset_eth'], ['sector_defi'], ['e_sector_eth']);
  const sectorSection = summarizeSectorContext(mockSectorQ, undefined);
  assert(!sectorSection.summary.some(s =>
    s.toLowerCase().includes('canonical') || s.toLowerCase().includes('ontology truth')),
    '6.07 sector context does not claim ontology truth');

  const mockNarQ = mockQueryResult('NARRATIVE_CONTEXT_FOR_OBJECT', ['asset_eth'],
    ['nar_ai'], ['e_nar_ai']);
  const narSection = summarizeNarrativeContext(mockNarQ, []);
  assert(!narSection.summary.some(s =>
    s.toLowerCase().includes('confirmed event') || s.toLowerCase().includes('definitive')),
    '6.08 narrative context does not claim confirmed event status');

  assert(protoPkg.propagationNotes.every(n => n.includes('not deterministic truth')),
    '6.09 every propagation note is bounded');

  const mockCompQ = mockQueryResult('COMPETITOR_SET', ['asset_eth'],
    ['comp_sushi'], ['e_comp_sushi']);
  const mockSubsQ = mockQueryResult('CLOSEST_SUBSTITUTES', ['asset_eth'],
    ['sub_pancake'], ['e_sub_pancake']);
  const mockNarOvQ = mockQueryResult('NARRATIVE_OVERLAP_COMPETITORS', ['asset_eth'],
    ['nar_overlap_1inch'], ['e_nar_overlap']);
  const compSection = summarizeCompetitorContext(mockCompQ, mockSubsQ, mockNarOvQ);
  const compText = compSection.summary.join(' ').toLowerCase();
  assert(compText.includes('direct') || compText.includes('substitute') || compText.includes('narrative-overlap'),
    '6.10 competitor basis types separated in summary');

  const protoSummary = readableProto.summary.join(' ');
  const narSummaryText = narSection.summary.join(' ');
  assert(protoSummary !== narSummaryText,
    '6.11 structural and narrative contexts produce distinct summaries');

  assert(Array.isArray(pkg.protocolContext.blockedSections), '6.12 protocolContext blockedSections preserved');
  assert(Array.isArray(pkg.chainContext.blockedSections), '6.13 chainContext blockedSections preserved');
  assert(Array.isArray(pkg.sectorContext.blockedSections), '6.14 sectorContext blockedSections preserved');
  assert(Array.isArray(pkg.competitorContext.blockedSections), '6.15 competitorContext blockedSections preserved');
  assert(Array.isArray(pkg.narrativeContext.blockedSections), '6.16 narrativeContext blockedSections preserved');

  const mockEvidenceQ = mockQueryResult('PROTOCOL_CONTEXT_FOR_ASSET', ['asset_eth'],
    ['proto_uniswap'], ['e_proto_eth']);
  assert(mockEvidenceQ.evidenceRefs.length > 0, '6.17 mock evidence refs are traceable');
  assert(readableProto.edgeIds.length > 0, '6.18 summarized section carries edgeIds');

  assert(pkg.subjectObjectType === 'ASSET', '6.19 subject object type matches L3 origin');
  assert(protoPkg.subjectObjectType === 'PROTOCOL', '6.20 protocol subject type matches L3 origin');

  assert(pkg.queryRefs.length > 0, '6.21 queryRefs populated');
  assert(typeof pkg.confidenceSummary.structuralConfidence === 'string', '6.22 structuralConfidence present');
  assert(typeof pkg.confidenceSummary.narrativeConfidence === 'string', '6.23 narrativeConfidence present');
  assert(typeof pkg.confidenceSummary.spilloverConfidence === 'string', '6.24 spilloverConfidence present');

  assert(typeof pkg.pathQualitySummary.strongPaths === 'number', '6.25 strongPaths is number');
  assert(typeof pkg.pathQualitySummary.conditionalPaths === 'number', '6.26 conditionalPaths is number');
  assert(typeof pkg.pathQualitySummary.stalePaths === 'number', '6.27 stalePaths is number');
  assert(typeof pkg.pathQualitySummary.contestedPaths === 'number', '6.28 contestedPaths is number');

  assert(Array.isArray(pkg.staleOrContestedAreas), '6.29 staleOrContestedAreas is array');
  assert(Array.isArray(pkg.blockedReasonCodes), '6.30 blockedReasonCodes is array');
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SUITE 7 — Package Options and Edge Cases (25 assertions)                   ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function suite7(): void {
  console.log('\n=== Suite 7 — Package Options and Edge Cases ===');
  resetAll(); buildTestGraph(); firePropagation();

  let crashed = false;
  try {
    buildTokenContextPackage('asset_eth', { summaryVerbosity: 'COMPACT' });
    buildTokenContextPackage('asset_eth', { summaryVerbosity: 'STANDARD' });
    buildTokenContextPackage('asset_eth', { summaryVerbosity: 'DETAILED' });
  } catch { crashed = true; }
  assert(!crashed, '7.01 summaryVerbosity options do not crash');

  const stalePkg = buildTokenContextPackage('asset_eth', { includeStale: true });
  assert(!!stalePkg, '7.02 includeStale=true builds successfully');
  assert(stalePkg.narrativeContext.summary.length > 0, '7.03 stale package has narrative summary');

  const condPkg = buildTokenContextPackage('asset_eth', { includeConditional: true });
  assert(!!condPkg, '7.04 includeConditional=true builds successfully');
  assert(condPkg.protocolContext.summary.length > 0, '7.05 conditional package has protocol summary');

  const depPkg = buildTokenContextPackage('asset_eth', { maxProtocolDependencies: 1 });
  assert(!!depPkg, '7.06 maxProtocolDependencies option does not crash');
  assert(depPkg.protocolContext.summary.length > 0, '7.07 maxProtocolDependencies result valid');

  resetAll(); bootstrapRelationOntology();
  registerGraphNode(makeNode('isolated_token', 'CANONICAL', 'ASSET'));
  const isoPkg = buildTokenContextPackage('isolated_token');
  assert(!!isoPkg.protocolContext, '7.08 isolated node has protocolContext');
  assert(!!isoPkg.chainContext, '7.09 isolated node has chainContext');
  assert(!!isoPkg.sectorContext, '7.10 isolated node has sectorContext');
  assert(!!isoPkg.competitorContext, '7.11 isolated node has competitorContext');
  assert(!!isoPkg.narrativeContext, '7.12 isolated node has narrativeContext');
  assert(isoPkg.subjectObjectId === 'isolated_token', '7.13 isolated package has correct subject');

  resetAll(); buildTestGraph(); firePropagation();
  const pPkg = buildProtocolContextPackage('proto_uniswap');
  assert(pPkg.subjectObjectType === 'PROTOCOL', '7.14 protocol package subjectObjectType is PROTOCOL');
  assert(!!pPkg.protocolContext && !!pPkg.chainContext && !!pPkg.sectorContext
    && !!pPkg.competitorContext && !!pPkg.narrativeContext,
    '7.15 protocol package has all 5 sections');

  const gPkg = buildGraphContextPackage('asset_eth');
  assert(!!gPkg.protocolContext && !!gPkg.chainContext && !!gPkg.sectorContext
    && !!gPkg.competitorContext && !!gPkg.narrativeContext,
    '7.16 generic buildGraphContextPackage has all 5 sections');
  assert(gPkg.subjectObjectId === 'asset_eth', '7.17 generic package subjectObjectId correct');

  const btcQ = getProtocolContextForAsset('asset_btc');
  assert(btcQ.blockedSections.length > 0 || btcQ.blockedReasonCodes.length > 0
    || btcQ.prunedEdgeIds.length > 0,
    '7.18 DENY-blocked edge detected in query');

  resetAll(); bootstrapRelationOntology();
  registerGraphNode(makeNode('deny_all_node', 'CANONICAL', 'ASSET'));
  registerGraphNode(makeNode('deny_target_a', 'CANONICAL', 'PROTOCOL'));
  registerGraphNode(makeNode('deny_target_b', 'CANONICAL', 'PROTOCOL'));
  registerLiveGraphEdge(makeEdge('e_deny_a', 'ASSET_BELONGS_TO_PROTOCOL', 'deny_all_node', 'deny_target_a', 'ASSET', 'PROTOCOL', 'STRUCTURAL', {
    rights: { ...ALLOW_ALL, contextEnrichment: 'DENY' },
  }));
  registerLiveGraphEdge(makeEdge('e_deny_b', 'ASSET_BELONGS_TO_PROTOCOL', 'deny_all_node', 'deny_target_b', 'ASSET', 'PROTOCOL', 'STRUCTURAL', {
    rights: { ...ALLOW_ALL, contextEnrichment: 'DENY' },
  }));
  const denyQ = getProtocolContextForAsset('deny_all_node');
  assert(denyQ.blockedSections.length > 0 || denyQ.prunedEdgeIds.length > 0,
    '7.19 all-DENY edges produce blocked/pruned entries');
  assert(denyQ.blockedReasonCodes.includes('DENIED') || denyQ.prunedEdgeIds.includes('e_deny_a'),
    '7.20 DENY edges prune and report reason');

  resetAll(); buildTestGraph(); firePropagation();
  const atTimeResult = executeGraphQueryAtTime('PROTOCOL_CONTEXT_FOR_ASSET', ['asset_eth'], '2025-06-15T00:00:00Z');
  assert(typeof atTimeResult.queryId === 'string', '7.21 executeGraphQueryAtTime returns valid result');
  assert(atTimeResult.queryWindow !== undefined, '7.22 queryWindow present on time-bound query');
  assert(atTimeResult.queryWindow?.historical === true, '7.23 queryWindow.historical is true');

  const directQ = executeGraphQuery('SECTOR_CLUSTER', ['asset_eth']);
  assert(directQ.queryType === 'SECTOR_CLUSTER', '7.24 executeGraphQuery returns correct queryType');
  assert(typeof directQ.queryId === 'string', '7.25 executeGraphQuery returns queryId');
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  MAIN                                                                        ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

(function run() {
  suite1();
  suite2();
  suite3();
  suite4();
  suite5();
  suite6();
  suite7();

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
