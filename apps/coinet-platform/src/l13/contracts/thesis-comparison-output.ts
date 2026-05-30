/**
 * L13.7 — Thesis Comparison Output Contract
 *
 * §13.7.14 — Compares explanations, not trades. Must preserve
 * uncertainty and contradiction; may never emit final-truth
 * "thesis is proven" language.
 */

export enum L13ThesisComparisonReadinessClass {
  THESIS_COMPARISON_READY = 'THESIS_COMPARISON_READY',
  THESIS_COMPARISON_READY_WITH_DISCLOSURE = 'THESIS_COMPARISON_READY_WITH_DISCLOSURE',
  THESIS_COMPARISON_NARROWED_BY_UNCERTAINTY = 'THESIS_COMPARISON_NARROWED_BY_UNCERTAINTY',
  THESIS_COMPARISON_INCOMPLETE = 'THESIS_COMPARISON_INCOMPLETE',
  THESIS_COMPARISON_BLOCKED = 'THESIS_COMPARISON_BLOCKED',
}

export const ALL_L13_THESIS_COMPARISON_READINESS_CLASSES:
  readonly L13ThesisComparisonReadinessClass[] =
  Object.values(L13ThesisComparisonReadinessClass);

export interface L13ThesisComparisonOutput {
  readonly thesis_comparison_id: string;
  readonly output_id: string;
  readonly input_package_id: string;

  readonly thesis_left_ref: string;
  readonly thesis_right_ref: string;
  readonly left_thesis_name: string;
  readonly right_thesis_name: string;

  readonly support_comparison: string;
  readonly contradiction_comparison: string;
  readonly confirmation_gap_comparison: string;
  readonly invalidation_risk_comparison: string;
  readonly scenario_implication_comparison: string;
  readonly shift_condition_comparison: string;
  readonly hypothesis_spread_ref: string;

  readonly thesis_comparison_readiness:
    L13ThesisComparisonReadinessClass;

  readonly stronger_current_explanation_line?: string;
  readonly preserved_alternative_line?: string;

  readonly forbidden_finality_detected: false;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * §13.7.14.3 — Patterns that constitute finality leakage in
 * thesis comparison text.
 */
export const L13_THESIS_FINALITY_LEAK_PATTERNS:
  readonly RegExp[] = [
  /\b(thesis|hypothesis)\s+is\s+proven\b/i,
  /\b(thesis|hypothesis)\s+is\s+confirmed\b/i,
  /\bdefinitively\s+(the|a)\s+(stronger|right)\s+(thesis|case)\b/i,
  /\bwins\s+(outright|decisively|definitively)\b/i,
  /\bsettles\s+the\s+(question|debate)\b/i,
];
