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

// DexScreener export - conditionally exported to handle missing file gracefully
// Using a runtime check to avoid crashes if the file isn't compiled
(function() {
  try {
    const dexscreenerModule = require('./providers/dexscreener-rest');
    if (dexscreenerModule?.DexScreenerRestClient) {
      (exports as any).DexScreenerRestClient = dexscreenerModule.DexScreenerRestClient;
    }
    if (dexscreenerModule?.DexScreenerPair) {
      (exports as any).DexScreenerPair = dexscreenerModule.DexScreenerPair;
    }
    if (dexscreenerModule?.DexScreenerTokenProfile) {
      (exports as any).DexScreenerTokenProfile = dexscreenerModule.DexScreenerTokenProfile;
    }
    if (dexscreenerModule?.DexScreenerSearchResponse) {
      (exports as any).DexScreenerSearchResponse = dexscreenerModule.DexScreenerSearchResponse;
    }
  } catch (error: any) {
    // DexScreener not available - that's okay, it's optional
    // Silently continue - the module will load without DexScreener exports
    if (typeof logger !== 'undefined' && logger?.warn) {
      logger.warn('DexScreener provider not available (optional)', { error: error?.message || String(error) });
    }
  }
})();

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

