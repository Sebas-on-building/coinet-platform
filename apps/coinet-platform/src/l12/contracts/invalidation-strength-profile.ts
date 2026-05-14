/**
 * L12.5 — Invalidation strength law (§12.5.12).
 *
 * Invalidation strength dominates trigger strength. A scenario can survive
 * weak triggers; a scenario cannot remain clean under active strong
 * invalidation.
 */

import { L12PathConfidenceBand } from './path-confidence-profile';
import { L12InvalidationEffect } from './scenario-invalidation';

export enum L12InvalidationStrengthBand {
  WATCH = 'WATCH',
  WEAK = 'WEAK',
  MATERIAL = 'MATERIAL',
  STRONG = 'STRONG',
  BLOCKING = 'BLOCKING',
}

export const ALL_L12_INVALIDATION_STRENGTH_BANDS: readonly L12InvalidationStrengthBand[] =
  Object.values(L12InvalidationStrengthBand);

const INV_BAND_RANGES: ReadonlyArray<[L12InvalidationStrengthBand, number, number]> = [
  [L12InvalidationStrengthBand.WATCH, 0.0, 0.15],
  [L12InvalidationStrengthBand.WEAK, 0.15, 0.35],
  [L12InvalidationStrengthBand.MATERIAL, 0.35, 0.6],
  [L12InvalidationStrengthBand.STRONG, 0.6, 0.85],
  [L12InvalidationStrengthBand.BLOCKING, 0.85, 1.000001],
];

export function l12InvalidationStrengthBandFor(
  score: number,
): L12InvalidationStrengthBand {
  if (Number.isNaN(score) || score < 0 || score > 1) {
    return L12InvalidationStrengthBand.WATCH;
  }
  for (const [band, lo, hi] of INV_BAND_RANGES) {
    if (score >= lo && score < hi) return band;
  }
  return L12InvalidationStrengthBand.BLOCKING;
}

/**
 * Maximum confidence band ceiling for a scenario when this invalidation is
 * active. Used by the cap-chain engine to enforce the §12.5.14.2 ceilings.
 */
export function l12MaxConfidenceForActiveInvalidation(
  band: L12InvalidationStrengthBand,
): L12PathConfidenceBand {
  switch (band) {
    case L12InvalidationStrengthBand.BLOCKING:
      return L12PathConfidenceBand.VERY_LOW;
    case L12InvalidationStrengthBand.STRONG:
      return L12PathConfidenceBand.LOW;
    case L12InvalidationStrengthBand.MATERIAL:
      return L12PathConfidenceBand.LOW;
    case L12InvalidationStrengthBand.WEAK:
      return L12PathConfidenceBand.MEDIUM;
    case L12InvalidationStrengthBand.WATCH:
    default:
      return L12PathConfidenceBand.HIGH;
  }
}

export interface L12InvalidationStrengthProfile {
  readonly invalidation_strength_profile_id: string;

  readonly invalidation_id: string;
  readonly scenario_id: string;
  readonly scenario_set_id: string;

  readonly invalidation_strength_score: number;
  readonly invalidation_strength_band: L12InvalidationStrengthBand;

  readonly invalidation_evidence_quality: number;
  readonly invalidation_freshness_score: number;
  readonly invalidation_monitorability_score: number;
  readonly invalidation_materiality_score: number;
  readonly contradiction_pressure_score: number;

  readonly expected_effect: L12InvalidationEffect;

  readonly is_active: boolean;
  readonly is_blocking: boolean;

  readonly confidence_cap_required: boolean;
  readonly max_confidence_band_if_active: L12PathConfidenceBand;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}
