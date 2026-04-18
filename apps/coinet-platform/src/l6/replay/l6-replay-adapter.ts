/**
 * L6.4 — ReplayAdapter
 *
 * §6.4.3.8 / §6.4.8.3 — Executes a compute with historical definition version
 * context and asserts that the replayed replay_hash matches the original.
 * No semantic drift is allowed unless the output is explicitly tagged as
 * repaired or rematerialized (that is the RepairAdapter's job, not this one).
 */

import {
  L6ComputeRun,
  L6ComputeRunMode,
  L6TriggerSource,
  computeRunModeFlags,
  mintComputeRunId,
} from '../runtime/compute-run';
import { FeatureDefinitionContract } from '../contracts/feature-definition.contract';
import { FeatureOutput } from '../contracts/feature-output.contract';
import {
  FeatureComputeEngine,
  L6FeatureComputeRequest,
  L6FeatureComputor,
} from '../engine/feature-compute-engine';

export interface L6ReplayRequest {
  readonly original_compute_run_id: string;
  readonly definition: FeatureDefinitionContract;
  readonly dag_version: string;
  readonly trace_id: string;
  readonly as_of: string;
  readonly input_snapshot_ref: string;
  readonly buildRequest: (compute_run: L6ComputeRun) => L6FeatureComputeRequest;
  readonly computor: L6FeatureComputor;
}

export interface L6ReplayResult {
  readonly compute_run: L6ComputeRun;
  readonly output: FeatureOutput;
  readonly replay_hash_stable: boolean;
  readonly original_replay_hash: string | null;
  readonly blocked: boolean;
}

export class L6ReplayAdapter {
  private readonly engine = new FeatureComputeEngine();

  replayFeature(req: L6ReplayRequest, originalReplayHash: string | null): L6ReplayResult {
    const compute_run: L6ComputeRun = {
      compute_run_id: mintComputeRunId('replay'),
      dag_version: req.dag_version,
      definition_version_set: [{ primitive_id: req.definition.primitive_id, version: req.definition.version }],
      trigger_source: L6TriggerSource.REPLAY_REQUEST,
      scope_set: [],
      as_of: req.as_of,
      input_snapshot_ref: req.input_snapshot_ref,
      mode: L6ComputeRunMode.REPLAY,
      ...computeRunModeFlags(L6ComputeRunMode.REPLAY),
      trace_id: req.trace_id,
      parent_compute_run_id: req.original_compute_run_id,
      started_at: new Date().toISOString(),
    };

    const request = req.buildRequest(compute_run);
    const result = this.engine.compute(request, req.computor);
    const stable = originalReplayHash == null
      ? true
      : result.output.lineage.replay_hash === originalReplayHash;

    return {
      compute_run,
      output: result.output,
      replay_hash_stable: stable,
      original_replay_hash: originalReplayHash,
      blocked: result.blocked,
    };
  }
}
