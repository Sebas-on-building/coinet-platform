/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧩 EVIDENCE PACK — MODULE REGISTRY                                        ║
 * ║                                                                               ║
 * ║   Unified interface for all evidence modules.                                 ║
 * ║   Each module handles its own timeout, retry, and caching.                    ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Universal Evidence Pack Layer                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../../utils/logger';
import { emitModuleFetchResult } from '../observability';
import { getCachedModuleData, setCachedModuleData } from '../cache';
import {
  EvidenceModule,
  ModuleStatus,
  ChainId,
  TOKEN_MODULE_CONFIG,
  MARKET_MODULE_CONFIG,
  // Token data types
  DexScreenerEvidence,
  SecurityEvidence,
  HoldersEvidence,
  PumpFunEvidence,
  SmartMoneyEvidence,
  // Market data types
  MarketSnapshotEvidence,
  DerivativesEvidence,
  SentimentEvidence,
  NewsEvidence,
} from '../types';

// ============================================================================
// GENERIC MODULE FETCHER
// ============================================================================

interface ModuleFetchOptions {
  chain?: ChainId;
  address?: string;
  scope?: string;
  forceRefresh?: boolean;
}

/**
 * Generic wrapper that handles timeout, retry, cache, and error handling
 */
async function fetchModuleWithHandling<T>(
  moduleName: string,
  fetchFn: () => Promise<T>,
  options: ModuleFetchOptions = {}
): Promise<EvidenceModule<T>> {
  const config = TOKEN_MODULE_CONFIG[moduleName] || MARKET_MODULE_CONFIG[moduleName];
  const startTime = Date.now();

  // Check cache first (unless force refresh)
  if (!options.forceRefresh) {
    const cached = getCachedModuleData<T>(
      moduleName,
      options.chain,
      options.address,
      options.scope
    );

    if (cached.status === 'fresh' || cached.status === 'stale') {
      const result: EvidenceModule<T> = {
        module: moduleName,
        status: 'success',
        ts: startTime,
        freshness_seconds: cached.freshnessSeconds,
        source: `cache:${moduleName}`,
        data: cached.data,
        from_cache: true,
        latency_ms: Date.now() - startTime,
      };

      emitModuleFetchResult(
        moduleName,
        'success',
        result.latency_ms,
        true,
        undefined,
        undefined,
        cached.freshnessSeconds
      );

      return result;
    }
  }

  // Fetch with timeout
  const timeoutMs = config?.timeoutMs || 3000;
  const retries = config?.retries || 0;

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await Promise.race<T>([
        fetchFn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
        ),
      ]);

      const latencyMs = Date.now() - startTime;

      // Cache the result
      setCachedModuleData(moduleName, data, options.chain, options.address, options.scope);

      const result: EvidenceModule<T> = {
        module: moduleName,
        status: 'success',
        ts: Date.now(),
        freshness_seconds: 0,
        source: moduleName,
        data,
        from_cache: false,
        latency_ms: latencyMs,
      };

      emitModuleFetchResult(moduleName, 'success', latencyMs, false);
      return result;

    } catch (error: any) {
      lastError = error;
      
      // If timeout and we have retries left, continue
      if (error.message === 'TIMEOUT' && attempt < retries) {
        logger.debug(`⚠️ ${moduleName} timeout, retry ${attempt + 1}/${retries}`);
        continue;
      }

      // Rate limit - wait and retry
      if (error.status === 429 && attempt < retries) {
        const backoffMs = 500 * Math.pow(2, attempt);
        logger.debug(`⚠️ ${moduleName} rate limited, waiting ${backoffMs}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      break;
    }
  }

  // All attempts failed
  const latencyMs = Date.now() - startTime;
  const errorCode = lastError?.message === 'TIMEOUT' ? 'TIMEOUT' : 
                    (lastError as any)?.status === 429 ? 'RATE_LIMITED' : 
                    'FETCH_ERROR';

  const result: EvidenceModule<T> = {
    module: moduleName,
    status: errorCode === 'TIMEOUT' ? 'timeout' : errorCode === 'RATE_LIMITED' ? 'rate_limited' : 'failed',
    ts: Date.now(),
    freshness_seconds: 0,
    source: moduleName,
    data: null,
    error: {
      code: errorCode,
      message: lastError?.message || 'Unknown error',
    },
    from_cache: false,
    latency_ms: latencyMs,
  };

  emitModuleFetchResult(
    moduleName,
    result.status,
    latencyMs,
    false,
    errorCode,
    lastError?.message
  );

  return result;
}

// ============================================================================
// TOKEN MODULE FETCHERS
// ============================================================================

/**
 * Fetch DexScreener data for a token
 */
export async function fetchDexScreener(
  chain: ChainId,
  address: string,
  forceRefresh = false
): Promise<EvidenceModule<DexScreenerEvidence>> {
  return fetchModuleWithHandling<DexScreenerEvidence>(
    'dexscreener',
    async () => {
      // Import the actual fetcher from token-context
      const { fetchDexScreenerData } = await import('../../token-context/modules/dexscreener');
      const result = await fetchDexScreenerData(address, chain);
      
      if (!result || !result.data) {
        throw new Error('No DexScreener data returned');
      }

      // Map to our evidence format
      return {
        price: result.data.price,
        price_change_24h: result.data.priceChange24h,
        price_change_1h: result.data.priceChange?.h1 || 0,
        price_change_5m: result.data.priceChange?.m5 || 0,
        volume_24h: result.data.volume24h,
        liquidity: result.data.liquidity,
        market_cap: result.data.marketCap,
        fdv: result.data.fdv,
        pair_age_hours: result.data.pairAge,
        pair_created_at: result.data.pairCreatedAt,
        txns_24h: {
          buys: result.data.txns24h?.buys || 0,
          sells: result.data.txns24h?.sells || 0,
          total: (result.data.txns24h?.buys || 0) + (result.data.txns24h?.sells || 0),
        },
        pair_address: result.data.pairAddress || '',
        dex_id: result.data.dexId || 'unknown',
      };
    },
    { chain, address, forceRefresh }
  );
}

/**
 * Fetch security data for a token
 */
export async function fetchSecurity(
  chain: ChainId,
  address: string,
  forceRefresh = false
): Promise<EvidenceModule<SecurityEvidence>> {
  return fetchModuleWithHandling<SecurityEvidence>(
    'security',
    async () => {
      // Import the actual fetcher from token-context
      const { fetchSecurityData } = await import('../../token-context/modules/security');
      const result = await fetchSecurityData(address, chain);
      
      if (!result || !result.data) {
        throw new Error('No security data returned');
      }

      const data = result.data;
      return {
        risk_level: data.riskLevel,
        risk_score: data.riskScore,
        flags: data.flags.map(f => ({
          code: f.code,
          severity: f.severity,
          description: f.description,
        })),
        is_honeypot: data.isHoneypot,
        is_mintable: data.isMintable,
        is_proxy: data.isProxy,
        is_open_source: data.isOpenSource,
        can_take_back_ownership: data.canTakeBackOwnership,
        has_blacklist: data.hasBlacklist,
        has_trading_cooldown: data.hasTradingCooldown,
        buy_tax: data.buyTax,
        sell_tax: data.sellTax,
        is_freeze_authority: data.isFreezeAuthority ?? null,
        is_mint_authority: data.isMintAuthority ?? null,
        notes: data.notes,
      };
    },
    { chain, address, forceRefresh }
  );
}

/**
 * Fetch holders data for a token (placeholder - implement with actual API)
 */
export async function fetchHolders(
  chain: ChainId,
  address: string,
  forceRefresh = false
): Promise<EvidenceModule<HoldersEvidence>> {
  return fetchModuleWithHandling<HoldersEvidence>(
    'holders',
    async () => {
      // TODO: Implement actual holders API (Solscan, Etherscan)
      throw new Error('Holders API not implemented');
    },
    { chain, address, forceRefresh }
  );
}

/**
 * Fetch pump.fun data for a token (placeholder - implement with actual API)
 */
export async function fetchPumpFun(
  address: string,
  forceRefresh = false
): Promise<EvidenceModule<PumpFunEvidence>> {
  return fetchModuleWithHandling<PumpFunEvidence>(
    'pumpfun',
    async () => {
      // TODO: Implement actual pump.fun API
      throw new Error('PumpFun API not implemented');
    },
    { chain: 'solana', address, forceRefresh }
  );
}

/**
 * Fetch smart money data for a token (placeholder - implement with actual API)
 */
export async function fetchSmartMoney(
  chain: ChainId,
  address: string,
  forceRefresh = false
): Promise<EvidenceModule<SmartMoneyEvidence>> {
  return fetchModuleWithHandling<SmartMoneyEvidence>(
    'smartmoney',
    async () => {
      // TODO: Implement actual smart money API (Birdeye)
      throw new Error('SmartMoney API not implemented');
    },
    { chain, address, forceRefresh }
  );
}

// ============================================================================
// MARKET MODULE FETCHERS
// ============================================================================

/**
 * Fetch market snapshot (BTC, ETH, SOL, totals)
 */
export async function fetchMarketSnapshot(
  forceRefresh = false
): Promise<EvidenceModule<MarketSnapshotEvidence>> {
  return fetchModuleWithHandling<MarketSnapshotEvidence>(
    'market_snapshot',
    async () => {
      // Import market data service
      const { fetchPricesForMessage } = await import('../../market-data');
      const { getMarketSentiment } = await import('../../sentiment-service');

      const [marketData, sentiment] = await Promise.all([
        fetchPricesForMessage('BTC ETH SOL'),
        getMarketSentiment().catch(() => null),
      ]);

      const btc = marketData.prices.find(p => p.symbol === 'BTC');
      const eth = marketData.prices.find(p => p.symbol === 'ETH');
      const sol = marketData.prices.find(p => p.symbol === 'SOL');

      return {
        btc: {
          price: btc?.price || 0,
          change_24h: btc?.priceChange24h || 0,
          dominance: btc?.dominance || 0,
          volume_24h: btc?.volume24h || 0,
        },
        eth: {
          price: eth?.price || 0,
          change_24h: eth?.priceChange24h || 0,
          volume_24h: eth?.volume24h || 0,
        },
        sol: {
          price: sol?.price || 0,
          change_24h: sol?.priceChange24h || 0,
          volume_24h: sol?.volume24h || 0,
        },
        total_market_cap: marketData.globalMetrics?.totalMarketCap || 0,
        total_volume_24h: marketData.globalMetrics?.totalVolume24h || 0,
        fear_greed_index: sentiment?.fearGreed?.value || 50,
        fear_greed_label: sentiment?.fearGreed?.classification || 'neutral',
        btc_eth_ratio: (btc?.price || 0) / (eth?.price || 1),
        market_trend: sentiment?.fearGreed?.value > 60 ? 'bullish' : 
                      sentiment?.fearGreed?.value < 40 ? 'bearish' : 'neutral',
      };
    },
    { scope: 'global', forceRefresh }
  );
}

/**
 * Fetch derivatives data
 */
export async function fetchDerivatives(
  forceRefresh = false
): Promise<EvidenceModule<DerivativesEvidence>> {
  return fetchModuleWithHandling<DerivativesEvidence>(
    'derivatives',
    async () => {
      // Import derivatives service
      const { getPerpsSnapshot } = await import('../../liquidation-service');
      const perps = await getPerpsSnapshot(['BTC', 'ETH', 'SOL']);

      const btcFunding = perps.fundingRates.find(f => f.symbol === 'BTC');
      const ethFunding = perps.fundingRates.find(f => f.symbol === 'ETH');
      const solFunding = perps.fundingRates.find(f => f.symbol === 'SOL');

      return {
        funding_btc: btcFunding?.rate || 0,
        funding_eth: ethFunding?.rate || 0,
        funding_sol: solFunding?.rate || 0,
        open_interest_btc: perps.openInterest?.BTC || 0,
        open_interest_eth: perps.openInterest?.ETH || 0,
        liquidations_24h: perps.marketSummary?.totalLiquidations24h || 0,
        liquidations_long: perps.marketSummary?.longLiquidations24h || 0,
        liquidations_short: perps.marketSummary?.shortLiquidations24h || 0,
        long_short_ratio: perps.marketSummary?.longShortRatio || 1,
        market_bias: perps.marketSummary?.longShortRatio > 1.2 ? 'long' :
                     perps.marketSummary?.longShortRatio < 0.8 ? 'short' : 'neutral',
        risk_level: perps.marketSummary?.totalLiquidations24h > 500000000 ? 'extreme' :
                    perps.marketSummary?.totalLiquidations24h > 200000000 ? 'high' :
                    perps.marketSummary?.totalLiquidations24h > 50000000 ? 'medium' : 'low',
      };
    },
    { scope: 'global', forceRefresh }
  );
}

/**
 * Fetch sentiment data
 */
export async function fetchSentiment(
  forceRefresh = false
): Promise<EvidenceModule<SentimentEvidence>> {
  return fetchModuleWithHandling<SentimentEvidence>(
    'sentiment',
    async () => {
      const { getMarketSentiment } = await import('../../sentiment-service');
      const { calculateCSI } = await import('../../coinet-sentiment-index');

      const [sentiment, csi] = await Promise.all([
        getMarketSentiment(),
        calculateCSI().catch(() => null),
      ]);

      const score = csi?.index?.rounded || sentiment?.fearGreed?.value || 50;
      
      return {
        overall_score: score,
        social_score: csi?.components?.social || 50,
        news_score: csi?.components?.news || 50,
        label: score < 20 ? 'extreme_fear' :
               score < 40 ? 'fear' :
               score < 60 ? 'neutral' :
               score < 80 ? 'greed' : 'extreme_greed',
        trending_topics: [],
        sentiment_change_24h: 0,
      };
    },
    { scope: 'global', forceRefresh }
  );
}

/**
 * Fetch news data
 */
export async function fetchNews(
  forceRefresh = false
): Promise<EvidenceModule<NewsEvidence>> {
  return fetchModuleWithHandling<NewsEvidence>(
    'news',
    async () => {
      const { getEnrichedNewsForCoins } = await import('../../news-service');
      const newsResult = await getEnrichedNewsForCoins(['BTC', 'ETH', 'SOL']);

      if (!newsResult || newsResult.articles.length === 0) {
        return {
          articles: [],
          dominant_sentiment: 'neutral',
          alert_count: 0,
          breaking_news: false,
          key_events: [],
        };
      }

      return {
        articles: newsResult.articles.slice(0, 10).map(a => ({
          title: a.title,
          source: a.source,
          sentiment: a.sentiment?.label || 'neutral',
          impact: a.sentiment?.impact || 'low',
          timestamp: new Date(a.publishedAt).getTime(),
          url: a.url,
        })),
        dominant_sentiment: newsResult.dominantSentiment || 'neutral',
        alert_count: newsResult.aggregateIntelligence?.criticalAlerts?.length || 0,
        breaking_news: (newsResult.aggregateIntelligence?.criticalAlerts?.length || 0) > 0,
        key_events: newsResult.aggregateIntelligence?.marketMood?.catalysts || [],
      };
    },
    { scope: 'global', forceRefresh }
  );
}

// ============================================================================
// MODULE REGISTRY
// ============================================================================

export const TOKEN_MODULES = {
  dexscreener: fetchDexScreener,
  security: fetchSecurity,
  holders: fetchHolders,
  pumpfun: fetchPumpFun,
  smartmoney: fetchSmartMoney,
} as const;

export const MARKET_MODULES = {
  market_snapshot: fetchMarketSnapshot,
  derivatives: fetchDerivatives,
  sentiment: fetchSentiment,
  news: fetchNews,
} as const;

export type TokenModuleName = keyof typeof TOKEN_MODULES;
export type MarketModuleName = keyof typeof MARKET_MODULES;
