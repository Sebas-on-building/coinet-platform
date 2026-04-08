/**
 * L4.4 — Propagation Logic
 *
 * Lets the graph express how conditions travel through relationships.
 * Propagation is typed, bounded, decay-aware, confidence-aware, and
 * use-specific. A propagation effect is not canonical truth — it is a
 * bounded, evidence-bearing relational effect.
 *
 * Eight sections:
 *   1. Type declarations
 *   2. Rule registry
 *   3. Trigger intake
 *   4. Eligibility gate
 *   5. Traversal and path engine
 *   6. Strength and decay engine
 *   7. Event and trail emission
 *   8. Query and replay APIs
 */

import type { EdgeType } from './relation-ontology';
import { getEdgeContract, isEdgeTypeRegistered, isRulePathPropagationAllowed } from './relation-ontology';
import type { TemporalEdgeStatus } from './temporal-graph-state';
import { ALL_CANONICAL_NODE_TYPES, ALL_GRAPH_NATIVE_NODE_TYPES } from './graph-node-types';

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 1 — TYPE DECLARATIONS                                               ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export type PropagationEffectClass =
  | 'DEPENDENCY_IMPACT'
  | 'EXPOSURE_SPILLOVER'
  | 'COMPETITIVE_PRESSURE'
  | 'NARRATIVE_TRANSMISSION'
  | 'CAPITAL_ROTATION'
  | 'FLOAT_PRESSURE'
  | 'SECURITY_CONTAGION';

export const ALL_EFFECT_CLASSES: readonly PropagationEffectClass[] = [
  'DEPENDENCY_IMPACT', 'EXPOSURE_SPILLOVER', 'COMPETITIVE_PRESSURE',
  'NARRATIVE_TRANSMISSION', 'CAPITAL_ROTATION', 'FLOAT_PRESSURE', 'SECURITY_CONTAGION',
];

export type PropagationStrengthModel =
  | 'DIRECT_TRANSFER'
  | 'WEIGHTED_DEPENDENCY'
  | 'PROPORTIONAL_EXPOSURE'
  | 'ROTATIONAL_FLOW'
  | 'EVENT_SHOCK'
  | 'NARRATIVE_BROADCAST'
  | 'CAPPED_COMPETITIVE_PRESSURE';

export type PropagationUseDomain =
  | 'context_enrichment'
  | 'scenario_support'
  | 'explanation'
  | 'comparison'
  | 'alerts'
  | 'hypothesis_support';

export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';

export interface PropagationRule {
  ruleId: string;
  contractVersion: string;
  sourceEdgeTypes: string[];
  sourceNodeTypes: string[];
  targetNodeTypes: string[];
  effectClass: PropagationEffectClass;
  strengthModel: PropagationStrengthModel;
  hopLimit: number;
  decayPerHop: number;
  requiredSourceConfidence: ConfidenceBand;
  requiredSourceTemporalStates: TemporalEdgeStatus[];
  blockedConditions: string[];
  querySurfacesAllowed: string[];
  blockedUsesUnderUncertainty: PropagationUseDomain[];
  requireMetricSupport?: boolean;
  requireEventNodeSupport?: boolean;
  requireCanonicalTargets?: boolean;
  requireEdgeRights?: { propagation: 'ALLOW' | 'ALLOW_WITH_SCAR' | 'CONDITIONAL' };
  maxPropagationWindowMs?: number;
  explanationTemplate: string;
  replayCompatibility: { schemaVersion: string };
}

export interface PropagationTrigger {
  triggerId: string;
  triggerType: string;
  sourceNodeIds: string[];
  sourceEdgeIds: string[];
  supportingMetricObservationRefs: string[];
  supportingEventNodeIds: string[];
  createdAt: string;
  replayGenerationRef?: string;
  metadata: Record<string, unknown>;
}

export interface PropagationTrailStep {
  stepIndex: number;
  edgeId: string;
  edgeType: string;
  subjectNodeId: string;
  objectNodeId: string;
  edgeConfidenceBand: ConfidenceBand;
  temporalStatus: TemporalEdgeStatus;
  hopDecayApplied: number;
  notes: string[];
}

