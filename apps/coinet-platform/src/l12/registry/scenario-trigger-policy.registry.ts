/**
 * L12.5 — Scenario trigger policy registry (§12.5.19).
 *
 * Holds production trigger policies (per template / per family). A trigger
 * policy declares the minimum monitorability, evidence quality, freshness,
 * and decisive-band thresholds the strength engine must enforce.
 */

import { L12ScenarioFamily } from '../contracts/scenario-family';
import { L12ScenarioTemplateId } from '../contracts/scenario-template';
import { L12TriggerStrengthBand } from '../contracts/trigger-strength-profile';

export interface L12TriggerPolicy {
  readonly trigger_policy_id: string;
  readonly template_id?: L12ScenarioTemplateId;
  readonly scenario_family?: L12ScenarioFamily;

  readonly minimum_evidence_quality: number;
  readonly minimum_freshness_score: number;
  readonly minimum_monitorability_score: number;
  readonly minimum_materiality_score: number;

  readonly decisive_band_minimum_evidence_quality: number;
  readonly decisive_band_requires_monitorable: boolean;

  readonly forbidden_decisive_band_under_unmonitorable: L12TriggerStrengthBand;

  readonly policy_version: string;
}

const POLICIES: Map<string, L12TriggerPolicy> = new Map();

export function registerL12TriggerPolicy(p: L12TriggerPolicy): { registered: boolean; reason?: string } {
  if (!p.trigger_policy_id) return { registered: false, reason: 'trigger_policy_id missing' };
  if (POLICIES.has(p.trigger_policy_id)) {
    return { registered: false, reason: 'duplicate trigger_policy_id' };
  }
  POLICIES.set(p.trigger_policy_id, p);
  return { registered: true };
}

export function getL12TriggerPolicy(id: string): L12TriggerPolicy | undefined {
  return POLICIES.get(id);
}

export function listL12TriggerPolicies(): readonly L12TriggerPolicy[] {
  return [...POLICIES.values()].sort((a, b) =>
    a.trigger_policy_id.localeCompare(b.trigger_policy_id),
  );
}

export function clearL12TriggerPolicyRegistry(): void {
  POLICIES.clear();
}

export const L12_DEFAULT_TRIGGER_POLICY: L12TriggerPolicy = {
  trigger_policy_id: 'l12.trigger_policy.default.v1',
  minimum_evidence_quality: 0.4,
  minimum_freshness_score: 0.3,
  minimum_monitorability_score: 0.5,
  minimum_materiality_score: 0.4,
  decisive_band_minimum_evidence_quality: 0.7,
  decisive_band_requires_monitorable: true,
  forbidden_decisive_band_under_unmonitorable: L12TriggerStrengthBand.STRONG,
  policy_version: 'l12.5.trigger_policy.v1',
};
