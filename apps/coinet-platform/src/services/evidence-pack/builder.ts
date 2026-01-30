/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏗️ EVIDENCE PACK BUILDER — Main Orchestrator                              ║
 * ║                                                                               ║
 * ║   Builds complete Evidence Packs with parallel module fetching,              ║
 * ║   TTL caching, and deterministic coverage computation.                        ║
 * ║                                                                               ║
 * ║   PIPELINE:                                                                   ║
 * ║   1. Resolve token entities (confidence-gated)                                ║
 * ║   2. Select modules based on intent + resolved tokens                         ║
 * ║   3. Fetch modules in parallel with per-module timeouts                       ║
 * ║   4. Normalize responses into stable shapes                                   ║
 * ║   5. Compute coverage map + quality score                                     ║
 * ║   6. Assemble and validate final Evidence Pack                                ║
 * ║                                                                               ║
 * ║   CACHING:                                                                    ║
 * ║   - Uses TTL cache with LRU eviction                                          ║
 * ║   - Dogpile protection prevents concurrent duplicate fetches                  ║
 * ║   - Cache key: module:chain:address:timeframe                                 ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import {
  getCache,
  getSingleFlight,
  buildCacheKey,
  CachedValue,
} from './cache';
import {
  EvidencePack,
  EvidencePackBuildOptions,
  EvidencePackBuildOutput,
  EvidenceModules,
  EvidenceRequest,
  TokenResolution,
  EvidenceIntent,
  Timeframe,
  ResponseDepth,
  EVIDENCE_PACK_VERSION,
  getModulesForIntent,
  ModuleResultEvent,
  PackCompleteEvent,
  ModuleStatus,
  DexScreenerEvidence,
  SecurityEvidence,
  HoldersEvidence,
  SentimentEvidence,
  NewsEvidence,
  DerivativesEvidence,
  OnchainEvidence,
  MarketSnapshotEvidence,
} from './types';
import { resolveTokenEntities, ResolveTokensOutput } from './resolver';
import { computeCoverage, generateCoverageSummary } from './coverage';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_GLOBAL_TIMEOUT_MS = 1500;
const DEFAULT_PER_MODULE_TIMEOUT_MS = 800;

// ============================================================================
// CACHE-AWARE FETCH WRAPPER
// ============================================================================

interface CachedFetchResult<T> {
  data: T;
  fromCache: boolean;
  freshnessSeconds: number;
}

/**
 * Wrap a module fetch with caching and dogpile protection.
 */
async function cachedModuleFetch<T>(
  moduleName: string,
  cacheKeyParams: { chain?: string; address?: string | null; symbol?: string },
  fetcher: () => Promise<T>,
  timeoutMs: number
): Promise<CachedFetchResult<T>> {
  const cache = getCache();
  const singleFlight = getSingleFlight();
  
  const cacheKey = buildCacheKey({
    module: moduleName,
    ...cacheKeyParams,
  });

  // Check cache first
  const cached = await cache.get<T>(cacheKey);
  if (cached) {
    const freshnessSeconds = Math.floor(Date.now() / 1000) - cached.cached_at_unix;
    logger.debug('Cache hit', { module: moduleName, freshnessSeconds });
    return {
      data: cached.value,
      fromCache: true,
      freshnessSeconds,
    };
  }

  // Use single-flight to prevent dogpile
  try {
    const data = await singleFlight.do(cacheKey, async () => {
      const result = await fetcher();
      // Cache the result
      const ttl = MODULE_TTL_SECONDS[moduleName] || 300;
      await cache.set(cacheKey, result, ttl);
      return result;
    });

    return {
      data,
      fromCache: false,
      freshnessSeconds: 0,
    };
  } catch (error) {
    // Don't cache errors, but still throw
    throw error;
  }
}

// ============================================================================
// MODULE FETCHERS (to be implemented with actual data sources)
// ============================================================================

interface ModuleFetchResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  latencyMs: number;
}

