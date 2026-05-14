/**
 * L12.2 — ScenarioSet (§12.2.5).
 *
 * Complete scenario result for one subject. Must preserve path competition.
 */

export enum L12ScenarioSpreadClass {
  CLEAR_PRIMARY = 'CLEAR_PRIMARY',
  MODERATE_PRIMARY = 'MODERATE_PRIMARY',
  NARROW_PRIMARY = 'NARROW_PRIMARY',
  UNRESOLVED_COMPETITION = 'UNRESOLVED_COMPETITION',
  INSUFFICIENT_SCENARIO_COMPETITION = 'INSUFFICIENT_SCENARIO_COMPETITION',
}

export const ALL_L12_SCENARIO_SPREAD_CLASSES: readonly L12ScenarioSpreadClass[] =
  Object.values(L12ScenarioSpreadClass);

export enum L12MultiPathClass {
  BASE_WITH_ALTERNATIVES = 'BASE_WITH_ALTERNATIVES',
  BASE_WITH_CLOSE_SECONDARY = 'BASE_WITH_CLOSE_SECONDARY',
  MULTI_PATH_UNRESOLVED = 'MULTI_PATH_UNRESOLVED',
  SINGLE_PATH_BLOCKED = 'SINGLE_PATH_BLOCKED',
  INSUFFICIENT_INPUTS_FOR_ALTERNATIVES = 'INSUFFICIENT_INPUTS_FOR_ALTERNATIVES',
}

export const ALL_L12_MULTI_PATH_CLASSES: readonly L12MultiPathClass[] =
  Object.values(L12MultiPathClass);

export interface L12ScenarioSet {
  readonly scenario_set_id: string;
  readonly scenario_subject_id: string;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly base_case_ref: string;

  readonly bullish_scenario_refs: readonly string[];
  readonly bearish_scenario_refs: readonly string[];
  readonly neutral_scenario_refs: readonly string[];
  readonly stress_scenario_refs: readonly string[];
  readonly recovery_scenario_refs: readonly string[];

  readonly primary_scenario_ref: string;
  readonly secondary_scenario_ref: string;

  readonly scenario_count: number;

  readonly scenario_spread_score: number;
  readonly scenario_spread_class: L12ScenarioSpreadClass;

  readonly multi_path_class: L12MultiPathClass;

  readonly path_confidence_profile_ref: string;
  readonly trigger_profile_refs: readonly string[];
  readonly invalidation_profile_refs: readonly string[];
  readonly shift_condition_set_ref: string;
  readonly restriction_profile_ref: string;

  readonly supporting_evidence_refs: readonly string[];
  readonly contradicting_evidence_refs: readonly string[];

  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;

  readonly compute_run_id: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}

/** Spread classes that count as "narrow / unresolved". */
export function isL12NarrowOrUnresolvedSpread(c: L12ScenarioSpreadClass): boolean {
  return (
    c === L12ScenarioSpreadClass.NARROW_PRIMARY ||
    c === L12ScenarioSpreadClass.UNRESOLVED_COMPETITION
  );
}

/** Multi-path classes that allow legal single-path output (with disclosure). */
export function isL12LegalSinglePathClass(c: L12MultiPathClass): boolean {
  return (
    c === L12MultiPathClass.SINGLE_PATH_BLOCKED ||
    c === L12MultiPathClass.INSUFFICIENT_INPUTS_FOR_ALTERNATIVES
  );
}
