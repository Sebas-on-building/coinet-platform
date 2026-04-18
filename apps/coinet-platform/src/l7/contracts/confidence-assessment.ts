/**
 * L7.2 — Confidence Assessment Contract
 *
 * §7.2.6.3 — A ConfidenceAssessment carries a justified reliance score
 * with an explicit factor breakdown. Confidence is distinct from
 * validation class and from contradiction bundles (§7.2.5.3).
 */

export enum L7ConfidenceBand {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export const ALL_CONFIDENCE_BANDS: readonly L7ConfidenceBand[] =
  Object.values(L7ConfidenceBand);

export interface L7ConfidenceComponents {
  readonly source_trust_component: number;
  readonly freshness_component: number;
  readonly feature_completeness_component: number;
  readonly cross_source_agreement_component: number;
  readonly regime_compatibility_component: number;
  readonly historical_reliability_component: number;
  readonly contradiction_penalty_component: number;
}

export interface L7ConfidenceCap {
  readonly cap_code: string;
  readonly applied: boolean;
  readonly max_after_cap: number;
  readonly reason: string;
}

export interface L7ConfidenceAssessment {
  readonly validation_subject_id: string;
  readonly confidence_score: number;
  readonly confidence_band: L7ConfidenceBand;
  readonly components: L7ConfidenceComponents;
  readonly cap_chain: readonly L7ConfidenceCap[];
  readonly restriction_profile_ref: string | null;
  readonly rationale_codes: readonly string[];
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

export interface ScoreRange {
  readonly min: number;
  readonly max: number;
}

export const CONFIDENCE_BAND_RANGES: Readonly<Record<L7ConfidenceBand, ScoreRange>> = {
  [L7ConfidenceBand.VERY_LOW]: { min: 0, max: 0.2 },
  [L7ConfidenceBand.LOW]: { min: 0.2, max: 0.4 },
  [L7ConfidenceBand.MODERATE]: { min: 0.4, max: 0.6 },
  [L7ConfidenceBand.HIGH]: { min: 0.6, max: 0.8 },
  [L7ConfidenceBand.VERY_HIGH]: { min: 0.8, max: 1.0 + 1e-9 },
};

export function bandForScore(score: number): L7ConfidenceBand {
  for (const band of ALL_CONFIDENCE_BANDS) {
    const r = CONFIDENCE_BAND_RANGES[band];
    if (score >= r.min && score < r.max) return band;
  }
  return L7ConfidenceBand.VERY_HIGH;
}

export function bandMatchesScore(band: L7ConfidenceBand, score: number): boolean {
  return bandForScore(score) === band;
}
