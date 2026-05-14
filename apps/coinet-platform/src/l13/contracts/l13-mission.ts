/**
 * L13.1 — Mission Contract
 *
 * §13.1.1 / §13.1.2 — Canonical Layer 13 mission and the frozen first
 * principle: the AI may explain judgment, but it may not manufacture
 * judgment.
 *
 * Layer 13 is the AI Judgment & Explanation Layer. It is the
 * grounded voice of the engine. It does not own truth, it does not
 * decide truth, and it does not predict.
 */

import {
  L13AllowedCapability,
  L13DependencyLayer,
  L13OutputSurfaceClass,
  L13SubjectClass,
} from './l13-constitutional-types';

export const L13_MISSION = {
  name: 'Layer 13 — AI Judgment & Explanation Layer',
  canonical:
    'Layer 13 is the AI Judgment & Explanation Layer. It takes ' +
    'canonical identity, validation, contradiction, regime, sequence, ' +
    'hypothesis, score, and scenario outputs from the frozen L3–L12 ' +
    'substrate and produces grounded AI explanations that are useful, ' +
    'honest, concise, evidence-aware, uncertainty-aware, ' +
    'contradiction-aware, and restriction-compliant — without ' +
    'inventing support, hiding contradiction, creating new scenarios, ' +
    'computing scores, giving recommendations, making predictions, ' +
    'or manufacturing judgment.',
  compression:
    'Layer 13 explains governed engine truth. It is the voice of the engine, not the engine itself.',
  firstPrinciple:
    'The AI may explain judgment, but it may not manufacture judgment.',
  firstPrincipleExpanded:
    'Layer 13 may turn governed engine outputs into readable ' +
    'intelligence. It may answer what is happening, why it is ' +
    'happening, what evidence supports it, what contradicts it, what ' +
    'is uncertain, what scenario paths exist, what would confirm or ' +
    'invalidate the current interpretation, and why confidence is ' +
    'capped. It may not decide raw truth, canonical identity, ' +
    'validation status, regime, sequence, hypothesis ranking, score ' +
    'values, scenario paths, or any final trade action.',
  explanationBoundary: [
    'engine state explanation',
    'market state summarization',
    'scenario explanation with triggers and invalidations',
    'score explanation via attribution',
    'hypothesis explanation with spread',
    'regime explanation with transition risk',
    'sequence explanation with phase and decay',
    'contradiction disclosure',
    'uncertainty disclosure',
    'comparison of governed input packages',
    'refusal of unsupported conclusion',
  ] as const,
  offLimits: [
    'manufacturing judgment',
    'manufacturing truth',
    'manufacturing canonical identity',
    'manufacturing feature truth',
    'manufacturing validation status',
    'manufacturing contradiction posture',
    'manufacturing regime state',
    'manufacturing sequence state',
    'manufacturing hypothesis ranking',
    'manufacturing score value',
    'manufacturing scenario path',
    'final trade action',
    'buy / sell / hold / avoid instruction',
    'position sizing',
    'leverage instruction',
    'entry or exit instruction',
    'prediction theater',
    'unsupported certainty',
    'final-judgment leakage',
    'scenario-as-probability',
    'scenario-as-winner',
    'hypothesis-as-final-truth',
    'score-as-recommendation',
    'pretending missing data complete',
    'omitting active invalidation',
    'omitting required trigger',
    'using raw lower-layer bypass',
    'inventing support',
    'hiding contradiction',
    'ignoring restriction',
    'overriding confidence cap',
    'rebuilding scenario',
    'rebuilding score',
    'rebuilding hypothesis',
    'rebuilding sequence',
    'rebuilding regime',
    'creating new scenario',
    'creating new hypothesis',
    'computing score locally',
  ] as const,
  frozenDependencies: [
    L13DependencyLayer.L3_IDENTITY,
    L13DependencyLayer.L4_GRAPH,
    L13DependencyLayer.L5_STORAGE,
    L13DependencyLayer.L6_FEATURE_EVENT,
    L13DependencyLayer.L7_VALIDATION,
    L13DependencyLayer.L8_REGIME,
    L13DependencyLayer.L9_SEQUENCE,
    L13DependencyLayer.L10_HYPOTHESIS,
    L13DependencyLayer.L11_SCORE,
    L13DependencyLayer.L12_SCENARIO,
  ] as const,
  subjectClasses: [
    L13SubjectClass.ENGINE_STATE_SUBJECT,
    L13SubjectClass.MARKET_STATE_SUBJECT,
    L13SubjectClass.USER_QUESTION_SUBJECT,
    L13SubjectClass.ALERT_SUBJECT,
    L13SubjectClass.REPORT_SUBJECT,
    L13SubjectClass.COMPARISON_SUBJECT,
    L13SubjectClass.SCENARIO_EXPLANATION_SUBJECT,
    L13SubjectClass.SCORE_EXPLANATION_SUBJECT,
    L13SubjectClass.HYPOTHESIS_EXPLANATION_SUBJECT,
    L13SubjectClass.REGIME_EXPLANATION_SUBJECT,
    L13SubjectClass.SEQUENCE_EXPLANATION_SUBJECT,
    L13SubjectClass.CONTRADICTION_DISCLOSURE_SUBJECT,
    L13SubjectClass.UNCERTAINTY_DISCLOSURE_SUBJECT,
    L13SubjectClass.REFUSAL_SUBJECT,
  ] as const,
  outputClasses: [
    L13OutputSurfaceClass.AI_EXPLANATION_OUTPUT,
    L13OutputSurfaceClass.AI_QUESTION_ANSWER_OUTPUT,
    L13OutputSurfaceClass.AI_ALERT_OUTPUT,
    L13OutputSurfaceClass.AI_STRUCTURED_REPORT_OUTPUT,
    L13OutputSurfaceClass.AI_COMPARISON_OUTPUT,
    L13OutputSurfaceClass.AI_UNCERTAINTY_DISCLOSURE_OUTPUT,
    L13OutputSurfaceClass.AI_CONTRADICTION_DISCLOSURE_OUTPUT,
    L13OutputSurfaceClass.AI_BLOCKED_OUTPUT,
    L13OutputSurfaceClass.AI_GROUNDING_AUDIT_OUTPUT,
  ] as const,
} as const;

