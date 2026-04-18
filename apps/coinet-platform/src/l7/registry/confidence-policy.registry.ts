/**
 * L7.6 — Confidence Policy Registry
 *
 * §7.6.3.9 — All factor weights and band thresholds must come from a
 * registered, versioned policy. The L7.6 confidence engine refuses to
 * run if the requested policy version is not registered.
 *
 * The default v1 policy is provided here. Operators register
 * additional versions through the registry; engine code never picks
 * weights independently.
 */

import {
  L7ConfidencePolicyVersion,
  L7ConfidencePolicyResolution,
} from '../contracts/validation-confidence.policy';
import {
  L7ConfidenceFactorGroup,
  L7ConfidenceFactorWeights,
  L7_DEFAULT_FACTOR_WEIGHTS,
  L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT,
  ALL_L7_CONFIDENCE_FACTOR_GROUPS,
} from '../contracts/confidence-factor';
import { L7_RELIABILITY_BAND_THRESHOLDS } from '../contracts/confidence-band';

export const L7_DEFAULT_CONFIDENCE_POLICY_ID = 'l7.confidence.default';
export const L7_DEFAULT_CONFIDENCE_POLICY_VERSION = '1.0.0';

export const L7_DEFAULT_CONFIDENCE_POLICY: L7ConfidencePolicyVersion = {
  policy_id: L7_DEFAULT_CONFIDENCE_POLICY_ID,
  policy_version: L7_DEFAULT_CONFIDENCE_POLICY_VERSION,
  factor_weights: L7_DEFAULT_FACTOR_WEIGHTS,
  band_thresholds: L7_RELIABILITY_BAND_THRESHOLDS,
  published_at: '2025-01-01T00:00:00.000Z',
  family_weight_overrides: {},
};

export class L7ConfidencePolicyRegistry {
  private readonly byVersion: Map<string, L7ConfidencePolicyVersion>;

  constructor(initial: readonly L7ConfidencePolicyVersion[] = [L7_DEFAULT_CONFIDENCE_POLICY]) {
    this.byVersion = new Map(
      initial.map(p => [keyOf(p.policy_id, p.policy_version), p]),
    );
  }

  list(): readonly L7ConfidencePolicyVersion[] {
    return Array.from(this.byVersion.values());
  }

  register(policy: L7ConfidencePolicyVersion): void {
    this.byVersion.set(keyOf(policy.policy_id, policy.policy_version), policy);
  }

  get(policyId: string, policyVersion: string): L7ConfidencePolicyVersion | undefined {
    return this.byVersion.get(keyOf(policyId, policyVersion));
  }

  isRegistered(policyId: string, policyVersion: string): boolean {
    return this.byVersion.has(keyOf(policyId, policyVersion));
  }

  /**
   * Resolve a concrete weight set + thresholds for a specific
   * (policy, family) combination. Family overrides may tighten weights
   * but never push a weight beyond its registered max-legal envelope.
   * Out-of-bounds overrides are silently clamped here; the
   * factor-weight validator separately reports them.
   */
  resolve(
    policyId: string,
    policyVersion: string,
    familyId: string | null,
  ): L7ConfidencePolicyResolution | undefined {
    const policy = this.get(policyId, policyVersion);
    if (!policy) return undefined;
    const base: Partial<Record<L7ConfidenceFactorGroup, number>> = {
      ...policy.factor_weights,
    };
    let appliedFamilyOverride: string | null = null;
    if (
      familyId &&
      policy.family_weight_overrides &&
      policy.family_weight_overrides[familyId]
    ) {
      const overrides = policy.family_weight_overrides[familyId];
      for (const k of Object.keys(overrides) as L7ConfidenceFactorGroup[]) {
        const w = overrides[k];
        if (typeof w === 'number' && isFinite(w) && w >= 0) {
          base[k] = Math.min(w, L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[k]);
        }
      }
      appliedFamilyOverride = familyId;
    }
    const effective: L7ConfidenceFactorWeights = ALL_L7_CONFIDENCE_FACTOR_GROUPS.reduce(
      (acc, g) => {
        acc[g] = base[g] ?? L7_DEFAULT_FACTOR_WEIGHTS[g];
        return acc;
      },
      {} as Record<L7ConfidenceFactorGroup, number>,
    );
    return {
      policy_id: policy.policy_id,
      policy_version: policy.policy_version,
      effective_weights: effective,
      band_thresholds: policy.band_thresholds,
      applied_family_override: appliedFamilyOverride,
    };
  }
}

function keyOf(policyId: string, policyVersion: string): string {
  return `${policyId}@${policyVersion}`;
}

const defaultConfidencePolicyRegistry = new L7ConfidencePolicyRegistry();

export function getDefaultConfidencePolicyRegistry(): L7ConfidencePolicyRegistry {
  return defaultConfidencePolicyRegistry;
}
