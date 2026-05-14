/**
 * L12.5 — Scenario template validator (§12.5.20).
 *
 * Validates a `L12ScenarioTemplateDefinition` against the §12.5.2.4 template
 * law: family/types declared, conditions/triggers/invalidations declared,
 * L11 score-context evidence required, all policy refs present, no
 * forbidden language in name/doctrine.
 */

import { isL12FamilyRegistered } from '../contracts/scenario-family';
import {
  L12ScenarioTemplateDefinition,
  L12ScenarioTemplateEvidenceClass,
  L12ScenarioTemplateProductionStatus,
} from '../contracts/scenario-template';
import {
  L12TemplateValidationResult,
  L12TemplateViolationCode,
  L12TemplateViolationIssue,
  l12TemplateIssueOf as iss,
} from './l12-template-violation-codes';

const FORBIDDEN_RE =
  /\b(guaranteed|certain(?:ty)?|sure thing|will definitely|cannot fail|recommend|trade now|buy now|sell now|target price|stop loss|winner|final judgment)\b/i;

export function validateL12ScenarioTemplate(
  def: L12ScenarioTemplateDefinition,
): L12TemplateValidationResult {
  const issues: L12TemplateViolationIssue[] = [];

  if (!def.template_id) {
    issues.push(iss(L12TemplateViolationCode.L12T_TEMPLATE_ID_MISSING, 'template_id missing'));
  }
  if (!def.scenario_family) {
    issues.push(iss(L12TemplateViolationCode.L12T_TEMPLATE_FAMILY_MISSING, 'scenario_family missing', def.template_id));
  } else if (!isL12FamilyRegistered(def.scenario_family)) {
    issues.push(iss(L12TemplateViolationCode.L12T_TEMPLATE_FAMILY_MISSING, 'unknown scenario_family', def.template_id));
  }
  if (def.legal_scenario_types.length === 0) {
    issues.push(iss(L12TemplateViolationCode.L12T_TEMPLATE_TYPE_ILLEGAL, 'legal_scenario_types empty', def.template_id));
  }

  if (def.required_condition_patterns.length === 0) {
    issues.push(iss(L12TemplateViolationCode.L12T_TEMPLATE_TRIGGER_PATTERN_MISSING, 'required_condition_patterns empty', def.template_id));
  }
  if (def.trigger_patterns.length === 0) {
    issues.push(iss(L12TemplateViolationCode.L12T_TEMPLATE_TRIGGER_PATTERN_MISSING, 'trigger_patterns empty', def.template_id));
  }
  if (def.invalidation_patterns.length === 0) {
    issues.push(iss(L12TemplateViolationCode.L12T_TEMPLATE_INVALIDATION_PATTERN_MISSING, 'invalidation_patterns empty', def.template_id));
  }
  if (
    !def.required_evidence_classes.includes(
      L12ScenarioTemplateEvidenceClass.L11_SCORE_CONTEXT_EVIDENCE,
    )
  ) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_TEMPLATE_SCORE_CONTEXT_REQUIREMENT_MISSING,
      'L11 score context evidence class required',
      def.template_id,
    ));
  }
  if (def.required_evidence_classes.length === 0) {
    issues.push(iss(
      L12TemplateViolationCode.L12T_PRODUCTION_TEMPLATE_WITHOUT_EVIDENCE_CLASSES,
      'required_evidence_classes empty',
      def.template_id,
    ));
  }
  for (const ref of [
    def.confidence_policy_ref,
    def.confidence_cap_policy_ref,
    def.spread_policy_ref,
    def.readiness_policy_ref,
    def.restriction_policy_ref,
  ]) {
    if (!ref) {
      issues.push(iss(
        L12TemplateViolationCode.L12T_TEMPLATE_POLICY_REF_MISSING,
        'one or more policy refs missing',
        def.template_id,
      ));
      break;
    }
  }

  // Reserved templates may not emit production output but must still exist
  if (def.production_status === L12ScenarioTemplateProductionStatus.RESERVED) {
    // No output legality issue at definition-time; runtime enforcement is in
    // the evaluation engine. This is a warning slot reserved for future use.
  }

  // Forbidden language sniff over name + doctrine
  const text = `${def.template_name} :: ${def.template_doctrine_summary}`;
  if (FORBIDDEN_RE.test(text)) {
    if (/recommend|trade now|buy now|sell now/i.test(text)) {
      issues.push(iss(L12TemplateViolationCode.L12T_RECOMMENDATION_LEAK, 'recommendation language', def.template_id));
    }
    if (/\b(guaranteed|certain(?:ty)?|cannot fail|will definitely)\b/i.test(text)) {
      issues.push(iss(L12TemplateViolationCode.L12T_CERTAINTY_LANGUAGE, 'certainty language', def.template_id));
    }
    if (/winner|final judgment/i.test(text)) {
      issues.push(iss(L12TemplateViolationCode.L12T_JUDGMENT_LEAK, 'judgment language', def.template_id));
    }
    if (/target price|stop loss/i.test(text)) {
      issues.push(iss(L12TemplateViolationCode.L12T_TRADE_LEAK, 'trade-instruction language', def.template_id));
    }
  }

  return { ok: issues.length === 0, issues };
}
