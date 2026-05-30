/**
 * L13.7 — Alert Builder
 *
 * §13.7.11 — Constructs an `L13AlertOutput` from the L13.3 output,
 * L13.2 input package, L13.4 grounding result, and L13.5
 * expression governance result. Caller supplies the alert class
 * and severity from upstream change-detection (L8/L9/L10/L11/L12).
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import type { L13ExpressionGovernanceResult } from '../restrictions/expression-governance-engine';
import {
  L13AlertClass,
  L13AlertSeverity,
  type L13AlertConfidenceChangeProfile,
  type L13AlertOutput,
  type L13AlertReadinessChangeProfile,
} from '../contracts/alert-output';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.outputs.v1';

export interface L13AlertBuilderInput {
  readonly output: L13AIExplanationOutput;
  readonly input_package: L13AIInputPackage;
  readonly grounding_result: L13ClaimGroundingResult;
  readonly expression: L13ExpressionGovernanceResult;

  readonly alert_class: L13AlertClass;
  readonly alert_severity: L13AlertSeverity;

  readonly changed_subject_ref: string;
  readonly previous_state_ref?: string;
  readonly current_state_ref: string;
  readonly what_changed: string;
  readonly why_it_matters: string;

  readonly affected_scenario_refs?: readonly string[];
  readonly affected_hypothesis_refs?: readonly string[];
  readonly affected_score_refs?: readonly string[];
  readonly activated_trigger_refs?: readonly string[];
  readonly activated_invalidation_refs?: readonly string[];

  readonly confidence_change: L13AlertConfidenceChangeProfile;
  readonly readiness_change: L13AlertReadinessChangeProfile;
}

export function buildL13Alert(
  args: L13AlertBuilderInput,
): L13AlertOutput {
  const watchNext = (() => {
    const lines: string[] = [];
    if (args.output.trigger_invalidation_section?.present) {
      const text =
        args.output.trigger_invalidation_section.content;
      for (const sentence of text.split(/(?<=[.!?])\s+/)) {
        const s = sentence.trim();
        if (s) lines.push(s);
      }
    }
    if (lines.length === 0 && args.output.scenario_section?.present) {
      lines.push(args.output.scenario_section.content);
    }
    return lines.slice(0, 4);
  })();

  const restrictionLines = args.output.restriction_disclosure
    ?.restriction_statement
    ? [args.output.restriction_disclosure.restriction_statement]
    : [];

  const uncertaintyLines = (() => {
    const lines: string[] = [];
    if (args.output.uncertainty_section?.present) {
      const text = args.output.uncertainty_section.content;
      for (const sentence of text.split(/(?<=[.!?])\s+/)) {
        const s = sentence.trim();
        if (s) lines.push(s);
      }
    }
    return lines.slice(0, 3);
  })();

  const replayHash = fnv1a(
    [
      args.output.output_id,
      args.input_package.input_package_id,
      args.grounding_result.grounding_result_id,
      args.expression.envelope.expression_governance_id,
      args.alert_class,
      args.alert_severity,
      args.changed_subject_ref,
      args.previous_state_ref ?? '',
      args.current_state_ref,
      args.what_changed,
      args.why_it_matters,
      (args.affected_scenario_refs ?? []).slice().sort().join(','),
      (args.affected_hypothesis_refs ?? []).slice().sort().join(','),
      (args.affected_score_refs ?? []).slice().sort().join(','),
      (args.activated_trigger_refs ?? []).slice().sort().join(','),
      (args.activated_invalidation_refs ?? []).slice().sort().join(','),
      args.confidence_change.direction,
      args.confidence_change.statement,
      args.readiness_change.direction,
      args.readiness_change.statement,
      watchNext.join('|'),
      restrictionLines.join('|'),
      uncertaintyLines.join('|'),
      POLICY_V,
    ].join('|'),
  );

  return {
    alert_output_id: `l13.alert.${replayHash}`,
    output_id: args.output.output_id,
    input_package_id: args.input_package.input_package_id,
    alert_class: args.alert_class,
    alert_severity: args.alert_severity,
    changed_subject_ref: args.changed_subject_ref,
    previous_state_ref: args.previous_state_ref,
    current_state_ref: args.current_state_ref,
    what_changed: args.what_changed,
    why_it_matters: args.why_it_matters,
    affected_scenario_refs: args.affected_scenario_refs ?? [],
    affected_hypothesis_refs: args.affected_hypothesis_refs ?? [],
    affected_score_refs: args.affected_score_refs ?? [],
    activated_trigger_refs: args.activated_trigger_refs ?? [],
    activated_invalidation_refs:
      args.activated_invalidation_refs ?? [],
    confidence_change_profile: args.confidence_change,
    readiness_change_profile: args.readiness_change,
    watch_next_lines: watchNext,
    restriction_disclosure_lines: restrictionLines,
    uncertainty_disclosure_lines: uncertaintyLines,
    evidence_refs: args.input_package.evidence_refs,
    lineage_refs:
      args.input_package.lineage_refs.length > 0
        ? args.input_package.lineage_refs
        : ['l13.outputs.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
