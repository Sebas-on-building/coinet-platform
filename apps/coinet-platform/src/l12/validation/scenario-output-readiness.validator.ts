/**
 * L12.3 — Scenario output readiness validator (§12.3.15.3).
 *
 * Validates that the *declared* readiness class is consistent with the
 * underlying contract posture, and rejects any state that violates the
 * §12.3.15.3 cleanliness law.
 */

import {
  deriveL12ScenarioOutputReadiness,
  L12ScenarioOutputReadinessClass,
  L12ScenarioOutputReadinessInputs,
} from '../contracts/scenario-output-readiness.contract';
import {
  L12ContractViolation,
  L12ContractViolationCode,
} from './l12-contract-violation-codes';

export function validateL12ScenarioOutputReadiness(
  declared: L12ScenarioOutputReadinessClass,
  inputs: L12ScenarioOutputReadinessInputs,
  subject_id: string = '<unknown>',
): readonly L12ContractViolation[] {
  const v: L12ContractViolation[] = [];
  const derived = deriveL12ScenarioOutputReadiness(inputs);
  if (derived !== declared) {
    v.push({
      code: L12ContractViolationCode.L12K_OUTPUT_READINESS_DERIVATION_MISMATCH,
      subject_id,
      detail: `declared readiness ${declared} but posture derives ${derived}`,
    });
  }
  if (declared === L12ScenarioOutputReadinessClass.CLEAN_EMISSION) {
    if (inputs.hasActiveInvalidation) {
      v.push({
        code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_INVALIDATION_ACTIVE,
        subject_id,
        detail: 'clean output while active invalidation present',
      });
    }
    if (!inputs.triggersComplete) {
      v.push({
        code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_TRIGGER_MISSING,
        subject_id,
        detail: 'clean output while triggers incomplete',
      });
    }
    if (!inputs.invalidationsComplete) {
      v.push({
        code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_INVALIDATION_MISSING,
        subject_id,
        detail: 'clean output while invalidations incomplete',
      });
    }
    if (inputs.multiPathUnresolved) {
      v.push({
        code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_MULTI_PATH_UNRESOLVED,
        subject_id,
        detail: 'clean output while multi-path unresolved',
      });
    }
    if (!inputs.l11ScoreContextComplete) {
      v.push({
        code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_SCORE_CONTEXT_INCOMPLETE,
        subject_id,
        detail: 'clean output while L11 score context incomplete',
      });
    }
    if (inputs.driftMaterial) {
      v.push({
        code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_DRIFT_HIDDEN,
        subject_id,
        detail: 'clean output while material drift hidden',
      });
    }
    if (!inputs.restrictionProfileComplete) {
      v.push({
        code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_RESTRICTION_REQUIRED,
        subject_id,
        detail: 'clean output while restriction profile incomplete',
      });
    }
    if (inputs.contradictionUnresolved) {
      v.push({
        code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_CONTRADICTION_UNRESOLVED,
        subject_id,
        detail: 'clean output while contradiction unresolved',
      });
    }
    if (inputs.missingVisibilityMaterial) {
      v.push({
        code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_VISIBILITY_MISSING,
        subject_id,
        detail: 'clean output while material missing visibility',
      });
    }
    if (!inputs.hasAlternativePath) {
      v.push({
        code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_ALT_PATH_ABSENT,
        subject_id,
        detail: 'clean output while alternative path absent',
      });
    }
    if (!inputs.shiftConditionsCompleteWhenRequired) {
      v.push({
        code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_SHIFT_REQUIRED,
        subject_id,
        detail: 'clean output while required shift conditions absent',
      });
    }
  }
  if (
    inputs.hasPredictionLeak ||
    inputs.hasRecommendationLeak ||
    inputs.hasJudgmentLeak ||
    inputs.hasTradeLeak
  ) {
    v.push({
      code: L12ContractViolationCode.L12K_OUTPUT_LEAKAGE_DETECTED,
      subject_id,
      detail: 'output exhibits semantic leakage (prediction/recommendation/judgment/trade)',
    });
  }
  return v;
}
