/**
 * L13.7 — Contradiction Explanation Output Contract
 *
 * §13.7.17 — First-class mode payload. Must reference L7
 * contradictions, the affected L10 hypotheses, and the affected
 * L12 scenarios. Must not minimise an active contradiction.
 */

export interface L13ContradictionExplanationOutput {
  readonly contradiction_explanation_id: string;
  readonly output_id: string;
  readonly input_package_id: string;

  readonly primary_contradiction_refs: readonly string[];
  readonly supporting_l7_refs: readonly string[];
  readonly affected_l10_hypothesis_refs: readonly string[];
  readonly affected_l12_scenario_refs: readonly string[];

  readonly contradiction_summary_line: string;
  readonly what_it_weakens_lines: readonly string[];
  readonly confidence_impact_lines: readonly string[];
  readonly restriction_impact_lines: readonly string[];
  readonly possible_resolution_lines: readonly string[];
  readonly escalation_lines: readonly string[];

  readonly contradiction_minimized_detected: false;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * §13.7.17 — Patterns that minimise an active contradiction in
 * the output text.
 */
export const L13_CONTRADICTION_MINIMIZATION_PATTERNS:
  readonly RegExp[] = [
  /\bcontradiction\s+is\s+(minor|negligible|trivial|tiny)\b/i,
  /\bonly\s+a\s+(minor|small)\s+contradiction\b/i,
  /\bnothing\s+to\s+worry\s+about\b/i,
  /\bcontradiction\s+doesn'?t\s+matter\b/i,
];