/**
 * Fetch DexScreener data for a token
 */
async function fetchDexScreener(
  address: string | null,
  chain: string,
  symbol: string,
  timeoutMs: number
): Promise<ModuleFetchResult<DexScreenerEvidence>> {
  const startTime = Date.now();
  
  try {
    // Import the actual dexscreener service
    const { fetchDexScreenerData } = await import('../dexscreener');
    
    const searchQuery = address || symbol;
    const data = await Promise.race([
      fetchDexScreenerData(searchQuery, chain),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      ),
    ]);

    if (!data) {
      return {
        ok: false,
        error: 'No data returned',
        latencyMs: Date.now() - startTime,
      };
    }

    const evidence: DexScreenerEvidence = {
      status: 'ok',
      ts: Math.floor(Date.now() / 1000),
      source: 'DexScreener',
      freshness_seconds: 0,
      data: {
        price_usd: data.priceUsd || 0,
        price_native: data.priceNative,
        liquidity_usd: data.liquidity?.usd || 0,
        volume_24h_usd: data.volume?.h24 || 0,
        volume_6h_usd: data.volume?.h6,
        volume_1h_usd: data.volume?.h1,
        market_cap_usd: data.marketCap,
        fdv_usd: data.fdv,
        pair_created_at_unix: data.pairCreatedAt ? Math.floor(new Date(data.pairCreatedAt).getTime() / 1000) : undefined,
        txns_5m: data.txns?.m5 ? { buys: data.txns.m5.buys, sells: data.txns.m5.sells } : undefined,
        txns_1h: data.txns?.h1 ? { buys: data.txns.h1.buys, sells: data.txns.h1.sells } : undefined,
        txns_24h: data.txns?.h24 ? { buys: data.txns.h24.buys, sells: data.txns.h24.sells } : undefined,
        price_change_5m: data.priceChange?.m5,
        price_change_1h: data.priceChange?.h1,
        price_change_6h: data.priceChange?.h6,
        price_change_24h: data.priceChange?.h24,
        pair_url: data.url,
        dex_name: data.dexId,
      },
    };

    return {
      ok: true,
      data: evidence,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message || 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Fetch security data (GoPlus/RugCheck)
 */
async function fetchSecurity(
  address: string | null,
  chain: string,
  timeoutMs: number
): Promise<ModuleFetchResult<SecurityEvidence>> {
  const startTime = Date.now();

  if (!address) {
    return {
      ok: false,
      error: 'No address provided',
      latencyMs: Date.now() - startTime,
    };
  }

  try {
    // Placeholder - integrate with GoPlus or RugCheck
    // For now, return a minimal structure
    const evidence: SecurityEvidence = {
      status: 'missing',
      ts: Math.floor(Date.now() / 1000),
      source: 'unknown',
      freshness_seconds: 0,
      data: null,
    };

    return {
      ok: true,
      data: evidence,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message || 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Fetch holder data
 */
async function fetchHolders(
  address: string | null,
  chain: string,
  timeoutMs: number
): Promise<ModuleFetchResult<HoldersEvidence>> {
  const startTime = Date.now();

  if (!address) {
    return {
      ok: false,
      error: 'No address provided',
      latencyMs: Date.now() - startTime,
    };
  }

  // Placeholder - integrate with Solscan/EVM explorers
  const evidence: HoldersEvidence = {
    status: 'missing',
    ts: Math.floor(Date.now() / 1000),
    source: 'unknown',
    freshness_seconds: 0,
    data: null,
  };

  return {
    ok: true,
    data: evidence,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Fetch sentiment data
 */
async function fetchSentiment(
  symbol: string,
  timeoutMs: number
): Promise<ModuleFetchResult<SentimentEvidence>> {
  const startTime = Date.now();

  try {
    // Import sentiment service
    const { getMarketSentiment } = await import('../sentiment-service');
    
    const data = await Promise.race([
      getMarketSentiment(symbol),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      ),
    ]);

    if (!data) {
      return {
        ok: false,
        error: 'No data returned',
        latencyMs: Date.now() - startTime,
      };
    }

    const evidence: SentimentEvidence = {
      status: 'ok',
      ts: Math.floor(Date.now() / 1000),
      source: 'CT',
      freshness_seconds: 0,
      data: {
        label: mapSentimentLabel(data.label || data.sentiment),
        score: data.score || 0,
        volume_mentions_24h: data.mentions,
        trending_rank: data.trendingRank,
        bullish_percentage: data.bullishPercent,
        social_dominance: data.socialDominance,
      },
    };

    return {
      ok: true,
      data: evidence,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message || 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

function mapSentimentLabel(label: string | undefined): 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed' {
  if (!label) return 'neutral';
  const lower = label.toLowerCase();
  if (lower.includes('extreme') && lower.includes('fear')) return 'extreme_fear';
  if (lower.includes('extreme') && lower.includes('greed')) return 'extreme_greed';
  if (lower.includes('fear') || lower.includes('bearish')) return 'fear';
  if (lower.includes('greed') || lower.includes('bullish')) return 'greed';
  return 'neutral';
}

/**
 * Fetch news data
 */
async function fetchNews(
  symbol: string,
  timeoutMs: number
): Promise<ModuleFetchResult<NewsEvidence>> {
  const startTime = Date.now();

  try {
    const { fetchNews: fetchNewsService } = await import('../news-service');
    
    const data = await Promise.race([
      fetchNewsService([symbol]),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      ),
    ]);

    if (!data || !data.articles) {
      return {
        ok: false,
        error: 'No data returned',
        latencyMs: Date.now() - startTime,
      };
    }

    const evidence: NewsEvidence = {
      status: 'ok',
      ts: Math.floor(Date.now() / 1000),
      source: 'NewsPipeline',
      freshness_seconds: 0,
      data: {
        items: data.articles.slice(0, 10).map((a: any) => ({
          headline: a.title || a.headline,
          source: a.source || 'Unknown',
          url: a.url,
          published_at_unix: a.publishedAt ? Math.floor(new Date(a.publishedAt).getTime() / 1000) : Math.floor(Date.now() / 1000),
          sentiment: a.sentiment as 'positive' | 'negative' | 'neutral' | undefined,
        })),
        overall_sentiment: data.sentiment || 'neutral',
        has_critical_news: data.criticalAlerts > 0,
        dominant_topics: data.topics || [],
      },
    };

    return {
      ok: true,
      data: evidence,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message || 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Fetch derivatives data
 */
async function fetchDerivatives(
  symbol: string,
  timeoutMs: number
): Promise<ModuleFetchResult<DerivativesEvidence>> {
  const startTime = Date.now();

  try {
    // Import liquidation service for derivatives data
    const { getLiquidationData } = await import('../liquidation-service');
    
    const data = await Promise.race([
      getLiquidationData(symbol),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      ),
    ]);

    if (!data) {
      return {
        ok: false,
        error: 'No data returned',
        latencyMs: Date.now() - startTime,
      };
    }

    const evidence: DerivativesEvidence = {
      status: 'ok',
      ts: Math.floor(Date.now() / 1000),
      source: 'Coinglass',
      freshness_seconds: 0,
      data: {
        open_interest_usd: data.openInterest,
        open_interest_change_24h: data.oiChange24h,
        funding_rate: data.fundingRate,
        funding_rate_annualized: data.fundingRate ? data.fundingRate * 365 * 3 : undefined,
        long_short_ratio: data.longShortRatio,
        liquidations_24h_usd: data.liquidations24h,
        liquidations_long_24h: data.longLiquidations24h,
        liquidations_short_24h: data.shortLiquidations24h,
      },
    };

    return {
      ok: true,
      data: evidence,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message || 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Fetch on-chain data (whale flows, etc.)
 */
async function fetchOnchain(
  address: string | null,
  chain: string,
  symbol: string,
  timeoutMs: number
): Promise<ModuleFetchResult<OnchainEvidence>> {
  const startTime = Date.now();

  try {
    const { getWhaleContextForAI } = await import('../whale-data');
    
    const data = await Promise.race([
      getWhaleContextForAI(symbol),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      ),
    ]);

    if (!data) {
      return {
        ok: false,
        error: 'No data returned',
        latencyMs: Date.now() - startTime,
      };
    }

    const evidence: OnchainEvidence = {
      status: 'ok',
      ts: Math.floor(Date.now() / 1000),
      source: 'Alchemy',
      freshness_seconds: 0,
      data: {
        whale_net_flow_24h: data.netFlow24h,
        large_transactions_24h: data.largeTransactions,
      },
    };

    return {
      ok: true,
      data: evidence,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message || 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Fetch market snapshot (for market overview)
 */
async function fetchMarketSnapshot(
  timeoutMs: number
): Promise<ModuleFetchResult<MarketSnapshotEvidence>> {
  const startTime = Date.now();

  try {
    const { getMarketDataStatus } = await import('../market-data');
    
    const status = await getMarketDataStatus();

    const evidence: MarketSnapshotEvidence = {
      status: 'ok',
      ts: Math.floor(Date.now() / 1000),
      source: 'CoinGecko',
      freshness_seconds: 0,
      data: {
        btc_price: status.btcPrice || 0,
        btc_dominance: status.btcDominance || 0,
        eth_price: status.ethPrice || 0,
        total_market_cap_usd: status.totalMarketCap || 0,
        total_volume_24h_usd: status.totalVolume24h || 0,
        fear_greed_index: status.fearGreedIndex,
        fear_greed_label: status.fearGreedLabel,
      },
    };

    return {
      ok: true,
      data: evidence,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message || 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// MAIN BUILDER
// ============================================================================

/**
 * Build a complete Evidence Pack
 */
export async function buildEvidencePack(
  options: EvidencePackBuildOptions
): Promise<EvidencePackBuildOutput> {
  const startTime = Date.now();
  const events: (ModuleResultEvent | PackCompleteEvent)[] = [];
  const modulesAttempted: string[] = [];
  const modulesFailed: string[] = [];

  const globalTimeout = options.globalTimeoutMs || DEFAULT_GLOBAL_TIMEOUT_MS;
  const perModuleTimeout = options.perModuleTimeoutMs || DEFAULT_PER_MODULE_TIMEOUT_MS;

  try {
    // Step 1: Resolve token entities
    const resolutionResult: ResolveTokensOutput = await resolveTokenEntities({
      message: options.userMessage,
      sessionLastToken: options.sessionLastToken,
      pendingClarifier: options.pendingClarifier,
    });

    const { resolution } = resolutionResult;
    const hasResolvedToken = resolution.resolved.length > 0;
    const primaryToken = resolution.resolved[0];

    // Step 2: Determine which modules to fetch
    const intent = options.intent || 'OTHER';
    const { required, optional } = getModulesForIntent(intent, hasResolvedToken);
    
    let modulesToFetch = [...new Set([...required, ...optional])];
    
    // Apply skip/force overrides
    if (options.skipModules) {
      modulesToFetch = modulesToFetch.filter(m => !options.skipModules!.includes(m));
    }
    if (options.forceModules) {
      modulesToFetch = [...new Set([...modulesToFetch, ...options.forceModules])];
    }

    // Step 3: Fetch modules in parallel
    const evidence: EvidenceModules = {};
    const fetchPromises: Promise<void>[] = [];

    for (const moduleName of modulesToFetch) {
      modulesAttempted.push(moduleName);

      const fetchPromise = (async () => {
        const moduleStartTime = Date.now();
        let result: ModuleFetchResult<any>;

        switch (moduleName) {
          case 'dexscreener':
            if (primaryToken) {
              result = await fetchDexScreener(
                primaryToken.address,
                primaryToken.chain,
                primaryToken.symbol,
                perModuleTimeout
              );
            } else {
              result = { ok: false, error: 'No token resolved', latencyMs: 0 };
            }
            if (result.ok && result.data) {
              evidence.dexscreener = result.data;
            } else {
              evidence.dexscreener = {
                status: 'error',
                ts: Math.floor(Date.now() / 1000),
                source: 'DexScreener',
                freshness_seconds: 0,
                error_code: 'FETCH_FAILED',
                error_message: result.error,
                data: null,
              };
              modulesFailed.push(moduleName);
            }
            break;

          case 'security':
            if (primaryToken?.address) {
              result = await fetchSecurity(primaryToken.address, primaryToken.chain, perModuleTimeout);
            } else {
              result = { ok: false, error: 'No address', latencyMs: 0 };
            }
            evidence.security = result.data || {
              status: 'missing',
              ts: Math.floor(Date.now() / 1000),
              source: 'unknown',
              freshness_seconds: 0,
              data: null,
            };
            break;

          case 'holders':
            if (primaryToken?.address) {
              result = await fetchHolders(primaryToken.address, primaryToken.chain, perModuleTimeout);
            } else {
              result = { ok: false, error: 'No address', latencyMs: 0 };
            }
            evidence.holders = result.data || {
              status: 'missing',
              ts: Math.floor(Date.now() / 1000),
              source: 'unknown',
              freshness_seconds: 0,
              data: null,
            };
            break;

          case 'sentiment':
            result = await fetchSentiment(primaryToken?.symbol || 'BTC', perModuleTimeout);
            if (result.ok && result.data) {
              evidence.sentiment = result.data;
            } else {
              evidence.sentiment = {
                status: 'error',
                ts: Math.floor(Date.now() / 1000),
                source: 'CT',
                freshness_seconds: 0,
                error_message: result.error,
                data: null,
              };
            }
            break;

          case 'news':
            result = await fetchNews(primaryToken?.symbol || 'BTC', perModuleTimeout);
            if (result.ok && result.data) {
              evidence.news = result.data;
            } else {
              evidence.news = {
                status: 'error',
                ts: Math.floor(Date.now() / 1000),
                source: 'NewsPipeline',
                freshness_seconds: 0,
                error_message: result.error,
                data: null,
              };
            }
            break;

          case 'derivatives':
            result = await fetchDerivatives(primaryToken?.symbol || 'BTC', perModuleTimeout);
            if (result.ok && result.data) {
              evidence.derivatives = result.data;
            } else {
              evidence.derivatives = {
                status: 'missing',
                ts: Math.floor(Date.now() / 1000),
                source: 'Coinglass',
                freshness_seconds: 0,
                data: null,
              };
            }
            break;

          case 'onchain':
            result = await fetchOnchain(
              primaryToken?.address || null,
              primaryToken?.chain || 'ethereum',
              primaryToken?.symbol || 'BTC',
              perModuleTimeout
            );
            if (result.ok && result.data) {
              evidence.onchain = result.data;
            } else {
              evidence.onchain = {
                status: 'missing',
                ts: Math.floor(Date.now() / 1000),
                source: 'Indexer',
                freshness_seconds: 0,
                data: null,
              };
            }
            break;

          case 'market_snapshot':
            result = await fetchMarketSnapshot(perModuleTimeout);
            if (result.ok && result.data) {
              evidence.market_snapshot = result.data;
            } else {
              evidence.market_snapshot = {
                status: 'error',
                ts: Math.floor(Date.now() / 1000),
                source: 'CoinGecko',
                freshness_seconds: 0,
                error_message: result.error,
                data: null,
              };
            }
            break;

          default:
            logger.warn(`Unknown module: ${moduleName}`);
        }

        // Emit module result event
        events.push({
          type: 'EVIDENCE_MODULE_RESULT',
          timestamp: Date.now(),
          module: moduleName,
          status: (evidence as any)[moduleName]?.status || 'error',
          freshness_seconds: 0,
          latency_ms: Date.now() - moduleStartTime,
        });
      })();

      fetchPromises.push(fetchPromise);
    }

    // Wait for all fetches with global timeout
    await Promise.race([
      Promise.all(fetchPromises),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Global timeout')), globalTimeout)
      ),
    ]).catch(err => {
      logger.warn('Evidence Pack build timeout or error', { error: err.message });
    });

    // Step 4: Compute coverage
    const { coverage } = computeCoverage(
      evidence,
      intent,
      hasResolvedToken && (primaryToken?.is_user_confirmed || primaryToken?.confidence >= 0.85)
    );

    // Step 5: Build the request metadata
    const request: EvidenceRequest = {
      user_message: options.userMessage,
      language: options.language,
      intent: intent,
      timeframe: options.timeframe || 'snapshot',
      requested_depth: options.depth || 'M',
      received_at_unix: Math.floor(Date.now() / 1000),
    };

    // Step 6: Determine pack kind
    const kind = hasResolvedToken 
      ? (modulesToFetch.includes('market_snapshot') ? 'COMBINED' : 'TOKEN')
      : 'MARKET';

    // Step 7: Assemble final pack
    const pack: EvidencePack = {
      version: EVIDENCE_PACK_VERSION,
      kind,
      request,
      token_resolution: resolution,
      evidence,
      coverage,
    };

    const buildTimeMs = Date.now() - startTime;

    // Emit pack complete event
    events.push({
      type: 'EVIDENCE_PACK_COMPLETE',
      timestamp: Date.now(),
      kind,
      available_modules: coverage.available,
      missing_modules: coverage.missing,
      quality_score: coverage.quality_score,
      total_latency_ms: buildTimeMs,
    });

    logger.info('Evidence Pack built', {
      kind,
      quality: coverage.quality_score,
      available: coverage.available.length,
      missing: coverage.missing.length,
      buildTimeMs,
    });

    return {
      ok: true,
      pack,
      buildTimeMs,
      modulesAttempted,
      modulesFailed,
    };

  } catch (error: any) {
    logger.error('Evidence Pack build failed', { error: error.message });
    
    return {
      ok: false,
      error: error.message || 'Unknown error',
      buildTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if message triggers Evidence Pack build
 */
export function shouldBuildEvidencePack(
  intent: EvidenceIntent,
  message: string
): boolean {
  // Intents that require evidence
  const evidenceIntents: EvidenceIntent[] = [
    'EXPLAIN_MOVE',
    'MARKET_OVERVIEW',
    'TOKEN_ANALYSIS',
    'DECISION_HELP',
    'NEW_COIN_ANALYSIS',
    'PORTFOLIO_ANALYSIS',
    'NEWS_SUMMARY',
    'DERIVATIVES_CHECK',
    'SENTIMENT_CHECK',
    'WHALE_TRACKING',
    'QUICK_PRICE',
  ];

  if (evidenceIntents.includes(intent)) {
    return true;
  }

  // Entity patterns that trigger evidence
  const entityPatterns = [
    /\$[A-Za-z]{2,10}/,           // $TICKER
    /0x[a-fA-F0-9]{40}/,           // EVM address
    /dexscreener\.com/i,           // DEX URL
    /pump\.fun/i,                  // Pump.fun
    /\b(market|overview|update)\b/i,
    /\b(why|what happened|explain)\b/i,
  ];

  return entityPatterns.some(p => p.test(message));
}

/**
 * Get available modules from an evidence pack
 */
export function getAvailableModules(pack: EvidencePack): string[] {
  return pack.coverage.available;
}

/**
 * Get summary string for Pass-1 prompts
 */
export function getEvidenceSummaryForPrompt(pack: EvidencePack): string {
  return generateCoverageSummary(pack.coverage);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  fetchDexScreener,
  fetchSecurity,
  fetchHolders,
  fetchSentiment,
  fetchNews,
  fetchDerivatives,
  fetchOnchain,
  fetchMarketSnapshot,
};
