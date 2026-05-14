/**
 * L12.6 — Historical surface contracts (§12.6.9).
 *
 * Append-only ClickHouse-backed historical fact families. Corrections create
 * new fact rows referencing the prior fact via `correction_of_fact_id`; prior
 * rows are never destructively mutated.
 */

import { L12ScenarioRunMode } from '../runtime/scenario-compute-run';

export enum L12HistoricalFactFamily {
  TS_SCENARIO_FACT_V1 = 'ts_scenario_fact_v1',
  TS_SCENARIO_TRIGGER_V1 = 'ts_scenario_trigger_v1',
  TS_SCENARIO_INVALIDATION_V1 = 'ts_scenario_invalidation_v1',
  TS_SCENARIO_CONFIDENCE_V1 = 'ts_scenario_confidence_v1',
  TS_SCENARIO_SHIFT_CONDITION_V1 = 'ts_scenario_shift_condition_v1',
  TS_SCENARIO_RESTRICTION_V1 = 'ts_scenario_restriction_v1',
  TS_SCENARIO_TRANSITION_V1 = 'ts_scenario_transition_v1',
  TS_SCENARIO_FAILURE_V1 = 'ts_scenario_failure_v1',
}

export const ALL_L12_HISTORICAL_FACT_FAMILIES: readonly L12HistoricalFactFamily[] =
  Object.values(L12HistoricalFactFamily);

/** §12.6.9.1 — Historical fact object. */
export interface L12HistoricalScenarioFact {
  readonly fact_id: string;

  readonly fact_family: L12HistoricalFactFamily;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly observed_at: string;
  readonly materialized_at: string;

  readonly scenario_subject_id: string;
  readonly scenario_set_id: string;

  readonly scenario_ref?: string;
  readonly trigger_ref?: string;
  readonly invalidation_ref?: string;
  readonly confidence_ref?: string;
  readonly shift_condition_ref?: string;
  readonly restriction_ref?: string;

  readonly fact_payload_ref: string;

  readonly compute_run_id: string;
  readonly run_mode: L12ScenarioRunMode;

  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;
  readonly lineage_refs: readonly string[];

  readonly correction_of_fact_id?: string;
  readonly correction_reason?: string;

  readonly replay_hash: string;
  readonly policy_version: string;
}

/**
 * Required ref for each historical fact family. Used by the historical-fact
 * validator to enforce that the right pointer field is populated.
 */
export const L12_HISTORICAL_FACT_REQUIRED_REF: Readonly<
  Record<L12HistoricalFactFamily, keyof L12HistoricalScenarioFact>
> = {
  [L12HistoricalFactFamily.TS_SCENARIO_FACT_V1]: 'scenario_ref',
  [L12HistoricalFactFamily.TS_SCENARIO_TRIGGER_V1]: 'trigger_ref',
  [L12HistoricalFactFamily.TS_SCENARIO_INVALIDATION_V1]: 'invalidation_ref',
  [L12HistoricalFactFamily.TS_SCENARIO_CONFIDENCE_V1]: 'confidence_ref',
  [L12HistoricalFactFamily.TS_SCENARIO_SHIFT_CONDITION_V1]: 'shift_condition_ref',
  [L12HistoricalFactFamily.TS_SCENARIO_RESTRICTION_V1]: 'restriction_ref',
  [L12HistoricalFactFamily.TS_SCENARIO_TRANSITION_V1]: 'scenario_ref',
  [L12HistoricalFactFamily.TS_SCENARIO_FAILURE_V1]: 'scenario_set_id',
};
