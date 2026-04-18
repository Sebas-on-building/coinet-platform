/**
 * L8.3 — Regime Confidence Contract
 *
 * §8.3.4 — The executable regime-confidence profile. Regime confidence
 * is not final truth. It is the governed degree of reliance allowed on
 * the regime classification.
 */

import type { L8RegimeConfidenceBand } from './regime-state';

/**
 * §8.3.4.3 — Factor groups. Every regime confidence profile must
 * populate a `factor_breakdown` that covers these groups. Each factor
 * value is on [0,1]; 1 means "fully supportive of the regime call."
 *
 * Weights for these factors live in the subject's
 * `confidence_derivation_spec.factor_weights`.
 */
export interface L8RegimeConfidenceFactors {
  readonly support_breadth: number;
  readonly freshness: number;
  readonly validation_quality_posture: number;
  readonly contradiction_pressure: number;
  readonly transition_instability: number;
  readonly cross_domain_agreement: number;
  readonly historical_reliability: number;
  readonly ambiguity_pressure: number;
}

export const L8_REGIME_CONFIDENCE_FACTOR_NAMES: readonly (keyof L8RegimeConfidenceFactors)[] = [
  'support_breadth',
  'freshness',
  'validation_quality_posture',
  'contradiction_pressure',
  'transition_instability',
  'cross_domain_agreement',
  'historical_reliability',
  'ambiguity_pressure',
];

/**
 * §8.3.4.5 — A single cap rule in the cap chain. Mirrors L7.3's cap
 * vocabulary. Each cap declares whether it was applied and the maximum
 * score allowed after it.
 */
export interface L8ConfidenceCap {
  readonly cap_id: string;
  readonly cap_reason:
    | 'TRANSITION_HIGH'
    | 'VALIDATION_WEAK'
    | 'RESTRICTION_TIGHT'
    | 'AMBIGUITY_MATERIAL'
    | 'STALENESS_MATERIAL'
    | 'DEGRADATION_MATERIAL'
    | 'L7_CONFIDENCE_LOW';
  readonly max_after_cap: number;
  readonly applied: boolean;
}

/**
 * §8.3.4.2 — The full executable regime confidence contract.
 */
export interface L8RegimeConfidenceContract {
  // Identity (§8.3.4.2)
  readonly confidence_assessment_id: string;
  readonly regime_subject_id: string;
  readonly regime_result_id: string;

  // Versioning (§8.3.7.1)
  readonly confidence_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Score posture (§8.3.4.2)
  readonly confidence_score_raw: number; // 0..1
  readonly confidence_score_capped: number; // 0..1
  readonly confidence_band: L8RegimeConfidenceBand;

  // Factor breakdown (§8.3.4.3)
  readonly factor_breakdown: L8RegimeConfidenceFactors;

  // Cap chain (§8.3.4.5)
  readonly cap_chain: readonly L8ConfidenceCap[];

  // Rationale (§8.3.4.2)
  readonly rationale_codes: readonly string[];

  // Upstream L7 posture linkage (§8.3.4.6)
  readonly l7_restriction_profile_refs: readonly string[];
  readonly l7_contradiction_bundle_refs: readonly string[];

  // Lineage
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

export const L8_CONFIDENCE_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'confidence_assessment_id', 'regime_subject_id', 'regime_result_id',
  'confidence_contract_version', 'schema_version', 'policy_version',
  'confidence_score_raw', 'confidence_score_capped', 'confidence_band',
  'factor_breakdown', 'cap_chain', 'rationale_codes',
  'lineage_refs', 'compute_run_id', 'replay_hash',
];

/**
 * §8.3.4.4 — Recommended band resolver. The raw/capped scores map to
 * bands deterministically for consistency across the platform.
 */
export function resolveL8RegimeConfidenceBand(
  score: number,
): L8RegimeConfidenceBand {
  if (!Number.isFinite(score) || score < 0) return 'LOW' as L8RegimeConfidenceBand;
  if (score < 0.25) return 'LOW' as L8RegimeConfidenceBand;
  if (score < 0.55) return 'MODERATE' as L8RegimeConfidenceBand;
  if (score < 0.85) return 'HIGH' as L8RegimeConfidenceBand;
  return 'FULL' as L8RegimeConfidenceBand;
}

/**
 * §8.3.4.6 — A confidence object is illegal if `capped > raw`, if the
 * cap chain is empty while `capped < raw`, or if any applied cap's
 * max_after_cap exceeds the running cap floor.
 */
export function l8CapChainIsLegal(
  c: Pick<
    L8RegimeConfidenceContract,
    'confidence_score_raw' | 'confidence_score_capped' | 'cap_chain'
  >,
  epsilon = 1e-9,
): boolean {
  if (c.confidence_score_capped > c.confidence_score_raw + epsilon) return false;
  if (c.confidence_score_capped + epsilon < c.confidence_score_raw) {
    const anyApplied = c.cap_chain.some(cap => cap.applied);
    if (!anyApplied) return false;
    let runningMin = c.confidence_score_raw;
    for (const cap of c.cap_chain) {
      if (cap.applied) {
        if (cap.max_after_cap > runningMin + epsilon) return false;
        runningMin = Math.min(runningMin, cap.max_after_cap);
      }
    }
    if (Math.abs(runningMin - c.confidence_score_capped) > 1e-3) return false;
  }
  return true;
}
