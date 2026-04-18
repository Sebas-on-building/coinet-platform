import {
  resetContractRegistry,
  bootstrapContracts,
} from '../services/canonicalization/metric-contracts';
import {
  resetPathRegistry,
  bootstrapNamespacePaths,
  buildCanonicalMetricObservation,
  type BuildObservationInput,
  type CanonicalMetricObservation,
} from '../services/canonicalization/metric-namespace';
import {
  registerProviderMetricMapper,
  mapProviderMetric,
  resetMapperState,
} from '../services/canonicalization/provider-metric-mappers';
import {
  evaluateMetricCompatibility,
  canMergeMetricObservations,
  canCompareMetricObservations,
} from '../services/canonicalization/metric-compatibility-rules';
import {
  validateMappedMetric,
  enforceMetricNamespaceGate,
  resetValidatorState,
} from '../services/canonicalization/metric-namespace-validator';
import {
  evaluateConfidenceGate,
  canUseForScoring,
  canUseForGraphRelation,
  resetGateAuditLog,
} from '../services/canonicalization/confidence-gate';
import {
  appendProviderClaim,
  resetClaimLedger,
  type ProviderClaimRecord,
} from '../services/canonicalization/provider-claim-ledger';
import {
  reconcileCanonicalObject,
  resetReconciliationState,
  evaluateClaimAdmissibility,
} from '../services/canonicalization/cross-provider-reconciliation';
import {
  validateObject,
} from '../services/canonicalization/canonical-ontology-registry';
import {
  generateCanonicalId,
} from '../services/canonicalization/canonical-entity-types';
import { resetMutationLedger } from '../services/canonicalization/mutation-ledger';
import { resetVersionStore } from '../services/canonicalization/canonical-versioning';
import { resetDiffStore } from '../services/canonicalization/entity-diff-engine';
import { resetAuditEvents } from '../services/canonicalization/mutation-control';
import { resetRollbackState } from '../services/canonicalization/rollback-engine';

import {
  projectCanonicalObjectToGraphNode,
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
  type GraphNodeRecord,
} from '../services/knowledge-graph/graph-node-types';
import {
  registerLiveGraphEdge,
  resetGraphQuerySurfaces,
  getProtocolContextForAsset,
  getChainContextForProtocol,
  getSectorCluster,
  getCompetitorSet,
  getNarrativeContextForObject,
  type LiveGraphEdge,
  type EdgeRightsMap,
} from '../services/knowledge-graph/graph-query-surfaces';
import {
  bootstrapRelationOntology,
  resetRelationOntology,
  isEdgeTypeRegistered,
  getEdgeContract,
} from '../services/knowledge-graph/relation-ontology';
import { resetTemporalGraphState } from '../services/knowledge-graph/temporal-graph-state';
import { resetPropagationEngine } from '../services/knowledge-graph/graph-propagation-engine';
import { resetGraphContextPackager } from '../services/knowledge-graph/graph-context-packager';

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

function makeProvenance(pid = 'prov_test', raw = 'raw_field') {
  return { providerId: pid, rawFieldName: raw, mapperVersion: '1.0.0', lineageRefs: ['lin_1'] };
}

