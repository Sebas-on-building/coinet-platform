/**
 * L13.7 — Chat Answer Builder
 *
 * §13.7.10 — Builds the `L13ChatAnswerOutput` payload from an
 * L13.3 output, the L13.2 input package, the L13.4 grounding
 * result, and the L13.5 expression governance result.
 *
 * Builder law (§13.7.20):
 *  - consume only governed L13 artifacts; never raw lower-layer
 *  - never invent missing content
 *  - never silently downgrade disclosures
 *  - emit lineage refs and a deterministic replay hash
 *
 * Intent-specific behavior (§13.7.10.4):
 *  - WHATS_NEXT must surface scenario base case, alternatives,
 *    triggers, invalidations, confidence/readiness posture, and
 *    uncertainty
 *  - WHY_IS_THIS_MOVING / WHATS_HAPPENING must carry observations,
 *    inferences, contradiction, uncertainty
 *  - EXPLAIN_SCORE must surface score interpretation context
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import type { L13ExpressionGovernanceResult } from '../restrictions/expression-governance-engine';
import {
  L13ChatAnswerCompletenessClass,
  type L13ChatAnswerMode,
  type L13ChatAnswerOutput,
} from '../contracts/chat-answer-output';
import { L13ExpressionReadinessClass } from '../contracts/expression-governance-envelope';
import { L13UserIntentClass } from '../contracts/user-intent-binding';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.outputs.v1';

export interface L13ChatAnswerBuilderInput {
  readonly output: L13AIExplanationOutput;
  readonly input_package: L13AIInputPackage;
  readonly grounding_result: L13ClaimGroundingResult;
  readonly expression: L13ExpressionGovernanceResult;
  readonly intent_class: L13UserIntentClass;
  readonly answer_mode: L13ChatAnswerMode;
  /**
   * True iff the user explicitly asked for raw numeric metrics in
   * the same turn. Controls whether raw_metric_refs may be
   * non-empty for modes whose raw-metric policy is
   * `ALLOWED_ONLY_WHEN_USER_REQUESTS`.
   */
  readonly user_requested_raw_metrics?: boolean;
}

