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
import { getCircuitBreakerManager } from './middleware/circuit-breaker';
import { InputValidator } from './utils/validation';

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
        logger.error('WebSocket error', { error: error.message });
        this.emit('error', error);
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

    // Initialize database
    await this.storage.initialize();

    // Test connections
    const dbHealthy = await this.storage.healthCheck();
    const cacheHealthy = await this.cache.healthCheck();

    if (!dbHealthy) {
      throw new Error('Database health check failed');
    }

    logger.info('Storage initialized', {
      database: dbHealthy,
      cache: cacheHealthy,
    });

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
      // Don't throw - continue processing other updates
    }
  }

  /**
   * Enhanced WebSocket subscription with automatic REST fallback
   */
  async subscribeToWebSocketWithFallback(
    coins: string[],
    fallbackInterval: number = 60000 // Fallback to REST every 60s if WS fails
  ): Promise<void> {
    if (!this.geckoWs) {
      logger.warn('WebSocket not available, using REST fallback');
      // Fallback to periodic REST polling
      this.startRESTFallback(coins, fallbackInterval);
      return;
    }

    try {
      await this.subscribeToWebSocket(coins);
      
      // Monitor WebSocket health and fallback if needed
      this.monitorWebSocketHealth(coins, fallbackInterval);
    } catch (error) {
      logger.error('WebSocket subscription failed, falling back to REST', { error });
      this.startRESTFallback(coins, fallbackInterval);
    }
  }

  /**
   * Monitor WebSocket health and fallback to REST if unhealthy
   */
  private monitorWebSocketHealth(
    coins: string[],
    fallbackInterval: number
  ): void {
    const healthCheckInterval = setInterval(async () => {
      if (!this.geckoWs || !this.geckoWs.isHealthy()) {
        logger.warn('WebSocket unhealthy, switching to REST fallback');
        clearInterval(healthCheckInterval);
        this.startRESTFallback(coins, fallbackInterval);
      }
    }, 30000); // Check every 30 seconds

    // Clean up on shutdown
    this.once('shutdown', () => {
      clearInterval(healthCheckInterval);
    });
  }

  /**
   * Start REST fallback polling
   */
  private restFallbackTimers: Map<string, NodeJS.Timeout> = new Map();

  private startRESTFallback(coins: string[], interval: number): void {
    // Clear existing timers for these coins
    coins.forEach((coin) => {
      const existing = this.restFallbackTimers.get(coin);
      if (existing) {
        clearInterval(existing);
      }
    });

    // Start periodic REST polling
    const timer = setInterval(async () => {
      try {
        const symbols = coins.map((coin) => {
          // Convert CoinGecko ID to symbol if needed
          return coin.split('-')[0].toUpperCase();
        });
        
        await this.getMarketPrices(symbols, false); // Don't use cache
        logger.debug('REST fallback polling completed', { coins: symbols });
      } catch (error) {
        logger.error('REST fallback polling failed', { error, coins });
      }
    }, interval);

    coins.forEach((coin) => {
      this.restFallbackTimers.set(coin, timer);
    });

    logger.info('REST fallback polling started', {
      coins: coins.length,
      interval,
    });
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
    // Validate and sanitize input
    const validatedSymbols = InputValidator.validateSymbols(symbols);
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
      logger.info('Fetching prices from CoinGecko', { symbols: validatedSymbols });
      const geckoData = await this.geckoRest.getCoinMarkets('usd', validatedSymbols);
      
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

      // Failover to CoinMarketCap
      if (this.config.enableCMCFallback && this.cmcRest) {
        return this.getMarketPricesFromCMC(validatedSymbols);
      }

      // If no fallback, try database
      return this.getMarketPricesFromDB(validatedSymbols);
    }
  }

  /**
   * Get market prices from CoinMarketCap (fallback)
   */
  private async getMarketPricesFromCMC(symbols: string[]): Promise<MarketPrice[]> {
    if (!this.cmcRest) {
      throw new Error('CoinMarketCap client not available');
    }

    logger.info('Falling back to CoinMarketCap', { symbols });

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

    // Get circuit breaker stats
    const circuitBreakers = getCircuitBreakerManager().getAllStats();

    // Check CoinGecko REST
    try {
      status.providers.coingecko.rest = await this.geckoRest.healthCheck();
      status.providers.coingecko.lastSuccessfulRequest = now;
      
      // Add circuit breaker status
      const cgBreaker = circuitBreakers[DataSource.COINGECKO];
      if (cgBreaker) {
        (status.providers.coingecko as any).circuitBreaker = {
          state: cgBreaker.state,
          failures: cgBreaker.failures,
          isOpen: cgBreaker.state === 'open',
        };
      }
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
        
        // Add circuit breaker status
        const cmcBreaker = circuitBreakers[DataSource.COINMARKETCAP];
        if (cmcBreaker) {
          (status.providers.coinmarketcap as any).circuitBreaker = {
            state: cmcBreaker.state,
            failures: cmcBreaker.failures,
            isOpen: cmcBreaker.state === 'open',
          };
        }
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

    // Emit shutdown event
    this.emit('shutdown');

    // Clear REST fallback timers
    for (const timer of this.restFallbackTimers.values()) {
      clearInterval(timer);
    }
    this.restFallbackTimers.clear();

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