export interface L13MissionConstraint {
  readonly allowedOutputClasses: readonly L13OutputSurfaceClass[];
  readonly forbiddenOutputClasses: readonly string[];
  readonly allowedSubjectClasses: readonly L13SubjectClass[];
  readonly allowedDependencySources: readonly L13DependencyLayer[];
  readonly allowedCapabilities: readonly L13AllowedCapability[];
  readonly evidenceRequired: boolean;
  readonly lineageRequired: boolean;
  readonly confidenceDisclosureRequired: boolean;
  readonly restrictionDisclosureRequired: boolean;
  readonly contradictionDisclosureRequired: boolean;
  readonly uncertaintyDisclosureRequired: boolean;
  readonly noTradeInstruction: boolean;
  readonly noPrediction: boolean;
  readonly noRecommendation: boolean;
  readonly noFinalJudgment: boolean;
  readonly noLowerLayerRebuild: boolean;
  readonly noInvention: boolean;
  readonly noHidingContradiction: boolean;
  readonly noConfidenceOverride: boolean;
  readonly noScenarioCreation: boolean;
  readonly noLocalScoreCompute: boolean;
}

export const L13_MISSION_CONSTRAINT: L13MissionConstraint = {
  allowedOutputClasses: [...L13_MISSION.outputClasses],
  forbiddenOutputClasses: [
    'TRADE_INSTRUCTION',
    'TRADE_RECOMMENDATION',
    'BUY_INSTRUCTION',
    'SELL_INSTRUCTION',
    'HOLD_INSTRUCTION',
    'AVOID_INSTRUCTION',
    'ENTRY_INSTRUCTION',
    'EXIT_INSTRUCTION',
    'POSITION_SIZE_INSTRUCTION',
    'LEVERAGE_INSTRUCTION',
    'PREDICTION',
    'GUARANTEED_OUTCOME',
    'CERTAIN_PATH',
    'INEVITABLE_PATH',
    'FINAL_JUDGMENT',
    'FINAL_VERDICT',
    'SCENARIO_WINNER',
    'WINNING_SCENARIO',
    'BEST_TRADE',
    'SAFE_ENTRY',
    'NEW_SCENARIO',
    'NEW_HYPOTHESIS',
    'LOCAL_SCORE',
    'SCORE_AS_RECOMMENDATION',
  ],
  allowedSubjectClasses: [...L13_MISSION.subjectClasses],
  allowedDependencySources: [...L13_MISSION.frozenDependencies],
  allowedCapabilities: [...Object.values(L13AllowedCapability)],
  evidenceRequired: true,
  lineageRequired: true,
  confidenceDisclosureRequired: true,
  restrictionDisclosureRequired: true,
  contradictionDisclosureRequired: true,
  uncertaintyDisclosureRequired: true,
  noTradeInstruction: true,
  noPrediction: true,
  noRecommendation: true,
  noFinalJudgment: true,
  noLowerLayerRebuild: true,
  noInvention: true,
  noHidingContradiction: true,
  noConfidenceOverride: true,
  noScenarioCreation: true,
  noLocalScoreCompute: true,
};

export function isL13LegalOutputClass(cls: string): boolean {
  return (L13_MISSION_CONSTRAINT.allowedOutputClasses as readonly string[])
    .includes(cls);
}

export function isL13ForbiddenOutputClass(cls: string): boolean {
  return L13_MISSION_CONSTRAINT.forbiddenOutputClasses.includes(cls);
}

/**
 * §13.1.6 — Forbidden semantic phrase scanners. These are used to
 * reject component descriptions and emitted output text that smuggle
 * in recommendation, prediction, final judgment, lower-layer-rebuild,
 * or missing-data laundering language.
 */

