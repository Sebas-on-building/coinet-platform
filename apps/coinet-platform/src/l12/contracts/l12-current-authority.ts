/**
 * L12.6 — Current authority records (§12.6.8).
 *
 * Postgres-backed current truth for scenarios, triggers, invalidations,
 * confidence, shift conditions, and restrictions. Every current row is
 * traceable to a compute run, an evidence pack, an input snapshot, and a
 * supersession chain.
 */

import { L12ScenarioOutputReadinessClass } from './scenario-output-readiness.contract';
import { L12ScenarioSpreadClass } from './scenario-set';

/** §12.6.8.2 — Reasons for superseding a current scenario record. */
export enum L12ScenarioSupersessionReason {
  NEW_LIVE_RUN = 'NEW_LIVE_RUN',
  REPAIR_CORRECTION = 'REPAIR_CORRECTION',
  LATE_DATA_CORRECTION = 'LATE_DATA_CORRECTION',
  TEMPLATE_VERSION_UPDATE = 'TEMPLATE_VERSION_UPDATE',
  RUNTIME_VERSION_UPDATE = 'RUNTIME_VERSION_UPDATE',
  EVIDENCE_CORRECTION = 'EVIDENCE_CORRECTION',
  MANUAL_GOVERNANCE_ACTION = 'MANUAL_GOVERNANCE_ACTION',
}

export const ALL_L12_SCENARIO_SUPERSESSION_REASONS: readonly L12ScenarioSupersessionReason[] =
  Object.values(L12ScenarioSupersessionReason);

/** §12.6.8.1 — Current scenario registry row. */
export interface L12CurrentScenarioRecord {
  readonly current_record_id: string;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly scenario_subject_id: string;
  readonly scenario_set_id: string;

  readonly base_case_ref: string;
  readonly primary_scenario_ref: string;
  readonly secondary_scenario_ref?: string;

  readonly scenario_spread_class: L12ScenarioSpreadClass;
  readonly readiness_class: L12ScenarioOutputReadinessClass;

  readonly path_confidence_profile_ref: string;
  readonly trigger_profile_refs: readonly string[];
  readonly invalidation_profile_refs: readonly string[];
  readonly shift_condition_set_ref: string;
  readonly restriction_profile_ref: string;

  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;

  readonly compute_run_id: string;
  readonly source_template_version: string;
  readonly source_runtime_version: string;

  readonly supersedes_current_record_id?: string;
  readonly supersession_reason?: L12ScenarioSupersessionReason;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly created_at: string;
  readonly policy_version: string;
}

/** Helper — true iff a record is in a clean-serving readiness class. */
export function isL12CleanCurrentReadiness(c: L12ScenarioOutputReadinessClass): boolean {
  return c === L12ScenarioOutputReadinessClass.CLEAN_EMISSION;
}

/** Helper — true iff a readiness class blocks live serving. */
export function isL12BlockedCurrentReadiness(c: L12ScenarioOutputReadinessClass): boolean {
  return (
    c === L12ScenarioOutputReadinessClass.BLOCKED_INSUFFICIENT_CONTRACT ||
    c === L12ScenarioOutputReadinessClass.BLOCKED_BY_RESTRICTION ||
    c === L12ScenarioOutputReadinessClass.BLOCKED_BY_PREDICTION_THEATER
  );
}
