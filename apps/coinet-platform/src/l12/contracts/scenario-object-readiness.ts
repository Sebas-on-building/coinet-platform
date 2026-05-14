/**
 * L12.2 — Scenario object readiness (§12.2.13.3).
 *
 * Readiness expresses whether a scenario set / path is ready for downstream
 * use, narrowed by contradiction or visibility, or blocked. It is *not*
 * a confidence claim — it is a downstream-usability posture.
 */

export enum L12ScenarioReadinessClass {
  SCENARIO_READY = 'SCENARIO_READY',
  READY_WITH_DISCLOSURE = 'READY_WITH_DISCLOSURE',
  NARROWED_BY_CONTRADICTION = 'NARROWED_BY_CONTRADICTION',
  NARROWED_BY_MISSING_VISIBILITY = 'NARROWED_BY_MISSING_VISIBILITY',
  UNRESOLVED_MULTI_PATH = 'UNRESOLVED_MULTI_PATH',
  BLOCKED_INSUFFICIENT_EVIDENCE = 'BLOCKED_INSUFFICIENT_EVIDENCE',
  BLOCKED_BY_DRIFT_OR_RESTRICTION = 'BLOCKED_BY_DRIFT_OR_RESTRICTION',
}

export const ALL_L12_SCENARIO_READINESS_CLASSES: readonly L12ScenarioReadinessClass[] =
  Object.values(L12ScenarioReadinessClass);

export function isL12BlockingReadinessClass(c: L12ScenarioReadinessClass): boolean {
  return (
    c === L12ScenarioReadinessClass.BLOCKED_INSUFFICIENT_EVIDENCE ||
    c === L12ScenarioReadinessClass.BLOCKED_BY_DRIFT_OR_RESTRICTION
  );
}

export function isL12NarrowedReadinessClass(c: L12ScenarioReadinessClass): boolean {
  return (
    c === L12ScenarioReadinessClass.NARROWED_BY_CONTRADICTION ||
    c === L12ScenarioReadinessClass.NARROWED_BY_MISSING_VISIBILITY ||
    c === L12ScenarioReadinessClass.UNRESOLVED_MULTI_PATH
  );
}
