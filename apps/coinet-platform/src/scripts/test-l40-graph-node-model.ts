/**
 * L4.0 — Graph Object Model Bootstrap: Certification Test
 *
 * Six suites, 60+ assertions.
 *   A — Node type system
 *   B — Canonical projection
 *   C — Graph-native validation
 *   D — Capabilities and restrictions
 *   E — Anti-fake suite
 *   F — Lifecycle and indexing
 */
import assert from 'assert';

import {
  ALL_CANONICAL_NODE_TYPES, ALL_GRAPH_NATIVE_NODE_TYPES,
  REQUIRED_NATIVE_METADATA,
  getDefaultCanonicalCapabilities, getDefaultCanonicalRestrictions,
  getDefaultGraphNativeCapabilities, getDefaultGraphNativeRestrictions,
} from '../services/knowledge-graph/graph-node-types';
import type {
  GraphNodeRecord, GraphNodeCapabilities, GraphNodeRestrictions,
  CanonicalNodeType, GraphNativeNodeType,
} from '../services/knowledge-graph/graph-node-types';

import {
  registerGraphNode, getGraphNodeById, getGraphNodeByCanonicalObjectId,
  listGraphNodesByClass, listGraphNodesByCanonicalSubtype,
  listGraphNodesByNativeSubtype, listGraphNodesByLifecycle,
  getEventNodesByAffectedObject, getClusterNodeByKey,
  getCohortNodeByKey, getAllGraphNodes, markGraphNodeDeprecated,
  markGraphNodeStale, markGraphNodeHistorical, resetGraphNodeRegistry,
} from '../services/knowledge-graph/graph-node-registry';

import {
  validateGraphNode, validateCanonicalProjection, validateGraphNativeNode,
  assertGraphNodeMutationAllowed,
} from '../services/knowledge-graph/graph-node-validator';

import {
  projectCanonicalObjectToGraphNode, syncCanonicalGraphNode,
  rebuildCanonicalNodeProjection, buildCanonicalNodeId, buildNativeNodeId,
  mapL3TypeToCanonicalNodeType,
} from '../services/knowledge-graph/graph-node-projection';


let passed = 0;
let failed = 0;

function ok(id: string, expr: boolean, msg: string): void {
  if (expr) { passed++; }
  else { failed++; console.error(`  FAIL ${id}: ${msg}`); }
}

function now(): string { return new Date().toISOString(); }

function makeCanonicalNode(
  objectType: CanonicalNodeType,
  canonicalObjectId: string,
  label: string,
  overrides?: Partial<GraphNodeRecord>,
): GraphNodeRecord {
  const nodeId = buildCanonicalNodeId(objectType, canonicalObjectId);
  return {
    nodeId,
    nodeClass: 'CANONICAL',
    canonicalNodeType: objectType,
    nativeNodeType: undefined,
    origin: 'L3_CANONICAL_PROJECTION',
    canonicalObjectId,
    label,
    version: '1.0.0',
    lifecycleState: 'ACTIVE',
    capabilities: getDefaultCanonicalCapabilities(),
    restrictions: getDefaultCanonicalRestrictions(),
    createdAt: now(),
    updatedAt: now(),
    evidenceRefs: [],
    lineageRefs: [],
    metadata: {},
    ...overrides,
  };
}