function splitLines(text: string): readonly string[] {
  if (!text || text.trim().length === 0) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function deriveCompleteness(
  args: L13ChatAnswerBuilderInput,
  hasDirectAnswer: boolean,
): L13ChatAnswerCompletenessClass {
  const readiness = args.expression.envelope.final_expression_readiness;
  if (readiness === L13ExpressionReadinessClass.EXPRESSION_BLOCKED) {
    return L13ChatAnswerCompletenessClass.BLOCKED;
  }
  if (
    readiness === L13ExpressionReadinessClass.EXPRESSION_REFUSAL_REQUIRED
  ) {
    return L13ChatAnswerCompletenessClass.REFUSAL_SHAPE_REQUIRED;
  }
  if (
    readiness === L13ExpressionReadinessClass.EXPRESSION_REWRITE_REQUIRED
  ) {
    return L13ChatAnswerCompletenessClass.PARTIAL_ANSWER_DUE_TO_CONTEXT;
  }
  if (
    readiness ===
    L13ExpressionReadinessClass.EXPRESSION_NARROWED_BY_RESTRICTION
  ) {
    return L13ChatAnswerCompletenessClass.PARTIAL_ANSWER_DUE_TO_RESTRICTION;
  }
  if (
    readiness ===
    L13ExpressionReadinessClass.EXPRESSION_NARROWED_BY_UNCERTAINTY
  ) {
    return L13ChatAnswerCompletenessClass.DIRECT_ANSWER_WITH_DISCLOSURE;
  }
  if (
    readiness ===
    L13ExpressionReadinessClass.EXPRESSION_CLEAN_WITH_DISCLOSURE
  ) {
    return L13ChatAnswerCompletenessClass.DIRECT_ANSWER_WITH_DISCLOSURE;
  }
  if (!hasDirectAnswer) {
    return L13ChatAnswerCompletenessClass.PARTIAL_ANSWER_DUE_TO_CONTEXT;
  }
  return L13ChatAnswerCompletenessClass.DIRECTLY_ANSWERS_REQUEST;
}

/**
 * §13.7.10 — Build the chat answer payload.
 */
export function buildL13ChatAnswer(
  args: L13ChatAnswerBuilderInput,
): L13ChatAnswerOutput {
  const { output, input_package, intent_class, answer_mode } = args;
  const direct_answer = output.summary && output.summary.trim().length > 0
    ? output.summary
    : output.headline;
  const supporting = splitLines(output.summary).slice(0, 6);
  const observations = splitLines(
    output.observation_section?.content ?? '',
  );
  const inferences = splitLines(output.inference_section?.content ?? '');
  const uncertaintyLines = splitLines(
    output.uncertainty_section?.content ?? '',
  );
  const contradictionLines = output.contradiction_section?.present
    ? splitLines(output.contradiction_section.content)
    : [];
  const scenarioLines = output.scenario_section?.present
    ? splitLines(output.scenario_section.content)
    : [];
  const triggerInvalidationLines = output.trigger_invalidation_section
    ?.present
    ? splitLines(output.trigger_invalidation_section.content)
    : [];

  // Intent-driven watchpoints / triggers / invalidations.
  const isWhatNext = intent_class === L13UserIntentClass.WHATS_NEXT;
  const isWhyMoving =
    intent_class === L13UserIntentClass.WHY_IS_THIS_MOVING;
  const isScoreExplanation =
    intent_class === L13UserIntentClass.EXPLAIN_SCORE;

  const triggerLines = isWhatNext
    ? triggerInvalidationLines.filter(
        l => /trigger/i.test(l) || /confirmation/i.test(l),
      )
    : triggerInvalidationLines;
  const invalidationLines = isWhatNext
    ? triggerInvalidationLines.filter(
        l => /invalidat/i.test(l) || /failure/i.test(l),
      )
    : [];
  const scenarioWatchpoints = isWhatNext ? scenarioLines.slice(0, 4) : [];

  const scoreExplanationLines = isScoreExplanation
    ? splitLines(output.summary)
    : [];
  const hypothesisExplanationLines =
    intent_class === L13UserIntentClass.EXPLAIN_HYPOTHESIS ||
    isWhyMoving
      ? splitLines(output.summary)
      : [];

  const rawRequested = !!args.user_requested_raw_metrics;
  const raw_metric_refs = rawRequested
    ? input_package.evidence_refs.slice(0, 5)
    : [];
  const raw_metric_disclosure_reason = rawRequested
    ? 'User explicitly requested detailed metrics in this turn.'
    : undefined;

  const completeness = deriveCompleteness(
    args,
    direct_answer.trim().length > 0,
  );

  const evidence_refs = input_package.evidence_refs;
  const lineage_refs = input_package.lineage_refs.length > 0
    ? input_package.lineage_refs
    : ['l13.outputs.lineage'];

  const replayHash = fnv1a(
    [
      output.output_id,
      input_package.input_package_id,
      args.grounding_result.grounding_result_id,
      args.expression.envelope.expression_governance_id,
      intent_class,
      answer_mode,
      direct_answer,
      supporting.join('|'),
      observations.join('|'),
      inferences.join('|'),
      uncertaintyLines.join('|'),
      contradictionLines.join('|'),
      scenarioWatchpoints.join('|'),
      triggerLines.join('|'),
      invalidationLines.join('|'),
      scoreExplanationLines.join('|'),
      hypothesisExplanationLines.join('|'),
      String(rawRequested),
      raw_metric_refs.join(','),
      completeness,
      POLICY_V,
    ].join('|'),
  );

  return {
    chat_answer_id: `l13.chat.${replayHash}`,
    output_id: output.output_id,
    input_package_id: input_package.input_package_id,
    answer_mode,
    intent_class,
    direct_answer,
    supporting_explanation: supporting,
    key_observations: observations,
    key_inferences: inferences,
    uncertainty_lines: uncertaintyLines,
    contradiction_lines: contradictionLines,
    scenario_watchpoints: scenarioWatchpoints,
    trigger_lines: triggerLines,
    invalidation_lines: invalidationLines,
    score_explanation_lines: scoreExplanationLines,
    hypothesis_explanation_lines: hypothesisExplanationLines,
    raw_metrics_included: rawRequested && raw_metric_refs.length > 0,
    raw_metric_refs,
    raw_metric_disclosure_reason,
    answer_completeness_class: completeness,
    evidence_refs,
    lineage_refs,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
