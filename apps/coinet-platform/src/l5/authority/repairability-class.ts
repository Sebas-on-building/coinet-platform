/**
 * L5.2 Authority Model — Repairability Classes
 *
 * §5.2.12 — Repair Law
 */

export enum L5RepairabilityClass {
  /** All required authority and projections complete. */
  R0_NO_REPAIR_NEEDED = 'R0_NO_REPAIR_NEEDED',

  /** Only optional projections missing. */
  R1_OPTIONAL_REPAIR = 'R1_OPTIONAL_REPAIR',

  /** Authority intact, required projection missing. */
  R2_REQUIRED_PROJECTION_REPAIR = 'R2_REQUIRED_PROJECTION_REPAIR',

  /** Authority exists but required archive linkage incomplete. */
  R3_ARCHIVE_COMPLETENESS_REPAIR = 'R3_ARCHIVE_COMPLETENESS_REPAIR',

  /** Semantic conflict or duplicate mismatch. Deterministic or human review required. */
  R4_QUARANTINE_REPAIR = 'R4_QUARANTINE_REPAIR',

  /** Primary authority incomplete or evidence irrecoverably absent. */
  R5_FATAL_NON_REPAIRABLE = 'R5_FATAL_NON_REPAIRABLE',
}

export const ALL_REPAIRABILITY_CLASSES: readonly L5RepairabilityClass[] = [
  L5RepairabilityClass.R0_NO_REPAIR_NEEDED,
  L5RepairabilityClass.R1_OPTIONAL_REPAIR,
  L5RepairabilityClass.R2_REQUIRED_PROJECTION_REPAIR,
  L5RepairabilityClass.R3_ARCHIVE_COMPLETENESS_REPAIR,
  L5RepairabilityClass.R4_QUARANTINE_REPAIR,
  L5RepairabilityClass.R5_FATAL_NON_REPAIRABLE,
];

export function isRepairable(rc: L5RepairabilityClass): boolean {
  return rc !== L5RepairabilityClass.R5_FATAL_NON_REPAIRABLE;
}

export function requiresHumanReview(rc: L5RepairabilityClass): boolean {
  return rc === L5RepairabilityClass.R4_QUARANTINE_REPAIR;
}

export function isCriticalRepair(rc: L5RepairabilityClass): boolean {
  return rc === L5RepairabilityClass.R3_ARCHIVE_COMPLETENESS_REPAIR
    || rc === L5RepairabilityClass.R4_QUARANTINE_REPAIR
    || rc === L5RepairabilityClass.R5_FATAL_NON_REPAIRABLE;
}
