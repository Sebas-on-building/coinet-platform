/**
 * L12.2 — ScenarioSubject (§12.2.4).
 *
 * The anchor of all scenario paths: defines what the scenario computation is
 * about (scope, as_of, requested families, required input refs, horizon).
 */

import { L12ScenarioFamily } from './scenario-family';
import {
  L12ScenarioTimeHorizon,
  L12ScenarioWindow,
} from './scenario-time-horizon';

export enum L12ScenarioSubjectClass {
  ASSET_SCENARIO = 'ASSET_SCENARIO',
  MARKET_SCENARIO = 'MARKET_SCENARIO',
  SECTOR_SCENARIO = 'SECTOR_SCENARIO',
  ECOSYSTEM_SCENARIO = 'ECOSYSTEM_SCENARIO',
  PORTFOLIO_CONTEXT_SCENARIO = 'PORTFOLIO_CONTEXT_SCENARIO',
  EVENT_ANCHORED_SCENARIO = 'EVENT_ANCHORED_SCENARIO',
  POST_UNLOCK_SCENARIO = 'POST_UNLOCK_SCENARIO',
  SHOCK_RECOVERY_SCENARIO = 'SHOCK_RECOVERY_SCENARIO',
}

export const ALL_L12_SCENARIO_SUBJECT_CLASSES: readonly L12ScenarioSubjectClass[] =
  Object.values(L12ScenarioSubjectClass);

export interface L12ScenarioSubject {
  readonly scenario_subject_id: string;

  readonly subject_class: L12ScenarioSubjectClass;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly scope_granularity: string;

  readonly as_of: string;

  readonly requested_scenario_families: readonly L12ScenarioFamily[];
  readonly excluded_scenario_families: readonly L12ScenarioFamily[];

  readonly required_validation_refs: readonly string[];
  readonly required_regime_refs: readonly string[];
  readonly required_sequence_refs: readonly string[];
  readonly required_hypothesis_refs: readonly string[];
  readonly required_score_context_refs: readonly string[];

  readonly optional_context_refs: readonly string[];
  readonly historical_context_refs: readonly string[];
  readonly evidence_only_refs: readonly string[];

  readonly scenario_window: L12ScenarioWindow;
  readonly path_horizon: L12ScenarioTimeHorizon;

  readonly conditionality_policy_ref: string;
  readonly multi_path_policy_ref: string;

  readonly lineage_refs: readonly string[];
  readonly input_snapshot_ref: string;

  readonly policy_version: string;
  readonly replay_hash: string;
}
