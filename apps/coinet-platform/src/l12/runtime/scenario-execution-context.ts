/**
 * L12.4 — Execution context (§12.4.12).
 *
 * The execution context carries every stage artifact through the runtime.
 * Artifact slots are narrowly typed (one slot per DAG stage). Stage sealing
 * is enforced by `sealL12ExecutionContextStage` which only adds to the
 * `sealed_stages` set and treats artifacts as append-only thereafter.
 */

import type { L12PathConfidenceContract } from '../contracts/path-confidence.contract';
import type { L12RestrictionContract } from '../contracts/scenario-restriction.contract';
import type { L12ScenarioEvidencePackContract } from '../contracts/scenario-evidence-pack.contract';
import type { L12ScenarioSubjectContract } from '../contracts/scenario-subject.contract';
import type { L12ShiftConditionContract } from '../contracts/scenario-shift-condition.contract';

import type { L12ScenarioCandidateSet } from '../engine/scenario-candidate-engine';
import type { L12ConstructedScenarioPaths } from '../engine/scenario-path-construction-engine';
import type { L12ResolvedConditionSet } from '../engine/scenario-condition-resolver';
import type {
  L12ResolvedInputSurfaces,
  L12ScenarioInputResolution,
} from '../engine/scenario-input-resolver';
import type { L12ResolvedInvalidationSet } from '../engine/scenario-invalidation-engine';
import type { L12ResolvedTriggerSet } from '../engine/scenario-trigger-engine';
import type { L12ScenarioRankingResult } from '../engine/scenario-ranking-engine';
import type { L12ScenarioMaterializationIntent } from '../materialization/scenario-materializer';

import type { L12ScenarioDag } from './scenario-dag-builder';
import type { L12ScenarioComputeRun } from './scenario-compute-run';
import { L12DagStage } from './scenario-dag-node';
import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';

export interface L12ScenarioExecutionContext {
  readonly context_id: string;

  readonly compute_run: L12ScenarioComputeRun;
  readonly dag: L12ScenarioDag;

  readonly input_surfaces?: L12ResolvedInputSurfaces;
  readonly scenario_subject?: L12ScenarioSubjectContract;
  readonly input_resolution?: L12ScenarioInputResolution;
  readonly candidate_set?: L12ScenarioCandidateSet;
  readonly condition_set?: L12ResolvedConditionSet;
  readonly trigger_set?: L12ResolvedTriggerSet;
  readonly invalidation_set?: L12ResolvedInvalidationSet;
  readonly constructed_paths?: L12ConstructedScenarioPaths;
  readonly path_confidence?: L12PathConfidenceContract;
  readonly ranking?: L12ScenarioRankingResult;
  readonly shift_conditions?: L12ShiftConditionContract;
  readonly restrictions?: L12RestrictionContract;
  readonly evidence_pack?: L12ScenarioEvidencePackContract;
  readonly materialization_intent?: L12ScenarioMaterializationIntent;

  readonly sealed_stages: readonly L12DagStage[];

  readonly policy_version: string;
}

export function buildL12ExecutionContext(input: {
  compute_run: L12ScenarioComputeRun;
  dag: L12ScenarioDag;
  policy_version: string;
}): L12ScenarioExecutionContext {
  const hash = buildL12ScenarioReplayHash({
    domain: 'l12.exec_context',
    policy_version: input.policy_version,
    material: {
      compute_run_id: input.compute_run.compute_run_id,
      dag_id: input.dag.dag_id,
    },
  });
  return {
    context_id: `l12.ctx.${hash}`,
    compute_run: input.compute_run,
    dag: input.dag,
    sealed_stages: [],
    policy_version: input.policy_version,
  };
}

/** §12.4.12 stage sealing law: append-only sealed_stages set. */
export interface L12StageSealResult {
  readonly ok: boolean;
  readonly issues: readonly string[];
  readonly context: L12ScenarioExecutionContext;
}

export function sealL12ExecutionContextStage(
  ctx: L12ScenarioExecutionContext,
  stage: L12DagStage,
  patch: Partial<
    Pick<
      L12ScenarioExecutionContext,
      | 'input_surfaces'
      | 'scenario_subject'
      | 'input_resolution'
      | 'candidate_set'
      | 'condition_set'
      | 'trigger_set'
      | 'invalidation_set'
      | 'constructed_paths'
      | 'path_confidence'
      | 'ranking'
      | 'shift_conditions'
      | 'restrictions'
      | 'evidence_pack'
      | 'materialization_intent'
    >
  >,
): L12StageSealResult {
  const issues: string[] = [];
  if (ctx.sealed_stages.includes(stage)) {
    issues.push(`stage ${stage} already sealed`);
  }
  // Append-only: cannot mutate already-sealed artifact slot.
  for (const key of Object.keys(patch) as Array<keyof typeof patch>) {
    if ((ctx as unknown as Record<string, unknown>)[key] !== undefined) {
      issues.push(`stage ${stage} would mutate already-sealed slot "${String(key)}"`);
    }
  }
  if (issues.length > 0) {
    return { ok: false, issues, context: ctx };
  }
  const next: L12ScenarioExecutionContext = {
    ...ctx,
    ...patch,
    sealed_stages: [...ctx.sealed_stages, stage].sort((a, b) => a - b),
  };
  return { ok: true, issues: [], context: next };
}
