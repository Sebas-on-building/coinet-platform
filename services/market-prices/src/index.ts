/**
 * Market Prices Service
 * Production-ready market data integration with CoinGecko (primary) and CoinMarketCap (secondary)
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
export { KeyRotationManager, getKeyRotationManager, resetKeyRotationManager } from './security/key-rotation';
export type { APIKeyConfig, KeyRotationEvent, KeyUsageStats } from './security/key-rotation';
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

// Export Token Unlocks & Vesting System (Section 3.1 - Messari)
export { TokenUnlocksService } from './services/token-unlocks.service';
export { TokenUnlocksScheduler } from './services/token-unlocks-scheduler';
export { TokenUnlocksAnalytics } from './services/token-unlocks-analytics';
export { TokenUnlocksMonitoring } from './services/token-unlocks-monitoring';
export { TokenUnlocksSystem, createTokenUnlocksSystem } from './services/token-unlocks-integration';
export { TokenUnlocksCache } from './storage/token-unlocks-cache';
export { TokenUnlocksStorage } from './storage/token-unlocks-storage';

// Export Dual-Source Token Unlocks System (Section 3.1 + 3.2 - Messari + The Tie)
export { UnifiedTokenUnlocksService } from './services/unified-token-unlocks.service';
export { DualSourceUnlocksReconciliation } from './services/dual-source-unlocks-reconciliation';

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

  // Import Express for API routes
  const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/api/health', (_req: any, res: any) => {
    res.json({
      status: 'healthy',
      service: 'market-prices',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get('/health', (_req: any, res: any) => {
    res.json({
      status: 'healthy',
      service: 'market-prices',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Store aggregator reference for routes
  let aggregator: MarketDataAggregator | null = null;

  // Prices API (works even if aggregator not ready)
  app.get('/api/prices', async (req: any, res: any) => {
    try {
      if (!aggregator) {
        return res.status(503).json({
          success: false,
          error: 'Service initializing',
          message: 'Aggregator not ready yet. Please wait a few seconds and try again.',
        });
      }
      
      const symbolsParam = req.query.symbols || req.query.symbol || 'BTC';
      const symbols = typeof symbolsParam === 'string' 
        ? symbolsParam.split(',').map((s: string) => s.trim().toUpperCase())
        : [symbolsParam.toUpperCase()];
      
      logger.info('Prices API request', { symbols, aggregatorReady: !!aggregator });
      
      const prices = await aggregator.getMarketPrices(symbols);
      
      // Log if prices are empty for debugging
      if (prices.length === 0) {
        logger.warn('Prices API returned empty array', {
          symbols,
          aggregatorReady: !!aggregator,
          aggregatorInitialized: aggregator ? (aggregator as any).isInitialized : false,
        });
      }
      
      res.json({
        success: true,
        data: prices,
        timestamp: new Date().toISOString(),
        debug: {
          symbolsRequested: symbols,
          pricesReturned: prices.length,
        },
      });
    } catch (error: any) {
      logger.error('Prices API error', { 
        error: error.message,
        stack: error.stack,
        aggregatorReady: !!aggregator,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch prices',
        message: error.message,
      });
    }
  });

  // Metrics API (works even if aggregator not ready)
  app.get('/api/metrics', async (_req: any, res: any) => {
    try {
      if (!aggregator) {
        return res.status(503).json({
          success: false,
          error: 'Service initializing',
          message: 'Aggregator not ready yet',
        });
      }
      const health = await aggregator.getHealthStatus();
      res.json({
        success: true,
        data: {
          service: 'market-prices',
          healthy: health.healthy,
          providers: health.providers,
          database: health.database,
          cache: health.cache,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Metrics API error', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch metrics',
        message: error.message,
      });
    }
  });

  // Start Express server immediately (before aggregator init)
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Market Prices Service listening on port ${PORT}`, {
      endpoints: [
        'GET /api/health',
        'GET /health',
        'GET /api/prices?symbols=BTC,ETH',
        'GET /api/metrics',
        'GET /api/fusion/:symbol',
      ],
    });
  });

  try {
    aggregator = await createAggregator();

    // Fusion API (if available)
    try {
      const { createFusionApiRouter } = await import('./fusion/fusion-api');
      const { UnifiedIntelligence } = await import('./fusion/unified-intelligence');
      const intelligence = new UnifiedIntelligence();
      app.use('/api/fusion', createFusionApiRouter(intelligence));
      logger.info('Fusion API routes mounted');
    } catch (error: any) {
      logger.warn('Fusion API not available', { error: error.message });
    }

    // Example: Subscribe to WebSocket for top coins (optional - service works without it)
    if (aggregator && getConfig().enableWebSocket) {
      try {
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
      } catch (error: any) {
        // WebSocket is optional - service can function without it
        logger.info('WebSocket subscription skipped (optional)', {
          error: error.message,
          hint: 'Service will continue without WebSocket updates'
        });
      }
    }

    // Example: Fetch market prices
    if (aggregator) {
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

      // Health check interval (reduced frequency to avoid log noise)
      setInterval(async () => {
        const health = await aggregator!.getHealthStatus();
        // Only log if unhealthy or degraded, otherwise use debug level
        if (!health.healthy) {
          logger.warn('Health check - service unhealthy', {
            healthy: health.healthy,
            providers: health.providers,
            database: health.database.connected,
            cache: health.cache.connected,
          });
        } else {
          logger.debug('Health check - service healthy', {
            healthy: health.healthy,
            providers: health.providers,
            database: health.database.connected,
            cache: health.cache.connected,
          });
        }
      }, 300000); // Every 5 minutes (reduced from 1 minute)
    }

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      if (aggregator) {
        await aggregator.shutdown();
      }
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

