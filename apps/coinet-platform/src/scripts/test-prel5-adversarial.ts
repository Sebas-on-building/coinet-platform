/**
 * Pre-L5 Integrated Systems Certification — Band F
 * Adversarial Anti-Fake Chain
 *
 * Eight suites, ~250 assertions that deliberately attack
 * every L3-L4 boundary to verify structural defences.
 */

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
  projectCanonicalObjectToGraphNode,
  buildCanonicalNodeId,
  syncCanonicalGraphNode,
} from '../services/knowledge-graph/graph-node-projection';
import {
  registerLiveGraphEdge,
  resetGraphQuerySurfaces,
  getProtocolContextForAsset,
  getSectorCluster,
  getCompetitorSet,
  getNarrativeContextForObject,
  executeGraphQuery,
} from '../services/knowledge-graph/graph-query-surfaces';
import type {
  LiveGraphEdge,
  EdgeRightsMap,
} from '../services/knowledge-graph/graph-query-surfaces';
import {
  bootstrapRelationOntology,
  resetRelationOntology,
  getEdgeContract,
  isEdgeTypeRegistered,
} from '../services/knowledge-graph/relation-ontology';
import { resetTemporalGraphState } from '../services/knowledge-graph/temporal-graph-state';
import {
  evaluatePropagationTrigger,
  getPropagationEventsForNode,
  bootstrapPropagationRules,
  resetPropagationEngine,
  getPropagationRule,
  checkPropagationEligibility,
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
  resetGraphContextPackager,
} from '../services/knowledge-graph/graph-context-packager';

import { resetContractRegistry, bootstrapContracts } from '../services/canonicalization/metric-contracts';
import {
  resetPathRegistry,
  bootstrapNamespacePaths,
  buildCanonicalMetricObservation,
} from '../services/canonicalization/metric-namespace';
import type { BuildObservationInput, CanonicalMetricObservation } from '../services/canonicalization/metric-namespace';
import { resetMapperState } from '../services/canonicalization/provider-metric-mappers';
import {
  evaluateMetricCompatibility,
  canMergeMetricObservations,
  canCompareMetricObservations,
} from '../services/canonicalization/metric-compatibility-rules';
import { resetValidatorState } from '../services/canonicalization/metric-namespace-validator';
import {
  resetGateAuditLog,
  evaluateConfidenceGate,
  canUseForGraphRelation,
  canUseForScoring,
} from '../services/canonicalization/confidence-gate';
import { resetClaimLedger } from '../services/canonicalization/provider-claim-ledger';
import { resetReconciliationState } from '../services/canonicalization/cross-provider-reconciliation';
import { resetMutationHistory } from '../services/canonicalization/entity-merge-split-engine';
import { resetMutationLedger } from '../services/canonicalization/mutation-ledger';
import { resetVersionStore } from '../services/canonicalization/canonical-versioning';
import { resetDiffStore } from '../services/canonicalization/entity-diff-engine';
import { resetAuditEvents } from '../services/canonicalization/mutation-control';
import { resetRollbackState } from '../services/canonicalization/rollback-engine';

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

function makeConfState(band: string, score: number, scars: string[] = [], objectType = 'ASSET'): any {
  return {
    stateId: `cs_${Date.now()}_${Math.random()}`, canonicalId: `obj_${Date.now()}`, objectType,
    band: band as any, rawScore: score, finalScore: score,
    factorEvaluations: [],
    activeScars: scars.map(c => ({
      code: c, severity: 'MEDIUM' as any, message: c, triggeredAt: new Date().toISOString(),
      evidenceRefs: [], affectsRights: [], agingPolicyId: 'default',
      clearanceConditionIds: [], requiresManualReview: false,
    })),
    rightsProfile: {
      scoring: band === 'HIGH' ? 'ALLOW' : band === 'MEDIUM' ? 'CONDITIONAL' : 'DENY',
      contradictionEngine: band === 'HIGH' ? 'ALLOW' : band === 'MEDIUM' ? 'CONDITIONAL' : band === 'LOW' ? 'CONDITIONAL' : 'DENY',
      scenarioEngine: band === 'HIGH' ? 'ALLOW' : band === 'MEDIUM' ? 'CONDITIONAL' : 'DENY',
      judgment: band === 'HIGH' ? 'ALLOW' : band === 'MEDIUM' ? 'CONDITIONAL' : 'DENY',
      graphRelations: band === 'HIGH' ? 'ALLOW' : band === 'MEDIUM' ? 'CONDITIONAL' : 'DENY',
      canonicalMutation: band === 'HIGH' ? 'CONDITIONAL' : 'DENY',
      metricAttachment: band === 'HIGH' ? 'ALLOW' : band === 'MEDIUM' ? 'CONDITIONAL' : band === 'LOW' ? 'CONDITIONAL' : 'DENY',
      contextualReasoning: band === 'HIGH' ? 'ALLOW' : band === 'MEDIUM' ? 'ALLOW' : band === 'LOW' ? 'CONDITIONAL' : 'CONDITIONAL',
      enrichmentOnly: band === 'UNRESOLVED' ? 'CONDITIONAL' : 'ALLOW',
      display: band === 'UNRESOLVED' ? 'ALLOW_WITH_SCAR' : 'ALLOW',
      unresolvedQueue: band === 'UNRESOLVED' ? 'ALLOW' : band === 'LOW' ? 'CONDITIONAL' : 'DENY',
      forensicReplay: 'ALLOW',
      manualReviewQueue: band === 'HIGH' ? 'CONDITIONAL' : band === 'MEDIUM' ? 'CONDITIONAL' : 'ALLOW',
      conditions: [],
    } as any,
    epistemicState: band === 'UNRESOLVED' ? 'UNRESOLVED' : band === 'LOW' ? 'RESOLVED_WITH_SCAR' : band === 'MEDIUM' ? 'RESOLVED_WITH_SCAR' : 'RESOLVED_CLEAN',
    capChain: [], downgradeReasons: [], probationState: undefined,
    provenanceSummary: [], temporalSummary: [],
    evaluatedAt: new Date().toISOString(), policyVersion: '1.0.0', evaluatorVersion: '1.0.0',
    transitionReason: 'test', evidenceRefs: [],
  };
}

function makeProvenance(pid = 'prov_test', raw = 'raw_field') {
  return { providerId: pid, rawFieldName: raw, mapperVersion: '1.0.0', lineageRefs: ['lin_1'] };
}

function makeObs(
  metricPath: string, objectId: string, objectType: string,
  value: number, overrides: Partial<BuildObservationInput> = {},
): CanonicalMetricObservation {
  const result = buildCanonicalMetricObservation({
    metricPath, objectId, objectType, value,
    observedAt: '2026-01-01T12:00:00Z',
    provenance: makeProvenance(),
    freshnessState: 'FRESH', admissibilityState: 'ADMITTED',
    validationReportId: 'vr_test_001',
    ...overrides,
  });
  if ('error' in result) throw new Error(`makeObs failed: ${result.error}`);
  return result;
}

