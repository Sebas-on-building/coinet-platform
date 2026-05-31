/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📡 OMNISCORE v3.0 DATA SOURCE REGISTRY                                    ║
 * ║                                                                               ║
 * ║   Defines reliability, TTL, and validation for data sources.                 ║
 * ║   Used for weighted scoring and staleness checks.                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { DataSource, DataProvider } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const MIN_RELIABILITY_THRESHOLD = 0.5;

/** Tier 1: Highest confidence (direct API, verified) */
export const TIER1_SOURCES: DataProvider[] = ['coingecko', 'defillama', 'github', 'etherscan', 'solscan'];

/** Tier 2: Good confidence (aggregated, reputable) */
export const TIER2_SOURCES: DataProvider[] = ['coinmarketcap', 'messari', 'dune'];

/** Tier 3: Lower confidence (social, estimates) */
export const TIER3_SOURCES: DataProvider[] = ['santiment', 'glassnode', 'blockchain_rpc'];

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const DATA_SOURCES: Record<string, DataSource> = {
  coingecko: {
    id: 'coingecko',
    type: 'api',
    reliability: 0.95,
    ttlSeconds: 300,
  },
  coinmarketcap: {
    id: 'coinmarketcap',
    type: 'api',
    reliability: 0.90,
    ttlSeconds: 300,
  },
  defillama: {
    id: 'defillama',
    type: 'api',
    reliability: 0.92,
    ttlSeconds: 600,
  },
  github: {
    id: 'github',
    type: 'api',
    reliability: 0.98,
    ttlSeconds: 86400, // 24h
  },
  etherscan: {
    id: 'etherscan',
    type: 'blockchain',
    reliability: 0.95,
    ttlSeconds: 3600,
  },
  solscan: {
    id: 'solscan',
    type: 'blockchain',
    reliability: 0.95,
    ttlSeconds: 3600,
  },
  dune: {
    id: 'dune',
    type: 'api',
    reliability: 0.88,
    ttlSeconds: 3600,
  },
  messari: {
    id: 'messari',
    type: 'api',
    reliability: 0.85,
    ttlSeconds: 3600,
  },
  santiment: {
    id: 'santiment',
    type: 'api',
    reliability: 0.75,
    ttlSeconds: 3600,
  },
  glassnode: {
    id: 'glassnode',
    type: 'api',
    reliability: 0.80,
    ttlSeconds: 3600,
  },
  blockchain_rpc: {
    id: 'blockchain_rpc',
    type: 'blockchain',
    reliability: 0.99,
    ttlSeconds: 60,
  },
  derived: {
    id: 'derived',
    type: 'derived',
    reliability: 0.70,
    ttlSeconds: 300,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get reliability score (0-1) for a source
 */
export function getSourceReliability(source: string | DataProvider): number {
  const src = DATA_SOURCES[source.toLowerCase?.() ?? source];
  if (src) return src.reliability;
  // Unknown source - conservative default
  return 0.5;
}

/**
 * Check if source is valid for scoring (above threshold, not banned)
 */
export function isSourceValidForScoring(source: string): boolean {
  const src = DATA_SOURCES[source];
  if (!src) return false;
  if (src.banned) return false;
  return src.reliability >= MIN_RELIABILITY_THRESHOLD;
}

/**
 * Check if data is stale based on freshness
 */
export function isDataStale(
  freshnessSeconds: number,
  source: string
): boolean {
  const src = DATA_SOURCES[source];
  const ttl = src?.ttlSeconds ?? 3600;
  return freshnessSeconds > ttl;
}

/**
 * Validate derivation chain (for derived data)
 */
export function validateDerivationChain(derivedFrom?: string[]): boolean {
  if (!derivedFrom || derivedFrom.length === 0) return true;
  return derivedFrom.every(s => isSourceValidForScoring(s));
}
