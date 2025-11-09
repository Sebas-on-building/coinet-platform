/**
 * Market Data Streamer
 * Unified real-time streaming service combining multiple WebSocket providers
 * Divine perfection in real-time data streaming
 */

import EventEmitter from 'eventemitter3';
import {
  DataSource,
  MarketPrice,
  PriceUpdateEvent,
  PriceUpdateType,
} from '../types';
import { CoinGeckoWebSocketClient } from '../providers/coingecko-websocket';
import { logger } from '../utils/logger';

/**
 * Stream configuration
 */
export interface StreamConfig {
  symbols: string[];
  channels?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  deduplicationWindow?: number; // milliseconds
}

/**
 * Unified price update event
 */
export interface UnifiedPriceUpdate {
  symbol: string;
  price: number;
  sources: Array<{
    source: DataSource;
    price: number;
    timestamp: Date;
  }>;
  bestPrice: number;
  bestSource: DataSource;
  confidence: number;
  timestamp: Date;
}

/**
 * Stream statistics
 */
export interface StreamStats {
  totalUpdates: number;
  updatesBySource: Record<DataSource, number>;
  lastUpdate: Date | null;
  connectedSources: DataSource[];
  reconnectCount: number;
  errors: number;
}

/**
 * Market Data Streamer
 * Combines WebSocket streams from multiple providers with deduplication and aggregation
 */
export class MarketDataStreamer extends EventEmitter {
  private geckoWs?: CoinGeckoWebSocketClient;
  private config: StreamConfig;
  private stats: StreamStats;
  private priceBuffer: Map<string, Map<DataSource, { price: number; timestamp: Date }>>;
  private deduplicationWindow: number;
  private reconnectAttempts: Map<DataSource, number>;
  private isStreaming: boolean = false;

  constructor(
    geckoWs?: CoinGeckoWebSocketClient,
    config: Partial<StreamConfig> = {}
  ) {
    super();
    this.geckoWs = geckoWs;
    this.config = {
      symbols: config.symbols || [],
      channels: config.channels || ['price'],
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      deduplicationWindow: config.deduplicationWindow || 1000, // 1 second
    };
    this.deduplicationWindow = this.config.deduplicationWindow || 1000;
    this.priceBuffer = new Map();
    this.reconnectAttempts = new Map();

    this.stats = {
      totalUpdates: 0,
      updatesBySource: {
        [DataSource.COINGECKO]: 0,
        [DataSource.COINMARKETCAP]: 0,
        [DataSource.DEFILLAMA]: 0,
      },
      lastUpdate: null,
      connectedSources: [],
      reconnectCount: 0,
      errors: 0,
    };

    // Setup CoinGecko WebSocket if available
    if (this.geckoWs) {
      this.setupCoinGeckoStream();
    }
  }

  /**
   * Setup CoinGecko WebSocket stream
   */
  private setupCoinGeckoStream(): void {
    if (!this.geckoWs) return;

    this.geckoWs.on('price_update', (event: PriceUpdateEvent) => {
      this.handlePriceUpdate(event, DataSource.COINGECKO);
    });

    this.geckoWs.on('error', (error: Error) => {
      logger.error('CoinGecko WebSocket error', { error: error.message });
      this.stats.errors++;
      this.handleReconnect(DataSource.COINGECKO);
      this.emit('error', { source: DataSource.COINGECKO, error });
    });

    this.geckoWs.on('connect', () => {
      logger.info('CoinGecko WebSocket connected');
      this.stats.connectedSources.push(DataSource.COINGECKO);
      this.reconnectAttempts.set(DataSource.COINGECKO, 0);
      this.emit('connect', { source: DataSource.COINGECKO });
    });

    this.geckoWs.on('disconnect', () => {
      logger.warn('CoinGecko WebSocket disconnected');
      this.stats.connectedSources = this.stats.connectedSources.filter(
        s => s !== DataSource.COINGECKO
      );
      this.emit('disconnect', { source: DataSource.COINGECKO });
    });
  }