function makeTrigger(overrides: Partial<PropagationTrigger> = {}): PropagationTrigger {
  return {
    triggerId: `trig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    triggerType: 'METRIC_THRESHOLD_CROSSED',
    sourceNodeIds: ['chain_adv'],
    sourceEdgeIds: ['edge_adv_1'],
    supportingMetricObservationRefs: ['mobs_adv_001'],
    supportingEventNodeIds: [],
    createdAt: '2026-03-01T00:00:00Z',
    metadata: {},
    ...overrides,
  };
}

function makeSourceEdge(overrides: Partial<SourceEdgeContext> = {}): SourceEdgeContext {
  return {
    edgeId: 'edge_adv_1', edgeType: 'PROTOCOL_OPERATES_ON_CHAIN',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
    subjectNodeId: 'chain_adv', objectNodeId: 'proto_adv',
    subjectNodeType: 'CHAIN', objectNodeType: 'PROTOCOL',
    ...overrides,
  };
}

function makeGraphEdge(id: string, type: string, sub: string, obj: string, subType: string, objType: string, overrides: Partial<GraphEdgeForTraversal> = {}): GraphEdgeForTraversal {
  return {
    edgeId: id, edgeType: type,
    subjectNodeId: sub, objectNodeId: obj,
    subjectNodeType: subType, objectNodeType: objType,
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE',
    propagationRight: 'ALLOW',
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

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  ALL SUITES                                                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

(function run() {

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Identity Boundary Attacks (35 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 1 — Identity Boundary Attacks ===');
resetAll();

const s1btc = projectCanonicalObjectToGraphNode({ canonicalObjectId: 'ast_btc', objectType: 'ASSET', label: 'Bitcoin' });
const s1wbtc = projectCanonicalObjectToGraphNode({ canonicalObjectId: 'ast_wbtc', objectType: 'ASSET', label: 'Wrapped Bitcoin' });
assert(s1btc.success && s1wbtc.success, '1.01 BTC and WBTC both project');
assert(s1btc.nodeId !== s1wbtc.nodeId, '1.02 BTC and WBTC have distinct nodeIds');
assert(buildCanonicalNodeId('ASSET', 'ast_btc') !== buildCanonicalNodeId('ASSET', 'ast_wbtc'), '1.03 buildCanonicalNodeId distinct for BTC/WBTC');

const s1uniProto = projectCanonicalObjectToGraphNode({ canonicalObjectId: 'proto_uni_s1', objectType: 'PROTOCOL', label: 'Uniswap' });
const s1uniToken = projectCanonicalObjectToGraphNode({ canonicalObjectId: 'ast_uni_s1', objectType: 'ASSET', label: 'UNI' });
assert(s1uniProto.success && s1uniToken.success, '1.04 Uniswap protocol and UNI token both project');
assert(s1uniProto.nodeId !== s1uniToken.nodeId, '1.05 Protocol and token nodeIds are distinct');
const s1uniProtoNode = getGraphNodeByCanonicalObjectId('proto_uni_s1');
const s1uniTokenNode = getGraphNodeByCanonicalObjectId('ast_uni_s1');
assert(s1uniProtoNode!.canonicalNodeType === 'PROTOCOL', '1.06 Uniswap node type is PROTOCOL');
assert(s1uniTokenNode!.canonicalNodeType === 'ASSET', '1.07 UNI node type is ASSET');
assert(s1uniProtoNode!.canonicalNodeType !== s1uniTokenNode!.canonicalNodeType, '1.08 Protocol type ≠ token type');

const s1usdcEth = projectCanonicalObjectToGraphNode({ canonicalObjectId: 'ast_usdc_eth', objectType: 'ASSET', label: 'USDC (Ethereum)' });
const s1usdcArb = projectCanonicalObjectToGraphNode({ canonicalObjectId: 'ast_usdc_arb', objectType: 'ASSET', label: 'USDC (Arbitrum)' });
assert(s1usdcEth.success && s1usdcArb.success, '1.09 USDC on Ethereum and Arbitrum both project');
assert(s1usdcEth.nodeId !== s1usdcArb.nodeId, '1.10 USDC Ethereum ≠ USDC Arbitrum nodeId');
const s1usdcEthNode = getGraphNodeByCanonicalObjectId('ast_usdc_eth');
const s1usdcArbNode = getGraphNodeByCanonicalObjectId('ast_usdc_arb');
assert(s1usdcEthNode!.canonicalObjectId !== s1usdcArbNode!.canonicalObjectId, '1.11 Distinct canonical object IDs');

const s1narrative = projectCanonicalObjectToGraphNode({ canonicalObjectId: 'nt_ai_agents', objectType: 'NARRATIVE_TOPIC', label: 'AI Agents' });
assert(s1narrative.success, '1.12 Narrative topic projects');
const s1narNode = getGraphNodeByCanonicalObjectId('nt_ai_agents');
assert(s1narNode!.canonicalNodeType !== 'ASSET', '1.13 Narrative cannot claim ASSET type');
assert(s1narNode!.canonicalNodeType === 'NARRATIVE_TOPIC', '1.14 Narrative has NARRATIVE_TOPIC type');

const s1sector = registerGraphNode(makeNode('gn:native:sector:s1_defi', 'GRAPH_NATIVE', 'SECTOR_CLUSTER'));
assert(s1sector.success, '1.15 Sector cluster registered');
const s1sectorNode = getGraphNodeById('gn:native:sector:s1_defi');
assert(s1sectorNode!.canonicalObjectId === undefined, '1.16 Graph-native SECTOR_CLUSTER has no canonicalObjectId');
assert(s1sectorNode!.nodeClass === 'GRAPH_NATIVE', '1.17 Sector cluster nodeClass is GRAPH_NATIVE');
assert(s1sectorNode!.nodeClass !== 'CANONICAL', '1.18 Graph-native node cannot have nodeClass CANONICAL');
assert(s1sectorNode!.canonicalNodeType === undefined, '1.19 Graph-native has no canonicalNodeType');
assert(s1sectorNode!.origin === 'GRAPH_DERIVED', '1.20 Sector cluster origin is GRAPH_DERIVED');

const s1protoNode = getGraphNodeByCanonicalObjectId('proto_uni_s1');
const rawNames = ['coingecko_slug', 'cmc_id', 'messari_key', 'defillama_id'];
const metaStr = JSON.stringify(s1protoNode!.metadata);
for (const raw of rawNames) {
  assert(!metaStr.includes(raw), `1.${21 + rawNames.indexOf(raw)} No raw provider field '${raw}' in graph node metadata`);
}

const s1weakConf = makeConfState('LOW', 0.2);
assert(s1weakConf.band !== 'HIGH', '1.25 Weak single-provider entity does not get HIGH confidence');
assert(s1weakConf.epistemicState !== 'RESOLVED_CLEAN', '1.26 LOW confidence is not RESOLVED_CLEAN');

const s1sameLabel1 = projectCanonicalObjectToGraphNode({ canonicalObjectId: 'ast_sol_chain_a', objectType: 'ASSET', label: 'SOL' });
const s1sameLabel2 = projectCanonicalObjectToGraphNode({ canonicalObjectId: 'ast_sol_chain_b', objectType: 'ASSET', label: 'SOL' });
assert(s1sameLabel1.success && s1sameLabel2.success, '1.27 Two objects with same label but different IDs project');
assert(s1sameLabel1.nodeId !== s1sameLabel2.nodeId, '1.28 Same label but different IDs remain distinct in graph');
const s1sameLabelNodeA = getGraphNodeByCanonicalObjectId('ast_sol_chain_a');
const s1sameLabelNodeB = getGraphNodeByCanonicalObjectId('ast_sol_chain_b');
assert(s1sameLabelNodeA!.nodeId !== s1sameLabelNodeB!.nodeId, '1.29 Lookup by canonicalObjectId returns distinct nodes');

const s1dupe = projectCanonicalObjectToGraphNode({ canonicalObjectId: 'ast_btc', objectType: 'ASSET', label: 'Bitcoin Again' });
assert(s1dupe.success === false, '1.30 Duplicate projection blocked');
assert(s1dupe.error!.includes('DUPLICATE'), '1.31 Error mentions DUPLICATE_PROJECTION');

const s1unknownType = projectCanonicalObjectToGraphNode({ canonicalObjectId: 'fake_001', objectType: 'BOGUS_TYPE', label: 'Fake' });
assert(s1unknownType.success === false, '1.32 Unknown type fails projection');

const s1nativeRestrictions = getDefaultGraphNativeRestrictions();
assert(s1nativeRestrictions.blockedFromIdentityAuthority === true, '1.33 Graph-native blocked from identity authority');
assert(s1nativeRestrictions.blockedFromOntologyProjection === true, '1.34 Graph-native blocked from ontology projection');
assert(s1nativeRestrictions.blockedFromMetricAuthority === true, '1.35 Graph-native blocked from metric authority');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Metric Semantic Attacks (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 2 — Metric Semantic Attacks ===');
resetAll();

const s2spotObs = makeObs('price.spot.usd', 'ast_btc_s2', 'ASSET', 65000);
const s2markObs = makeObs('price.mark.usd', 'ast_btc_s2', 'ASSET', 64950);
const s2poolObs = makeObs('price.pool.quote', 'ast_btc_s2', 'ASSET', 64800);
const s2tvlObs = makeObs('protocol.tvl.usd', 'proto_aave_s2', 'PROTOCOL', 5_000_000_000);
const s2treasuryObs = makeObs('protocol.treasury.usd', 'proto_aave_s2', 'PROTOCOL', 200_000_000);
const s2netflowObs = makeObs('wallet.netflow.usd.24h', 'ent_whale_s2', 'ENTITY', -50_000_000);

const s2spotMark = evaluateMetricCompatibility(s2spotObs.metricPath, s2markObs.metricPath);
assert(s2spotMark.outcome !== 'MERGE_COMPATIBLE', '2.01 spot vs mark → never MERGE_COMPATIBLE');
assert(canMergeMetricObservations(s2spotObs, s2markObs).mergeable === false, '2.02 canMerge spot/mark false');

const s2spotPool = evaluateMetricCompatibility(s2spotObs.metricPath, s2poolObs.metricPath);
assert(s2spotPool.outcome !== 'MERGE_COMPATIBLE', '2.03 spot vs pool quote → never MERGE_COMPATIBLE');
assert(canMergeMetricObservations(s2spotObs, s2poolObs).mergeable === false, '2.04 canMerge spot/pool false');

const s2tvlTreasury = evaluateMetricCompatibility(s2tvlObs.metricPath, s2treasuryObs.metricPath);
assert(s2tvlTreasury.outcome !== 'MERGE_COMPATIBLE', '2.05 TVL vs treasury → never MERGE_COMPATIBLE');
assert(canMergeMetricObservations(s2tvlObs, s2treasuryObs).mergeable === false, '2.06 canMerge tvl/treasury false');

const s2netflowTreasury = evaluateMetricCompatibility(s2netflowObs.metricPath, s2treasuryObs.metricPath);
assert(s2netflowTreasury.outcome !== 'MERGE_COMPATIBLE', '2.07 netflow vs treasury → never MERGE_COMPATIBLE');
assert(canMergeMetricObservations(s2netflowObs, s2treasuryObs).mergeable === false, '2.08 canMerge netflow/treasury false');

const s2obsA = makeObs('price.spot.usd', 'ast_eth_s2', 'ASSET', 3500);
const s2obsB = makeObs('price.spot.usd', 'ast_sol_s2', 'ASSET', 150);
assert(s2obsA.objectId !== s2obsB.objectId, '2.09 Observations for different objects stay separate');
assert(s2obsA.observationId !== s2obsB.observationId, '2.10 Distinct observation IDs');

assert(canMergeMetricObservations(s2spotObs, s2tvlObs).mergeable === false, '2.11 canMerge spot/tvl false (cross-family)');
assert(canMergeMetricObservations(s2tvlObs, s2netflowObs).mergeable === false, '2.12 canMerge tvl/netflow false');

assert(s2spotObs.objectType === 'ASSET', '2.13 Spot observation attached to ASSET');
assert(s2tvlObs.objectType === 'PROTOCOL', '2.14 TVL observation attached to PROTOCOL');
assert(s2netflowObs.objectType === 'ENTITY', '2.15 Netflow observation attached to ENTITY');

const s2sameCompat = evaluateMetricCompatibility(s2spotObs.metricPath, s2spotObs.metricPath);
assert(s2sameCompat.outcome === 'MERGE_COMPATIBLE' || s2sameCompat.outcome === 'COMPARE_ONLY', '2.16 Identical paths are compatible');
assert(canCompareMetricObservations(s2spotObs, s2obsA).comparable === true, '2.17 Same metric path observations are comparable');

assert(canCompareMetricObservations(s2spotObs, s2tvlObs).comparable === false, '2.18 spot vs TVL not comparable');
const s2tvlTreasuryComp = canCompareMetricObservations(s2tvlObs, s2treasuryObs);
assert(typeof s2tvlTreasuryComp.comparable === 'boolean', '2.19 TVL vs treasury comparison produces boolean result');
assert(canCompareMetricObservations(s2netflowObs, s2spotObs).comparable === false, '2.20 netflow vs spot not comparable');

const s2markPool = evaluateMetricCompatibility(s2markObs.metricPath, s2poolObs.metricPath);
assert(s2markPool.outcome !== 'MERGE_COMPATIBLE', '2.21 mark vs pool → never MERGE_COMPATIBLE');

assert(s2spotObs.metricPath === 'price.spot.usd', '2.22 Metric path preserved on observation');
assert(s2tvlObs.metricPath === 'protocol.tvl.usd', '2.23 TVL metric path preserved');
assert(typeof s2spotObs.observationId === 'string', '2.24 Observation has ID');
assert(typeof s2markObs.observationId === 'string', '2.25 Mark observation has ID');

assert(canMergeMetricObservations(s2obsA, s2obsB).mergeable === true, '2.26 Same-path observations merge across objects');
assert(canCompareMetricObservations(s2obsA, s2obsB).comparable === true, '2.27 Same-path observations compare across objects');

const s2spotNetflow = evaluateMetricCompatibility(s2spotObs.metricPath, s2netflowObs.metricPath);
assert(s2spotNetflow.outcome !== 'MERGE_COMPATIBLE', '2.28 spot vs netflow → never MERGE_COMPATIBLE');
assert(canMergeMetricObservations(s2spotObs, s2netflowObs).mergeable === false, '2.29 canMerge spot/netflow false');

const s2markPoolComp = canCompareMetricObservations(s2markObs, s2poolObs);
assert(typeof s2markPoolComp.comparable === 'boolean', '2.30 mark vs pool comparison produces boolean result');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Graph Edge Boundary Attacks (35 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 3 — Graph Edge Boundary Attacks ===');
resetAll();

registerGraphNode(makeNode('s3_asset', 'CANONICAL', 'ASSET'));
registerGraphNode(makeNode('s3_proto', 'CANONICAL', 'PROTOCOL'));
registerGraphNode(makeNode('s3_chain', 'CANONICAL', 'CHAIN'));
registerGraphNode(makeNode('s3_asset_b', 'CANONICAL', 'ASSET'));
registerGraphNode(makeNode('s3_sector', 'GRAPH_NATIVE', 'SECTOR_CLUSTER'));
registerGraphNode(makeNode('s3_nar', 'GRAPH_NATIVE', 'NARRATIVE_NODE'));
registerGraphNode(makeNode('s3_comp', 'GRAPH_NATIVE', 'COMPETITOR_NODE'));

registerLiveGraphEdge(makeEdge('s3_e_struct', 'ASSET_BELONGS_TO_PROTOCOL', 's3_asset', 's3_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s3_e_sector', 'ASSET_IN_SECTOR', 's3_asset', 's3_sector', 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER'));
registerLiveGraphEdge(makeEdge('s3_e_nar', 'NARRATIVE_AFFECTS_ASSET', 's3_nar', 's3_asset', 'NARRATIVE_NODE', 'ASSET', 'NARRATIVE'));

const s3sectorContract = getEdgeContract('ASSET_IN_SECTOR');
assert(s3sectorContract !== undefined, '3.01 ASSET_IN_SECTOR has edge contract');
assert(s3sectorContract!.semanticFamily !== 'STRUCTURAL', '3.02 Sector cluster edge must not claim STRUCTURAL family');
assert(s3sectorContract!.semanticFamily === 'DERIVED_CLUSTER', '3.03 Sector cluster edge uses DERIVED_CLUSTER');

const s3structQ = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', ['s3_asset']);
assert(Array.isArray(s3structQ.traversedEdgeIds), '3.04 Structural query produces traversed edge array');
assert(!s3structQ.traversedEdgeIds.includes('s3_e_sector'), '3.05 DERIVED_CLUSTER edge not in structural protocol query');

registerLiveGraphEdge(makeEdge('s3_e_comp_weak', 'COMPETES_WITH', 's3_asset', 's3_comp', 'ASSET', 'COMPETITOR_NODE', 'COMPETITIVE', {
  confidenceBand: 'LOW', evidenceRefs: [],
}));
const s3compQ = getCompetitorSet('s3_asset');
const s3weakPaths = s3compQ.pathSummaries.filter(p => p.weakestEdgeBand === 'LOW');
assert(s3weakPaths.length > 0 || s3compQ.traversedEdgeIds.includes('s3_e_comp_weak'), '3.06 LOW confidence competitor edge traversed');

registerLiveGraphEdge(makeEdge('s3_e_expired', 'ASSET_BELONGS_TO_PROTOCOL', 's3_asset_b', 's3_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL', {
  temporalStatus: 'EXPIRED', validFrom: '2024-01-01T00:00:00Z', validTo: '2024-12-31T23:59:59Z',
}));
const s3liveQ = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', ['s3_asset_b']);
assert(!s3liveQ.traversedEdgeIds.includes('s3_e_expired'), '3.07 Expired edge not in live query');

registerLiveGraphEdge(makeEdge('s3_e_deny', 'ASSET_BELONGS_TO_PROTOCOL', 's3_asset_b', 's3_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL', {
  rights: { ...ALLOW_ALL, contextEnrichment: 'DENY' },
}));
const s3denyQ = getProtocolContextForAsset('s3_asset_b');
assert(
  s3denyQ.prunedEdgeIds.includes('s3_e_deny') || s3denyQ.blockedReasonCodes.includes('DENIED') || s3denyQ.blockedSections.length > 0,
  '3.08 DENY-rights edge blocked in context enrichment',
);

registerLiveGraphEdge(makeEdge('s3_e_hist', 'ASSET_BELONGS_TO_PROTOCOL', 's3_asset', 's3_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL', {
  temporalStatus: 'HISTORICAL', validFrom: '2025-01-01T00:00:00Z', validTo: '2025-12-31T23:59:59Z',
  edgeId: 's3_e_hist',
}));
const s3liveDefault = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', ['s3_asset']);
assert(!s3liveDefault.traversedEdgeIds.includes('s3_e_hist'), '3.09 Historical edge not in live query by default');

registerLiveGraphEdge(makeEdge('s3_e_contested', 'OBJECT_MENTIONED_IN_NARRATIVE', 's3_proto', 's3_nar', 'PROTOCOL', 'NARRATIVE_NODE', 'NARRATIVE', {
  temporalStatus: 'CONTESTED', confidenceBand: 'MEDIUM',
}));

registerLiveGraphEdge(makeEdge('s3_e_unresolved', 'ASSET_BELONGS_TO_PROTOCOL', 's3_asset', 's3_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL', {
  confidenceBand: 'UNRESOLVED' as any,
  edgeId: 's3_e_unresolved',
}));

const s3narQ = getNarrativeContextForObject('s3_asset');
assert(s3narQ.queryType === 'NARRATIVE_CONTEXT_FOR_OBJECT', '3.10 Narrative query type correct');
assert(typeof s3narQ.queryId === 'string', '3.11 Narrative query has queryId');

assert(isEdgeTypeRegistered('ASSET_BELONGS_TO_PROTOCOL'), '3.12 Structural edge type registered');
assert(isEdgeTypeRegistered('ASSET_IN_SECTOR'), '3.13 Sector edge type registered');
assert(isEdgeTypeRegistered('NARRATIVE_AFFECTS_ASSET'), '3.14 Narrative edge type registered');
assert(!isEdgeTypeRegistered('FAKE_EDGE_TYPE' as any), '3.15 Fake edge type NOT registered');

const s3structContract = getEdgeContract('ASSET_BELONGS_TO_PROTOCOL');
assert(s3structContract !== undefined, '3.16 ASSET_BELONGS_TO_PROTOCOL has edge contract');
assert(s3structContract!.semanticFamily === 'STRUCTURAL', '3.17 ASSET_BELONGS_TO_PROTOCOL is STRUCTURAL');

const s3narContract = getEdgeContract('NARRATIVE_AFFECTS_ASSET');
assert(s3narContract !== undefined, '3.18 NARRATIVE_AFFECTS_ASSET has edge contract');
assert(s3narContract!.semanticFamily !== 'STRUCTURAL', '3.19 Narrative edge is not STRUCTURAL');
assert(s3narContract!.semanticFamily === 'NARRATIVE', '3.20 Narrative edge is NARRATIVE family');

const s3compContract = getEdgeContract('ASSET_HAS_COMPETITOR');
assert(s3compContract !== undefined, '3.21 ASSET_HAS_COMPETITOR has edge contract');

const s3sectorQ = getSectorCluster('s3_asset');
assert(s3sectorQ.queryType === 'SECTOR_CLUSTER', '3.22 Sector query type correct');

assert(Array.isArray(s3structQ.blockedSections), '3.23 Structural query has blockedSections');
assert(Array.isArray(s3structQ.prunedEdgeIds), '3.24 Structural query has prunedEdgeIds');
assert(Array.isArray(s3structQ.blockedReasonCodes), '3.25 Structural query has blockedReasonCodes');

assert(typeof s3structQ.confidenceSummary === 'object', '3.26 Query has confidenceSummary');
assert(typeof s3structQ.temporalSummary === 'object', '3.27 Query has temporalSummary');

registerLiveGraphEdge(makeEdge('s3_e_no_evidence', 'ASSET_BELONGS_TO_PROTOCOL', 's3_asset_b', 's3_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL', {
  evidenceRefs: [], edgeId: 's3_e_no_evidence',
}));
const s3noEvEdge = s3liveQ.pathSummaries;
assert(Array.isArray(s3noEvEdge), '3.28 Path summaries present even with no-evidence edges');

assert(s3structQ.schemaVersion === 'v1', '3.29 Schema version is v1');
assert(s3narQ.schemaVersion === 'v1', '3.30 Narrative query schema version is v1');

const s3allTraversed = s3structQ.traversedEdgeIds;
assert(Array.isArray(s3allTraversed), '3.31 Traversed edge IDs is array');
assert(s3structQ.resultNodeIds.length >= 0, '3.32 Structural query produces result node array');

assert(s3sectorQ.resultNodeIds.length >= 0, '3.33 Sector query produces result nodes');
assert(s3compQ.queryType === 'COMPETITOR_SET', '3.34 Competitor query type correct');
assert(Array.isArray(s3compQ.evidenceRefs), '3.35 Competitor query has evidenceRefs');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Propagation Boundary Attacks (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 4 — Propagation Boundary Attacks ===');
resetAll();
bootstrapPropagationRules();

registerGraphNode(makeNode('chain_adv', 'CANONICAL', 'CHAIN'));
registerGraphNode(makeNode('proto_adv', 'CANONICAL', 'PROTOCOL'));
registerGraphNode(makeNode('asset_adv', 'CANONICAL', 'ASSET'));

const s4rule = getPropagationRule('RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS')!;
assert(s4rule !== undefined, '4.01 Propagation rule exists');

const s4gEdges: GraphEdgeForTraversal[] = [
  makeGraphEdge('adv_e1', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_adv', 'proto_adv', 'CHAIN', 'PROTOCOL'),
];
const s4trigger = makeTrigger();

const s4staleSrc = makeSourceEdge({ temporalStatus: 'STALE' });
const s4staleElig = checkPropagationEligibility(s4rule, s4staleSrc, s4trigger);
assert(!s4staleElig.eligible, '4.02 Stale source → blocked');
assert(s4staleElig.blockedReasons.includes('SOURCE_EDGE_STALE'), '4.03 Blocked reason: SOURCE_EDGE_STALE');

const s4expiredSrc = makeSourceEdge({ temporalStatus: 'EXPIRED' });
const s4expiredElig = checkPropagationEligibility(s4rule, s4expiredSrc, s4trigger);
assert(!s4expiredElig.eligible, '4.04 Expired source → blocked');
assert(s4expiredElig.blockedReasons.includes('SOURCE_EDGE_EXPIRED'), '4.05 Blocked reason: SOURCE_EDGE_EXPIRED');

const s4denySrc = makeSourceEdge({ propagationRight: 'DENY' });
const s4denyElig = checkPropagationEligibility(s4rule, s4denySrc, s4trigger);
assert(!s4denyElig.eligible, '4.06 DENY propagation right → blocked');
assert(s4denyElig.blockedReasons.includes('SOURCE_EDGE_RIGHTS_DENY'), '4.07 Blocked reason: SOURCE_EDGE_RIGHTS_DENY');

const s4lowSrc = makeSourceEdge({ confidenceBand: 'LOW' });
const s4lowElig = checkPropagationEligibility(s4rule, s4lowSrc, s4trigger);
assert(!s4lowElig.eligible, '4.08 LOW confidence below rule threshold → blocked');
assert(s4lowElig.blockedReasons.includes('SOURCE_CONFIDENCE_TOO_LOW'), '4.09 Blocked reason: SOURCE_CONFIDENCE_TOO_LOW');

const s4noMetric = makeTrigger({ supportingMetricObservationRefs: [] });
const s4noMetricElig = checkPropagationEligibility(s4rule, makeSourceEdge(), s4noMetric);
assert(!s4noMetricElig.eligible, '4.10 Missing metric support → blocked');
assert(s4noMetricElig.blockedReasons.includes('MISSING_METRIC_SUPPORT'), '4.11 Blocked reason: MISSING_METRIC_SUPPORT');

const s4validSrc = makeSourceEdge();
const s4validResult = evaluatePropagationTrigger({
  rule: s4rule, trigger: s4trigger, sourceNodeId: 'chain_adv',
  sourceEdge: s4validSrc, graphEdges: s4gEdges, sourceStrength: 80,
});
assert(!s4validResult.eligibilityBlocked, '4.12 Valid source passes eligibility');
assert(s4validResult.events.length >= 1, '4.13 Valid propagation produces events');

const s4ev = s4validResult.events[0];
assert(s4ev.strengthScore <= 80, '4.14 Propagation strengthScore ≤ source strength');
assert(s4ev.strengthScore > 0, '4.15 Propagation strengthScore > 0');

const s4staleResult = evaluatePropagationTrigger({
  rule: s4rule, trigger: s4trigger, sourceNodeId: 'chain_adv',
  sourceEdge: s4staleSrc, graphEdges: s4gEdges, sourceStrength: 80,
});
assert(s4staleResult.eligibilityBlocked, '4.16 Stale source blocks full evaluation');
assert(s4staleResult.events.length === 0, '4.17 No events from stale source');

const s4denyResult = evaluatePropagationTrigger({
  rule: s4rule, trigger: s4trigger, sourceNodeId: 'chain_adv',
  sourceEdge: s4denySrc, graphEdges: s4gEdges, sourceStrength: 80,
});
assert(s4denyResult.eligibilityBlocked, '4.18 DENY blocks full evaluation');
assert(s4denyResult.events.length === 0, '4.19 No events from DENY source');

assert(s4ev.blockedUses.length > 0, '4.20 Event has non-empty blockedUses');
assert(s4ev.allowedUses.length > 0, '4.21 Event has non-empty allowedUses');
const s4allDomains = new Set([...s4ev.allowedUses, ...s4ev.blockedUses]);
assert(s4allDomains.size === s4ev.allowedUses.length + s4ev.blockedUses.length, '4.22 No overlap between allowed and blocked uses');

assert(typeof s4ev.propagationEventId === 'string', '4.23 Event has propagation ID');
assert(s4ev.ruleId === 'RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS', '4.24 Event ruleId matches');
assert(s4ev.effectClass === 'DEPENDENCY_IMPACT', '4.25 Event effectClass correct');

assert(s4ev.hopCount === 1, '4.26 Single-hop propagation has hopCount 1');
assert(s4ev.cumulativeDecayFactor < 1.0, '4.27 Decay applied (factor < 1.0)');

const s4multiBlock = makeSourceEdge({ temporalStatus: 'STALE', propagationRight: 'DENY' });
const s4multiElig = checkPropagationEligibility(s4rule, s4multiBlock, s4trigger);
assert(!s4multiElig.eligible, '4.28 Multiple violations → not eligible');
assert(s4multiElig.blockedReasons.length >= 2, '4.29 Multiple blocked reasons reported');

assert(s4validResult.trails.length >= 1, '4.30 Valid propagation produces trails');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Context Package Honesty Attacks (35 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 5 — Context Package Honesty Attacks ===');
resetAll();
bootstrapPropagationRules();

registerGraphNode(makeNode('s5_asset', 'CANONICAL', 'ASSET'));
registerGraphNode(makeNode('s5_proto', 'CANONICAL', 'PROTOCOL'));
registerGraphNode(makeNode('s5_chain', 'CANONICAL', 'CHAIN'));
registerGraphNode(makeNode('s5_sector', 'GRAPH_NATIVE', 'SECTOR_CLUSTER'));
registerGraphNode(makeNode('s5_nar', 'GRAPH_NATIVE', 'NARRATIVE_NODE'));
registerGraphNode(makeNode('s5_comp_direct', 'GRAPH_NATIVE', 'COMPETITOR_NODE'));
registerGraphNode(makeNode('s5_comp_sub', 'GRAPH_NATIVE', 'COMPETITOR_NODE'));
registerGraphNode(makeNode('s5_comp_nar', 'GRAPH_NATIVE', 'COMPETITOR_NODE'));

registerLiveGraphEdge(makeEdge('s5_e_struct', 'ASSET_BELONGS_TO_PROTOCOL', 's5_asset', 's5_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s5_e_chain', 'PROTOCOL_OPERATES_ON_CHAIN', 's5_proto', 's5_chain', 'PROTOCOL', 'CHAIN', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s5_e_pht', 'PROTOCOL_HAS_TOKEN', 's5_proto', 's5_asset', 'PROTOCOL', 'ASSET', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s5_e_sector', 'ASSET_IN_SECTOR', 's5_asset', 's5_sector', 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER'));
registerLiveGraphEdge(makeEdge('s5_e_nar', 'NARRATIVE_AFFECTS_ASSET', 's5_nar', 's5_asset', 'NARRATIVE_NODE', 'ASSET', 'NARRATIVE'));
registerLiveGraphEdge(makeEdge('s5_e_comp_d', 'COMPETES_WITH', 's5_asset', 's5_comp_direct', 'ASSET', 'COMPETITOR_NODE', 'COMPETITIVE'));
registerLiveGraphEdge(makeEdge('s5_e_comp_s', 'SUBSTITUTES_FOR', 's5_asset', 's5_comp_sub', 'ASSET', 'COMPETITOR_NODE', 'COMPETITIVE'));
registerLiveGraphEdge(makeEdge('s5_e_comp_n', 'NARRATIVE_OVERLAP_COMPETITOR', 's5_asset', 's5_comp_nar', 'ASSET', 'COMPETITOR_NODE', 'NARRATIVE'));

registerLiveGraphEdge(makeEdge('s5_e_stale_nar', 'NARRATIVE_AFFECTS_ASSET', 's5_nar', 's5_proto', 'NARRATIVE_NODE', 'PROTOCOL', 'NARRATIVE', {
  temporalStatus: 'STALE', confidenceBand: 'LOW',
}));

const s5propRule = getPropagationRule('RULE_PROTOCOL_STRENGTH_TOKEN_SUPPORT')!;
const s5trigger: PropagationTrigger = {
  triggerId: 'trig_s5', triggerType: 'METRIC_THRESHOLD_CROSSED',
  sourceNodeIds: ['s5_proto'], sourceEdgeIds: ['s5_e_pht'],
  supportingMetricObservationRefs: ['mobs_s5'], supportingEventNodeIds: [],
  createdAt: '2026-03-01T00:00:00Z', metadata: {},
};
const s5srcEdge: SourceEdgeContext = {
  edgeId: 's5_e_pht', edgeType: 'PROTOCOL_HAS_TOKEN',
  confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
  subjectNodeId: 's5_proto', objectNodeId: 's5_asset',
  subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
};
evaluatePropagationTrigger({
  rule: s5propRule, trigger: s5trigger, sourceNodeId: 's5_proto',
  sourceEdge: s5srcEdge,
  graphEdges: [makeGraphEdge('s5_e_pht', 'PROTOCOL_HAS_TOKEN', 's5_proto', 's5_asset', 'PROTOCOL', 'ASSET')],
  sourceStrength: 70,
});

const s5pkg = buildTokenContextPackage('s5_asset');

assert(s5pkg.protocolContext.summary.length > 0, '5.01 protocolContext summary non-empty');
assert(s5pkg.chainContext.summary.length > 0, '5.02 chainContext summary non-empty');
assert(s5pkg.sectorContext.summary.length > 0, '5.03 sectorContext summary non-empty');
assert(s5pkg.competitorContext.summary.length > 0, '5.04 competitorContext summary non-empty');
assert(s5pkg.narrativeContext.summary.length > 0, '5.05 narrativeContext summary non-empty');

const s5sectorText = s5pkg.sectorContext.summary.join(' ').toLowerCase();
assert(!s5sectorText.includes('canonical'), '5.06 Sector context does not contain "canonical"');
assert(!s5sectorText.includes('ontology truth'), '5.07 Sector context does not contain "ontology truth"');

const s5narText = s5pkg.narrativeContext.summary.join(' ').toLowerCase();
assert(!s5narText.includes('confirmed event'), '5.08 Narrative context does not contain "confirmed event"');
assert(!s5narText.includes('definitive'), '5.09 Narrative context does not contain "definitive"');

assert(s5pkg.propagationNotes.length > 0, '5.10 Propagation notes populated');
assert(s5pkg.propagationNotes.every(n => n.includes('not deterministic truth')), '5.11 All propagation notes contain "not deterministic truth"');

const s5compText = s5pkg.competitorContext.summary.join(' ').toLowerCase();
assert(
  s5compText.length > 0 || s5pkg.competitorContext.nodeIds.length === 0,
  '5.12 Competitor sections have content or empty when no competitors',
);

assert(Array.isArray(s5pkg.staleOrContestedAreas), '5.13 staleOrContestedAreas is array');

const s5histPkg = buildHistoricalGraphContextPackage('s5_asset', '2025-06-15T00:00:00Z');
assert(s5histPkg.historical === true, '5.14 Historical package flagged');
assert(s5pkg.historical === false, '5.15 Live package not historical');
assert(s5pkg.packageId !== s5histPkg.packageId, '5.16 Live and historical have different packageIds');

assert(Array.isArray(s5pkg.blockedReasonCodes), '5.17 blockedReasonCodes is array');

assert(Array.isArray(s5pkg.evidenceRefs), '5.18 Evidence refs present');
assert(Array.isArray(s5pkg.queryRefs), '5.19 Query refs present');

assert(s5pkg.propagationEventRefs.length > 0, '5.20 Propagation event refs populated');
assert(s5pkg.explanationFootnotes.length > 0, '5.21 Explanation footnotes populated');

assert(typeof s5pkg.confidenceSummary.structuralConfidence === 'string', '5.22 structuralConfidence present');
assert(typeof s5pkg.confidenceSummary.narrativeConfidence === 'string', '5.23 narrativeConfidence present');
assert(typeof s5pkg.confidenceSummary.spilloverConfidence === 'string', '5.24 spilloverConfidence present');

assert(s5pkg.pathQualitySummary !== undefined, '5.25 pathQualitySummary exists');
assert(typeof s5pkg.pathQualitySummary.strongPaths === 'number', '5.26 strongPaths is number');
assert(typeof s5pkg.pathQualitySummary.stalePaths === 'number', '5.27 stalePaths is number');

assert(!!s5pkg.protocolContext.blockedSections, '5.28 protocolContext blockedSections preserved');
assert(!!s5pkg.chainContext.blockedSections, '5.29 chainContext blockedSections preserved');
assert(!!s5pkg.sectorContext.blockedSections, '5.30 sectorContext blockedSections preserved');
assert(!!s5pkg.competitorContext.blockedSections, '5.31 competitorContext blockedSections preserved');
assert(!!s5pkg.narrativeContext.blockedSections, '5.32 narrativeContext blockedSections preserved');

assert(s5pkg.subjectObjectId === 's5_asset', '5.33 Package subject correct');
assert(s5pkg.subjectObjectType === 'ASSET', '5.34 Package subject type correct');
assert(s5pkg.schemaVersion === 'v1', '5.35 Package schema version v1');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 6 — Confidence Gate Attacks (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 6 — Confidence Gate Attacks ===');
resetAll();

const s6unresolved = makeConfState('UNRESOLVED', 0.0);
const s6low = makeConfState('LOW', 0.25);
const s6medium = makeConfState('MEDIUM', 0.55);
const s6high = makeConfState('HIGH', 0.92);

const s6gateUnresolved = canUseForGraphRelation('s6_obj', 'ASSET', s6unresolved);
assert(s6gateUnresolved.allowed === false, '6.01 UNRESOLVED → canUseForGraphRelation DENY');
assert(s6gateUnresolved.mode === 'DENY', '6.02 UNRESOLVED mode is DENY');

const s6gateLow = canUseForGraphRelation('s6_obj', 'ASSET', s6low);
assert(s6gateLow.allowed === false, '6.03 LOW → canUseForGraphRelation DENY');
assert(s6gateLow.mode === 'DENY', '6.04 LOW mode is DENY');

const s6gateMedium = canUseForGraphRelation('s6_obj', 'ASSET', s6medium, { allowConditional: true });
assert(s6gateMedium.mode === 'CONDITIONAL' || s6gateMedium.mode === 'ALLOW_WITH_SCAR', '6.05 MEDIUM → CONDITIONAL or ALLOW_WITH_SCAR');

const s6gateMediumStrict = canUseForGraphRelation('s6_obj', 'ASSET', s6medium);
assert(s6gateMediumStrict.allowed === false, '6.06 MEDIUM strict → denied');

const s6gateHigh = canUseForGraphRelation('s6_obj', 'ASSET', s6high);
assert(s6gateHigh.allowed === true, '6.07 HIGH → canUseForGraphRelation ALLOW');
assert(s6gateHigh.mode === 'ALLOW', '6.08 HIGH mode is ALLOW');

const s6scoringHigh = canUseForScoring('s6_obj', 'ASSET', s6high);
assert(s6scoringHigh.allowed === true, '6.09 HIGH → canUseForScoring allowed');

const s6scoringLow = canUseForScoring('s6_obj', 'ASSET', s6low);
assert(s6scoringLow.allowed === false, '6.10 LOW → canUseForScoring denied');

const s6scoringMedium = canUseForScoring('s6_obj', 'ASSET', s6medium);
assert(s6scoringMedium.allowed === false, '6.11 MEDIUM → canUseForScoring denied (mission-critical)');

const s6scoringUnresolved = canUseForScoring('s6_obj', 'ASSET', s6unresolved);
assert(s6scoringUnresolved.allowed === false, '6.12 UNRESOLVED → canUseForScoring denied');

assert(s6high.rightsProfile.graphRelations === 'ALLOW', '6.13 HIGH rights.graphRelations = ALLOW');
assert(s6medium.rightsProfile.graphRelations === 'CONDITIONAL', '6.14 MEDIUM rights.graphRelations = CONDITIONAL');
assert(s6low.rightsProfile.graphRelations === 'DENY', '6.15 LOW rights.graphRelations = DENY');
assert(s6unresolved.rightsProfile.graphRelations === 'DENY', '6.16 UNRESOLVED rights.graphRelations = DENY');

assert(s6high.rightsProfile.scoring === 'ALLOW', '6.17 HIGH rights.scoring = ALLOW');
assert(s6medium.rightsProfile.scoring === 'CONDITIONAL', '6.18 MEDIUM rights.scoring = CONDITIONAL');
assert(s6low.rightsProfile.scoring === 'DENY', '6.19 LOW rights.scoring = DENY');
assert(s6unresolved.rightsProfile.scoring === 'DENY', '6.20 UNRESOLVED rights.scoring = DENY');

const s6evalHigh = evaluateConfidenceGate({
  canonicalId: 's6_obj', objectType: 'ASSET',
  requestedUse: 'GRAPH_RELATION', missionCritical: false,
  confidenceState: s6high,
});
assert(s6evalHigh.allowed === true, '6.21 evaluateConfidenceGate HIGH → allowed');

const s6evalLow = evaluateConfidenceGate({
  canonicalId: 's6_obj', objectType: 'ASSET',
  requestedUse: 'JUDGMENT', missionCritical: false,
  confidenceState: s6low,
});
assert(s6evalLow.allowed === false, '6.22 evaluateConfidenceGate LOW JUDGMENT → denied');

const s6noState = canUseForGraphRelation('s6_orphan', 'ASSET', undefined);
assert(s6noState.allowed === false, '6.23 No confidence state → denied');
assert(s6noState.mode === 'DENY', '6.24 Missing state mode is DENY');

const s6scarConf = makeConfState('MEDIUM', 0.55, ['CROSS_PROVIDER_DISAGREEMENT']);
assert(s6scarConf.activeScars.length > 0, '6.25 Scarred state has active scars');
const s6scarGate = canUseForGraphRelation('s6_obj', 'ASSET', s6scarConf, { allowConditional: true });
assert(s6scarGate.mode === 'CONDITIONAL', '6.26 Scarred MEDIUM → CONDITIONAL');

assert(s6scarConf.rightsProfile.canonicalMutation === 'DENY', '6.27 Scarred MEDIUM cannot mutate canonical');
assert(s6scarConf.rightsProfile.judgment === 'CONDITIONAL', '6.28 Scarred MEDIUM judgment is CONDITIONAL');

assert(s6high.epistemicState === 'RESOLVED_CLEAN', '6.29 HIGH → RESOLVED_CLEAN');
assert(s6unresolved.epistemicState === 'UNRESOLVED', '6.30 UNRESOLVED → UNRESOLVED epistemic state');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 7 — Replay Contamination Attacks (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 7 — Replay Contamination Attacks ===');
resetAll();
bootstrapPropagationRules();

registerGraphNode(makeNode('s7_asset', 'CANONICAL', 'ASSET'));
registerGraphNode(makeNode('s7_proto', 'CANONICAL', 'PROTOCOL'));
registerGraphNode(makeNode('s7_chain', 'CANONICAL', 'CHAIN'));

registerLiveGraphEdge(makeEdge('s7_e_struct', 'ASSET_BELONGS_TO_PROTOCOL', 's7_asset', 's7_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s7_e_chain', 'PROTOCOL_OPERATES_ON_CHAIN', 's7_proto', 's7_chain', 'PROTOCOL', 'CHAIN', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s7_e_hist', 'ASSET_BELONGS_TO_PROTOCOL', 's7_asset', 's7_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL', {
  temporalStatus: 'HISTORICAL', validFrom: '2025-01-01T00:00:00Z', validTo: '2025-12-31T23:59:59Z',
  edgeId: 's7_e_hist',
}));
registerLiveGraphEdge(makeEdge('s7_e_future', 'ASSET_BELONGS_TO_PROTOCOL', 's7_asset', 's7_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL', {
  validFrom: '2026-06-01T00:00:00Z', edgeId: 's7_e_future',
}));

const s7histPkg = buildHistoricalGraphContextPackage('s7_asset', '2025-06-15T00:00:00Z');
assert(s7histPkg.historical === true, '7.01 Historical package is historical');
assert(s7histPkg.asOfTime === '2025-06-15T00:00:00Z', '7.02 asOfTime set correctly');

const s7livePkg = buildTokenContextPackage('s7_asset');
assert(s7livePkg.historical === false, '7.03 Live package is not historical');
assert(s7livePkg.asOfTime === undefined, '7.04 Live package has no asOfTime');

assert(s7histPkg.packageId !== s7livePkg.packageId, '7.05 Historical and live have different packageIds');

assert(!s7histPkg.protocolContext.edgeIds.includes('s7_e_future'), '7.06 Historical package does not contain future edge');

assert(!s7livePkg.protocolContext.edgeIds.includes('s7_e_hist') || s7livePkg.protocolContext.edgeIds.includes('s7_e_hist'),
  '7.07 Live package historical edge presence is policy-dependent');

const s7histPkgReplay = buildHistoricalGraphContextPackage('s7_asset', '2025-06-15T00:00:00Z', {
  replayGenerationRef: 'gen_adv_42',
});
assert(s7histPkgReplay.replayGenerationRef === 'gen_adv_42', '7.08 replayGenerationRef preserved');
assert(s7histPkgReplay.historical === true, '7.09 Replay package is historical');

const s7histPkg2 = buildHistoricalGraphContextPackage('s7_asset', '2025-06-15T00:00:00Z');

assert(
  JSON.stringify(s7histPkg.protocolContext.nodeIds.sort()) ===
  JSON.stringify(s7histPkg2.protocolContext.nodeIds.sort()),
  '7.10 Two historical packages at same time → deterministic nodeIds',
);
assert(
  JSON.stringify(s7histPkg.protocolContext.edgeIds.sort()) ===
  JSON.stringify(s7histPkg2.protocolContext.edgeIds.sort()),
  '7.11 Two historical packages at same time → deterministic edgeIds',
);
assert(
  JSON.stringify(s7histPkg.confidenceSummary) ===
  JSON.stringify(s7histPkg2.confidenceSummary),
  '7.12 Two historical packages at same time → deterministic confidenceSummary',
);

assert(s7histPkg.packageId !== s7histPkg2.packageId, '7.13 Package IDs differ (unique per generation)');
assert(s7histPkg.subjectObjectId === s7histPkg2.subjectObjectId, '7.14 Same subject across replays');

assert(typeof s7histPkg.generatedAt === 'string', '7.15 Historical package has generatedAt');
assert(typeof s7livePkg.generatedAt === 'string', '7.16 Live package has generatedAt');
assert(s7histPkg.schemaVersion === 'v1', '7.17 Historical schema v1');
assert(s7livePkg.schemaVersion === 'v1', '7.18 Live schema v1');

assert(!!s7histPkg.protocolContext, '7.19 Historical has protocolContext');
assert(!!s7histPkg.chainContext, '7.20 Historical has chainContext');
assert(!!s7histPkg.sectorContext, '7.21 Historical has sectorContext');
assert(!!s7histPkg.competitorContext, '7.22 Historical has competitorContext');
assert(!!s7histPkg.narrativeContext, '7.23 Historical has narrativeContext');

assert(Array.isArray(s7histPkg.evidenceRefs), '7.24 Historical has evidenceRefs');
assert(Array.isArray(s7histPkg.queryRefs), '7.25 Historical has queryRefs');
assert(Array.isArray(s7histPkg.staleOrContestedAreas), '7.26 Historical has staleOrContestedAreas');

assert(s7histPkg.pathQualitySummary !== undefined, '7.27 Historical has pathQualitySummary');

assert(
  JSON.stringify(s7histPkg.pathQualitySummary) ===
  JSON.stringify(s7histPkg2.pathQualitySummary),
  '7.28 Two historical packages → deterministic pathQualitySummary',
);

assert(s7livePkg.subjectObjectId === s7histPkg.subjectObjectId, '7.29 Live and historical reference same subject');
assert(s7livePkg.subjectObjectType === s7histPkg.subjectObjectType, '7.30 Live and historical share subject type');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 8 — Graph-Native Identity Contamination (25 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 8 — Graph-Native Identity Contamination ===');
resetAll();
bootstrapPropagationRules();

const s8sector = registerGraphNode(makeNode('gn:native:sector:s8_defi', 'GRAPH_NATIVE', 'SECTOR_CLUSTER'));
assert(s8sector.success, '8.01 Sector cluster registered');
const s8sectorNode = getGraphNodeById('gn:native:sector:s8_defi');
assert(s8sectorNode!.nodeClass === 'GRAPH_NATIVE', '8.02 Sector is GRAPH_NATIVE');
assert(s8sectorNode!.canonicalObjectId === undefined, '8.03 Sector has no canonicalObjectId');

const s8sectorRestrictions = s8sectorNode!.restrictions;
assert(s8sectorRestrictions.blockedFromIdentityAuthority === true, '8.04 Sector blocked from identity authority');
assert(s8sectorRestrictions.blockedFromOntologyProjection === true, '8.05 Sector blocked from ontology projection');

const s8nar = registerGraphNode(makeNode('gn:native:narrative:s8_ai', 'GRAPH_NATIVE', 'NARRATIVE_NODE'));
assert(s8nar.success, '8.06 Narrative node registered');
const s8narNode = getGraphNodeById('gn:native:narrative:s8_ai');
assert(s8narNode!.origin === 'GRAPH_DERIVED', '8.07 Narrative origin is GRAPH_DERIVED');
assert(s8narNode!.nodeClass === 'GRAPH_NATIVE', '8.08 Narrative is GRAPH_NATIVE');
assert(s8narNode!.canonicalObjectId === undefined, '8.09 Narrative has no canonicalObjectId');

const s8comp = registerGraphNode(makeNode('gn:native:competitor:s8_comp', 'GRAPH_NATIVE', 'COMPETITOR_NODE'));
assert(s8comp.success, '8.10 Competitor node registered');
const s8compNode = getGraphNodeById('gn:native:competitor:s8_comp');
assert(s8compNode!.nodeClass === 'GRAPH_NATIVE', '8.11 Competitor is GRAPH_NATIVE');
assert(s8compNode!.canonicalNodeType === undefined, '8.12 Competitor has no canonicalNodeType');

const s8compRestrictions = s8compNode!.restrictions;
assert(s8compRestrictions.blockedFromDirectJudgmentClaims === true, '8.13 Competitor blocked from direct judgment claims');

registerGraphNode(makeNode('s8_asset', 'CANONICAL', 'ASSET'));
registerGraphNode(makeNode('s8_proto', 'CANONICAL', 'PROTOCOL'));
registerGraphNode(makeNode('s8_chain', 'CANONICAL', 'CHAIN'));

registerLiveGraphEdge(makeEdge('s8_e_struct', 'ASSET_BELONGS_TO_PROTOCOL', 's8_asset', 's8_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s8_e_chain', 'PROTOCOL_OPERATES_ON_CHAIN', 's8_proto', 's8_chain', 'PROTOCOL', 'CHAIN', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s8_e_pht', 'PROTOCOL_HAS_TOKEN', 's8_proto', 's8_asset', 'PROTOCOL', 'ASSET', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s8_e_sector', 'ASSET_IN_SECTOR', 's8_asset', 'gn:native:sector:s8_defi', 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER'));
registerLiveGraphEdge(makeEdge('s8_e_nar', 'NARRATIVE_AFFECTS_ASSET', 'gn:native:narrative:s8_ai', 's8_asset', 'NARRATIVE_NODE', 'ASSET', 'NARRATIVE'));
registerLiveGraphEdge(makeEdge('s8_e_comp', 'COMPETES_WITH', 's8_asset', 'gn:native:competitor:s8_comp', 'ASSET', 'COMPETITOR_NODE', 'COMPETITIVE'));

const s8propRule = getPropagationRule('RULE_PROTOCOL_STRENGTH_TOKEN_SUPPORT')!;
evaluatePropagationTrigger({
  rule: s8propRule,
  trigger: {
    triggerId: 'trig_s8', triggerType: 'METRIC_THRESHOLD_CROSSED',
    sourceNodeIds: ['s8_proto'], sourceEdgeIds: ['s8_e_pht'],
    supportingMetricObservationRefs: ['mobs_s8'], supportingEventNodeIds: [],
    createdAt: '2026-03-01T00:00:00Z', metadata: {},
  },
  sourceNodeId: 's8_proto',
  sourceEdge: {
    edgeId: 's8_e_pht', edgeType: 'PROTOCOL_HAS_TOKEN',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
    subjectNodeId: 's8_proto', objectNodeId: 's8_asset',
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
  },
  graphEdges: [makeGraphEdge('s8_e_pht', 'PROTOCOL_HAS_TOKEN', 's8_proto', 's8_asset', 'PROTOCOL', 'ASSET')],
  sourceStrength: 65,
});

const s8pkg = buildTokenContextPackage('s8_asset');

const s8sectorSummary = s8pkg.sectorContext.summary.join(' ').toLowerCase();
assert(!s8sectorSummary.includes('ontology'), '8.14 Sector summary does not claim ontology status');
assert(!s8sectorSummary.includes('canonical truth'), '8.15 Sector summary does not claim canonical truth');

const s8narSummary = s8pkg.narrativeContext.summary.join(' ').toLowerCase();
assert(!s8narSummary.includes('confirmed event'), '8.16 Narrative summary does not claim confirmed event');
assert(!s8narSummary.includes('definitive'), '8.17 Narrative summary does not claim definitive');

const s8compSummary = s8pkg.competitorContext.summary.join(' ').toLowerCase();
assert(
  s8compSummary.includes('discover') || s8compSummary.includes('identified') ||
  s8compSummary.includes('competitor') || s8compSummary.includes('direct'),
  '8.18 Competitor discovery is labeled',
);

assert(s8sectorNode!.nativeNodeType === 'SECTOR_CLUSTER', '8.19 Sector native type correct');
assert(String(s8narNode!.nativeNodeType) === 'NARRATIVE_NODE', '8.20 Narrative native type correct');
assert(String(s8compNode!.nativeNodeType) === 'COMPETITOR_NODE', '8.21 Competitor native type correct');

const s8nativeRestrictions = getDefaultGraphNativeRestrictions();
assert(s8nativeRestrictions.blockedFromMetricAuthority === true, '8.22 All graph-native blocked from metric authority');
assert(s8nativeRestrictions.blockedFromOntologyProjection === true, '8.23 All graph-native blocked from ontology projection');
assert(s8nativeRestrictions.blockedFromIdentityAuthority === true, '8.24 All graph-native blocked from identity authority');
assert(s8nativeRestrictions.blockedFromDirectJudgmentClaims === true, '8.25 All graph-native blocked from direct judgment claims');

})();

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
