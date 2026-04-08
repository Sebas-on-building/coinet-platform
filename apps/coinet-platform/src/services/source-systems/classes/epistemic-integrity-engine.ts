/**
 * L1.4.1 Epistemic Integrity Engine
 *
 * Health checks whether a source is alive and fresh.
 * Integrity checks whether the returned data is still the SAME TRUTH TYPE
 * Coinet thinks it is.
 *
 * A source can be online, returning valid JSON, fresh, and fast —
 * and still be epistemically broken because:
 *   - methodology changed silently
 *   - unit or quote basis drifted
 *   - venue scope composition changed
 *   - time basis changed (1h → rolling)
 *   - schema still parses but semantic identity broke
 *   - pool or pair identity drifted
 *
 * This is NOT degraded truth. This is DIFFERENT truth.
 * Only degraded truth can substitute. Different truth cannot.
 */

import type { TruthClass } from '../registry';
import { getFieldAuthority, FIELD_AUTHORITY_MAP } from './authority-constitution';
import {
  type IntegrityState, type IntegrityDimension, type FieldIntegrityRecord,
  L14_PLATFORM_VERSION,
} from './health-types';

// ═══════════════════════════════════════════════════════════════════════════════
// REPRESENTATIVE FIELD TUPLES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RepresentativeFieldTuple {
  fieldId: string;
  unit: string;
  quoteBasis?: string;
  venueScope?: string;
  timeBasis?: string;
  methodologyId: string;
  scopeDescription: string;
}

