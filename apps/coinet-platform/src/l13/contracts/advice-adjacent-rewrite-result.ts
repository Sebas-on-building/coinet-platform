/**
 * L13.9 — Advice-Adjacent Rewrite Result Contract
 *
 * §13.9.16 — The rewriter's deterministic output record. Rewrites
 * must re-enter L13.3 → L13.4 → L13.5 → L13.7 → L13.8 → L13.9
 * (§13.9.16.1). The booleans on this record drive that revalidation.
 */

import type { L13SafetyRiskClass } from './safety-risk-class';

export interface L13AdviceAdjacentRewriteResult {
  readonly rewrite_result_id: string;
  readonly original_output_ref: string;

  readonly rewrite_attempted: boolean;
  readonly rewrite_successful: boolean;

  readonly source_risk_classes: readonly L13SafetyRiskClass[];
  readonly rewritten_text_ref?: string;

  readonly preserved_grounding_required: true;
  readonly preserved_expression_governance_required: true;
  readonly preserved_mode_shape_required: true;
  readonly preserved_style_envelope_required: true;

  readonly requires_revalidation_from_l13_3: boolean;
  readonly requires_revalidation_from_l13_4: boolean;
  readonly requires_revalidation_from_l13_5: boolean;
  readonly requires_revalidation_from_l13_7: boolean;
  readonly requires_revalidation_from_l13_8: boolean;

  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}
