/**
 * L12.5 — Scenario invalidation policy registry (§12.5.19).
 *
 * Production invalidation policies. They govern the *minimum* evidence,
 * monitorability, and confidence-cap-when-active requirements that the
 * invalidation strength engine must enforce.
 */

import { L12ScenarioFamily } from '../contracts/scenario-family';
import { L12InvalidationStrengthBand } from '../contracts/invalidation-strength-profile';
import { L12ScenarioTemplateId } from '../contracts/scenario-template';

export interface L12InvalidationPolicy {
  readonly invalidation_policy_id: string;
  readonly template_id?: L12ScenarioTemplateId;
  readonly scenario_family?: L12ScenarioFamily;

  readonly minimum_evidence_quality: number;
  readonly minimum_monitorability_score: number;
  readonly minimum_materiality_score: number;
  readonly minimum_freshness_score: number;

  readonly forces_cap_at_band: L12InvalidationStrengthBand;
  readonly blocks_clean_readiness_at_band: L12InvalidationStrengthBand;

  readonly active_invalidation_must_appear_in_cap_chain: boolean;

  readonly policy_version: string;
}

const POLICIES: Map<string, L12InvalidationPolicy> = new Map();

export function registerL12InvalidationPolicy(p: L12InvalidationPolicy): { registered: boolean; reason?: string } {
  if (!p.invalidation_policy_id) return { registered: false, reason: 'invalidation_policy_id missing' };
  if (POLICIES.has(p.invalidation_policy_id)) {
    return { registered: false, reason: 'duplicate invalidation_policy_id' };
  }
  POLICIES.set(p.invalidation_policy_id, p);
  return { registered: true };
}

export function getL12InvalidationPolicy(id: string): L12InvalidationPolicy | undefined {
  return POLICIES.get(id);
}

export function listL12InvalidationPolicies(): readonly L12InvalidationPolicy[] {
  return [...POLICIES.values()].sort((a, b) =>
    a.invalidation_policy_id.localeCompare(b.invalidation_policy_id),
  );
}

export function clearL12InvalidationPolicyRegistry(): void {
  POLICIES.clear();
}

export const L12_DEFAULT_INVALIDATION_POLICY: L12InvalidationPolicy = {
  invalidation_policy_id: 'l12.invalidation_policy.default.v1',
  minimum_evidence_quality: 0.4,
  minimum_monitorability_score: 0.5,
  minimum_materiality_score: 0.4,
  minimum_freshness_score: 0.3,
  forces_cap_at_band: L12InvalidationStrengthBand.MATERIAL,
  blocks_clean_readiness_at_band: L12InvalidationStrengthBand.MATERIAL,
  active_invalidation_must_appear_in_cap_chain: true,
  policy_version: 'l12.5.invalidation_policy.v1',
};
