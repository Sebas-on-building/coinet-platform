/**
 * L13.2 — User Intent Binding Contract
 *
 * §13.2.17 — L13.2 must not ignore user intent. The input package
 * knows why it is being built, which determines required summaries
 * and answer modes.
 */

import {
  L13AnswerMode,
  L13BlockedAnswerMode,
} from './explanation-restriction-profile';

/**
 * §13.2.17 — Canonical intent classes used to drive
 * required-summary selection and answer-mode policy.
 */
export enum L13UserIntentClass {
  WHATS_HAPPENING = 'WHATS_HAPPENING',
  WHATS_NEXT = 'WHATS_NEXT',
  WHY_IS_THIS_MOVING = 'WHY_IS_THIS_MOVING',
  EXPLAIN_SCORE = 'EXPLAIN_SCORE',
  EXPLAIN_SCENARIO = 'EXPLAIN_SCENARIO',
  EXPLAIN_HYPOTHESIS = 'EXPLAIN_HYPOTHESIS',
  EXPLAIN_REGIME = 'EXPLAIN_REGIME',
  EXPLAIN_SEQUENCE = 'EXPLAIN_SEQUENCE',
  COMPARE_ASSETS = 'COMPARE_ASSETS',
  COMPARE_THESES = 'COMPARE_THESES',
  WRITE_ALERT = 'WRITE_ALERT',
  WRITE_REPORT = 'WRITE_REPORT',
  CONTRADICTION_INSIGHT = 'CONTRADICTION_INSIGHT',
  /** Adversarial intents that L13.2 must rewrite or refuse. */
  REQUESTS_TRADE_ADVICE = 'REQUESTS_TRADE_ADVICE',
  REQUESTS_CERTAINTY = 'REQUESTS_CERTAINTY',
  REQUESTS_BULLISH_BEARISH_ONLY = 'REQUESTS_BULLISH_BEARISH_ONLY',
}

export const ALL_L13_USER_INTENT_CLASSES:
  readonly L13UserIntentClass[] = Object.values(L13UserIntentClass);

export interface L13UserIntentBinding {
  readonly user_intent_ref: string;

  readonly intent_class: L13UserIntentClass;
  readonly requested_answer_mode: L13AnswerMode;

  readonly requires_scenario_context: boolean;
  readonly requires_score_context: boolean;
  readonly requires_hypothesis_context: boolean;
  readonly requires_contradiction_context: boolean;
  readonly requires_comparison_context: boolean;

  readonly allowed_answer_modes: readonly L13AnswerMode[];
  readonly blocked_answer_modes: readonly L13BlockedAnswerMode[];

  readonly policy_version: string;
}

export interface L13IntentRequirements {
  readonly requires_scenario_context: boolean;
  readonly requires_score_context: boolean;
  readonly requires_hypothesis_context: boolean;
  readonly requires_contradiction_context: boolean;
  readonly requires_comparison_context: boolean;
}

