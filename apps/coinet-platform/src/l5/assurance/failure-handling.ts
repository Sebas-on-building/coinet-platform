/**
 * L5.7 Assurance — Failure Handling Doctrine
 *
 * §5.7.8 — Maps failure classes to operational behavior.
 */

import { L5FailureCode, L5FailureFamily, getFailureFamily } from './failure-family';
import { L5RepairClass } from './repair-class';

export interface FailureHandlingPolicy {
  readonly failure_code: L5FailureCode;
  readonly abort_durable_flow: boolean;
  readonly preserves_authority: boolean;
  readonly opens_repair_path: boolean;
  readonly blocks_finalization: boolean;
  readonly quarantine_required: boolean;
  readonly rejection_immediate: boolean;
  readonly default_repair_class: L5RepairClass;
  readonly escalation_required: boolean;
  readonly visible_in_metrics: boolean;
}

export function getHandlingPolicy(code: L5FailureCode): FailureHandlingPolicy {
  const family = getFailureFamily(code);

  switch (family) {
    case L5FailureFamily.F1_INGRESS_VALIDATION:
      return {
        failure_code: code, abort_durable_flow: true, preserves_authority: false,
        opens_repair_path: false, blocks_finalization: true, quarantine_required: false,
        rejection_immediate: true, default_repair_class: L5RepairClass.RP7_FATAL_NON_REPAIRABLE,
        escalation_required: false, visible_in_metrics: true,
      };

    case L5FailureFamily.F2_QUARANTINE_SEMANTIC:
      return {
        failure_code: code, abort_durable_flow: true, preserves_authority: false,
        opens_repair_path: code === L5FailureCode.LATE_DATA_REQUIRES_REVIEW,
        blocks_finalization: true, quarantine_required: true,
        rejection_immediate: false, default_repair_class: L5RepairClass.RP6_QUARANTINE_BOUND_REPAIR,
        escalation_required: true, visible_in_metrics: true,
      };

    case L5FailureFamily.F3_ARCHIVE_INTEGRITY:
      return {
        failure_code: code, abort_durable_flow: true, preserves_authority: false,
        opens_repair_path: code === L5FailureCode.ARCHIVE_POINTER_MISSING || code === L5FailureCode.ARCHIVE_TAG_POLICY_VIOLATION,
        blocks_finalization: true, quarantine_required: false,
        rejection_immediate: false,
        default_repair_class: code === L5FailureCode.ARCHIVE_POINTER_MISSING
          ? L5RepairClass.RP3_ARCHIVE_COMPLETENESS_REPAIR
          : L5RepairClass.RP7_FATAL_NON_REPAIRABLE,
        escalation_required: code === L5FailureCode.CHECKSUM_MISMATCH || code === L5FailureCode.REPLAY_BUNDLE_CORRUPTED,
        visible_in_metrics: true,
      };

    case L5FailureFamily.F4_TRANSACTION_COORDINATION:
      return {
        failure_code: code, abort_durable_flow: true, preserves_authority: false,
        opens_repair_path: false, blocks_finalization: true, quarantine_required: false,
        rejection_immediate: code === L5FailureCode.POSTGRES_TX_FAILED,
        default_repair_class: L5RepairClass.RP7_FATAL_NON_REPAIRABLE,
        escalation_required: true, visible_in_metrics: true,
      };

    case L5FailureFamily.F5_PROJECTION_MATERIALIZATION:
      return {
        failure_code: code,
        abort_durable_flow: false,
        preserves_authority: true,
        opens_repair_path: true,
        blocks_finalization: code !== L5FailureCode.REDIS_PROJECTION_FAILED,
        quarantine_required: false, rejection_immediate: false,
        default_repair_class: code === L5FailureCode.REDIS_PROJECTION_FAILED
          ? L5RepairClass.RP1_OPTIONAL_ACCELERATION_REPAIR
          : L5RepairClass.RP2_REQUIRED_PROJECTION_REPAIR,
        escalation_required: false, visible_in_metrics: true,
      };

    case L5FailureFamily.F6_SECURITY_ACCESS:
      return {
        failure_code: code, abort_durable_flow: true, preserves_authority: true,
        opens_repair_path: false, blocks_finalization: false, quarantine_required: false,
        rejection_immediate: true, default_repair_class: L5RepairClass.RP7_FATAL_NON_REPAIRABLE,
        escalation_required: true, visible_in_metrics: true,
      };

    case L5FailureFamily.F7_REPLAY_REPAIR:
      return {
        failure_code: code,
        abort_durable_flow: false,
        preserves_authority: true,
        opens_repair_path: code !== L5FailureCode.REPAIR_ILLEGAL_MUTATION_ATTEMPT,
        blocks_finalization: false,
        quarantine_required: code === L5FailureCode.REPAIR_ILLEGAL_MUTATION_ATTEMPT,
        rejection_immediate: false,
        default_repair_class: code === L5FailureCode.REPAIR_EXHAUSTED
          ? L5RepairClass.RP7_FATAL_NON_REPAIRABLE
          : L5RepairClass.RP5_REPLAY_BUNDLE_REGENERATION,
        escalation_required: code === L5FailureCode.REPAIR_EXHAUSTED,
        visible_in_metrics: true,
      };
  }
}

export function isAbortFailure(code: L5FailureCode): boolean {
  return getHandlingPolicy(code).abort_durable_flow;
}

export function preservesAuthority(code: L5FailureCode): boolean {
  return getHandlingPolicy(code).preserves_authority;
}

export function opensRepairPath(code: L5FailureCode): boolean {
  return getHandlingPolicy(code).opens_repair_path;
}

export function allFailuresVisible(): boolean {
  const allCodes = Object.values(L5FailureCode);
  return allCodes.every(code => getHandlingPolicy(code).visible_in_metrics);
}
