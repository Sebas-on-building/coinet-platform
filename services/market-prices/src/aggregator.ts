/**
 * Market Data Aggregator
 * Orchestrates data fetching from multiple providers with failover logic
 */

import EventEmitter from 'eventemitter3';
import {
  ServiceConfig,
  MarketPrice,
  OHLCV,
  CoinMetadata,
  DataSource,
  PriceUpdateEvent,
  HealthStatus,
  ProviderError,
  RateLimitError,
  PriceUpdateType,
} from './types';
import { CoinGeckoRestClient } from './providers/coingecko-rest';
import { CoinGeckoWebSocketClient } from './providers/coingecko-websocket';
import { CoinMarketCapRestClient } from './providers/coinmarketcap-rest';
import { TimescaleStorage } from './storage/timescale';
import { CacheStorage } from './storage/cache';
import { DataNormalizer, getDataNormalizer } from './utils/normalizer';
import { logger } from './utils/logger';

export class MarketDataAggregator extends EventEmitter {
  private config: ServiceConfig;
  private geckoRest: CoinGeckoRestClient;
  private geckoWs?: CoinGeckoWebSocketClient;
  private cmcRest?: CoinMarketCapRestClient;
  private storage: TimescaleStorage;
  private cache: CacheStorage;
  private normalizer: DataNormalizer;
  private isInitialized: boolean = false;
  private lastHealthCheck: Date | null = null;
  
  // Fallback tracking for monitoring
  private coinGeckoFailureStartTime: Date | null = null;
  private fallbackCount: number = 0;
  private totalRequests: number = 0;
  private lastFallbackAlert: Date | null = null;

  constructor(config: ServiceConfig) {
    super();
    this.config = config;

    // Initialize providers
    this.geckoRest = new CoinGeckoRestClient(config.providers.coingecko);

    if (config.enableWebSocket && config.providers.coingecko.websocket?.enabled) {
      this.geckoWs = new CoinGeckoWebSocketClient(
        config.providers.coingecko.websocket,
        config.providers.coingecko.apiKey
      );

      // Forward WebSocket events
      this.geckoWs.on('price_update', (event: PriceUpdateEvent) => {
        this.handlePriceUpdate(event);
      });

      this.geckoWs.on('error', (error: Error) => {
        // Log network/DNS errors as debug (WebSocket is optional)
        const isNetworkError = error.message?.includes('ENOTFOUND') || 
                              error.message?.includes('ECONNREFUSED') ||
                              error.message?.includes('getaddrinfo');
        
        if (isNetworkError) {
          logger.debug('WebSocket error (optional component, non-critical)', { error: error.message });
        } else {
          logger.error('WebSocket error', { error: error.message });
        }
        // Don't emit error for network issues - WebSocket is optional
        if (!isNetworkError) {
          this.emit('error', error);
        }
      });
    }

    if (config.enableCMCFallback) {
      this.cmcRest = new CoinMarketCapRestClient(config.providers.coinmarketcap);
    }

    // Initialize storage
    this.storage = new TimescaleStorage(config.database);
    this.cache = new CacheStorage(config.redis, config.cacheTTL);

    // Initialize normalizer
    this.normalizer = getDataNormalizer();

    logger.info('Market data aggregator initialized', {
      enableWebSocket: config.enableWebSocket,
      enableCMCFallback: config.enableCMCFallback,
    });
  }

  /**
   * Initialize the aggregator
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('Initializing market data aggregator...');

    // Initialize database (optional - graceful degradation)
    try {
      await this.storage.initialize();
    } catch (error: any) {
      logger.info('Database initialization skipped (optional)', {
        error: error.message,
        hint: 'Service will continue without database storage'
      });
    }

    // Test connections (optional)
    const dbHealthy = await this.storage.healthCheck().catch(() => false);
    const cacheHealthy = await this.cache.healthCheck().catch(() => false);

    logger.info('Storage initialized', {
      database: dbHealthy ? 'connected' : 'unavailable (optional)',
      cache: cacheHealthy ? 'connected' : 'unavailable (optional)',
    });

    // Service can run without DB/Cache - they're optional
    this.isInitialized = true;
    logger.info('Market data aggregator initialized successfully');
  }

  /**
   * Handle price update from WebSocket
   */
  private async handlePriceUpdate(event: PriceUpdateEvent): Promise<void> {
    try {
      const price = event.data as MarketPrice;

      // Store in cache
      await this.cache.cachePrice(price);

      // Store in database
      await this.storage.storeMarketPrice(price);

      // Emit event
      this.emit('price_update', event);

      logger.debug('Price update processed', {
        coinId: price.coinId,
        price: price.price,
        source: event.source,
      });
    } catch (error) {
      logger.error('Failed to handle price update', { error, event });
    }
  }

