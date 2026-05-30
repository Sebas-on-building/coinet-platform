/**
 * L13.7 — Chat Answer Output Contract
 *
 * §13.7.10 — Chat is the default conversational mode. Must answer
 * the actual question, respect user intent, stay concise unless
 * deep mode is requested, preserve contradiction and uncertainty,
 * surface triggers/invalidations for WHAT_NEXT, and avoid raw
 * metric dumps unless requested.
 */

import { L13ProductAnswerMode } from './product-answer-mode';
import type { L13UserIntentClass } from './user-intent-binding';

export type L13ChatAnswerMode =
  | L13ProductAnswerMode.SHORT_CHAT
  | L13ProductAnswerMode.STANDARD_CHAT
  | L13ProductAnswerMode.DEEP_ANALYSIS;

/**
 * §13.7.10.3 — Chat completeness taxonomy.
 */
export enum L13ChatAnswerCompletenessClass {
  DIRECTLY_ANSWERS_REQUEST = 'DIRECTLY_ANSWERS_REQUEST',
  DIRECT_ANSWER_WITH_DISCLOSURE = 'DIRECT_ANSWER_WITH_DISCLOSURE',
  PARTIAL_ANSWER_DUE_TO_CONTEXT = 'PARTIAL_ANSWER_DUE_TO_CONTEXT',
  PARTIAL_ANSWER_DUE_TO_RESTRICTION = 'PARTIAL_ANSWER_DUE_TO_RESTRICTION',
  REFUSAL_SHAPE_REQUIRED = 'REFUSAL_SHAPE_REQUIRED',
  BLOCKED = 'BLOCKED',
}

export const ALL_L13_CHAT_ANSWER_COMPLETENESS_CLASSES:
  readonly L13ChatAnswerCompletenessClass[] =
  Object.values(L13ChatAnswerCompletenessClass);

export interface L13ChatAnswerOutput {
  readonly chat_answer_id: string;

  readonly output_id: string;
  readonly input_package_id: string;

  readonly answer_mode: L13ChatAnswerMode;
  readonly intent_class: L13UserIntentClass;

  readonly direct_answer: string;
  readonly supporting_explanation: readonly string[];
  readonly key_observations: readonly string[];
  readonly key_inferences: readonly string[];
  readonly uncertainty_lines: readonly string[];
  readonly contradiction_lines: readonly string[];
  readonly scenario_watchpoints: readonly string[];
  readonly trigger_lines: readonly string[];
  readonly invalidation_lines: readonly string[];
  readonly score_explanation_lines: readonly string[];
  readonly hypothesis_explanation_lines: readonly string[];

  readonly raw_metrics_included: boolean;
  readonly raw_metric_refs: readonly string[];
  readonly raw_metric_disclosure_reason?: string;

  readonly answer_completeness_class:
    L13ChatAnswerCompletenessClass;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