const RECOMMENDATION_PHRASES: readonly string[] = [
  'buy now',
  'sell now',
  'should buy',
  'should sell',
  'should hold',
  'should avoid',
  'go long',
  'go short',
  'enter now',
  'exit now',
  'take profit',
  'stop loss should be',
  'use leverage',
  'best trade',
  'safe entry',
  'recommended buy',
  'recommended sell',
  'buy signal',
  'sell signal',
  'avoid signal',
];

const PREDICTION_THEATER_PHRASES: readonly string[] = [
  'will go up',
  'will go down',
  'will dump',
  'will pump',
  'guaranteed',
  'locked in',
  'inevitable',
  'inevitably',
  'surely',
  'no doubt',
  'confirmed pump',
  'confirmed dump',
  'will definitely',
  'definitely going',
  'cannot fail',
  'must happen',
];

const FINAL_JUDGMENT_PHRASES: readonly string[] = [
  'final verdict',
  'this is the answer',
  'the winning scenario',
  'definitive conclusion',
  'this proves',
  'this confirms completely',
  'final scenario',
  'final judgment',
  'scenario winner',
];

const REBUILD_PHRASES: readonly string[] = [
  'calculate scenario',
  'compute scenario',
  'compute score locally',
  'compute the score',
  'rank hypothesis',
  'rerank hypothesis',
  'classify regime',
  'reclassify regime',
  'infer sequence',
  'reorder sequence',
  'validate truth',
  'override contradiction',
  'override restriction',
  'ignore restriction',
  'create new scenario',
  'create new hypothesis',
];

const MISSING_DATA_LAUNDER_PHRASES: readonly string[] = [
  'data is complete',
  'nothing is missing',
  'clean visibility',
  'full confidence',
];

/**
 * §13.1.2.3 — Locutions L13 may use safely. Used by `matchesL13Mission`
 * to require an explanatory shape rather than a prescriptive one.
 */
const EXPLANATION_PHRASES: readonly string[] = [
  'explain',
  'explanation',
  'summarize',
  'summary',
  'describe',
  'disclose',
  'compare',
  'report',
  'alert',
  'why confidence',
  'what would confirm',
  'what would invalidate',
  'engine currently sees',
  'governed',
  'evidence',
  'lineage',
  'contradiction',
  'uncertainty',
  'restriction',
  'scenario',
  'base case',
  'trigger',
  'invalidation',
];

export function detectL13RecommendationLeak(text: string): boolean {
  const lower = text.toLowerCase();
  return RECOMMENDATION_PHRASES.some(p => lower.includes(p));
}

export function detectL13PredictionTheater(text: string): boolean {
  const lower = text.toLowerCase();
  return PREDICTION_THEATER_PHRASES.some(p => lower.includes(p));
}

export function detectL13FinalJudgmentLeak(text: string): boolean {
  const lower = text.toLowerCase();
  return FINAL_JUDGMENT_PHRASES.some(p => lower.includes(p));
}

export function detectL13LowerLayerRebuildLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return REBUILD_PHRASES.some(p => lower.includes(p));
}

export function detectL13MissingDataLaunderLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return MISSING_DATA_LAUNDER_PHRASES.some(p => lower.includes(p));
}

export function detectL13ExplanationLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return EXPLANATION_PHRASES.some(p => lower.includes(p));
}

export function getL13RecommendationPhrases(): readonly string[] {
  return RECOMMENDATION_PHRASES;
}
export function getL13PredictionTheaterPhrases(): readonly string[] {
  return PREDICTION_THEATER_PHRASES;
}
export function getL13FinalJudgmentPhrases(): readonly string[] {
  return FINAL_JUDGMENT_PHRASES;
}
export function getL13RebuildPhrases(): readonly string[] {
  return REBUILD_PHRASES;
}
export function getL13MissingDataLaunderPhrases(): readonly string[] {
  return MISSING_DATA_LAUNDER_PHRASES;
}
export function getL13ExplanationPhrases(): readonly string[] {
  return EXPLANATION_PHRASES;
}

/**
 * §13.1.1 / §13.1.10 — Mission rule: does this component build
 * grounded AI explanation behaviour, or does it smuggle in
 * recommendation, prediction, final judgment, or lower-layer rebuild?
 */
export function matchesL13Mission(description: string): boolean {
  const lower = description.toLowerCase();
  const explanationShape = detectL13ExplanationLanguage(lower);
  const illegal =
    detectL13RecommendationLeak(lower) ||
    detectL13PredictionTheater(lower) ||
    detectL13FinalJudgmentLeak(lower) ||
    detectL13LowerLayerRebuildLanguage(lower) ||
    /generates?\s+(?:new\s+)?scor(?:e|ing)/.test(lower) ||
    /generates?\s+(?:new\s+)?scenarios?/.test(lower) ||
    /generates?\s+(?:new\s+)?hypothes(?:is|es)/.test(lower) ||
    /classify\s+regime/.test(lower) ||
    /infer\s+sequence/.test(lower) ||
    /override\s+(?:contradiction|restriction|confidence)/.test(lower) ||
    /buy[-_\s]?sell[-_\s]?hold[-_\s]?avoid/.test(lower);
  return explanationShape && !illegal;
}