  /**
   * Handle price update from a provider
   */
  private handlePriceUpdate(event: PriceUpdateEvent, source: DataSource): void {
    try {
      const price = event.data as MarketPrice;
      const symbol = price.symbol.toUpperCase();

      // Initialize buffer for symbol if needed
      if (!this.priceBuffer.has(symbol)) {
        this.priceBuffer.set(symbol, new Map());
      }

      const symbolBuffer = this.priceBuffer.get(symbol)!;

      // Store price update
      symbolBuffer.set(source, {
        price: price.price,
        timestamp: new Date(),
      });

      // Update statistics
      this.stats.totalUpdates++;
      this.stats.updatesBySource[source]++;
      this.stats.lastUpdate = new Date();

      // Emit unified update after deduplication window
      this.scheduleUnifiedUpdate(symbol);
    } catch (error) {
      logger.error('Error handling price update', { source, error });
      this.stats.errors++;
    }
  }

  /**
   * Schedule unified price update after deduplication window
   */
  private scheduleUnifiedUpdate(symbol: string): void {
    // Clear any existing timeout for this symbol
    const existingTimeout = (this as any)[`_timeout_${symbol}`];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule update after deduplication window
    const timeout = setTimeout(() => {
      this.emitUnifiedUpdate(symbol);
      delete (this as any)[`_timeout_${symbol}`];
    }, this.deduplicationWindow);

    (this as any)[`_timeout_${symbol}`] = timeout;
  }

  /**
   * Emit unified price update
   */
  private emitUnifiedUpdate(symbol: string): void {
    const symbolBuffer = this.priceBuffer.get(symbol);
    if (!symbolBuffer || symbolBuffer.size === 0) return;

    // Collect all prices from different sources
    const sources: UnifiedPriceUpdate['sources'] = [];
    let bestPrice = 0;
    let bestSource: DataSource = DataSource.COINGECKO;
    let totalPrice = 0;
    let count = 0;

    symbolBuffer.forEach((data, source) => {
      sources.push({
        source,
        price: data.price,
        timestamp: data.timestamp,
      });

      totalPrice += data.price;
      count++;

      // Use CoinGecko as default best source, or first available
      if (source === DataSource.COINGECKO || count === 1) {
        bestPrice = data.price;
        bestSource = source;
      }
    });

    // Calculate average price if multiple sources
    if (count > 1) {
      bestPrice = totalPrice / count;
    }

    // Calculate confidence based on number of sources
    const confidence = Math.min(100, (count / 2) * 100);

    const unifiedUpdate: UnifiedPriceUpdate = {
      symbol,
      price: bestPrice,
      sources,
      bestPrice,
      bestSource,
      confidence: Math.round(confidence),
      timestamp: new Date(),
    };

    this.emit('price_update', unifiedUpdate);
  }

  /**
   * Start streaming prices for given symbols
   */
  async startStreaming(symbols: string[]): Promise<void> {
    if (this.isStreaming) {
      logger.warn('Streaming already started');
      return;
    }

    this.config.symbols = symbols;
    this.isStreaming = true;

    logger.info('Starting market data streaming', {
      symbols: symbols.length,
      sources: this.stats.connectedSources.length,
    });

    // Start CoinGecko WebSocket if available
    if (this.geckoWs) {
      try {
        await this.geckoWs.subscribe({
          coins: symbols.map(s => s.toLowerCase()),
          channels: this.config.channels || ['price'],
        });
      } catch (error) {
        logger.error('Failed to start CoinGecko stream', { error });
        this.stats.errors++;
      }
    }

    this.emit('stream_started', { symbols });
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) {
      return;
    }

    this.isStreaming = false;

    logger.info('Stopping market data streaming');

