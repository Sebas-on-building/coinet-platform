/**
 * L12.2 — ScenarioShiftConditionSet (§12.2.14).
 *
 * Mandatory whenever scenario competition is narrow, secondary is close,
 * invalidation pressure is material, or visibility is limited.
 */

export interface L12ScenarioShiftConditionSet {
  readonly shift_condition_set_id: string;

  readonly scenario_set_id: string;

  readonly current_primary_scenario_ref: string;
  readonly current_secondary_scenario_ref: string;

  readonly conditions_that_strengthen_primary: readonly string[];
  readonly conditions_that_weaken_primary: readonly string[];

  readonly conditions_that_promote_secondary: readonly string[];
  readonly conditions_that_collapse_base_case: readonly string[];

  readonly conditions_that_raise_bullish_path: readonly string[];
  readonly conditions_that_raise_bearish_path: readonly string[];

  readonly spread_narrowing_conditions: readonly string[];
  readonly spread_widening_conditions: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}
