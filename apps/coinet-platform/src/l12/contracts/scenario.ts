/**
 * L12.2 — Scenario (§12.2.6).
 *
 * A single conditional path inside a scenario set.
 */

import { L12PathConfidenceBand } from './path-confidence-profile';
import { L12ScenarioFamily } from './scenario-family';
import { L12ScenarioReadinessClass } from './scenario-object-readiness';
import { L12ScenarioSummaryCode } from './scenario-summary-code';
import { L12ScenarioTimeHorizon } from './scenario-time-horizon';
import { L12ScenarioType } from './scenario-type';

export interface L12Scenario {
  readonly scenario_id: string;

  readonly scenario_set_id: string;
  readonly scenario_subject_id: string;

  readonly scenario_type: L12ScenarioType;
  readonly scenario_family: L12ScenarioFamily;

  readonly scenario_name: string;
  readonly scenario_summary_code: L12ScenarioSummaryCode;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly path_claim: string;

  readonly required_condition_refs: readonly string[];
  readonly supporting_condition_refs: readonly string[];
  readonly weakening_condition_refs: readonly string[];

  readonly trigger_refs: readonly string[];
  readonly invalidation_refs: readonly string[];

  readonly supporting_evidence_refs: readonly string[];
  readonly contradicting_evidence_refs: readonly string[];

  readonly required_confirmation_refs: readonly string[];
  readonly unresolved_dependency_refs: readonly string[];

  readonly path_confidence_score: number;
  readonly path_confidence_band: L12PathConfidenceBand;

  readonly path_time_horizon: L12ScenarioTimeHorizon;

  readonly readiness_class: L12ScenarioReadinessClass;

  readonly restriction_profile_ref: string;

  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;

  readonly compute_run_id: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}
