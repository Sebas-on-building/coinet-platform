/**
 * L12.5 — Scenario template readiness validator (§12.5.16.4).
 */

import {
  L12ScenarioTemplateReadinessClass,
  isL12CleanTemplateReadiness,
} from '../contracts/scenario-template-readiness';
import {
  L12TemplateValidationResult,
  L12TemplateViolationCode,
  L12TemplateViolationIssue,
  l12TemplateIssueOf as iss,
} from './l12-template-violation-codes';

export interface L12ScenarioReadinessValidatorInput {
  readonly scenario_set_id: string;
  readonly readiness_class: L12ScenarioTemplateReadinessClass;
  readonly active_invalidation_present: boolean;
  readonly triggers_complete: boolean;
  readonly invalidations_complete: boolean;
  readonly material_drift: boolean;
  readonly l11_score_context_complete: boolean;
  readonly multi_path_unresolved: boolean;
  readonly blocking_restriction: boolean;
}

export function validateL12ScenarioReadiness(
  inp: L12ScenarioReadinessValidatorInput,
): L12TemplateValidationResult {
  const issues: L12TemplateViolationIssue[] = [];
  if (!isL12CleanTemplateReadiness(inp.readiness_class)) {
    return { ok: true, issues };
  }
  if (inp.active_invalidation_present) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_CLEAN_READINESS_UNDER_ACTIVE_INVALIDATION,
      'clean readiness under active invalidation',
      inp.scenario_set_id,
    ));
  }
  if (!inp.triggers_complete) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_CLEAN_READINESS_WITH_MISSING_TRIGGER,
      'clean readiness with missing triggers',
      inp.scenario_set_id,
    ));
  }
  if (!inp.invalidations_complete) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_CLEAN_READINESS_WITH_MISSING_INVALIDATION,
      'clean readiness with missing invalidations',
      inp.scenario_set_id,
    ));
  }
  if (inp.material_drift) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_CLEAN_READINESS_UNDER_MATERIAL_DRIFT,
      'clean readiness under material drift',
      inp.scenario_set_id,
    ));
  }
  if (!inp.l11_score_context_complete) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_CLEAN_READINESS_UNDER_INCOMPLETE_SCORE_CONTEXT,
      'clean readiness under incomplete L11 score context',
      inp.scenario_set_id,
    ));
  }
  if (inp.multi_path_unresolved) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_CLEAN_READINESS_UNDER_UNRESOLVED_MULTI_PATH,
      'clean readiness under unresolved multi-path',
      inp.scenario_set_id,
    ));
  }
  return { ok: issues.length === 0, issues };
}
