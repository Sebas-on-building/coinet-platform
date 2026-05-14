/**
 * L12.3 — Scenario cleanliness law validator (§12.3.16).
 *
 * Convenience wrapper: given the same readiness inputs, returns the
 * specific violations triggered by §12.3.16.2 *fake-clean cases*.
 *
 * This is distinct from the readiness validator: cleanliness focuses
 * specifically on detecting "appears clean while ..." patterns, regardless
 * of declared class.
 */

import { L12ScenarioOutputReadinessInputs } from '../contracts/scenario-output-readiness.contract';
import {
  L12ContractViolation,
  L12ContractViolationCode,
} from './l12-contract-violation-codes';

export interface L12ScenarioCleanlinessClaim {
  /** Whether the scenario currently *claims* cleanliness (downstream-clean). */
  readonly claims_clean: boolean;
}

export function validateL12ScenarioCleanliness(
  claim: L12ScenarioCleanlinessClaim,
  inputs: L12ScenarioOutputReadinessInputs,
  subject_id: string = '<unknown>',
): readonly L12ContractViolation[] {
  const v: L12ContractViolation[] = [];
  if (!claim.claims_clean) return v;

  if (inputs.hasActiveInvalidation) {
    v.push({
      code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_INVALIDATION_ACTIVE,
      subject_id,
      detail: 'cleanliness claim under active invalidation',
    });
  }
  if (!inputs.triggersComplete) {
    v.push({
      code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_TRIGGER_MISSING,
      subject_id,
      detail: 'cleanliness claim while triggers missing',
    });
  }
  if (!inputs.hasAlternativePath) {
    v.push({
      code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_ALT_PATH_ABSENT,
      subject_id,
      detail: 'cleanliness claim while alternative path absent',
    });
  }
  if (!inputs.l11ScoreContextComplete) {
    v.push({
      code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_SCORE_CONTEXT_INCOMPLETE,
      subject_id,
      detail: 'cleanliness claim while L11 score context incomplete',
    });
  }
  if (inputs.contradictionUnresolved) {
    v.push({
      code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_CONTRADICTION_UNRESOLVED,
      subject_id,
      detail: 'cleanliness claim while contradiction unresolved',
    });
  }
  if (inputs.driftMaterial) {
    v.push({
      code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_DRIFT_HIDDEN,
      subject_id,
      detail: 'cleanliness claim while drift material',
    });
  }
  if (inputs.missingVisibilityMaterial) {
    v.push({
      code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_VISIBILITY_MISSING,
      subject_id,
      detail: 'cleanliness claim while missing visibility material',
    });
  }
  if (!inputs.shiftConditionsCompleteWhenRequired) {
    v.push({
      code: L12ContractViolationCode.L12K_OUTPUT_CLEAN_WHILE_SHIFT_REQUIRED,
      subject_id,
      detail: 'cleanliness claim while required shift conditions absent',
    });
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
      detail: 'cleanliness claim while semantic leakage present',
    });
  }
  return v;
}
