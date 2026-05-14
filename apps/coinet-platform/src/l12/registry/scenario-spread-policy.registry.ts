/**
 * L12.5 — Scenario spread policy registry (§12.5.19).
 *
 * Spread policies declare the thresholds and shift-condition requirements
 * for the §12.5.15 spread law.
 */

import { L12_SCENARIO_SPREAD_THRESHOLDS } from '../contracts/scenario-spread-profile';
import { L12ScenarioSpreadClass } from '../contracts/scenario-set';

export interface L12ScenarioSpreadPolicy {
  readonly spread_policy_id: string;
  readonly thresholds: typeof L12_SCENARIO_SPREAD_THRESHOLDS;
  readonly shift_conditions_required_for: readonly L12ScenarioSpreadClass[];
  readonly clear_primary_blocked_under_active_invalidation: boolean;
  readonly clear_primary_blocked_under_unresolved_contradiction: boolean;
  readonly policy_version: string;
}

const POLICIES: Map<string, L12ScenarioSpreadPolicy> = new Map();

export function registerL12ScenarioSpreadPolicy(
  p: L12ScenarioSpreadPolicy,
): { registered: boolean; reason?: string } {
  if (!p.spread_policy_id) return { registered: false, reason: 'spread_policy_id missing' };
  if (POLICIES.has(p.spread_policy_id)) {
    return { registered: false, reason: 'duplicate spread_policy_id' };
  }
  POLICIES.set(p.spread_policy_id, p);
  return { registered: true };
}

export function getL12ScenarioSpreadPolicy(id: string): L12ScenarioSpreadPolicy | undefined {
  return POLICIES.get(id);
}

export function listL12ScenarioSpreadPolicies(): readonly L12ScenarioSpreadPolicy[] {
  return [...POLICIES.values()].sort((a, b) => a.spread_policy_id.localeCompare(b.spread_policy_id));
}

export function clearL12ScenarioSpreadPolicyRegistry(): void {
  POLICIES.clear();
}

export const L12_DEFAULT_SCENARIO_SPREAD_POLICY: L12ScenarioSpreadPolicy = {
  spread_policy_id: 'l12.spread_policy.default.v1',
  thresholds: L12_SCENARIO_SPREAD_THRESHOLDS,
  shift_conditions_required_for: [
    L12ScenarioSpreadClass.UNRESOLVED_COMPETITION,
    L12ScenarioSpreadClass.NARROW_PRIMARY,
    L12ScenarioSpreadClass.MODERATE_PRIMARY,
  ],
  clear_primary_blocked_under_active_invalidation: true,
  clear_primary_blocked_under_unresolved_contradiction: true,
  policy_version: 'l12.5.spread_policy.v1',
};
