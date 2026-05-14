/**
 * L11.7 — Threshold Change Classification (§11.7.12)
 */

export enum L11ThresholdChangeClassification {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE = 'BACKWARD_COMPATIBLE',
  RECALIBRATION_REQUIRED = 'RECALIBRATION_REQUIRED',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_L11_THRESHOLD_CHANGE_CLASSIFICATIONS:
  readonly L11ThresholdChangeClassification[] =
  Object.values(L11ThresholdChangeClassification);

const SAFE: ReadonlySet<L11ThresholdChangeClassification> = new Set([
  L11ThresholdChangeClassification.ADDITIVE_SAFE,
  L11ThresholdChangeClassification.BACKWARD_COMPATIBLE,
]);

const REQUIRES_VERSION_BUMP: ReadonlySet<L11ThresholdChangeClassification> = new Set([
  L11ThresholdChangeClassification.RECALIBRATION_REQUIRED,
  L11ThresholdChangeClassification.MIGRATION_REQUIRED,
  L11ThresholdChangeClassification.BREAKING_SEMANTIC,
]);

export function isL11ThresholdChangeSafe(
  c: L11ThresholdChangeClassification,
): boolean {
  return SAFE.has(c);
}

export function l11ThresholdChangeRequiresVersionBump(
  c: L11ThresholdChangeClassification,
): boolean {
  return REQUIRES_VERSION_BUMP.has(c);
}

export function isL11ThresholdChangeProhibited(
  c: L11ThresholdChangeClassification,
): boolean {
  return c === L11ThresholdChangeClassification.PROHIBITED;
}