export interface PropagationTrail {
  trailId: string;
  ruleId: string;
  sourceNodeId: string;
  targetNodeId: string;
  steps: PropagationTrailStep[];
  totalHopCount: number;
  finalStrengthScore: number;
  finalConfidenceBand: ConfidenceBand;
  explanationTemplateUsed: string;
  evidenceRefs: string[];
  createdAt: string;
  schemaVersion: string;
}

export interface PropagationEvent {
  propagationEventId: string;
  ruleId: string;
  sourceTriggerId: string;
  sourceNodeId: string;
  targetNodeId: string;
  effectClass: PropagationEffectClass;
  strengthScore: number;
  confidenceBand: ConfidenceBand;
  hopCount: number;
  cumulativeDecayFactor: number;
  activeFrom: string;
  activeTo?: string;
  allowedUses: PropagationUseDomain[];
  blockedUses: PropagationUseDomain[];
  evidenceRefs: string[];
  traversedEdgeIds: string[];
  trailRef: string;
  explanationRef: string;
  replayGenerationRef?: string;
  schemaVersion: string;
}

export interface TargetImpactState {
  targetNodeId: string;
  activePropagationEventIds: string[];
  strongestEffectClass?: PropagationEffectClass;
  strongestStrengthScore?: number;
  lastUpdatedAt: string;
}