  /**
   * Subscribe to WebSocket price updates
   */
  async subscribeToWebSocket(coins: string[]): Promise<void> {
    if (!this.geckoWs) {
      throw new Error('WebSocket is not enabled');
    }

    logger.info('Subscribing to WebSocket price updates', {
      coins: coins.length,
    });

    await this.geckoWs.subscribe({
      coins,
      channels: ['price'],
    });
  }

  /**
   * Get market prices with failover
   */
  async getMarketPrices(
    symbols: string[],
    useCache: boolean = true
  ): Promise<MarketPrice[]> {
    const prices: MarketPrice[] = [];

    // Try cache first
    if (useCache) {
      const cachedPrices = await Promise.all(
        symbols.map((symbol) => this.cache.getPrice(symbol))
      );

      for (let i = 0; i < symbols.length; i++) {
        if (cachedPrices[i]) {
          prices.push(cachedPrices[i]!);
          symbols.splice(i, 1);
          i--;
        }
      }

      if (symbols.length === 0) {
        logger.info('All prices served from cache');
        return prices;
      }
    }

    // Try CoinGecko first
    try {
      logger.info('Fetching prices from CoinGecko', { symbols });
      const geckoData = await this.geckoRest.getCoinMarkets('usd', symbols);
      
      // Reset failure tracking on success
      if (this.coinGeckoFailureStartTime !== null) {
        const outageDuration = Date.now() - this.coinGeckoFailureStartTime.getTime();
        logger.info('CoinGecko recovered', {
          outageDurationMs: outageDuration,
          outageDurationMinutes: Math.round(outageDuration / 60000),
        });
        this.coinGeckoFailureStartTime = null;
      }
      
      this.totalRequests++;
      
      for (const market of geckoData) {
        const price = this.normalizer.normalizeCoinGeckoMarket(market);
        prices.push(price);

        // Cache and store
        await this.cache.cachePrice(price);
        await this.storage.storeMarketPrice(price);
      }

      return prices;
    } catch (error) {
      logger.error('CoinGecko request failed', { error });
      
      // Track failure start time (only set once per outage)
      if (this.coinGeckoFailureStartTime === null) {
        this.coinGeckoFailureStartTime = new Date();
        logger.warn('CoinGecko failure detected, starting outage timer', {
          symbols,
        });
      }
      
      this.totalRequests++;

      // Only failover to CoinMarketCap if CoinGecko has been down for >5 minutes
      const outageDuration = this.coinGeckoFailureStartTime 
        ? Date.now() - this.coinGeckoFailureStartTime.getTime()
        : 0;
      const outageMinutes = outageDuration / 60000;
      
      if (this.config.enableCMCFallback && this.cmcRest && outageMinutes >= 5) {
        logger.warn('CoinGecko outage exceeds 5 minutes, activating CoinMarketCap fallback', {
          outageMinutes: outageMinutes.toFixed(2),
          symbols,
        });
        return this.getMarketPricesFromCMC(symbols);
      } else if (this.config.enableCMCFallback && this.cmcRest && outageMinutes < 5) {
        logger.info('CoinGecko outage < 5 minutes, waiting before fallback', {
          outageMinutes: outageMinutes.toFixed(2),
          symbols,
        });
      }

      // If no fallback or outage too short, try database
      return this.getMarketPricesFromDB(symbols);
    }
  }

  /**
   * Get market prices from CoinMarketCap (fallback)
   */
  private async getMarketPricesFromCMC(symbols: string[]): Promise<MarketPrice[]> {
    if (!this.cmcRest) {
      throw new Error('CoinMarketCap client not available');
    }

    this.fallbackCount++;
    // Calculate failover rate based on total requests (only count successful CoinGecko requests + fallbacks)
    const failoverRate = this.totalRequests > 0 
      ? (this.fallbackCount / this.totalRequests) * 100 
      : 0;

    logger.info('Falling back to CoinMarketCap', { 
      symbols,
      failoverRate: failoverRate.toFixed(2),
      totalFallbacks: this.fallbackCount,
      totalRequests: this.totalRequests,
    });

    // Alert if failover rate exceeds 10%
    if (failoverRate > 10) {
      const now = new Date();
      // Only alert once per hour to avoid spam
      if (!this.lastFallbackAlert || (now.getTime() - this.lastFallbackAlert.getTime()) > 3600000) {
        logger.error('HIGH FAILOVER RATE ALERT: CoinGecko failover rate exceeds 10%', {
          failoverRate: failoverRate.toFixed(2),
          totalFallbacks: this.fallbackCount,
          totalRequests: this.totalRequests,
          coinGeckoOutageDuration: this.coinGeckoFailureStartTime 
            ? Math.round((Date.now() - this.coinGeckoFailureStartTime.getTime()) / 60000)
            : 0,
        });
        this.emit('high_failover_rate', {
          failoverRate,
          totalFallbacks: this.fallbackCount,
          totalRequests: this.totalRequests,
        });
        this.lastFallbackAlert = now;
      }
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, this.config.failoverRetryDelay));

