/**
 * L12.1 — Mission Contract
 *
 * §12.1.1 / §12.1.2 / §12.1.4 — Canonical Layer 12 mission and the
 * frozen first principle: a scenario is not a prediction, a scenario
 * is a governed conditional path.
 */

import {
  L12AllowedCapability,
  L12DependencyLayer,
  L12OutputSurfaceClass,
  L12SubjectClass,
} from './l12-constitutional-types';

export const L12_MISSION = {
  name: 'Layer 12 — Conditional Scenario Engine',
  canonical:
    'Layer 12 is the conditional scenario logic layer. It takes ' +
    'governed validation, contradiction, regime, sequence, hypothesis, ' +
    'and deterministic score surfaces from L3–L11 and constructs ' +
    'conditional future-path structures with explicit conditions, ' +
    'triggers, invalidations, evidence, confidence limits, and ' +
    'restrictions — without inventing new truth, rebuilding lower-layer ' +
    'logic, claiming certainty, emitting final judgment, recommendation, ' +
    'trade action, or scenario winners.',
  compression:
    'Layer 12 expresses governed truth as conditional future-path scenarios with triggers and invalidations.',
  firstPrinciple:
    'A scenario is not a prediction. A scenario is a governed conditional path.',
  firstPrincipleExpanded:
    'Layer 12 may describe plausible future paths only as conditional ' +
    'structures. Every path must carry conditions, triggers, ' +
    'invalidations, evidence, confidence limits, restrictions, lineage, ' +
    'and replay identity.',
  scenarioConstructionBoundary: [
    'scenario subject',
    'scenario set',
    'base case',
    'conditional path',
    'trigger profile',
    'invalidation profile',
    'path confidence',
    'shift conditions',
    'scenario restrictions',
    'scenario evidence read surface',
    'scenario lineage read surface',
  ] as const,
  offLimits: [
    'prediction theater',
    'certainty claim',
    'final judgment emission',
    'recommendation emission',
    'trade action emission',
    'scenario as guarantee',
    'single-path fake certainty',
    'invalidation omission',
    'trigger omission',
    'condition omission',
    'lower-layer truth redefinition',
    'validation rebuild',
    'regime rebuild',
    'sequence rebuild',
    'hypothesis rebuild',
    'score rebuild',
    'L11 score-value-only consumption',
    'L7 restriction bypass',
    'L8 regime posture ignore',
    'L9 sequence posture ignore',
    'L10 hypothesis posture ignore',
    'L11 score restriction ignore',
    'contradiction downgrade',
    'active invalidation hide',
    'missing visibility hide',
    'drift status hide',
    'path confidence laundering',
    'scenario spread hide',
    'raw storage bypass',
    'L5 persistence bypass',
    'L13+ consumption',
  ] as const,
  frozenDependencies: [
    L12DependencyLayer.L3,
    L12DependencyLayer.L4,
    L12DependencyLayer.L5,
    L12DependencyLayer.L6,
    L12DependencyLayer.L7,
    L12DependencyLayer.L8,
    L12DependencyLayer.L9,
    L12DependencyLayer.L10,
    L12DependencyLayer.L11,
  ] as const,
  subjectClasses: [
    L12SubjectClass.SCENARIO_SUBJECT,
    L12SubjectClass.SCENARIO_SET_SUBJECT,
    L12SubjectClass.CONDITIONAL_PATH_SUBJECT,
    L12SubjectClass.TRIGGER_SUBJECT,
    L12SubjectClass.INVALIDATION_SUBJECT,
    L12SubjectClass.PATH_CONFIDENCE_SUBJECT,
    L12SubjectClass.SHIFT_CONDITION_SUBJECT,
    L12SubjectClass.SCENARIO_RESTRICTION_SUBJECT,
    L12SubjectClass.SCENARIO_EVIDENCE_SUBJECT,
  ] as const,
  outputClasses: [
    L12OutputSurfaceClass.SCENARIO_SET,
    L12OutputSurfaceClass.BASE_CASE_SCENARIO,
    L12OutputSurfaceClass.BULLISH_CONTINUATION_SCENARIO,
    L12OutputSurfaceClass.BEARISH_FAILURE_SCENARIO,
    L12OutputSurfaceClass.TRIGGER_PROFILE,
    L12OutputSurfaceClass.INVALIDATION_PROFILE,
    L12OutputSurfaceClass.PATH_CONFIDENCE_PROFILE,
    L12OutputSurfaceClass.SCENARIO_SHIFT_CONDITION_SET,
    L12OutputSurfaceClass.SCENARIO_RESTRICTION_PROFILE,
    L12OutputSurfaceClass.SCENARIO_EVIDENCE_READ_SURFACE,
    L12OutputSurfaceClass.SCENARIO_LINEAGE_READ_SURFACE,
  ] as const,
} as const;

