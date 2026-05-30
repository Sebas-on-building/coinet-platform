/**
 * L13.7 — Scenario Explanation Output Contract
 *
 * §13.7.15 — Readable AI specialization of L12 scenarios. Must
 * preserve conditionality (no scenario presented as prediction)
 * and must include base case, alternatives, triggers,
 * invalidations, path confidence, caps, spread, readiness, and
 * restrictions.
 */

export interface L13ScenarioExplanationOutput {
  readonly scenario_explanation_id: string;
  readonly output_id: string;
  readonly input_package_id: string;

  readonly scenario_set_ref: string;

  readonly base_case_line: string;
  readonly alternative_path_lines: readonly string[];
  readonly bullish_path_lines: readonly string[];
  readonly bearish_failure_path_lines: readonly string[];
  readonly neutral_or_chop_path_lines: readonly string[];
  readonly trigger_lines: readonly string[];
  readonly invalidation_lines: readonly string[];
  readonly path_confidence_line: string;
  readonly confidence_cap_lines: readonly string[];
  readonly scenario_spread_line: string;
  readonly readiness_line: string;
  readonly restriction_line: string;

  readonly scenario_conditionality_preserved: true;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
