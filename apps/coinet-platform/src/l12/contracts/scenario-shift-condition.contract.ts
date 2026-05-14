/**
 * L12.3 — Shift-condition contract (§12.3.11).
 */

export interface L12ShiftConditionContract {
  readonly shift_condition_contract_id: string;

  readonly shift_condition_set_id: string;
  readonly scenario_set_id: string;

  readonly current_primary_scenario_ref: string;
  readonly current_secondary_scenario_ref?: string;

  readonly conditions_that_strengthen_primary: readonly string[];
  readonly conditions_that_weaken_primary: readonly string[];

  readonly conditions_that_promote_secondary: readonly string[];
  readonly conditions_that_collapse_base_case: readonly string[];

  readonly conditions_that_raise_bullish_path: readonly string[];
  readonly conditions_that_raise_bearish_path: readonly string[];

  readonly spread_narrowing_conditions: readonly string[];
  readonly spread_widening_conditions: readonly string[];

  readonly required_under_close_competition: boolean;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}

/** Posture inputs that determine whether a shift-condition set is required. */
export interface L12ShiftConditionRequirementPosture {
  readonly scenarioSpreadNarrow: boolean;
  readonly confidenceMediumOrLower: boolean;
  readonly secondaryPathClose: boolean;
  readonly activeInvalidationMaterial: boolean;
  readonly unresolvedTriggerScoreMaterial: boolean;
  readonly hypothesisSpreadNarrow: boolean;
  readonly driftOrMissingDataMaterial: boolean;
}

export function l12ShiftConditionsRequired(
  p: L12ShiftConditionRequirementPosture,
): boolean {
  return (
    p.scenarioSpreadNarrow ||
    p.confidenceMediumOrLower ||
    p.secondaryPathClose ||
    p.activeInvalidationMaterial ||
    p.unresolvedTriggerScoreMaterial ||
    p.hypothesisSpreadNarrow ||
    p.driftOrMissingDataMaterial
  );
}
