/**
 * L9.4 — L9RepairAdapter
 *
 * §9.4.15.4 — Governs repair (late-data) runs. A repair run must:
 *   • be explicitly marked as REPAIR (replay_mode_flag)
 *   • cite a parent run
 *   • carry a repair_reason
 *   • never masquerade as LIVE
 *   • justify semantic drift (primary/secondary state or coexistence
 *     class change) with a repair reason
 */

import type { L9SequenceOutputContract } from '../contracts/sequence-output.contract';
import type { L9SequenceRun } from '../runtime/sequence-compute-run';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';

export interface L9RepairVerificationResult {
  readonly ok: boolean;
  readonly violations: readonly L9RuntimeViolation[];
}

export interface L9RepairVerifyInput {
  readonly repair_run: L9SequenceRun;
  readonly prior_output: L9SequenceOutputContract;
  readonly repaired_output: L9SequenceOutputContract;
  readonly repair_reason: string | null;
}

export function verifyL9Repair(
  input: L9RepairVerifyInput,
): L9RepairVerificationResult {
  const violations: L9RuntimeViolation[] = [];
  const subjectId = input.prior_output.sequence_subject_id;

  if (input.repair_run.mode !== 'REPAIR') {
    violations.push(v(
      L9RuntimeViolationCode.REPAIR_UNMARKED,
      subjectId,
      `repair run must have mode=REPAIR (got ${input.repair_run.mode})`,
    ));
  }

  if (!input.repair_run.parent_run_id) {
    violations.push(v(
      L9RuntimeViolationCode.REPAIR_LINEAGE_BROKEN,
      subjectId,
      'repair run missing parent_run_id',
    ));
  }

  if (!input.repair_reason || input.repair_reason.trim().length === 0) {
    violations.push(v(
      L9RuntimeViolationCode.REPAIR_REASON_MISSING,
      subjectId,
      'repair run missing repair_reason',
    ));
  }

  if (input.repaired_output.replay_mode_flag === 'LIVE') {
    violations.push(v(
      L9RuntimeViolationCode.REPAIR_LIVE_MASQUERADE,
      subjectId,
      'repaired output emitted with replay_mode_flag=LIVE',
    ));
  }

  if (!input.repaired_output.repair_mode_flag) {
    violations.push(v(
      L9RuntimeViolationCode.REPAIR_UNMARKED,
      subjectId,
      'repaired output missing repair_mode_flag=true',
    ));
  }

  const drift =
    input.prior_output.primary_sequence_state !==
      input.repaired_output.primary_sequence_state ||
    input.prior_output.secondary_sequence_state !==
      input.repaired_output.secondary_sequence_state ||
    input.prior_output.coexistence_class !==
      input.repaired_output.coexistence_class;
  if (drift && (!input.repair_reason || input.repair_reason.length < 5)) {
    violations.push(v(
      L9RuntimeViolationCode.REPAIR_SEMANTIC_DRIFT_UNJUSTIFIED,
      subjectId,
      'repair run drifted semantics without a substantive reason',
    ));
  }

  return { ok: violations.length === 0, violations };
}

function v(
  code: L9RuntimeViolationCode,
  subjectId: string,
  detail: string,
): L9RuntimeViolation {
  return {
    code,
    source: 'l9-repair-adapter',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: subjectId,
    detail,
    context: {},
  };
}
