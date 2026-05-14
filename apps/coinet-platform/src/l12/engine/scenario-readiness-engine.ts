/**
 * L12.5 — Scenario readiness engine (§12.5.16).
 *
 * Derives the template-evaluation readiness class from the cross-cutting
 * posture flags. Implements the readiness law: clean readiness is illegal
 * under active invalidation, missing triggers/invalidations, material drift,
 * incomplete score context, unresolved multi-path, or blocking restriction.
 */

import {
  L12ScenarioReadinessPolicy,
  L12_DEFAULT_SCENARIO_READINESS_POLICY,
} from '../registry/scenario-readiness-policy.registry';
import {
  L12ScenarioTemplateReadinessClass,
} from '../contracts/scenario-template-readiness';

export interface L12ScenarioReadinessEngineInput {
  readonly scenario_set_id: string;

  readonly policy?: L12ScenarioReadinessPolicy;

  readonly l11_score_context_complete: boolean;

  readonly triggers_complete: boolean;
  readonly invalidations_complete: boolean;

  readonly active_invalidation_present: boolean;
  readonly material_drift: boolean;
  readonly missing_visibility_material: boolean;
  readonly contradiction_unresolved: boolean;
  readonly multi_path_unresolved: boolean;
  readonly blocking_restriction: boolean;

  readonly disclosures_present: boolean;
}

export interface L12ScenarioReadinessEngineResult {
  readonly readiness_class: L12ScenarioTemplateReadinessClass;
  readonly reason_codes: readonly string[];
}

export function deriveL12ScenarioTemplateReadiness(
  inp: L12ScenarioReadinessEngineInput,
): L12ScenarioReadinessEngineResult {
  const policy = inp.policy ?? L12_DEFAULT_SCENARIO_READINESS_POLICY;
  const reasons: string[] = [];

  if (policy.clean_forbidden_when_incomplete_score_context && !inp.l11_score_context_complete) {
    reasons.push('INCOMPLETE_L11_SCORE_CONTEXT');
    return {
      readiness_class: L12ScenarioTemplateReadinessClass.BLOCKED_INCOMPLETE_SCORE_CONTEXT,
      reason_codes: reasons.sort(),
    };
  }
  if (policy.clean_forbidden_when_blocking_restriction && inp.blocking_restriction) {
    reasons.push('BLOCKING_RESTRICTION');
    return {
      readiness_class: L12ScenarioTemplateReadinessClass.BLOCKED_BY_RESTRICTION,
      reason_codes: reasons.sort(),
    };
  }
  if (policy.clean_forbidden_when_missing_triggers && !inp.triggers_complete) {
    reasons.push('TRIGGERS_INCOMPLETE');
    return {
      readiness_class: L12ScenarioTemplateReadinessClass.BLOCKED_INSUFFICIENT_EVIDENCE,
      reason_codes: reasons.sort(),
    };
  }
  if (policy.clean_forbidden_when_missing_invalidation && !inp.invalidations_complete) {
    reasons.push('INVALIDATIONS_INCOMPLETE');
    return {
      readiness_class: L12ScenarioTemplateReadinessClass.BLOCKED_INSUFFICIENT_EVIDENCE,
      reason_codes: reasons.sort(),
    };
  }
  if (policy.clean_forbidden_when_active_invalidation && inp.active_invalidation_present) {
    reasons.push('ACTIVE_INVALIDATION');
    return {
      readiness_class: policy.active_invalidation_routes_to,
      reason_codes: reasons.sort(),
    };
  }
  if (policy.clean_forbidden_when_material_drift && inp.material_drift) {
    reasons.push('MATERIAL_DRIFT');
    return {
      readiness_class: policy.drift_routes_to,
      reason_codes: reasons.sort(),
    };
  }
  if (inp.missing_visibility_material) {
    reasons.push('MISSING_VISIBILITY');
    return {
      readiness_class: policy.missing_visibility_routes_to,
      reason_codes: reasons.sort(),
    };
  }
  if (inp.contradiction_unresolved) {
    reasons.push('CONTRADICTION_UNRESOLVED');
    return {
      readiness_class: policy.contradiction_routes_to,
      reason_codes: reasons.sort(),
    };
  }
  if (policy.clean_forbidden_when_unresolved_multi_path && inp.multi_path_unresolved) {
    reasons.push('UNRESOLVED_MULTI_PATH');
    return {
      readiness_class: L12ScenarioTemplateReadinessClass.UNRESOLVED_MULTI_PATH,
      reason_codes: reasons.sort(),
    };
  }
  if (inp.disclosures_present) {
    reasons.push('DISCLOSURES_PRESENT');
    return {
      readiness_class: L12ScenarioTemplateReadinessClass.READY_WITH_DISCLOSURE,
      reason_codes: reasons.sort(),
    };
  }
  return {
    readiness_class: L12ScenarioTemplateReadinessClass.READY_CLEAN,
    reason_codes: ['READY_CLEAN'],
  };
}
