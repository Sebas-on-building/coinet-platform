/**
 * L12.5 — Scenario template evaluation validator (§12.5.17, §12.5.20).
 */

import {
  L12ScenarioTemplateEvaluation,
  L12ScenarioTemplateMatchResult,
  L12TemplateMatchBand,
} from '../contracts/scenario-template-evaluation';
import {
  L12ScenarioTemplateReadinessClass,
  isL12CleanTemplateReadiness,
} from '../contracts/scenario-template-readiness';
import { L12ScenarioType } from '../contracts/scenario-type';
import {
  L12TemplateValidationResult,
  L12TemplateViolationCode,
  L12TemplateViolationIssue,
  l12TemplateIssueOf as iss,
} from './l12-template-violation-codes';

export function validateL12TemplateMatchResult(
  r: L12ScenarioTemplateMatchResult,
): L12TemplateValidationResult {
  const issues: L12TemplateViolationIssue[] = [];

  if (r.trigger_pattern_refs.length === 0) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_TEMPLATE_TRIGGER_PATTERN_MISSING,
      'match result has no trigger pattern refs',
      r.template_id,
    ));
  }
  if (r.invalidation_pattern_refs.length === 0) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_TEMPLATE_INVALIDATION_PATTERN_MISSING,
      'match result has no invalidation pattern refs',
      r.template_id,
    ));
  }
  if (
    r.match_band === L12TemplateMatchBand.STRONG_MATCH &&
    isL12CleanTemplateReadiness(r.readiness_class) &&
    r.scenario_type === L12ScenarioType.BASE_CASE &&
    !r.eligible_for_base_case
  ) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_BASE_CASE_WITHOUT_ALTERNATIVE_PATH,
      'base case eligible without alternative path',
      r.template_id,
    ));
  }
  if (r.match_band === L12TemplateMatchBand.STRONG_MATCH && r.blocked_pattern_refs.length > 0) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_MATCH_BAND_INCONSISTENT_WITH_PATTERNS,
      'strong match with blocked patterns',
      r.template_id,
    ));
  }
  if (
    r.readiness_class === L12ScenarioTemplateReadinessClass.READY_CLEAN &&
    r.confidence_cap_reasons.length > 0
  ) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_CLEAN_READINESS_UNDER_ACTIVE_INVALIDATION,
      'clean readiness with cap reasons present',
      r.template_id,
    ));
  }

  return { ok: issues.length === 0, issues };
}

export function validateL12TemplateEvaluation(
  e: L12ScenarioTemplateEvaluation,
): L12TemplateValidationResult {
  const issues: L12TemplateViolationIssue[] = [];
  for (const r of e.template_match_results) {
    const v = validateL12TemplateMatchResult(r);
    issues.push(...v.issues);
  }
  return { ok: issues.length === 0, issues };
}
