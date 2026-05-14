/**
 * L12.4 — Execution context validator (§12.4.29).
 *
 * Validates stage law: no later-stage artifact can be present before its
 * predecessor's slot is filled, and the sealed_stages set is monotonic.
 */

import { L12DagStage } from '../runtime/scenario-dag-node';
import type { L12ScenarioExecutionContext } from '../runtime/scenario-execution-context';

import {
  L12RuntimeViolationCode,
  L12RuntimeViolationIssue,
  l12IssueOf,
} from './l12-runtime-violation-codes';

export interface ValidateL12ExecutionContextResult {
  readonly ok: boolean;
  readonly issues: readonly L12RuntimeViolationIssue[];
}

interface StageBinding {
  readonly stage: L12DagStage;
  readonly slot: keyof L12ScenarioExecutionContext;
  readonly required: boolean;
}

const STAGE_BINDINGS: readonly StageBinding[] = [
  { stage: L12DagStage.STAGE_00_INPUT_SURFACES, slot: 'input_surfaces', required: true },
  { stage: L12DagStage.STAGE_01_SCENARIO_SUBJECT, slot: 'scenario_subject', required: true },
  { stage: L12DagStage.STAGE_02_INPUT_RESOLUTION, slot: 'input_resolution', required: true },
  { stage: L12DagStage.STAGE_03_CANDIDATE_GENERATION, slot: 'candidate_set', required: true },
  { stage: L12DagStage.STAGE_04_CONDITION_RESOLUTION, slot: 'condition_set', required: true },
  { stage: L12DagStage.STAGE_05_TRIGGER_RESOLUTION, slot: 'trigger_set', required: true },
  { stage: L12DagStage.STAGE_06_INVALIDATION_RESOLUTION, slot: 'invalidation_set', required: true },
  { stage: L12DagStage.STAGE_07_PATH_CONSTRUCTION, slot: 'constructed_paths', required: true },
  { stage: L12DagStage.STAGE_08_PATH_CONFIDENCE, slot: 'path_confidence', required: true },
  { stage: L12DagStage.STAGE_09_SCENARIO_RANKING, slot: 'ranking', required: true },
  { stage: L12DagStage.STAGE_10_SHIFT_CONDITIONS, slot: 'shift_conditions', required: false },
  { stage: L12DagStage.STAGE_11_RESTRICTIONS, slot: 'restrictions', required: true },
  { stage: L12DagStage.STAGE_12_EVIDENCE_PACK, slot: 'evidence_pack', required: true },
  { stage: L12DagStage.STAGE_13_MATERIALIZATION, slot: 'materialization_intent', required: true },
];

export function validateL12ExecutionContext(
  ctx: L12ScenarioExecutionContext,
  options?: { readonly require_complete?: boolean },
): ValidateL12ExecutionContextResult {
  const issues: L12RuntimeViolationIssue[] = [];

  // sealed_stages must be monotonic and within bounds
  const sealedSorted = [...ctx.sealed_stages].sort((a, b) => a - b);
  for (let i = 0; i < sealedSorted.length - 1; i++) {
    if (sealedSorted[i] === sealedSorted[i + 1]) {
      issues.push(
        l12IssueOf(
          L12RuntimeViolationCode.L12R_STAGE_MUTATED_AFTER_SEAL,
          `duplicate sealed stage ${sealedSorted[i]}`,
        ),
      );
    }
  }

  // For each binding: if a later slot is filled but an earlier *required*
  // slot is empty, that's stage bypass.
  let highestFilledStage: L12DagStage | -1 = -1;
  for (const b of STAGE_BINDINGS) {
    const filled = (ctx as unknown as Record<string, unknown>)[b.slot] !== undefined;
    if (filled) highestFilledStage = b.stage;
  }
  for (const b of STAGE_BINDINGS) {
    if (b.stage <= highestFilledStage && b.required) {
      const filled = (ctx as unknown as Record<string, unknown>)[b.slot] !== undefined;
      if (!filled) {
        issues.push(
          l12IssueOf(
            L12RuntimeViolationCode.L12R_STAGE_BYPASS,
            `stage ${b.stage} (${String(b.slot)}) skipped`,
            undefined,
            b.stage,
          ),
        );
      }
    }
  }

  if (options?.require_complete) {
    for (const b of STAGE_BINDINGS) {
      if (b.required) {
        const filled = (ctx as unknown as Record<string, unknown>)[b.slot] !== undefined;
        if (!filled) {
          issues.push(
            l12IssueOf(
              L12RuntimeViolationCode.L12R_EXECUTION_CONTEXT_INVALID,
              `complete-run missing required slot ${String(b.slot)}`,
              undefined,
              b.stage,
            ),
          );
        }
      }
    }
  }

  return { ok: issues.length === 0, issues };
}
