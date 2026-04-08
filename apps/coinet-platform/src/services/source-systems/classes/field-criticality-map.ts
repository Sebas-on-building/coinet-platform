/**
 * L1.4.1 Field Criticality Map
 *
 * Not every field has the same consequence when degraded.
 * A stale BTC spot price is serious.
 * A stale secondary narrative tag is much less serious.
 *
 * Criticality controls:
 *   - suppression aggressiveness
 *   - alert severity
 *   - disclosure strictness
 *   - blast radius (which downstream claims are affected)
 *   - incident escalation
 */

import type { FieldCriticality, FieldCriticalityEntry } from './health-types';

// ═══════════════════════════════════════════════════════════════════════════════
// CRITICALITY REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const FIELD_CRITICALITY_MAP: Record<string, FieldCriticalityEntry> = {
  // ── Mission Critical: loss blocks downstream judgment ─────────────────────
  'price.spot.canonical': {
    fieldId: 'price.spot.canonical',
    criticality: 'MISSION_CRITICAL',
    blastRadius: [
      'market.cap', 'protocol.tvl.usd', 'derivatives.oi.aggregate',
      'all_directional_claims', 'all_state_classifications',
    ],
    suppressionAggressiveness: 1.0,
  },
  'derivatives.oi.aggregate': {
    fieldId: 'derivatives.oi.aggregate',
    criticality: 'MISSION_CRITICAL',
    blastRadius: [
      'derivatives.funding.aggregate', 'derivatives.liquidation.orderflow',
      'derivatives.leverage.stress', 'leverage_thesis_claims', 'crowding_claims',
    ],
    suppressionAggressiveness: 1.0,
  },
  'security.token.flags': {
    fieldId: 'security.token.flags',
    criticality: 'MISSION_CRITICAL',
    blastRadius: [
      'security.contract.risk', 'safety_verdict', 'opportunity_confidence_cap',
    ],
    suppressionAggressiveness: 1.0,
  },
  'onchain.transfers.evm': {
    fieldId: 'onchain.transfers.evm',
    criticality: 'MISSION_CRITICAL',
    blastRadius: [
      'onchain.whale.flows', 'entity.wallet.labels',
      'whale_behavior_claims', 'exchange_flow_claims',
    ],
    suppressionAggressiveness: 1.0,
  },

  // ── Thesis Critical: loss weakens specific hypothesis families ────────────
  'derivatives.funding.aggregate': {
    fieldId: 'derivatives.funding.aggregate',
    criticality: 'THESIS_CRITICAL',
    blastRadius: ['derivatives.leverage.stress', 'funding_sentiment_claims'],
    suppressionAggressiveness: 0.8,
  },
  'derivatives.liquidation.orderflow': {
    fieldId: 'derivatives.liquidation.orderflow',
    criticality: 'THESIS_CRITICAL',
    blastRadius: ['forced_liquidation_claims', 'cascade_risk_claims'],
    suppressionAggressiveness: 0.8,
  },
  'derivatives.leverage.stress': {
    fieldId: 'derivatives.leverage.stress',
    criticality: 'THESIS_CRITICAL',
    blastRadius: ['fragility_thesis', 'crowding_claims'],
    suppressionAggressiveness: 0.7,
  },
  'protocol.tvl.usd': {
    fieldId: 'protocol.tvl.usd',
    criticality: 'THESIS_CRITICAL',
    blastRadius: ['protocol_rerating_claims', 'protocol_health_claims'],
    suppressionAggressiveness: 0.7,
  },
  'protocol.fees.daily': {
    fieldId: 'protocol.fees.daily',
    criticality: 'THESIS_CRITICAL',
    blastRadius: ['protocol_revenue_claims', 'valuation_thesis'],
    suppressionAggressiveness: 0.7,
  },
  'protocol.revenue.daily': {
    fieldId: 'protocol.revenue.daily',
    criticality: 'THESIS_CRITICAL',
    blastRadius: ['protocol_sustainability_claims'],
    suppressionAggressiveness: 0.7,
  },
  'dex.pool.liquidity': {
    fieldId: 'dex.pool.liquidity',
    criticality: 'THESIS_CRITICAL',
    blastRadius: ['pool_safety_claims', 'liquidity_depth_claims'],
    suppressionAggressiveness: 0.7,
  },
  'dex.pool.price': {
    fieldId: 'dex.pool.price',
    criticality: 'THESIS_CRITICAL',
    blastRadius: ['dex_pricing_claims'],
    suppressionAggressiveness: 0.7,
  },
  'onchain.whale.flows': {
    fieldId: 'onchain.whale.flows',
    criticality: 'THESIS_CRITICAL',
    blastRadius: ['whale_accumulation_claims', 'distribution_claims'],
    suppressionAggressiveness: 0.7,
  },
  'onchain.transfers.solana': {
    fieldId: 'onchain.transfers.solana',
    criticality: 'THESIS_CRITICAL',
    blastRadius: ['solana_flow_claims', 'solana_whale_claims'],
    suppressionAggressiveness: 0.7,
  },
  'security.contract.risk': {
    fieldId: 'security.contract.risk',
    criticality: 'THESIS_CRITICAL',
    blastRadius: ['contract_safety_verdict'],
    suppressionAggressiveness: 0.8,
  },
  'entity.wallet.labels': {
    fieldId: 'entity.wallet.labels',
    criticality: 'THESIS_CRITICAL',
    blastRadius: ['smart_money_claims', 'actor_identity_claims'],
    suppressionAggressiveness: 0.6,
  },
  'entity.smart_money': {
    fieldId: 'entity.smart_money',
    criticality: 'THESIS_CRITICAL',
    blastRadius: ['smart_money_accumulation_claims'],
    suppressionAggressiveness: 0.6,
  },

  // ── Contextual: loss reduces quality but does not block judgment ──────────
  'price.ohlcv': {
    fieldId: 'price.ohlcv',
    criticality: 'CONTEXTUAL',
    blastRadius: ['charting_claims'],
    suppressionAggressiveness: 0.3,
  },
  'market.cap': {
    fieldId: 'market.cap',
    criticality: 'CONTEXTUAL',
    blastRadius: ['market_cap_ranking_claims'],
    suppressionAggressiveness: 0.3,
  },
  'market.supply.circulating': {
    fieldId: 'market.supply.circulating',
    criticality: 'CONTEXTUAL',
    blastRadius: ['supply_claims', 'market.cap'],
    suppressionAggressiveness: 0.2,
  },
  'onchain.contract.events': {
    fieldId: 'onchain.contract.events',
    criticality: 'CONTEXTUAL',
    blastRadius: ['contract_activity_claims'],
    suppressionAggressiveness: 0.3,
  },
  'narrative.news.velocity': {
    fieldId: 'narrative.news.velocity',
    criticality: 'CONTEXTUAL',
    blastRadius: ['narrative_acceleration_claims'],
    suppressionAggressiveness: 0.3,
  },
  'narrative.social.velocity': {
    fieldId: 'narrative.social.velocity',
    criticality: 'CONTEXTUAL',
    blastRadius: ['social_acceleration_claims'],
    suppressionAggressiveness: 0.3,
  },
  'dex.pair.discovery': {
    fieldId: 'dex.pair.discovery',
    criticality: 'CONTEXTUAL',
    blastRadius: ['new_pair_claims'],
    suppressionAggressiveness: 0.2,
  },

  // ── Enrichment Only: loss is cosmetic ─────────────────────────────────────
  'narrative.retail.attention': {
    fieldId: 'narrative.retail.attention',
    criticality: 'ENRICHMENT_ONLY',
    blastRadius: ['retail_sentiment_color'],
    suppressionAggressiveness: 0.1,
  },
  'entity.cluster.attribution': {
    fieldId: 'entity.cluster.attribution',
    criticality: 'ENRICHMENT_ONLY',
    blastRadius: ['cluster_interpretation'],
    suppressionAggressiveness: 0.1,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY API
// ═══════════════════════════════════════════════════════════════════════════════

export function getFieldCriticality(fieldId: string): FieldCriticalityEntry | undefined {
  return FIELD_CRITICALITY_MAP[fieldId];
}

export function getFieldsByCriticality(level: FieldCriticality): FieldCriticalityEntry[] {
  return Object.values(FIELD_CRITICALITY_MAP).filter(f => f.criticality === level);
}

export function getMissionCriticalFields(): FieldCriticalityEntry[] {
  return getFieldsByCriticality('MISSION_CRITICAL');
}

export function getBlastRadius(fieldId: string): string[] {
  return FIELD_CRITICALITY_MAP[fieldId]?.blastRadius ?? [];
}

export function getFieldsAffectedByLoss(fieldId: string): string[] {
  const direct = getBlastRadius(fieldId);
  const indirect: string[] = [];
  for (const affected of direct) {
    if (FIELD_CRITICALITY_MAP[affected]) {
      indirect.push(...getBlastRadius(affected));
    }
  }
  return [...new Set([...direct, ...indirect])];
}
