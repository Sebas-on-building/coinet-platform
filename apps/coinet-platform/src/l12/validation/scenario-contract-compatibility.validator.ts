/**
 * L12.3 — Scenario contract compatibility validator (§12.3.17.4).
 */

import {
  classifyL12ContractDelta,
  L12ScenarioContractCompatibilityClass,
  L12ScenarioContractDelta,
} from '../contracts/scenario-contract-versioning';
import {
  L12ContractViolation,
  L12ContractViolationCode,
} from './l12-contract-violation-codes';

export interface L12ContractCompatibilityResult {
  readonly compatibility_class: L12ScenarioContractCompatibilityClass;
  readonly violations: readonly L12ContractViolation[];
}

export function validateL12ContractDelta(
  d: L12ScenarioContractDelta,
  declared_class?: L12ScenarioContractCompatibilityClass,
  subject_id: string = '<unknown>',
): L12ContractCompatibilityResult {
  const v: L12ContractViolation[] = [];
  const derived = classifyL12ContractDelta(d);

  if (declared_class !== undefined && declared_class !== derived) {
    v.push({
      code: L12ContractViolationCode.L12K_CONTRACT_DELTA_UNCLASSIFIED,
      subject_id,
      detail: `declared compatibility ${declared_class} != derived ${derived}`,
    });
  }
  if (d.weakens_required_fields) {
    v.push({
      code: L12ContractViolationCode.L12K_REQUIRED_FIELD_REMOVED,
      subject_id,
      detail: 'required field removed without migration',
    });
  }
  if (d.replay_material_changed_without_version_bump) {
    v.push({
      code: L12ContractViolationCode.L12K_REPLAY_MATERIAL_CHANGED_WITHOUT_VERSION,
      subject_id,
      detail: 'replay material changed without semantic version bump',
    });
  }
  if (d.weakens_trigger_law) {
    v.push({
      code: L12ContractViolationCode.L12K_TRIGGER_LAW_WEAKENED,
      subject_id,
      detail: 'trigger law weakened',
    });
  }
  if (d.weakens_invalidation_law) {
    v.push({
      code: L12ContractViolationCode.L12K_INVALIDATION_LAW_WEAKENED,
      subject_id,
      detail: 'invalidation law weakened',
    });
  }
  if (d.weakens_score_context_law) {
    v.push({
      code: L12ContractViolationCode.L12K_SCORE_CONTEXT_LAW_WEAKENED,
      subject_id,
      detail: 'L11 score-context law weakened',
    });
  }
  if (d.weakens_restriction_law) {
    v.push({
      code: L12ContractViolationCode.L12K_RESTRICTION_LAW_WEAKENED,
      subject_id,
      detail: 'restriction law weakened',
    });
  }
  if (d.removes_prediction_theater_scan) {
    v.push({
      code: L12ContractViolationCode.L12K_PREDICTION_THEATER_SCAN_REMOVED,
      subject_id,
      detail: 'prediction-theater scan removed',
    });
  }
  if (d.reinterprets_old_outputs) {
    v.push({
      code: L12ContractViolationCode.L12K_OLD_OUTPUTS_REINTERPRETED,
      subject_id,
      detail: 'old outputs reinterpreted under new contract',
    });
  }
  return { compatibility_class: derived, violations: v };
}
