/**
 * L4.4 — Propagation Logic: Certification Test
 *
 * Eight suites, 105+ assertions.
 *   A — Rule registry
 *   B — Propagation eligibility
 *   C — Strength and decay
 *   D — Hop and cycle control
 *   E — Propagation events and trails
 *   F — Anti-fake suite
 *   G — Cross-layer safety
 *   H — Historical and replay
 */

import {
  validatePropagationRule, registerPropagationRule,
  getPropagationRule, listRulesByEffectClass, listRulesBySourceEdgeType,
  getAllPropagationRules, validateTrigger,
  checkPropagationEligibility, traversePropagationPaths,
  computePropagationStrength, evaluatePropagationTrigger,
  getPropagationEventsForNode, getPropagationEventById,
  getActivePropagationForNodeAtTime, getPropagationTrail,
  getTargetImpactState, getAllPropagationEvents,
  bootstrapPropagationRules, resetPropagationEngine,
} from '../services/knowledge-graph/graph-propagation-engine';
import type {
  PropagationRule, PropagationTrigger, SourceEdgeContext,
  GraphEdgeForTraversal, PropagationEvaluationInput,
  PropagationEffectClass, ConfidenceBand,
} from '../services/knowledge-graph/graph-propagation-engine';
import type { TemporalEdgeStatus } from '../services/knowledge-graph/temporal-graph-state';

import { resetRelationOntology, bootstrapRelationOntology } from '../services/knowledge-graph/relation-ontology';

let passed = 0;
let failed = 0;

function ok(id: string, expr: boolean, msg: string): void {
  if (expr) { passed++; }
  else { failed++; console.error(`  FAIL ${id}: ${msg}`); }
}

function fresh(): void {
  resetPropagationEngine();
  resetRelationOntology();
  bootstrapRelationOntology();
  bootstrapPropagationRules();
}

const NOW = '2026-04-03T12:00:00Z';

