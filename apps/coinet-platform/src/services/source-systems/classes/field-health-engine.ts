/**
 * L1.4 Field Health Engine
 *
 * Computes health per field-provider pairing.
 * A provider can be healthy overall but broken for one endpoint.
 * One field can be stale while another field from the same provider is fine.
 *
 * Uses the existing health-monitor for provider-level transport metrics
 * and layers field-specific adjustments on top.
 */

import type { TruthClass } from '../registry';
import { getProviderHealth } from '../health-monitor';
import { getFieldAuthority, FIELD_AUTHORITY_MAP } from './authority-constitution';
import { getSubstitutionRule } from './substitution-constitution';
import {
  type FieldHealthRecord,
  type HealthState,
  type HealthPenalty,
  type HealthWeights,
  type ClassWeightGroup,
  PROVIDER_TRUST_CLASS,
  TRUST_CLASS_AUTHORITY_WEIGHT,
  CLASS_WEIGHT_PROFILES,
  CLASS_TO_WEIGHT_GROUP,
  L14_PLATFORM_VERSION,
} from './health-types';

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD-LEVEL FRESHNESS SLA (field-specific, not generic)
// ═══════════════════════════════════════════════════════════════════════════════

const FIELD_FRESHNESS_SLA_MS: Record<string, number> = {
  'price.spot.canonical': 5 * 60_000,
  'price.ohlcv': 10 * 60_000,
  'market.cap': 15 * 60_000,
  'market.supply.circulating': 60 * 60_000,
  'dex.pool.liquidity': 5 * 60_000,
  'dex.pool.price': 5 * 60_000,
  'dex.pair.discovery': 10 * 60_000,
  'derivatives.oi.aggregate': 5 * 60_000,
  'derivatives.funding.aggregate': 5 * 60_000,
  'derivatives.liquidation.orderflow': 2 * 60_000,
  'derivatives.leverage.stress': 5 * 60_000,
  'protocol.tvl.usd': 60 * 60_000,
  'protocol.fees.daily': 60 * 60_000,
  'protocol.revenue.daily': 60 * 60_000,
  'onchain.transfers.evm': 60_000,
  'onchain.transfers.solana': 60_000,
  'onchain.contract.events': 60_000,
  'onchain.whale.flows': 5 * 60_000,
  'security.token.flags': 60 * 60_000,
  'security.contract.risk': 60 * 60_000,
  'narrative.news.velocity': 15 * 60_000,
  'narrative.social.velocity': 15 * 60_000,
  'narrative.retail.attention': 30 * 60_000,
  'entity.wallet.labels': 24 * 60 * 60_000,
  'entity.smart_money': 24 * 60 * 60_000,
  'entity.cluster.attribution': 24 * 60 * 60_000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATE DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

export function deriveHealthState(score: number): HealthState {
  if (score >= 0.85) return 'H0_HEALTHY';
  if (score >= 0.70) return 'H1_STRESSED';
  if (score >= 0.50) return 'H2_DEGRADED';
  if (score >= 0.30) return 'H3_PARTIAL_BLINDNESS';
  if (score >= 0.10) return 'H4_UNSAFE';
  return 'H5_SUPPRESSED';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD HEALTH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute health for a specific field-provider pairing.
 */
export function computeFieldHealth(fieldId: string, providerId: string): FieldHealthRecord {
  const field = getFieldAuthority(fieldId);
  const providerState = getProviderHealth(providerId);
  const trustClass = PROVIDER_TRUST_CLASS[providerId] ?? 'T3_BREADTH_AGGREGATOR';
  const trustWeight = TRUST_CLASS_AUTHORITY_WEIGHT[trustClass];
  const truthClass = field?.truthClass ?? ('' as TruthClass);

  const weightGroup: ClassWeightGroup = CLASS_TO_WEIGHT_GROUP[truthClass] ?? 'interpretation_heavy';
  const weights: HealthWeights = CLASS_WEIGHT_PROFILES[weightGroup];

  // Base vector components
  const availabilityScore = providerState.isAvailable
    ? Math.min(1, providerState.successRate * (providerState.circuit === 'closed' ? 1 : 0.5))
    : 0;

  const fieldSla = FIELD_FRESHNESS_SLA_MS[fieldId] ?? 60_000;
  const staleness = providerState.staleDurationMs === Infinity ? fieldSla * 10 : providerState.staleDurationMs;
  const freshnessScore = staleness <= fieldSla
    ? 1.0
    : staleness <= fieldSla * 3
      ? Math.max(0, 1 - (staleness - fieldSla) / (fieldSla * 2))
      : 0;

  // Payload validity: for now, based on transport success + circuit state
  // In production this would check schema, units, ranges per field
  const payloadValidityScore = providerState.successRate > 0.9
    ? 1.0
    : providerState.successRate > 0.7
      ? 0.7
      : providerState.successRate > 0.5
        ? 0.4
        : 0;

  const historicalReliabilityScore = providerState.totalRequests >= 5
    ? providerState.successRate
    : 0.5;

  const trustClassScore = trustWeight;

  // Raw health via weighted sum
  const rawHealth = Math.min(1, Math.max(0,
    availabilityScore * weights.availability +
    freshnessScore * weights.freshness +
    payloadValidityScore * weights.payloadValidity +
    historicalReliabilityScore * weights.historicalReliability +
    trustClassScore * weights.trustClass,
  ));

  // Penalty computation
  const penalties: HealthPenalty[] = [];

  if (providerState.circuit === 'open') {
    penalties.push({ family: 'P1_connectivity', amount: 0.40, reason: 'Circuit breaker open' });
  } else if (providerState.circuit === 'half_open') {
    penalties.push({ family: 'P1_connectivity', amount: 0.15, reason: 'Circuit breaker half-open' });
  }

  if (providerState.latencyEmaMs > 5000) {
    penalties.push({ family: 'P1_connectivity', amount: 0.10, reason: `High latency EMA: ${providerState.latencyEmaMs.toFixed(0)}ms` });
  }

  if (freshnessScore < 0.5) {
    penalties.push({ family: 'P2_freshness', amount: 0.15, reason: `Field stale (${(staleness / 60000).toFixed(1)}m vs SLA ${(fieldSla / 60000).toFixed(1)}m)` });
  }

  if (providerState.consecutiveFailures >= 3) {
    penalties.push({ family: 'P5_recovery', amount: 0.10, reason: `${providerState.consecutiveFailures} consecutive failures` });
  }

  const totalPenalty = penalties.reduce((sum, p) => sum + p.amount, 0);
  const effectiveHealth = Math.max(0, rawHealth - totalPenalty);

  return {
    fieldId,
    truthClass,
    providerId,
    availabilityScore,
    freshnessScore,
    payloadValidityScore,
    historicalReliabilityScore,
    trustClassScore,
    rawHealth,
    penalties,
    effectiveHealth,
    state: deriveHealthState(effectiveHealth),
    version: L14_PLATFORM_VERSION,
  };
}

/**
 * Compute health for a field using its L1.2 authority owner.
 */
export function computeFieldHealthForOwner(fieldId: string): FieldHealthRecord | null {
  const field = getFieldAuthority(fieldId);
  if (!field) return null;
  return computeFieldHealth(fieldId, field.owner);
}

/**
 * Compute health for all fields.
 */
export function computeAllFieldHealth(): FieldHealthRecord[] {
  return Object.keys(FIELD_AUTHORITY_MAP).map(fieldId => {
    const field = getFieldAuthority(fieldId)!;
    return computeFieldHealth(fieldId, field.owner);
  });
}

/**
 * Get fields in a specific health state or worse.
 */
export function getFieldsAtOrBelow(state: HealthState): FieldHealthRecord[] {
  const stateOrder: HealthState[] = [
    'H0_HEALTHY', 'H1_STRESSED', 'H2_DEGRADED',
    'H3_PARTIAL_BLINDNESS', 'H4_UNSAFE', 'H5_SUPPRESSED',
  ];
  const threshold = stateOrder.indexOf(state);
  return computeAllFieldHealth().filter(f => stateOrder.indexOf(f.state) >= threshold);
}
