/**
 * L11.2 — Score Band Policy (§11.2.12)
 *
 * Default 5-band quintile policy for [0,100] scores. Half-open
 * intervals are used internally so each final score maps to exactly
 * one band:
 *
 *   [0, 20]  VERY_LOW
 *   (20,40]  LOW
 *   (40,60]  MEDIUM
 *   (60,80]  HIGH
 *   (80,100] VERY_HIGH
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreFamilyDirectionClass } from './score-direction';

export enum L11ScoreBand {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export const ALL_L11_SCORE_BANDS: readonly L11ScoreBand[] =
  Object.values(L11ScoreBand);

export interface L11ScoreBandThreshold {
  readonly band: L11ScoreBand;
  readonly lower: number;
  readonly upper: number;
  /** True when the lower bound is inclusive (`[lower, ...]`). */
  readonly lower_inclusive: boolean;
  /** True when the upper bound is inclusive (`[..., upper]`). */
  readonly upper_inclusive: boolean;
}

export interface L11ScoreBandPolicy {
  readonly band_policy_id: string;
  readonly score_family: L11ScoreFamily;
  readonly policy_version: string;
  readonly min_score: number;
  readonly max_score: number;
  readonly thresholds: readonly L11ScoreBandThreshold[];
  readonly direction_class: L11ScoreFamilyDirectionClass;
}

/**
 * §11.2.12.2 — Canonical default thresholds for every production
 * family unless overridden later.
 */
export const L11_DEFAULT_BAND_THRESHOLDS: readonly L11ScoreBandThreshold[] = [
  {
    band: L11ScoreBand.VERY_LOW,
    lower: 0, upper: 20,
    lower_inclusive: true, upper_inclusive: true,
  },
  {
    band: L11ScoreBand.LOW,
    lower: 20, upper: 40,
    lower_inclusive: false, upper_inclusive: true,
  },
  {
    band: L11ScoreBand.MEDIUM,
    lower: 40, upper: 60,
    lower_inclusive: false, upper_inclusive: true,
  },
  {
    band: L11ScoreBand.HIGH,
    lower: 60, upper: 80,
    lower_inclusive: false, upper_inclusive: true,
  },
  {
    band: L11ScoreBand.VERY_HIGH,
    lower: 80, upper: 100,
    lower_inclusive: false, upper_inclusive: true,
  },
];

export const L11_BAND_POLICY_VERSION = 'l11.2.band.v1';

/**
 * §11.2.12.2 — Deterministic band resolution under half-open intervals.
 * Returns `null` for non-finite, NaN, or out-of-range scores so that
 * `L11D_FINAL_SCORE_OUT_OF_RANGE` can be emitted by the validator.
 */
export function resolveL11ScoreBand(
  score: number,
  thresholds: readonly L11ScoreBandThreshold[] = L11_DEFAULT_BAND_THRESHOLDS,
): L11ScoreBand | null {
  if (!Number.isFinite(score)) return null;
  if (score < 0 || score > 100) return null;
  for (const t of thresholds) {
    const lowerOk = t.lower_inclusive ? score >= t.lower : score > t.lower;
    const upperOk = t.upper_inclusive ? score <= t.upper : score < t.upper;
    if (lowerOk && upperOk) return t.band;
  }
  return null;
}

/**
 * §11.2.12.4 — Threshold integrity check used by the band-policy
 * validator. Catches gaps, overlaps, and out-of-range bounds.
 */
export function checkL11BandThresholdIntegrity(
  thresholds: readonly L11ScoreBandThreshold[],
): { ok: boolean; reason: string } {
  if (thresholds.length === 0) {
    return { ok: false, reason: 'no thresholds declared' };
  }
  const sorted = [...thresholds].sort((a, b) => a.lower - b.lower);
  if (sorted[0].lower !== 0 || !sorted[0].lower_inclusive) {
    return { ok: false, reason: 'first threshold must include lower bound 0' };
  }
  const last = sorted[sorted.length - 1];
  if (last.upper !== 100 || !last.upper_inclusive) {
    return { ok: false, reason: 'last threshold must include upper bound 100' };
  }
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (curr.lower !== prev.upper) {
      return {
        ok: false,
        reason: `gap or jump between band ${prev.band} (upper=${prev.upper}) and band ${curr.band} (lower=${curr.lower})`,
      };
    }
    // Half-open boundary integrity: previous upper inclusive ↔ current
    // lower exclusive (or vice versa) so the boundary belongs to one
    // and only one band.
    const sharedBoundary =
      (prev.upper_inclusive && !curr.lower_inclusive) ||
      (!prev.upper_inclusive && curr.lower_inclusive);
    if (!sharedBoundary) {
      return {
        ok: false,
        reason: `boundary at ${prev.upper} between ${prev.band} and ${curr.band} is double-claimed or unclaimed`,
      };
    }
  }
  const seenBands = new Set(sorted.map(t => t.band));
  if (seenBands.size !== sorted.length) {
    return { ok: false, reason: 'duplicate band in thresholds' };
  }
  return { ok: true, reason: 'ok' };
}
