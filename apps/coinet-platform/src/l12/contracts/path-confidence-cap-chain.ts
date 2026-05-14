/**
 * L12.5 — Path-confidence cap chain (§12.5.14).
 *
 * The cap chain captures the priority-ordered downward caps the engine
 * applies to a path's pre-cap confidence based on adverse posture (active
 * invalidation, contradiction, drift, missing visibility, etc.). The dominant
 * cap reason determines the final confidence ceiling.
 */

import { L12PathConfidenceBand } from './path-confidence-profile';

export enum L12PathConfidenceCapReason {
  ACTIVE_INVALIDATION = 'ACTIVE_INVALIDATION',
  BLOCKING_INVALIDATION = 'BLOCKING_INVALIDATION',
  UNRESOLVED_CONTRADICTION = 'UNRESOLVED_CONTRADICTION',
  HIGH_TRANSITION_RISK = 'HIGH_TRANSITION_RISK',
  DOMINANT_SEQUENCE_DECAY = 'DOMINANT_SEQUENCE_DECAY',
  NARROW_HYPOTHESIS_SPREAD = 'NARROW_HYPOTHESIS_SPREAD',
  MISSING_VISIBILITY = 'MISSING_VISIBILITY',
  MATERIAL_DRIFT = 'MATERIAL_DRIFT',
  UNRESOLVED_TRIGGER = 'UNRESOLVED_TRIGGER',
  THIN_LIQUIDITY_FRAGILITY = 'THIN_LIQUIDITY_FRAGILITY',
  INCOMPLETE_L11_SCORE_CONTEXT = 'INCOMPLETE_L11_SCORE_CONTEXT',
  INSUFFICIENT_SCENARIO_COMPETITION = 'INSUFFICIENT_SCENARIO_COMPETITION',
}

export const ALL_L12_PATH_CONFIDENCE_CAP_REASONS: readonly L12PathConfidenceCapReason[] =
  Object.values(L12PathConfidenceCapReason);

/**
 * §12.5.14.2 — Recommended initial ceilings. Ordered by dominance: the most
 * severe ceiling wins. `INCOMPLETE_L11_SCORE_CONTEXT` returns `null` to mean
 * fully blocked.
 */
export const L12_PATH_CONFIDENCE_CAP_CEILINGS: Readonly<
  Record<L12PathConfidenceCapReason, L12PathConfidenceBand | null>
> = {
  [L12PathConfidenceCapReason.INCOMPLETE_L11_SCORE_CONTEXT]: null,
  [L12PathConfidenceCapReason.BLOCKING_INVALIDATION]: L12PathConfidenceBand.VERY_LOW,
  [L12PathConfidenceCapReason.ACTIVE_INVALIDATION]: L12PathConfidenceBand.LOW,
  [L12PathConfidenceCapReason.MATERIAL_DRIFT]: L12PathConfidenceBand.LOW,
  [L12PathConfidenceCapReason.INSUFFICIENT_SCENARIO_COMPETITION]: L12PathConfidenceBand.LOW,
  [L12PathConfidenceCapReason.UNRESOLVED_CONTRADICTION]: L12PathConfidenceBand.MEDIUM,
  [L12PathConfidenceCapReason.MISSING_VISIBILITY]: L12PathConfidenceBand.MEDIUM,
  [L12PathConfidenceCapReason.HIGH_TRANSITION_RISK]: L12PathConfidenceBand.MEDIUM,
  [L12PathConfidenceCapReason.DOMINANT_SEQUENCE_DECAY]: L12PathConfidenceBand.MEDIUM,
  [L12PathConfidenceCapReason.NARROW_HYPOTHESIS_SPREAD]: L12PathConfidenceBand.MEDIUM,
  [L12PathConfidenceCapReason.UNRESOLVED_TRIGGER]: L12PathConfidenceBand.MEDIUM,
  [L12PathConfidenceCapReason.THIN_LIQUIDITY_FRAGILITY]: L12PathConfidenceBand.MEDIUM,
};

/** Severity ordering: lower index = more severe (wins dominance). */
const CAP_DOMINANCE: readonly L12PathConfidenceCapReason[] = [
  L12PathConfidenceCapReason.INCOMPLETE_L11_SCORE_CONTEXT,
  L12PathConfidenceCapReason.BLOCKING_INVALIDATION,
  L12PathConfidenceCapReason.ACTIVE_INVALIDATION,
  L12PathConfidenceCapReason.MATERIAL_DRIFT,
  L12PathConfidenceCapReason.INSUFFICIENT_SCENARIO_COMPETITION,
  L12PathConfidenceCapReason.UNRESOLVED_CONTRADICTION,
  L12PathConfidenceCapReason.MISSING_VISIBILITY,
  L12PathConfidenceCapReason.HIGH_TRANSITION_RISK,
  L12PathConfidenceCapReason.DOMINANT_SEQUENCE_DECAY,
  L12PathConfidenceCapReason.NARROW_HYPOTHESIS_SPREAD,
  L12PathConfidenceCapReason.UNRESOLVED_TRIGGER,
  L12PathConfidenceCapReason.THIN_LIQUIDITY_FRAGILITY,
];

export function l12DominantCapReason(
  reasons: readonly L12PathConfidenceCapReason[],
): L12PathConfidenceCapReason | undefined {
  for (const r of CAP_DOMINANCE) {
    if (reasons.includes(r)) return r;
  }
  return undefined;
}

const BAND_TO_NUMERIC: Readonly<Record<L12PathConfidenceBand, number>> = {
  [L12PathConfidenceBand.VERY_LOW]: 0.15,
  [L12PathConfidenceBand.LOW]: 0.35,
  [L12PathConfidenceBand.MEDIUM]: 0.55,
  [L12PathConfidenceBand.HIGH]: 0.75,
  [L12PathConfidenceBand.VERY_HIGH]: 0.95,
};

const BAND_UPPER: Readonly<Record<L12PathConfidenceBand, number>> = {
  [L12PathConfidenceBand.VERY_LOW]: 0.2,
  [L12PathConfidenceBand.LOW]: 0.4,
  [L12PathConfidenceBand.MEDIUM]: 0.6,
  [L12PathConfidenceBand.HIGH]: 0.8,
  [L12PathConfidenceBand.VERY_HIGH]: 1.0,
};

export function l12CapBandToNumericFloor(band: L12PathConfidenceBand): number {
  return BAND_TO_NUMERIC[band];
}

export function l12CapBandToNumericCeiling(band: L12PathConfidenceBand): number {
  return BAND_UPPER[band];
}

export interface L12PathConfidenceCapChain {
  readonly cap_chain_id: string;

  readonly scenario_set_id: string;
  readonly scenario_id: string;

  readonly pre_cap_score: number;
  readonly pre_cap_band: L12PathConfidenceBand;

  readonly cap_reasons: readonly L12PathConfidenceCapReason[];
  readonly dominant_cap_reason?: L12PathConfidenceCapReason;

  readonly capped_score: number;
  readonly capped_band: L12PathConfidenceBand;

  readonly is_blocked: boolean;

  readonly cap_explanation_codes: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}
