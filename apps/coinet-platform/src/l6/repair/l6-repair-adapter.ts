/**
 * L6.4 — RepairAdapter
 *
 * §6.4.3.8 / §6.4.8.4 — Rebuilds missing outputs under explicit repair mode.
 * Repair is NEVER allowed to invent new truth: only the four repair origins
 * below are legal. Repaired outputs carry an origin tag that never collides
 * with live or replay outputs.
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

export enum L6RepairOrigin {
  MISSING_OUTPUT_REBUILD = 'MISSING_OUTPUT_REBUILD',
  MISSING_EVIDENCE_REBUILD = 'MISSING_EVIDENCE_REBUILD',
  INCOMPLETE_MATERIALIZATION_REBUILD = 'INCOMPLETE_MATERIALIZATION_REBUILD',
  LATE_DATA_GOVERNED_REMATERIALIZATION = 'LATE_DATA_GOVERNED_REMATERIALIZATION',
}

export const ALL_REPAIR_ORIGINS: readonly L6RepairOrigin[] = Object.values(L6RepairOrigin);

export interface L6RepairFeatureRequest {
  readonly origin: L6RepairOrigin;
  readonly definition: FeatureDefinitionContract;
  readonly dag_version: string;
  readonly trace_id: string;
  readonly as_of: string;
  readonly input_snapshot_ref: string;
  readonly buildRequest: (compute_run: L6ComputeRun) => L6FeatureComputeRequest;
  readonly computor: L6FeatureComputor;
}

export interface L6RepairResult {
  readonly compute_run: L6ComputeRun;
  readonly output: FeatureOutput;
  readonly origin: L6RepairOrigin;
  readonly blocked: boolean;
  readonly semantic_drift: boolean;
  readonly original_replay_hash: string | null;
}

export class L6RepairAdapter {
  private readonly engine = new FeatureComputeEngine();

  repairFeature(req: L6RepairFeatureRequest, originalReplayHash: string | null): L6RepairResult {
    const compute_run: L6ComputeRun = {
      compute_run_id: mintComputeRunId('repair'),
      dag_version: req.dag_version,
      definition_version_set: [{ primitive_id: req.definition.primitive_id, version: req.definition.version }],
      trigger_source: L6TriggerSource.REPAIR_REQUEST,
      scope_set: [],
      as_of: req.as_of,
      input_snapshot_ref: req.input_snapshot_ref,
      mode: L6ComputeRunMode.REPAIR,
      ...computeRunModeFlags(L6ComputeRunMode.REPAIR),
      trace_id: req.trace_id,
      parent_compute_run_id: null,
      started_at: new Date().toISOString(),
    };

    const result = this.engine.compute(req.buildRequest(compute_run), req.computor);

    let drift = false;
    if (originalReplayHash != null
      && req.origin !== L6RepairOrigin.LATE_DATA_GOVERNED_REMATERIALIZATION) {
      drift = result.output.lineage.replay_hash !== originalReplayHash;
    }

    return {
      compute_run,
      output: result.output,
      origin: req.origin,
      blocked: result.blocked,
      semantic_drift: drift,
      original_replay_hash: originalReplayHash,
    };
  }
}