function makeNativeNode(
  subtype: GraphNativeNodeType,
  key: string,
  label: string,
  metadata: Record<string, unknown>,
  overrides?: Partial<GraphNodeRecord>,
): GraphNodeRecord {
  const nodeId = buildNativeNodeId(subtype, key);
  return {
    nodeId,
    nodeClass: 'GRAPH_NATIVE',
    canonicalNodeType: undefined,
    nativeNodeType: subtype,
    origin: 'GRAPH_DERIVED',
    canonicalObjectId: undefined,
    label,
    version: '1.0.0',
    lifecycleState: 'ACTIVE',
    capabilities: getDefaultGraphNativeCapabilities(subtype),
    restrictions: getDefaultGraphNativeRestrictions(),
    createdAt: now(),
    updatedAt: now(),
    evidenceRefs: [],
    lineageRefs: [],
    metadata,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE A — NODE TYPE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

function suiteA(): void {
  console.log('\n--- Suite A: Node Type System ---');
  resetGraphNodeRegistry();

  ok('A1', ALL_CANONICAL_NODE_TYPES.length === 6, 'Exactly 6 canonical node types');
  ok('A2', ALL_CANONICAL_NODE_TYPES.includes('ASSET'), 'ASSET is a canonical type');
  ok('A3', ALL_CANONICAL_NODE_TYPES.includes('PAIR'), 'PAIR is a canonical type');
  ok('A4', ALL_CANONICAL_NODE_TYPES.includes('PROTOCOL'), 'PROTOCOL is a canonical type');
  ok('A5', ALL_CANONICAL_NODE_TYPES.includes('ENTITY'), 'ENTITY is a canonical type');
  ok('A6', ALL_CANONICAL_NODE_TYPES.includes('CHAIN'), 'CHAIN is a canonical type');
  ok('A7', ALL_CANONICAL_NODE_TYPES.includes('NARRATIVE_TOPIC'), 'NARRATIVE_TOPIC is a canonical type');

  ok('A8', ALL_GRAPH_NATIVE_NODE_TYPES.length === 9, 'Exactly 9 graph-native node types');
  ok('A9', ALL_GRAPH_NATIVE_NODE_TYPES.includes('SECTOR_CLUSTER'), 'SECTOR_CLUSTER present');
  ok('A10', ALL_GRAPH_NATIVE_NODE_TYPES.includes('UNLOCK_EVENT'), 'UNLOCK_EVENT present');
  ok('A11', ALL_GRAPH_NATIVE_NODE_TYPES.includes('WALLET_COHORT'), 'WALLET_COHORT present');

  const hybridNode = {
    ...makeCanonicalNode('ASSET', 'ast_hybrid', 'HybridTrap'),
    nativeNodeType: 'SECTOR_CLUSTER' as GraphNativeNodeType,
    canonicalNodeType: 'ASSET' as CanonicalNodeType,
  };
  const hv = validateGraphNode(hybridNode as any);
  ok('A12', !hv.valid, 'Hybrid node rejected by validator');
  ok('A13', hv.violations.some(v => v.code === 'HYBRID_NODE'), 'Violation code is HYBRID_NODE');

  ok('A14', mapL3TypeToCanonicalNodeType('ASSET') === 'ASSET', 'L3 ASSET maps to L4 ASSET');
  ok('A15', mapL3TypeToCanonicalNodeType('NARRATIVE_TOPIC') === 'NARRATIVE_TOPIC', 'L3 NARRATIVE_TOPIC maps correctly');
  ok('A16', mapL3TypeToCanonicalNodeType('UNKNOWN_TYPE') === undefined, 'Unknown L3 type returns undefined');

  const caps = getDefaultCanonicalCapabilities();
  ok('A17', caps.canMutateL3Identity === false, 'Default canonical caps forbid L3 mutation');
  ok('A18', caps.canParticipateInStructuralEdges === true, 'Default canonical caps allow structural edges');

  const nativeCaps = getDefaultGraphNativeCapabilities('SECTOR_CLUSTER');
  ok('A19', nativeCaps.canMutateL3Identity === false, 'Native caps forbid L3 mutation');
  ok('A20', nativeCaps.canParticipateInStructuralEdges === false, 'Native caps block structural edges');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE B — CANONICAL PROJECTION
// ═══════════════════════════════════════════════════════════════════════════════

function suiteB(): void {
  console.log('\n--- Suite B: Canonical Projection ---');
  resetGraphNodeRegistry();

  const btc = projectCanonicalObjectToGraphNode({
    canonicalObjectId: 'ast_btc_001', objectType: 'ASSET', label: 'Bitcoin',
  });
  ok('B1', btc.success, 'BTC asset projected successfully');
  ok('B2', btc.nodeId === 'gn:canonical:asset:ast_btc_001', 'Deterministic canonical node ID');
  ok('B3', btc.node!.nodeClass === 'CANONICAL', 'Projected node class is CANONICAL');
  ok('B4', btc.node!.canonicalNodeType === 'ASSET', 'Projected canonical subtype is ASSET');
  ok('B5', btc.node!.origin === 'L3_CANONICAL_PROJECTION', 'Origin is L3_CANONICAL_PROJECTION');

  const proto = projectCanonicalObjectToGraphNode({
    canonicalObjectId: 'proto_uni_001', objectType: 'PROTOCOL', label: 'Uniswap',
  });
  ok('B6', proto.success, 'Protocol projected successfully');

  const chain = projectCanonicalObjectToGraphNode({
    canonicalObjectId: 'chain_eth_001', objectType: 'CHAIN', label: 'Ethereum',
  });
  ok('B7', chain.success, 'Chain projected successfully');

  const narrative = projectCanonicalObjectToGraphNode({
    canonicalObjectId: 'topic_ai_001', objectType: 'NARRATIVE_TOPIC', label: 'AI Agents',
  });
  ok('B8', narrative.success, 'Narrative topic projected successfully');

  const dupe = projectCanonicalObjectToGraphNode({
    canonicalObjectId: 'ast_btc_001', objectType: 'ASSET', label: 'Bitcoin Dupe',
  });
  ok('B9', !dupe.success, 'Duplicate projection blocked');
  ok('B10', dupe.error!.includes('DUPLICATE'), 'Error mentions duplication');

  const wrongType = projectCanonicalObjectToGraphNode({
    canonicalObjectId: 'ast_fake_001', objectType: 'FAKE_TYPE' as any, label: 'FakeType',
  });
  ok('B11', !wrongType.success, 'Unknown L3 object type blocked');

  const found = getGraphNodeByCanonicalObjectId('ast_btc_001');
  ok('B12', !!found, 'Canonical lookup by object ID works');
  ok('B13', found!.label === 'Bitcoin', 'Retrieved correct node');

  const syncResult = syncCanonicalGraphNode('ast_btc_001', {
    label: 'Bitcoin (updated)', version: '1.1.0',
  });
  ok('B14', syncResult.success, 'Sync canonical node works');
  ok('B15', syncResult.node!.label === 'Bitcoin (updated)', 'Label updated');
  ok('B16', syncResult.node!.version === '1.1.0', 'Version updated');

  const syncNotFound = syncCanonicalGraphNode('nonexistent_id', { label: 'X' });
  ok('B17', !syncNotFound.success, 'Sync fails for unknown canonical object');

  const rebuildResult = rebuildCanonicalNodeProjection({
    canonicalObjectId: 'proto_uni_001', objectType: 'PROTOCOL', label: 'Uniswap v2',
  });
  ok('B18', rebuildResult.success, 'Rebuild projection works');
  ok('B19', rebuildResult.node!.label === 'Uniswap v2', 'Rebuilt node has new label');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE C — GRAPH-NATIVE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function suiteC(): void {
  console.log('\n--- Suite C: Graph-Native Validation ---');
  resetGraphNodeRegistry();

  const sector = makeNativeNode('SECTOR_CLUSTER', 'defi', 'DeFi Sector', {
    sectorKey: 'defi', sectorLabel: 'Decentralized Finance',
    clusteringBasis: 'protocol_category', memberSelectionRule: 'tvl_weighted',
  });
  const sv = validateGraphNode(sector);
  ok('C1', sv.valid, 'Valid sector cluster passes validation');

  const regResult = registerGraphNode(sector);
  ok('C2', regResult.success, 'Sector cluster registered successfully');

  const eco = makeNativeNode('ECOSYSTEM_CLUSTER', 'eth_eco', 'Ethereum Ecosystem', {
    ecosystemKey: 'ethereum', ecosystemLabel: 'Ethereum', membershipRule: 'chain_affinity',
  });
  const ev = validateGraphNode(eco);
  ok('C3', ev.valid, 'Valid ecosystem cluster passes validation');

  const unlock = makeNativeNode('UNLOCK_EVENT', 'sol_unlock_2026', 'SOL Unlock May', {
    eventTimestamp: '2026-05-01T00:00:00Z',
    affectedObjectIds: ['ast_sol_001'],
    unlockType: 'linear_vesting',
    floatImpactClass: 'MEDIUM',
    derivationBasis: 'on_chain_schedule',
  }, { origin: 'EVENT_DERIVED' });
  const uv = validateGraphNode(unlock);
  ok('C4', uv.valid, 'Valid unlock event passes validation');

  const cohort = makeNativeNode('WALLET_COHORT', 'smart_money', 'Smart Money Rotators', {
    cohortKey: 'smart_money_rotators', cohortBasis: 'onchain_behavior',
    inclusionLogic: 'pnl_top_decile', updateCadence: 'daily',
  });
  const cv = validateGraphNode(cohort);
  ok('C5', cv.valid, 'Valid wallet cohort passes validation');

  const missingMeta = makeNativeNode('SECTOR_CLUSTER', 'empty_sector', 'Empty', {});
  const mv = validateGraphNode(missingMeta);
  ok('C6', !mv.valid, 'Missing required metadata rejected');
  ok('C7', mv.violations.some(v => v.code.includes('MISSING_REQUIRED_METADATA')), 'Violation identifies missing field');

  const nativeWithCanonicalId = makeNativeNode('SECTOR_CLUSTER', 'leak', 'Leaky', {
    sectorKey: 'leak', sectorLabel: 'L', clusteringBasis: 'x', memberSelectionRule: 'y',
  });
  (nativeWithCanonicalId as any).canonicalObjectId = 'ast_fake_001';
  const nlv = validateGraphNativeNode(nativeWithCanonicalId);
  ok('C8', !nlv.valid, 'Graph-native node with canonical object ID rejected');

  const nativeWithCanonicalType = {
    ...makeNativeNode('SECTOR_CLUSTER', 'typeleak', 'TypeLeak', {
      sectorKey: 'tl', sectorLabel: 'TL', clusteringBasis: 'x', memberSelectionRule: 'y',
    }),
    canonicalNodeType: 'ASSET' as CanonicalNodeType,
  };
  const ntv = validateGraphNode(nativeWithCanonicalType as any);
  ok('C9', !ntv.valid, 'Graph-native with canonical subtype rejected');

  const venue = makeNativeNode('VENUE', 'binance_spot', 'Binance Spot', {
    venueType: 'CEX', venueId: 'binance_spot', venueScope: 'global',
    supportedObjectClasses: ['ASSET', 'PAIR'],
  });
  ok('C10', validateGraphNode(venue).valid, 'Valid venue passes validation');

  const govEvent = makeNativeNode('GOVERNANCE_EVENT', 'aave_proposal_42', 'AAVE Proposal 42', {
    governanceSystem: 'snapshot', effectiveWindow: '2026-04-01/2026-04-15',
    affectedObjectIds: ['ast_aave_001'],
  }, { origin: 'EVENT_DERIVED' });
  ok('C11', validateGraphNode(govEvent).valid, 'Valid governance event passes validation');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE D — CAPABILITIES AND RESTRICTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function suiteD(): void {
  console.log('\n--- Suite D: Capabilities & Restrictions ---');
  resetGraphNodeRegistry();

  const canonicalRestrictions = getDefaultCanonicalRestrictions();
  ok('D1', canonicalRestrictions.blockedFromCanonicalMutation === true, 'Canonical nodes blocked from L4-level mutation');
  ok('D2', canonicalRestrictions.blockedFromIdentityAuthority === false, 'Canonical nodes retain identity authority');
  ok('D3', canonicalRestrictions.blockedFromMetricAuthority === true, 'Canonical nodes blocked from metric authority at L4');

  const nativeRestrictions = getDefaultGraphNativeRestrictions();
  ok('D4', nativeRestrictions.blockedFromCanonicalMutation === true, 'Native nodes blocked from canonical mutation');
  ok('D5', nativeRestrictions.blockedFromIdentityAuthority === true, 'Native nodes blocked from identity authority');
  ok('D6', nativeRestrictions.blockedFromOntologyProjection === true, 'Native nodes blocked from ontology projection');
  ok('D7', nativeRestrictions.blockedFromMetricAuthority === true, 'Native nodes blocked from metric authority');
  ok('D8', nativeRestrictions.blockedFromDirectJudgmentClaims === true, 'Native nodes blocked from direct judgment claims');

  const mutatorNode = makeNativeNode('SECTOR_CLUSTER', 'mutator', 'Mutator', {
    sectorKey: 'm', sectorLabel: 'M', clusteringBasis: 'x', memberSelectionRule: 'y',
  });
  mutatorNode.capabilities.canMutateL3Identity = true;
  const mv = validateGraphNode(mutatorNode);
  ok('D9', !mv.valid, 'Graph-native node with L3 mutation capability rejected');
  ok('D10', mv.violations.some(v => v.code === 'L3_MUTATION_AUTHORITY'), 'Violation is L3_MUTATION_AUTHORITY');

  const unblocked = makeNativeNode('SECTOR_CLUSTER', 'unblocked', 'Unblocked', {
    sectorKey: 'u', sectorLabel: 'U', clusteringBasis: 'x', memberSelectionRule: 'y',
  });
  unblocked.restrictions.blockedFromIdentityAuthority = false;
  const uv = validateGraphNativeNode(unblocked);
  ok('D11', !uv.valid, 'Native node with identity authority not blocked is rejected');

  const canonicalNode = makeCanonicalNode('ASSET', 'ast_test_d', 'TestD');
  const idMut = assertGraphNodeMutationAllowed(canonicalNode, 'IDENTITY');
  ok('D12', !idMut.allowed, 'Canonical identity mutation denied');
  ok('D13', idMut.reason === 'CANONICAL_IDENTITY_IMMUTABLE_AT_L4', 'Reason: immutable at L4');

  const lifecycleMut = assertGraphNodeMutationAllowed(canonicalNode, 'LIFECYCLE');
  ok('D14', lifecycleMut.allowed, 'Canonical lifecycle mutation allowed');

  const nativeNode = makeNativeNode('THEMATIC_CLUSTER', 'cap_test', 'CapTest', {
    themeKey: 'ct', themeBasis: 'keyword', inclusionRule: 'mention_count',
  });
  const capMut = assertGraphNodeMutationAllowed(nativeNode, 'CAPABILITY');
  ok('D15', !capMut.allowed, 'Graph-native capability mutation denied');
  ok('D16', capMut.reason === 'GRAPH_NATIVE_CAPABILITIES_FROZEN', 'Capabilities are frozen');

  const deprecated = makeCanonicalNode('PROTOCOL', 'ast_dep', 'Deprecated');
  deprecated.lifecycleState = 'DEPRECATED';
  const depMut = assertGraphNodeMutationAllowed(deprecated, 'METADATA');
  ok('D17', !depMut.allowed, 'Deprecated node mutation denied');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE E — ANTI-FAKE SUITE
// ═══════════════════════════════════════════════════════════════════════════════

function suiteE(): void {
  console.log('\n--- Suite E: Anti-Fake Suite ---');
  resetGraphNodeRegistry();

  const unlockAsAsset = makeNativeNode('UNLOCK_EVENT', 'fake_asset', 'SOL Unlock', {
    eventTimestamp: '2026-05-01T00:00:00Z',
    affectedObjectIds: ['ast_sol_001'], unlockType: 'cliff', floatImpactClass: 'HIGH',
  });
  (unlockAsAsset as any).canonicalNodeType = 'ASSET';
  const uv = validateGraphNode(unlockAsAsset as any);
  ok('E1', !uv.valid, 'Unlock event cannot masquerade as asset');

  const cohortAsEntity = makeNativeNode('WALLET_COHORT', 'fake_entity', 'Smart Money', {
    cohortKey: 'sm', cohortBasis: 'onchain', inclusionLogic: 'pnl_decile', updateCadence: 'weekly',
  });
  (cohortAsEntity as any).canonicalNodeType = 'ENTITY';
  const cev = validateGraphNode(cohortAsEntity as any);
  ok('E2', !cev.valid, 'Wallet cohort cannot masquerade as entity');

  const competitorAsProtocol = makeNativeNode('COMPETITOR_CLUSTER', 'fake_proto', 'DEX Competitors', {
    competitorBasis: 'dex_tvl', similarityRule: 'tvl_rank', comparisonSurface: 'protocol_metrics',
  });
  (competitorAsProtocol as any).canonicalNodeType = 'PROTOCOL';
  const cpv = validateGraphNode(competitorAsProtocol as any);
  ok('E3', !cpv.valid, 'Competitor cluster cannot masquerade as protocol');

  const venueAsChain = makeNativeNode('VENUE', 'fake_chain', 'Binance', {
    venueType: 'CEX', venueId: 'binance', venueScope: 'global',
    supportedObjectClasses: ['ASSET'],
  });
  (venueAsChain as any).canonicalNodeType = 'CHAIN';
  const vcv = validateGraphNode(venueAsChain as any);
  ok('E4', !vcv.valid, 'Venue cannot masquerade as chain');

  const hybridFull: any = {
    ...makeCanonicalNode('ASSET', 'ast_hyb', 'HybridBoth'),
    nativeNodeType: 'THEMATIC_CLUSTER',
  };
  const hv = validateGraphNode(hybridFull);
  ok('E5', !hv.valid, 'Full hybrid rejected');

  const nativeStealingL3 = makeNativeNode('ECOSYSTEM_CLUSTER', 'l3_stealer', 'Stealer', {
    ecosystemKey: 'eth', ecosystemLabel: 'ETH', membershipRule: 'chain',
  });
  nativeStealingL3.restrictions.blockedFromIdentityAuthority = false;
  const slv = validateGraphNativeNode(nativeStealingL3);
  ok('E6', !slv.valid, 'Native node stealing identity authority rejected');

  const nativeOntology = makeNativeNode('SECTOR_CLUSTER', 'onto_steal', 'OntologySteal', {
    sectorKey: 'os', sectorLabel: 'OS', clusteringBasis: 'x', memberSelectionRule: 'y',
  });
  nativeOntology.restrictions.blockedFromOntologyProjection = false;
  const ov = validateGraphNativeNode(nativeOntology);
  ok('E7', !ov.valid, 'Native node with ontology projection unblocked rejected');

  const canonicalMissingObj = makeCanonicalNode('ASSET', '', 'NoObjectId');
  canonicalMissingObj.canonicalObjectId = undefined;
  const cv = validateCanonicalProjection(canonicalMissingObj);
  ok('E8', !cv.valid, 'Canonical node without object ID rejected');

  const wrongOrigin = makeCanonicalNode('PROTOCOL', 'proto_wrong', 'WrongOrigin');
  wrongOrigin.origin = 'GRAPH_DERIVED';
  const wv = validateCanonicalProjection(wrongOrigin);
  ok('E9', !wv.valid, 'Canonical node with wrong origin rejected');

  const canonicalNotBlocked = makeCanonicalNode('CHAIN', 'chain_mut', 'MutableChain');
  canonicalNotBlocked.restrictions.blockedFromCanonicalMutation = false;
  const cbv = validateCanonicalProjection(canonicalNotBlocked);
  ok('E10', !cbv.valid, 'Canonical node without mutation block rejected');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE F — LIFECYCLE AND INDEXING
// ═══════════════════════════════════════════════════════════════════════════════

function suiteF(): void {
  console.log('\n--- Suite F: Lifecycle & Indexing ---');
  resetGraphNodeRegistry();

  const btc = projectCanonicalObjectToGraphNode({
    canonicalObjectId: 'ast_btc_f', objectType: 'ASSET', label: 'Bitcoin',
  });
  const eth = projectCanonicalObjectToGraphNode({
    canonicalObjectId: 'ast_eth_f', objectType: 'ASSET', label: 'Ethereum',
  });
  const uniProto = projectCanonicalObjectToGraphNode({
    canonicalObjectId: 'proto_uni_f', objectType: 'PROTOCOL', label: 'Uniswap',
  });

  ok('F1', listGraphNodesByClass('CANONICAL').length === 3, 'Three canonical nodes registered');
  ok('F2', listGraphNodesByCanonicalSubtype('ASSET').length === 2, 'Two ASSET nodes indexed');
  ok('F3', listGraphNodesByCanonicalSubtype('PROTOCOL').length === 1, 'One PROTOCOL node indexed');

  const sector = makeNativeNode('SECTOR_CLUSTER', 'defi_f', 'DeFi', {
    sectorKey: 'defi', sectorLabel: 'DeFi',
    clusteringBasis: 'tvl', memberSelectionRule: 'threshold',
  });
  registerGraphNode(sector);

  const unlock = makeNativeNode('UNLOCK_EVENT', 'sol_unlock_f', 'SOL Unlock', {
    eventTimestamp: '2026-05-01T00:00:00Z',
    affectedObjectIds: ['ast_sol_001', 'ast_sol_002'],
    unlockType: 'cliff', floatImpactClass: 'HIGH',
    derivationBasis: 'vesting_schedule',
  }, { origin: 'EVENT_DERIVED' });
  registerGraphNode(unlock);

  const cohort = makeNativeNode('WALLET_COHORT', 'whales_f', 'Whales', {
    cohortKey: 'whale_cohort', cohortBasis: 'balance_threshold',
    inclusionLogic: 'top_100_holders', updateCadence: 'daily',
  });
  registerGraphNode(cohort);

  ok('F4', listGraphNodesByClass('GRAPH_NATIVE').length === 3, 'Three native nodes registered');
  ok('F5', listGraphNodesByNativeSubtype('SECTOR_CLUSTER').length === 1, 'One sector cluster indexed');
  ok('F6', listGraphNodesByNativeSubtype('UNLOCK_EVENT').length === 1, 'One unlock event indexed');
  ok('F7', listGraphNodesByNativeSubtype('WALLET_COHORT').length === 1, 'One wallet cohort indexed');

  ok('F8', getAllGraphNodes().length === 6, 'Total 6 nodes in registry');

  const btcLookup = getGraphNodeByCanonicalObjectId('ast_btc_f');
  ok('F9', !!btcLookup && btcLookup.label === 'Bitcoin', 'Canonical lookup by object ID works');

  const byId = getGraphNodeById(btc.nodeId!);
  ok('F10', !!byId && byId.canonicalObjectId === 'ast_btc_f', 'Lookup by node ID works');

  const events = getEventNodesByAffectedObject('ast_sol_001');
  ok('F11', events.length === 1, 'Event node indexed by affected object');

  const clusterLookup = getClusterNodeByKey('defi');
  ok('F12', !!clusterLookup && clusterLookup.label === 'DeFi', 'Cluster lookup by key works');

  const cohortLookup = getCohortNodeByKey('whale_cohort');
  ok('F13', !!cohortLookup && cohortLookup.label === 'Whales', 'Cohort lookup by key works');

  ok('F14', markGraphNodeDeprecated(btc.nodeId!), 'Mark deprecated succeeds');
  ok('F15', getGraphNodeById(btc.nodeId!)!.lifecycleState === 'DEPRECATED', 'Lifecycle state is DEPRECATED');

  ok('F16', markGraphNodeStale(eth.nodeId!), 'Mark stale succeeds');
  ok('F17', getGraphNodeById(eth.nodeId!)!.lifecycleState === 'STALE', 'Lifecycle state is STALE');

  ok('F18', markGraphNodeHistorical(unlock.nodeId), 'Mark historical succeeds');
  ok('F19', getGraphNodeById(unlock.nodeId)!.lifecycleState === 'HISTORICAL', 'Lifecycle state is HISTORICAL');

  const deprecatedNodes = listGraphNodesByLifecycle('DEPRECATED');
  ok('F20', deprecatedNodes.length >= 1, 'Deprecated nodes queryable');

  const historicalNodes = listGraphNodesByLifecycle('HISTORICAL');
  ok('F21', historicalNodes.length >= 1, 'Historical nodes queryable (replay support)');

  const dupeReg = registerGraphNode({
    ...makeCanonicalNode('PROTOCOL', 'proto_uni_f', 'Uniswap Dupe'),
    nodeId: 'gn:canonical:protocol:proto_uni_f_dupe',
  });
  ok('F22', !dupeReg.success, 'Duplicate active canonical projection blocked by registry');
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

console.log(`\n${'═'.repeat(60)}`);
console.log(`L4.0 Graph Object Model — TOTAL: ${passed + failed} | ✅ ${passed} | ❌ ${failed}`);
console.log(`${'═'.repeat(60)}`);
if (failed > 0) process.exit(1);
