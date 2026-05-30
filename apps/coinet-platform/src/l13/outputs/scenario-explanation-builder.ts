/**
 * L13.7 — Scenario Explanation Builder
 *
 * §13.7.15 — Specializes the L13.3 output for scenario
 * explanations. Pulls base case, alternatives, triggers,
 * invalidations, confidence caps, scenario spread, readiness, and
 * restrictions from the governed L12 surfaces carried on the
 * input package + L13.3 output. Conditionality is hard-pinned
 * to `true`.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import type { L13ExpressionGovernanceResult } from '../restrictions/expression-governance-engine';
import type { L13ScenarioExplanationOutput } from '../contracts/scenario-explanation-output';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.outputs.v1';

export interface L13ScenarioExplanationBuilderInput {
  readonly output: L13AIExplanationOutput;
  readonly input_package: L13AIInputPackage;
  readonly grounding_result: L13ClaimGroundingResult;
  readonly expression: L13ExpressionGovernanceResult;
  readonly scenario_set_ref?: string;
}

function splitLines(text?: string): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export function buildL13ScenarioExplanation(
  args: L13ScenarioExplanationBuilderInput,
): L13ScenarioExplanationOutput {
  const { output, input_package } = args;
  const scenarioLines = splitLines(output.scenario_section?.content);
  const triggerInvLines = splitLines(
    output.trigger_invalidation_section?.content,
  );
  const baseCase =
    scenarioLines.find(s => /base case/i.test(s)) ??
    scenarioLines[0] ??
    'Base case derived from governed L12 scenario context.';
  const alternativeLines = scenarioLines.filter(
    s => /alternative|bear|bull|chop/i.test(s),
  );
  const bullishLines = scenarioLines.filter(s => /bull/i.test(s));
  const bearishLines = scenarioLines.filter(
    s => /bear|failure|invalidat/i.test(s),
  );
  const neutralLines = scenarioLines.filter(s => /chop|neutral/i.test(s));
  const triggerLines = triggerInvLines.filter(
    s => /trigger|confirmation/i.test(s),
  );
  const invalidationLines = triggerInvLines.filter(
    s => /invalidat|failure/i.test(s),
  );

  const replayHash = fnv1a(
    [
      output.output_id,
      input_package.input_package_id,
      args.grounding_result.grounding_result_id,
      args.expression.envelope.expression_governance_id,
      args.scenario_set_ref ?? 'l12.scenario.base.1',
      baseCase,
      alternativeLines.join('|'),
      triggerLines.join('|'),
      invalidationLines.join('|'),
      POLICY_V,
    ].join('|'),
  );

  return {
    scenario_explanation_id: `l13.scn.${replayHash}`,
    output_id: output.output_id,
    input_package_id: input_package.input_package_id,
    scenario_set_ref:
      args.scenario_set_ref ?? 'l12.scenario.base.1',
    base_case_line: baseCase,
    alternative_path_lines: alternativeLines,
    bullish_path_lines: bullishLines,
    bearish_failure_path_lines: bearishLines,
    neutral_or_chop_path_lines: neutralLines,
    trigger_lines: triggerLines,
    invalidation_lines: invalidationLines,
    path_confidence_line: `Path confidence inherits the governed L12 posture; ceiling=${args.expression.envelope.final_confidence_ceiling}.`,
    confidence_cap_lines: [
      'The current path is confidence-capped per governed L11/L12 refs.',
    ],
    scenario_spread_line:
      'Scenario spread remains open; the engine preserves alternatives.',
    readiness_line: `Readiness: ${args.expression.envelope.final_expression_readiness}.`,
    restriction_line:
      output.restriction_disclosure.restriction_statement,
    scenario_conditionality_preserved: true,
    evidence_refs: input_package.evidence_refs,
    lineage_refs:
      input_package.lineage_refs.length > 0
        ? input_package.lineage_refs
        : ['l13.outputs.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
