/**
 * L12.5 — Path confidence policy registry (§12.5.13, §12.5.14).
 *
 * Holds production path-confidence policies including v1 weights and
 * directions. Registered policies are frozen by id+version and may not be
 * mutated post-registration.
 */

import {
  L12_DEFAULT_PATH_CONFIDENCE_WEIGHTS,
  L12_PATH_CONFIDENCE_FACTOR_DIRECTIONS,
  L12PathConfidencePolicy,
  l12IsLegalPathConfidenceWeightSum,
} from '../contracts/path-confidence-policy';

const POLICIES: Map<string, L12PathConfidencePolicy> = new Map();

export function registerL12PathConfidencePolicy(
  p: L12PathConfidencePolicy,
): { registered: boolean; reason?: string } {
  if (!p.policy_id) return { registered: false, reason: 'policy_id missing' };
  if (POLICIES.has(p.policy_id)) {
    return { registered: false, reason: 'duplicate policy_id' };
  }
  if (!l12IsLegalPathConfidenceWeightSum(p.weights, p.weight_sum_tolerance ?? 1e-6)) {
    return { registered: false, reason: 'illegal weight sum (must total 1.0 within tolerance)' };
  }
  POLICIES.set(p.policy_id, p);
  return { registered: true };
}

export function getL12PathConfidencePolicy(
  id: string,
): L12PathConfidencePolicy | undefined {
  return POLICIES.get(id);
}

export function listL12PathConfidencePolicies(): readonly L12PathConfidencePolicy[] {
  return [...POLICIES.values()].sort((a, b) => a.policy_id.localeCompare(b.policy_id));
}

export function clearL12PathConfidencePolicyRegistry(): void {
  POLICIES.clear();
}

export const L12_DEFAULT_PATH_CONFIDENCE_POLICY: L12PathConfidencePolicy = {
  policy_id: 'l12.path_confidence_policy.default.v1',
  policy_version: 'l12.5.path_confidence_policy.v1',
  weights: L12_DEFAULT_PATH_CONFIDENCE_WEIGHTS,
  directions: L12_PATH_CONFIDENCE_FACTOR_DIRECTIONS,
  weight_sum_tolerance: 1e-6,
};