export interface L12MissionConstraint {
  readonly allowedOutputClasses: readonly L12OutputSurfaceClass[];
  readonly forbiddenOutputClasses: readonly string[];
  readonly allowedSubjectClasses: readonly L12SubjectClass[];
  readonly allowedDependencySources: readonly L12DependencyLayer[];
  readonly allowedCapabilities: readonly L12AllowedCapability[];
  readonly conditionalityRequired: boolean;
  readonly triggerRequired: boolean;
  readonly invalidationRequired: boolean;
  readonly conditionRequired: boolean;
  readonly pathConfidenceRequired: boolean;
  readonly evidenceRequired: boolean;
  readonly lineageRequired: boolean;
  readonly replayHashRequired: boolean;
  readonly l5RouteRequired: boolean;
  readonly l11ScoreContextBundleRequired: boolean;
  readonly restrictionPosturePreservationRequired: boolean;
  readonly regimePosturePreservationRequired: boolean;
  readonly sequencePosturePreservationRequired: boolean;
  readonly hypothesisPosturePreservationRequired: boolean;
  readonly noPredictionTheater: boolean;
  readonly noCertaintyClaim: boolean;
  readonly noJudgmentEmission: boolean;
  readonly noRecommendationEmission: boolean;
  readonly noTradeActionEmission: boolean;
  readonly noScenarioAsGuarantee: boolean;
  readonly noSinglePathFakeCertainty: boolean;
}

export const L12_MISSION_CONSTRAINT: L12MissionConstraint = {
  allowedOutputClasses: [...L12_MISSION.outputClasses],
  forbiddenOutputClasses: [
    'PREDICTION',
    'GUARANTEED_OUTCOME',
    'GUARANTEED_PATH',
    'CERTAIN_PATH',
    'INEVITABLE_PATH',
    'FINAL_JUDGMENT',
    'FINAL_RECOMMENDATION',
    'TRADE_RECOMMENDATION',
    'BUY_SIGNAL',
    'SELL_SIGNAL',
    'AVOID_SIGNAL',
    'TRADE_SIGNAL',
    'ENTRY_SIGNAL',
    'EXIT_SIGNAL',
    'PORTFOLIO_ALLOCATION',
    'SCENARIO_WINNER',
    'FINAL_SCENARIO',
    'WINNING_SCENARIO',
    'BEST_TRADE',
    'BEST_OPPORTUNITY',
    'GUARANTEED_SETUP',
    'CONFIRMED_BREAKOUT',
    'SAFE_CONTINUATION',
    'CANNOT_FAIL_PATH',
    'CONVICTION_SIGNAL',
    'ACTIONABLE_SCENARIO',
    'TRADE_READY_SCENARIO',
    'ENTRY_READY_SCENARIO',
    'CAUSAL_PROOF',
  ],
  allowedSubjectClasses: [...L12_MISSION.subjectClasses],
  allowedDependencySources: [...L12_MISSION.frozenDependencies],
  allowedCapabilities: [...Object.values(L12AllowedCapability)],
  conditionalityRequired: true,
  triggerRequired: true,
  invalidationRequired: true,
  conditionRequired: true,
  pathConfidenceRequired: true,
  evidenceRequired: true,
  lineageRequired: true,
  replayHashRequired: true,
  l5RouteRequired: true,
  l11ScoreContextBundleRequired: true,
  restrictionPosturePreservationRequired: true,
  regimePosturePreservationRequired: true,
  sequencePosturePreservationRequired: true,
  hypothesisPosturePreservationRequired: true,
  noPredictionTheater: true,
  noCertaintyClaim: true,
  noJudgmentEmission: true,
  noRecommendationEmission: true,
  noTradeActionEmission: true,
  noScenarioAsGuarantee: true,
  noSinglePathFakeCertainty: true,
};

export function isL12LegalOutputClass(cls: string): boolean {
  return (L12_MISSION_CONSTRAINT.allowedOutputClasses as readonly string[])
    .includes(cls);
}

