/**
 * L5.7 Assurance — Repair Classes
 *
 * §5.7.6.2 — RP-0 through RP-7
 */

export enum L5RepairClass {
  RP0_NO_REPAIR_NEEDED = 'RP0_NO_REPAIR_NEEDED',
  RP1_OPTIONAL_ACCELERATION_REPAIR = 'RP1_OPTIONAL_ACCELERATION_REPAIR',
  RP2_REQUIRED_PROJECTION_REPAIR = 'RP2_REQUIRED_PROJECTION_REPAIR',
  RP3_ARCHIVE_COMPLETENESS_REPAIR = 'RP3_ARCHIVE_COMPLETENESS_REPAIR',
  RP4_LATE_DATA_REPROJECTION = 'RP4_LATE_DATA_REPROJECTION',
  RP5_REPLAY_BUNDLE_REGENERATION = 'RP5_REPLAY_BUNDLE_REGENERATION',
  RP6_QUARANTINE_BOUND_REPAIR = 'RP6_QUARANTINE_BOUND_REPAIR',
  RP7_FATAL_NON_REPAIRABLE = 'RP7_FATAL_NON_REPAIRABLE',
}

export const ALL_REPAIR_CLASSES: readonly L5RepairClass[] = Object.values(L5RepairClass);

export function isRepairable(rc: L5RepairClass): boolean {
  return rc !== L5RepairClass.RP7_FATAL_NON_REPAIRABLE && rc !== L5RepairClass.RP0_NO_REPAIR_NEEDED;
}

export function isAutomatable(rc: L5RepairClass): boolean {
  return rc === L5RepairClass.RP1_OPTIONAL_ACCELERATION_REPAIR
    || rc === L5RepairClass.RP2_REQUIRED_PROJECTION_REPAIR
    || rc === L5RepairClass.RP4_LATE_DATA_REPROJECTION
    || rc === L5RepairClass.RP5_REPLAY_BUNDLE_REGENERATION;
}

export function requiresHumanReview(rc: L5RepairClass): boolean {
  return rc === L5RepairClass.RP6_QUARANTINE_BOUND_REPAIR || rc === L5RepairClass.RP7_FATAL_NON_REPAIRABLE;
}

export function blocksFinalisation(rc: L5RepairClass): boolean {
  return rc === L5RepairClass.RP2_REQUIRED_PROJECTION_REPAIR
    || rc === L5RepairClass.RP3_ARCHIVE_COMPLETENESS_REPAIR
    || rc === L5RepairClass.RP7_FATAL_NON_REPAIRABLE;
}

export interface RepairAttemptRecord {
  readonly attempt_id: string;
  readonly repair_class: L5RepairClass;
  readonly reason: string;
  readonly triggering_condition: string;
  readonly operator_type: 'WORKER' | 'HUMAN' | 'REPLAY_ASSISTED';
  readonly manifest_id: string | null;
  readonly trace_id: string | null;
  readonly start_time: string;
  readonly finish_time: string | null;
  readonly outcome: 'SUCCEEDED' | 'FAILED_RETRYABLE' | 'FAILED_FATAL' | 'IN_PROGRESS';
}