export interface RuleValidationResult {
  valid: boolean;
  violations: string[];
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 2 — RULE REGISTRY                                                   ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const _ruleById = new Map<string, PropagationRule>();
const _rulesByEffectClass = new Map<PropagationEffectClass, PropagationRule[]>();
const _rulesBySourceEdge = new Map<string, PropagationRule[]>();

const ALL_NODE_TYPES = new Set<string>([...ALL_CANONICAL_NODE_TYPES, ...ALL_GRAPH_NATIVE_NODE_TYPES]);

function indexRule(r: PropagationRule): void {
  _ruleById.set(r.ruleId, r);
  const ec = _rulesByEffectClass.get(r.effectClass) ?? [];
  ec.push(r); _rulesByEffectClass.set(r.effectClass, ec);
  for (const et of r.sourceEdgeTypes) {
    const se = _rulesBySourceEdge.get(et) ?? [];
    se.push(r); _rulesBySourceEdge.set(et, se);
  }
}

export function validatePropagationRule(r: PropagationRule): RuleValidationResult {
  const v: string[] = [];
  if (!r.ruleId) v.push('MISSING_RULE_ID');
  if (!r.contractVersion) v.push('MISSING_CONTRACT_VERSION');
  if (!(ALL_EFFECT_CLASSES as readonly string[]).includes(r.effectClass)) v.push('INVALID_EFFECT_CLASS');
  if (r.hopLimit < 1) v.push('HOP_LIMIT_BELOW_1');
  if (r.decayPerHop < 0 || r.decayPerHop > 1) v.push('DECAY_PER_HOP_OUT_OF_RANGE');
  if (!r.explanationTemplate) v.push('MISSING_EXPLANATION_TEMPLATE');
  if (!r.blockedUsesUnderUncertainty || r.blockedUsesUnderUncertainty.length === 0) v.push('MISSING_BLOCKED_USES');
  for (const et of r.sourceEdgeTypes) {
    if (!isEdgeTypeRegistered(et as EdgeType)) v.push(`INVALID_SOURCE_EDGE_TYPE:${et}`);
    else if (!isRulePathPropagationAllowed(et as EdgeType)) v.push(`EDGE_NOT_RULE_PATH_ELIGIBLE:${et}`);
  }
  for (const nt of [...r.sourceNodeTypes, ...r.targetNodeTypes]) {
    if (!ALL_NODE_TYPES.has(nt)) v.push(`INVALID_NODE_TYPE:${nt}`);
  }
  return v.length > 0 ? { valid: false, violations: v } : { valid: true, violations: [] };
}

export function registerPropagationRule(r: PropagationRule): { success: boolean; error?: string } {
  const v = validatePropagationRule(r);
  if (!v.valid) return { success: false, error: v.violations.join(', ') };
  if (_ruleById.has(r.ruleId)) return { success: false, error: `DUPLICATE_RULE:${r.ruleId}` };
  indexRule(r);
  return { success: true };
}

export function getPropagationRule(ruleId: string): PropagationRule | undefined {
  return _ruleById.get(ruleId);
}

export function listRulesByEffectClass(ec: PropagationEffectClass): readonly PropagationRule[] {
  return _rulesByEffectClass.get(ec) ?? [];
}

export function listRulesBySourceEdgeType(et: string): readonly PropagationRule[] {
  return _rulesBySourceEdge.get(et) ?? [];
}

export function getAllPropagationRules(): readonly PropagationRule[] {
  return [..._ruleById.values()];
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 3 — TRIGGER INTAKE                                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export function validateTrigger(trigger: PropagationTrigger): { valid: boolean; error?: string } {
  if (!trigger.triggerId) return { valid: false, error: 'MISSING_TRIGGER_ID' };
  if (!trigger.triggerType) return { valid: false, error: 'MISSING_TRIGGER_TYPE' };
  if (!trigger.sourceNodeIds.length && !trigger.sourceEdgeIds.length) {
    return { valid: false, error: 'NO_SOURCE_REFERENCES' };
  }
  if (!trigger.createdAt) return { valid: false, error: 'MISSING_CREATED_AT' };
  return { valid: true };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 4 — ELIGIBILITY GATE                                                ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export type BlockedReason =
  | 'SOURCE_EDGE_NOT_PROPAGATION_ELIGIBLE'
  | 'SOURCE_EDGE_RIGHTS_DENY'
  | 'SOURCE_EDGE_STALE'
  | 'SOURCE_EDGE_EXPIRED'
  | 'SOURCE_EDGE_CONTESTED'
  | 'SOURCE_CONFIDENCE_TOO_LOW'
  | 'TARGET_TYPE_MISMATCH'
  | 'MISSING_METRIC_SUPPORT'
  | 'MISSING_EVENT_SUPPORT'
  | 'HOP_LIMIT_EXCEEDED'
  | 'CYCLE_DETECTED'
  | 'REPLAY_TRACE_WEAK'
  | 'RULE_FAMILY_BLOCK'
  | 'BLOCKED_USE_UNDER_UNCERTAINTY';

export interface SourceEdgeContext {
  edgeId: string;
  edgeType: string;
  confidenceBand: ConfidenceBand;
  temporalStatus: TemporalEdgeStatus;
  propagationRight: 'ALLOW' | 'ALLOW_WITH_SCAR' | 'CONDITIONAL' | 'DENY';
  subjectNodeId: string;
  objectNodeId: string;
  subjectNodeType: string;
  objectNodeType: string;
}

export interface EligibilityResult {
  eligible: boolean;
  blockedReasons: BlockedReason[];
}

const CONFIDENCE_RANK: Record<ConfidenceBand, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNRESOLVED: 0 };

export function checkPropagationEligibility(
  rule: PropagationRule,
  source: SourceEdgeContext,
  trigger: PropagationTrigger,
): EligibilityResult {
  const blocked: BlockedReason[] = [];

  if (source.propagationRight === 'DENY') blocked.push('SOURCE_EDGE_RIGHTS_DENY');

  if (!rule.requiredSourceTemporalStates.includes(source.temporalStatus)) {
    if (source.temporalStatus === 'STALE') blocked.push('SOURCE_EDGE_STALE');
    else if (source.temporalStatus === 'EXPIRED') blocked.push('SOURCE_EDGE_EXPIRED');
    else if (source.temporalStatus === 'CONTESTED') blocked.push('SOURCE_EDGE_CONTESTED');
  }

  if (CONFIDENCE_RANK[source.confidenceBand] < CONFIDENCE_RANK[rule.requiredSourceConfidence]) {
    blocked.push('SOURCE_CONFIDENCE_TOO_LOW');
  }

  if (rule.requireMetricSupport && trigger.supportingMetricObservationRefs.length === 0) {
    blocked.push('MISSING_METRIC_SUPPORT');
  }
  if (rule.requireEventNodeSupport && trigger.supportingEventNodeIds.length === 0) {
    blocked.push('MISSING_EVENT_SUPPORT');
  }

  return { eligible: blocked.length === 0, blockedReasons: blocked };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 5 — TRAVERSAL AND PATH ENGINE                                       ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export interface GraphEdgeForTraversal {
  edgeId: string;
  edgeType: string;
  subjectNodeId: string;
  objectNodeId: string;
  subjectNodeType: string;
  objectNodeType: string;
  confidenceBand: ConfidenceBand;
  temporalStatus: TemporalEdgeStatus;
  propagationRight: 'ALLOW' | 'ALLOW_WITH_SCAR' | 'CONDITIONAL' | 'DENY';
}

export interface TraversalResult {
  reachedTargets: TraversalTarget[];
  blockedPaths: { targetNodeId: string; reason: BlockedReason }[];
}

export interface TraversalTarget {
  targetNodeId: string;
  targetNodeType: string;
  hopCount: number;
  cumulativeDecay: number;
  path: GraphEdgeForTraversal[];
}

export function traversePropagationPaths(
  rule: PropagationRule,
  sourceNodeId: string,
  edges: GraphEdgeForTraversal[],
): TraversalResult {
  const targets: TraversalTarget[] = [];
  const blocked: { targetNodeId: string; reason: BlockedReason }[] = [];
  const seenTargets = new Set<string>();

  interface QueueItem {
    nodeId: string;
    hopCount: number;
    cumulativeDecay: number;
    path: GraphEdgeForTraversal[];
    visitedNodes: Set<string>;
    visitedEdges: Set<string>;
  }

  const queue: QueueItem[] = [{
    nodeId: sourceNodeId, hopCount: 0, cumulativeDecay: 1.0,
    path: [], visitedNodes: new Set([sourceNodeId]), visitedEdges: new Set(),
  }];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.hopCount >= rule.hopLimit) continue;

    const outgoing = edges.filter(e =>
      e.subjectNodeId === cur.nodeId &&
      rule.sourceEdgeTypes.includes(e.edgeType),
    );

    for (const edge of outgoing) {
      const targetId = edge.objectNodeId;

      if (cur.visitedNodes.has(targetId)) {
        blocked.push({ targetNodeId: targetId, reason: 'CYCLE_DETECTED' });
        continue;
      }
      if (cur.visitedEdges.has(edge.edgeId)) continue;

      if (edge.propagationRight === 'DENY') {
        blocked.push({ targetNodeId: targetId, reason: 'SOURCE_EDGE_RIGHTS_DENY' });
        continue;
      }
      if (edge.temporalStatus === 'EXPIRED' || edge.temporalStatus === 'HISTORICAL') {
        blocked.push({ targetNodeId: targetId, reason: 'SOURCE_EDGE_EXPIRED' });
        continue;
      }

      if (!rule.targetNodeTypes.includes(edge.objectNodeType)) {
        continue;
      }

      const nextHop = cur.hopCount + 1;
      const nextDecay = cur.cumulativeDecay * rule.decayPerHop;
      const nextPath = [...cur.path, edge];

      if (!seenTargets.has(targetId)) {
        seenTargets.add(targetId);
        targets.push({
          targetNodeId: targetId,
          targetNodeType: edge.objectNodeType,
          hopCount: nextHop,
          cumulativeDecay: nextDecay,
          path: nextPath,
        });
      }

      if (nextHop < rule.hopLimit) {
        queue.push({
          nodeId: targetId, hopCount: nextHop, cumulativeDecay: nextDecay,
          path: nextPath,
          visitedNodes: new Set([...cur.visitedNodes, targetId]),
          visitedEdges: new Set([...cur.visitedEdges, edge.edgeId]),
        });
      }
    }
  }

  return { reachedTargets: targets, blockedPaths: blocked };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 6 — STRENGTH AND DECAY ENGINE                                       ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const FAMILY_CAPS: Record<PropagationEffectClass, number> = {
  DEPENDENCY_IMPACT: 90,
  EXPOSURE_SPILLOVER: 75,
  COMPETITIVE_PRESSURE: 50,
  NARRATIVE_TRANSMISSION: 55,
  CAPITAL_ROTATION: 60,
  FLOAT_PRESSURE: 70,
  SECURITY_CONTAGION: 80,
};

export function computePropagationStrength(
  rule: PropagationRule,
  target: TraversalTarget,
  sourceStrength: number,
): { strengthScore: number; confidenceBand: ConfidenceBand } {
  let score = sourceStrength * target.cumulativeDecay;

  const weakestEdge = Math.min(...target.path.map(e => CONFIDENCE_RANK[e.confidenceBand]));
  const confidenceModifier = weakestEdge >= 3 ? 1.0 : weakestEdge >= 2 ? 0.7 : weakestEdge >= 1 ? 0.4 : 0.1;
  score *= confidenceModifier;

  score = Math.min(score, FAMILY_CAPS[rule.effectClass]);
  score = Math.max(0, Math.min(100, score));

  let band: ConfidenceBand;
  if (score >= 65 && weakestEdge >= 2) band = 'HIGH';
  else if (score >= 40) band = 'MEDIUM';
  else if (score >= 15) band = 'LOW';
  else band = 'UNRESOLVED';

  return { strengthScore: Math.round(score * 100) / 100, confidenceBand: band };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 7 — EVENT AND TRAIL EMISSION                                        ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const _eventsByTarget = new Map<string, PropagationEvent[]>();
const _eventsById = new Map<string, PropagationEvent>();
const _trailsById = new Map<string, PropagationTrail>();
const _targetImpact = new Map<string, TargetImpactState>();

let _counter = 0;

function buildTrail(
  rule: PropagationRule,
  sourceNodeId: string,
  target: TraversalTarget,
  strength: { strengthScore: number; confidenceBand: ConfidenceBand },
  trigger: PropagationTrigger,
): PropagationTrail {
  _counter++;
  const steps: PropagationTrailStep[] = target.path.map((edge, i) => ({
    stepIndex: i,
    edgeId: edge.edgeId,
    edgeType: edge.edgeType,
    subjectNodeId: edge.subjectNodeId,
    objectNodeId: edge.objectNodeId,
    edgeConfidenceBand: edge.confidenceBand,
    temporalStatus: edge.temporalStatus,
    hopDecayApplied: Math.pow(rule.decayPerHop, i + 1),
    notes: [],
  }));

  return {
    trailId: `trail_${_counter}_${Date.now()}`,
    ruleId: rule.ruleId,
    sourceNodeId,
    targetNodeId: target.targetNodeId,
    steps,
    totalHopCount: target.hopCount,
    finalStrengthScore: strength.strengthScore,
    finalConfidenceBand: strength.confidenceBand,
    explanationTemplateUsed: rule.explanationTemplate,
    evidenceRefs: trigger.supportingMetricObservationRefs,
    createdAt: trigger.createdAt,
    schemaVersion: 'v1',
  };
}

function deriveAllowedUses(rule: PropagationRule, band: ConfidenceBand): PropagationUseDomain[] {
  const all: PropagationUseDomain[] = [
    'context_enrichment', 'scenario_support', 'explanation',
    'comparison', 'alerts', 'hypothesis_support',
  ];
  const blockedSet = new Set<PropagationUseDomain>(rule.blockedUsesUnderUncertainty);
  if (band === 'HIGH') return all.filter(u => !blockedSet.has(u));
  if (band === 'MEDIUM') {
    const med: PropagationUseDomain[] = ['context_enrichment', 'scenario_support', 'explanation', 'alerts'];
    return med.filter(u => !blockedSet.has(u));
  }
  const low: PropagationUseDomain[] = ['context_enrichment', 'explanation'];
  return low.filter(u => !blockedSet.has(u));
}

function deriveBlockedUses(rule: PropagationRule, band: ConfidenceBand): PropagationUseDomain[] {
  const allowed = new Set(deriveAllowedUses(rule, band));
  const all: PropagationUseDomain[] = [
    'context_enrichment', 'scenario_support', 'explanation',
    'comparison', 'alerts', 'hypothesis_support',
  ];
  return all.filter(u => !allowed.has(u));
}

export interface PropagationEvaluationInput {
  rule: PropagationRule;
  trigger: PropagationTrigger;
  sourceNodeId: string;
  sourceEdge: SourceEdgeContext;
  graphEdges: GraphEdgeForTraversal[];
  sourceStrength: number;
}

export interface PropagationEvaluationResult {
  events: PropagationEvent[];
  trails: PropagationTrail[];
  blockedPaths: { targetNodeId: string; reason: BlockedReason }[];
  eligibilityBlocked: boolean;
  eligibilityReasons: BlockedReason[];
}

export function evaluatePropagationTrigger(input: PropagationEvaluationInput): PropagationEvaluationResult {
  const elig = checkPropagationEligibility(input.rule, input.sourceEdge, input.trigger);
  if (!elig.eligible) {
    return {
      events: [], trails: [], blockedPaths: [],
      eligibilityBlocked: true, eligibilityReasons: elig.blockedReasons,
    };
  }

  const traversal = traversePropagationPaths(input.rule, input.sourceNodeId, input.graphEdges);
  const events: PropagationEvent[] = [];
  const trails: PropagationTrail[] = [];

  for (const target of traversal.reachedTargets) {
    const strength = computePropagationStrength(input.rule, target, input.sourceStrength);
    const trail = buildTrail(input.rule, input.sourceNodeId, target, strength, input.trigger);
    _trailsById.set(trail.trailId, trail);

    const allowed = deriveAllowedUses(input.rule, strength.confidenceBand);
    const blocked = deriveBlockedUses(input.rule, strength.confidenceBand);

    _counter++;
    const event: PropagationEvent = {
      propagationEventId: `pe_${_counter}_${Date.now()}`,
      ruleId: input.rule.ruleId,
      sourceTriggerId: input.trigger.triggerId,
      sourceNodeId: input.sourceNodeId,
      targetNodeId: target.targetNodeId,
      effectClass: input.rule.effectClass,
      strengthScore: strength.strengthScore,
      confidenceBand: strength.confidenceBand,
      hopCount: target.hopCount,
      cumulativeDecayFactor: target.cumulativeDecay,
      activeFrom: input.trigger.createdAt,
      activeTo: input.rule.maxPropagationWindowMs
        ? new Date(new Date(input.trigger.createdAt).getTime() + input.rule.maxPropagationWindowMs).toISOString()
        : undefined,
      allowedUses: allowed,
      blockedUses: blocked,
      evidenceRefs: input.trigger.supportingMetricObservationRefs,
      traversedEdgeIds: target.path.map(e => e.edgeId),
      trailRef: trail.trailId,
      explanationRef: input.rule.explanationTemplate,
      replayGenerationRef: input.trigger.replayGenerationRef,
      schemaVersion: 'v1',
    };

    _eventsById.set(event.propagationEventId, event);
    const tList = _eventsByTarget.get(target.targetNodeId) ?? [];
    tList.push(event);
    _eventsByTarget.set(target.targetNodeId, tList);

    const impact = _targetImpact.get(target.targetNodeId) ?? {
      targetNodeId: target.targetNodeId, activePropagationEventIds: [],
      lastUpdatedAt: input.trigger.createdAt,
    };
    impact.activePropagationEventIds.push(event.propagationEventId);
    if (!impact.strongestStrengthScore || strength.strengthScore > impact.strongestStrengthScore) {
      impact.strongestStrengthScore = strength.strengthScore;
      impact.strongestEffectClass = input.rule.effectClass;
    }
    impact.lastUpdatedAt = input.trigger.createdAt;
    _targetImpact.set(target.targetNodeId, impact);

    events.push(event);
    trails.push(trail);
  }

  return {
    events, trails,
    blockedPaths: traversal.blockedPaths,
    eligibilityBlocked: false, eligibilityReasons: [],
  };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 8 — QUERY AND REPLAY APIs                                           ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export function getPropagationEventsForNode(nodeId: string): readonly PropagationEvent[] {
  return _eventsByTarget.get(nodeId) ?? [];
}

export function getPropagationEventById(eventId: string): PropagationEvent | undefined {
  return _eventsById.get(eventId);
}

export function getActivePropagationForNodeAtTime(
  nodeId: string, timestamp: string,
): readonly PropagationEvent[] {
  const all = _eventsByTarget.get(nodeId) ?? [];
  const t = new Date(timestamp).getTime();
  return all.filter(e => {
    const from = new Date(e.activeFrom).getTime();
    const to = e.activeTo ? new Date(e.activeTo).getTime() : Infinity;
    return t >= from && t < to;
  });
}

export function getPropagationTrail(trailId: string): PropagationTrail | undefined {
  return _trailsById.get(trailId);
}

export function getTargetImpactState(nodeId: string): TargetImpactState | undefined {
  return _targetImpact.get(nodeId);
}

export function getAllPropagationEvents(): readonly PropagationEvent[] {
  return [..._eventsById.values()];
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  BOOTSTRAP RULES                                                             ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const REPLAY_V1 = { schemaVersion: 'v1' };

const BOOTSTRAP_RULES: PropagationRule[] = [
  {
    ruleId: 'RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS',
    contractVersion: 'v1',
    sourceEdgeTypes: ['PROTOCOL_OPERATES_ON_CHAIN'],
    sourceNodeTypes: ['CHAIN'],
    targetNodeTypes: ['PROTOCOL'],
    effectClass: 'DEPENDENCY_IMPACT',
    strengthModel: 'WEIGHTED_DEPENDENCY',
    hopLimit: 1, decayPerHop: 0.75,
    requiredSourceConfidence: 'MEDIUM',
    requiredSourceTemporalStates: ['ACTIVE'],
    blockedConditions: ['SOURCE_EDGE_EXPIRED'],
    querySurfacesAllowed: ['entity_context', 'scenario'],
    blockedUsesUnderUncertainty: ['comparison', 'hypothesis_support'],
    requireMetricSupport: true,
    explanationTemplate: 'Chain {source} weakness propagates dependency stress to protocol {target}',
    replayCompatibility: REPLAY_V1,
  },
  {
    ruleId: 'RULE_PROTOCOL_STRENGTH_TOKEN_SUPPORT',
    contractVersion: 'v1',
    sourceEdgeTypes: ['PROTOCOL_HAS_TOKEN'],
    sourceNodeTypes: ['PROTOCOL'],
    targetNodeTypes: ['ASSET'],
    effectClass: 'DEPENDENCY_IMPACT',
    strengthModel: 'WEIGHTED_DEPENDENCY',
    hopLimit: 1, decayPerHop: 0.7,
    requiredSourceConfidence: 'MEDIUM',
    requiredSourceTemporalStates: ['ACTIVE'],
    blockedConditions: [],
    querySurfacesAllowed: ['entity_context', 'scenario', 'judgment'],
    blockedUsesUnderUncertainty: ['comparison'],
    requireMetricSupport: true,
    explanationTemplate: 'Protocol {source} strength supports thesis for token {target}',
    replayCompatibility: REPLAY_V1,
  },
  {
    ruleId: 'RULE_NARRATIVE_ACCELERATION_BROADCAST',
    contractVersion: 'v1',
    sourceEdgeTypes: ['NARRATIVE_AFFECTS_ASSET', 'NARRATIVE_AFFECTS_PROTOCOL'],
    sourceNodeTypes: ['NARRATIVE_TOPIC'],
    targetNodeTypes: ['ASSET', 'PROTOCOL'],
    effectClass: 'NARRATIVE_TRANSMISSION',
    strengthModel: 'NARRATIVE_BROADCAST',
    hopLimit: 1, decayPerHop: 0.5,
    requiredSourceConfidence: 'LOW',
    requiredSourceTemporalStates: ['ACTIVE', 'PROVISIONAL'],
    blockedConditions: [],
    querySurfacesAllowed: ['entity_context', 'narrative'],
    blockedUsesUnderUncertainty: ['comparison', 'hypothesis_support'],
    explanationTemplate: 'Narrative {source} acceleration propagates attention to {target}',
    replayCompatibility: REPLAY_V1,
  },
  {
    ruleId: 'RULE_UNLOCK_FLOAT_PRESSURE',
    contractVersion: 'v1',
    sourceEdgeTypes: ['UNLOCK_IMPACTS_FLOAT'],
    sourceNodeTypes: ['UNLOCK_EVENT'],
    targetNodeTypes: ['ASSET'],
    effectClass: 'FLOAT_PRESSURE',
    strengthModel: 'EVENT_SHOCK',
    hopLimit: 1, decayPerHop: 0.8,
    requiredSourceConfidence: 'MEDIUM',
    requiredSourceTemporalStates: ['ACTIVE'],
    blockedConditions: ['SOURCE_EDGE_EXPIRED'],
    querySurfacesAllowed: ['entity_context', 'event_timeline'],
    blockedUsesUnderUncertainty: ['comparison', 'hypothesis_support'],
    requireEventNodeSupport: true,
    maxPropagationWindowMs: 14 * 24 * 60 * 60 * 1000,
    explanationTemplate: 'Unlock event {source} creates float pressure on {target}',
    replayCompatibility: REPLAY_V1,
  },
  {
    ruleId: 'RULE_SECURITY_CONTAGION_ECOSYSTEM',
    contractVersion: 'v1',
    sourceEdgeTypes: ['GOVERNANCE_EVENT_AFFECTS_PROTOCOL'],
    sourceNodeTypes: ['GOVERNANCE_EVENT'],
    targetNodeTypes: ['PROTOCOL'],
    effectClass: 'SECURITY_CONTAGION',
    strengthModel: 'EVENT_SHOCK',
    hopLimit: 1, decayPerHop: 0.6,
    requiredSourceConfidence: 'MEDIUM',
    requiredSourceTemporalStates: ['ACTIVE'],
    blockedConditions: ['SOURCE_EDGE_EXPIRED'],
    querySurfacesAllowed: ['entity_context', 'event_timeline'],
    blockedUsesUnderUncertainty: ['comparison', 'hypothesis_support'],
    requireEventNodeSupport: true,
    maxPropagationWindowMs: 30 * 24 * 60 * 60 * 1000,
    explanationTemplate: 'Security event {source} propagates contagion risk to {target}',
    replayCompatibility: REPLAY_V1,
  },
  {
    ruleId: 'RULE_COMPETITIVE_PRESSURE_PROTOCOL',
    contractVersion: 'v1',
    sourceEdgeTypes: ['PROTOCOL_HAS_COMPETITOR'],
    sourceNodeTypes: ['PROTOCOL'],
    targetNodeTypes: ['PROTOCOL'],
    effectClass: 'COMPETITIVE_PRESSURE',
    strengthModel: 'CAPPED_COMPETITIVE_PRESSURE',
    hopLimit: 1, decayPerHop: 0.4,
    requiredSourceConfidence: 'MEDIUM',
    requiredSourceTemporalStates: ['ACTIVE'],
    blockedConditions: [],
    querySurfacesAllowed: ['entity_context', 'comparison'],
    blockedUsesUnderUncertainty: ['hypothesis_support', 'alerts'],
    explanationTemplate: 'Competitive shift in {source} creates pressure context for {target}',
    replayCompatibility: REPLAY_V1,
  },
];

export function bootstrapPropagationRules(): { registered: number; errors: string[] } {
  let registered = 0;
  const errors: string[] = [];
  for (const r of BOOTSTRAP_RULES) {
    const result = registerPropagationRule(r);
    if (result.success) registered++;
    else errors.push(`${r.ruleId}: ${result.error}`);
  }
  return { registered, errors };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  RESET                                                                       ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export function resetPropagationEngine(): void {
  _ruleById.clear(); _rulesByEffectClass.clear(); _rulesBySourceEdge.clear();
  _eventsByTarget.clear(); _eventsById.clear(); _trailsById.clear();
  _targetImpact.clear(); _counter = 0;
}
