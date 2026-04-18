/**
 * L7.4 — L7RepairAdapter
 *
 * §7.4.8.6 — Repair reruns validation under a REPAIR mode and persists
 * the new output as a repair-lineage record. Repair must preserve the
 * original run's lineage (`parent_run_id`) and must emit a new
 * `validation_run_id`. Silent repair is a structural violation.
 */

import type { L7ValidationOutputContract } from '../contracts/validation-output.contract';
import { L7RuntimeViolation, L7RuntimeViolationCode } from '../validation/l7-runtime-violation-codes';
import { L7EngineResult, fail, ok } from './engine-types';

export interface RepairHandoffInput {
  readonly original: L7ValidationOutputContract;
  readonly repaired: L7ValidationOutputContract;
  readonly repair_reason_codes: readonly string[];
  readonly parent_run_id: string;
}

export function validateRepairHandoff(
  input: RepairHandoffInput,
): L7EngineResult<L7ValidationOutputContract> {
  const violations: L7RuntimeViolation[] = [];

  if (!input.repaired.repair_mode_flag) {
    violations.push({
      code: L7RuntimeViolationCode.REPAIR_UNMARKED,
      source: 'l7-repair-adapter',
      nodeId: null,
      validation_run_id: input.repaired.compute_run_id,
      validation_subject_id: input.repaired.validation_subject_id,
      detail: 'repaired output missing repair_mode_flag',
      context: {},
    });
  }
  if (input.repaired.replay_mode_flag !== 'REPAIR') {
    violations.push({
      code: L7RuntimeViolationCode.REPAIR_UNMARKED,
      source: 'l7-repair-adapter',
      nodeId: null,
      validation_run_id: input.repaired.compute_run_id,
      validation_subject_id: input.repaired.validation_subject_id,
      detail: `repaired output replay_mode_flag is ${input.repaired.replay_mode_flag}, expected REPAIR`,
      context: {},
    });
  }
  if (input.repaired.compute_run_id === input.original.compute_run_id) {
    violations.push({
      code: L7RuntimeViolationCode.REPAIR_LINEAGE_BROKEN,
      source: 'l7-repair-adapter',
      nodeId: null,
      validation_run_id: input.repaired.compute_run_id,
      validation_subject_id: input.repaired.validation_subject_id,
      detail: 'repaired output must carry new compute_run_id',
      context: {},
    });
  }
  if (!input.parent_run_id || input.parent_run_id !== input.original.compute_run_id) {
    violations.push({
      code: L7RuntimeViolationCode.REPAIR_LINEAGE_BROKEN,
      source: 'l7-repair-adapter',
      nodeId: null,
      validation_run_id: input.repaired.compute_run_id,
      validation_subject_id: input.repaired.validation_subject_id,
      detail: 'repair parent_run_id does not point at the original compute_run_id',
      context: {},
    });
  }
  if (input.repair_reason_codes.length === 0) {
    violations.push({
      code: L7RuntimeViolationCode.REPAIR_UNMARKED,
      source: 'l7-repair-adapter',
      nodeId: null,
      validation_run_id: input.repaired.compute_run_id,
      validation_subject_id: input.repaired.validation_subject_id,
      detail: 'repair requires at least one repair_reason_code',
      context: {},
    });
  }
  if (
    input.original.validation_subject_id !== input.repaired.validation_subject_id ||
    input.original.subject_contract_ref !== input.repaired.subject_contract_ref
  ) {
    violations.push({
      code: L7RuntimeViolationCode.REPAIR_LINEAGE_BROKEN,
      source: 'l7-repair-adapter',
      nodeId: null,
      validation_run_id: input.repaired.compute_run_id,
      validation_subject_id: input.repaired.validation_subject_id,
      detail: 'repair subject/contract references do not match original',
      context: {},
    });
  }

  if (violations.length > 0) return fail(violations);
  return ok(input.repaired);
}