export const FIELD_TUPLES: Record<string, RepresentativeFieldTuple> = {
  'price.spot.canonical': {
    fieldId: 'price.spot.canonical', unit: 'USD', quoteBasis: 'USD',
    venueScope: 'exchange_aggregate', timeBasis: 'spot',
    methodologyId: 'volume_weighted_aggregate', scopeDescription: 'Aggregated spot price across major exchanges',
  },
  'price.ohlcv': {
    fieldId: 'price.ohlcv', unit: 'USD', quoteBasis: 'USD',
    venueScope: 'exchange_aggregate', timeBasis: 'candlestick_interval',
    methodologyId: 'ohlcv_standard', scopeDescription: 'OHLCV candles from aggregated exchange data',
  },
  'market.cap': {
    fieldId: 'market.cap', unit: 'USD',
    methodologyId: 'price_times_circulating', scopeDescription: 'Market capitalization = price * circulating supply',
  },
  'market.supply.circulating': {
    fieldId: 'market.supply.circulating', unit: 'native_token',
    methodologyId: 'aggregator_defined', scopeDescription: 'Circulating supply as defined by aggregator methodology',
  },
  'dex.pool.liquidity': {
    fieldId: 'dex.pool.liquidity', unit: 'USD',
    venueScope: 'single_pool', timeBasis: 'snapshot',
    methodologyId: 'reserve_backed_tvl', scopeDescription: 'Pool reserve-backed liquidity',
  },
  'dex.pool.price': {
    fieldId: 'dex.pool.price', unit: 'USD',
    venueScope: 'single_pool', timeBasis: 'spot',
    methodologyId: 'pool_ratio', scopeDescription: 'Pool-derived token price from reserve ratio',
  },
  'dex.pair.discovery': {
    fieldId: 'dex.pair.discovery', unit: 'pair_event',
    timeBasis: 'event', methodologyId: 'pair_creation_scan',
    scopeDescription: 'Newly created trading pairs on DEXes',
  },
  'derivatives.oi.aggregate': {
    fieldId: 'derivatives.oi.aggregate', unit: 'USD',
    venueScope: 'multi_exchange_basket', timeBasis: 'snapshot',
    methodologyId: 'unified_oi_aggregation', scopeDescription: 'Open interest aggregated across derivative exchanges',
  },
  'derivatives.funding.aggregate': {
    fieldId: 'derivatives.funding.aggregate', unit: 'rate_bps',
    venueScope: 'multi_exchange_basket', timeBasis: 'interval_1h',
    methodologyId: 'weighted_funding_rate', scopeDescription: 'Weighted funding rate across perp venues',
  },
  'derivatives.liquidation.orderflow': {
    fieldId: 'derivatives.liquidation.orderflow', unit: 'USD',
    venueScope: 'multi_exchange_basket', timeBasis: 'streaming',
    methodologyId: 'liquidation_event_aggregation', scopeDescription: 'Liquidation events aggregated from derivative venues',
  },
  'derivatives.leverage.stress': {
    fieldId: 'derivatives.leverage.stress', unit: 'composite_index',
    venueScope: 'multi_exchange_basket', timeBasis: 'snapshot',
    methodologyId: 'leverage_stress_composite', scopeDescription: 'Composite leverage stress indicator',
  },
  'protocol.tvl.usd': {
    fieldId: 'protocol.tvl.usd', unit: 'USD',
    methodologyId: 'defillama_tvl_methodology', timeBasis: 'daily_snapshot',
    scopeDescription: 'Protocol TVL per DefiLlama adapter methodology',
  },
  'protocol.fees.daily': {
    fieldId: 'protocol.fees.daily', unit: 'USD',
    methodologyId: 'defillama_fees_methodology', timeBasis: 'daily_aggregate',
    scopeDescription: 'Daily protocol fee revenue per DefiLlama methodology',
  },
  'protocol.revenue.daily': {
    fieldId: 'protocol.revenue.daily', unit: 'USD',
    methodologyId: 'defillama_revenue_methodology', timeBasis: 'daily_aggregate',
    scopeDescription: 'Daily protocol revenue per DefiLlama methodology',
  },
  'onchain.transfers.evm': {
    fieldId: 'onchain.transfers.evm', unit: 'transfer_event',
    venueScope: 'evm_chains', timeBasis: 'block_time',
    methodologyId: 'native_chain_indexing', scopeDescription: 'EVM transfer events from chain state',
  },
  'onchain.transfers.solana': {
    fieldId: 'onchain.transfers.solana', unit: 'transfer_event',
    venueScope: 'solana', timeBasis: 'block_time',
    methodologyId: 'native_chain_indexing', scopeDescription: 'Solana transfer events from chain state',
  },
  'onchain.contract.events': {
    fieldId: 'onchain.contract.events', unit: 'contract_event',
    venueScope: 'evm_chains', timeBasis: 'block_time',
    methodologyId: 'native_event_log_indexing', scopeDescription: 'Smart contract event logs from chain state',
  },
  'onchain.whale.flows': {
    fieldId: 'onchain.whale.flows', unit: 'USD',
    venueScope: 'multi_chain', timeBasis: 'block_time',
    methodologyId: 'threshold_based_whale_detection', scopeDescription: 'Large-value transfers above whale threshold',
  },
  'security.token.flags': {
    fieldId: 'security.token.flags', unit: 'risk_flags',
    methodologyId: 'goplus_token_security', timeBasis: 'on_demand',
    scopeDescription: 'Token-level security risk flags from GoPlus',
  },
  'security.contract.risk': {
    fieldId: 'security.contract.risk', unit: 'risk_assessment',
    methodologyId: 'goplus_contract_security', timeBasis: 'on_demand',
    scopeDescription: 'Contract-level security risk assessment',
  },
  'narrative.news.velocity': {
    fieldId: 'narrative.news.velocity', unit: 'articles_per_hour',
    methodologyId: 'crypto_news_aggregation', timeBasis: 'rolling_window',
    scopeDescription: 'Crypto news article velocity from aggregated sources',
  },
  'narrative.social.velocity': {
    fieldId: 'narrative.social.velocity', unit: 'social_signals_per_hour',
    methodologyId: 'social_intelligence_composite', timeBasis: 'rolling_window',
    scopeDescription: 'Social signal velocity from LunarCrush composite',
  },
  'narrative.retail.attention': {
    fieldId: 'narrative.retail.attention', unit: 'attention_score',
    methodologyId: 'social_attention_composite', timeBasis: 'rolling_window',
    scopeDescription: 'Retail attention composite score',
  },
  'entity.wallet.labels': {
    fieldId: 'entity.wallet.labels', unit: 'label_record',
    methodologyId: 'entity_attribution', timeBasis: 'asynchronous',
    scopeDescription: 'Wallet address to entity label mappings',
  },
  'entity.smart_money': {
    fieldId: 'entity.smart_money', unit: 'smart_money_classification',
    methodologyId: 'smart_money_labeling', timeBasis: 'asynchronous',
    scopeDescription: 'Smart money wallet classifications',
  },
  'entity.cluster.attribution': {
    fieldId: 'entity.cluster.attribution', unit: 'cluster_record',
    methodologyId: 'address_clustering', timeBasis: 'asynchronous',
    scopeDescription: 'Address cluster to entity attribution',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVATION METADATA (what a source actually returned)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ObservedFieldMetadata {
  fieldId: string;
  providerId: string;
  unit?: string;
  quoteBasis?: string;
  venueScope?: string;
  timeBasis?: string;
  methodologyId?: string;
  schemaVersion?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRITY EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

function checkDimension(
  name: string, expected: string | undefined, observed: string | undefined, severity: number,
): IntegrityDimension {
  const exp = expected ?? 'unspecified';
  const obs = observed ?? 'unspecified';
  const intact = exp === obs || exp === 'unspecified';
  return { dimension: name, expected: exp, observed: obs, intact, severity: intact ? 0 : severity };
}

/**
 * Evaluate epistemic integrity of a field-provider observation
 * against the canonical representative field tuple.
 */
export function evaluateFieldIntegrity(
  observation: ObservedFieldMetadata,
): FieldIntegrityRecord {
  const tuple = FIELD_TUPLES[observation.fieldId];
  if (!tuple) {
    return {
      fieldId: observation.fieldId,
      providerId: observation.providerId,
      state: 'I5_UNKNOWN',
      dimensions: [],
      brokenDimensions: ['no_representative_tuple'],
      integrityScore: 0,
      version: L14_PLATFORM_VERSION,
    };
  }

  const dims: IntegrityDimension[] = [
    checkDimension('unit', tuple.unit, observation.unit, 0.30),
    checkDimension('quoteBasis', tuple.quoteBasis, observation.quoteBasis, 0.20),
    checkDimension('venueScope', tuple.venueScope, observation.venueScope, 0.25),
    checkDimension('timeBasis', tuple.timeBasis, observation.timeBasis, 0.25),
    checkDimension('methodology', tuple.methodologyId, observation.methodologyId, 0.40),
  ];

  const brokenDims = dims.filter(d => !d.intact).map(d => d.dimension);
  const totalSeverity = dims.reduce((sum, d) => sum + d.severity, 0);

  const integrityScore = Math.max(0, 1 - totalSeverity);

  let state: IntegrityState;
  if (brokenDims.length === 0) {
    state = 'I0_INTACT';
  } else if (totalSeverity <= 0.15) {
    state = 'I1_MINOR_DRIFT';
  } else if (totalSeverity <= 0.35) {
    state = 'I2_DEGRADED_PARITY';
  } else if (totalSeverity <= 0.60) {
    state = 'I3_MATERIAL_MISMATCH';
  } else {
    state = 'I4_BROKEN';
  }

  return {
    fieldId: observation.fieldId,
    providerId: observation.providerId,
    state,
    dimensions: dims,
    brokenDimensions: brokenDims,
    integrityScore,
    version: L14_PLATFORM_VERSION,
  };
}

/**
 * Check if an observation represents the same truth type or a different truth type.
 * Different truth cannot substitute for degraded truth.
 */
export function isSameTruthType(observation: ObservedFieldMetadata): boolean {
  const record = evaluateFieldIntegrity(observation);
  return record.state !== 'I4_BROKEN' && record.state !== 'I5_UNKNOWN';
}

/**
 * Evaluate integrity for all fields with default (perfect) observations.
 * Useful as a baseline; in production, observations come from actual source responses.
 */
export function evaluateBaselineIntegrity(): FieldIntegrityRecord[] {
  return Object.keys(FIELD_AUTHORITY_MAP).map(fieldId => {
    const field = getFieldAuthority(fieldId)!;
    const tuple = FIELD_TUPLES[fieldId];
    if (!tuple) {
      return evaluateFieldIntegrity({ fieldId, providerId: field.owner });
    }
    return evaluateFieldIntegrity({
      fieldId,
      providerId: field.owner,
      unit: tuple.unit,
      quoteBasis: tuple.quoteBasis,
      venueScope: tuple.venueScope,
      timeBasis: tuple.timeBasis,
      methodologyId: tuple.methodologyId,
    });
  });
}

/**
 * Get all fields where integrity is broken or unknown.
 */
export function getBrokenIntegrityFields(observations: ObservedFieldMetadata[]): FieldIntegrityRecord[] {
  return observations
    .map(obs => evaluateFieldIntegrity(obs))
    .filter(r => r.state === 'I3_MATERIAL_MISMATCH' || r.state === 'I4_BROKEN' || r.state === 'I5_UNKNOWN');
}

export function getFieldTuple(fieldId: string): RepresentativeFieldTuple | undefined {
  return FIELD_TUPLES[fieldId];
}

export function getAllFieldTuples(): RepresentativeFieldTuple[] {
  return Object.values(FIELD_TUPLES);
}
