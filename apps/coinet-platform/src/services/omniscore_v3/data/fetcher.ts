/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📥 DATA FETCHER                                                            ║
 * ║                                                                               ║
 * ║   Fetches all data from providers for a resolved entity.                       ║
 * ║   Aggregates market, on-chain, development, tokenomics data.                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { DataPoint, DataSourceType, Segment } from '../types';
import type { ResolvedEntity } from './entity';
import type { FeatureInput } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MarketData {
  price_usd?: number;
  volume_24h?: number;
  market_cap?: number;
  liquidity_depth?: number;
  bid_ask_spread?: number;
}

export interface OnChainData {
  holder_concentration?: number;
  top_10_holders_pct?: number;
  circulating_supply_ratio?: number;
  unlock_pressure_12m?: number;
}

export interface DevelopmentData {
  github_commits_30d?: number;
  github_stars?: number;
  github_contributors?: number;
  github_forks?: number;
}

export interface TokenomicsData {
  inflation_rate?: number;
  utility_count?: number;
}

export interface FetchAllDataResult {
  data: FeatureInput[];
  errors: string[];
}

/** Create a DataPoint with full provenance */
export function createDataPoint(
  key: string,
  segment: Segment,
  raw: number,
  source: string,
  sourceType: DataSourceType,
  timestamp: string
): DataPoint {
  return {
    key,
    segment,
    raw,
    normalized: null,
    source,
    sourceType,
    timestamp,
    freshnessSeconds: 0,
    confidenceSource: 0.9,
    isDerived: false,
    isStale: false,
    ttlSeconds: 3600,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER TRUST SCORES
// ═══════════════════════════════════════════════════════════════════════════════

export const PROVIDER_TRUST_SCORES: Record<string, number> = {
  coingecko: 0.95,
  coinmarketcap: 0.92,
  defillama: 0.90,
  github: 0.88,
  etherscan: 0.85,
  messari: 0.87,
  blockchain_rpc: 0.99,
  derived: 0.70,
};

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH FUNCTIONS (Stubs - integrate with real providers)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch market data for entity
 */
export async function fetchMarketData(
  _entity: ResolvedEntity
): Promise<{ data: MarketData; dataPoints: DataPoint[] }> {
  // Stub: Real impl would call CoinGecko, CMC, etc.
  return {
    data: {},
    dataPoints: [],
  };
}

/**
 * Fetch on-chain data for entity
 */
export async function fetchOnChainData(
  _entity: ResolvedEntity
): Promise<{ data: OnChainData; dataPoints: DataPoint[] }> {
  // Stub: Real impl would call blockchain RPC, Etherscan, etc.
  return {
    data: {},
    dataPoints: [],
  };
}

/**
 * Fetch development data for entity
 */
export async function fetchDevelopmentData(
  _entity: ResolvedEntity
): Promise<{ data: DevelopmentData; dataPoints: DataPoint[] }> {
  // Stub: Real impl would call GitHub API
  return {
    data: {},
    dataPoints: [],
  };
}

/**
 * Fetch tokenomics data for entity
 */
export async function fetchTokenomicsData(
  _entity: ResolvedEntity
): Promise<{ data: TokenomicsData; dataPoints: DataPoint[] }> {
  // Stub: Real impl would aggregate from multiple sources
  return {
    data: {},
    dataPoints: [],
  };
}

/**
 * Convert market data to data points
 */
export function marketDataToDataPoints(
  data: MarketData,
  source: string,
  segment: Segment = 'MARKET'
): DataPoint[] {
  const now = new Date().toISOString();
  const points: DataPoint[] = [];

  if (data.price_usd != null) {
    points.push(
      createDataPoint('price_usd', segment, data.price_usd, source, 'api', now)
    );
  }
  if (data.volume_24h != null) {
    points.push(
      createDataPoint('volume_24h', segment, data.volume_24h, source, 'api', now)
    );
  }
  if (data.market_cap != null) {
    points.push(
      createDataPoint('market_cap', segment, data.market_cap, source, 'api', now)
    );
  }

  return points;
}

/**
 * Convert on-chain data to data points
 */
export function onChainDataToDataPoints(
  data: OnChainData,
  source: string,
  segment: Segment = 'CONC'
): DataPoint[] {
  const now = new Date().toISOString();
  const points: DataPoint[] = [];

  if (data.holder_concentration != null) {
    points.push(
      createDataPoint(
        'holder_concentration',
        segment,
        data.holder_concentration,
        source,
        'blockchain',
        now
      )
    );
  }

  return points;
}

/**
 * Convert development data to data points
 */
export function developmentDataToDataPoints(
  data: DevelopmentData,
  source: string,
  segment: Segment = 'TECH'
): DataPoint[] {
  const now = new Date().toISOString();
  const points: DataPoint[] = [];

  if (data.github_commits_30d != null) {
    points.push(
      createDataPoint(
        'github_commits_30d',
        segment,
        data.github_commits_30d,
        source,
        'api',
        now
      )
    );
  }

  return points;
}

/**
 * Convert tokenomics data to data points
 */
export function tokenomicsDataToDataPoints(
  data: TokenomicsData,
  source: string,
  segment: Segment = 'TOKEN'
): DataPoint[] {
  const now = new Date().toISOString();
  const points: DataPoint[] = [];

  if (data.inflation_rate != null) {
    points.push(
      createDataPoint(
        'inflation_rate',
        segment,
        data.inflation_rate,
        source,
        'api',
        now
      )
    );
  }

  return points;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FETCH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all data for an entity from all providers
 */
export async function fetchAllData(
  entity: ResolvedEntity
): Promise<FetchAllDataResult> {
  const errors: string[] = [];
  const allDataPoints: DataPoint[] = [];

  try {
    const [marketResult, onChainResult, devResult, tokenResult] =
      await Promise.allSettled([
        fetchMarketData(entity),
        fetchOnChainData(entity),
        fetchDevelopmentData(entity),
        fetchTokenomicsData(entity),
      ]);

    if (marketResult.status === 'fulfilled' && marketResult.value.dataPoints.length > 0) {
      allDataPoints.push(...marketResult.value.dataPoints);
    }
    if (onChainResult.status === 'fulfilled' && onChainResult.value.dataPoints.length > 0) {
      allDataPoints.push(...onChainResult.value.dataPoints);
    }
    if (devResult.status === 'fulfilled' && devResult.value.dataPoints.length > 0) {
      allDataPoints.push(...devResult.value.dataPoints);
    }
    if (tokenResult.status === 'fulfilled' && tokenResult.value.dataPoints.length > 0) {
      allDataPoints.push(...tokenResult.value.dataPoints);
    }

    [marketResult, onChainResult, devResult, tokenResult].forEach((r, i) => {
      if (r.status === 'rejected') {
        errors.push(`Fetch ${['market', 'onchain', 'development', 'tokenomics'][i]} failed: ${r.reason}`);
      }
    });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  // Build FeatureInput array for pipeline
  const now = new Date().toISOString();
  const data: FeatureInput[] = [
    {
      category: 'market',
      dataPoints: allDataPoints.filter((dp) => dp.segment === 'MARKET'),
      coverage: 0,
      reliability: 0,
      oldestDataTimestamp: now,
    },
    {
      category: 'onchain',
      dataPoints: allDataPoints.filter((dp) =>
        ['CONC', 'UNLOCK', 'TOKEN'].includes(dp.segment)
      ),
      coverage: 0,
      reliability: 0,
      oldestDataTimestamp: now,
    },
    {
      category: 'development',
      dataPoints: allDataPoints.filter((dp) =>
        ['TECH', 'TEAM'].includes(dp.segment)
      ),
      coverage: 0,
      reliability: 0,
      oldestDataTimestamp: now,
    },
    {
      category: 'tokenomics',
      dataPoints: allDataPoints.filter((dp) => dp.segment === 'TOKEN'),
      coverage: 0,
      reliability: 0,
      oldestDataTimestamp: now,
    },
    {
      category: 'risk',
      dataPoints: allDataPoints.filter((dp) =>
        ['LEGAL', 'MACRO', 'CENTRAL', 'STABILITY', 'CONC', 'UNLOCK', 'LIQUIDITY', 'CONTRACT'].includes(dp.segment)
      ),
      coverage: 0,
      reliability: 0,
      oldestDataTimestamp: now,
    },
  ];

  return { data, errors };
}
