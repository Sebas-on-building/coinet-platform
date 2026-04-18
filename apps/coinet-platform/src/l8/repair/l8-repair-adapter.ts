/**
 * L8.4 — L8RepairAdapter
 *
 * §8.4.7.5 — Requires an explicit repair reason, produces a new compute
 * run id, preserves parent-run linkage, distinguishes repair from live
 * recomputation, and never silently rewrites historical truth.
 */

import {
  L8RegimeRun,
  L8RegimeRunMode,
} from '../runtime/regime-compute-run';
import type { L8RegimeOutputContract } from '../contracts/regime-output.contract';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { L8EngineResult, fail, ok } from '../engine/engine-types';

export interface L8RepairVerificationInput {
  readonly repair_run: L8RegimeRun;
  readonly original_output: L8RegimeOutputContract;
  readonly repaired_output: L8RegimeOutputContract;
}

export interface L8RepairVerificationResult {
  readonly repair_distinct_from_live: boolean;
  readonly parent_lineage_preserved: boolean;
  readonly repair_reason: string;
}

export function verifyRegimeRepair(
  input: L8RepairVerificationInput,
): L8EngineResult<L8RepairVerificationResult> {
  const violations: L8RuntimeViolation[] = [];
  const run = input.repair_run;

  if (run.mode !== L8RegimeRunMode.REPAIR) {
    violations.push(v(
      L8RuntimeViolationCode.REPAIR_UNMARKED, run,
      `repair adapter invoked with mode=${run.mode}`, { mode: run.mode },
    ));
    return fail(violations);
  }

  if (!run.repair_reason) {
    violations.push(v(
      L8RuntimeViolationCode.REPAIR_REASON_MISSING, run,
      'repair run missing repair_reason', {},
    ));
    return fail(violations);
  }

  if (!run.parent_run_id) {
    violations.push(v(
      L8RuntimeViolationCode.REPAIR_LINEAGE_BROKEN, run,
      'repair run missing parent_run_id', {},
    ));
    return fail(violations);
  }

  // The repaired compute_run_id must differ from the original — otherwise
  // the repair is silently rewriting history.
  if (input.repaired_output.compute_run_id ===
      input.original_output.compute_run_id) {
    violations.push(v(
      L8RuntimeViolationCode.REPAIR_UNMARKED, run,
      'repaired output reuses original compute_run_id', {
        original: input.original_output.compute_run_id,
      },
    ));
    return fail(violations);
  }

  // Repair mode must be reflected in replay_mode_flag
  if (input.repaired_output.replay_mode_flag !== 'REPAIR') {
    violations.push(v(
      L8RuntimeViolationCode.REPAIR_UNMARKED, run,
      `repaired output replay_mode_flag=${input.repaired_output.replay_mode_flag}`,
      {},
    ));
    return fail(violations);
  }

  const parentLineagePreserved =
    input.repaired_output.lineage_refs.trace_id ===
      input.original_output.lineage_refs.trace_id ||
    input.repaired_output.lineage_refs.upstream_refs.includes(
      input.original_output.compute_run_id,
    );
  if (!parentLineagePreserved) {
    violations.push(v(
      L8RuntimeViolationCode.REPAIR_LINEAGE_BROKEN, run,
      'repaired output lineage does not reference original run', {},
    ));
    return fail(violations);
  }

  return ok({
    repair_distinct_from_live: true,
    parent_lineage_preserved: parentLineagePreserved,
    repair_reason: run.repair_reason,
  });
}

function v(
  code: L8RuntimeViolationCode,
  run: L8RegimeRun,
  detail: string,
  context: Record<string, unknown>,
): L8RuntimeViolation {
  return {
    code,
    source: 'l8-repair-adapter',
    nodeId: null,
    regime_run_id: run.regime_run_id,
    regime_subject_id: null,
    detail,
    context,
  };
}
