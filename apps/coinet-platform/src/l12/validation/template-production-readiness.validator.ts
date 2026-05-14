/**
 * L12.5 — Template production-readiness validator (§12.5.19, §12.5.24).
 *
 * Cross-checks the registered production template registry: each enabled
 * template must satisfy `validateL12ScenarioTemplate`, every template id
 * must be unique, and the canonical launch slate must be present.
 */

import {
  L12ScenarioTemplateDefinition,
  L12ScenarioTemplateId,
  L12ScenarioTemplateProductionStatus,
} from '../contracts/scenario-template';
import {
  listL12ProductionEnabledTemplates,
  listRegisteredL12ScenarioTemplates,
} from '../registry/scenario-template.registry';
import { validateL12ScenarioTemplate } from './scenario-template.validator';
import {
  L12TemplateValidationResult,
  L12TemplateViolationCode,
  L12TemplateViolationIssue,
  l12TemplateIssueOf as iss,
} from './l12-template-violation-codes';

export interface L12TemplateProductionReadinessInput {
  readonly required_template_ids: readonly L12ScenarioTemplateId[];
}

export function validateL12TemplateProductionReadiness(
  inp: L12TemplateProductionReadinessInput,
): L12TemplateValidationResult {
  const issues: L12TemplateViolationIssue[] = [];
  const all = listRegisteredL12ScenarioTemplates();
  const enabled = listL12ProductionEnabledTemplates();

  // 1. Duplicate-id detection (registry already enforces uniqueness on registration,
  //    but defensive check at validation time for replay-safety.)
  const seen = new Map<L12ScenarioTemplateId, L12ScenarioTemplateDefinition>();
  for (const def of all) {
    if (seen.has(def.template_id)) {
      issues.push(iss(
        L12TemplateViolationCode.L12T_TEMPLATE_DUPLICATE_ID,
        'duplicate template_id detected',
        def.template_id,
      ));
    }
    seen.set(def.template_id, def);
  }

  // 2. All required ids registered & production-enabled
  const enabledIds = new Set(enabled.map(d => d.template_id));
  for (const id of inp.required_template_ids) {
    if (!enabledIds.has(id)) {
      issues.push(iss(
        L12TemplateViolationCode.L12T_TEMPLATE_ID_MISSING,
        'required production template not enabled',
        id,
      ));
    }
  }

  // 3. RESERVED templates may not appear in production-enabled list
  for (const def of all) {
    if (
      def.production_status === L12ScenarioTemplateProductionStatus.RESERVED &&
      enabledIds.has(def.template_id)
    ) {
      issues.push(iss(
        L12TemplateViolationCode.L12T_TEMPLATE_RESERVED_EMITS_PRODUCTION,
        'reserved template emits production output',
        def.template_id,
      ));
    }
  }

  // 4. Per-template validation
  for (const def of enabled) {
    const v = validateL12ScenarioTemplate(def);
    issues.push(...v.issues);
  }

  return { ok: issues.length === 0, issues };
}
