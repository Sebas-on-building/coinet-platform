/**
 * L12.5 — Scenario template registry (§12.5.19).
 *
 * Single source of truth for production scenario templates. Enforces:
 *   - id uniqueness
 *   - family legality
 *   - trigger / invalidation pattern presence
 *   - L11 score-context requirement presence
 *   - confidence/cap/spread/readiness/restriction policy refs presence
 *   - rollout determinism (RESERVED templates cannot emit production output)
 */

import { isL12FamilyRegistered } from '../contracts/scenario-family';
import {
  L12ScenarioTemplateDefinition,
  L12ScenarioTemplateEvidenceClass,
  L12ScenarioTemplateId,
  L12ScenarioTemplateProductionStatus,
} from '../contracts/scenario-template';

const TEMPLATES: Map<L12ScenarioTemplateId, L12ScenarioTemplateDefinition> = new Map();

export interface L12ScenarioTemplateRegistrationResult {
  readonly registered: boolean;
  readonly reason?: string;
}

export function registerL12ScenarioTemplate(
  def: L12ScenarioTemplateDefinition,
): L12ScenarioTemplateRegistrationResult {
  if (!def.template_id) {
    return { registered: false, reason: 'template_id missing' };
  }
  if (TEMPLATES.has(def.template_id)) {
    return { registered: false, reason: 'duplicate template_id' };
  }
  if (!def.scenario_family) {
    return { registered: false, reason: 'scenario_family missing' };
  }
  if (!isL12FamilyRegistered(def.scenario_family)) {
    return { registered: false, reason: 'unknown scenario_family' };
  }
  if (def.legal_scenario_types.length === 0) {
    return { registered: false, reason: 'legal_scenario_types empty' };
  }
  if (def.required_condition_patterns.length === 0) {
    return { registered: false, reason: 'required_condition_patterns empty' };
  }
  if (def.trigger_patterns.length === 0) {
    return { registered: false, reason: 'trigger_patterns empty' };
  }
  if (def.invalidation_patterns.length === 0) {
    return { registered: false, reason: 'invalidation_patterns empty' };
  }
  if (
    !def.required_evidence_classes.includes(
      L12ScenarioTemplateEvidenceClass.L11_SCORE_CONTEXT_EVIDENCE,
    )
  ) {
    return { registered: false, reason: 'L11 score context evidence required' };
  }
  if (
    !def.confidence_policy_ref ||
    !def.confidence_cap_policy_ref ||
    !def.spread_policy_ref ||
    !def.readiness_policy_ref ||
    !def.restriction_policy_ref
  ) {
    return { registered: false, reason: 'policy refs incomplete' };
  }
  TEMPLATES.set(def.template_id, def);
  return { registered: true };
}

export function getRegisteredL12ScenarioTemplate(
  id: L12ScenarioTemplateId,
): L12ScenarioTemplateDefinition | undefined {
  return TEMPLATES.get(id);
}

export function isL12ScenarioTemplateRegistered(
  id: L12ScenarioTemplateId,
): boolean {
  return TEMPLATES.has(id);
}

export function listRegisteredL12ScenarioTemplates(): readonly L12ScenarioTemplateDefinition[] {
  return [...TEMPLATES.values()].sort((a, b) =>
    a.template_id.localeCompare(b.template_id),
  );
}

export function listL12ProductionEnabledTemplates(): readonly L12ScenarioTemplateDefinition[] {
  return listRegisteredL12ScenarioTemplates()
    .filter(
      d => d.production_status === L12ScenarioTemplateProductionStatus.PRODUCTION_ENABLED,
    )
    .sort((a, b) => a.rollout_priority - b.rollout_priority || a.template_id.localeCompare(b.template_id));
}

export function clearL12ScenarioTemplateRegistry(): void {
  TEMPLATES.clear();
}

export function isL12TemplateProductionEmissionLegal(
  id: L12ScenarioTemplateId,
): boolean {
  const def = TEMPLATES.get(id);
  if (!def) return false;
  return def.production_status === L12ScenarioTemplateProductionStatus.PRODUCTION_ENABLED;
}
