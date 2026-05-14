/**
 * L12.3 — Scenario subject contract (§12.3.3).
 */

import { L12ScenarioFamily } from './scenario-family';
import { L12ScenarioInputRequirement } from './scenario-input-requirement.contract';
import { L12ScenarioSubjectClass } from './scenario-subject';
import {
  L12ScenarioTimeHorizon,
  L12ScenarioWindow,
} from './scenario-time-horizon';
import {
  L12AlternativePathRequirementPolicy,
  L12BaseCaseRequirementPolicy,
  L12ContradictionConsumptionPolicy,
  L12DriftConsumptionPolicy,
  L12InvalidationRequirementPolicy,
  L12RestrictionConsumptionPolicy,
  L12ScenarioEvidencePackPolicy,
  L12ScenarioLineagePolicy,
  L12ScenarioMaterializationPolicy,
  L12ScoreContextConsumptionPolicy,
  L12ShiftConditionRequirementPolicy,
  L12TriggerRequirementPolicy,
} from './scenario-contract-policies';

export interface L12ScenarioSubjectContract {
  readonly scenario_subject_contract_id: string;

  readonly scenario_subject_id: string;
  readonly subject_contract_version: string;

  readonly subject_class: L12ScenarioSubjectClass;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly scope_granularity: string;

  readonly as_of: string;

  readonly allowed_scenario_families: readonly L12ScenarioFamily[];
  readonly forbidden_scenario_families: readonly L12ScenarioFamily[];

  readonly required_validation_inputs: readonly L12ScenarioInputRequirement[];
  readonly required_regime_inputs: readonly L12ScenarioInputRequirement[];
  readonly required_sequence_inputs: readonly L12ScenarioInputRequirement[];
  readonly required_hypothesis_inputs: readonly L12ScenarioInputRequirement[];
  readonly required_score_context_inputs: readonly L12ScenarioInputRequirement[];

  readonly required_context_inputs: readonly L12ScenarioInputRequirement[];
  readonly optional_context_inputs: readonly L12ScenarioInputRequirement[];
  readonly historical_inputs: readonly L12ScenarioInputRequirement[];
  readonly evidence_only_inputs: readonly L12ScenarioInputRequirement[];

  readonly scenario_window: L12ScenarioWindow;
  readonly path_horizon: L12ScenarioTimeHorizon;

  readonly base_case_requirement_policy: L12BaseCaseRequirementPolicy;
  readonly alternative_path_requirement_policy: L12AlternativePathRequirementPolicy;
  readonly trigger_requirement_policy: L12TriggerRequirementPolicy;
  readonly invalidation_requirement_policy: L12InvalidationRequirementPolicy;
  readonly shift_condition_requirement_policy: L12ShiftConditionRequirementPolicy;

  readonly l11_score_context_policy: L12ScoreContextConsumptionPolicy;

  readonly restriction_consumption_policy: L12RestrictionConsumptionPolicy;
  readonly contradiction_consumption_policy: L12ContradictionConsumptionPolicy;
  readonly drift_consumption_policy: L12DriftConsumptionPolicy;

  readonly evidence_pack_policy: L12ScenarioEvidencePackPolicy;
  readonly materialization_policy: L12ScenarioMaterializationPolicy;

  readonly lineage_policy: L12ScenarioLineagePolicy;

  readonly policy_version: string;
  readonly replay_hash: string;
}
