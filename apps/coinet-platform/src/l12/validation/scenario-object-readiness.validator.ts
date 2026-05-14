/**
 * L12.2 — Scenario object readiness validator (§12.2.13).
 */

import { isL12HighConfidenceBand, L12PathConfidenceBand } from '../contracts/path-confidence-profile';
import {
  L12ScenarioReadinessClass,
  isL12BlockingReadinessClass,
} from '../contracts/scenario-object-readiness';
import {
  L12ObjectViolation,
  L12ObjectViolationCode,
} from './l12-object-violation-codes';

export interface L12ReadinessInputs {
  readonly hasActiveInvalidation: boolean;
  readonly contradictionUnresolved: boolean;
  readonly hasMaterialMissingVisibility: boolean;
  readonly hasCriticalDrift: boolean;
  readonly disclosuresPresent: boolean;
  readonly multiPathUnresolved: boolean;
}

/** Map blocker posture → expected readiness class (priority-ordered). */
export function deriveL12ReadinessClass(i: L12ReadinessInputs): L12ScenarioReadinessClass {
  if (i.hasCriticalDrift) {
    return L12ScenarioReadinessClass.BLOCKED_BY_DRIFT_OR_RESTRICTION;
  }
  if (i.hasActiveInvalidation) {
    return L12ScenarioReadinessClass.NARROWED_BY_CONTRADICTION;
  }
  if (i.contradictionUnresolved) {
    return L12ScenarioReadinessClass.NARROWED_BY_CONTRADICTION;
  }
  if (i.hasMaterialMissingVisibility) {
    return L12ScenarioReadinessClass.NARROWED_BY_MISSING_VISIBILITY;
  }
  if (i.multiPathUnresolved) {
    return L12ScenarioReadinessClass.UNRESOLVED_MULTI_PATH;
  }
  if (i.disclosuresPresent) {
    return L12ScenarioReadinessClass.READY_WITH_DISCLOSURE;
  }
  return L12ScenarioReadinessClass.SCENARIO_READY;
}

export function validateL12ScenarioObjectReadiness(args: {
  readonly subjectId: string;
  readonly declaredReadiness: L12ScenarioReadinessClass;
  readonly primaryConfidenceBand: L12PathConfidenceBand;
  readonly inputs: L12ReadinessInputs;
}): readonly L12ObjectViolation[] {
  const v: L12ObjectViolation[] = [];
  const { subjectId, declaredReadiness, primaryConfidenceBand, inputs } = args;

  if (!declaredReadiness) {
    v.push({
      code: L12ObjectViolationCode.L12O_READINESS_MISSING,
      subject_id: subjectId,
      detail: 'readiness_class required',
    });
    return v;
  }

  const expected = deriveL12ReadinessClass(inputs);
  const expectedIsBlocking = isL12BlockingReadinessClass(expected);

  // If posture says BLOCKED but caller declared READY, that's a mismatch.
  if (
    expectedIsBlocking &&
    (declaredReadiness === L12ScenarioReadinessClass.SCENARIO_READY ||
      declaredReadiness === L12ScenarioReadinessClass.READY_WITH_DISCLOSURE)
  ) {
    v.push({
      code: L12ObjectViolationCode.L12O_READINESS_MISMATCH,
      subject_id: subjectId,
      detail: `posture-derived ${expected} but declared ${declaredReadiness}`,
    });
  }

  // High confidence with blocking readiness is illegal
  if (isL12HighConfidenceBand(primaryConfidenceBand) && isL12BlockingReadinessClass(declaredReadiness)) {
    v.push({
      code: L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_CRITICAL_DRIFT,
      subject_id: subjectId,
      detail: `high confidence with blocking readiness (${declaredReadiness}) is illegal`,
    });
  }

  return v;
}
