/**
 * L13.1 — Boundary Contract (Negative Definition)
 *
 * §13.1.2 — What Layer 13 is NOT. §13.1.5 / §13.1.10 — Forbidden
 * naming patterns indicating recommendation, prediction, final
 * judgment, lower-layer rebuild, invention, or hidden engine
 * components.
 */

export const L13_IS_NOT = [
  'the data layer',
  'the validation layer',
  'the contradiction layer',
  'the regime engine',
  'the sequence engine',
  'the hypothesis engine',
  'the scoring engine',
  'the scenario engine',
  'the trading engine',
  'the recommendation layer',
  'the prediction layer',
  'the final judgment layer',
  'a raw LLM analyst free to reason from scratch',
] as const;

export const L13_DOES_NOT_ANSWER = [
  'should I buy',
  'should I sell',
  'should I hold',
  'should I avoid',
  'what leverage should I use',
  'what exact entry should I take',
  'what exact exit should I take',
  'will this pump',
  'will this dump',
  'is this guaranteed',
  'is this the best trade',
] as const;

export const L13_MAY_ANSWER_INSTEAD = [
  'what the engine currently sees',
  'which path is the base case',
  'what supports that path',
  'what contradicts it',
  'what would confirm it',
  'what would invalidate it',
  'what confidence limits apply',
  'what to monitor next',
] as const;

/**
 * §13.1.5 / §13.1.10 — Forbidden semantic patterns. Must never appear
 * as L13 component names, output class names, or capability claims.
 */
const FORBIDDEN_NAME_PATTERNS: readonly RegExp[] = [
  // recommendation / trade action
  /buy[_\s]?signal/i,
  /sell[_\s]?signal/i,
  /avoid[_\s]?signal/i,
  /hold[_\s]?signal/i,
  /trade[_\s]?signal/i,
  /entry[_\s]?signal/i,
  /exit[_\s]?signal/i,
  /trade[_\s]?recommendation/i,
  /trade[_\s]?advisor/i,
  /trade[_\s]?advice/i,
  /buy[_\s]?advisor/i,
  /sell[_\s]?advisor/i,
  /hold[_\s]?advisor/i,
  /avoid[_\s]?advisor/i,
  /leverage[_\s]?advisor/i,
  /entry[_\s]?advisor/i,
  /exit[_\s]?advisor/i,
  /position[_\s]?size/i,
  /leverage[_\s]?advice/i,
  /leverage[_\s]?recommendation/i,
  /entry[_\s]?advice/i,
  /exit[_\s]?advice/i,
  /buy[_\s]?ready/i,
  /sell[_\s]?ready/i,
  /actionable[_\s]?call/i,

  // prediction / certainty
  /will[_\s]?definitely/i,
  /guaranteed[_\s]?path/i,
  /guaranteed[_\s]?outcome/i,
  /certain[_\s]?path/i,
  /certain[_\s]?outcome/i,
  /inevitable[_\s]?path/i,
  /cannot[_\s]?fail/i,
  /prediction[_\s]?signal/i,
  /prediction[_\s]?engine/i,
  /predictor\b/i,
  /forecast[_\s]?signal/i,
  /forecast[_\s]?engine/i,
  /forecast[_\s]?writer/i,
  /forecaster\b/i,
  /will[_\s]?go[_\s]?up/i,
  /will[_\s]?go[_\s]?down/i,
  /will[_\s]?pump/i,
  /will[_\s]?dump/i,

  // final-judgment / winner
  /final[_\s]?verdict/i,
  /final[_\s]?judgment/i,
  /final[_\s]?answer/i,
  /scenario[_\s]?winner/i,
  /winning[_\s]?scenario/i,
  /winning[_\s]?path/i,
  /chosen[_\s]?scenario/i,

  // engine impersonation by L13
  /scenario[_\s]?generator/i,
  /scenario[_\s]?builder/i,
  /score[_\s]?calculator/i,
  /score[_\s]?computer/i,
  /score[_\s]?engine/i,
  /regime[_\s]?classifier/i,
  /regime[_\s]?engine/i,
  /sequence[_\s]?engine/i,
  /hypothesis[_\s]?ranker/i,
  /hypothesis[_\s]?engine/i,
  /validation[_\s]?engine/i,

  // lower-layer rebuild / override
  /rebuild[_\s]?scenario/i,
  /rebuild[_\s]?score/i,
  /rebuild[_\s]?hypothesis/i,
  /rebuild[_\s]?hypotheses/i,
  /rebuild[_\s]?sequence/i,
  /rebuild[_\s]?regime/i,
  /rebuild[_\s]?validation/i,
  /override[_\s]?contradiction/i,
  /override[_\s]?restriction/i,
  /override[_\s]?confidence/i,
  /override[_\s]?regime/i,
  /override[_\s]?sequence/i,
  /override[_\s]?hypothesis/i,
  /reinterpret[_\s]?regime/i,
  /reinterpret[_\s]?sequence/i,
  /reinterpret[_\s]?hypothesis/i,
  /recompute[_\s]?score/i,
  /local[_\s]?score/i,
  /score[_\s]?locally/i,
  /compute[_\s]?score[_\s]?locally/i,
  /raw[_\s]?lower[_\s]?layer/i,
  /naked[_\s]?score/i,
  /create[_\s]?new[_\s]?scenario/i,
  /create[_\s]?new[_\s]?hypothesis/i,
  /create[_\s]?new[_\s]?hypotheses/i,

  // invention / hiding
  /invent[_\s]?support/i,
  /invent[_\s]?evidence/i,
  /hide[_\s]?contradiction/i,
  /mask[_\s]?contradiction/i,
  /pretend[_\s]?missing[_\s]?data/i,

  // late-layer dependency / bypass
  /consume[_\s]?l1[4-9]/i,
  /consume[_\s]?l2[0-9]/i,
  /bypass[_\s]?l5/i,
  /bypass[_\s]?l7/i,
  /bypass[_\s]?l1[01]/i,
  /bypass[_\s]?l12/i,

  // direct-write / persistence drift
  /direct[_\s]?postgres/i,
  /direct[_\s]?clickhouse/i,
];

