/**
 * L12.3 — Scenario output readiness law (§12.3.15) + cleanliness law (§12.3.16).
 *
 * Distinct from L12.2's `L12ScenarioReadinessClass` (object-level posture):
 * `L12ScenarioOutputReadinessClass` governs whether the output is *legally
 * emissible* given full contract posture.
 */

export enum L12ScenarioOutputReadinessClass {
  CLEAN_EMISSION = 'CLEAN_EMISSION',
  EMISSION_WITH_DISCLOSURE = 'EMISSION_WITH_DISCLOSURE',
  NARROWED_EMISSION = 'NARROWED_EMISSION',
  MULTI_PATH_UNRESOLVED = 'MULTI_PATH_UNRESOLVED',
  BLOCKED_INSUFFICIENT_CONTRACT = 'BLOCKED_INSUFFICIENT_CONTRACT',
  BLOCKED_BY_RESTRICTION = 'BLOCKED_BY_RESTRICTION',
  BLOCKED_BY_PREDICTION_THEATER = 'BLOCKED_BY_PREDICTION_THEATER',
}

export const ALL_L12_SCENARIO_OUTPUT_READINESS_CLASSES: readonly L12ScenarioOutputReadinessClass[] =
  Object.values(L12ScenarioOutputReadinessClass);

export function isL12BlockingOutputReadiness(
  c: L12ScenarioOutputReadinessClass,
): boolean {
  return (
    c === L12ScenarioOutputReadinessClass.BLOCKED_INSUFFICIENT_CONTRACT ||
    c === L12ScenarioOutputReadinessClass.BLOCKED_BY_RESTRICTION ||
    c === L12ScenarioOutputReadinessClass.BLOCKED_BY_PREDICTION_THEATER
  );
}

export function isL12CleanOutputReadiness(
  c: L12ScenarioOutputReadinessClass,
): boolean {
  return c === L12ScenarioOutputReadinessClass.CLEAN_EMISSION;
}

/**
 * Inputs from which output readiness derives (§12.3.15.2).
 */
export interface L12ScenarioOutputReadinessInputs {
  readonly hasBaseCase: boolean;
  readonly hasAlternativePath: boolean;
  readonly triggersComplete: boolean;
  readonly invalidationsComplete: boolean;
  readonly confidenceClean: boolean;
  readonly shiftConditionsCompleteWhenRequired: boolean;
  readonly restrictionProfileComplete: boolean;
  readonly l11ScoreContextComplete: boolean;
  readonly evidencePackComplete: boolean;
  readonly replayIdentityComplete: boolean;
  readonly hasPredictionLeak: boolean;
  readonly hasRecommendationLeak: boolean;
  readonly hasJudgmentLeak: boolean;
  readonly hasTradeLeak: boolean;
  readonly hasActiveInvalidation: boolean;
  readonly contradictionUnresolved: boolean;
  readonly missingVisibilityMaterial: boolean;
  readonly driftMaterial: boolean;
  readonly multiPathUnresolved: boolean;
  readonly disclosuresPresent: boolean;
  readonly restrictionBlocksEmission: boolean;
}

/**
 * Derive output readiness class from posture (priority-ordered).
 */
export function deriveL12ScenarioOutputReadiness(
  i: L12ScenarioOutputReadinessInputs,
): L12ScenarioOutputReadinessClass {
  if (
    i.hasPredictionLeak ||
    i.hasRecommendationLeak ||
    i.hasJudgmentLeak ||
    i.hasTradeLeak
  ) {
    return L12ScenarioOutputReadinessClass.BLOCKED_BY_PREDICTION_THEATER;
  }
  if (i.restrictionBlocksEmission) {
    return L12ScenarioOutputReadinessClass.BLOCKED_BY_RESTRICTION;
  }
  if (
    !i.hasBaseCase ||
    !i.triggersComplete ||
    !i.invalidationsComplete ||
    !i.l11ScoreContextComplete ||
    !i.evidencePackComplete ||
    !i.replayIdentityComplete ||
    !i.restrictionProfileComplete ||
    !i.shiftConditionsCompleteWhenRequired
  ) {
    return L12ScenarioOutputReadinessClass.BLOCKED_INSUFFICIENT_CONTRACT;
  }
  if (i.multiPathUnresolved) {
    return L12ScenarioOutputReadinessClass.MULTI_PATH_UNRESOLVED;
  }
  if (
    i.hasActiveInvalidation ||
    i.contradictionUnresolved ||
    i.missingVisibilityMaterial ||
    i.driftMaterial
  ) {
    return L12ScenarioOutputReadinessClass.NARROWED_EMISSION;
  }
  if (i.disclosuresPresent) {
    return L12ScenarioOutputReadinessClass.EMISSION_WITH_DISCLOSURE;
  }
  return L12ScenarioOutputReadinessClass.CLEAN_EMISSION;
}