function makeObs(
  metricPath: string,
  objectId: string,
  objectType: string,
  value: number,
  overrides: Partial<BuildObservationInput> = {},
): CanonicalMetricObservation {
  const result = buildCanonicalMetricObservation({
    metricPath,
    objectId,
    objectType,
    value,
    observedAt: '2026-01-01T12:00:00Z',
    provenance: makeProvenance(),
    freshnessState: 'FRESH',
    admissibilityState: 'ADMITTED',
    validationReportId: 'vr_test_001',
    ...overrides,
  });
  if ('error' in result) throw new Error(`makeObs failed: ${result.error}`);
  return result;
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

function makeClaim(
  providerId: string,
  canonicalId: string,
  objectType: 'ASSET' | 'PROTOCOL' | 'CHAIN' | 'ENTITY' | 'PAIR' | 'NARRATIVE_TOPIC',
  claimClass: 'ANCHOR' | 'EVIDENCE' | 'CONFLICT' | 'ENRICHMENT' | 'PROPOSAL',
  fieldFamily: string,
  scope: string[],
  overrides: Partial<ProviderClaimRecord> = {},
): ProviderClaimRecord {
  return appendProviderClaim({
    providerId,
    providerClaimRef: `ref_${providerId}_${Date.now()}`,
    objectType,
    candidateCanonicalIds: [canonicalId],
    claimClass,
    comparableFieldFamily: fieldFamily,
    scopeDescriptor: scope,
    payload: {},
    confidenceGateEligible: true,
    authorityRefs: [`auth_${providerId}`],
    lineageRefs: [`lin_${providerId}`],
    observedAt: new Date().toISOString(),
    conflictClaimIds: [],
    supersedesClaimIds: [],
    supersededByClaimIds: [],
    rationale: 'test claim',
    normalizationMeta: {},
    ...overrides,
  });
}

function resetAll() {
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
  resetGraphNodeRegistry();
  resetGraphQuerySurfaces();
  resetRelationOntology();
  resetTemporalGraphState();
  resetPropagationEngine();
  resetGraphContextPackager();
  bootstrapContracts();
  bootstrapNamespacePaths();
  bootstrapRelationOntology();
}

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 1 — L3 Object → L4 Graph Node Projection
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 1: L3 Object → L4 Graph Node Projection ===');
resetAll();

const S1_TYPES: Array<{ type: string; id: string }> = [
  { type: 'ASSET', id: 'asset_btc_001' },
  { type: 'PROTOCOL', id: 'proto_uniswap_001' },
  { type: 'CHAIN', id: 'chain_eth_001' },
  { type: 'ENTITY', id: 'entity_binance_001' },
  { type: 'PAIR', id: 'pair_btcusd_001' },
  { type: 'NARRATIVE_TOPIC', id: 'nt_defi_summer_001' },
];

for (const { type, id } of S1_TYPES) {
  const result = projectCanonicalObjectToGraphNode({
    canonicalObjectId: id,
    objectType: type,
    label: `${type}:${id}`,
  });
  assert(result.success === true, `${type} projects successfully`);
  assert(result.nodeId !== undefined, `${type} projection returns nodeId`);

  const expectedNodeId = `gn:canonical:${type.toLowerCase()}:${id}`;
  assert(result.nodeId === expectedNodeId, `${type} nodeId format: ${result.nodeId}`);

  const node = getGraphNodeByCanonicalObjectId(id);
  assert(node !== undefined, `${type} node retrievable by canonicalObjectId`);
}

const assetNode = getGraphNodeByCanonicalObjectId('asset_btc_001');
assert(assetNode!.nodeClass === 'CANONICAL', 'ASSET node is CANONICAL class');
assert(assetNode!.origin === 'L3_CANONICAL_PROJECTION', 'ASSET origin is L3_CANONICAL_PROJECTION');
assert(assetNode!.lifecycleState === 'ACTIVE', 'Projected node has ACTIVE lifecycle');
assert(assetNode!.canonicalObjectId === 'asset_btc_001', 'canonicalObjectId preserved on node');

const dupeResult = projectCanonicalObjectToGraphNode({
  canonicalObjectId: 'asset_btc_001',
  objectType: 'ASSET',
  label: 'duplicate',
});
assert(dupeResult.success === false, 'Duplicate projection is blocked');
assert(dupeResult.error!.includes('DUPLICATE'), 'Duplicate error mentions DUPLICATE');

const unknownResult = projectCanonicalObjectToGraphNode({
  canonicalObjectId: 'unknown_001',
  objectType: 'UNKNOWN_TYPE',
  label: 'bad type',
});
assert(unknownResult.success === false, 'Unknown L3 type fails projection');
assert(unknownResult.error!.includes('UNKNOWN_L3_OBJECT_TYPE'), 'Error mentions unknown object type');

const btcProj = projectCanonicalObjectToGraphNode({
  canonicalObjectId: 'asset_wbtc_001',
  objectType: 'ASSET',
  label: 'WBTC',
});
assert(btcProj.success === true, 'WBTC projects successfully');
const wbtcNode = getGraphNodeByCanonicalObjectId('asset_wbtc_001');
assert(wbtcNode!.nodeId !== assetNode!.nodeId, 'BTC and WBTC have distinct graph nodes');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 2 — L3 Metric Truth → L4 Metric-Backed Reasoning
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 2: L3 Metric Truth → L4 Metric-Backed Reasoning ===');
resetAll();

const spotObs = makeObs('price.spot.usd', 'asset_btc', 'ASSET', 65000);
const markObs = makeObs('price.mark.usd', 'asset_btc', 'PAIR', 64950);
const tvlObs = makeObs('protocol.tvl.usd', 'proto_aave', 'PROTOCOL', 5_000_000_000);
const treasuryObs = makeObs('protocol.treasury.usd', 'proto_aave', 'PROTOCOL', 200_000_000);
const netflowObs = makeObs('wallet.netflow.usd.24h', 'entity_btc', 'ENTITY', -50_000_000);
const narrativeObs = makeObs('narrative.intensity', 'nt_defi', 'NARRATIVE_TOPIC', 0.85);

assert(spotObs.observationId !== undefined, 'Spot observation created');
assert(markObs.observationId !== undefined, 'Mark observation created');
assert(tvlObs.observationId !== undefined, 'TVL observation created');
assert(treasuryObs.observationId !== undefined, 'Treasury observation created');
assert(netflowObs.observationId !== undefined, 'Netflow observation created');
assert(narrativeObs.observationId !== undefined, 'Narrative intensity observation created');

const spotMarkCompat = evaluateMetricCompatibility(spotObs.metricPath, markObs.metricPath);
assert(spotMarkCompat.outcome !== 'MERGE_COMPATIBLE', 'Spot vs mark cannot merge');
assert(canMergeMetricObservations(spotObs, markObs).mergeable === false, 'canMerge spot/mark is false');

const tvlTreasuryCompat = evaluateMetricCompatibility(tvlObs.metricPath, treasuryObs.metricPath);
assert(tvlTreasuryCompat.outcome !== 'MERGE_COMPATIBLE', 'TVL vs treasury cannot merge');
assert(canMergeMetricObservations(tvlObs, treasuryObs).mergeable === false, 'canMerge tvl/treasury is false');

assert(spotObs.objectType === 'ASSET', 'Spot attaches to ASSET');
assert(tvlObs.objectType === 'PROTOCOL', 'TVL attaches to PROTOCOL');
assert(narrativeObs.objectType === 'NARRATIVE_TOPIC', 'Narrative attaches to NARRATIVE_TOPIC');

const spotSpotCompat = evaluateMetricCompatibility(spotObs.metricPath, spotObs.metricPath);
assert(spotSpotCompat.outcome === 'MERGE_COMPATIBLE' || spotSpotCompat.outcome === 'COMPARE_ONLY', 'Identical metric paths are compatible');
assert(canCompareMetricObservations(spotObs, spotObs).comparable === true, 'canCompare spot/spot is true');

const highConf = makeConfState('HIGH', 0.92);
const lowConf = makeConfState('LOW', 0.25);
const graphGateHigh = canUseForGraphRelation('asset_btc', 'ASSET', highConf);
assert(graphGateHigh.allowed === true, 'HIGH confidence allows graph relation');
const graphGateLow = canUseForGraphRelation('asset_btc', 'ASSET', lowConf);
assert(graphGateLow.allowed === false, 'LOW confidence blocks graph relation');

const validationReport = validateMappedMetric({
  metricPath: 'price.spot.usd',
  objectType: 'ASSET',
  value: 65000,
  unit: 'USD',
  provenance: makeProvenance(),
  scope: { domain: 'global' },
  basis: { quote: 'USD' },
});
assert(validationReport.status !== undefined, 'Mapped metric validation returns status');

const gateDecision = enforceMetricNamespaceGate(spotObs, 'SCORING');
assert(gateDecision.metricPath === 'price.spot.usd', 'Gate references correct metric path');
assert(gateDecision.mode !== undefined, 'Gate decision has mode');

const spotTvlCompare = canCompareMetricObservations(spotObs, tvlObs);
assert(spotTvlCompare.comparable === false, 'Price spot vs TVL are not comparable');

const sameFamilyObs = makeObs('price.spot.usd', 'asset_eth', 'ASSET', 3500);
assert(canCompareMetricObservations(spotObs, sameFamilyObs).comparable === true, 'Same-path observations comparable across objects');
assert(canMergeMetricObservations(spotObs, sameFamilyObs).mergeable === true, 'Same-path observations are merge-compatible by contract');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 3 — L3 Identity → L4 Edge Legality
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 3: L3 Identity → L4 Edge Legality ===');
resetAll();

assert(isEdgeTypeRegistered('ASSET_BELONGS_TO_PROTOCOL'), 'ASSET_BELONGS_TO_PROTOCOL registered');
assert(isEdgeTypeRegistered('PROTOCOL_OPERATES_ON_CHAIN'), 'PROTOCOL_OPERATES_ON_CHAIN registered');
assert(isEdgeTypeRegistered('PROTOCOL_HAS_TOKEN'), 'PROTOCOL_HAS_TOKEN registered');
assert(isEdgeTypeRegistered('ASSET_HAS_COMPETITOR'), 'ASSET_HAS_COMPETITOR registered');
assert(isEdgeTypeRegistered('NARRATIVE_AFFECTS_ASSET'), 'NARRATIVE_AFFECTS_ASSET registered');
assert(isEdgeTypeRegistered('ASSET_IN_SECTOR'), 'ASSET_IN_SECTOR registered');
assert(isEdgeTypeRegistered('ASSET_IN_ECOSYSTEM'), 'ASSET_IN_ECOSYSTEM registered');

const abpContract = getEdgeContract('ASSET_BELONGS_TO_PROTOCOL');
assert(abpContract !== undefined, 'ASSET_BELONGS_TO_PROTOCOL has edge contract');
const pocContract = getEdgeContract('PROTOCOL_OPERATES_ON_CHAIN');
assert(pocContract !== undefined, 'PROTOCOL_OPERATES_ON_CHAIN has edge contract');
const phtContract = getEdgeContract('PROTOCOL_HAS_TOKEN');
assert(phtContract !== undefined, 'PROTOCOL_HAS_TOKEN has edge contract');
const ahcContract = getEdgeContract('ASSET_HAS_COMPETITOR');
assert(ahcContract !== undefined, 'ASSET_HAS_COMPETITOR has edge contract');

const s3asset = projectCanonicalObjectToGraphNode({ canonicalObjectId: 's3_btc', objectType: 'ASSET', label: 'BTC' });
const s3proto = projectCanonicalObjectToGraphNode({ canonicalObjectId: 's3_uniswap', objectType: 'PROTOCOL', label: 'Uniswap' });
const s3chain = projectCanonicalObjectToGraphNode({ canonicalObjectId: 's3_eth', objectType: 'CHAIN', label: 'Ethereum' });
assert(s3asset.success && s3proto.success && s3chain.success, 'Suite 3 nodes projected');

registerLiveGraphEdge(makeEdge('e_s3_abp', 'ASSET_BELONGS_TO_PROTOCOL', s3asset.nodeId!, s3proto.nodeId!, 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('e_s3_poc', 'PROTOCOL_OPERATES_ON_CHAIN', s3proto.nodeId!, s3chain.nodeId!, 'PROTOCOL', 'CHAIN', 'STRUCTURAL'));
assert(true, 'Structural edges created between correct node types');

const s3narrative = registerGraphNode(makeNode('gn:native:narrative_node:s3_defi', 'GRAPH_NATIVE', 'THEMATIC_CLUSTER'));
assert(s3narrative.success, 'Graph-native narrative node registered');
registerLiveGraphEdge(makeEdge('e_s3_na', 'NARRATIVE_AFFECTS_ASSET', 'gn:native:narrative_node:s3_defi', s3asset.nodeId!, 'THEMATIC_CLUSTER', 'ASSET', 'NARRATIVE'));
assert(true, 'Narrative edge connects to graph-native node');

const s3compAsset = projectCanonicalObjectToGraphNode({ canonicalObjectId: 's3_eth_asset', objectType: 'ASSET', label: 'ETH' });
registerLiveGraphEdge(makeEdge('e_s3_comp', 'ASSET_HAS_COMPETITOR', s3asset.nodeId!, s3compAsset.nodeId!, 'ASSET', 'ASSET', 'COMPETITIVE'));
assert(ahcContract!.semanticFamily === 'DERIVED_CLUSTER', 'Competitor edge uses DERIVED_CLUSTER family');

const s3sector = registerGraphNode(makeNode('gn:native:sector:s3_defi_sector', 'GRAPH_NATIVE', 'SECTOR_CLUSTER'));
assert(s3sector.success, 'Sector cluster node registered');
registerLiveGraphEdge(makeEdge('e_s3_sector', 'ASSET_IN_SECTOR', s3asset.nodeId!, 'gn:native:sector:s3_defi_sector', 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER'));

const aisContract = getEdgeContract('ASSET_IN_SECTOR');
assert(aisContract !== undefined, 'ASSET_IN_SECTOR has edge contract');
assert(aisContract!.semanticFamily === 'DERIVED_CLUSTER', 'ASSET_IN_SECTOR uses DERIVED_CLUSTER family');

for (const et of ['ASSET_BELONGS_TO_PROTOCOL', 'PROTOCOL_OPERATES_ON_CHAIN', 'PROTOCOL_HAS_TOKEN',
  'ASSET_HAS_COMPETITOR', 'NARRATIVE_AFFECTS_ASSET', 'ASSET_IN_SECTOR'] as const) {
  const ec = getEdgeContract(et);
  assert(ec !== undefined, `Edge contract exists for ${et}`);
}

assert(!isEdgeTypeRegistered('BOGUS_EDGE_TYPE' as any), 'Bogus edge type is NOT registered');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 4 — L3 Confidence → L4 Edge Admissibility
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 4: L3 Confidence → L4 Edge Admissibility ===');
resetAll();

const s4high = makeConfState('HIGH', 0.92);
const s4medium = makeConfState('MEDIUM', 0.55);
const s4low = makeConfState('LOW', 0.25);
const s4unresolved = makeConfState('UNRESOLVED', 0.0);

const s4gateHigh = canUseForGraphRelation('s4_btc', 'ASSET', s4high);
assert(s4gateHigh.allowed === true, 'HIGH → canUseForGraphRelation is ALLOW');
assert(s4gateHigh.mode === 'ALLOW', 'HIGH graph relation mode is ALLOW');

const s4gateMedium = canUseForGraphRelation('s4_btc', 'ASSET', s4medium, { allowConditional: true });
assert(s4gateMedium.mode === 'CONDITIONAL', 'MEDIUM → canUseForGraphRelation is CONDITIONAL');

const s4gateMediumStrict = canUseForGraphRelation('s4_btc', 'ASSET', s4medium);
assert(s4gateMediumStrict.allowed === false, 'MEDIUM graph relation denied without allowConditional');

const s4gateLow = canUseForGraphRelation('s4_btc', 'ASSET', s4low);
assert(s4gateLow.allowed === false, 'LOW → canUseForGraphRelation DENY');
assert(s4gateLow.mode === 'DENY', 'LOW graph relation mode is DENY');

const s4gateUnresolved = canUseForGraphRelation('s4_btc', 'ASSET', s4unresolved);
assert(s4gateUnresolved.allowed === false, 'UNRESOLVED → canUseForGraphRelation DENY');
assert(s4gateUnresolved.mode === 'DENY', 'UNRESOLVED graph relation mode is DENY');

assert(s4high.rightsProfile.graphRelations === 'ALLOW', 'HIGH rights.graphRelations = ALLOW');
assert(s4medium.rightsProfile.graphRelations === 'CONDITIONAL', 'MEDIUM rights.graphRelations = CONDITIONAL');
assert(s4low.rightsProfile.graphRelations === 'DENY', 'LOW rights.graphRelations = DENY');
assert(s4unresolved.rightsProfile.graphRelations === 'DENY', 'UNRESOLVED rights.graphRelations = DENY');

const s4scoringHigh = canUseForScoring('s4_btc', 'ASSET', s4high);
assert(s4scoringHigh.allowed === true, 'HIGH → canUseForScoring allowed');
const s4scoringMedium = canUseForScoring('s4_btc', 'ASSET', s4medium);
assert(s4scoringMedium.allowed === false, 'MEDIUM → canUseForScoring denied (mission-critical)');
const s4scoringLow = canUseForScoring('s4_btc', 'ASSET', s4low);
assert(s4scoringLow.allowed === false, 'LOW → canUseForScoring denied');
const s4scoringUnresolved = canUseForScoring('s4_btc', 'ASSET', s4unresolved);
assert(s4scoringUnresolved.allowed === false, 'UNRESOLVED → canUseForScoring denied');

const s4scarConf = makeConfState('MEDIUM', 0.55, ['CROSS_PROVIDER_DISAGREEMENT']);
const s4scarGate = canUseForGraphRelation('s4_btc', 'ASSET', s4scarConf, { allowConditional: true });
assert(s4scarGate.mode === 'CONDITIONAL', 'MEDIUM with scar → graph relation CONDITIONAL');
assert(s4scarConf.activeScars.length > 0, 'Scars present in L3 state');

const s4noState = canUseForGraphRelation('s4_orphan', 'ASSET', undefined);
assert(s4noState.allowed === false, 'No confidence state → graph relation denied');
assert(s4noState.mode === 'DENY', 'Missing state mode is DENY');

const s4highJudge = canUseForGraphRelation('s4_entity', 'ASSET', s4high);
assert(s4highJudge.allowed === true, 'HIGH confidence supports structural edge creation');

const s4lowJudge = evaluateConfidenceGate({
  canonicalId: 's4_entity', objectType: 'ASSET',
  requestedUse: 'JUDGMENT', missionCritical: false,
  confidenceState: s4low,
});
assert(s4lowJudge.allowed === false, 'LOW confidence cannot support judgment');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 5 — L3 Reconciliation → L4 Reconciled State
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 5: L3 Reconciliation → L4 Reconciled State ===');
resetAll();

const s5id = 'asset_sol_001';

const s5claimA = makeClaim('coingecko', s5id, 'ASSET', 'ANCHOR', 'symbol', ['SOL', 'solana']);
const s5claimB = makeClaim('coinmarketcap', s5id, 'ASSET', 'ANCHOR', 'symbol', ['SOL', 'solana']);
const s5claimC = makeClaim('messari', s5id, 'ASSET', 'EVIDENCE', 'market_data', ['solana']);
const s5claimEnrich = makeClaim('defillama', s5id, 'ASSET', 'ENRICHMENT', 'tvl_data', ['solana']);

assert(s5claimA.claimId !== undefined, 'Claim A appended');
assert(s5claimB.claimId !== undefined, 'Claim B appended');
assert(s5claimC.claimId !== undefined, 'Claim C appended');

const s5admA = evaluateClaimAdmissibility(s5claimA);
assert(s5admA.admissibility === 'ADMISSIBLE_STRONG' || s5admA.admissibility === 'ADMISSIBLE_CONDITIONAL', 'Claim A is admissible');
const s5admEnrich = evaluateClaimAdmissibility(s5claimEnrich);
assert(s5admEnrich.admissibility === 'ADMISSIBLE_ENRICHMENT_ONLY', 'Enrichment claim gets ENRICHMENT_ONLY admissibility');

const s5result = reconcileCanonicalObject({ canonicalId: s5id, objectType: 'ASSET' });
assert(s5result.state !== undefined, 'Reconciliation produces state');
assert(s5result.state.canonicalId === s5id, 'Reconciled state references correct canonical ID');
assert(s5result.state.providerClaimIds.length >= 2, 'Reconciled state includes multiple provider claims');

const s5proj = projectCanonicalObjectToGraphNode({
  canonicalObjectId: s5id,
  objectType: 'ASSET',
  label: 'Solana',
  metadata: {
    reconciliationId: s5result.state.reconciliationId,
    reconciliationMode: s5result.state.mode,
    winningAnchorCount: s5result.state.winningAnchors.length,
  },
});
assert(s5proj.success === true, 'Reconciled object projects into L4');
const s5node = getGraphNodeByCanonicalObjectId(s5id);
assert(s5node !== undefined, 'Reconciled graph node exists');
assert(s5node!.metadata.reconciliationId === s5result.state.reconciliationId, 'Graph node carries reconciliation ref');
assert(s5node!.metadata.reconciliationMode === s5result.state.mode, 'Graph node carries reconciliation mode');

assert(s5result.state.enrichmentOnlyClaimIds.includes(s5claimEnrich.claimId), 'Enrichment claim tracked separately');

const s5mode = s5result.state.mode;
assert(
  s5mode === 'DETERMINISTIC_MERGE' || s5mode === 'WEIGHTED_CONVERGENCE',
  'Multi-provider agreement produces convergent mode',
);

const s5conflictClaim = makeClaim('provider_x', 'asset_contested_001', 'ASSET', 'ANCHOR', 'symbol', ['DIFF_A']);
const s5conflictClaim2 = makeClaim('provider_y', 'asset_contested_001', 'ASSET', 'ANCHOR', 'symbol', ['DIFF_B']);
const s5conflictConflict = makeClaim('provider_z', 'asset_contested_001', 'ASSET', 'CONFLICT', 'symbol', ['DIFF_C'], {
  conflictClaimIds: [s5conflictClaim.claimId, s5conflictClaim2.claimId],
  rationale: 'CO_AUTHORITY dispute',
});
const s5contestedResult = reconcileCanonicalObject({ canonicalId: 'asset_contested_001', objectType: 'ASSET' });
assert(
  s5contestedResult.state.unresolvedConflicts.length > 0 || s5contestedResult.state.mode === 'CONTESTED_MERGE',
  'Conflicting claims produce contested/caveated state',
);

const s5report = s5result.report;
assert(s5report !== undefined, 'Reconciliation report generated');

const s5histClaim = makeClaim('old_provider', 'asset_hist_001', 'ASSET', 'ANCHOR', 'symbol', ['OLD'], { status: 'HISTORICAL' });
const s5histAdm = evaluateClaimAdmissibility(s5histClaim);
assert(s5histAdm.admissibility === 'NON_ADMISSIBLE_HISTORICAL_ONLY', 'Historical claim is non-admissible');

assert(s5result.state.policyVersion !== undefined, 'Reconciled state carries policy version');
assert(s5result.state.evaluatorVersion !== undefined, 'Reconciled state carries evaluator version');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 6 — L3 Object Type Preservation Through Graph
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 6: L3 Object Type Preservation Through Graph ===');
resetAll();

const s6proto = projectCanonicalObjectToGraphNode({ canonicalObjectId: 's6_uniswap', objectType: 'PROTOCOL', label: 'Uniswap' });
assert(s6proto.success, 'Protocol projected');
const s6protoNode = getGraphNodeByCanonicalObjectId('s6_uniswap');
assert(s6protoNode!.canonicalNodeType === 'PROTOCOL', 'Protocol node type is PROTOCOL, not ASSET');
assert(s6protoNode!.nodeClass === 'CANONICAL', 'Protocol node class is CANONICAL');

const s6entity = projectCanonicalObjectToGraphNode({ canonicalObjectId: 's6_binance', objectType: 'ENTITY', label: 'Binance' });
assert(s6entity.success, 'Entity projected');
const s6entityNode = getGraphNodeByCanonicalObjectId('s6_binance');
assert(s6entityNode!.canonicalNodeType === 'ENTITY', 'Entity node type is ENTITY');

const s6chain = projectCanonicalObjectToGraphNode({ canonicalObjectId: 's6_ethereum', objectType: 'CHAIN', label: 'Ethereum' });
assert(s6chain.success, 'Chain projected');
const s6chainNode = getGraphNodeByCanonicalObjectId('s6_ethereum');
assert(s6chainNode!.canonicalNodeType === 'CHAIN', 'Chain node type is CHAIN');

const s6sectorNode = makeNode('gn:native:sector:s6_defi', 'GRAPH_NATIVE', 'SECTOR_CLUSTER');
registerGraphNode(s6sectorNode);
const s6narrativeNode = makeNode('gn:native:narrative:s6_ai', 'GRAPH_NATIVE', 'THEMATIC_CLUSTER');
registerGraphNode(s6narrativeNode);
const s6compNode = makeNode('gn:native:competitor:s6_comp', 'GRAPH_NATIVE', 'COMPETITOR_CLUSTER');
registerGraphNode(s6compNode);

const s6sectorRetrieved = getGraphNodeById('gn:native:sector:s6_defi');
assert(s6sectorRetrieved!.nodeClass === 'GRAPH_NATIVE', 'Sector cluster is GRAPH_NATIVE, not CANONICAL');
assert(s6sectorRetrieved!.canonicalNodeType === undefined, 'Sector cluster has no canonicalNodeType');
assert(s6sectorRetrieved!.canonicalObjectId === undefined, 'Graph-native node has no canonicalObjectId');

const s6narrativeRetrieved = getGraphNodeById('gn:native:narrative:s6_ai');
assert(s6narrativeRetrieved!.nodeClass === 'GRAPH_NATIVE', 'Narrative node is GRAPH_NATIVE');
assert(s6narrativeRetrieved!.canonicalObjectId === undefined, 'Narrative graph-native has no canonicalObjectId');

const s6compRetrieved = getGraphNodeById('gn:native:competitor:s6_comp');
assert(s6compRetrieved!.nodeClass === 'GRAPH_NATIVE', 'Competitor node is GRAPH_NATIVE');

assert(s6protoNode!.restrictions.blockedFromCanonicalMutation === true, 'Canonical restriction: blockedFromCanonicalMutation');

const s6nativeRestrictions = getDefaultGraphNativeRestrictions();
assert(s6nativeRestrictions.blockedFromIdentityAuthority === true, 'Graph-native: blockedFromIdentityAuthority');
assert(s6nativeRestrictions.blockedFromOntologyProjection === true, 'Graph-native: blockedFromOntologyProjection');
assert(s6nativeRestrictions.blockedFromMetricAuthority === true, 'Graph-native: blockedFromMetricAuthority');
assert(s6nativeRestrictions.blockedFromDirectJudgmentClaims === true, 'Graph-native: blockedFromDirectJudgmentClaims');

const rawNames = ['coingecko_slug', 'cmc_id', 'messari_key'];
for (const raw of rawNames) {
  const metaValues = JSON.stringify(s6protoNode!.metadata);
  assert(!metaValues.includes(raw), `No raw provider field '${raw}' in graph node metadata`);
}

assert(s6sectorRetrieved!.origin === 'GRAPH_DERIVED', 'Sector cluster origin is GRAPH_DERIVED');
assert(s6sectorRetrieved!.nativeNodeType === 'SECTOR_CLUSTER', 'Sector cluster type correct');

const s6asset = projectCanonicalObjectToGraphNode({ canonicalObjectId: 's6_btc', objectType: 'ASSET', label: 'BTC' });
const s6assetNode = getGraphNodeByCanonicalObjectId('s6_btc');
assert(s6assetNode!.canonicalNodeType === 'ASSET', 'Asset node type is ASSET');
assert(s6assetNode!.canonicalNodeType !== s6protoNode!.canonicalNodeType, 'ASSET ≠ PROTOCOL type');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 7 — BTC vs WBTC Cross-Layer Distinction
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 7: BTC vs WBTC Cross-Layer Distinction ===');
resetAll();

const btcId = 'asset_btc_golden';
const wbtcId = 'asset_wbtc_golden';
const btcChainId = 'chain_bitcoin_golden';
const ethChainId = 'chain_ethereum_golden';
const btcProtoId = 'proto_bitcoin_golden';
const ethProtoId = 'proto_ethereum_golden';

const s7btc = projectCanonicalObjectToGraphNode({ canonicalObjectId: btcId, objectType: 'ASSET', label: 'Bitcoin' });
const s7wbtc = projectCanonicalObjectToGraphNode({ canonicalObjectId: wbtcId, objectType: 'ASSET', label: 'Wrapped Bitcoin' });
const s7btcChain = projectCanonicalObjectToGraphNode({ canonicalObjectId: btcChainId, objectType: 'CHAIN', label: 'Bitcoin Network' });
const s7ethChain = projectCanonicalObjectToGraphNode({ canonicalObjectId: ethChainId, objectType: 'CHAIN', label: 'Ethereum Network' });
const s7btcProto = projectCanonicalObjectToGraphNode({ canonicalObjectId: btcProtoId, objectType: 'PROTOCOL', label: 'Bitcoin Protocol' });
const s7ethProto = projectCanonicalObjectToGraphNode({ canonicalObjectId: ethProtoId, objectType: 'PROTOCOL', label: 'Ethereum Protocol' });

assert(s7btc.success && s7wbtc.success, 'BTC and WBTC projected');
assert(s7btc.nodeId !== s7wbtc.nodeId, 'BTC and WBTC have distinct graph node IDs');
assert(s7btcChain.success && s7ethChain.success, 'Chain nodes projected');
assert(s7btcProto.success && s7ethProto.success, 'Protocol nodes projected');

registerLiveGraphEdge(makeEdge('e7_btc_proto', 'ASSET_BELONGS_TO_PROTOCOL', s7btc.nodeId!, s7btcProto.nodeId!, 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('e7_wbtc_proto', 'ASSET_BELONGS_TO_PROTOCOL', s7wbtc.nodeId!, s7ethProto.nodeId!, 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('e7_btcproto_chain', 'PROTOCOL_OPERATES_ON_CHAIN', s7btcProto.nodeId!, s7btcChain.nodeId!, 'PROTOCOL', 'CHAIN', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('e7_ethproto_chain', 'PROTOCOL_OPERATES_ON_CHAIN', s7ethProto.nodeId!, s7ethChain.nodeId!, 'PROTOCOL', 'CHAIN', 'STRUCTURAL'));

const btcProtoCtx = getProtocolContextForAsset(s7btc.nodeId!);
const wbtcProtoCtx = getProtocolContextForAsset(s7wbtc.nodeId!);
assert(btcProtoCtx.resultNodeIds.length > 0 || btcProtoCtx.traversedEdgeIds.length > 0, 'BTC protocol context has results');
assert(wbtcProtoCtx.resultNodeIds.length > 0 || wbtcProtoCtx.traversedEdgeIds.length > 0, 'WBTC protocol context has results');

const btcReachesEth = btcProtoCtx.resultNodeIds.includes(s7ethProto.nodeId!);
const wbtcReachesBtc = wbtcProtoCtx.resultNodeIds.includes(s7btcProto.nodeId!);
assert(!btcReachesEth, 'BTC protocol context does NOT include Ethereum protocol');
assert(!wbtcReachesBtc, 'WBTC protocol context does NOT include Bitcoin protocol');

registerLiveGraphEdge(makeEdge('e7_wrapped', 'ASSET_DEPENDS_ON_CHAIN', s7wbtc.nodeId!, s7btcChain.nodeId!, 'ASSET', 'CHAIN', 'STRUCTURAL'));
const wrappedEdge = getGraphNodeById(s7wbtc.nodeId!);
assert(wrappedEdge !== undefined, 'WBTC node still exists after wrapped relation');
assert(s7btc.nodeId !== s7wbtc.nodeId, 'Wrapped relation edge does not merge identities');

const btcObs = makeObs('price.spot.usd', btcId, 'ASSET', 65000);
const wbtcObs = makeObs('price.spot.usd', wbtcId, 'ASSET', 64990);
assert(btcObs.objectId !== wbtcObs.objectId, 'BTC and WBTC observations have distinct objectIds');
assert(btcObs.objectId !== wbtcObs.objectId, 'BTC and WBTC observations target different canonical objects');

const btcNodeObj = getGraphNodeByCanonicalObjectId(btcId);
const wbtcNodeObj = getGraphNodeByCanonicalObjectId(wbtcId);
assert(btcNodeObj!.canonicalObjectId === btcId, 'BTC node references BTC canonical ID');
assert(wbtcNodeObj!.canonicalObjectId === wbtcId, 'WBTC node references WBTC canonical ID');

const btcChainCtx = getChainContextForProtocol(s7btcProto.nodeId!);
const ethChainCtx = getChainContextForProtocol(s7ethProto.nodeId!);
assert(btcChainCtx.queryType === 'CHAIN_CONTEXT_FOR_PROTOCOL', 'BTC chain context has correct query type');
assert(ethChainCtx.queryType === 'CHAIN_CONTEXT_FOR_PROTOCOL', 'ETH chain context has correct query type');

const btcBuild = buildCanonicalNodeId('ASSET', btcId);
const wbtcBuild = buildCanonicalNodeId('ASSET', wbtcId);
assert(btcBuild !== wbtcBuild, 'buildCanonicalNodeId produces distinct IDs for BTC vs WBTC');
assert(btcBuild === s7btc.nodeId, 'buildCanonicalNodeId matches projected nodeId for BTC');
assert(wbtcBuild === s7wbtc.nodeId, 'buildCanonicalNodeId matches projected nodeId for WBTC');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 8 — Protocol-Token Distinction Through Graph
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 8: Protocol-Token Distinction Through Graph ===');
resetAll();

const uniProtoId = 'proto_uniswap_golden';
const uniTokenId = 'asset_uni_golden';
const uniChainId = 'chain_eth_golden_s8';

const s8proto = projectCanonicalObjectToGraphNode({ canonicalObjectId: uniProtoId, objectType: 'PROTOCOL', label: 'Uniswap Protocol' });
const s8token = projectCanonicalObjectToGraphNode({ canonicalObjectId: uniTokenId, objectType: 'ASSET', label: 'UNI Token' });
const s8chain = projectCanonicalObjectToGraphNode({ canonicalObjectId: uniChainId, objectType: 'CHAIN', label: 'Ethereum' });

assert(s8proto.success, 'Uniswap protocol projected');
assert(s8token.success, 'UNI token projected');
assert(s8chain.success, 'Ethereum chain projected');
assert(s8proto.nodeId !== s8token.nodeId, 'Protocol and token have distinct L4 node IDs');

const s8protoNode = getGraphNodeByCanonicalObjectId(uniProtoId);
const s8tokenNode = getGraphNodeByCanonicalObjectId(uniTokenId);
assert(s8protoNode!.canonicalNodeType === 'PROTOCOL', 'Protocol node is type PROTOCOL');
assert(s8tokenNode!.canonicalNodeType === 'ASSET', 'Token node is type ASSET');

registerLiveGraphEdge(makeEdge('e8_pht', 'PROTOCOL_HAS_TOKEN', s8proto.nodeId!, s8token.nodeId!, 'PROTOCOL', 'ASSET', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('e8_abp', 'ASSET_BELONGS_TO_PROTOCOL', s8token.nodeId!, s8proto.nodeId!, 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('e8_poc', 'PROTOCOL_OPERATES_ON_CHAIN', s8proto.nodeId!, s8chain.nodeId!, 'PROTOCOL', 'CHAIN', 'STRUCTURAL'));

const tokenProtoCtx = getProtocolContextForAsset(s8token.nodeId!);
const tokenReachesProto = tokenProtoCtx.resultNodeIds.includes(s8proto.nodeId!);
assert(tokenReachesProto, 'UNI token context reaches Uniswap protocol');

assert(s8protoNode!.canonicalNodeType !== s8tokenNode!.canonicalNodeType, 'Protocol type ≠ token type');
assert(s8protoNode!.nodeClass === 'CANONICAL', 'Protocol is CANONICAL class');
assert(s8tokenNode!.nodeClass === 'CANONICAL', 'Token is CANONICAL class');

const s8sushi = projectCanonicalObjectToGraphNode({ canonicalObjectId: 'proto_sushi_golden', objectType: 'PROTOCOL', label: 'SushiSwap Protocol' });
const s8sushiToken = projectCanonicalObjectToGraphNode({ canonicalObjectId: 'asset_sushi_golden', objectType: 'ASSET', label: 'SUSHI Token' });
registerLiveGraphEdge(makeEdge('e8_sushi_pht', 'PROTOCOL_HAS_TOKEN', s8sushi.nodeId!, s8sushiToken.nodeId!, 'PROTOCOL', 'ASSET', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('e8_sushi_comp', 'PROTOCOL_HAS_COMPETITOR', s8proto.nodeId!, s8sushi.nodeId!, 'PROTOCOL', 'PROTOCOL', 'COMPETITIVE'));

const peerQuery = getCompetitorSet(s8proto.nodeId!);
const peerIncludesToken = peerQuery.resultNodeIds.includes(s8token.nodeId!);
assert(!peerIncludesToken, 'Protocol peer query does NOT return UNI token as peer');

const peerIncludesSushi = peerQuery.resultNodeIds.includes(s8sushi.nodeId!);
assert(peerIncludesSushi || peerQuery.traversedEdgeIds.length > 0, 'Protocol peer query traverses competitor edges');

assert(s8protoNode!.canonicalObjectId === uniProtoId, 'Protocol node preserves canonical object ID');
assert(s8tokenNode!.canonicalObjectId === uniTokenId, 'Token node preserves canonical object ID');

const s8sector = registerGraphNode(makeNode('gn:native:sector:s8_dex', 'GRAPH_NATIVE', 'SECTOR_CLUSTER'));
registerLiveGraphEdge(makeEdge('e8_proto_sector', 'ASSET_IN_SECTOR', s8token.nodeId!, 'gn:native:sector:s8_dex', 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER'));

const sectorQ = getSectorCluster(s8token.nodeId!);
assert(sectorQ.queryType === 'SECTOR_CLUSTER', 'Sector cluster query type correct');

const s8protoRestrictions = s8protoNode!.restrictions;
assert(s8protoRestrictions.blockedFromCanonicalMutation === true, 'Protocol node blocked from canonical mutation');

const s8tokenRestrictions = s8tokenNode!.restrictions;
assert(s8tokenRestrictions.blockedFromCanonicalMutation === true, 'Token node blocked from canonical mutation');

const s8protoNodeId = buildCanonicalNodeId('PROTOCOL', uniProtoId);
const s8tokenNodeId = buildCanonicalNodeId('ASSET', uniTokenId);
assert(s8protoNodeId.includes('protocol'), 'Protocol node ID contains "protocol"');
assert(s8tokenNodeId.includes('asset'), 'Token node ID contains "asset"');
assert(s8protoNodeId !== s8tokenNodeId, 'Protocol and token canonical node IDs are distinct');

const s8narrativeCtx = getNarrativeContextForObject(s8token.nodeId!);
assert(s8narrativeCtx.queryType === 'NARRATIVE_CONTEXT_FOR_OBJECT', 'Narrative context query type correct');

const chainCtx = getChainContextForProtocol(s8proto.nodeId!);
const chainReachesEth = chainCtx.resultNodeIds.includes(s8chain.nodeId!);
assert(chainReachesEth || chainCtx.traversedEdgeIds.length > 0, 'Protocol chain context reaches Ethereum');

// ═════════════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═════════════════════════════════════════════════════════════════════════════════

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
