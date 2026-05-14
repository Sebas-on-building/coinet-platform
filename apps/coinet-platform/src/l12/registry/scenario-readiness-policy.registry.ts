/**
 * L12.5 — Scenario readiness policy registry (§12.5.16, §12.5.19).
 *
 * Readiness policies declare which posture flags are forbidden under clean
 * readiness, and which posture flags route to which narrowed/blocked classes.
 */

import { L12ScenarioTemplateReadinessClass } from '../contracts/scenario-template-readiness';

export interface L12ScenarioReadinessPolicy {
  readonly readiness_policy_id: string;
  readonly clean_forbidden_when_active_invalidation: boolean;
  readonly clean_forbidden_when_missing_triggers: boolean;
  readonly clean_forbidden_when_missing_invalidation: boolean;
  readonly clean_forbidden_when_material_drift: boolean;
  readonly clean_forbidden_when_incomplete_score_context: boolean;
  readonly clean_forbidden_when_unresolved_multi_path: boolean;
  readonly clean_forbidden_when_blocking_restriction: boolean;

  readonly drift_routes_to: L12ScenarioTemplateReadinessClass;
  readonly missing_visibility_routes_to: L12ScenarioTemplateReadinessClass;
  readonly active_invalidation_routes_to: L12ScenarioTemplateReadinessClass;
  readonly contradiction_routes_to: L12ScenarioTemplateReadinessClass;

  readonly policy_version: string;
}

const POLICIES: Map<string, L12ScenarioReadinessPolicy> = new Map();

export function registerL12ScenarioReadinessPolicy(
  p: L12ScenarioReadinessPolicy,
): { registered: boolean; reason?: string } {
  if (!p.readiness_policy_id) return { registered: false, reason: 'readiness_policy_id missing' };
  if (POLICIES.has(p.readiness_policy_id)) {
    return { registered: false, reason: 'duplicate readiness_policy_id' };
  }
  POLICIES.set(p.readiness_policy_id, p);
  return { registered: true };
}

export function getL12ScenarioReadinessPolicy(
  id: string,
): L12ScenarioReadinessPolicy | undefined {
  return POLICIES.get(id);
}

export function listL12ScenarioReadinessPolicies(): readonly L12ScenarioReadinessPolicy[] {
  return [...POLICIES.values()].sort((a, b) =>
    a.readiness_policy_id.localeCompare(b.readiness_policy_id),
  );
}

export function clearL12ScenarioReadinessPolicyRegistry(): void {
  POLICIES.clear();
}

export const L12_DEFAULT_SCENARIO_READINESS_POLICY: L12ScenarioReadinessPolicy = {
  readiness_policy_id: 'l12.readiness_policy.default.v1',
  clean_forbidden_when_active_invalidation: true,
  clean_forbidden_when_missing_triggers: true,
  clean_forbidden_when_missing_invalidation: true,
  clean_forbidden_when_material_drift: true,
  clean_forbidden_when_incomplete_score_context: true,
  clean_forbidden_when_unresolved_multi_path: true,
  clean_forbidden_when_blocking_restriction: true,
  drift_routes_to: L12ScenarioTemplateReadinessClass.NARROWED_BY_DRIFT,
  missing_visibility_routes_to: L12ScenarioTemplateReadinessClass.NARROWED_BY_MISSING_VISIBILITY,
  active_invalidation_routes_to: L12ScenarioTemplateReadinessClass.NARROWED_BY_ACTIVE_INVALIDATION,
  contradiction_routes_to: L12ScenarioTemplateReadinessClass.NARROWED_BY_CONTRADICTION,
  policy_version: 'l12.5.readiness_policy.v1',
};