export function isL12ForbiddenOutputClass(cls: string): boolean {
  return L12_MISSION_CONSTRAINT.forbiddenOutputClasses.includes(cls);
}

/**
 * §12.1.7 — Forbidden language patterns. These signal prediction
 * theater, certainty claims, recommendation/judgment leakage, or
 * trade-action language. They must be rejected in component names,
 * descriptions, and emitted scenario semantics.
 */
const PREDICTION_THEATER_PHRASES: readonly string[] = [
  'will definitely',
  'will certainly',
  'will continue higher',
  'will continue lower',
  'guaranteed',
  'guarantee',
  'certainly going to',
  'must happen',
  'has to happen',
  'inevitable',
  'inevitably',
  'cannot fail',
  'cannot be wrong',
  'no doubt',
  'definitely going',
  'safe continuation',
  'confirmed breakout',
  'confirmed continuation',
  'forecast signal',
  'forecast path',
  'prediction path',
  'prediction score',
];

const RECOMMENDATION_PHRASES: readonly string[] = [
  'buy signal',
  'sell signal',
  'avoid signal',
  'trade signal',
  'entry confirmed',
  'exit confirmed',
  'safe continuation',
  'confirmed breakout',
  'best trade',
  'best opportunity',
  'enter now',
  'exit now',
  'go long',
  'go short',
  'should buy',
  'should sell',
  'should hold',
  'should avoid',
  'recommended buy',
  'recommended sell',
];

const JUDGMENT_PHRASES: readonly string[] = [
  'final scenario',
  'scenario winner',
  'winning scenario',
  'final judgment',
  'final verdict',
  'final answer',
];

const CONDITIONAL_PHRASES: readonly string[] = [
  'base case',
  'if ',
  'unless',
  'would strengthen',
  'would weaken',
  'would invalidate',
  'conditioned on',
  'path confidence',
  'remains narrowed',
  'failure risk rises',
  'continuation requires',
  'plausible if',
  'plausible unless',
];

export function detectL12PredictionTheater(text: string): boolean {
  const lower = text.toLowerCase();
  return PREDICTION_THEATER_PHRASES.some(p => lower.includes(p));
}

export function detectL12RecommendationLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return RECOMMENDATION_PHRASES.some(p => lower.includes(p));
}

export function detectL12JudgmentLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return JUDGMENT_PHRASES.some(p => lower.includes(p));
}

export function detectL12ConditionalLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return CONDITIONAL_PHRASES.some(p => lower.includes(p));
}

export function getL12PredictionTheaterPhrases(): readonly string[] {
  return PREDICTION_THEATER_PHRASES;
}

export function getL12RecommendationPhrases(): readonly string[] {
  return RECOMMENDATION_PHRASES;
}

export function getL12JudgmentPhrases(): readonly string[] {
  return JUDGMENT_PHRASES;
}

export function getL12ConditionalPhrases(): readonly string[] {
  return CONDITIONAL_PHRASES;
}

/**
 * §12.1.4 — Mission rule: does this component build governed
 * conditional-scenario behaviour, or does it smuggle in prediction
 * theater, recommendation, judgment, trade action, or lower-layer
 * rebuilding?
 */
export function matchesL12Mission(description: string): boolean {
  const lower = description.toLowerCase();
  const scenarioWords =
    lower.includes('scenario') ||
    lower.includes('conditional path') ||
    lower.includes('conditional future') ||
    lower.includes('base case') ||
    lower.includes('continuation path') ||
    lower.includes('failure path') ||
    lower.includes('trigger') ||
    lower.includes('invalidation') ||
    lower.includes('path confidence') ||
    lower.includes('shift condition');
  const illegal =
    detectL12PredictionTheater(lower) ||
    detectL12RecommendationLanguage(lower) ||
    detectL12JudgmentLanguage(lower) ||
    /rebuilds?\s+(validation|regime|sequence|hypothes|score)/.test(lower) ||
    /recomputes?\s+(validation|regime|sequence|hypothes|score)/.test(lower) ||
    /overrides?\s+(validation|regime|sequence|hypothes)/.test(lower) ||
    /reinterprets?\s+(regime|sequence|hypothes)/.test(lower) ||
    /redefines?\s+(identity|metric|scope)/.test(lower) ||
    /reranks?\s+hypothes/.test(lower) ||
    lower.includes('bypass l5') ||
    lower.includes('bypass l7') ||
    lower.includes('score value only') ||
    lower.includes('naked score');
  return scenarioWords && !illegal;
}
