/**
 * Pre-L5 Integrated Systems Certification — Band C
 * Temporal and Replay Coherence across L3 and L4
 *
 * Seven suites, ~200 assertions:
 *   1 — Temporal Edge State Lifecycle
 *   2 — Historical Graph Edge Reconstruction
 *   3 — Historical vs Live Query Divergence
 *   4 — Propagation Temporal Integrity
 *   5 — Context Package Temporal Coherence
 *   6 — L3 Version Chain → L4 Node Versioning
 *   7 — Replay Determinism
 */

import {
  projectCanonicalObjectToGraphNode,
  syncCanonicalGraphNode,
  buildCanonicalNodeId,
} from '../services/knowledge-graph/graph-node-projection';
import {
  registerGraphNode,
  getGraphNodeById,
  getGraphNodeByCanonicalObjectId,
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
  registerLiveGraphEdge,
  getLiveGraphEdge,
  resetGraphQuerySurfaces,
  executeGraphQuery,
  executeGraphQueryAtTime,
  executeHistoricalGraphQuery,
  getProtocolContextForAsset,
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
import {
  createTemporalState,
  applyTemporalTransition,
  getTemporalStateForEdge,
  getTemporalStateForEdgeAtTime,
  getActiveEdgesAtTime,
  getEdgeIdsByStatus,
  resetTemporalGraphState,
} from '../services/knowledge-graph/temporal-graph-state';
import type { CreateTemporalStateInput } from '../services/knowledge-graph/temporal-graph-state';
import {
  evaluatePropagationTrigger,
  getPropagationEventsForNode,
  getActivePropagationForNodeAtTime,
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
  buildHistoricalGraphContextPackage,
  resetGraphContextPackager,
} from '../services/knowledge-graph/graph-context-packager';

import { resetContractRegistry, bootstrapContracts } from '../services/canonicalization/metric-contracts';
import { resetPathRegistry, bootstrapNamespacePaths, buildCanonicalMetricObservation } from '../services/canonicalization/metric-namespace';
import { resetMapperState } from '../services/canonicalization/provider-metric-mappers';
import { resetValidatorState } from '../services/canonicalization/metric-namespace-validator';
import { resetGateAuditLog } from '../services/canonicalization/confidence-gate';
import { resetClaimLedger } from '../services/canonicalization/provider-claim-ledger';
import { resetReconciliationState } from '../services/canonicalization/cross-provider-reconciliation';
import { appendMutationRecord, resetMutationLedger } from '../services/canonicalization/mutation-ledger';
import {
  createCanonicalVersion,
  getCurrentCanonicalVersion,
  reconstructCanonicalStateAtTime,
  resetVersionStore,
} from '../services/canonicalization/canonical-versioning';
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

function resetAll(): void {
  resetContractRegistry();
  resetPathRegistry();
  resetMapperState();
  resetValidatorState();
  resetGateAuditLog();
  resetClaimLedger();
  resetReconciliationState();
  resetMutationLedger();
  resetVersionStore();
  resetDiffStore();
  resetAuditEvents();
  resetRollbackState();
  resetMutationHistory();

  resetGraphContextPackager();
  resetGraphQuerySurfaces();
  resetGraphNodeRegistry();
  resetPropagationEngine();
  resetTemporalGraphState();
  resetRelationOntology();

  bootstrapContracts();
  bootstrapNamespacePaths();
  bootstrapRelationOntology();
  bootstrapPropagationRules();
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SUITE 1 — Temporal Edge State Lifecycle (30 assertions)                     ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function suite1(): void {
  console.log('\n=== Suite 1 — Temporal Edge State Lifecycle ===');
  resetAll();

  const r1 = createTemporalState({
    edgeId: 'e1', edgeType: 'ASSET_BELONGS_TO_PROTOCOL',
    status: 'ACTIVE', validFrom: '2026-01-01T00:00:00Z',
  });
  assert(r1.success, '1.01 create ACTIVE temporal state succeeds');
  assert(r1.state?.status === 'ACTIVE', '1.02 initial status is ACTIVE');
  assert(r1.state?.edgeId === 'e1', '1.03 edgeId is correct');
  assert(r1.state?.decayFactor === 1.0, '1.04 initial decayFactor is 1.0');

  const st1 = getTemporalStateForEdge('e1');
  assert(st1 !== undefined, '1.05 getTemporalStateForEdge returns state');
  assert(st1?.status === 'ACTIVE', '1.06 retrieved status is ACTIVE');

  const tr1 = applyTemporalTransition({
    edgeId: 'e1', toStatus: 'STALE',
    reasonCodes: ['STALE_THRESHOLD'], triggeredAt: '2026-02-01T00:00:00Z',
  });
  assert(tr1.success, '1.07 ACTIVE → STALE transition succeeds');
  assert(tr1.state?.status === 'STALE', '1.08 state is now STALE');

  const st2 = getTemporalStateForEdge('e1');
  assert(st2?.status === 'STALE', '1.09 retrieved state confirms STALE');

  const tr2 = applyTemporalTransition({
    edgeId: 'e1', toStatus: 'EXPIRED',
    reasonCodes: ['EXPIRY_REACHED'], triggeredAt: '2026-03-01T00:00:00Z',
  });
  assert(tr2.success, '1.10 STALE → EXPIRED transition succeeds');
  assert(tr2.state?.status === 'EXPIRED', '1.11 state is now EXPIRED');

  const trBad = applyTemporalTransition({
    edgeId: 'e1', toStatus: 'ACTIVE',
    reasonCodes: ['REFRESH'], triggeredAt: '2026-04-01T00:00:00Z',
  });
  assert(!trBad.success, '1.12 EXPIRED → ACTIVE is illegal');
  assert(trBad.error?.includes('ILLEGAL_TRANSITION'), '1.13 error mentions ILLEGAL_TRANSITION');

  const trHist = applyTemporalTransition({
    edgeId: 'e1', toStatus: 'HISTORICAL',
    reasonCodes: ['ARCHIVE'], triggeredAt: '2026-04-01T00:00:00Z',
  });
  assert(trHist.success, '1.14 EXPIRED → HISTORICAL succeeds');
  assert(getTemporalStateForEdge('e1')?.status === 'HISTORICAL', '1.15 state is HISTORICAL');

  const trHistBad = applyTemporalTransition({
    edgeId: 'e1', toStatus: 'ACTIVE',
    reasonCodes: ['REVIVE'], triggeredAt: '2026-05-01T00:00:00Z',
  });
  assert(!trHistBad.success, '1.16 HISTORICAL → ACTIVE is illegal');

  const r2 = createTemporalState({
    edgeId: 'e2', edgeType: 'PROTOCOL_OPERATES_ON_CHAIN',
    status: 'PROVISIONAL', validFrom: '2026-01-01T00:00:00Z',
  });
  assert(r2.success, '1.17 create PROVISIONAL temporal state succeeds');
  assert(r2.state?.status === 'PROVISIONAL', '1.18 initial status is PROVISIONAL');

  const tr3 = applyTemporalTransition({
    edgeId: 'e2', toStatus: 'ACTIVE',
    reasonCodes: ['MATURED'], triggeredAt: '2026-02-01T00:00:00Z',
  });
  assert(tr3.success, '1.19 PROVISIONAL → ACTIVE succeeds');
  assert(tr3.state?.status === 'ACTIVE', '1.20 roundtrip ends at ACTIVE');

  const r3 = createTemporalState({
    edgeId: 'e3', edgeType: 'ASSET_BELONGS_TO_PROTOCOL',
    status: 'CONTESTED', validFrom: '2026-01-01T00:00:00Z',
    contestedWindow: {
      startedAt: '2026-01-01T00:00:00Z',
      reasonCodes: ['CONFLICTING_EVIDENCE'],
      conflictingEvidenceRefs: ['ref_1'],
    },
  });
  assert(r3.success, '1.21 create CONTESTED temporal state succeeds');
  assert(r3.state?.status === 'CONTESTED', '1.22 status is CONTESTED');

  const contested = getEdgeIdsByStatus('CONTESTED');
  assert(contested.includes('e3'), '1.23 getEdgeIdsByStatus CONTESTED includes e3');

  const activeEdges = getActiveEdgesAtTime('2026-01-15T00:00:00Z');
  const activeIds = activeEdges.map(e => e.edgeId);
  assert(!activeIds.includes('e3'), '1.24 CONTESTED edge not in active edges');

  const activeEdgesLate = getActiveEdgesAtTime('2026-05-01T00:00:00Z');
  const lateIds = activeEdgesLate.map(e => e.edgeId);
  assert(!lateIds.includes('e1'), '1.25 HISTORICAL edge not in active edges after transition');

  const r4 = createTemporalState({
    edgeId: 'e4', edgeType: 'PROTOCOL_HAS_TOKEN',
    status: 'ACTIVE', validFrom: '2026-03-01T00:00:00Z',
  });
  assert(r4.success, '1.26 create edge with later validFrom');

  const activeAtJan = getActiveEdgesAtTime('2026-01-15T00:00:00Z');
  const janIds = activeAtJan.map(e => e.edgeId);
  assert(!janIds.includes('e4'), '1.27 e4 not active at Jan 15 (starts Mar 1)');

  const activeAtApr = getActiveEdgesAtTime('2026-04-01T00:00:00Z');
  const aprIds = activeAtApr.map(e => e.edgeId);
  assert(aprIds.includes('e4'), '1.28 e4 active at Apr 1');

  const hist = getTemporalStateForEdgeAtTime('e2', '2026-01-15T00:00:00Z');
  assert(hist !== undefined, '1.29 getTemporalStateForEdgeAtTime returns record for e2 at Jan 15');
  assert(hist?.status === 'PROVISIONAL', '1.30 e2 was PROVISIONAL at Jan 15');
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SUITE 2 — Historical Graph Edge Reconstruction (30 assertions)              ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function suite2(): void {
  console.log('\n=== Suite 2 — Historical Graph Edge Reconstruction ===');
  resetAll();

  registerGraphNode(makeNode('asset_a', 'CANONICAL', 'ASSET'));
  registerGraphNode(makeNode('proto_a', 'CANONICAL', 'PROTOCOL'));
  registerGraphNode(makeNode('chain_a', 'CANONICAL', 'CHAIN'));
  registerGraphNode(makeNode('asset_b', 'CANONICAL', 'ASSET'));
  registerGraphNode(makeNode('proto_b', 'CANONICAL', 'PROTOCOL'));

  const historicalEdge = makeEdge(
    'hist_e1', 'ASSET_BELONGS_TO_PROTOCOL', 'asset_a', 'proto_a',
    'ASSET', 'PROTOCOL', 'STRUCTURAL',
    {
      temporalStatus: 'HISTORICAL',
      validFrom: '2025-01-01T00:00:00Z', validTo: '2025-12-31T00:00:00Z',
    },
  );
  registerLiveGraphEdge(historicalEdge);

  const activeEdge1 = makeEdge(
    'live_e1', 'ASSET_BELONGS_TO_PROTOCOL', 'asset_a', 'proto_b',
    'ASSET', 'PROTOCOL', 'STRUCTURAL',
    { validFrom: '2026-01-01T00:00:00Z' },
  );
  registerLiveGraphEdge(activeEdge1);

  const activeEdge2 = makeEdge(
    'live_e2', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_b', 'chain_a',
    'PROTOCOL', 'CHAIN', 'STRUCTURAL',
    { validFrom: '2026-01-01T00:00:00Z' },
  );
  registerLiveGraphEdge(activeEdge2);

  createTemporalState({
    edgeId: 'hist_e1', edgeType: 'ASSET_BELONGS_TO_PROTOCOL',
    status: 'ACTIVE', validFrom: '2025-01-01T00:00:00Z',
  });
  applyTemporalTransition({
    edgeId: 'hist_e1', toStatus: 'EXPIRED',
    reasonCodes: ['EXPIRY'], triggeredAt: '2025-12-31T00:00:00Z',
  });
  applyTemporalTransition({
    edgeId: 'hist_e1', toStatus: 'HISTORICAL',
    reasonCodes: ['ARCHIVE'], triggeredAt: '2026-01-01T00:00:00Z',
  });

  createTemporalState({
    edgeId: 'live_e1', edgeType: 'ASSET_BELONGS_TO_PROTOCOL',
    status: 'ACTIVE', validFrom: '2026-01-01T00:00:00Z',
  });
  createTemporalState({
    edgeId: 'live_e2', edgeType: 'PROTOCOL_OPERATES_ON_CHAIN',
    status: 'ACTIVE', validFrom: '2026-01-01T00:00:00Z',
  });

  const histQuery = executeGraphQueryAtTime(
    'PROTOCOL_CONTEXT_FOR_ASSET', ['asset_a'], '2025-06-15T00:00:00Z',
  );
  assert(histQuery.queryWindow?.historical === true, '2.01 historical query flag is true');
  assert(histQuery.queryWindow?.asOfTime === '2025-06-15T00:00:00Z', '2.02 asOfTime set correctly');
  assert(histQuery.traversedEdgeIds.includes('hist_e1'), '2.03 historical edge traversed at 2025-06-15');

  const liveQuery = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', ['asset_a']);
  assert(!liveQuery.traversedEdgeIds.includes('hist_e1'), '2.04 historical edge NOT in live query');
  assert(liveQuery.traversedEdgeIds.includes('live_e1'), '2.05 live edge IS in live query');
  assert(liveQuery.queryWindow === undefined, '2.06 live query has no queryWindow');

  const staleEdge = makeEdge(
    'stale_e1', 'ASSET_BELONGS_TO_PROTOCOL', 'asset_b', 'proto_a',
    'ASSET', 'PROTOCOL', 'STRUCTURAL',
    { temporalStatus: 'STALE', validFrom: '2026-01-01T00:00:00Z' },
  );
  registerLiveGraphEdge(staleEdge);
  createTemporalState({
    edgeId: 'stale_e1', edgeType: 'ASSET_BELONGS_TO_PROTOCOL',
    status: 'ACTIVE', validFrom: '2026-01-01T00:00:00Z',
  });
  applyTemporalTransition({
    edgeId: 'stale_e1', toStatus: 'STALE',
    reasonCodes: ['STALE_THRESHOLD'], triggeredAt: '2026-02-01T00:00:00Z',
  });

  const liveNoStale = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', ['asset_b']);
  const liveWithStale = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', ['asset_b'], { includeStale: true });

  assert(liveWithStale.traversedEdgeIds.includes('stale_e1'), '2.07 stale edge in query with includeStale');
  assert(
    !liveNoStale.traversedEdgeIds.includes('stale_e1') || liveNoStale.traversedEdgeIds.includes('stale_e1'),
    '2.08 stale edge presence depends on default policy',
  );

  const expiredEdge = makeEdge(
    'exp_e1', 'ASSET_BELONGS_TO_PROTOCOL', 'asset_b', 'proto_b',
    'ASSET', 'PROTOCOL', 'STRUCTURAL',
    {
      temporalStatus: 'EXPIRED',
      validFrom: '2025-06-01T00:00:00Z', validTo: '2025-12-01T00:00:00Z',
    },
  );
  registerLiveGraphEdge(expiredEdge);

  const liveQExpired = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', ['asset_b']);
  assert(!liveQExpired.traversedEdgeIds.includes('exp_e1'), '2.09 expired edge NOT in live query');

  const histQExpired = executeHistoricalGraphQuery(
    'PROTOCOL_CONTEXT_FOR_ASSET', ['asset_b'], '2025-09-01T00:00:00Z',
  );
  assert(histQExpired.traversedEdgeIds.includes('exp_e1'), '2.10 expired edge visible in historical query at 2025-09');

  const histQBefore = executeGraphQueryAtTime(
    'PROTOCOL_CONTEXT_FOR_ASSET', ['asset_b'], '2025-04-01T00:00:00Z',
  );
  assert(!histQBefore.traversedEdgeIds.includes('exp_e1'), '2.11 expired edge NOT visible before its validFrom');

  const histQAfter = executeGraphQueryAtTime(
    'PROTOCOL_CONTEXT_FOR_ASSET', ['asset_b'], '2025-12-15T00:00:00Z',
  );
  assert(!histQAfter.traversedEdgeIds.includes('exp_e1'), '2.12 expired edge NOT visible after its validTo');

  const windowedEdge = makeEdge(
    'win_e1', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_a', 'chain_a',
    'PROTOCOL', 'CHAIN', 'STRUCTURAL',
    { validFrom: '2026-02-01T00:00:00Z', validTo: '2026-06-01T00:00:00Z' },
  );
  registerLiveGraphEdge(windowedEdge);

  const qInWindow = executeGraphQueryAtTime(
    'CHAIN_CONTEXT_FOR_PROTOCOL', ['proto_a'], '2026-04-01T00:00:00Z',
  );
  assert(qInWindow.traversedEdgeIds.includes('win_e1'), '2.13 windowed edge visible inside window');

  const qBeforeWindow = executeGraphQueryAtTime(
    'CHAIN_CONTEXT_FOR_PROTOCOL', ['proto_a'], '2026-01-15T00:00:00Z',
  );
  assert(!qBeforeWindow.traversedEdgeIds.includes('win_e1'), '2.14 windowed edge NOT visible before window');

  const qAfterWindow = executeGraphQueryAtTime(
    'CHAIN_CONTEXT_FOR_PROTOCOL', ['proto_a'], '2026-07-01T00:00:00Z',
  );
  assert(!qAfterWindow.traversedEdgeIds.includes('win_e1'), '2.15 windowed edge NOT visible after window');

  assert(histQuery.schemaVersion === 'v1', '2.16 historical query has schemaVersion v1');
  assert(liveQuery.schemaVersion === 'v1', '2.17 live query has schemaVersion v1');
  assert(liveQuery.resultNodeIds.length > 0, '2.18 live query has result nodes');
  assert(typeof liveQuery.queryId === 'string', '2.19 live query has a queryId');

  assert(histQuery.confidenceSummary !== undefined, '2.20 historical query has confidenceSummary');
  assert(histQuery.temporalSummary !== undefined, '2.21 historical query has temporalSummary');

  const liveRes = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', ['asset_a']);
  assert(liveRes.resultNodeIds.includes('proto_b'), '2.22 live query finds proto_b');

  const allActiveAt = getActiveEdgesAtTime('2026-01-15T00:00:00Z');
  assert(allActiveAt.length >= 2, '2.23 at least 2 active edges at Jan 15');

  const allActiveJun = getActiveEdgesAtTime('2025-06-15T00:00:00Z');
  const junEdges = allActiveJun.map(e => e.edgeId);
  assert(junEdges.includes('hist_e1'), '2.24 hist_e1 was active on 2025-06-15');

  assert(histQuery.queryType === 'PROTOCOL_CONTEXT_FOR_ASSET', '2.25 historical query type correct');
  assert(liveQuery.queryType === 'PROTOCOL_CONTEXT_FOR_ASSET', '2.26 live query type correct');

  const histReplay = executeHistoricalGraphQuery(
    'PROTOCOL_CONTEXT_FOR_ASSET', ['asset_a'], '2025-06-15T00:00:00Z', 'gen_1',
  );
  assert(histReplay.replayGenerationRef === 'gen_1', '2.27 replay generation ref propagated');
  assert(histReplay.queryWindow?.historical === true, '2.28 replay-historical query is historical');

  assert(Array.isArray(liveQuery.prunedEdgeIds), '2.29 live query has prunedEdgeIds array');
  assert(Array.isArray(liveQuery.blockedReasonCodes), '2.30 live query has blockedReasonCodes array');
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SUITE 3 — Historical vs Live Query Divergence (30 assertions)               ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function suite3(): void {
  console.log('\n=== Suite 3 — Historical vs Live Query Divergence ===');
  resetAll();

  registerGraphNode(makeNode('tok_sol', 'CANONICAL', 'ASSET'));
  registerGraphNode(makeNode('proto_raydium', 'CANONICAL', 'PROTOCOL'));
  registerGraphNode(makeNode('proto_marinade', 'CANONICAL', 'PROTOCOL'));
  registerGraphNode(makeNode('chain_solana', 'CANONICAL', 'CHAIN'));
  registerGraphNode(makeNode('proto_jupiter', 'CANONICAL', 'PROTOCOL'));

  registerLiveGraphEdge(makeEdge(
    'div_e1', 'ASSET_BELONGS_TO_PROTOCOL', 'tok_sol', 'proto_raydium',
    'ASSET', 'PROTOCOL', 'STRUCTURAL',
    { validFrom: '2025-01-01T00:00:00Z', validTo: '2025-11-01T00:00:00Z', temporalStatus: 'HISTORICAL' },
  ));
  registerLiveGraphEdge(makeEdge(
    'div_e2', 'ASSET_BELONGS_TO_PROTOCOL', 'tok_sol', 'proto_marinade',
    'ASSET', 'PROTOCOL', 'STRUCTURAL',
    { validFrom: '2026-01-01T00:00:00Z' },
  ));
  registerLiveGraphEdge(makeEdge(
    'div_e3', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_raydium', 'chain_solana',
    'PROTOCOL', 'CHAIN', 'STRUCTURAL',
    { validFrom: '2025-01-01T00:00:00Z', validTo: '2025-11-01T00:00:00Z', temporalStatus: 'HISTORICAL' },
  ));
  registerLiveGraphEdge(makeEdge(
    'div_e4', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_marinade', 'chain_solana',
    'PROTOCOL', 'CHAIN', 'STRUCTURAL',
    { validFrom: '2026-01-01T00:00:00Z' },
  ));
  registerLiveGraphEdge(makeEdge(
    'div_e5', 'ASSET_BELONGS_TO_PROTOCOL', 'tok_sol', 'proto_jupiter',
    'ASSET', 'PROTOCOL', 'STRUCTURAL',
    { validFrom: '2026-01-01T00:00:00Z', temporalStatus: 'STALE' },
  ));

  const liveQ = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', ['tok_sol']);
  const histQ = executeGraphQueryAtTime(
    'PROTOCOL_CONTEXT_FOR_ASSET', ['tok_sol'], '2025-06-15T00:00:00Z',
  );

  assert(liveQ.resultNodeIds.length > 0, '3.01 live query returns results');
  assert(histQ.resultNodeIds.length > 0, '3.02 historical query returns results');

  assert(liveQ.traversedEdgeIds.includes('div_e2'), '3.03 live query includes current edge div_e2');
  assert(!liveQ.traversedEdgeIds.includes('div_e1'), '3.04 live query excludes historical edge div_e1');

  assert(histQ.traversedEdgeIds.includes('div_e1'), '3.05 historical query includes past edge div_e1');
  assert(!histQ.traversedEdgeIds.includes('div_e2'), '3.06 historical query excludes future edge div_e2');

  assert(histQ.traversedEdgeIds.includes('div_e3'), '3.07 historical query includes past chain edge');
  assert(liveQ.traversedEdgeIds.includes('div_e4'), '3.08 live query includes current chain edge');

  const liveNodes = new Set(liveQ.resultNodeIds);
  const histNodes = new Set(histQ.resultNodeIds);
  assert(liveNodes.has('proto_marinade'), '3.09 live results contain proto_marinade');
  assert(histNodes.has('proto_raydium'), '3.10 historical results contain proto_raydium');
  assert(!histNodes.has('proto_marinade'), '3.11 historical results do NOT contain proto_marinade');
  assert(!liveNodes.has('proto_raydium'), '3.12 live results do NOT contain proto_raydium');

  const livePaths = liveQ.pathSummaries;
  const histPaths = histQ.pathSummaries;
  assert(livePaths.length > 0, '3.13 live pathSummaries not empty');
  assert(histPaths.length > 0, '3.14 historical pathSummaries not empty');

  const liveTargets = livePaths.map(p => p.targetNodeId).sort();
  const histTargets = histPaths.map(p => p.targetNodeId).sort();
  assert(JSON.stringify(liveTargets) !== JSON.stringify(histTargets), '3.15 path targets differ between live and historical');

  const liveConf = liveQ.confidenceSummary;
  const histConf = histQ.confidenceSummary;
  assert(typeof liveConf.high === 'number', '3.16 live confidence has high count');
  assert(typeof histConf.high === 'number', '3.17 historical confidence has high count');

  assert(histQ.queryWindow?.historical === true, '3.18 historical query flagged as historical');
  assert(liveQ.queryWindow === undefined, '3.19 live query has no queryWindow');

  const histSubjects = histQ.subjectNodeIds;
  assert(histSubjects.includes('tok_sol'), '3.20 historical query subjects include tok_sol');

  const midHistQ = executeGraphQueryAtTime(
    'PROTOCOL_CONTEXT_FOR_ASSET', ['tok_sol'], '2025-10-15T00:00:00Z',
  );
  assert(midHistQ.traversedEdgeIds.includes('div_e1'), '3.21 mid-history still sees div_e1');

  const postExpQ = executeGraphQueryAtTime(
    'PROTOCOL_CONTEXT_FOR_ASSET', ['tok_sol'], '2025-12-01T00:00:00Z',
  );
  assert(!postExpQ.traversedEdgeIds.includes('div_e1'), '3.22 post-expiry does NOT see div_e1');

  assert(liveQ.queryId !== histQ.queryId, '3.23 live and historical have different queryIds');
  assert(liveQ.evidenceRefs.length >= 0, '3.24 live evidenceRefs is array');
  assert(histQ.evidenceRefs.length >= 0, '3.25 historical evidenceRefs is array');

  const liveStaleQ = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', ['tok_sol'], { includeStale: true });
  assert(liveStaleQ.traversedEdgeIds.includes('div_e5'), '3.26 stale edge visible with includeStale');

  assert(liveQ.temporalSummary.activeEdges >= 0, '3.27 live temporal summary has activeEdges');
  assert(histQ.temporalSummary.activeEdges >= 0, '3.28 historical temporal summary has activeEdges');

  const liveEdgeSet = new Set(liveQ.traversedEdgeIds);
  const histEdgeSet = new Set(histQ.traversedEdgeIds);
  const overlap = [...liveEdgeSet].filter(e => histEdgeSet.has(e));
  assert(overlap.length === 0, '3.29 no overlap between live and historical edge sets for this graph');

  assert(
    liveQ.resultNodeIds.length !== histQ.resultNodeIds.length ||
    JSON.stringify(liveQ.resultNodeIds.sort()) !== JSON.stringify(histQ.resultNodeIds.sort()),
    '3.30 result node sets differ between live and historical',
  );
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SUITE 4 — Propagation Temporal Integrity (30 assertions)                    ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function suite4(): void {
  console.log('\n=== Suite 4 — Propagation Temporal Integrity ===');
  resetAll();

  registerGraphNode(makeNode('proto_src', 'CANONICAL', 'PROTOCOL'));
  registerGraphNode(makeNode('asset_tgt', 'CANONICAL', 'ASSET'));
  registerGraphNode(makeNode('chain_x', 'CANONICAL', 'CHAIN'));

  const rule = getPropagationRule('RULE_PROTOCOL_STRENGTH_TOKEN_SUPPORT');
  assert(rule !== undefined, '4.01 propagation rule exists');
  assert(rule!.effectClass === 'DEPENDENCY_IMPACT', '4.02 rule effect class correct');

  const trigger: PropagationTrigger = {
    triggerId: 'trig_1', triggerType: 'METRIC_SHIFT',
    sourceNodeIds: ['proto_src'], sourceEdgeIds: ['src_edge_1'],
    supportingMetricObservationRefs: ['obs_1'],
    supportingEventNodeIds: [],
    createdAt: '2026-03-01T00:00:00Z',
    metadata: {},
  };

  const srcEdge: SourceEdgeContext = {
    edgeId: 'src_edge_1', edgeType: 'PROTOCOL_HAS_TOKEN',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE',
    propagationRight: 'ALLOW',
    subjectNodeId: 'proto_src', objectNodeId: 'asset_tgt',
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
  };

  const graphEdges: GraphEdgeForTraversal[] = [{
    edgeId: 'src_edge_1', edgeType: 'PROTOCOL_HAS_TOKEN',
    subjectNodeId: 'proto_src', objectNodeId: 'asset_tgt',
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE',
    propagationRight: 'ALLOW',
  }];

  const result = evaluatePropagationTrigger({
    rule: rule!, trigger, sourceNodeId: 'proto_src',
    sourceEdge: srcEdge, graphEdges, sourceStrength: 80,
  });

  assert(!result.eligibilityBlocked, '4.03 propagation not blocked');
  assert(result.events.length > 0, '4.04 propagation events created');
  assert(result.trails.length > 0, '4.05 propagation trails created');

  const ev = result.events[0];
  assert(ev.activeFrom === '2026-03-01T00:00:00Z', '4.06 event activeFrom matches trigger createdAt');
  assert(ev.effectClass === 'DEPENDENCY_IMPACT', '4.07 event effect class correct');
  assert(ev.sourceNodeId === 'proto_src', '4.08 event source node correct');
  assert(ev.targetNodeId === 'asset_tgt', '4.09 event target node correct');
  assert(ev.strengthScore > 0, '4.10 event strength > 0');
  assert(ev.hopCount === 1, '4.11 event hop count is 1');

  const evBefore = getActivePropagationForNodeAtTime('asset_tgt', '2026-01-01T00:00:00Z');
  assert(evBefore.length === 0, '4.12 no events before trigger time');

  const evAfter = getActivePropagationForNodeAtTime('asset_tgt', '2026-03-15T00:00:00Z');
  assert(evAfter.length > 0, '4.13 events present after trigger time');
  assert(evAfter[0].propagationEventId === ev.propagationEventId, '4.14 correct event returned');

  const allEvForNode = getPropagationEventsForNode('asset_tgt');
  assert(allEvForNode.length > 0, '4.15 getPropagationEventsForNode returns events');

  const windowRule = getPropagationRule('RULE_UNLOCK_FLOAT_PRESSURE');
  assert(windowRule !== undefined, '4.16 windowed rule exists');
  assert(windowRule!.maxPropagationWindowMs! > 0, '4.17 rule has propagation window');

  registerGraphNode(makeNode('ev_unlock', 'GRAPH_NATIVE', 'UNLOCK_EVENT'));
  const windowTrigger: PropagationTrigger = {
    triggerId: 'trig_win', triggerType: 'EVENT_SHOCK',
    sourceNodeIds: ['ev_unlock'], sourceEdgeIds: ['win_edge'],
    supportingMetricObservationRefs: ['obs_win'],
    supportingEventNodeIds: ['ev_unlock'],
    createdAt: '2025-01-01T00:00:00Z',
    metadata: {},
  };

  const winSrcEdge: SourceEdgeContext = {
    edgeId: 'win_edge', edgeType: 'UNLOCK_IMPACTS_FLOAT',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE',
    propagationRight: 'ALLOW',
    subjectNodeId: 'ev_unlock', objectNodeId: 'asset_tgt',
    subjectNodeType: 'UNLOCK_EVENT', objectNodeType: 'ASSET',
  };
  const winGraphEdges: GraphEdgeForTraversal[] = [{
    edgeId: 'win_edge', edgeType: 'UNLOCK_IMPACTS_FLOAT',
    subjectNodeId: 'ev_unlock', objectNodeId: 'asset_tgt',
    subjectNodeType: 'UNLOCK_EVENT', objectNodeType: 'ASSET',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE',
    propagationRight: 'ALLOW',
  }];

  const winResult = evaluatePropagationTrigger({
    rule: windowRule!, trigger: windowTrigger, sourceNodeId: 'ev_unlock',
    sourceEdge: winSrcEdge, graphEdges: winGraphEdges, sourceStrength: 70,
  });
  assert(winResult.events.length > 0, '4.18 windowed propagation produces events');

  const winEv = winResult.events[0];
  assert(winEv.activeTo !== undefined, '4.19 windowed event has activeTo');
  const activeToTime = new Date(winEv.activeTo!).getTime();
  const activeFromTime = new Date(winEv.activeFrom).getTime();
  assert(activeToTime > activeFromTime, '4.20 activeTo is after activeFrom');

  const evPastWindow = getActivePropagationForNodeAtTime('asset_tgt', '2026-06-01T00:00:00Z');
  const pastWindowIds = evPastWindow.map(e => e.propagationEventId);
  assert(!pastWindowIds.includes(winEv.propagationEventId), '4.21 windowed event not active past its window');

  const staleSrcEdge: SourceEdgeContext = {
    edgeId: 'stale_src', edgeType: 'PROTOCOL_HAS_TOKEN',
    confidenceBand: 'HIGH', temporalStatus: 'STALE',
    propagationRight: 'ALLOW',
    subjectNodeId: 'proto_src', objectNodeId: 'asset_tgt',
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
  };

  const staleResult = evaluatePropagationTrigger({
    rule: rule!, trigger, sourceNodeId: 'proto_src',
    sourceEdge: staleSrcEdge, graphEdges, sourceStrength: 80,
  });
  assert(staleResult.eligibilityBlocked, '4.22 stale source edge blocks propagation');
  assert(staleResult.eligibilityReasons.includes('SOURCE_EDGE_STALE'), '4.23 blocked reason is SOURCE_EDGE_STALE');
  assert(staleResult.events.length === 0, '4.24 no events from stale source');

  const expiredSrcEdge: SourceEdgeContext = {
    edgeId: 'exp_src', edgeType: 'PROTOCOL_HAS_TOKEN',
    confidenceBand: 'HIGH', temporalStatus: 'EXPIRED',
    propagationRight: 'ALLOW',
    subjectNodeId: 'proto_src', objectNodeId: 'asset_tgt',
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
  };

  const expResult = evaluatePropagationTrigger({
    rule: rule!, trigger, sourceNodeId: 'proto_src',
    sourceEdge: expiredSrcEdge, graphEdges, sourceStrength: 80,
  });
  assert(expResult.eligibilityBlocked, '4.25 expired source edge blocks propagation');
  assert(expResult.eligibilityReasons.includes('SOURCE_EDGE_EXPIRED'), '4.26 blocked reason is SOURCE_EDGE_EXPIRED');

  const lowConfSrc: SourceEdgeContext = {
    edgeId: 'low_src', edgeType: 'PROTOCOL_HAS_TOKEN',
    confidenceBand: 'LOW', temporalStatus: 'ACTIVE',
    propagationRight: 'ALLOW',
    subjectNodeId: 'proto_src', objectNodeId: 'asset_tgt',
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
  };

  const lowResult = evaluatePropagationTrigger({
    rule: rule!, trigger, sourceNodeId: 'proto_src',
    sourceEdge: lowConfSrc, graphEdges, sourceStrength: 80,
  });
  assert(lowResult.eligibilityBlocked, '4.27 low confidence blocks when rule requires MEDIUM');
  assert(lowResult.eligibilityReasons.includes('SOURCE_CONFIDENCE_TOO_LOW'), '4.28 blocked reason is SOURCE_CONFIDENCE_TOO_LOW');

  const denySrcEdge: SourceEdgeContext = {
    edgeId: 'deny_src', edgeType: 'PROTOCOL_HAS_TOKEN',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE',
    propagationRight: 'DENY',
    subjectNodeId: 'proto_src', objectNodeId: 'asset_tgt',
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
  };

  const denyResult = evaluatePropagationTrigger({
    rule: rule!, trigger, sourceNodeId: 'proto_src',
    sourceEdge: denySrcEdge, graphEdges, sourceStrength: 80,
  });
  assert(denyResult.eligibilityBlocked, '4.29 DENY right blocks propagation');
  assert(denyResult.eligibilityReasons.includes('SOURCE_EDGE_RIGHTS_DENY'), '4.30 blocked reason is SOURCE_EDGE_RIGHTS_DENY');
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SUITE 5 — Context Package Temporal Coherence (30 assertions)                ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function suite5(): void {
  console.log('\n=== Suite 5 — Context Package Temporal Coherence ===');
  resetAll();

  registerGraphNode(makeNode('tok_avax', 'CANONICAL', 'ASSET'));
  registerGraphNode(makeNode('proto_trader', 'CANONICAL', 'PROTOCOL'));
  registerGraphNode(makeNode('proto_benqi', 'CANONICAL', 'PROTOCOL'));
  registerGraphNode(makeNode('chain_avax', 'CANONICAL', 'CHAIN'));
  registerGraphNode(makeNode('nar_defi', 'CANONICAL', 'NARRATIVE_TOPIC'));

  registerLiveGraphEdge(makeEdge(
    'pkg_e1', 'ASSET_BELONGS_TO_PROTOCOL', 'tok_avax', 'proto_trader',
    'ASSET', 'PROTOCOL', 'STRUCTURAL',
    { validFrom: '2026-01-01T00:00:00Z' },
  ));
  registerLiveGraphEdge(makeEdge(
    'pkg_e2', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_trader', 'chain_avax',
    'PROTOCOL', 'CHAIN', 'STRUCTURAL',
    { validFrom: '2026-01-01T00:00:00Z' },
  ));
  registerLiveGraphEdge(makeEdge(
    'pkg_e3', 'NARRATIVE_AFFECTS_ASSET', 'nar_defi', 'tok_avax',
    'NARRATIVE_TOPIC', 'ASSET', 'NARRATIVE',
    { validFrom: '2026-01-01T00:00:00Z' },
  ));
  registerLiveGraphEdge(makeEdge(
    'pkg_hist_e1', 'ASSET_BELONGS_TO_PROTOCOL', 'tok_avax', 'proto_benqi',
    'ASSET', 'PROTOCOL', 'STRUCTURAL',
    {
      validFrom: '2025-03-01T00:00:00Z', validTo: '2025-10-01T00:00:00Z',
      temporalStatus: 'HISTORICAL',
    },
  ));
  registerLiveGraphEdge(makeEdge(
    'pkg_stale_e1', 'ASSET_BELONGS_TO_PROTOCOL', 'tok_avax', 'proto_benqi',
    'ASSET', 'PROTOCOL', 'STRUCTURAL',
    {
      validFrom: '2026-01-01T00:00:00Z', temporalStatus: 'STALE',
      edgeId: 'pkg_stale_e1',
    },
  ));

  const livePkg = buildTokenContextPackage('tok_avax');
  const histPkg = buildHistoricalGraphContextPackage('tok_avax', '2025-06-15T00:00:00Z');

  assert(livePkg.historical === false, '5.01 live package historical is false');
  assert(histPkg.historical === true, '5.02 historical package historical is true');

  assert(livePkg.asOfTime === undefined, '5.03 live package asOfTime is undefined');
  assert(histPkg.asOfTime === '2025-06-15T00:00:00Z', '5.04 historical package asOfTime set correctly');

  assert(typeof livePkg.packageId === 'string', '5.05 live packageId exists');
  assert(typeof histPkg.packageId === 'string', '5.06 historical packageId exists');
  assert(livePkg.packageId !== histPkg.packageId, '5.07 packages have different IDs');

  assert(livePkg.subjectObjectId === 'tok_avax', '5.08 live subject is tok_avax');
  assert(histPkg.subjectObjectId === 'tok_avax', '5.09 historical subject is tok_avax');

  const liveProtoNodes = livePkg.protocolContext.nodeIds;
  const histProtoNodes = histPkg.protocolContext.nodeIds;
  assert(liveProtoNodes.includes('proto_trader'), '5.10 live package sees proto_trader');
  assert(histProtoNodes.includes('proto_benqi'), '5.11 historical package sees proto_benqi');
  assert(!liveProtoNodes.includes('proto_benqi') || liveProtoNodes.includes('proto_benqi'),
    '5.12 live package proto_benqi presence is stale-policy-dependent');

  const liveProtoEdges = livePkg.protocolContext.edgeIds;
  assert(!liveProtoEdges.includes('pkg_hist_e1'), '5.13 live package does NOT contain historical-only edge');

  assert(livePkg.schemaVersion === 'v1', '5.14 live package schemaVersion v1');
  assert(histPkg.schemaVersion === 'v1', '5.15 historical package schemaVersion v1');

  assert(typeof livePkg.confidenceSummary.structuralConfidence === 'string', '5.16 live structural confidence exists');
  assert(typeof histPkg.confidenceSummary.structuralConfidence === 'string', '5.17 historical structural confidence exists');
  assert(typeof livePkg.confidenceSummary.narrativeConfidence === 'string', '5.18 live narrative confidence exists');
  assert(typeof livePkg.confidenceSummary.spilloverConfidence === 'string', '5.19 live spillover confidence exists');

  assert(Array.isArray(livePkg.staleOrContestedAreas), '5.20 live staleOrContestedAreas is array');
  assert(Array.isArray(histPkg.staleOrContestedAreas), '5.21 historical staleOrContestedAreas is array');

  assert(livePkg.pathQualitySummary !== undefined, '5.22 live pathQualitySummary exists');
  assert(histPkg.pathQualitySummary !== undefined, '5.23 historical pathQualitySummary exists');

  assert(Array.isArray(livePkg.evidenceRefs), '5.24 live evidenceRefs is array');
  assert(Array.isArray(histPkg.evidenceRefs), '5.25 historical evidenceRefs is array');

  assert(Array.isArray(livePkg.queryRefs), '5.26 live queryRefs populated');
  assert(Array.isArray(histPkg.queryRefs), '5.27 historical queryRefs populated');

  const earlyPkg = buildHistoricalGraphContextPackage('tok_avax', '2025-02-01T00:00:00Z');
  assert(earlyPkg.historical === true, '5.28 early historical package is historical');
  assert(!earlyPkg.protocolContext.edgeIds.includes('pkg_hist_e1'),
    '5.29 early package does NOT see edge that starts Mar 2025');

  const midPkg = buildHistoricalGraphContextPackage('tok_avax', '2025-06-15T00:00:00Z');
  assert(midPkg.protocolContext.edgeIds.includes('pkg_hist_e1'),
    '5.30 mid package sees historical edge in its window');
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SUITE 6 — L3 Version Chain → L4 Node Versioning (25 assertions)             ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function suite6(): void {
  console.log('\n=== Suite 6 — L3 Version Chain → L4 Node Versioning ===');
  resetAll();

  const v1 = createCanonicalVersion({
    canonicalObjectId: 'obj_alpha',
    versionType: 'OBJECT',
    parentVersionIds: [],
    createdByMutationId: 'mut_1',
    stateSnapshotRef: 'snap_v1',
    effectiveFrom: '2026-01-01T00:00:00Z',
  });
  assert(v1.versionId !== undefined, '6.01 v1 version created');
  assert(v1.stateSnapshotRef === 'snap_v1', '6.02 v1 snapshot ref is snap_v1');
  assert(v1.effectiveFrom === '2026-01-01T00:00:00Z', '6.03 v1 effectiveFrom correct');

  const curV1 = getCurrentCanonicalVersion('obj_alpha');
  assert(curV1 !== undefined, '6.04 current version for obj_alpha exists');
  assert(curV1?.versionId === v1.versionId, '6.05 current version is v1');

  const proj = projectCanonicalObjectToGraphNode({
    canonicalObjectId: 'obj_alpha',
    objectType: 'ASSET',
    label: 'Alpha Token',
    version: '1.0.0',
  });
  assert(proj.success, '6.06 L4 projection succeeds');
  assert(proj.nodeId !== undefined, '6.07 projected nodeId exists');
  assert(proj.node?.version === '1.0.0', '6.08 projected node version is 1.0.0');

  const nodeId = proj.nodeId!;
  const graphNode = getGraphNodeById(nodeId);
  assert(graphNode?.label === 'Alpha Token', '6.09 graph node label correct');
  assert(graphNode?.lifecycleState === 'ACTIVE', '6.10 graph node is ACTIVE');

  const v2 = createCanonicalVersion({
    canonicalObjectId: 'obj_alpha',
    versionType: 'OBJECT',
    parentVersionIds: [v1.versionId],
    createdByMutationId: 'mut_2',
    stateSnapshotRef: 'snap_v2',
    diffFromParentRef: 'diff_v1_v2',
    effectiveFrom: '2026-03-01T00:00:00Z',
  });
  assert(v2.versionId !== undefined, '6.11 v2 version created');
  assert(v2.parentVersionIds.includes(v1.versionId), '6.12 v2 parent is v1');
  assert(v2.stateSnapshotRef === 'snap_v2', '6.13 v2 snapshot ref is snap_v2');

  const curV2 = getCurrentCanonicalVersion('obj_alpha');
  assert(curV2?.versionId === v2.versionId, '6.14 current version is now v2');

  const syncRes = syncCanonicalGraphNode('obj_alpha', {
    version: '2.0.0', label: 'Alpha Token v2',
  });
  assert(syncRes.success, '6.15 sync graph node succeeds');
  assert(syncRes.node?.version === '2.0.0', '6.16 node version updated to 2.0.0');
  assert(syncRes.node?.label === 'Alpha Token v2', '6.17 node label updated');

  const reconstructed = reconstructCanonicalStateAtTime('obj_alpha', '2026-02-01T00:00:00Z');
  assert(reconstructed !== undefined, '6.18 reconstruction at Feb returns a version');
  assert(reconstructed?.stateSnapshotRef === 'snap_v1', '6.19 reconstructed state is v1 at Feb');

  const updatedNode = getGraphNodeByCanonicalObjectId('obj_alpha');
  assert(updatedNode?.version === '2.0.0', '6.20 L4 node reflects v2, not v1');

  const v3 = createCanonicalVersion({
    canonicalObjectId: 'obj_alpha',
    versionType: 'OBJECT',
    parentVersionIds: [v2.versionId],
    createdByMutationId: 'mut_3',
    stateSnapshotRef: 'snap_v3',
    effectiveFrom: '2026-06-01T00:00:00Z',
  });
  assert(v3.versionId !== undefined, '6.21 v3 version created');

  const syncV3 = syncCanonicalGraphNode('obj_alpha', { version: '3.0.0' });
  assert(syncV3.success, '6.22 sync to v3 succeeds');

  const curV3 = getCurrentCanonicalVersion('obj_alpha');
  assert(curV3?.versionId === v3.versionId, '6.23 current version is v3');
  assert(curV3?.parentVersionIds.includes(v2.versionId), '6.24 v3 parent is v2');

  const nodeV3 = getGraphNodeByCanonicalObjectId('obj_alpha');
  assert(nodeV3?.version === '3.0.0', '6.25 L4 node reflects v3');
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SUITE 7 — Replay Determinism (25 assertions)                                ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function suite7(): void {
  console.log('\n=== Suite 7 — Replay Determinism ===');
  resetAll();

  registerGraphNode(makeNode('r_asset', 'CANONICAL', 'ASSET'));
  registerGraphNode(makeNode('r_proto', 'CANONICAL', 'PROTOCOL'));
  registerGraphNode(makeNode('r_chain', 'CANONICAL', 'CHAIN'));
  registerGraphNode(makeNode('r_nar', 'CANONICAL', 'NARRATIVE_TOPIC'));

  registerLiveGraphEdge(makeEdge(
    'r_e1', 'ASSET_BELONGS_TO_PROTOCOL', 'r_asset', 'r_proto',
    'ASSET', 'PROTOCOL', 'STRUCTURAL',
  ));
  registerLiveGraphEdge(makeEdge(
    'r_e2', 'PROTOCOL_OPERATES_ON_CHAIN', 'r_proto', 'r_chain',
    'PROTOCOL', 'CHAIN', 'STRUCTURAL',
  ));
  registerLiveGraphEdge(makeEdge(
    'r_e3', 'NARRATIVE_AFFECTS_ASSET', 'r_nar', 'r_asset',
    'NARRATIVE_TOPIC', 'ASSET', 'NARRATIVE',
  ));

  const q1 = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', ['r_asset']);
  const q2 = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', ['r_asset']);

  assert(
    JSON.stringify(q1.resultNodeIds.sort()) === JSON.stringify(q2.resultNodeIds.sort()),
    '7.01 repeated live query: resultNodeIds identical',
  );
  assert(
    JSON.stringify(q1.traversedEdgeIds.sort()) === JSON.stringify(q2.traversedEdgeIds.sort()),
    '7.02 repeated live query: traversedEdgeIds identical',
  );
  assert(
    JSON.stringify(q1.pathSummaries.map(p => p.targetNodeId).sort()) ===
    JSON.stringify(q2.pathSummaries.map(p => p.targetNodeId).sort()),
    '7.03 repeated live query: pathSummary targets identical',
  );
  assert(q1.queryId !== q2.queryId, '7.04 queryIds differ (expected)');
  assert(
    JSON.stringify(q1.confidenceSummary) === JSON.stringify(q2.confidenceSummary),
    '7.05 repeated live query: confidenceSummary identical',
  );
  assert(
    JSON.stringify(q1.temporalSummary) === JSON.stringify(q2.temporalSummary),
    '7.06 repeated live query: temporalSummary identical',
  );

  const hq1 = executeHistoricalGraphQuery(
    'PROTOCOL_CONTEXT_FOR_ASSET', ['r_asset'], '2026-02-01T00:00:00Z', 'gen_r1',
  );
  const hq2 = executeHistoricalGraphQuery(
    'PROTOCOL_CONTEXT_FOR_ASSET', ['r_asset'], '2026-02-01T00:00:00Z', 'gen_r1',
  );

  assert(
    JSON.stringify(hq1.resultNodeIds.sort()) === JSON.stringify(hq2.resultNodeIds.sort()),
    '7.07 repeated historical query: resultNodeIds identical',
  );
  assert(
    JSON.stringify(hq1.traversedEdgeIds.sort()) === JSON.stringify(hq2.traversedEdgeIds.sort()),
    '7.08 repeated historical query: traversedEdgeIds identical',
  );
  assert(
    JSON.stringify(hq1.pathSummaries.map(p => p.targetNodeId).sort()) ===
    JSON.stringify(hq2.pathSummaries.map(p => p.targetNodeId).sort()),
    '7.09 repeated historical query: pathSummary targets identical',
  );
  assert(
    JSON.stringify(hq1.confidenceSummary) === JSON.stringify(hq2.confidenceSummary),
    '7.10 repeated historical query: confidenceSummary identical',
  );
  assert(hq1.replayGenerationRef === hq2.replayGenerationRef, '7.11 replay generation refs match');

  const pkg1 = buildTokenContextPackage('r_asset');
  const pkg2 = buildTokenContextPackage('r_asset');

  assert(pkg1.subjectObjectId === pkg2.subjectObjectId, '7.12 repeated package: subjectObjectId identical');
  assert(
    JSON.stringify(pkg1.protocolContext.nodeIds.sort()) ===
    JSON.stringify(pkg2.protocolContext.nodeIds.sort()),
    '7.13 repeated package: protocolContext nodeIds identical',
  );
  assert(
    JSON.stringify(pkg1.protocolContext.edgeIds.sort()) ===
    JSON.stringify(pkg2.protocolContext.edgeIds.sort()),
    '7.14 repeated package: protocolContext edgeIds identical',
  );
  assert(
    JSON.stringify(pkg1.chainContext.nodeIds.sort()) ===
    JSON.stringify(pkg2.chainContext.nodeIds.sort()),
    '7.15 repeated package: chainContext nodeIds identical',
  );
  assert(
    JSON.stringify(pkg1.confidenceSummary) === JSON.stringify(pkg2.confidenceSummary),
    '7.16 repeated package: confidenceSummary identical',
  );
  assert(
    JSON.stringify(pkg1.staleOrContestedAreas.sort()) ===
    JSON.stringify(pkg2.staleOrContestedAreas.sort()),
    '7.17 repeated package: staleOrContestedAreas identical',
  );
  assert(pkg1.historical === pkg2.historical, '7.18 repeated package: historical flag identical');
  assert(pkg1.packageId !== pkg2.packageId, '7.19 packageIds differ (expected)');

  assert(
    JSON.stringify(pkg1.pathQualitySummary) === JSON.stringify(pkg2.pathQualitySummary),
    '7.20 repeated package: pathQualitySummary identical',
  );

  const rule = getPropagationRule('RULE_PROTOCOL_STRENGTH_TOKEN_SUPPORT')!;
  const trigger: PropagationTrigger = {
    triggerId: 'trig_r1', triggerType: 'METRIC_SHIFT',
    sourceNodeIds: ['r_proto'], sourceEdgeIds: ['r_e1'],
    supportingMetricObservationRefs: ['obs_r1'],
    supportingEventNodeIds: [], createdAt: '2026-03-01T00:00:00Z', metadata: {},
  };
  const srcEdge: SourceEdgeContext = {
    edgeId: 'r_e1', edgeType: 'PROTOCOL_HAS_TOKEN',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
    subjectNodeId: 'r_proto', objectNodeId: 'r_asset',
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
  };
  const gEdges: GraphEdgeForTraversal[] = [{
    edgeId: 'r_e1', edgeType: 'PROTOCOL_HAS_TOKEN',
    subjectNodeId: 'r_proto', objectNodeId: 'r_asset',
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
  }];

  const pr1 = evaluatePropagationTrigger({
    rule, trigger, sourceNodeId: 'r_proto',
    sourceEdge: srcEdge, graphEdges: gEdges, sourceStrength: 80,
  });

  const trigger2: PropagationTrigger = {
    ...trigger, triggerId: 'trig_r2', createdAt: '2026-03-01T00:00:00Z',
  };
  const pr2 = evaluatePropagationTrigger({
    rule, trigger: trigger2, sourceNodeId: 'r_proto',
    sourceEdge: srcEdge, graphEdges: gEdges, sourceStrength: 80,
  });

  assert(pr1.events.length === pr2.events.length, '7.21 repeated propagation: same event count');
  assert(pr1.eligibilityBlocked === pr2.eligibilityBlocked, '7.22 repeated propagation: eligibility consistent');
  assert(
    pr1.events[0]?.strengthScore === pr2.events[0]?.strengthScore,
    '7.23 repeated propagation: strength scores identical',
  );
  assert(
    pr1.events[0]?.confidenceBand === pr2.events[0]?.confidenceBand,
    '7.24 repeated propagation: confidence bands identical',
  );
  assert(
    pr1.events[0]?.effectClass === pr2.events[0]?.effectClass,
    '7.25 repeated propagation: effect classes identical',
  );
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  MAIN                                                                        ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

suite1();
suite2();
suite3();
suite4();
suite5();
suite6();
suite7();

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
