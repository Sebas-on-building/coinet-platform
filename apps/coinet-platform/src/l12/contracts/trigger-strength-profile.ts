/**
 * L12.5 — Trigger strength law (§12.5.11).
 *
 * Trigger strength measures how strongly a trigger would strengthen, weaken,
 * activate, shift, or collapse a scenario path. Strength is *not* a trade
 * signal: it is a governed evidence-backed measure with explicit factors.
 */

import { L12TriggerEffect } from './scenario-trigger';

export enum L12TriggerStrengthBand {
  WEAK = 'WEAK',
  MODERATE = 'MODERATE',
  STRONG = 'STRONG',
  DECISIVE = 'DECISIVE',
  BLOCKED = 'BLOCKED',
}

export const ALL_L12_TRIGGER_STRENGTH_BANDS: readonly L12TriggerStrengthBand[] =
  Object.values(L12TriggerStrengthBand);

const TRIGGER_BAND_RANGES: ReadonlyArray<[L12TriggerStrengthBand, number, number]> = [
  [L12TriggerStrengthBand.WEAK, 0.0, 0.25],
  [L12TriggerStrengthBand.MODERATE, 0.25, 0.5],
  [L12TriggerStrengthBand.STRONG, 0.5, 0.8],
  [L12TriggerStrengthBand.DECISIVE, 0.8, 1.000001],
];

export function l12TriggerStrengthBandFor(score: number): L12TriggerStrengthBand {
  if (Number.isNaN(score) || score < 0 || score > 1) return L12TriggerStrengthBand.BLOCKED;
  for (const [band, lo, hi] of TRIGGER_BAND_RANGES) {
    if (score >= lo && score < hi) return band;
  }
  return L12TriggerStrengthBand.DECISIVE;
}

/** Effect of trigger on path confidence. */
export enum L12TriggerConfidenceEffect {
  RAISES_PRIMARY_CONFIDENCE = 'RAISES_PRIMARY_CONFIDENCE',
  LOWERS_PRIMARY_CONFIDENCE = 'LOWERS_PRIMARY_CONFIDENCE',
  PROMOTES_SECONDARY_CONFIDENCE = 'PROMOTES_SECONDARY_CONFIDENCE',
  CONFIDENCE_NEUTRAL = 'CONFIDENCE_NEUTRAL',
  CONFIDENCE_WATCH_ONLY = 'CONFIDENCE_WATCH_ONLY',
}

export const ALL_L12_TRIGGER_CONFIDENCE_EFFECTS: readonly L12TriggerConfidenceEffect[] =
  Object.values(L12TriggerConfidenceEffect);

export interface L12TriggerStrengthProfile {
  readonly trigger_strength_profile_id: string;

  readonly trigger_id: string;
  readonly scenario_id: string;
  readonly scenario_set_id: string;

  readonly trigger_strength_score: number;
  readonly trigger_strength_band: L12TriggerStrengthBand;

  readonly trigger_evidence_quality: number;
  readonly trigger_freshness_score: number;
  readonly trigger_monitorability_score: number;
  readonly trigger_materiality_score: number;
  readonly contradiction_pressure_score: number;
  readonly score_context_support_score: number;

  readonly expected_effect: L12TriggerEffect;
  readonly confidence_effect: L12TriggerConfidenceEffect;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}
