/**
 * Market Prices Service
 * Divine market data integration with CoinGecko (primary) and CoinMarketCap (secondary)
 * 
 * @module @coinet/market-prices
 */

import { MarketDataAggregator } from './aggregator';
import { getConfig } from './config';
import { logger } from './utils/logger';
import { MarketPrice, PriceUpdateEvent } from './types';

// Export all types
export * from './types';

// Export components
export { MarketDataAggregator } from './aggregator';
export { CoinGeckoRestClient } from './providers/coingecko-rest';
export { CoinGeckoWebSocketClient } from './providers/coingecko-websocket';
export { CoinMarketCapRestClient } from './providers/coinmarketcap-rest';
export { DefiLlamaRestClient } from './providers/defillama-rest';
export type {
  DeFiLlamaProtocol,
  DeFiLlamaYieldPool,
  DeFiLlamaStablecoin,
  DeFiLlamaFees,
  DeFiLlamaTokenUnlock,
} from './providers/defillama-rest';

// DexScreener exports - now building correctly with all advanced features
export { DexScreenerRestClient } from './providers/dexscreener-rest';
export type { 
  DexScreenerPair, 
  DexScreenerToken,
  DexScreenerTokenProfile, 
  DexScreenerSearchResponse,
  DexScreenerBoostResponse,
  DexScreenerLiquiditySpike,
  PairQualityScore,
  LiquidityDepthAnalysis,
  VolumeAnalysis,
  MultiChainAggregatedData,
} from './providers/dexscreener-rest';

// Re-export CryptoPanic classes using direct re-export syntax
// This is identical to how CoinGeckoRestClient is exported and should work the same way
export { CryptoPanicRestClient } from './providers/cryptopanic-rest';
export { CryptoPanicNewsService } from './services/cryptopanic-news.service';
export { CryptoPanicSentimentAnalyzer } from './services/cryptopanic-sentiment.service';
export { TimescaleStorage } from './storage/timescale';
export { CacheStorage } from './storage/cache';
export { DataNormalizer, SymbolRegistry, getDataNormalizer, getSymbolRegistry } from './utils/normalizer';
export { getRateLimiter, resetRateLimiter } from './middleware/rateLimiter';
export { getConfig, buildConfig, validateConfig, resetConfig } from './config';
export { logger } from './utils/logger';

// Export CryptoPanic types
export * from './types/cryptopanic.types';

// Export Messari provider and types
export { MessariRestClient } from './providers/messari-rest';
export * from './types/messari.types';

// Export Token Unlocks & Vesting System
export { TokenUnlocksService } from './services/token-unlocks.service';
export { TokenUnlocksScheduler } from './services/token-unlocks-scheduler';
export { TokenUnlocksAnalytics } from './services/token-unlocks-analytics';
export { TokenUnlocksMonitoring } from './services/token-unlocks-monitoring';
export { TokenUnlocksSystem, createTokenUnlocksSystem } from './services/token-unlocks-integration';
export { TokenUnlocksCache } from './storage/token-unlocks-cache';
export { TokenUnlocksStorage } from './storage/token-unlocks-storage';

// Export The Tie provider and types
export { TheTieRestClient } from './providers/thetie-rest';
export * from './types/thetie.types';

// Export Secrets Manager
export * from './utils/secrets-manager';

/**
 * Create and initialize a new MarketDataAggregator instance
 */
export async function createAggregator(): Promise<MarketDataAggregator> {
  logger.info('Creating market data aggregator...');
  
  const config = getConfig();
  const aggregator = new MarketDataAggregator(config);
  
  await aggregator.initialize();
  
  logger.info('Market data aggregator created and initialized');
  
  return aggregator;
}

/**
 * Main entry point for standalone execution
 */
export async function main(): Promise<void> {
  logger.info('Starting Market Prices Service...');

  try {
    const aggregator = await createAggregator();

    // Example: Subscribe to WebSocket for top coins
    if (getConfig().enableWebSocket) {
      const topCoins = [
        'bitcoin',
        'ethereum',
        'tether',
        'binancecoin',
        'solana',
        'ripple',
        'usd-coin',
        'cardano',
        'avalanche-2',
        'dogecoin',
      ];

      await aggregator.subscribeToWebSocket(topCoins);
      logger.info('Subscribed to WebSocket for top coins', { count: topCoins.length });
    }

    // Example: Fetch market prices
    const symbols = ['BTC', 'ETH', 'SOL', 'ADA', 'AVAX'];
    const prices = await aggregator.getMarketPrices(symbols);
    logger.info('Fetched market prices', {
      count: prices.length,
      prices: prices.map((p: MarketPrice) => ({
        symbol: p.symbol,
        price: p.price,
        source: p.source,
      })),
    });

    // Listen for price updates
    aggregator.on('price_update', (event: PriceUpdateEvent) => {
      const priceData = event.data as MarketPrice;
      logger.info('Price update received', {
        coinId: priceData.coinId,
        price: priceData.price,
        source: event.source,
        updateType: priceData.updateType,
      });
    });

    // Health check interval
    setInterval(async () => {
      const health = await aggregator.getHealthStatus();
      logger.info('Health check', {
        healthy: health.healthy,
        providers: health.providers,
        database: health.database.connected,
        cache: health.cache.connected,
      });
    }, 60000); // Every minute

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      await aggregator.shutdown();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    logger.info('Market Prices Service started successfully');
  } catch (error) {
    logger.error('Failed to start Market Prices Service', { error });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default {
  createAggregator,
  MarketDataAggregator,
  getConfig,
  logger,
};