    // Stop CoinGecko WebSocket if available
    if (this.geckoWs) {
      try {
        // CoinGecko WebSocket doesn't have unsubscribe, just disconnect
        // The WebSocket will handle cleanup automatically
      } catch (error) {
        logger.error('Error stopping CoinGecko stream', { error });
      }
    }

    // Clear all timeouts
    this.priceBuffer.forEach((_, symbol) => {
      const timeout = (this as any)[`_timeout_${symbol}`];
      if (timeout) {
        clearTimeout(timeout);
        delete (this as any)[`_timeout_${symbol}`];
      }
    });

    this.priceBuffer.clear();
    this.emit('stream_stopped');
  }

  /**
   * Add symbols to stream
   */
  async addSymbols(symbols: string[]): Promise<void> {
    const newSymbols = symbols.filter(s => !this.config.symbols.includes(s));
    if (newSymbols.length === 0) return;

    this.config.symbols = [...this.config.symbols, ...newSymbols];

    if (this.isStreaming && this.geckoWs) {
      try {
        await this.geckoWs.subscribe({
          coins: newSymbols.map(s => s.toLowerCase()),
          channels: this.config.channels || ['price'],
        });
      } catch (error) {
        logger.error('Failed to add symbols to stream', { error });
      }
    }

    this.emit('symbols_added', { symbols: newSymbols });
  }

  /**
   * Remove symbols from stream
   */
  async removeSymbols(symbols: string[]): Promise<void> {
    this.config.symbols = this.config.symbols.filter(s => !symbols.includes(s));

    // Clear buffer for removed symbols
    symbols.forEach(symbol => {
      this.priceBuffer.delete(symbol);
      const timeout = (this as any)[`_timeout_${symbol}`];
      if (timeout) {
        clearTimeout(timeout);
        delete (this as any)[`_timeout_${symbol}`];
      }
    });

    if (this.isStreaming && this.geckoWs) {
      try {
        await this.geckoWs.subscribe({
          coins: this.config.symbols.map(s => s.toLowerCase()),
          channels: this.config.channels || ['price'],
        });
      } catch (error) {
        logger.error('Failed to remove symbols from stream', { error });
      }
    }

    this.emit('symbols_removed', { symbols });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(source: DataSource): void {
    const attempts = this.reconnectAttempts.get(source) || 0;
    const maxAttempts = this.config.maxReconnectAttempts || 10;

    if (attempts >= maxAttempts) {
      logger.error(`Max reconnection attempts reached for ${source}`);
      this.emit('reconnect_failed', { source });
      return;
    }

    this.reconnectAttempts.set(source, attempts + 1);
    this.stats.reconnectCount++;

    const interval = this.config.reconnectInterval || 5000;
    const delay = interval * Math.pow(2, attempts); // Exponential backoff

    logger.info(`Scheduling reconnection for ${source}`, {
      attempt: attempts + 1,
      delay,
    });

    setTimeout(() => {
      if (source === DataSource.COINGECKO && this.geckoWs && this.isStreaming) {
        // Re-subscribe to restart the connection
        this.geckoWs.subscribe({
          coins: this.config.symbols.map(s => s.toLowerCase()),
          channels: this.config.channels || ['price'],
        }).catch((error: Error) => {
          logger.error(`Reconnection failed for ${source}`, { error: error.message });
          this.handleReconnect(source);
        });
      }
    }, delay);
  }

  /**
   * Get stream statistics
   */
  getStats(): StreamStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalUpdates: 0,
      updatesBySource: {
        [DataSource.COINGECKO]: 0,
        [DataSource.COINMARKETCAP]: 0,
        [DataSource.DEFILLAMA]: 0,
      },
      lastUpdate: null,
      connectedSources: [...this.stats.connectedSources],
      reconnectCount: 0,
      errors: 0,
    };
  }

  /**
   * Check if streaming is active
   */
  isActive(): boolean {
    return this.isStreaming;
  }

  /**
   * Get currently subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return [...this.config.symbols];
  }
}

export default MarketDataStreamer;