const REQS: Record<L13UserIntentClass, L13IntentRequirements> = {
  [L13UserIntentClass.WHATS_HAPPENING]: {
    requires_scenario_context: true,
    requires_score_context: true,
    requires_hypothesis_context: true,
    requires_contradiction_context: true,
    requires_comparison_context: false,
  },
  [L13UserIntentClass.WHATS_NEXT]: {
    requires_scenario_context: true,
    requires_score_context: false,
    requires_hypothesis_context: false,
    requires_contradiction_context: true,
    requires_comparison_context: false,
  },
  [L13UserIntentClass.WHY_IS_THIS_MOVING]: {
    requires_scenario_context: false,
    requires_score_context: true,
    requires_hypothesis_context: true,
    requires_contradiction_context: true,
    requires_comparison_context: false,
  },
  [L13UserIntentClass.EXPLAIN_SCORE]: {
    requires_scenario_context: false,
    requires_score_context: true,
    requires_hypothesis_context: false,
    requires_contradiction_context: false,
    requires_comparison_context: false,
  },
  [L13UserIntentClass.EXPLAIN_SCENARIO]: {
    requires_scenario_context: true,
    requires_score_context: false,
    requires_hypothesis_context: false,
    requires_contradiction_context: true,
    requires_comparison_context: false,
  },
  [L13UserIntentClass.EXPLAIN_HYPOTHESIS]: {
    requires_scenario_context: false,
    requires_score_context: false,
    requires_hypothesis_context: true,
    requires_contradiction_context: true,
    requires_comparison_context: false,
  },
  [L13UserIntentClass.EXPLAIN_REGIME]: {
    requires_scenario_context: false,
    requires_score_context: false,
    requires_hypothesis_context: false,
    requires_contradiction_context: false,
    requires_comparison_context: false,
  },
  [L13UserIntentClass.EXPLAIN_SEQUENCE]: {
    requires_scenario_context: false,
    requires_score_context: false,
    requires_hypothesis_context: false,
    requires_contradiction_context: false,
    requires_comparison_context: false,
  },
  [L13UserIntentClass.COMPARE_ASSETS]: {
    requires_scenario_context: true,
    requires_score_context: true,
    requires_hypothesis_context: true,
    requires_contradiction_context: true,
    requires_comparison_context: true,
  },
  [L13UserIntentClass.COMPARE_THESES]: {
    requires_scenario_context: true,
    requires_score_context: false,
    requires_hypothesis_context: true,
    requires_contradiction_context: true,
    requires_comparison_context: true,
  },
  [L13UserIntentClass.WRITE_ALERT]: {
    requires_scenario_context: true,
    requires_score_context: true,
    requires_hypothesis_context: false,
    requires_contradiction_context: true,
    requires_comparison_context: false,
  },
  [L13UserIntentClass.WRITE_REPORT]: {
    requires_scenario_context: true,
    requires_score_context: true,
    requires_hypothesis_context: true,
    requires_contradiction_context: true,
    requires_comparison_context: false,
  },
  [L13UserIntentClass.CONTRADICTION_INSIGHT]: {
    requires_scenario_context: false,
    requires_score_context: false,
    requires_hypothesis_context: false,
    requires_contradiction_context: true,
    requires_comparison_context: false,
  },
  [L13UserIntentClass.REQUESTS_TRADE_ADVICE]: {
    requires_scenario_context: true,
    requires_score_context: false,
    requires_hypothesis_context: false,
    requires_contradiction_context: true,
    requires_comparison_context: false,
  },
  [L13UserIntentClass.REQUESTS_CERTAINTY]: {
    requires_scenario_context: true,
    requires_score_context: false,
    requires_hypothesis_context: false,
    requires_contradiction_context: true,
    requires_comparison_context: false,
  },
  [L13UserIntentClass.REQUESTS_BULLISH_BEARISH_ONLY]: {
    requires_scenario_context: true,
    requires_score_context: false,
    requires_hypothesis_context: false,
    requires_contradiction_context: true,
    requires_comparison_context: false,
  },
};

export function getL13IntentRequirements(
  intent: L13UserIntentClass,
): L13IntentRequirements {
  return REQS[intent];
}

/**
 * §13.2.17 — Adversarial intents that L13.2 must always rewrite,
 * refuse, or convert into governed conditional explanations. They
 * trigger forced uncertainty disclosure and conditional answer
 * mode selection.
 */
export const L13_ADVERSARIAL_INTENT_CLASSES:
  readonly L13UserIntentClass[] = [
  L13UserIntentClass.REQUESTS_TRADE_ADVICE,
  L13UserIntentClass.REQUESTS_CERTAINTY,
  L13UserIntentClass.REQUESTS_BULLISH_BEARISH_ONLY,
];

export function isL13AdversarialIntent(
  intent: L13UserIntentClass,
): boolean {
  return L13_ADVERSARIAL_INTENT_CLASSES.includes(intent);
}