const VALID_NAME_EXAMPLES: readonly string[] = [
  'engine_state_explainer',
  'market_state_summarizer',
  'scenario_explanation_writer',
  'score_explanation_writer',
  'hypothesis_explanation_writer',
  'regime_explanation_writer',
  'sequence_explanation_writer',
  'contradiction_disclosure_writer',
  'uncertainty_disclosure_writer',
  'comparison_writer',
  'alert_text_writer',
  'structured_report_writer',
  'refusal_writer',
  'evidence_citation_helper',
  'restriction_disclosure_helper',
];

export function containsL13ForbiddenNaming(name: string): boolean {
  return FORBIDDEN_NAME_PATTERNS.some(p => p.test(name));
}

export function isValidL13ComponentName(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (containsL13ForbiddenNaming(name)) return false;
  return /^[a-z][a-z0-9_]*$/.test(name);
}

export interface L13ForbiddenSemanticCheck {
  readonly name: string;
  readonly forbidden: boolean;
  readonly matchedPattern: string | null;
}

export function checkL13ForbiddenSemantics(
  name: string,
): L13ForbiddenSemanticCheck {
  for (const p of FORBIDDEN_NAME_PATTERNS) {
    if (p.test(name)) {
      return { name, forbidden: true, matchedPattern: p.source };
    }
  }
  return { name, forbidden: false, matchedPattern: null };
}

export function getL13ForbiddenNamePatterns(): readonly RegExp[] {
  return FORBIDDEN_NAME_PATTERNS;
}

export function getL13ValidNameExamples(): readonly string[] {
  return VALID_NAME_EXAMPLES;
}
