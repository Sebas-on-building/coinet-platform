/**
 * L12.4 — Compute run model (§12.4.11).
 */

import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';

export enum L12ScenarioRunMode {
  LIVE = 'LIVE',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
  BACKFILL = 'BACKFILL',
  SHADOW = 'SHADOW',
}

export const ALL_L12_SCENARIO_RUN_MODES: readonly L12ScenarioRunMode[] =
  Object.values(L12ScenarioRunMode);

export enum L12ScenarioRunStatus {
  CREATED = 'CREATED',
  RUNNING = 'RUNNING',
  STAGE_SEALED = 'STAGE_SEALED',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  FAILED = 'FAILED',
}

export const ALL_L12_SCENARIO_RUN_STATUSES: readonly L12ScenarioRunStatus[] =
  Object.values(L12ScenarioRunStatus);

export interface L12ScenarioComputeRun {
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

  readonly sealed_stage_ids: readonly string[];

  readonly output_refs: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}

/** Deterministic compute run id. */
export function buildL12ComputeRunId(input: {
  scenario_subject_id: string;
  run_mode: L12ScenarioRunMode;
  as_of: string;
  scenario_engine_version: string;
  scenario_contract_version: string;
  parent_run_id?: string;
  replay_source_run_id?: string;
  policy_version: string;
}): string {
  const hash = buildL12ScenarioReplayHash({
    domain: 'l12.compute_run',
    policy_version: input.policy_version,
    material: {
      scenario_subject_id: input.scenario_subject_id,
      run_mode: input.run_mode,
      as_of: input.as_of,
      scenario_engine_version: input.scenario_engine_version,
      scenario_contract_version: input.scenario_contract_version,
      parent_run_id: input.parent_run_id ?? null,
      replay_source_run_id: input.replay_source_run_id ?? null,
    },
  });
  return `l12.run.${input.run_mode.toLowerCase()}.${hash}`;
}

export function buildL12ComputeRun(input: {
  scenario_subject_id: string;
  scope_type: string;
  scope_id: string;
  as_of: string;
  run_mode: L12ScenarioRunMode;
  scenario_engine_version: string;
  scenario_contract_version: string;
  scenario_template_version?: string;
  parent_run_id?: string;
  replay_source_run_id?: string;
  repair_reason?: string;
  started_at: string;
  policy_version: string;
}): L12ScenarioComputeRun {
  const compute_run_id = buildL12ComputeRunId({
    scenario_subject_id: input.scenario_subject_id,
    run_mode: input.run_mode,
    as_of: input.as_of,
    scenario_engine_version: input.scenario_engine_version,
    scenario_contract_version: input.scenario_contract_version,
    parent_run_id: input.parent_run_id,
    replay_source_run_id: input.replay_source_run_id,
    policy_version: input.policy_version,
  });
  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.compute_run.replay',
    policy_version: input.policy_version,
    material: {
      compute_run_id,
      run_mode: input.run_mode,
      scenario_subject_id: input.scenario_subject_id,
      scope_type: input.scope_type,
      scope_id: input.scope_id,
      as_of: input.as_of,
      scenario_engine_version: input.scenario_engine_version,
      scenario_contract_version: input.scenario_contract_version,
    },
  });
  return {
    compute_run_id,
    run_mode: input.run_mode,
    run_status: L12ScenarioRunStatus.CREATED,
    scenario_subject_id: input.scenario_subject_id,
    scope_type: input.scope_type,
    scope_id: input.scope_id,
    as_of: input.as_of,
    scenario_engine_version: input.scenario_engine_version,
    scenario_contract_version: input.scenario_contract_version,
    scenario_template_version: input.scenario_template_version,
    parent_run_id: input.parent_run_id,
    replay_source_run_id: input.replay_source_run_id,
    repair_reason: input.repair_reason,
    started_at: input.started_at,
    sealed_stage_ids: [],
    output_refs: [],
    lineage_refs: [],
    replay_hash,
    policy_version: input.policy_version,
  };
}

/**
 * Mode-specific structural law (§12.4.11). Returns a list of human-readable
 * issues; empty array means clean.
 */
export function checkL12ScenarioComputeRunModeLaw(
  run: L12ScenarioComputeRun,
): readonly string[] {
  const issues: string[] = [];
  switch (run.run_mode) {
    case L12ScenarioRunMode.LIVE:
      if (run.parent_run_id) issues.push('LIVE run must not have parent_run_id');
      if (run.replay_source_run_id) issues.push('LIVE run must not have replay_source_run_id');
      if (run.repair_reason) issues.push('LIVE run must not have repair_reason');
      break;
    case L12ScenarioRunMode.REPLAY:
      if (!run.replay_source_run_id) issues.push('REPLAY run requires replay_source_run_id');
      break;
    case L12ScenarioRunMode.REPAIR:
      if (!run.parent_run_id) issues.push('REPAIR run requires parent_run_id');
      if (!run.repair_reason) issues.push('REPAIR run requires repair_reason');
      if (run.parent_run_id && run.parent_run_id === run.compute_run_id)
        issues.push('REPAIR run requires distinct compute_run_id from parent');
      break;
    case L12ScenarioRunMode.BACKFILL:
    case L12ScenarioRunMode.SHADOW:
      break;
  }
  return issues;
}
