/**
 * L12.6 — Persistent run record (§12.6.3, §12.6.4).
 *
 * Postgres-backed authoritative row in `l12.scenario_runs`. Distinct from the
 * runtime `L12ScenarioComputeRun` (the compute-time object) — this is the
 * durable record that survives the run.
 */

import {
  L12ScenarioRunMode,
  L12ScenarioRunStatus,
} from '../runtime/scenario-compute-run';

export interface L12ScenarioRunRecord {
  readonly run_record_id: string;

  readonly compute_run_id: string;
  readonly run_mode: L12ScenarioRunMode;
  readonly run_status: L12ScenarioRunStatus;

  readonly scenario_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly scenario_engine_version: string;
  readonly scenario_contract_version: string;
  readonly scenario_template_version?: string;

  readonly parent_run_id?: string;
  readonly replay_source_run_id?: string;
  readonly repair_reason?: string;

  readonly started_at: string;
  readonly completed_at?: string;

  readonly evidence_pack_refs: readonly string[];
  readonly input_snapshot_refs: readonly string[];
  readonly output_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly replay_hash: string;
  readonly policy_version: string;

  readonly created_at: string;
}

/** True iff the run record claims to update current authority. */
export function l12RunMayUpdateCurrent(r: L12ScenarioRunRecord): boolean {
  return (
    r.run_mode === L12ScenarioRunMode.LIVE || r.run_mode === L12ScenarioRunMode.REPAIR
  );
}
