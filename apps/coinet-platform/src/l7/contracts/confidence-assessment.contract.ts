/**
 * L7.3 — Confidence Assessment Contract
 *
 * §7.3.5 — Adds versioning, raw vs capped score, weights, materiality
 * modifier, and an executable cap-chain on top of the L7.2 object.
 */

import {
  L7ConfidenceBand,
  L7ConfidenceComponents,
  L7ConfidenceCap,
} from './confidence-assessment';

// L7.2 confidence enums/types are intentionally not re-exported here to
// avoid barrel collisions; consumers import them directly from
// `./confidence-assessment`.

export interface L7ConfidenceComponentWeights {
  readonly source_trust_weight: number;
  readonly freshness_weight: number;
  readonly feature_completeness_weight: number;
  readonly cross_source_agreement_weight: number;
  readonly regime_compatibility_weight: number;
  readonly historical_reliability_weight: number;
  readonly contradiction_penalty_weight: number;
}

export interface L7ConfidenceAssessmentContract {
  // Identity (§7.3.5.3)
  readonly confidence_assessment_id: string;
  readonly validation_subject_id: string;
  readonly subject_contract_ref: string;

  // Versioning (§7.3.5.3)
  readonly confidence_contract_version: string;
  readonly schema_version: string;
  readonly confidence_policy_version: string;

  // Score posture
  readonly raw_score: number;
  readonly capped_score: number;
  readonly confidence_score: number;
  readonly confidence_band: L7ConfidenceBand;
  readonly materiality_modifier: number;

  // Components and weights (§7.3.5.2 + §7.3.5.3)
  readonly components: L7ConfidenceComponents;
  readonly component_weights: L7ConfidenceComponentWeights;

  // Caps + restriction linkage
  readonly cap_chain: readonly L7ConfidenceCap[];
  readonly restriction_profile_ref: string | null;

  // Rationale + lineage
  readonly rationale_codes: readonly string[];
  readonly lineage_refs: { readonly trace_id: string; readonly manifest_id: string };
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

export const L7_CONFIDENCE_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'confidence_assessment_id', 'validation_subject_id', 'subject_contract_ref',
  'confidence_contract_version', 'schema_version', 'confidence_policy_version',
  'raw_score', 'capped_score', 'confidence_score', 'confidence_band',
  'components', 'component_weights',
  'cap_chain', 'rationale_codes',
  'lineage_refs', 'compute_run_id', 'replay_hash',
];

/**
 * §7.3.5.4 — A confidence object is illegal if `capped_score > raw_score`,
 * if the active cap chain is empty while `capped_score < raw_score`, or if
 * `confidence_score !== capped_score` (allowing a tiny epsilon).
 */
export function capChainIsLegal(
  c: Pick<
    L7ConfidenceAssessmentContract,
    'raw_score' | 'capped_score' | 'confidence_score' | 'cap_chain'
  >,
  epsilon = 1e-9,
): boolean {
  if (c.capped_score > c.raw_score + epsilon) return false;
  if (c.capped_score + epsilon < c.raw_score) {
    const anyApplied = c.cap_chain.some(cap => cap.applied);
    if (!anyApplied) return false;
    let runningMin = c.raw_score;
    for (const cap of c.cap_chain) {
      if (cap.applied) {
        if (cap.max_after_cap > runningMin + epsilon) return false;
        runningMin = Math.min(runningMin, cap.max_after_cap);
      }
    }
    if (Math.abs(runningMin - c.capped_score) > 1e-3) return false;
  }
  if (Math.abs(c.confidence_score - c.capped_score) > epsilon) return false;
  return true;
}
