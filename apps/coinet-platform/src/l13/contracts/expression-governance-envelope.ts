/**
 * L13.5 — Expression Governance Envelope Contract
 *
 * §13.5.20 — Top-level handoff object from L13.5 to the L13.6
 * runtime. References every component profile (uncertainty
 * disclosure, contradiction disclosure, confidence phrasing,
 * restriction composition) plus the final expression-readiness
 * class, the emit/rewrite/refusal/block decision, and the replay
 * material that lets the runtime reproduce the decision.
 *
 * The envelope is the *only* legal artifact L13.6 may consume to
 * decide whether to emit the output to the user. L13.6 may not
 * recompute confidence, uncertainty, contradiction, or restriction
 * — it may only honor the envelope.
 */

import type { L13ExplanationConfidenceBand } from './confidence-breakdown';
import type { L13PhraseStrengthClass } from './phrase-strength';

/**
 * §13.5.20 — Expression Readiness Class.
 */
export enum L13ExpressionReadinessClass {
  EXPRESSION_CLEAN = 'EXPRESSION_CLEAN',
  EXPRESSION_CLEAN_WITH_DISCLOSURE = 'EXPRESSION_CLEAN_WITH_DISCLOSURE',
  EXPRESSION_NARROWED_BY_UNCERTAINTY = 'EXPRESSION_NARROWED_BY_UNCERTAINTY',
  EXPRESSION_NARROWED_BY_RESTRICTION = 'EXPRESSION_NARROWED_BY_RESTRICTION',
  EXPRESSION_REWRITE_REQUIRED = 'EXPRESSION_REWRITE_REQUIRED',
  EXPRESSION_REFUSAL_REQUIRED = 'EXPRESSION_REFUSAL_REQUIRED',
  EXPRESSION_BLOCKED = 'EXPRESSION_BLOCKED',
}

export const ALL_L13_EXPRESSION_READINESS_CLASSES:
  readonly L13ExpressionReadinessClass[] =
  Object.values(L13ExpressionReadinessClass);

/**
 * Readiness classes that prevent direct emission to the user.
 */
export const L13_BLOCKING_EXPRESSION_READINESS_CLASSES:
  readonly L13ExpressionReadinessClass[] = [
  L13ExpressionReadinessClass.EXPRESSION_REWRITE_REQUIRED,
  L13ExpressionReadinessClass.EXPRESSION_REFUSAL_REQUIRED,
  L13ExpressionReadinessClass.EXPRESSION_BLOCKED,
];

export function isL13BlockingExpressionReadiness(
  cls: L13ExpressionReadinessClass,
): boolean {
  return L13_BLOCKING_EXPRESSION_READINESS_CLASSES.includes(cls);
}

/**
 * §13.5.20 — Expression Governance Envelope.
 */
export interface L13ExpressionGovernanceEnvelope {
  readonly expression_governance_id: string;

  readonly output_id: string;
  readonly input_package_id: string;
  readonly grounded_output_ref: string;

  readonly uncertainty_disclosure_profile_ref: string;
  readonly contradiction_disclosure_profile_ref: string;
  readonly confidence_phrasing_profile_ref: string;
  readonly restriction_composition_profile_ref: string;

  readonly final_confidence_ceiling: L13ExplanationConfidenceBand;
  readonly final_allowed_phrase_strength_classes:
    readonly L13PhraseStrengthClass[];

  readonly final_expression_readiness: L13ExpressionReadinessClass;

  readonly output_allowed: boolean;
  readonly rewrite_required: boolean;
  readonly refusal_required: boolean;
  readonly block_required: boolean;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
