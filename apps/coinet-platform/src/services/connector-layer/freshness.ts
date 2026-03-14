/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     FRESHNESS ENGINE                                                          ║
 * ║                                                                               ║
 * ║   Freshness is computed at the connector boundary, never guessed later.       ║
 * ║   It is provider-aware and use-case-aware, not a single global default.       ║
 * ║                                                                               ║
 * ║   The system must always know:                                                ║
 * ║     - when something was observed                                             ║
 * ║     - when it was ingested                                                    ║
 * ║     - how fresh it is                                                         ║
 * ║     - whether that freshness is acceptable                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { Freshness, FreshnessBucket } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER FRESHNESS THRESHOLDS (ms)
// ═══════════════════════════════════════════════════════════════════════════════

const PROVIDER_FRESHNESS_MS: Record<string, number> = {
  coingecko:      60_000,
  coinmarketcap:  60_000,
  birdeye:        30_000,
  dexscreener:    30_000,
  geckoterminal:  60_000,
  coinglass:      60_000,
  defillama:     300_000,
  alchemy:        15_000,
  quicknode:      15_000,
  goplus:        300_000,
  etherscan:     300_000,
  solscan:       300_000,
  cryptopanic:   120_000,
  lunarcrush:    120_000,
  twitter_api:    60_000,
  twitter_api_io: 120_000,
  arkham:        300_000,
  nansen:        300_000,
  openai:        Infinity,
  gemini:        Infinity,
  xai:           Infinity,
};

const DEFAULT_FRESHNESS_MS = 120_000;

/**
 * Get the expected freshness threshold for a provider.
 */
export function getProviderFreshnessThreshold(provider: string): number {
  return PROVIDER_FRESHNESS_MS[provider] ?? DEFAULT_FRESHNESS_MS;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRESHNESS COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classify age into a freshness bucket relative to the provider's threshold.
 */
function classifyBucket(ageMs: number, thresholdMs: number): FreshnessBucket {
  if (thresholdMs === Infinity) return 'fresh';
  if (ageMs < 5_000)               return 'live';
  if (ageMs <= thresholdMs)         return 'fresh';
  if (ageMs <= thresholdMs * 2)     return 'acceptable';
  if (ageMs <= thresholdMs * 5)     return 'stale';
  return 'expired';
}

/**
 * Compute freshness for a connector envelope.
 *
 * @param observedAt   — When the data was valid at the source (unix ms)
 * @param ingestedAt   — When Coinet received it (unix ms)
 * @param provider     — Provider ID for threshold lookup
 */
export function computeFreshness(
  observedAt: number,
  ingestedAt: number,
  provider: string,
): Freshness {
  const thresholdMs = getProviderFreshnessThreshold(provider);
  const ageMs = Math.max(0, ingestedAt - observedAt);
  const ageSeconds = ageMs / 1000;
  const bucket = classifyBucket(ageMs, thresholdMs);

  return {
    age_seconds: Math.round(ageSeconds * 10) / 10,
    bucket,
    acceptable: bucket === 'live' || bucket === 'fresh' || bucket === 'acceptable',
    threshold_ms: thresholdMs,
  };
}

/**
 * Compute freshness when no source observation timestamp is available.
 * Uses ingestion time as observation time (age = 0, bucket = live).
 */
export function computeFreshnessNoSourceTime(
  ingestedAt: number,
  provider: string,
): Freshness {
  return computeFreshness(ingestedAt, ingestedAt, provider);
}
