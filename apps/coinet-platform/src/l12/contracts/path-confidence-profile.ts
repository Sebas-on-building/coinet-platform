/**
 * L12.2 — PathConfidenceProfile (§12.2.13).
 *
 * Per-set confidence book. Captures per-scenario confidences, primary band,
 * secondary spread, ambiguity/contradiction/missing-visibility/transition/drift
 * pressure scores, and resulting readiness class.
 */

import { L12ScenarioReadinessClass } from './scenario-object-readiness';

export enum L12PathConfidenceBand {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export const ALL_L12_PATH_CONFIDENCE_BANDS: readonly L12PathConfidenceBand[] =
  Object.values(L12PathConfidenceBand);

export interface L12PathConfidenceProfile {
  readonly path_confidence_profile_id: string;

  readonly scenario_set_id: string;

  /** scenario_id → confidence in [0, 1]. */
  readonly scenario_confidences: Readonly<Record<string, number>>;

  readonly primary_path_confidence_score: number;
  readonly primary_path_confidence_band: L12PathConfidenceBand;

  readonly confidence_spread_to_secondary: number;

  readonly confidence_cap_refs: readonly string[];
  readonly confidence_penalty_refs: readonly string[];

  readonly ambiguity_score: number;
  readonly contradiction_pressure_score: number;
  readonly missing_visibility_score: number;
  readonly transition_risk_score: number;
  readonly drift_pressure_score: number;

  readonly readiness_class: L12ScenarioReadinessClass;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}

const BAND_RANGES: ReadonlyArray<[L12PathConfidenceBand, number, number]> = [
  [L12PathConfidenceBand.VERY_LOW, 0.0, 0.2],
  [L12PathConfidenceBand.LOW, 0.2, 0.4],
  [L12PathConfidenceBand.MEDIUM, 0.4, 0.6],
  [L12PathConfidenceBand.HIGH, 0.6, 0.8],
  [L12PathConfidenceBand.VERY_HIGH, 0.8, 1.000001],
];

/**
 * Map a confidence score to its canonical band.
 * Boundaries are inclusive on the lower edge, exclusive on the upper edge,
 * with VERY_HIGH absorbing 1.0.
 */
export function l12ConfidenceBandFor(score: number): L12PathConfidenceBand {
  if (Number.isNaN(score) || score < 0 || score > 1) {
    return L12PathConfidenceBand.VERY_LOW;
  }
  for (const [band, lo, hi] of BAND_RANGES) {
    if (score >= lo && score < hi) return band;
  }
  return L12PathConfidenceBand.VERY_HIGH;
}

export function isL12HighConfidenceBand(b: L12PathConfidenceBand): boolean {
  return b === L12PathConfidenceBand.HIGH || b === L12PathConfidenceBand.VERY_HIGH;
}
