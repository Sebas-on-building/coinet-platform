/**
 * L7.6 — Reliability Band Policy
 *
 * §7.6.2.3 + §7.6.4.3 — L7.6 standardizes downstream-facing reliance
 * banding to four bands:
 *
 *     HIGH        score ≥ 85
 *     MEDIUM      score ≥ 65
 *     LOW         score ≥ 35
 *     UNRESOLVED  score <  35
 *
 * The 5-value `L7ConfidenceBand` enum from L7.2 remains the wire-level
 * runtime band. L7.6 maps onto and from it so contracts continue to
 * round-trip with L7.4 outputs.
 */

import { L7ConfidenceBand } from './confidence-assessment';

export enum L7ReliabilityBand {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  UNRESOLVED = 'UNRESOLVED',
}

export const ALL_L7_RELIABILITY_BANDS: readonly L7ReliabilityBand[] =
  Object.values(L7ReliabilityBand);

export interface L7ReliabilityBandThreshold {
  readonly band: L7ReliabilityBand;
  /** Inclusive lower bound on the 0..100 normalized score. */
  readonly minScore100: number;
}

/**
 * §7.6.4.3 — recommended thresholds. They are configurable only through
 * a versioned `ConfidencePolicy` (see confidence-policy.registry.ts).
 */
export const L7_RELIABILITY_BAND_THRESHOLDS: readonly L7ReliabilityBandThreshold[] = [
  { band: L7ReliabilityBand.HIGH, minScore100: 85 },
  { band: L7ReliabilityBand.MEDIUM, minScore100: 65 },
  { band: L7ReliabilityBand.LOW, minScore100: 35 },
  { band: L7ReliabilityBand.UNRESOLVED, minScore100: 0 },
];

export function reliabilityBandForScore100(
  score100: number,
  thresholds: readonly L7ReliabilityBandThreshold[] = L7_RELIABILITY_BAND_THRESHOLDS,
): L7ReliabilityBand {
  for (const t of thresholds) {
    if (score100 >= t.minScore100) return t.band;
  }
  return L7ReliabilityBand.UNRESOLVED;
}

export function reliabilityBandForScore01(
  score01: number,
  thresholds: readonly L7ReliabilityBandThreshold[] = L7_RELIABILITY_BAND_THRESHOLDS,
): L7ReliabilityBand {
  return reliabilityBandForScore100(score01 * 100, thresholds);
}

export function bandMatchesScore01(
  band: L7ReliabilityBand,
  score01: number,
  thresholds: readonly L7ReliabilityBandThreshold[] = L7_RELIABILITY_BAND_THRESHOLDS,
): boolean {
  return reliabilityBandForScore01(score01, thresholds) === band;
}

/** §7.6 — bidirectional mapping with L7.2's runtime `L7ConfidenceBand`. */
export const L7_RELIABILITY_BAND_TO_RUNTIME_BAND: Record<
  L7ReliabilityBand,
  L7ConfidenceBand
> = {
  [L7ReliabilityBand.HIGH]: L7ConfidenceBand.VERY_HIGH,
  [L7ReliabilityBand.MEDIUM]: L7ConfidenceBand.HIGH,
  [L7ReliabilityBand.LOW]: L7ConfidenceBand.LOW,
  [L7ReliabilityBand.UNRESOLVED]: L7ConfidenceBand.VERY_LOW,
};

export const L7_RUNTIME_BAND_TO_RELIABILITY_BAND: Record<
  L7ConfidenceBand,
  L7ReliabilityBand
> = {
  [L7ConfidenceBand.VERY_HIGH]: L7ReliabilityBand.HIGH,
  [L7ConfidenceBand.HIGH]: L7ReliabilityBand.MEDIUM,
  [L7ConfidenceBand.MODERATE]: L7ReliabilityBand.MEDIUM,
  [L7ConfidenceBand.LOW]: L7ReliabilityBand.LOW,
  [L7ConfidenceBand.VERY_LOW]: L7ReliabilityBand.UNRESOLVED,
};

export function isL7ReliabilityBand(b: string): b is L7ReliabilityBand {
  return (ALL_L7_RELIABILITY_BANDS as readonly string[]).includes(b);
}
