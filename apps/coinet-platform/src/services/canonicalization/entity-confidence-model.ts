/**
 * L3.3 — Entity Confidence Model: Main Runtime Engine (Constitutional v2)
 *
 * Orchestrates the full 8-stage confidence evaluation pipeline:
 *   1. Load constitutional context
 *   2. Collect admissible evidence
 *   3. Evaluate factors
 *   4. Aggregate weighted score
 *   5. Apply constitutional cap chain
 *   6. Derive rights profile
 *   7. Handle transitions
 *   8. Persist + notify
 *
 * No canonical identity may leave Layer 3 without an explicit confidence
 * state, factor breakdown, scar-aware restrictions, and downstream rights.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CanonicalObjectType } from './canonical-entity-types';
import type { IdentityResolutionDecision } from './identity-resolution-types';
import {
  L33_CONFIDENCE_VERSION,
  L33_POLICY_VERSION,
  evaluateAllFactors,
  buildConfidenceEvaluationInput,
  mapResolutionStateToEpistemic,
  type ConfidenceBand,
  type ConfidenceEpistemicState,
  type ConfidenceScar,
  type FactorEvaluation,
  type ConfidenceEvaluationInput,
  type ConfidenceInputOverrides,
} from './confidence-factors';
import {
  applyAllCaps,
  deriveRightsProfile,
  shouldEnterProbation,
  createProbation,
  type RightsProfile,
  type ProbationState,
  type CapResult,
} from './confidence-policy-map';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE OUTPUT — EntityConfidenceState
// ═══════════════════════════════════════════════════════════════════════════════

export interface EntityConfidenceState {
  stateId: string;
  canonicalId: string;
  objectType: CanonicalObjectType;
  evaluatedAt: string;

  rawScore: number;
  finalScore: number;
  band: ConfidenceBand;
  epistemicState: ConfidenceEpistemicState;

  factorEvaluations: FactorEvaluation[];
  activeScars: ConfidenceScar[];
  rightsProfile: RightsProfile;

  probationState?: ProbationState;
  capChain: CapResult[];

  downgradeReasons: string[];
  provenanceSummary: string[];
  temporalSummary: string[];

  policyVersion: string;
  evaluatorVersion: string;

  priorStateRef?: string;
  transitionReason: string;
  evidenceRefs: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITION EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConfidenceTransitionEvent {
  transitionId: string;
  canonicalId: string;
  priorBand: ConfidenceBand;
  newBand: ConfidenceBand;
  priorScore: number;
  newScore: number;
  changedRights: string[];
  newScars: string[];
  clearedScars: string[];
  triggerType: string;
  evidenceRefs: string[];
  evaluatorVersion: string;
  policyVersion: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW QUEUE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ReviewQueueType =
  | 'UNRESOLVED_QUEUE'
  | 'CONTESTED_QUEUE'
  | 'OSCILLATION_QUEUE'
  | 'PROVENANCE_GAP_QUEUE'
  | 'HIGH_IMPACT_DOWNGRADE_QUEUE';

export interface ReviewQueueEntry {
  entryId: string;
  canonicalId: string;
  objectType: CanonicalObjectType;
  queueType: ReviewQueueType;
  triggerCause: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredReviewArtifacts: string[];
  status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'EXPIRED';
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORES
// ═══════════════════════════════════════════════════════════════════════════════

const _currentStates: Map<string, EntityConfidenceState> = new Map();
const _historyLog: ConfidenceTransitionEvent[] = [];
const _reviewQueues: ReviewQueueEntry[] = [];

export function getCurrentState(canonicalId: string): EntityConfidenceState | undefined {
  return _currentStates.get(canonicalId);
}

export function getHistoryLog(): readonly ConfidenceTransitionEvent[] {
  return _historyLog;
}

export function getHistoryForCanonicalId(canonicalId: string): ConfidenceTransitionEvent[] {
  return _historyLog.filter(e => e.canonicalId === canonicalId);
}

export function getReviewQueues(): readonly ReviewQueueEntry[] {
  return _reviewQueues;
}

export function getReviewQueueByType(queueType: ReviewQueueType): ReviewQueueEntry[] {
  return _reviewQueues.filter(e => e.queueType === queueType && e.status === 'PENDING');
}

export function resetConfidenceStores(): void {
  _currentStates.clear();
  _historyLog.length = 0;
  _reviewQueues.length = 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE — evaluateEntityConfidence
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateEntityConfidence(
  decision: IdentityResolutionDecision,
  overrides?: ConfidenceInputOverrides,
): EntityConfidenceState {
  const now = new Date().toISOString();
  const input = buildConfidenceEvaluationInput(decision, overrides);
  const objectType = decision.objectType;
  const canonicalId = input.canonicalId;
  const priorState = _currentStates.get(canonicalId);

  // Stage 3: Evaluate all five factors
  const aggregation = evaluateAllFactors(input);

  // Stage 4: Raw score and provisional band
  const rawScore = aggregation.rawScore;
  const provisionalBand = aggregation.provisionalBand;

  // Stage 5: Apply constitutional cap chain
  const epistemicState = mapResolutionStateToEpistemic(decision.resolutionState);

  let probation: ProbationState | undefined = priorState?.probationState;
  if (shouldEnterProbation(input.isRecentlyCorrected, input.isOscillating)) {
    const reasons: string[] = [];
    if (input.isRecentlyCorrected) reasons.push('RECENT_CORRECTION');
    if (input.isOscillating) reasons.push('OSCILLATION');
    probation = createProbation(objectType, reasons);
  }

  const { finalBand, capChain } = applyAllCaps(
    provisionalBand,
    epistemicState,
    aggregation.allVetoes,
    aggregation.allScars,
    probation,
    objectType,
    {
      isAliasOnly: input.isAliasOnly,
      isProviderClaimOnly: input.isProviderClaimOnly,
      hasAbsentProvenance: input.hasAbsentProvenance,
    },
  );

  // Stage 6: Derive rights
  const rightsProfile = deriveRightsProfile(finalBand, objectType, aggregation.allScars, epistemicState);

  // Stage 7: Transition handling
  const downgradeReasons: string[] = [];
  let transitionReason = 'INITIAL_EVALUATION';

  if (priorState) {
    const bandRank: Record<ConfidenceBand, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNRESOLVED: 0 };
    if (bandRank[finalBand] < bandRank[priorState.band]) {
      transitionReason = 'DOWNGRADE';
      downgradeReasons.push(...capChain.map(c => c.reason));
      if (input.isRecentlyCorrected) downgradeReasons.push('RECENT_CORRECTION');
      if (input.isOscillating) downgradeReasons.push('OSCILLATION');
    } else if (bandRank[finalBand] > bandRank[priorState.band]) {
      transitionReason = 'UPGRADE';
    } else {
      transitionReason = 'RE_EVALUATION';
    }

    const transition: ConfidenceTransitionEvent = {
      transitionId: `trans_${uuidv4().replace(/-/g, '')}`,
      canonicalId,
      priorBand: priorState.band,
      newBand: finalBand,
      priorScore: priorState.finalScore,
      newScore: rawScore,
      changedRights: detectChangedRights(priorState.rightsProfile, rightsProfile),
      newScars: aggregation.allScars.map(s => s.code).filter(c => !priorState.activeScars.some(ps => ps.code === c)),
      clearedScars: priorState.activeScars.map(s => s.code).filter(c => !aggregation.allScars.some(ns => ns.code === c)),
      triggerType: transitionReason,
      evidenceRefs: input.evidenceRefs,
      evaluatorVersion: L33_CONFIDENCE_VERSION,
      policyVersion: L33_POLICY_VERSION,
      timestamp: now,
    };
    _historyLog.push(transition);
  }

  // Build temporal and provenance summaries
  const temporalSummary: string[] = [];
  const temporalEval = aggregation.factorEvaluations.find(e => e.family === 'TEMPORAL_STABILITY');
  if (temporalEval) temporalSummary.push(`${temporalEval.substate}:score=${temporalEval.score}`);
  if (input.isRecentlyCorrected) temporalSummary.push(`corrections=${input.correctionCount}`);
  if (input.isOscillating) temporalSummary.push(`oscillations=${input.oscillationCount}`);

  const provenanceSummary: string[] = [];
  const provEval = aggregation.factorEvaluations.find(e => e.family === 'PROVENANCE_STRENGTH');
  if (provEval) provenanceSummary.push(`${provEval.substate}:score=${provEval.score}`);
  if (!input.traceComplete) provenanceSummary.push('TRACE_INCOMPLETE');
  if (!input.lineageComplete) provenanceSummary.push('LINEAGE_INCOMPLETE');

  // Stage 8: Build and persist
  const state: EntityConfidenceState = {
    stateId: `cstate_${uuidv4().replace(/-/g, '')}`,
    canonicalId,
    objectType,
    evaluatedAt: now,
    rawScore,
    finalScore: rawScore,
    band: finalBand,
    epistemicState,
    factorEvaluations: aggregation.factorEvaluations,
    activeScars: aggregation.allScars,
    rightsProfile,
    probationState: probation,
    capChain,
    downgradeReasons,
    provenanceSummary,
    temporalSummary,
    policyVersion: L33_POLICY_VERSION,
    evaluatorVersion: L33_CONFIDENCE_VERSION,
    priorStateRef: priorState?.stateId,
    transitionReason,
    evidenceRefs: input.evidenceRefs,
  };

  _currentStates.set(canonicalId, state);

  // Enqueue review queues
  enqueueReviewsIfNeeded(state, input);

  return state;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PER-TYPE EVALUATOR WRAPPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateAssetConfidence(d: IdentityResolutionDecision, o?: ConfidenceInputOverrides) {
  if (d.objectType !== 'ASSET') throw new Error(`evaluateAssetConfidence: expected ASSET, got ${d.objectType}`);
  return evaluateEntityConfidence(d, o);
}

export function evaluatePairConfidence(d: IdentityResolutionDecision, o?: ConfidenceInputOverrides) {
  if (d.objectType !== 'PAIR') throw new Error(`evaluatePairConfidence: expected PAIR, got ${d.objectType}`);
  return evaluateEntityConfidence(d, o);
}

export function evaluateProtocolConfidence(d: IdentityResolutionDecision, o?: ConfidenceInputOverrides) {
  if (d.objectType !== 'PROTOCOL') throw new Error(`evaluateProtocolConfidence: expected PROTOCOL, got ${d.objectType}`);
  return evaluateEntityConfidence(d, o);
}

export function evaluateEntityTypeConfidence(d: IdentityResolutionDecision, o?: ConfidenceInputOverrides) {
  if (d.objectType !== 'ENTITY') throw new Error(`evaluateEntityTypeConfidence: expected ENTITY, got ${d.objectType}`);
  return evaluateEntityConfidence(d, o);
}

export function evaluateChainConfidence(d: IdentityResolutionDecision, o?: ConfidenceInputOverrides) {
  if (d.objectType !== 'CHAIN') throw new Error(`evaluateChainConfidence: expected CHAIN, got ${d.objectType}`);
  return evaluateEntityConfidence(d, o);
}

export function evaluateNarrativeTopicConfidence(d: IdentityResolutionDecision, o?: ConfidenceInputOverrides) {
  if (d.objectType !== 'NARRATIVE_TOPIC') throw new Error(`evaluateNarrativeTopicConfidence: expected NARRATIVE_TOPIC, got ${d.objectType}`);
  return evaluateEntityConfidence(d, o);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW QUEUE LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

function enqueueReviewsIfNeeded(state: EntityConfidenceState, input: ConfidenceEvaluationInput): void {
  const now = state.evaluatedAt;

  if (state.band === 'UNRESOLVED') {
    enqueue(state, 'UNRESOLVED_QUEUE', 'BAND_UNRESOLVED', 'HIGH', now);
  }
  if (state.epistemicState === 'CONTESTED') {
    enqueue(state, 'CONTESTED_QUEUE', 'EPISTEMIC_CONTESTED', 'HIGH', now);
  }
  if (input.isOscillating) {
    enqueue(state, 'OSCILLATION_QUEUE', 'OSCILLATING_IDENTITY', 'CRITICAL', now);
  }
  if (input.hasAbsentProvenance && (state.objectType === 'ENTITY' || state.objectType === 'PROTOCOL')) {
    enqueue(state, 'PROVENANCE_GAP_QUEUE', 'ABSENT_PROVENANCE_SENSITIVE_TYPE', 'HIGH', now);
  }
  if (state.transitionReason === 'DOWNGRADE' && state.downgradeReasons.length > 0) {
    const priorState = _currentStates.get(state.canonicalId);
    if (priorState && (priorState.band === 'HIGH' || priorState.band === 'MEDIUM')) {
      enqueue(state, 'HIGH_IMPACT_DOWNGRADE_QUEUE', `DOWNGRADE_FROM_${priorState.band}`, 'CRITICAL', now);
    }
  }
}

function enqueue(
  state: EntityConfidenceState,
  queueType: ReviewQueueType,
  cause: string,
  priority: ReviewQueueEntry['priority'],
  now: string,
): void {
  const exists = _reviewQueues.some(
    e => e.canonicalId === state.canonicalId && e.queueType === queueType && e.status === 'PENDING',
  );
  if (exists) return;

  _reviewQueues.push({
    entryId: `rq_${uuidv4().replace(/-/g, '')}`,
    canonicalId: state.canonicalId,
    objectType: state.objectType,
    queueType,
    triggerCause: cause,
    priority,
    requiredReviewArtifacts: state.evidenceRefs,
    status: 'PENDING',
    createdAt: now,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function detectChangedRights(prior: RightsProfile, current: RightsProfile): string[] {
  const changed: string[] = [];
  const keys: (keyof Omit<RightsProfile, 'conditions'>)[] = [
    'scoring', 'contradictionEngine', 'scenarioEngine', 'judgment',
    'graphRelations', 'canonicalMutation', 'metricAttachment',
    'contextualReasoning', 'enrichmentOnly', 'display',
    'unresolvedQueue', 'forensicReplay', 'manualReviewQueue',
  ];
  for (const k of keys) {
    if (prior[k] !== current[k]) changed.push(`${k}:${prior[k]}->${current[k]}`);
  }
  return changed;
}

export { L33_CONFIDENCE_VERSION, L33_POLICY_VERSION };
