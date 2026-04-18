/**
 * Pre-L5 Integrated Systems Certification — Band D
 * Propagation and Spillover Chain
 *
 * Seven suites, ~200 assertions:
 *   1 — Chain Weakness → Protocol Stress
 *   2 — Multi-Hop Propagation and Decay
 *   3 — Eligibility Gates
 *   4 — Propagation Events and Query Surface Integration
 *   5 — Propagation → Context Package Notes
 *   6 — Bounded Propagation Constraints
 *   7 — Event Window and Temporal Propagation
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
  registerLiveGraphEdge,
  resetGraphQuerySurfaces,
  getSpilloverPathsFromEvent,
  getProtocolContextForAsset,
  getExposureRadius,
} from '../services/knowledge-graph/graph-query-surfaces';
import type {
  LiveGraphEdge,
  EdgeRightsMap,
} from '../services/knowledge-graph/graph-query-surfaces';
import {
  bootstrapRelationOntology,
  resetRelationOntology,
} from '../services/knowledge-graph/relation-ontology';
import {
  createTemporalState,
  resetTemporalGraphState,
} from '../services/knowledge-graph/temporal-graph-state';
import {
  registerPropagationRule,
  getPropagationRule,
  evaluatePropagationTrigger,
  getPropagationEventsForNode,
  getPropagationEventById,
  getActivePropagationForNodeAtTime,
  getPropagationTrail,
  getTargetImpactState,
  getAllPropagationEvents,
  bootstrapPropagationRules,
  resetPropagationEngine,
  validatePropagationRule,
  checkPropagationEligibility,
  traversePropagationPaths,
  computePropagationStrength,
} from '../services/knowledge-graph/graph-propagation-engine';
import type {
  PropagationRule,
  PropagationTrigger,
  SourceEdgeContext,
  GraphEdgeForTraversal,
  PropagationEvent,
} from '../services/knowledge-graph/graph-propagation-engine';
import {
  buildTokenContextPackage,
  buildProtocolContextPackage,
  resetGraphContextPackager,
} from '../services/knowledge-graph/graph-context-packager';

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

function makeTrigger(overrides: Partial<PropagationTrigger> = {}): PropagationTrigger {
  return {
    triggerId: `trig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    triggerType: 'METRIC_THRESHOLD_CROSSED',
    sourceNodeIds: ['chain_eth'],
    sourceEdgeIds: ['edge_proto_chain'],
    supportingMetricObservationRefs: ['mobs_001'],
    supportingEventNodeIds: [],
    createdAt: '2026-03-01T00:00:00Z',
    metadata: {},
    ...overrides,
  };
}

function makeSourceEdge(overrides: Partial<SourceEdgeContext> = {}): SourceEdgeContext {
  return {
    edgeId: 'edge_proto_chain',
    edgeType: 'PROTOCOL_OPERATES_ON_CHAIN',
    confidenceBand: 'HIGH',
    temporalStatus: 'ACTIVE',
    propagationRight: 'ALLOW',
    subjectNodeId: 'gn:canonical:protocol:proto_uni',
    objectNodeId: 'gn:canonical:chain:chain_eth',
    subjectNodeType: 'PROTOCOL',
    objectNodeType: 'CHAIN',
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

function resetAll() {
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
// SUITE 1 — Chain Weakness → Protocol Stress (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 1 — Chain Weakness → Protocol Stress ===');
resetAll();
bootstrapPropagationRules();

const s1rule = getPropagationRule('RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS');
assert(s1rule !== undefined, '1.01 RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS exists');
assert(s1rule!.effectClass === 'DEPENDENCY_IMPACT', '1.02 effectClass is DEPENDENCY_IMPACT');
assert(s1rule!.hopLimit === 1, '1.03 hopLimit is 1');
assert(s1rule!.sourceEdgeTypes.includes('PROTOCOL_OPERATES_ON_CHAIN'), '1.04 sourceEdgeType includes PROTOCOL_OPERATES_ON_CHAIN');
assert(s1rule!.requiredSourceConfidence === 'MEDIUM', '1.05 requiredSourceConfidence is MEDIUM');
assert(s1rule!.strengthModel === 'WEIGHTED_DEPENDENCY', '1.06 strengthModel is WEIGHTED_DEPENDENCY');

registerGraphNode(makeNode('chain_eth', 'CANONICAL', 'CHAIN'));
registerGraphNode(makeNode('proto_uni', 'CANONICAL', 'PROTOCOL'));

const s1graphEdges: GraphEdgeForTraversal[] = [
  makeGraphEdge('edge_chain_proto', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_uni', 'CHAIN', 'PROTOCOL'),
];

const s1srcEdge = makeSourceEdge({
  edgeId: 'edge_chain_proto',
  subjectNodeId: 'chain_eth', objectNodeId: 'proto_uni',
  subjectNodeType: 'CHAIN', objectNodeType: 'PROTOCOL',
});

const s1trigger = makeTrigger({ sourceNodeIds: ['chain_eth'], sourceEdgeIds: ['edge_chain_proto'] });

const s1result = evaluatePropagationTrigger({
  rule: s1rule!, trigger: s1trigger, sourceNodeId: 'chain_eth',
  sourceEdge: s1srcEdge, graphEdges: s1graphEdges, sourceStrength: 80,
});

assert(!s1result.eligibilityBlocked, '1.07 propagation not blocked');
assert(s1result.events.length === 1, '1.08 exactly 1 event created');
assert(s1result.trails.length === 1, '1.09 exactly 1 trail created');
assert(s1result.eligibilityReasons.length === 0, '1.10 no eligibility block reasons');

const s1ev = s1result.events[0];
assert(s1ev.effectClass === 'DEPENDENCY_IMPACT', '1.11 event effectClass is DEPENDENCY_IMPACT');
assert(s1ev.sourceNodeId === 'chain_eth', '1.12 event sourceNodeId is chain_eth');
assert(s1ev.targetNodeId === 'proto_uni', '1.13 event targetNodeId is proto_uni');
assert(s1ev.strengthScore > 0, '1.14 event strengthScore > 0');
assert(s1ev.hopCount === 1, '1.15 event hopCount is 1');
assert(s1ev.allowedUses.length > 0, '1.16 event has non-empty allowedUses');
assert(s1ev.blockedUses.length > 0, '1.17 event has non-empty blockedUses');
assert(s1ev.activeFrom === '2026-03-01T00:00:00Z', '1.18 event activeFrom matches trigger');
assert(s1ev.ruleId === 'RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS', '1.19 event ruleId correct');
assert(s1ev.propagationEventId !== undefined, '1.20 event has propagationEventId');
assert(s1ev.schemaVersion === 'v1', '1.21 event schemaVersion is v1');

const s1trail = s1result.trails[0];
assert(s1trail.steps.length === 1, '1.22 trail has 1 step');
assert(s1trail.sourceNodeId === 'chain_eth', '1.23 trail sourceNodeId correct');
assert(s1trail.targetNodeId === 'proto_uni', '1.24 trail targetNodeId correct');
assert(s1trail.ruleId === 'RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS', '1.25 trail ruleId correct');

const s1stored = getPropagationEventById(s1ev.propagationEventId);
assert(s1stored !== undefined, '1.26 event retrievable by ID');
assert(s1stored!.propagationEventId === s1ev.propagationEventId, '1.27 stored event ID matches');

const s1byNode = getPropagationEventsForNode('proto_uni');
assert(s1byNode.length >= 1, '1.28 events retrievable by target node');

const s1impact = getTargetImpactState('proto_uni');
assert(s1impact !== undefined, '1.29 target impact state exists');
assert(s1impact!.activePropagationEventIds.includes(s1ev.propagationEventId), '1.30 impact includes event ID');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Multi-Hop Propagation and Decay (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 2 — Multi-Hop Propagation and Decay ===');
resetAll();
bootstrapPropagationRules();

const s2rule: PropagationRule = {
  ruleId: 'RULE_MULTIHOP_TEST',
  contractVersion: 'v1',
  sourceEdgeTypes: ['PROTOCOL_OPERATES_ON_CHAIN'],
  sourceNodeTypes: ['CHAIN'],
  targetNodeTypes: ['PROTOCOL', 'CHAIN'],
  effectClass: 'DEPENDENCY_IMPACT',
  strengthModel: 'WEIGHTED_DEPENDENCY',
  hopLimit: 3, decayPerHop: 0.6,
  requiredSourceConfidence: 'MEDIUM',
  requiredSourceTemporalStates: ['ACTIVE'],
  blockedConditions: [],
  querySurfacesAllowed: ['entity_context'],
  blockedUsesUnderUncertainty: ['comparison', 'hypothesis_support'],
  requireMetricSupport: false,
  explanationTemplate: 'Multi-hop test: {source} → {target}',
  replayCompatibility: { schemaVersion: 'v1' },
};
const s2regResult = registerPropagationRule(s2rule);
assert(s2regResult.success, '2.01 custom multi-hop rule registered');

registerGraphNode(makeNode('s2_chain', 'CANONICAL', 'CHAIN'));
registerGraphNode(makeNode('s2_proto_a', 'CANONICAL', 'PROTOCOL'));
registerGraphNode(makeNode('s2_proto_b', 'CANONICAL', 'PROTOCOL'));

const s2edges: GraphEdgeForTraversal[] = [
  makeGraphEdge('s2_e1', 'PROTOCOL_OPERATES_ON_CHAIN', 's2_chain', 's2_proto_a', 'CHAIN', 'PROTOCOL'),
  makeGraphEdge('s2_e2', 'PROTOCOL_OPERATES_ON_CHAIN', 's2_proto_a', 's2_proto_b', 'PROTOCOL', 'PROTOCOL'),
];

const s2trigger = makeTrigger({ sourceNodeIds: ['s2_chain'], sourceEdgeIds: ['s2_e1'] });
const s2srcEdge = makeSourceEdge({
  edgeId: 's2_e1', subjectNodeId: 's2_chain', objectNodeId: 's2_proto_a',
  subjectNodeType: 'CHAIN', objectNodeType: 'PROTOCOL',
});

const s2result = evaluatePropagationTrigger({
  rule: s2rule, trigger: s2trigger, sourceNodeId: 's2_chain',
  sourceEdge: s2srcEdge, graphEdges: s2edges, sourceStrength: 100,
});

assert(!s2result.eligibilityBlocked, '2.02 multi-hop propagation not blocked');
assert(s2result.events.length >= 1, '2.03 at least 1 event from multi-hop');

const s2hop1Events = s2result.events.filter(e => e.hopCount === 1);
const s2hop2Events = s2result.events.filter(e => e.hopCount === 2);
assert(s2hop1Events.length >= 1, '2.04 at least 1 hop-1 event');
assert(s2hop2Events.length >= 1, '2.05 at least 1 hop-2 event');

if (s2hop1Events.length > 0 && s2hop2Events.length > 0) {
  assert(s2hop2Events[0].hopCount > s2hop1Events[0].hopCount, '2.06 hop count increments per step');
  assert(s2hop2Events[0].cumulativeDecayFactor < s2hop1Events[0].cumulativeDecayFactor, '2.07 cumulative decay decreases at hop 2');
  assert(s2hop2Events[0].strengthScore <= s2hop1Events[0].strengthScore, '2.08 strength decreases or equals at hop 2');
} else {
  assert(false, '2.06 hop count increments per step (no events)');
  assert(false, '2.07 cumulative decay decreases at hop 2 (no events)');
  assert(false, '2.08 strength decreases or equals at hop 2 (no events)');
}

const s2traversal = traversePropagationPaths(s2rule, 's2_chain', s2edges);
assert(s2traversal.reachedTargets.length >= 2, '2.09 traversal reaches 2 targets');
assert(s2traversal.reachedTargets[0].cumulativeDecay < 1.0, '2.10 first target has decay < 1.0');

for (const t of s2traversal.reachedTargets) {
  const str = computePropagationStrength(s2rule, t, 100);
  assert(str.strengthScore <= 100, '2.11 strength ≤ source strength');
  assert(str.strengthScore >= 0, '2.12 strength ≥ 0');
}

const s2denyEdges: GraphEdgeForTraversal[] = [
  makeGraphEdge('s2_d1', 'PROTOCOL_OPERATES_ON_CHAIN', 's2_chain', 's2_proto_a', 'CHAIN', 'PROTOCOL', { propagationRight: 'DENY' }),
];
const s2denyTraversal = traversePropagationPaths(s2rule, 's2_chain', s2denyEdges);
assert(s2denyTraversal.reachedTargets.length === 0, '2.13 DENY edge blocks traversal');
assert(s2denyTraversal.blockedPaths.length >= 1, '2.14 blocked path reported for DENY edge');
assert(s2denyTraversal.blockedPaths[0].reason === 'SOURCE_EDGE_RIGHTS_DENY', '2.15 blocked reason is SOURCE_EDGE_RIGHTS_DENY');

registerGraphNode(makeNode('s2_cycle_a', 'CANONICAL', 'PROTOCOL'));
registerGraphNode(makeNode('s2_cycle_b', 'CANONICAL', 'PROTOCOL'));
const s2cycleEdges: GraphEdgeForTraversal[] = [
  makeGraphEdge('s2_c1', 'PROTOCOL_OPERATES_ON_CHAIN', 's2_cycle_a', 's2_cycle_b', 'PROTOCOL', 'PROTOCOL'),
  makeGraphEdge('s2_c2', 'PROTOCOL_OPERATES_ON_CHAIN', 's2_cycle_b', 's2_cycle_a', 'PROTOCOL', 'PROTOCOL'),
];
const s2cycleResult = traversePropagationPaths(s2rule, 's2_cycle_a', s2cycleEdges);
const s2cycleTargetCount = s2cycleResult.reachedTargets.length;
const s2cycleBlockCount = s2cycleResult.blockedPaths.length;
assert(s2cycleTargetCount + s2cycleBlockCount >= 1, '2.16 cycle traversal terminates without infinite loop');

const s2hop1Target = s2traversal.reachedTargets.find(t => t.hopCount === 1);
const s2hop2Target = s2traversal.reachedTargets.find(t => t.hopCount === 2);
assert(s2hop1Target !== undefined, '2.17 hop-1 target exists in traversal');
assert(s2hop2Target !== undefined, '2.18 hop-2 target exists in traversal');
if (s2hop1Target && s2hop2Target) {
  assert(s2hop2Target.cumulativeDecay < s2hop1Target.cumulativeDecay, '2.19 hop-2 decay < hop-1 decay');
  assert(s2hop2Target.path.length === 2, '2.20 hop-2 path has 2 edges');
  assert(s2hop1Target.path.length === 1, '2.21 hop-1 path has 1 edge');
} else {
  assert(false, '2.19 hop-2 decay < hop-1 decay (targets missing)');
  assert(false, '2.20 hop-2 path has 2 edges (targets missing)');
  assert(false, '2.21 hop-1 path has 1 edge (targets missing)');
}

const s2beyondLimit: PropagationRule = { ...s2rule, ruleId: 'RULE_LIMIT_1', hopLimit: 1 };
const s2limitReg = registerPropagationRule(s2beyondLimit);
assert(s2limitReg.success, '2.22 hop-limit-1 rule registered');
const s2limitTraversal = traversePropagationPaths(s2beyondLimit, 's2_chain', s2edges);
assert(s2limitTraversal.reachedTargets.length === 1, '2.23 hop limit 1 only reaches 1 target');

const s2storedEvents = s2result.events;
assert(s2storedEvents.length >= 1, '2.24 evaluatePropagationTrigger produced stored events');

for (const ev of s2result.events) {
  const trail = getPropagationTrail(ev.trailRef);
  assert(trail !== undefined, '2.25 trail retrievable by trailRef');
}

assert(s2result.trails.every(t => t.schemaVersion === 'v1'), '2.26 all trails have schemaVersion v1');
assert(s2result.events.every(e => e.traversedEdgeIds.length > 0), '2.27 all events have traversedEdgeIds');
assert(s2result.events.every(e => e.evidenceRefs.length >= 0), '2.28 all events have evidenceRefs array');

const s2lowEdges: GraphEdgeForTraversal[] = [
  makeGraphEdge('s2_low1', 'PROTOCOL_OPERATES_ON_CHAIN', 's2_chain', 's2_proto_a', 'CHAIN', 'PROTOCOL', { confidenceBand: 'LOW' }),
];
const s2lowStr = computePropagationStrength(s2rule, { targetNodeId: 's2_proto_a', targetNodeType: 'PROTOCOL', hopCount: 1, cumulativeDecay: 0.6, path: s2lowEdges }, 100);
const s2highStr = computePropagationStrength(s2rule, { targetNodeId: 's2_proto_a', targetNodeType: 'PROTOCOL', hopCount: 1, cumulativeDecay: 0.6, path: s2edges.slice(0, 1) }, 100);
assert(s2lowStr.strengthScore <= s2highStr.strengthScore, '2.29 LOW confidence edge produces weaker strength');
assert(s2lowStr.confidenceBand !== 'HIGH' || s2highStr.confidenceBand === 'HIGH', '2.30 LOW path confidence ≤ HIGH path confidence');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Eligibility Gates (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 3 — Eligibility Gates ===');
resetAll();
bootstrapPropagationRules();

const s3rule = getPropagationRule('RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS')!;
const s3trigger = makeTrigger();

const s3staleSrc = makeSourceEdge({ temporalStatus: 'STALE' });
const s3staleElig = checkPropagationEligibility(s3rule, s3staleSrc, s3trigger);
assert(!s3staleElig.eligible, '3.01 stale source → not eligible');
assert(s3staleElig.blockedReasons.includes('SOURCE_EDGE_STALE'), '3.02 blocked reason includes SOURCE_EDGE_STALE');

const s3expiredSrc = makeSourceEdge({ temporalStatus: 'EXPIRED' });
const s3expiredElig = checkPropagationEligibility(s3rule, s3expiredSrc, s3trigger);
assert(!s3expiredElig.eligible, '3.03 expired source → not eligible');
assert(s3expiredElig.blockedReasons.includes('SOURCE_EDGE_EXPIRED'), '3.04 blocked reason includes SOURCE_EDGE_EXPIRED');

const s3contestedSrc = makeSourceEdge({ temporalStatus: 'CONTESTED' });
const s3contestedElig = checkPropagationEligibility(s3rule, s3contestedSrc, s3trigger);
assert(!s3contestedElig.eligible, '3.05 contested source → not eligible');
assert(s3contestedElig.blockedReasons.includes('SOURCE_EDGE_CONTESTED'), '3.06 blocked reason includes SOURCE_EDGE_CONTESTED');

const s3denySrc = makeSourceEdge({ propagationRight: 'DENY' });
const s3denyElig = checkPropagationEligibility(s3rule, s3denySrc, s3trigger);
assert(!s3denyElig.eligible, '3.07 DENY propagation right → not eligible');
assert(s3denyElig.blockedReasons.includes('SOURCE_EDGE_RIGHTS_DENY'), '3.08 blocked reason includes SOURCE_EDGE_RIGHTS_DENY');

const s3lowConfSrc = makeSourceEdge({ confidenceBand: 'LOW' });
const s3lowElig = checkPropagationEligibility(s3rule, s3lowConfSrc, s3trigger);
assert(!s3lowElig.eligible, '3.09 LOW confidence below MEDIUM → not eligible');
assert(s3lowElig.blockedReasons.includes('SOURCE_CONFIDENCE_TOO_LOW'), '3.10 blocked reason includes SOURCE_CONFIDENCE_TOO_LOW');

const s3unresolvedSrc = makeSourceEdge({ confidenceBand: 'UNRESOLVED' });
const s3unresolvedElig = checkPropagationEligibility(s3rule, s3unresolvedSrc, s3trigger);
assert(!s3unresolvedElig.eligible, '3.11 UNRESOLVED confidence → not eligible');
assert(s3unresolvedElig.blockedReasons.includes('SOURCE_CONFIDENCE_TOO_LOW'), '3.12 UNRESOLVED blocked for confidence');

const s3noMetricTrigger = makeTrigger({ supportingMetricObservationRefs: [] });
const s3noMetricElig = checkPropagationEligibility(s3rule, makeSourceEdge(), s3noMetricTrigger);
assert(!s3noMetricElig.eligible, '3.13 missing metric support → not eligible');
assert(s3noMetricElig.blockedReasons.includes('MISSING_METRIC_SUPPORT'), '3.14 blocked reason includes MISSING_METRIC_SUPPORT');

const s3validSrc = makeSourceEdge();
const s3validTrigger = makeTrigger();
const s3validElig = checkPropagationEligibility(s3rule, s3validSrc, s3validTrigger);
assert(s3validElig.eligible, '3.15 valid source + valid trigger → eligible');
assert(s3validElig.blockedReasons.length === 0, '3.16 no blocked reasons for valid case');

const s3mediumSrc = makeSourceEdge({ confidenceBand: 'MEDIUM' });
const s3medElig = checkPropagationEligibility(s3rule, s3mediumSrc, s3validTrigger);
assert(s3medElig.eligible, '3.17 MEDIUM confidence meets MEDIUM requirement');

registerGraphNode(makeNode('s3_chain', 'CANONICAL', 'CHAIN'));
registerGraphNode(makeNode('s3_proto', 'CANONICAL', 'PROTOCOL'));
const s3gEdges: GraphEdgeForTraversal[] = [
  makeGraphEdge('s3_e1', 'PROTOCOL_OPERATES_ON_CHAIN', 's3_chain', 's3_proto', 'CHAIN', 'PROTOCOL'),
];

const s3staleResult = evaluatePropagationTrigger({
  rule: s3rule, trigger: s3trigger, sourceNodeId: 's3_chain',
  sourceEdge: s3staleSrc, graphEdges: s3gEdges, sourceStrength: 80,
});
assert(s3staleResult.eligibilityBlocked, '3.18 stale source blocks full evaluation');
assert(s3staleResult.events.length === 0, '3.19 no events from stale source');
assert(s3staleResult.trails.length === 0, '3.20 no trails from stale source');

const s3denyResult = evaluatePropagationTrigger({
  rule: s3rule, trigger: s3validTrigger, sourceNodeId: 's3_chain',
  sourceEdge: s3denySrc, graphEdges: s3gEdges, sourceStrength: 80,
});
assert(s3denyResult.eligibilityBlocked, '3.21 DENY blocks full evaluation');
assert(s3denyResult.events.length === 0, '3.22 no events from DENY source');

const s3lowResult = evaluatePropagationTrigger({
  rule: s3rule, trigger: s3validTrigger, sourceNodeId: 's3_chain',
  sourceEdge: s3lowConfSrc, graphEdges: s3gEdges, sourceStrength: 80,
});
assert(s3lowResult.eligibilityBlocked, '3.23 LOW confidence blocks full evaluation');

const s3expResult = evaluatePropagationTrigger({
  rule: s3rule, trigger: s3validTrigger, sourceNodeId: 's3_chain',
  sourceEdge: s3expiredSrc, graphEdges: s3gEdges, sourceStrength: 80,
});
assert(s3expResult.eligibilityBlocked, '3.24 expired blocks full evaluation');
assert(s3expResult.eligibilityReasons.includes('SOURCE_EDGE_EXPIRED'), '3.25 expired reason propagated');

const s3multiBlock = makeSourceEdge({ temporalStatus: 'STALE', propagationRight: 'DENY' });
const s3multiElig = checkPropagationEligibility(s3rule, s3multiBlock, s3validTrigger);
assert(!s3multiElig.eligible, '3.26 multiple violations → not eligible');
assert(s3multiElig.blockedReasons.length >= 2, '3.27 multiple blocked reasons reported');

const s3eventRule = getPropagationRule('RULE_UNLOCK_FLOAT_PRESSURE')!;
const s3noEventTrigger = makeTrigger({ supportingEventNodeIds: [], supportingMetricObservationRefs: ['obs'] });
const s3noEventElig = checkPropagationEligibility(s3eventRule, makeSourceEdge(), s3noEventTrigger);
assert(!s3noEventElig.eligible, '3.28 missing event support → not eligible');
assert(s3noEventElig.blockedReasons.includes('MISSING_EVENT_SUPPORT'), '3.29 blocked reason includes MISSING_EVENT_SUPPORT');

const s3highSrc = makeSourceEdge({ confidenceBand: 'HIGH' });
const s3highElig = checkPropagationEligibility(s3rule, s3highSrc, s3validTrigger);
assert(s3highElig.eligible, '3.30 HIGH confidence meets MEDIUM requirement');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Propagation Events and Query Surface Integration (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 4 — Propagation Events and Query Surface Integration ===');
resetAll();
bootstrapPropagationRules();

registerGraphNode(makeNode('s4_chain', 'CANONICAL', 'CHAIN'));
registerGraphNode(makeNode('s4_proto', 'CANONICAL', 'PROTOCOL'));
registerGraphNode(makeNode('s4_asset', 'CANONICAL', 'ASSET'));

registerLiveGraphEdge(makeEdge('s4_e1', 'PROTOCOL_OPERATES_ON_CHAIN', 's4_proto', 's4_chain', 'PROTOCOL', 'CHAIN', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s4_e2', 'ASSET_BELONGS_TO_PROTOCOL', 's4_asset', 's4_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s4_e3', 'PROTOCOL_HAS_TOKEN', 's4_proto', 's4_asset', 'PROTOCOL', 'ASSET', 'STRUCTURAL'));

const s4rule = getPropagationRule('RULE_PROTOCOL_STRENGTH_TOKEN_SUPPORT')!;
assert(s4rule !== undefined, '4.01 token support rule exists');

const s4trigger = makeTrigger({
  sourceNodeIds: ['s4_proto'], sourceEdgeIds: ['s4_e3'],
  supportingMetricObservationRefs: ['mobs_s4'],
});
const s4srcEdge = makeSourceEdge({
  edgeId: 's4_e3', edgeType: 'PROTOCOL_HAS_TOKEN',
  subjectNodeId: 's4_proto', objectNodeId: 's4_asset',
  subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
});
const s4gEdges: GraphEdgeForTraversal[] = [
  makeGraphEdge('s4_e3', 'PROTOCOL_HAS_TOKEN', 's4_proto', 's4_asset', 'PROTOCOL', 'ASSET'),
];

const s4propResult = evaluatePropagationTrigger({
  rule: s4rule, trigger: s4trigger, sourceNodeId: 's4_proto',
  sourceEdge: s4srcEdge, graphEdges: s4gEdges, sourceStrength: 75,
});
assert(!s4propResult.eligibilityBlocked, '4.02 propagation not blocked');
assert(s4propResult.events.length === 1, '4.03 1 propagation event created');

const s4ev = s4propResult.events[0];
assert(s4ev.targetNodeId === 's4_asset', '4.04 event targets s4_asset');
assert(s4ev.sourceNodeId === 's4_proto', '4.05 event source is s4_proto');

const s4spillover = getSpilloverPathsFromEvent('s4_asset');
assert(s4spillover !== undefined, '4.06 getSpilloverPathsFromEvent returns result');
assert(s4spillover.queryType === 'SPILLOVER_FROM_EVENT', '4.07 query type is SPILLOVER_FROM_EVENT');
assert(typeof s4spillover.queryId === 'string', '4.08 spillover has queryId');

assert(Array.isArray(s4spillover.pathSummaries), '4.09 spillover has pathSummaries');
assert(s4spillover.confidenceSummary !== undefined, '4.10 spillover has confidenceSummary');
assert(typeof s4spillover.confidenceSummary.high === 'number', '4.11 spillover confidence has high count');

assert(Array.isArray(s4spillover.blockedSections), '4.12 spillover has blockedSections');
assert(Array.isArray(s4spillover.blockedReasonCodes), '4.13 spillover has blockedReasonCodes');
assert(Array.isArray(s4spillover.prunedEdgeIds), '4.14 spillover has prunedEdgeIds');

const s4protoCtx = getProtocolContextForAsset('s4_asset');
assert(s4protoCtx.queryType === 'PROTOCOL_CONTEXT_FOR_ASSET', '4.15 protocol context query type correct');
assert(s4protoCtx.resultNodeIds.length >= 0, '4.16 protocol context returns result');
assert(Array.isArray(s4protoCtx.traversedEdgeIds), '4.17 protocol context has traversedEdgeIds');

const s4evByNode = getPropagationEventsForNode('s4_asset');
assert(s4evByNode.length >= 1, '4.18 events for node s4_asset exist');
assert(s4evByNode[0].propagationEventId === s4ev.propagationEventId, '4.19 correct event returned for node');

const s4trail = getPropagationTrail(s4ev.trailRef);
assert(s4trail !== undefined, '4.20 trail retrievable');
assert(s4trail!.steps.length > 0, '4.21 trail has steps');
assert(s4trail!.finalStrengthScore > 0, '4.22 trail finalStrengthScore > 0');

const s4impact = getTargetImpactState('s4_asset');
assert(s4impact !== undefined, '4.23 impact state exists for s4_asset');
assert(s4impact!.strongestStrengthScore! > 0, '4.24 strongest strength > 0');
assert(s4impact!.strongestEffectClass === 'DEPENDENCY_IMPACT', '4.25 strongest effect class correct');

const s4exposure = getExposureRadius('s4_asset');
assert(s4exposure !== undefined, '4.26 getExposureRadius returns result');
assert(s4exposure.queryType === 'EXPOSURE_RADIUS', '4.27 exposure query type correct');

assert(s4spillover.schemaVersion === 'v1', '4.28 spillover schemaVersion is v1');
assert(s4protoCtx.schemaVersion === 'v1', '4.29 protocol context schemaVersion is v1');
assert(s4spillover.temporalSummary !== undefined, '4.30 spillover has temporalSummary');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Propagation → Context Package Notes (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 5 — Propagation → Context Package Notes ===');
resetAll();
bootstrapPropagationRules();

registerGraphNode(makeNode('s5_chain', 'CANONICAL', 'CHAIN'));
registerGraphNode(makeNode('s5_proto', 'CANONICAL', 'PROTOCOL'));
registerGraphNode(makeNode('s5_asset', 'CANONICAL', 'ASSET'));

registerLiveGraphEdge(makeEdge('s5_e1', 'PROTOCOL_OPERATES_ON_CHAIN', 's5_proto', 's5_chain', 'PROTOCOL', 'CHAIN', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s5_e2', 'ASSET_BELONGS_TO_PROTOCOL', 's5_asset', 's5_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s5_e3', 'PROTOCOL_HAS_TOKEN', 's5_proto', 's5_asset', 'PROTOCOL', 'ASSET', 'STRUCTURAL'));

const s5rule = getPropagationRule('RULE_PROTOCOL_STRENGTH_TOKEN_SUPPORT')!;
const s5trigger = makeTrigger({
  sourceNodeIds: ['s5_proto'], sourceEdgeIds: ['s5_e3'],
  supportingMetricObservationRefs: ['mobs_s5'],
});
const s5srcEdge = makeSourceEdge({
  edgeId: 's5_e3', edgeType: 'PROTOCOL_HAS_TOKEN',
  subjectNodeId: 's5_proto', objectNodeId: 's5_asset',
  subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
});
const s5gEdges: GraphEdgeForTraversal[] = [
  makeGraphEdge('s5_e3', 'PROTOCOL_HAS_TOKEN', 's5_proto', 's5_asset', 'PROTOCOL', 'ASSET'),
];

const s5propResult = evaluatePropagationTrigger({
  rule: s5rule, trigger: s5trigger, sourceNodeId: 's5_proto',
  sourceEdge: s5srcEdge, graphEdges: s5gEdges, sourceStrength: 70,
});
assert(s5propResult.events.length >= 1, '5.01 propagation events fired');

const s5tokenPkg = buildTokenContextPackage('s5_asset');
assert(s5tokenPkg.subjectObjectId === 's5_asset', '5.02 token package subject correct');
assert(s5tokenPkg.subjectObjectType === 'ASSET', '5.03 token package type is ASSET');
assert(typeof s5tokenPkg.packageId === 'string', '5.04 token package has packageId');
assert(s5tokenPkg.schemaVersion === 'v1', '5.05 token package schemaVersion v1');

assert(s5tokenPkg.propagationNotes.length > 0, '5.06 propagationNotes populated on token package');
assert(s5tokenPkg.propagationEventRefs.length > 0, '5.07 propagationEventRefs populated');

const s5hasNotDeterministic = s5tokenPkg.propagationNotes.some(n => n.includes('not deterministic truth'));
assert(s5hasNotDeterministic, '5.08 notes contain "not deterministic truth" language');

const s5hasAllowedUses = s5tokenPkg.propagationNotes.some(n => n.includes('allowed for'));
assert(s5hasAllowedUses, '5.09 notes contain allowed use domains');

assert(s5tokenPkg.confidenceSummary.spilloverConfidence !== 'LIMITED', '5.10 spilloverConfidence not LIMITED when events exist');
assert(typeof s5tokenPkg.confidenceSummary.structuralConfidence === 'string', '5.11 structuralConfidence is a string');
assert(typeof s5tokenPkg.confidenceSummary.narrativeConfidence === 'string', '5.12 narrativeConfidence is a string');

assert(s5tokenPkg.explanationFootnotes.length > 0, '5.13 explanationFootnotes populated');
const s5hasPropFootnote = s5tokenPkg.explanationFootnotes.some(f => f.toLowerCase().includes('propagation'));
assert(s5hasPropFootnote, '5.14 footnotes mention propagation');

assert(Array.isArray(s5tokenPkg.protocolContext.nodeIds), '5.15 token package has protocol context nodeIds array');
assert(Array.isArray(s5tokenPkg.protocolContext.edgeIds), '5.16 token package has protocol context edgeIds array');

const s5protoPkg = buildProtocolContextPackage('s5_proto');
assert(s5protoPkg.subjectObjectId === 's5_proto', '5.17 protocol package subject correct');
assert(s5protoPkg.subjectObjectType === 'PROTOCOL', '5.18 protocol package type is PROTOCOL');

assert(Array.isArray(s5protoPkg.propagationNotes), '5.19 protocol package has propagationNotes array');
assert(Array.isArray(s5protoPkg.propagationEventRefs), '5.20 protocol package has propagationEventRefs');

assert(s5protoPkg.chainContext !== undefined, '5.21 protocol package has chainContext');
assert(Array.isArray(s5protoPkg.chainContext.nodeIds), '5.22 protocol package chain context is array');

assert(s5tokenPkg.historical === false, '5.23 token package is not historical');
assert(s5protoPkg.historical === false, '5.24 protocol package is not historical');

assert(Array.isArray(s5tokenPkg.staleOrContestedAreas), '5.25 staleOrContestedAreas is array');
assert(s5tokenPkg.pathQualitySummary !== undefined, '5.26 pathQualitySummary exists');
assert(typeof s5tokenPkg.pathQualitySummary.strongPaths === 'number', '5.27 strongPaths is number');
assert(typeof s5tokenPkg.pathQualitySummary.stalePaths === 'number', '5.28 stalePaths is number');

assert(Array.isArray(s5tokenPkg.evidenceRefs), '5.29 evidenceRefs is array');
assert(Array.isArray(s5tokenPkg.queryRefs), '5.30 queryRefs is array');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 6 — Bounded Propagation Constraints (25 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 6 — Bounded Propagation Constraints ===');
resetAll();
bootstrapPropagationRules();

registerGraphNode(makeNode('s6_chain', 'CANONICAL', 'CHAIN'));
registerGraphNode(makeNode('s6_proto', 'CANONICAL', 'PROTOCOL'));
registerGraphNode(makeNode('s6_asset', 'CANONICAL', 'ASSET'));

const s6rule = getPropagationRule('RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS')!;

const s6gEdges: GraphEdgeForTraversal[] = [
  makeGraphEdge('s6_e1', 'PROTOCOL_OPERATES_ON_CHAIN', 's6_chain', 's6_proto', 'CHAIN', 'PROTOCOL'),
];
const s6trigger = makeTrigger({ sourceNodeIds: ['s6_chain'], sourceEdgeIds: ['s6_e1'] });
const s6srcEdge = makeSourceEdge({
  edgeId: 's6_e1', subjectNodeId: 's6_chain', objectNodeId: 's6_proto',
  subjectNodeType: 'CHAIN', objectNodeType: 'PROTOCOL',
});

const s6result = evaluatePropagationTrigger({
  rule: s6rule, trigger: s6trigger, sourceNodeId: 's6_chain',
  sourceEdge: s6srcEdge, graphEdges: s6gEdges, sourceStrength: 80,
});

assert(s6result.events.length === 1, '6.01 1 event produced');
const s6ev = s6result.events[0];

assert(s6ev.allowedUses.length > 0, '6.02 allowedUses not empty');
assert(s6ev.allowedUses.length < 6, '6.03 allowedUses bounded (not universal)');
assert(s6ev.blockedUses.length > 0, '6.04 blockedUses populated');

const s6allDomains = [...s6ev.allowedUses, ...s6ev.blockedUses];
const s6domainSet = new Set(s6allDomains);
assert(s6domainSet.size === s6allDomains.length, '6.05 no overlap between allowed and blocked uses');

assert(s6ev.strengthScore <= 80, '6.06 strengthScore ≤ source strength (decay applied)');
assert(s6ev.strengthScore > 0, '6.07 strengthScore > 0');
assert(s6ev.cumulativeDecayFactor < 1.0, '6.08 cumulativeDecayFactor < 1.0');

assert(s6ev.schemaVersion === 'v1', '6.09 schemaVersion present');
assert(typeof s6ev.propagationEventId === 'string', '6.10 propagationEventId is string');
assert(typeof s6ev.ruleId === 'string', '6.11 ruleId is string');

const s6trail = getPropagationTrail(s6ev.trailRef)!;
assert(s6trail.explanationTemplateUsed.includes('{source}'), '6.12 trail explanation template has {source} placeholder');
assert(s6trail.explanationTemplateUsed.includes('{target}'), '6.13 trail explanation template has {target} placeholder');

registerGraphNode(makeNode('s6_far_proto', 'CANONICAL', 'PROTOCOL'));
const s6farEdges: GraphEdgeForTraversal[] = [
  makeGraphEdge('s6_hop1', 'PROTOCOL_OPERATES_ON_CHAIN', 's6_chain', 's6_proto', 'CHAIN', 'PROTOCOL'),
  makeGraphEdge('s6_hop2', 'PROTOCOL_OPERATES_ON_CHAIN', 's6_proto', 's6_far_proto', 'PROTOCOL', 'PROTOCOL'),
];
const s6farResult = evaluatePropagationTrigger({
  rule: s6rule, trigger: s6trigger, sourceNodeId: 's6_chain',
  sourceEdge: s6srcEdge, graphEdges: s6farEdges, sourceStrength: 80,
});
const s6farEvents = s6farResult.events.filter(e => e.targetNodeId === 's6_far_proto');
assert(s6farEvents.length === 0, '6.14 hop limit prevents reaching s6_far_proto');

const s6denyEdges: GraphEdgeForTraversal[] = [
  makeGraphEdge('s6_deny', 'PROTOCOL_OPERATES_ON_CHAIN', 's6_chain', 's6_proto', 'CHAIN', 'PROTOCOL', { propagationRight: 'DENY' }),
];
const s6denyResult = evaluatePropagationTrigger({
  rule: s6rule, trigger: s6trigger, sourceNodeId: 's6_chain',
  sourceEdge: s6srcEdge, graphEdges: s6denyEdges, sourceStrength: 80,
});
assert(s6denyResult.events.length === 0, '6.15 DENY edge produces no events');
assert(s6denyResult.blockedPaths.length >= 1, '6.16 DENY edge reports blocked path');

assert(s6ev.traversedEdgeIds.length > 0, '6.17 event has traversedEdgeIds');
assert(s6ev.evidenceRefs.length >= 0, '6.18 event has evidenceRefs array');
assert(typeof s6ev.confidenceBand === 'string', '6.19 event has confidenceBand');

const s6validation = validatePropagationRule(s6rule);
assert(s6validation.valid, '6.20 RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS passes validation');
assert(s6validation.violations.length === 0, '6.21 no violations on valid rule');

const s6badRule: PropagationRule = {
  ...s6rule, ruleId: '', hopLimit: 0, decayPerHop: 2.0,
  explanationTemplate: '', blockedUsesUnderUncertainty: [],
};
const s6badValidation = validatePropagationRule(s6badRule);
assert(!s6badValidation.valid, '6.22 invalid rule fails validation');
assert(s6badValidation.violations.length >= 3, '6.23 multiple violations reported');

assert(s6trail.schemaVersion === 'v1', '6.24 trail schemaVersion present');
assert(s6trail.steps.every(s => typeof s.hopDecayApplied === 'number'), '6.25 all trail steps have hopDecayApplied');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 7 — Event Window and Temporal Propagation (25 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 7 — Event Window and Temporal Propagation ===');
resetAll();
bootstrapPropagationRules();

registerGraphNode(makeNode('s7_unlock', 'GRAPH_NATIVE', 'UNLOCK_EVENT'));
registerGraphNode(makeNode('s7_asset', 'CANONICAL', 'ASSET'));
registerGraphNode(makeNode('s7_proto', 'CANONICAL', 'PROTOCOL'));
registerGraphNode(makeNode('s7_chain', 'CANONICAL', 'CHAIN'));

registerLiveGraphEdge(makeEdge('s7_e1', 'PROTOCOL_OPERATES_ON_CHAIN', 's7_proto', 's7_chain', 'PROTOCOL', 'CHAIN', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s7_e2', 'ASSET_BELONGS_TO_PROTOCOL', 's7_asset', 's7_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s7_e3', 'PROTOCOL_HAS_TOKEN', 's7_proto', 's7_asset', 'PROTOCOL', 'ASSET', 'STRUCTURAL'));

const s7winRule = getPropagationRule('RULE_UNLOCK_FLOAT_PRESSURE')!;
assert(s7winRule !== undefined, '7.01 RULE_UNLOCK_FLOAT_PRESSURE exists');
assert(s7winRule.maxPropagationWindowMs! > 0, '7.02 rule has maxPropagationWindowMs');

const s7winTrigger = makeTrigger({
  triggerId: 'trig_s7_win',
  triggerType: 'EVENT_SHOCK',
  sourceNodeIds: ['s7_unlock'], sourceEdgeIds: ['s7_win_edge'],
  supportingMetricObservationRefs: ['mobs_s7'],
  supportingEventNodeIds: ['s7_unlock'],
  createdAt: '2026-03-01T00:00:00Z',
});
const s7winSrcEdge: SourceEdgeContext = {
  edgeId: 's7_win_edge', edgeType: 'UNLOCK_IMPACTS_FLOAT',
  confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
  subjectNodeId: 's7_unlock', objectNodeId: 's7_asset',
  subjectNodeType: 'UNLOCK_EVENT', objectNodeType: 'ASSET',
};
const s7winGEdges: GraphEdgeForTraversal[] = [
  makeGraphEdge('s7_win_edge', 'UNLOCK_IMPACTS_FLOAT', 's7_unlock', 's7_asset', 'UNLOCK_EVENT', 'ASSET'),
];

const s7winResult = evaluatePropagationTrigger({
  rule: s7winRule, trigger: s7winTrigger, sourceNodeId: 's7_unlock',
  sourceEdge: s7winSrcEdge, graphEdges: s7winGEdges, sourceStrength: 70,
});
assert(s7winResult.events.length >= 1, '7.03 windowed propagation produces events');

const s7winEv = s7winResult.events[0];
assert(s7winEv.activeFrom === '2026-03-01T00:00:00Z', '7.04 event activeFrom correct');
assert(s7winEv.activeTo !== undefined, '7.05 windowed event has activeTo');

const s7activeTo = new Date(s7winEv.activeTo!).getTime();
const s7activeFrom = new Date(s7winEv.activeFrom).getTime();
assert(s7activeTo > s7activeFrom, '7.06 activeTo is after activeFrom');

const s7windowMs = s7activeTo - s7activeFrom;
assert(s7windowMs === s7winRule.maxPropagationWindowMs!, '7.07 window matches rule maxPropagationWindowMs');

const s7withinWindow = getActivePropagationForNodeAtTime('s7_asset', '2026-03-10T00:00:00Z');
assert(s7withinWindow.length >= 1, '7.08 events present within window');
assert(s7withinWindow.some(e => e.propagationEventId === s7winEv.propagationEventId), '7.09 correct event within window');

const s7beforeWindow = getActivePropagationForNodeAtTime('s7_asset', '2026-02-01T00:00:00Z');
assert(s7beforeWindow.length === 0, '7.10 no events before window');

const s7afterWindow = getActivePropagationForNodeAtTime('s7_asset', '2026-06-01T00:00:00Z');
const s7afterWinIds = s7afterWindow.map(e => e.propagationEventId);
assert(!s7afterWinIds.includes(s7winEv.propagationEventId), '7.11 windowed event not active after window');

const s7rule2 = getPropagationRule('RULE_PROTOCOL_STRENGTH_TOKEN_SUPPORT')!;
const s7trigger2 = makeTrigger({
  triggerId: 'trig_s7_2',
  sourceNodeIds: ['s7_proto'], sourceEdgeIds: ['s7_e3'],
  supportingMetricObservationRefs: ['mobs_s7_2'],
  createdAt: '2026-03-05T00:00:00Z',
});
const s7srcEdge2 = makeSourceEdge({
  edgeId: 's7_e3', edgeType: 'PROTOCOL_HAS_TOKEN',
  subjectNodeId: 's7_proto', objectNodeId: 's7_asset',
  subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
});
const s7gEdges2: GraphEdgeForTraversal[] = [
  makeGraphEdge('s7_e3', 'PROTOCOL_HAS_TOKEN', 's7_proto', 's7_asset', 'PROTOCOL', 'ASSET'),
];

const s7result2 = evaluatePropagationTrigger({
  rule: s7rule2, trigger: s7trigger2, sourceNodeId: 's7_proto',
  sourceEdge: s7srcEdge2, graphEdges: s7gEdges2, sourceStrength: 65,
});
assert(s7result2.events.length >= 1, '7.12 second rule produces events');

const s7allForAsset = getPropagationEventsForNode('s7_asset');
assert(s7allForAsset.length >= 2, '7.13 multiple events from different rules accumulate');

const s7ruleIds = new Set(s7allForAsset.map(e => e.ruleId));
assert(s7ruleIds.size >= 2, '7.14 events come from at least 2 different rules');

const s7atMid = getActivePropagationForNodeAtTime('s7_asset', '2026-03-10T00:00:00Z');
assert(s7atMid.length >= 2, '7.15 both events active at mid-window');

const s7result2Ev = s7result2.events[0];
assert(s7result2Ev.activeTo === undefined, '7.16 non-windowed event has no activeTo');

const s7farFuture = getActivePropagationForNodeAtTime('s7_asset', '2027-01-01T00:00:00Z');
const s7farIds = s7farFuture.map(e => e.propagationEventId);
assert(!s7farIds.includes(s7winEv.propagationEventId), '7.17 windowed event expired in far future');
assert(s7farIds.includes(s7result2Ev.propagationEventId), '7.18 non-windowed event still active in far future');

const s7tokenPkg = buildTokenContextPackage('s7_asset');
assert(s7tokenPkg.propagationNotes.length >= 1, '7.19 token package has propagation notes');
assert(s7tokenPkg.propagationEventRefs.length >= 1, '7.20 token package has event refs');
assert(s7tokenPkg.confidenceSummary.spilloverConfidence !== 'LIMITED', '7.21 spillover confidence not LIMITED');

const s7protoPkg = buildProtocolContextPackage('s7_proto');
assert(s7protoPkg.subjectObjectType === 'PROTOCOL', '7.22 protocol package type correct');
assert(Array.isArray(s7protoPkg.propagationNotes), '7.23 protocol package propagationNotes is array');

const s7trigger3 = makeTrigger({
  triggerId: 'trig_s7_3',
  sourceNodeIds: ['s7_proto'], sourceEdgeIds: ['s7_e3'],
  supportingMetricObservationRefs: ['mobs_s7_3'],
  createdAt: '2026-04-01T00:00:00Z',
});
evaluatePropagationTrigger({
  rule: s7rule2, trigger: s7trigger3, sourceNodeId: 's7_proto',
  sourceEdge: s7srcEdge2, graphEdges: s7gEdges2, sourceStrength: 60,
});
const s7allAfterThird = getPropagationEventsForNode('s7_asset');
assert(s7allAfterThird.length >= 3, '7.24 old events do not interfere with new trigger');
assert(
  new Set(s7allAfterThird.map(e => e.propagationEventId)).size === s7allAfterThird.length,
  '7.25 all event IDs are unique',
);

})();

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
