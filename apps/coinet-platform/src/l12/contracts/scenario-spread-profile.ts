/**
 * L12.5 — Scenario spread law (§12.5.15).
 *
 * Scenario spread measures how separated the primary scenario is from the
 * secondary. Low spread requires shift conditions and disclosure; high
 * spread is still conditional, never guaranteed.
 *
 * This complements (does not replace) `L12ScenarioSpreadClass` from L12.2:
 * the spread *profile* is the dedicated production object carrying the
 * derivation evidence and shift-condition requirement flag.
 */

import { L12ScenarioSpreadClass } from './scenario-set';

/** Production thresholds (§12.5.15.3). Values are *score deltas* in [0, 1]. */
export const L12_SCENARIO_SPREAD_THRESHOLDS = {
  unresolved_to_narrow: 0.05,
  narrow_to_moderate: 0.15,
  moderate_to_clear: 0.30,
} as const;

export function l12ScenarioSpreadClassFor(
  spreadScore: number,
): L12ScenarioSpreadClass {
  if (Number.isNaN(spreadScore) || spreadScore < 0) {
    return L12ScenarioSpreadClass.UNRESOLVED_COMPETITION;
  }
  if (spreadScore < L12_SCENARIO_SPREAD_THRESHOLDS.unresolved_to_narrow) {
    return L12ScenarioSpreadClass.UNRESOLVED_COMPETITION;
  }
  if (spreadScore < L12_SCENARIO_SPREAD_THRESHOLDS.narrow_to_moderate) {
    return L12ScenarioSpreadClass.NARROW_PRIMARY;
  }
  if (spreadScore < L12_SCENARIO_SPREAD_THRESHOLDS.moderate_to_clear) {
    return L12ScenarioSpreadClass.MODERATE_PRIMARY;
  }
  return L12ScenarioSpreadClass.CLEAR_PRIMARY;
}

export function l12SpreadRequiresShiftConditions(
  spreadClass: L12ScenarioSpreadClass,
): boolean {
  return (
    spreadClass === L12ScenarioSpreadClass.UNRESOLVED_COMPETITION ||
    spreadClass === L12ScenarioSpreadClass.NARROW_PRIMARY ||
    spreadClass === L12ScenarioSpreadClass.MODERATE_PRIMARY
  );
}

export function l12IsClearPrimarySpread(c: L12ScenarioSpreadClass): boolean {
  return c === L12ScenarioSpreadClass.CLEAR_PRIMARY;
}

export interface L12ScenarioSpreadProfile {
  readonly spread_profile_id: string;

  readonly scenario_set_id: string;

  readonly primary_scenario_ref: string;
  readonly secondary_scenario_ref?: string;

  readonly primary_confidence_score: number;
  readonly secondary_confidence_score: number;

  readonly spread_score: number;
  readonly spread_class: L12ScenarioSpreadClass;

  readonly spread_reason_codes: readonly string[];

  readonly shift_conditions_required: boolean;

  readonly active_invalidation_present: boolean;
  readonly contradiction_unresolved: boolean;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}
