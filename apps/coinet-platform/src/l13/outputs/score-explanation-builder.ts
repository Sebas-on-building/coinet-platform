/**
 * L13.7 — Score Explanation Builder
 *
 * §13.7.16 — Specializes the L13.3 output for score explanations.
 * Uses the L11 score context carried in the L13.2 input package.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import type { L13ExpressionGovernanceResult } from '../restrictions/expression-governance-engine';
import type { L13ScoreExplanationOutput } from '../contracts/score-explanation-output';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.outputs.v1';

export interface L13ScoreExplanationBuilderInput {
  readonly output: L13AIExplanationOutput;
  readonly input_package: L13AIInputPackage;
  readonly grounding_result: L13ClaimGroundingResult;
  readonly expression: L13ExpressionGovernanceResult;
  readonly score_ref?: string;
  readonly score_family?: string;
  readonly score_name?: string;
  readonly score_band?: string;
  readonly top_positive_drivers?: readonly string[];
  readonly top_negative_drivers?: readonly string[];
  readonly cap_penalty_lines?: readonly string[];
}

export function buildL13ScoreExplanation(
  args: L13ScoreExplanationBuilderInput,
): L13ScoreExplanationOutput {
  const { output, input_package } = args;
  const profile = input_package.uncertainty_profile;
  const scoreRef =
    args.score_ref ?? input_package.score_summary.score_summary_id;
  const scoreName = args.score_name ?? 'Opportunity Score';
  const scoreFamily = args.score_family ?? 'L11_OPPORTUNITY';
  const scoreBand = args.score_band ?? 'MEDIUM';
  const topPositives =
    args.top_positive_drivers && args.top_positive_drivers.length > 0
      ? args.top_positive_drivers
      : [
          'Scenario clarity contributes positively under governed L12 refs.',
          'Hypothesis support is constructive under governed L10 refs.',
        ];
  const topNegatives =
    args.top_negative_drivers && args.top_negative_drivers.length > 0
      ? args.top_negative_drivers
      : [
          'Invalidation pressure remains active under governed L12 refs.',
          'Missing visibility narrows clean interpretation.',
        ];
  const caps =
    args.cap_penalty_lines && args.cap_penalty_lines.length > 0
      ? args.cap_penalty_lines
      : ['The score is confidence-capped under governed L11 refs.'];

  const missingLines = profile.material_missing_data_present
    ? [
        'Missing visibility under governed L11/L12 refs narrows interpretation.',
      ]
    : [];
  const driftLines = profile.material_drift_present
    ? ['Drift in the relevant score context narrows interpretation.']
    : [];

  const replayHash = fnv1a(
    [
      output.output_id,
      input_package.input_package_id,
      args.grounding_result.grounding_result_id,
      args.expression.envelope.expression_governance_id,
      scoreRef,
      scoreFamily,
      scoreName,
      scoreBand,
      topPositives.join('|'),
      topNegatives.join('|'),
      caps.join('|'),
      missingLines.join('|'),
      driftLines.join('|'),
      POLICY_V,
    ].join('|'),
  );

  return {
    score_explanation_id: `l13.score.${replayHash}`,
    output_id: output.output_id,
    input_package_id: input_package.input_package_id,
    score_ref: scoreRef,
    score_family: scoreFamily,
    score_name: scoreName,
    score_band: scoreBand,
    score_meaning_line: `${scoreName} reports governed posture under L11 refs.`,
    score_interpretation_line:
      'Interpretation is governed by L11 attribution and is not a trade recommendation.',
    top_positive_driver_lines: topPositives,
    top_negative_driver_lines: topNegatives,
    cap_penalty_lines: caps,
    missing_data_lines: missingLines,
    drift_lines: driftLines,
    restriction_line: output.restriction_disclosure.restriction_statement,
    score_as_recommendation_detected: false,
    evidence_refs: input_package.evidence_refs,
    lineage_refs:
      input_package.lineage_refs.length > 0
        ? input_package.lineage_refs
        : ['l13.outputs.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
