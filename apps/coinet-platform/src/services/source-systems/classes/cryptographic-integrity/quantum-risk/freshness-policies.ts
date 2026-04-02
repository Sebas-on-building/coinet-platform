/**
 * L1.4 — Field-specific freshness policies.
 *
 * Freshness is not universal. A 24h-old dormant cohort snapshot may be fine.
 * A 24h-old price context is not.
 */

import type { FreshnessPolicy, FreshnessBand } from './source-health-types';

const H = 60 * 60 * 1000;
const D = 24 * H;

export const FRESHNESS_POLICIES: Record<string, FreshnessPolicy> = {
  scriptDistribution: {
    fieldName: 'scriptDistribution',
    optimalMs: 1 * D,
    acceptableMs: 3 * D,
    degradedMs: 7 * D,
    unresolvedMs: 14 * D,
  },
  dormantCohorts: {
    fieldName: 'dormantCohorts',
    optimalMs: 1 * D,
    acceptableMs: 3 * D,
    degradedMs: 14 * D,
    unresolvedMs: 30 * D,
  },
  pqEvidence: {
    fieldName: 'pqEvidence',
    optimalMs: 7 * D,
    acceptableMs: 30 * D,
    degradedMs: 90 * D,
    unresolvedMs: 180 * D,
  },
  totalSupply: {
    fieldName: 'totalSupply',
    optimalMs: 1 * D,
    acceptableMs: 7 * D,
    degradedMs: 30 * D,
    unresolvedMs: 90 * D,
  },
  btcPriceContext: {
    fieldName: 'btcPriceContext',
    optimalMs: 5 * 60 * 1000,
    acceptableMs: 1 * H,
    degradedMs: 1 * D,
    unresolvedMs: 3 * D,
  },
  outcomeMetrics: {
    fieldName: 'outcomeMetrics',
    optimalMs: Infinity,
    acceptableMs: Infinity,
    degradedMs: Infinity,
    unresolvedMs: Infinity,
  },
};

export function getFreshnessPolicy(fieldName: string): FreshnessPolicy | undefined {
  return FRESHNESS_POLICIES[fieldName];
}

export function computeFreshnessScore(fieldName: string, ageMs: number): { score: number; band: FreshnessBand } {
  const policy = FRESHNESS_POLICIES[fieldName];
  if (!policy) return { score: 0.5, band: 'degraded' };

  if (policy.optimalMs === Infinity) return { score: 1.0, band: 'optimal' };

  if (ageMs <= policy.optimalMs) {
    return { score: 1.0, band: 'optimal' };
  }
  if (ageMs <= policy.acceptableMs) {
    const ratio = (ageMs - policy.optimalMs) / (policy.acceptableMs - policy.optimalMs);
    return { score: 1.0 - ratio * 0.15, band: 'acceptable' };
  }
  if (ageMs <= policy.degradedMs) {
    const ratio = (ageMs - policy.acceptableMs) / (policy.degradedMs - policy.acceptableMs);
    return { score: 0.85 - ratio * 0.40, band: 'degraded' };
  }
  if (ageMs <= policy.unresolvedMs) {
    const ratio = (ageMs - policy.degradedMs) / (policy.unresolvedMs - policy.degradedMs);
    return { score: 0.45 - ratio * 0.35, band: 'degraded' };
  }
  return { score: 0.0, band: 'unresolved' };
}
