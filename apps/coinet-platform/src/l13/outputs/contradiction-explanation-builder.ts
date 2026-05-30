/**
 * L13.7 — Contradiction Explanation Builder
 *
 * §13.7.17 — First-class mode payload. References L7
 * contradictions and the affected L10 hypothesis / L12 scenario
 * refs.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import type { L13ExpressionGovernanceResult } from '../restrictions/expression-governance-engine';
import type { L13ContradictionExplanationOutput } from '../contracts/contradiction-explanation-output';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.outputs.v1';

export interface L13ContradictionExplanationBuilderInput {
  readonly output: L13AIExplanationOutput;
  readonly input_package: L13AIInputPackage;
  readonly grounding_result: L13ClaimGroundingResult;
  readonly expression: L13ExpressionGovernanceResult;
  readonly affected_l10_hypothesis_refs?: readonly string[];
  readonly affected_l12_scenario_refs?: readonly string[];
  readonly possible_resolution_lines?: readonly string[];
  readonly escalation_lines?: readonly string[];
}

export function buildL13ContradictionExplanation(
  args: L13ContradictionExplanationBuilderInput,
): L13ContradictionExplanationOutput {
  const { output, input_package } = args;
  const primaryRefs =
    input_package.contradiction_summary.active_contradiction_refs;
  const supportingL7 = primaryRefs.length > 0
    ? primaryRefs
    : ['l7.contradiction.pending'];

  const affectedHypothesisRefs =
    args.affected_l10_hypothesis_refs &&
    args.affected_l10_hypothesis_refs.length > 0
      ? args.affected_l10_hypothesis_refs
      : ['l10.hypothesis.primary'];
  const affectedScenarioRefs =
    args.affected_l12_scenario_refs &&
    args.affected_l12_scenario_refs.length > 0
      ? args.affected_l12_scenario_refs
      : ['l12.scenario.base.1'];

  const summaryLine =
    output.contradiction_section?.present &&
    output.contradiction_section.content.trim().length > 0
      ? output.contradiction_section.content
      : 'Active contradiction is present under governed L7 refs.';

  const whatItWeakens = [
    `Weakens supporting hypotheses under governed L10 refs (${affectedHypothesisRefs.join(', ')}).`,
    `Narrows the current scenario path under governed L12 refs (${affectedScenarioRefs.join(', ')}).`,
  ];
  const confidenceImpact = [
    `Confidence ceiling narrows to ${args.expression.envelope.final_confidence_ceiling}.`,
  ];
  const restrictionImpact = [
    output.restriction_disclosure.restriction_statement,
  ];
  const resolutions =
    args.possible_resolution_lines ?? [
      'Contradiction may resolve if the conflicting signal subsides under governed refs.',
    ];
  const escalations =
    args.escalation_lines ?? [
      'Contradiction would escalate if the conflicting signal expands further or its supporting evidence strengthens.',
    ];

  const replayHash = fnv1a(
    [
      output.output_id,
      input_package.input_package_id,
      args.grounding_result.grounding_result_id,
      args.expression.envelope.expression_governance_id,
      primaryRefs.slice().sort().join(','),
      supportingL7.slice().sort().join(','),
      affectedHypothesisRefs.slice().sort().join(','),
      affectedScenarioRefs.slice().sort().join(','),
      summaryLine,
      whatItWeakens.join('|'),
      confidenceImpact.join('|'),
      restrictionImpact.join('|'),
      resolutions.join('|'),
      escalations.join('|'),
      POLICY_V,
    ].join('|'),
  );

  return {
    contradiction_explanation_id: `l13.contradiction.${replayHash}`,
    output_id: output.output_id,
    input_package_id: input_package.input_package_id,
    primary_contradiction_refs: primaryRefs,
    supporting_l7_refs: supportingL7,
    affected_l10_hypothesis_refs: affectedHypothesisRefs,
    affected_l12_scenario_refs: affectedScenarioRefs,
    contradiction_summary_line: summaryLine,
    what_it_weakens_lines: whatItWeakens,
    confidence_impact_lines: confidenceImpact,
    restriction_impact_lines: restrictionImpact,
    possible_resolution_lines: resolutions,
    escalation_lines: escalations,
    contradiction_minimized_detected: false,
    evidence_refs: input_package.evidence_refs,
    lineage_refs:
      input_package.lineage_refs.length > 0
        ? input_package.lineage_refs
        : ['l13.outputs.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
