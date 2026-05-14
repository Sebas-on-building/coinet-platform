/**
 * L12.3 — Scenario set contract (§12.3.5).
 */

import { L12ScenarioCoexistenceClass } from './scenario-coexistence';
import {
  L12MultiPathClass,
  L12ScenarioSpreadClass,
} from './scenario-set';

export interface L12ScenarioSetContract {
  readonly scenario_set_contract_id: string;

  readonly scenario_set_id: string;
  readonly scenario_subject_id: string;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly base_case_ref: string;

  readonly scenario_refs: readonly string[];

  readonly bullish_scenario_refs: readonly string[];
  readonly bearish_scenario_refs: readonly string[];
  readonly neutral_scenario_refs: readonly string[];
  readonly stress_scenario_refs: readonly string[];
  readonly recovery_scenario_refs: readonly string[];

  readonly primary_scenario_ref: string;
  readonly secondary_scenario_ref?: string;

  readonly scenario_count: number;

  readonly scenario_spread_score: number;
  readonly scenario_spread_class: L12ScenarioSpreadClass;

  readonly coexistence_class: L12ScenarioCoexistenceClass;
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
