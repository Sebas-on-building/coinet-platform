/**
 * L12.4 — Scenario compute run validator (§12.4.29).
 */

import {
  L12ScenarioComputeRun,
  checkL12ScenarioComputeRunModeLaw,
} from '../runtime/scenario-compute-run';
import {
  L12RuntimeViolationCode,
  L12RuntimeViolationIssue,
  l12IssueOf,
} from './l12-runtime-violation-codes';

export interface ValidateL12ComputeRunResult {
  readonly ok: boolean;
  readonly issues: readonly L12RuntimeViolationIssue[];
}

export function validateL12ScenarioComputeRun(
  run: L12ScenarioComputeRun,
): ValidateL12ComputeRunResult {
  const issues: L12RuntimeViolationIssue[] = [];
  const modeIssues = checkL12ScenarioComputeRunModeLaw(run);
  for (const m of modeIssues) {
    issues.push(
      l12IssueOf(L12RuntimeViolationCode.L12R_COMPUTE_RUN_MODE_LAW, m, run.compute_run_id),
    );
  }
  if (!run.replay_hash) {
    issues.push(
      l12IssueOf(
        L12RuntimeViolationCode.L12R_COMPUTE_RUN_REPLAY_HASH_MISSING,
        'compute run replay_hash missing',
        run.compute_run_id,
      ),
    );
  }
  return { ok: issues.length === 0, issues };
}
