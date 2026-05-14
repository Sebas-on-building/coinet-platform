/**
 * L12.4 — Runtime replay adapter (§12.4.26).
 *
 * Verifies replay-hash equality across all stage artifacts and rejects
 * runs that "invent" evidence, erase invalidations / triggers, change
 * primary/secondary without a drift reason, write current state, ignore
 * L11 score context, or leak prediction theater.
 */

import type { L12ScenarioComputeRun } from '../runtime/scenario-compute-run';
import { L12ScenarioRunMode } from '../runtime/scenario-compute-run';
import type { L12ScenarioDag } from '../runtime/scenario-dag-builder';
import type { L12ScenarioExecutionContext } from '../runtime/scenario-execution-context';

export interface L12ReplayHashWindow {
  readonly dag_hash: string;
  readonly subject_hash: string;
  readonly input_resolution_hash: string;
  readonly candidate_set_hash: string;
  readonly condition_set_hash: string;
  readonly trigger_set_hash: string;
  readonly invalidation_set_hash: string;
  readonly path_construction_hash: string;
  readonly path_confidence_hash: string;
  readonly ranking_hash: string;
  readonly shift_condition_hash: string;
  readonly restriction_hash: string;
  readonly evidence_pack_hash: string;
  readonly materialization_intent_hash: string;
}

export function buildL12ReplayHashWindow(
  ctx: L12ScenarioExecutionContext,
): L12ReplayHashWindow {
  return {
    dag_hash: ctx.dag.replay_hash,
    subject_hash: ctx.scenario_subject?.replay_hash ?? '',
    input_resolution_hash: ctx.input_resolution?.replay_hash ?? '',
    candidate_set_hash: ctx.candidate_set?.replay_hash ?? '',
    condition_set_hash: ctx.condition_set?.replay_hash ?? '',
    trigger_set_hash: ctx.trigger_set?.replay_hash ?? '',
    invalidation_set_hash: ctx.invalidation_set?.replay_hash ?? '',
    path_construction_hash: ctx.constructed_paths?.replay_hash ?? '',
    path_confidence_hash: ctx.path_confidence?.replay_hash ?? '',
    ranking_hash: ctx.ranking?.replay_hash ?? '',
    shift_condition_hash: ctx.shift_conditions?.replay_hash ?? '',
    restriction_hash: ctx.restrictions?.replay_hash ?? '',
    evidence_pack_hash: ctx.evidence_pack?.replay_hash ?? '',
    materialization_intent_hash: ctx.materialization_intent?.replay_hash ?? '',
  };
}

export interface L12ReplayCheckArgs {
  readonly source_run: L12ScenarioComputeRun;
  readonly source_window: L12ReplayHashWindow;
  readonly source_dag: L12ScenarioDag;

  readonly replay_run: L12ScenarioComputeRun;
  readonly replay_window: L12ReplayHashWindow;
  readonly replay_dag: L12ScenarioDag;

  /** True if replay run *attempted* to add scenario evidence not in source. */
  readonly attempts_to_invent_evidence?: boolean;
  /** True if replay run *attempted* to erase invalidations from source. */
  readonly attempts_to_erase_invalidation?: boolean;
  /** True if replay run *attempted* to erase triggers from source. */
  readonly attempts_to_erase_trigger?: boolean;
  /** True if replay run *attempted* to write current state. */
  readonly attempts_to_write_current?: boolean;
  /** True if replay run *attempted* to ignore L11 score context. */
  readonly attempts_to_ignore_l11_context?: boolean;
  /** True if replay run *attempted* to change primary/secondary without drift reason. */
  readonly changes_primary_or_secondary_without_drift_reason?: boolean;
}

export interface L12ReplayCheckResult {
  readonly ok: boolean;
  readonly issues: readonly string[];
}

export function checkL12ReplayMatch(args: L12ReplayCheckArgs): L12ReplayCheckResult {
  const issues: string[] = [];

  if (args.replay_run.run_mode !== L12ScenarioRunMode.REPLAY) {
    issues.push('replay run mode must be REPLAY');
  }
  if (!args.replay_run.replay_source_run_id) {
    issues.push('replay run missing replay_source_run_id');
  }
  if (
    args.replay_run.replay_source_run_id &&
    args.replay_run.replay_source_run_id !== args.source_run.compute_run_id
  ) {
    issues.push('replay_source_run_id does not match source compute_run_id');
  }

  // Hash window equality
  const fields = Object.keys(args.source_window) as Array<keyof L12ReplayHashWindow>;
  for (const f of fields) {
    if (args.source_window[f] !== args.replay_window[f]) {
      issues.push(`replay hash mismatch on ${String(f)}`);
    }
  }
  if (args.source_dag.replay_hash !== args.replay_dag.replay_hash) {
    issues.push('DAG replay hash mismatch');
  }

  if (args.attempts_to_invent_evidence) issues.push('replay attempts to invent evidence');
  if (args.attempts_to_erase_invalidation) issues.push('replay attempts to erase invalidation');
  if (args.attempts_to_erase_trigger) issues.push('replay attempts to erase trigger');
  if (args.attempts_to_write_current) issues.push('replay attempts to write current state');
  if (args.attempts_to_ignore_l11_context) issues.push('replay attempts to ignore L11 context');
  if (args.changes_primary_or_secondary_without_drift_reason) {
    issues.push('replay changes primary/secondary without drift reason');
  }

  return { ok: issues.length === 0, issues };
}
