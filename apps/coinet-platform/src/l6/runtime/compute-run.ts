/**
 * L6.4 — Compute Run Identity
 *
 * §6.4.2.7 — Every execution graph must carry a full identity record so the
 * runtime can answer: what ran, for which scopes, using which definitions,
 * against which input snapshot, under what mode (live / replay / repair).
 */

import { L6ScopeRef } from './dag-node';

export enum L6ComputeRunMode {
  LIVE = 'LIVE',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
  LATE_DATA_RECOVERY = 'LATE_DATA_RECOVERY',
}

export const ALL_COMPUTE_RUN_MODES: readonly L6ComputeRunMode[] = Object.values(L6ComputeRunMode);

export enum L6TriggerSource {
  NEW_FACT = 'NEW_FACT',
  LATE_FACT = 'LATE_FACT',
  SCHEDULED = 'SCHEDULED',
  REPLAY_REQUEST = 'REPLAY_REQUEST',
  REPAIR_REQUEST = 'REPAIR_REQUEST',
  DEPENDENCY_PROPAGATION = 'DEPENDENCY_PROPAGATION',
}

export const ALL_TRIGGER_SOURCES: readonly L6TriggerSource[] = Object.values(L6TriggerSource);

export interface L6DefinitionVersionRef {
  readonly primitive_id: string;
  readonly version: string;
}

export interface L6ComputeRun {
  readonly compute_run_id: string;
  readonly dag_version: string;
  readonly definition_version_set: readonly L6DefinitionVersionRef[];
  readonly trigger_source: L6TriggerSource;
  readonly scope_set: readonly L6ScopeRef[];
  readonly as_of: string;
  readonly input_snapshot_ref: string;
  readonly mode: L6ComputeRunMode;
  readonly replay_mode_flag: boolean;
  readonly repair_mode_flag: boolean;
  readonly trace_id: string;
  readonly parent_compute_run_id: string | null;
  readonly started_at: string;
}

export function isHistoricalMode(mode: L6ComputeRunMode): boolean {
  return mode === L6ComputeRunMode.REPLAY
    || mode === L6ComputeRunMode.REPAIR
    || mode === L6ComputeRunMode.LATE_DATA_RECOVERY;
}

export function computeRunModeFlags(mode: L6ComputeRunMode): {
  replay_mode_flag: boolean;
  repair_mode_flag: boolean;
} {
  return {
    replay_mode_flag: mode === L6ComputeRunMode.REPLAY,
    repair_mode_flag: mode === L6ComputeRunMode.REPAIR,
  };
}

let _runSeq = 0;
export function mintComputeRunId(prefix = 'run'): string {
  _runSeq += 1;
  return `${prefix}-${_runSeq.toString().padStart(10, '0')}-${Date.now().toString(36)}`;
}

export function resetComputeRunSequence(): void {
  _runSeq = 0;
}