function makeTrigger(overrides: Partial<PropagationTrigger> = {}): PropagationTrigger {
  return {
    triggerId: 'trig_001',
    triggerType: 'METRIC_THRESHOLD_CROSSED',
    sourceNodeIds: ['gn:canonical:chain:chain_eth'],
    sourceEdgeIds: ['edge_proto_chain'],
    supportingMetricObservationRefs: ['mobs_001'],
    supportingEventNodeIds: [],
    createdAt: NOW,
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

function makeEdge(
  id: string, type: string,
  sub: string, obj: string,
  subType: string, objType: string,
  overrides: Partial<GraphEdgeForTraversal> = {},
): GraphEdgeForTraversal {
  return {
    edgeId: id, edgeType: type,
    subjectNodeId: sub, objectNodeId: obj,
    subjectNodeType: subType, objectNodeType: objType,
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE',
    propagationRight: 'ALLOW',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE A — RULE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

function suiteA(): void {
  console.log('\n--- Suite A: Rule Registry ---');
  fresh();

  const all = getAllPropagationRules();
  ok('A1', all.length === 6, '6 bootstrap rules registered');

  const chainRule = getPropagationRule('RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS');
  ok('A2', !!chainRule, 'Chain weakness rule exists');
  ok('A3', chainRule!.effectClass === 'DEPENDENCY_IMPACT', 'Correct effect class');
  ok('A4', chainRule!.hopLimit === 1, 'Hop limit is 1');
  ok('A5', chainRule!.decayPerHop === 0.75, 'Decay per hop is 0.75');

  const byEffect = listRulesByEffectClass('DEPENDENCY_IMPACT');
  ok('A6', byEffect.length >= 2, 'At least 2 dependency impact rules');

  const byEdge = listRulesBySourceEdgeType('NARRATIVE_AFFECTS_ASSET');
  ok('A7', byEdge.length >= 1, 'Narrative rule found by source edge');

  const invalidRule: PropagationRule = {
    ruleId: '', contractVersion: 'v1',
    sourceEdgeTypes: ['ASSET_BELONGS_TO_PROTOCOL'],
    sourceNodeTypes: ['ASSET'], targetNodeTypes: ['PROTOCOL'],
    effectClass: 'DEPENDENCY_IMPACT', strengthModel: 'DIRECT_TRANSFER',
    hopLimit: 0, decayPerHop: 0.5,
    requiredSourceConfidence: 'MEDIUM',
    requiredSourceTemporalStates: ['ACTIVE'],
    blockedConditions: [], querySurfacesAllowed: [],
    blockedUsesUnderUncertainty: [],
    explanationTemplate: '',
    replayCompatibility: { schemaVersion: 'v1' },
  };
  const iv = validatePropagationRule(invalidRule);
  ok('A8', !iv.valid, 'Invalid rule rejected');
  ok('A9', iv.violations.includes('MISSING_RULE_ID'), 'Missing rule ID violation');
  ok('A10', iv.violations.includes('HOP_LIMIT_BELOW_1'), 'Hop limit violation');
  ok('A11', iv.violations.includes('MISSING_EXPLANATION_TEMPLATE'), 'Missing template violation');
  ok('A12', iv.violations.includes('MISSING_BLOCKED_USES'), 'Missing blocked uses violation');

  const unknownEdge = validatePropagationRule({
    ...invalidRule, ruleId: 'BAD_EDGE',
    sourceEdgeTypes: ['NONEXISTENT_EDGE_TYPE'],
    hopLimit: 1, explanationTemplate: 'x',
    blockedUsesUnderUncertainty: ['comparison'],
  });
  ok('A13', unknownEdge.violations.some(v => v.includes('INVALID_SOURCE_EDGE_TYPE')),
    'Unregistered edge type detected');

  const badNodeType = validatePropagationRule({
    ...invalidRule, ruleId: 'BAD_NODE', hopLimit: 1,
    sourceEdgeTypes: ['NARRATIVE_AFFECTS_ASSET'],
    sourceNodeTypes: ['FAKE_NODE'], targetNodeTypes: ['ASSET'],
    explanationTemplate: 'x', blockedUsesUnderUncertainty: ['comparison'],
  });
  ok('A14', badNodeType.violations.some(v => v.includes('INVALID_NODE_TYPE')),
    'Invalid node type detected');

  const dupe = registerPropagationRule(chainRule!);
  ok('A15', !dupe.success, 'Duplicate rule registration blocked');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE B — PROPAGATION ELIGIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

function suiteB(): void {
  console.log('\n--- Suite B: Propagation Eligibility ---');
  fresh();

  const rule = getPropagationRule('RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS')!;

  const eligible = checkPropagationEligibility(rule, makeSourceEdge(), makeTrigger());
  ok('B1', eligible.eligible, 'Valid source passes eligibility');

  const nonPropEdge = checkPropagationEligibility(rule, makeSourceEdge({
    edgeType: 'ASSET_BELONGS_TO_PROTOCOL', propagationRight: 'DENY',
  }), makeTrigger());
  ok('B2', !nonPropEdge.eligible, 'Non-propagation-eligible edge blocked');
  ok('B3', nonPropEdge.blockedReasons.includes('SOURCE_EDGE_RIGHTS_DENY'), 'DENY rights blocked');

  const staleSource = checkPropagationEligibility(rule, makeSourceEdge({
    temporalStatus: 'STALE',
  }), makeTrigger());
  ok('B4', !staleSource.eligible, 'Stale source blocked');
  ok('B5', staleSource.blockedReasons.includes('SOURCE_EDGE_STALE'), 'Stale reason present');

  const expiredSource = checkPropagationEligibility(rule, makeSourceEdge({
    temporalStatus: 'EXPIRED',
  }), makeTrigger());
  ok('B6', !expiredSource.eligible, 'Expired source blocked');
  ok('B7', expiredSource.blockedReasons.includes('SOURCE_EDGE_EXPIRED'), 'Expired reason present');

  const contestedSource = checkPropagationEligibility(rule, makeSourceEdge({
    temporalStatus: 'CONTESTED',
  }), makeTrigger());
  ok('B8', !contestedSource.eligible, 'Contested source blocked');

  const lowConf = checkPropagationEligibility(rule, makeSourceEdge({
    confidenceBand: 'LOW',
  }), makeTrigger());
  ok('B9', !lowConf.eligible, 'Low confidence blocked');
  ok('B10', lowConf.blockedReasons.includes('SOURCE_CONFIDENCE_TOO_LOW'), 'Low confidence reason');

  const noMetric = checkPropagationEligibility(rule, makeSourceEdge(), makeTrigger({
    supportingMetricObservationRefs: [],
  }));
  ok('B11', !noMetric.eligible, 'Missing metric support blocked');
  ok('B12', noMetric.blockedReasons.includes('MISSING_METRIC_SUPPORT'), 'Missing metric reason');

  const unlockRule = getPropagationRule('RULE_UNLOCK_FLOAT_PRESSURE')!;
  const noEvent = checkPropagationEligibility(unlockRule, makeSourceEdge({
    edgeType: 'UNLOCK_IMPACTS_FLOAT',
  }), makeTrigger({ supportingEventNodeIds: [] }));
  ok('B13', !noEvent.eligible, 'Missing event support blocked');
  ok('B14', noEvent.blockedReasons.includes('MISSING_EVENT_SUPPORT'), 'Missing event reason');

  const tv = validateTrigger(makeTrigger());
  ok('B15', tv.valid, 'Valid trigger passes');

  const noId = validateTrigger(makeTrigger({ triggerId: '' }));
  ok('B16', !noId.valid, 'Missing trigger ID rejected');

  const noRefs = validateTrigger(makeTrigger({ sourceNodeIds: [], sourceEdgeIds: [] }));
  ok('B17', !noRefs.valid, 'No source references rejected');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE C — STRENGTH AND DECAY
// ═══════════════════════════════════════════════════════════════════════════════

function suiteC(): void {
  console.log('\n--- Suite C: Strength & Decay ---');
  fresh();

  const rule = getPropagationRule('RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS')!;
  const edge = makeEdge('e1', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_uni', 'CHAIN', 'PROTOCOL');

  const directStrength = computePropagationStrength(rule, {
    targetNodeId: 'proto_uni', targetNodeType: 'PROTOCOL',
    hopCount: 1, cumulativeDecay: 0.75, path: [edge],
  }, 80);
  ok('C1', directStrength.strengthScore > 0, 'Direct transfer has positive strength');
  ok('C2', directStrength.strengthScore <= 90, 'Capped by DEPENDENCY_IMPACT family cap');

  const weakEdge = makeEdge('e2', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_w', 'CHAIN', 'PROTOCOL',
    { confidenceBand: 'LOW' });
  const weakStrength = computePropagationStrength(rule, {
    targetNodeId: 'proto_w', targetNodeType: 'PROTOCOL',
    hopCount: 1, cumulativeDecay: 0.75, path: [weakEdge],
  }, 80);
  ok('C3', weakStrength.strengthScore < directStrength.strengthScore, 'Weak edge reduces strength');
  ok('C4', weakStrength.confidenceBand !== 'HIGH', 'Weak edge does not produce HIGH band');

  const narrativeRule = getPropagationRule('RULE_NARRATIVE_ACCELERATION_BROADCAST')!;
  const narEdge = makeEdge('e3', 'NARRATIVE_AFFECTS_ASSET', 'topic_ai', 'ast_sol', 'NARRATIVE_TOPIC', 'ASSET');
  const narStrength = computePropagationStrength(narrativeRule, {
    targetNodeId: 'ast_sol', targetNodeType: 'ASSET',
    hopCount: 1, cumulativeDecay: 0.5, path: [narEdge],
  }, 80);
  ok('C5', narStrength.strengthScore <= 55, 'Narrative capped by NARRATIVE_TRANSMISSION cap');

  const compRule = getPropagationRule('RULE_COMPETITIVE_PRESSURE_PROTOCOL')!;
  const compEdge = makeEdge('e4', 'PROTOCOL_HAS_COMPETITOR', 'proto_a', 'proto_b', 'PROTOCOL', 'PROTOCOL');
  const compStrength = computePropagationStrength(compRule, {
    targetNodeId: 'proto_b', targetNodeType: 'PROTOCOL',
    hopCount: 1, cumulativeDecay: 0.4, path: [compEdge],
  }, 80);
  ok('C6', compStrength.strengthScore <= 50, 'Competitive pressure capped at 50');

  const hop2Decay = computePropagationStrength(rule, {
    targetNodeId: 'proto_far', targetNodeType: 'PROTOCOL',
    hopCount: 2, cumulativeDecay: 0.75 * 0.75, path: [edge, edge],
  }, 80);
  ok('C7', hop2Decay.strengthScore < directStrength.strengthScore, 'Two-hop decay reduces strength');

  const unresolvedEdge = makeEdge('e5', 'PROTOCOL_OPERATES_ON_CHAIN', 'c', 'p', 'CHAIN', 'PROTOCOL',
    { confidenceBand: 'UNRESOLVED' });
  const unresolvedStrength = computePropagationStrength(rule, {
    targetNodeId: 'p', targetNodeType: 'PROTOCOL',
    hopCount: 1, cumulativeDecay: 0.75, path: [unresolvedEdge],
  }, 80);
  ok('C8', unresolvedStrength.confidenceBand === 'UNRESOLVED' || unresolvedStrength.strengthScore < 15,
    'UNRESOLVED edge produces very weak propagation');

  ok('C9', directStrength.strengthScore > compStrength.strengthScore,
    'Direct dependency stronger than competitive pressure');
  ok('C10', directStrength.strengthScore > narStrength.strengthScore,
    'Direct dependency stronger than narrative broadcast');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE D — HOP AND CYCLE CONTROL
// ═══════════════════════════════════════════════════════════════════════════════

function suiteD(): void {
  console.log('\n--- Suite D: Hop & Cycle Control ---');
  fresh();

  const rule1Hop = getPropagationRule('RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS')!;
  const edges = [
    makeEdge('e_d1', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_uni', 'CHAIN', 'PROTOCOL'),
    makeEdge('e_d2', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_uni', 'proto_deep', 'PROTOCOL', 'PROTOCOL'),
  ];
  const result1 = traversePropagationPaths(rule1Hop, 'chain_eth', edges);
  ok('D1', result1.reachedTargets.length === 1, 'Hop limit 1 blocks second hop');
  ok('D2', result1.reachedTargets[0].targetNodeId === 'proto_uni', 'Only first hop reached');

  const rule2Hop: PropagationRule = {
    ...rule1Hop, ruleId: 'TEST_2HOP', hopLimit: 2,
    targetNodeTypes: ['PROTOCOL', 'ASSET'],
  };
  const edges2 = [
    makeEdge('e_d3', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_a', 'CHAIN', 'PROTOCOL'),
    makeEdge('e_d4', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_a', 'ast_deep', 'PROTOCOL', 'ASSET'),
  ];
  const result2 = traversePropagationPaths(rule2Hop, 'chain_eth', edges2);
  ok('D3', result2.reachedTargets.length === 2, 'Hop limit 2 allows second hop');
  ok('D4', result2.reachedTargets.some(t => t.hopCount === 2), 'Second hop target reached');

  const cycleEdges = [
    makeEdge('e_d5', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_a', 'CHAIN', 'PROTOCOL'),
    makeEdge('e_d6', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_a', 'chain_eth', 'PROTOCOL', 'CHAIN'),
  ];
  const cycleResult = traversePropagationPaths(
    { ...rule2Hop, targetNodeTypes: ['PROTOCOL', 'CHAIN'] },
    'chain_eth', cycleEdges,
  );
  ok('D5', cycleResult.blockedPaths.some(b => b.reason === 'CYCLE_DETECTED'), 'Node cycle detected');
  ok('D6', !cycleResult.reachedTargets.some(t => t.targetNodeId === 'chain_eth'),
    'Cycle target not in reached targets');

  const expiredEdges = [
    makeEdge('e_d7', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_exp', 'CHAIN', 'PROTOCOL',
      { temporalStatus: 'EXPIRED' }),
  ];
  const expResult = traversePropagationPaths(rule1Hop, 'chain_eth', expiredEdges);
  ok('D7', expResult.reachedTargets.length === 0, 'Expired edge blocked in traversal');
  ok('D8', expResult.blockedPaths.some(b => b.reason === 'SOURCE_EDGE_EXPIRED'), 'Expired reason present');

  const deniedEdges = [
    makeEdge('e_d8', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_den', 'CHAIN', 'PROTOCOL',
      { propagationRight: 'DENY' }),
  ];
  const denResult = traversePropagationPaths(rule1Hop, 'chain_eth', deniedEdges);
  ok('D9', denResult.reachedTargets.length === 0, 'Denied edge blocked in traversal');

  const dupeEdges = [
    makeEdge('e_d9a', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_dup', 'CHAIN', 'PROTOCOL'),
    makeEdge('e_d9b', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_dup', 'CHAIN', 'PROTOCOL'),
  ];
  const dupeResult = traversePropagationPaths(rule1Hop, 'chain_eth', dupeEdges);
  ok('D10', dupeResult.reachedTargets.filter(t => t.targetNodeId === 'proto_dup').length === 1,
    'Duplicate path suppressed');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE E — PROPAGATION EVENTS AND TRAILS
// ═══════════════════════════════════════════════════════════════════════════════

function suiteE(): void {
  console.log('\n--- Suite E: Events & Trails ---');
  fresh();

  const rule = getPropagationRule('RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS')!;
  const trigger = makeTrigger();
  const edges = [
    makeEdge('e_e1', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_uni', 'CHAIN', 'PROTOCOL'),
  ];

  const result = evaluatePropagationTrigger({
    rule, trigger, sourceNodeId: 'chain_eth',
    sourceEdge: makeSourceEdge(), graphEdges: edges, sourceStrength: 75,
  });

  ok('E1', result.events.length === 1, 'One propagation event created');
  ok('E2', result.trails.length === 1, 'One trail created');
  ok('E3', !result.eligibilityBlocked, 'Not eligibility blocked');

  const event = result.events[0];
  ok('E4', event.effectClass === 'DEPENDENCY_IMPACT', 'Event effect class correct');
  ok('E5', event.sourceNodeId === 'chain_eth', 'Source node correct');
  ok('E6', event.targetNodeId === 'proto_uni', 'Target node correct');
  ok('E7', event.strengthScore > 0, 'Strength score positive');
  ok('E8', event.hopCount === 1, 'Hop count is 1');
  ok('E9', event.traversedEdgeIds.length === 1, 'Traversed edges preserved');
  ok('E10', event.allowedUses.length > 0, 'Allowed uses present');
  ok('E11', event.blockedUses.length > 0, 'Blocked uses present');
  ok('E12', !!event.trailRef, 'Trail ref present');
  ok('E13', !!event.explanationRef, 'Explanation ref present');
  ok('E14', event.schemaVersion === 'v1', 'Schema version present');

  const trail = getPropagationTrail(event.trailRef);
  ok('E15', !!trail, 'Trail retrievable by ref');
  ok('E16', trail!.steps.length === 1, 'Trail has 1 step');
  ok('E17', trail!.explanationTemplateUsed.includes('{source}'), 'Explanation template stored');
  ok('E18', trail!.finalStrengthScore === event.strengthScore, 'Trail strength matches event');

  const stored = getPropagationEventById(event.propagationEventId);
  ok('E19', !!stored, 'Event stored and retrievable by ID');

  const forNode = getPropagationEventsForNode('proto_uni');
  ok('E20', forNode.length === 1, 'Events retrievable by target node');

  const impact = getTargetImpactState('proto_uni');
  ok('E21', !!impact, 'Target impact state exists');
  ok('E22', impact!.strongestEffectClass === 'DEPENDENCY_IMPACT', 'Strongest effect tracked');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE F — ANTI-FAKE
// ═══════════════════════════════════════════════════════════════════════════════

function suiteF(): void {
  console.log('\n--- Suite F: Anti-Fake ---');
  fresh();

  const chainRule = getPropagationRule('RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS')!;
  const chainResult = evaluatePropagationTrigger({
    rule: chainRule, trigger: makeTrigger(), sourceNodeId: 'chain_eth',
    sourceEdge: makeSourceEdge(), sourceStrength: 75,
    graphEdges: [makeEdge('e_f1', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_uni', 'CHAIN', 'PROTOCOL')],
  });
  const chainEvent = chainResult.events[0];
  ok('F1', chainEvent.blockedUses.length > 0, 'Chain weakness propagation carries blocked uses');
  ok('F2', chainEvent.strengthScore <= 90, 'Chain weakness capped by family');

  const protoRule = getPropagationRule('RULE_PROTOCOL_STRENGTH_TOKEN_SUPPORT')!;
  const protoResult = evaluatePropagationTrigger({
    rule: protoRule, trigger: makeTrigger({ triggerId: 'trig_f2' }),
    sourceNodeId: 'proto_uni',
    sourceEdge: makeSourceEdge({ edgeType: 'PROTOCOL_HAS_TOKEN', edgeId: 'e_f2_src' }),
    sourceStrength: 90,
    graphEdges: [makeEdge('e_f2', 'PROTOCOL_HAS_TOKEN', 'proto_uni', 'ast_uni', 'PROTOCOL', 'ASSET')],
  });
  ok('F3', protoResult.events.length === 1, 'Protocol strength propagation works');
  ok('F4', protoResult.events[0].strengthScore <= 90, 'Token support capped by family');

  const narRule = getPropagationRule('RULE_NARRATIVE_ACCELERATION_BROADCAST')!;
  const narResult = evaluatePropagationTrigger({
    rule: narRule, trigger: makeTrigger({ triggerId: 'trig_f3' }),
    sourceNodeId: 'topic_ai',
    sourceEdge: makeSourceEdge({
      edgeType: 'NARRATIVE_AFFECTS_ASSET', edgeId: 'e_f3_src', confidenceBand: 'MEDIUM',
      subjectNodeType: 'NARRATIVE_TOPIC', objectNodeType: 'ASSET',
    }),
    sourceStrength: 80,
    graphEdges: [makeEdge('e_f3', 'NARRATIVE_AFFECTS_ASSET', 'topic_ai', 'ast_sol', 'NARRATIVE_TOPIC', 'ASSET')],
  });
  ok('F5', narResult.events.length === 1, 'Narrative propagation works');
  const narEvent = narResult.events[0];
  ok('F6', narEvent.blockedUses.includes('comparison'), 'Narrative propagation blocks comparison');
  ok('F7', narEvent.blockedUses.includes('hypothesis_support'), 'Narrative propagation blocks hypothesis_support');

  const unlockRule = getPropagationRule('RULE_UNLOCK_FLOAT_PRESSURE')!;
  const unlockResult = evaluatePropagationTrigger({
    rule: unlockRule, trigger: makeTrigger({
      triggerId: 'trig_f4', supportingEventNodeIds: ['ev_unlock_001'],
    }),
    sourceNodeId: 'unlock_sol',
    sourceEdge: makeSourceEdge({
      edgeType: 'UNLOCK_IMPACTS_FLOAT', edgeId: 'e_f4_src',
      subjectNodeType: 'UNLOCK_EVENT', objectNodeType: 'ASSET',
    }),
    sourceStrength: 70,
    graphEdges: [makeEdge('e_f4', 'UNLOCK_IMPACTS_FLOAT', 'unlock_sol', 'ast_sol', 'UNLOCK_EVENT', 'ASSET')],
  });
  ok('F8', unlockResult.events.length === 1, 'Unlock propagation works');
  ok('F9', !!unlockResult.events[0].activeTo, 'Unlock propagation has expiry window');

  const compRule = getPropagationRule('RULE_COMPETITIVE_PRESSURE_PROTOCOL')!;
  const compResult = evaluatePropagationTrigger({
    rule: compRule, trigger: makeTrigger({ triggerId: 'trig_f5' }),
    sourceNodeId: 'proto_uni',
    sourceEdge: makeSourceEdge({
      edgeType: 'PROTOCOL_HAS_COMPETITOR', edgeId: 'e_f5_src',
      subjectNodeType: 'PROTOCOL', objectNodeType: 'PROTOCOL',
    }),
    sourceStrength: 80,
    graphEdges: [makeEdge('e_f5', 'PROTOCOL_HAS_COMPETITOR', 'proto_uni', 'proto_sushi', 'PROTOCOL', 'PROTOCOL')],
  });
  ok('F10', compResult.events[0].strengthScore <= 50, 'Competitive pressure remains capped');
  ok('F11', compResult.events[0].blockedUses.includes('hypothesis_support'),
    'Competitive pressure blocks hypothesis_support');

  const expiredBlock = evaluatePropagationTrigger({
    rule: chainRule, trigger: makeTrigger({ triggerId: 'trig_f6' }),
    sourceNodeId: 'chain_eth',
    sourceEdge: makeSourceEdge({ temporalStatus: 'EXPIRED' }),
    sourceStrength: 90, graphEdges: [],
  });
  ok('F12', expiredBlock.eligibilityBlocked, 'Expired source blocks propagation entirely');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE G — CROSS-LAYER SAFETY
// ═══════════════════════════════════════════════════════════════════════════════

function suiteG(): void {
  console.log('\n--- Suite G: Cross-Layer Safety ---');
  fresh();

  const { isRulePathPropagationAllowed: isRulePath } = require('../services/knowledge-graph/relation-ontology');
  const allRules = getAllPropagationRules();
  for (const rule of allRules) {
    for (const et of rule.sourceEdgeTypes) {
      const registered = require('../services/knowledge-graph/relation-ontology').isEdgeTypeRegistered(et);
      ok(`G_L41_${rule.ruleId}_${et}`, registered,
        `L4.1 edge type ${et} registered for ${rule.ruleId}`);
      ok(`G_L41_rp_${rule.ruleId}_${et}`, isRulePath(et),
        `L4.1 edge type ${et} supports rule-path propagation for ${rule.ruleId}`);
    }
  }

  const rule = getPropagationRule('RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS')!;

  const denyRights = checkPropagationEligibility(rule, makeSourceEdge({
    propagationRight: 'DENY',
  }), makeTrigger());
  ok('G_L42_deny', !denyRights.eligible, 'L4.2 edge rights DENY blocks propagation');

  const staleTemp = checkPropagationEligibility(rule, makeSourceEdge({
    temporalStatus: 'STALE',
  }), makeTrigger());
  ok('G_L43_stale', !staleTemp.eligible, 'L4.3 stale temporal state blocks propagation');

  const metricRequired = checkPropagationEligibility(rule, makeSourceEdge(), makeTrigger({
    supportingMetricObservationRefs: [],
  }));
  ok('G_L35_metric', !metricRequired.eligible, 'L3.5 metric support required');

  const event = evaluatePropagationTrigger({
    rule, trigger: makeTrigger({ replayGenerationRef: 'gen_42' }),
    sourceNodeId: 'chain_eth', sourceEdge: makeSourceEdge(),
    sourceStrength: 75,
    graphEdges: [makeEdge('e_g1', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_g', 'CHAIN', 'PROTOCOL')],
  });
  ok('G_replay', event.events[0].replayGenerationRef === 'gen_42', 'Replay generation ref preserved');
  ok('G_schema', event.events[0].schemaVersion === 'v1', 'Schema version present in event');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE H — HISTORICAL AND REPLAY
// ═══════════════════════════════════════════════════════════════════════════════

function suiteH(): void {
  console.log('\n--- Suite H: Historical & Replay ---');
  fresh();

  const rule = getPropagationRule('RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS')!;

  evaluatePropagationTrigger({
    rule, trigger: makeTrigger({ triggerId: 'trig_h1', createdAt: '2026-03-01T00:00:00Z' }),
    sourceNodeId: 'chain_eth', sourceEdge: makeSourceEdge(),
    sourceStrength: 80,
    graphEdges: [makeEdge('e_h1', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_h1', 'CHAIN', 'PROTOCOL')],
  });

  evaluatePropagationTrigger({
    rule, trigger: makeTrigger({ triggerId: 'trig_h2', createdAt: '2026-04-15T00:00:00Z' }),
    sourceNodeId: 'chain_eth', sourceEdge: makeSourceEdge(),
    sourceStrength: 60,
    graphEdges: [makeEdge('e_h2', 'PROTOCOL_OPERATES_ON_CHAIN', 'chain_eth', 'proto_h2', 'CHAIN', 'PROTOCOL')],
  });

  const atMarch = getActivePropagationForNodeAtTime('proto_h1', '2026-03-15T00:00:00Z');
  ok('H1', atMarch.length >= 1, 'Propagation active at March 15');

  const atFarFuture = getActivePropagationForNodeAtTime('proto_h1', '2027-01-01T00:00:00Z');
  ok('H2', atFarFuture.length >= 1, 'Propagation with no activeTo still active in future');

  const unlockRule = getPropagationRule('RULE_UNLOCK_FLOAT_PRESSURE')!;
  evaluatePropagationTrigger({
    rule: unlockRule,
    trigger: makeTrigger({
      triggerId: 'trig_h3', createdAt: '2026-03-01T00:00:00Z',
      supportingEventNodeIds: ['ev_h3'],
    }),
    sourceNodeId: 'unlock_h',
    sourceEdge: makeSourceEdge({
      edgeType: 'UNLOCK_IMPACTS_FLOAT', edgeId: 'e_h3_src',
      subjectNodeType: 'UNLOCK_EVENT', objectNodeType: 'ASSET',
    }),
    sourceStrength: 70,
    graphEdges: [makeEdge('e_h3', 'UNLOCK_IMPACTS_FLOAT', 'unlock_h', 'ast_h', 'UNLOCK_EVENT', 'ASSET')],
  });

  const duringWindow = getActivePropagationForNodeAtTime('ast_h', '2026-03-10T00:00:00Z');
  ok('H3', duringWindow.length >= 1, 'Event propagation active during window');

  const afterWindow = getActivePropagationForNodeAtTime('ast_h', '2026-06-01T00:00:00Z');
  ok('H4', afterWindow.length === 0, 'Event propagation expired after window');

  const contestedResult = evaluatePropagationTrigger({
    rule, trigger: makeTrigger({ triggerId: 'trig_h4' }),
    sourceNodeId: 'chain_contested',
    sourceEdge: makeSourceEdge({ temporalStatus: 'CONTESTED' }),
    sourceStrength: 80, graphEdges: [],
  });
  ok('H5', contestedResult.eligibilityBlocked, 'Contested source narrows propagation to blocked');

  const allEvents = getAllPropagationEvents();
  ok('H6', allEvents.length >= 3, 'All propagation events stored');

  const trail = getPropagationTrail(allEvents[0].trailRef);
  ok('H7', !!trail, 'Historical trail reconstructable');
  ok('H8', trail!.steps.length >= 1, 'Trail has steps');
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
console.log(`L4.4 Propagation Engine — TOTAL: ${passed + failed} | ✅ ${passed} | ❌ ${failed}`);
console.log(`${'═'.repeat(60)}`);
if (failed > 0) process.exit(1);
