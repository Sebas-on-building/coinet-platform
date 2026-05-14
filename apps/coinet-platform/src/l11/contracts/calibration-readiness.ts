/**
 * L11.6 — Calibration Readiness Classes (§11.6.12)
 *
 * Indicates whether a calibration hook is ready to be measured by
 * later evaluation jobs. The engine derives readiness from target
 * completeness, version compatibility, cohort acceptance,
 * exclusion coverage, and evaluation-window computability.
 */

export enum L11CalibrationReadinessClass {
  CALIBRATION_READY = 'CALIBRATION_READY',
  READY_WITH_STRATIFICATION = 'READY_WITH_STRATIFICATION',
  READY_WITH_EXCLUSIONS = 'READY_WITH_EXCLUSIONS',
  PENDING_OUTCOME_WINDOW = 'PENDING_OUTCOME_WINDOW',
  BLOCKED_TARGET_INCOMPLETE = 'BLOCKED_TARGET_INCOMPLETE',
  BLOCKED_COHORT_INCOMPLETE = 'BLOCKED_COHORT_INCOMPLETE',
  BLOCKED_OUTCOME_METRIC_UNSUPPORTED = 'BLOCKED_OUTCOME_METRIC_UNSUPPORTED',
  BLOCKED_VERSION_MISMATCH = 'BLOCKED_VERSION_MISMATCH',
}

export const ALL_L11_CALIBRATION_READINESS_CLASSES:
  readonly L11CalibrationReadinessClass[] =
  Object.values(L11CalibrationReadinessClass);

const READY_CLASSES: ReadonlySet<L11CalibrationReadinessClass> = new Set([
  L11CalibrationReadinessClass.CALIBRATION_READY,
  L11CalibrationReadinessClass.READY_WITH_STRATIFICATION,
  L11CalibrationReadinessClass.READY_WITH_EXCLUSIONS,
  L11CalibrationReadinessClass.PENDING_OUTCOME_WINDOW,
]);

const BLOCKED_CLASSES: ReadonlySet<L11CalibrationReadinessClass> = new Set([
  L11CalibrationReadinessClass.BLOCKED_TARGET_INCOMPLETE,
  L11CalibrationReadinessClass.BLOCKED_COHORT_INCOMPLETE,
  L11CalibrationReadinessClass.BLOCKED_OUTCOME_METRIC_UNSUPPORTED,
  L11CalibrationReadinessClass.BLOCKED_VERSION_MISMATCH,
]);

export function isL11CalibrationReadinessReady(
  c: L11CalibrationReadinessClass,
): boolean {
  return READY_CLASSES.has(c);
}

export function isL11CalibrationReadinessBlocked(
  c: L11CalibrationReadinessClass,
): boolean {
  return BLOCKED_CLASSES.has(c);
}