      const cmcData = await this.cmcRest.getQuotesBySymbol(symbols);
      const prices: MarketPrice[] = [];

      for (const symbol of symbols) {
        if (cmcData[symbol]) {
          const price = this.normalizer.normalizeCoinMarketCapQuote(
            symbol,
            cmcData[symbol]
          );
          prices.push(price);

          // Cache and store
          await this.cache.cachePrice(price);
          await this.storage.storeMarketPrice(price);
        }
      }

      logger.info('Prices fetched from CoinMarketCap (fallback)', {
        count: prices.length,
        failoverRate: failoverRate.toFixed(2),
      });

      return prices;
    } catch (error) {
      logger.error('CoinMarketCap fallback failed', { error });
      
      // Last resort: database
      return this.getMarketPricesFromDB(symbols);
    }
  }

  /**
   * Get market prices from database (last resort)
   */
  private async getMarketPricesFromDB(symbols: string[]): Promise<MarketPrice[]> {
    logger.warn('Using database as last resort for prices', { symbols });

    const prices: MarketPrice[] = [];

    for (const symbol of symbols) {
      const price = await this.storage.getLatestPrice(symbol);
      if (price) {
        prices.push(price);
      }
    }

    return prices;
  }

  /**
   * Get OHLCV data with failover
   */
  async getOHLCV(
    coinId: string,
    interval: string = '1d',
    days: number = 7,
    useCache: boolean = true
  ): Promise<OHLCV[]> {
    // Try cache first
    if (useCache) {
      const cached = await this.cache.getOHLCV(coinId, interval);
      if (cached) {
        logger.info('OHLCV served from cache', { coinId, interval });
        return cached;
      }
    }

    // Try CoinGecko
    try {
      logger.info('Fetching OHLCV from CoinGecko', { coinId, days });
      
      const geckoId = this.normalizer['registry'].toGecko(coinId) || coinId;
      const geckoData = await this.geckoRest.getOHLC(geckoId, 'usd', days);
      
      const ohlcv = this.normalizer.normalizeCoinGeckoOHLC(
        geckoId,
        geckoData,
        coinId
      );

      // Cache and store
      await this.cache.cacheOHLCV(coinId, interval, ohlcv);
      await this.storage.storeOHLCV(ohlcv);

      return ohlcv;
    } catch (error) {
      logger.error('CoinGecko OHLCV request failed', { error });

      // Failover to CoinMarketCap
      if (this.config.enableCMCFallback && this.cmcRest) {
        return this.getOHLCVFromCMC(coinId, interval, days);
      }

      throw error;
    }
  }

  /**
   * Get OHLCV from CoinMarketCap (fallback)
   */
  private async getOHLCVFromCMC(
    coinId: string,
    interval: string,
    days: number
  ): Promise<OHLCV[]> {
    if (!this.cmcRest) {
      throw new Error('CoinMarketCap client not available');
    }

    logger.info('Falling back to CoinMarketCap for OHLCV', { coinId });

    try {
      await new Promise((resolve) => setTimeout(resolve, this.config.failoverRetryDelay));

      const cmcId = this.normalizer['registry'].toCMC(coinId);
      if (!cmcId) {
        throw new Error(`No CoinMarketCap ID mapping for ${coinId}`);
      }

      const timeEnd = Date.now();
      const timeStart = timeEnd - days * 24 * 60 * 60 * 1000;

      const cmcData = await this.cmcRest.getOHLCV(
        cmcId,
        'USD',
        'daily',
        timeStart,
        timeEnd
      );

      const ohlcv = this.normalizer.normalizeCoinMarketCapOHLCV(cmcData);

      // Cache and store
      await this.cache.cacheOHLCV(coinId, interval, ohlcv);
      await this.storage.storeOHLCV(ohlcv);

      return ohlcv;
    } catch (error) {
      logger.error('CoinMarketCap OHLCV fallback failed', { error });
      throw error;
    }
  }

  /**
   * Get coin metadata with failover
   */
  async getMetadata(coinId: string, useCache: boolean = true): Promise<CoinMetadata> {
    // Try cache first
    if (useCache) {
      const cached = await this.cache.getMetadata(coinId);
      if (cached) {
        logger.info('Metadata served from cache', { coinId });
        return cached;
      }
    }

    // Try CoinGecko
    try {
      logger.info('Fetching metadata from CoinGecko', { coinId });
      
      const geckoId = this.normalizer['registry'].toGecko(coinId) || coinId;
      const geckoData = await this.geckoRest.getCoinById(geckoId);
      
      const metadata = this.normalizer.normalizeCoinGeckoMetadata(geckoData);

      // Cache and store
      await this.cache.cacheMetadata(metadata);
      await this.storage.storeMetadata(metadata);

      return metadata;
    } catch (error) {
      logger.error('CoinGecko metadata request failed', { error });

      // Failover to CoinMarketCap
      if (this.config.enableCMCFallback && this.cmcRest) {
        return this.getMetadataFromCMC(coinId);
      }

      throw error;
    }
  }

  /**
   * Get metadata from CoinMarketCap (fallback)
   */
  private async getMetadataFromCMC(coinId: string): Promise<CoinMetadata> {
    if (!this.cmcRest) {
      throw new Error('CoinMarketCap client not available');
    }

    logger.info('Falling back to CoinMarketCap for metadata', { coinId });

    try {
      await new Promise((resolve) => setTimeout(resolve, this.config.failoverRetryDelay));

      const cmcId = this.normalizer['registry'].toCMC(coinId);
      if (!cmcId) {
        throw new Error(`No CoinMarketCap ID mapping for ${coinId}`);
      }

      const cmcData = await this.cmcRest.getMetadataById(cmcId);
      const data = cmcData.data[cmcId];

      const metadata = this.normalizer.normalizeCoinMarketCapMetadata(data);

      // Cache and store
      await this.cache.cacheMetadata(metadata);
      await this.storage.storeMetadata(metadata);

      return metadata;
    } catch (error) {
      logger.error('CoinMarketCap metadata fallback failed', { error });
      throw error;
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const now = new Date();

    const status: HealthStatus = {
      service: 'market-prices',
      healthy: false,
      timestamp: now,
      providers: {
        coingecko: {
          rest: false,
          websocket: false,
        },
        coinmarketcap: {
          rest: false,
        },
      },
      database: {
        connected: false,
      },
      cache: {
        connected: false,
      },
    };

    // Check CoinGecko REST
    try {
      status.providers.coingecko.rest = await this.geckoRest.healthCheck();
      status.providers.coingecko.lastSuccessfulRequest = now;
    } catch (error) {
      status.providers.coingecko.lastError = (error as Error).message;
    }

    // Check CoinGecko WebSocket
    if (this.geckoWs) {
      status.providers.coingecko.websocket = this.geckoWs.isHealthy();
    }

    // Check CoinMarketCap
    if (this.cmcRest) {
      try {
        status.providers.coinmarketcap.rest = await this.cmcRest.healthCheck();
        status.providers.coinmarketcap.lastSuccessfulRequest = now;
      } catch (error) {
        status.providers.coinmarketcap.lastError = (error as Error).message;
      }
    }

    // Check database
    status.database.connected = await this.storage.healthCheck();

    // Check cache
    status.cache.connected = await this.cache.healthCheck();
    const cacheStats = await this.cache.getStats();
    if (cacheStats) {
      status.cache.hitRate = cacheStats.hitRate;
    }

    // Overall health
    status.healthy = status.providers.coingecko.rest && status.database.connected;

    this.lastHealthCheck = now;

    return status;
  }

  /**
   * Get statistics
   */
  getStats(): any {
    return {
      geckoRest: this.geckoRest.getStats(),
      geckoWs: this.geckoWs?.getStats(),
      cmcRest: this.cmcRest?.getStats(),
      lastHealthCheck: this.lastHealthCheck,
    };
  }

  /**
   * Shutdown the aggregator
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down market data aggregator...');

    // Disconnect WebSocket
    if (this.geckoWs) {
      await this.geckoWs.disconnect();
    }

    // Close storage
    await this.storage.close();
    await this.cache.close();

    this.removeAllListeners();

    logger.info('Market data aggregator shut down successfully');
  }
}

export default MarketDataAggregator;

