/**
 * L13.7 — Thesis Comparison Builder
 *
 * §13.7.14 — Compares two explanations under governed refs. Must
 * preserve uncertainty and contradiction; may not produce
 * finality language.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import type { L13ExpressionGovernanceResult } from '../restrictions/expression-governance-engine';
import {
  L13ThesisComparisonReadinessClass,
  type L13ThesisComparisonOutput,
} from '../contracts/thesis-comparison-output';
import { L13ExpressionReadinessClass } from '../contracts/expression-governance-envelope';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.outputs.v1';

export interface L13ThesisComparisonBuilderInput {
  readonly output: L13AIExplanationOutput;
  readonly input_package: L13AIInputPackage;
  readonly grounding_result: L13ClaimGroundingResult;
  readonly expression: L13ExpressionGovernanceResult;
  readonly thesis_left_ref: string;
  readonly thesis_right_ref: string;
  readonly left_thesis_name: string;
  readonly right_thesis_name: string;
  readonly hypothesis_spread_ref?: string;
}

function deriveReadiness(
  expression: L13ExpressionGovernanceResult,
  uncertaintyPresent: boolean,
): L13ThesisComparisonReadinessClass {
  const r = expression.envelope.final_expression_readiness;
  if (r === L13ExpressionReadinessClass.EXPRESSION_BLOCKED) {
    return L13ThesisComparisonReadinessClass.THESIS_COMPARISON_BLOCKED;
  }
  if (r === L13ExpressionReadinessClass.EXPRESSION_REWRITE_REQUIRED) {
    return L13ThesisComparisonReadinessClass.THESIS_COMPARISON_INCOMPLETE;
  }
  if (uncertaintyPresent) {
    return L13ThesisComparisonReadinessClass.THESIS_COMPARISON_NARROWED_BY_UNCERTAINTY;
  }
  if (
    r === L13ExpressionReadinessClass.EXPRESSION_CLEAN_WITH_DISCLOSURE
  ) {
    return L13ThesisComparisonReadinessClass.THESIS_COMPARISON_READY_WITH_DISCLOSURE;
  }
  return L13ThesisComparisonReadinessClass.THESIS_COMPARISON_READY;
}

export function buildL13ThesisComparison(
  args: L13ThesisComparisonBuilderInput,
): L13ThesisComparisonOutput {
  const { output, input_package } = args;
  const uncertaintyPresent =
    input_package.uncertainty_profile.must_disclose_uncertainty ||
    input_package.uncertainty_profile.active_contradiction_present;
  const readiness = deriveReadiness(args.expression, uncertaintyPresent);

  const replayHash = fnv1a(
    [
      output.output_id,
      input_package.input_package_id,
      args.thesis_left_ref,
      args.thesis_right_ref,
      args.left_thesis_name,
      args.right_thesis_name,
      args.hypothesis_spread_ref ?? '',
      readiness,
      POLICY_V,
    ].join('|'),
  );

  const stronger =
    !uncertaintyPresent &&
    readiness ===
      L13ThesisComparisonReadinessClass.THESIS_COMPARISON_READY
      ? `${args.left_thesis_name} is currently the stronger explanation, but the alternative remains relevant because confirmation gaps and invalidation pressure have not fully cleared.`
      : undefined;

  return {
    thesis_comparison_id: `l13.thesiscmp.${replayHash}`,
    output_id: output.output_id,
    input_package_id: input_package.input_package_id,
    thesis_left_ref: args.thesis_left_ref,
    thesis_right_ref: args.thesis_right_ref,
    left_thesis_name: args.left_thesis_name,
    right_thesis_name: args.right_thesis_name,
    support_comparison:
      'Support for each thesis contrasted under governed L10 refs.',
    contradiction_comparison:
      'Contradiction pressure on each thesis contrasted under governed L7 refs.',
    confirmation_gap_comparison:
      'Confirmation gaps contrasted; alternatives remain preserved.',
    invalidation_risk_comparison:
      'Invalidation risk contrasted; neither thesis declared final.',
    scenario_implication_comparison:
      'Scenario implications contrasted under governed L12 refs.',
    shift_condition_comparison:
      'Conditions that would shift one thesis above the other are listed under governed refs.',
    hypothesis_spread_ref:
      args.hypothesis_spread_ref ?? 'l10.hypothesis.spread',
    thesis_comparison_readiness: readiness,
    stronger_current_explanation_line: stronger,
    preserved_alternative_line:
      uncertaintyPresent || stronger
        ? `${args.right_thesis_name} remains a preserved alternative pending further confirmation.`
        : undefined,
    forbidden_finality_detected: false,
    evidence_refs: input_package.evidence_refs,
    lineage_refs:
      input_package.lineage_refs.length > 0
        ? input_package.lineage_refs
        : ['l13.outputs.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
