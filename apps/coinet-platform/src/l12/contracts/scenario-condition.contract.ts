/**
 * L12.3 — Condition contract (§12.3.7).
 */

import {
  L12ConditionMaterialityClass,
  L12ConditionOperator,
  L12ConditionRole,
  L12ConditionSourceLayer,
  L12ConditionStatus,
  L12ScenarioConditionType,
} from './scenario-condition';

export interface L12ConditionContract {
  readonly condition_contract_id: string;

  readonly condition_id: string;
  readonly scenario_id: string;
  readonly scenario_set_id: string;

  readonly condition_type: L12ScenarioConditionType;
  readonly condition_role: L12ConditionRole;

  readonly source_layer: L12ConditionSourceLayer;
  readonly required_surface_ref: string;
  readonly current_state_ref: string;

  readonly operator: L12ConditionOperator;
  readonly threshold_value?: number;
  readonly expected_state?: string;

  readonly condition_status: L12ConditionStatus;
  readonly materiality_class: L12ConditionMaterialityClass;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly monitorable: boolean;
  readonly restriction_aware: boolean;
  readonly contradiction_aware: boolean;

  readonly policy_version: string;
  readonly replay_hash: string;
}
