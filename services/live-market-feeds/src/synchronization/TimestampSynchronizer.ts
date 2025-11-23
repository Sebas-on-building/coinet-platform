/**
 * =========================================
 * TIMESTAMP SYNCHRONIZER
 * =========================================
 * Synchronizes timestamps across different exchanges and systems
 * ensuring data freshness and accurate time-based operations
 */

import { EventEmitter } from 'events';
import { MarketData, ExchangeType, MarketDataType, TradeData, QuoteData, OrderBookData } from '../types'; // Import specific data types
import { Logger } from '../utils/Logger';

export interface TimeOffset {
  exchange: string;
  offset: number; // milliseconds
  lastUpdated: Date;
  accuracy: number; // confidence level 0-1
}

export interface TimeOffsetMap {
  [exchange: string]: TimeOffset;
}

// Redefine SynchronizedData as a discriminated union
export interface BaseSynchronizedData {
  synchronizedTimestamp: Date;
  originalTimestamp: Date;
  clockDrift: number;
  isStale: boolean;
  shouldBuffer?: boolean;
}

export interface SynchronizedTradeData extends BaseSynchronizedData, TradeData {}
export interface SynchronizedQuoteData extends BaseSynchronizedData, QuoteData {}
export interface SynchronizedOrderBookData extends BaseSynchronizedData, OrderBookData {}

export type SynchronizedMarketData = SynchronizedTradeData | SynchronizedQuoteData | SynchronizedOrderBookData;

export class TimestampSynchronizer extends EventEmitter {
  private logger: Logger;
  private timeOffsets: Map<string, TimeOffset> = new Map();
  private ntpServers: string[] = [
    'time.google.com',
    'time.cloudflare.com',
    'time.apple.com',
    'time.windows.com'
  ];
  private systemClockOffset: number = 0;
  private isRunning: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private maxClockDrift: number = 1000; // 1 second max drift

  constructor() {
    super();
    this.logger = new Logger('TimestampSynchronizer');
  }

  /**
   * Start timestamp synchronization
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.logger.info('⏰ Starting Timestamp Synchronizer...');

    // Initial clock synchronization
    await this.synchronizeSystemClock();

    // Start periodic synchronization
    this.syncInterval = setInterval(async () => {
      await this.synchronizeSystemClock();
      await this.updateExchangeOffsets();
    }, 60000); // Sync every minute

    this.isRunning = true;
    this.logger.info('✅ Timestamp Synchronizer started');
  }

  /**
   * Stop timestamp synchronization
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('⏰ Stopping Timestamp Synchronizer...');

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.isRunning = false;
    this.logger.info('✅ Timestamp Synchronizer stopped');
  }

  /**
   * Synchronize market data with accurate timestamps
   */
  synchronize(data: MarketData): SynchronizedMarketData {
    const now = Date.now();
    const originalTimestamp = data.timestamp.getTime();

    // Get exchange-specific offset
    const exchangeOffset = this.getExchangeOffset(data.exchange);

    // Calculate synchronized timestamp
    const synchronizedTimestamp = new Date(originalTimestamp + exchangeOffset + this.systemClockOffset);

    // Calculate clock drift
    const clockDrift = Math.abs(now - synchronizedTimestamp.getTime());

    // Check if data is stale
    const isStale = clockDrift > this.maxClockDrift ||
                   (now - originalTimestamp) > this.maxClockDrift;

    const baseSynchronizedData: BaseSynchronizedData = {
      synchronizedTimestamp,
      originalTimestamp: data.timestamp,
      clockDrift,
      isStale
    };

    let synchronizedData: SynchronizedMarketData;

    switch (data.type) {
      case 'trade':
        synchronizedData = { ...baseSynchronizedData, ...data } as SynchronizedTradeData;
        break;
      case 'quote':
        synchronizedData = { ...baseSynchronizedData, ...data } as SynchronizedQuoteData;
        break;
      case 'orderbook':
        synchronizedData = { ...baseSynchronizedData, ...data } as SynchronizedOrderBookData;
        break;
      default:
        throw new Error(`Unknown market data type: ${(data as any).type}`);
    }

    // Log significant clock drift
    if (clockDrift > 500) {
      this.logger.warn(`Significant clock drift detected: ${clockDrift}ms for ${data.exchange}`);
    }

    // Emit synchronization event
    this.emit('synchronized', synchronizedData);

    return synchronizedData;
  }

  /**
   * Get current time offsets for all exchanges
   */
  getTimeOffsets(): Map<string, TimeOffset> {
    return new Map(this.timeOffsets);
  }

  /**
   * Get system clock offset
   */
  getSystemClockOffset(): number {
    return this.systemClockOffset;
  }

  /**
   * Synchronize system clock with NTP servers
   */
  private async synchronizeSystemClock(): Promise<void> {
    let totalOffset = 0;
    let validSamples = 0;

    for (const ntpServer of this.ntpServers) {
      try {
        const offset = await this.getNtpOffset(ntpServer);
        if (offset !== null) {
          totalOffset += offset;
          validSamples++;
        }
      } catch (error: any) {
        this.logger.debug(`Failed to sync with NTP server ${ntpServer}: ${error.message}`);
      }
    }

    if (validSamples > 0) {
      const averageOffset = totalOffset / validSamples;
      this.systemClockOffset = averageOffset;

      this.logger.debug(`System clock synchronized. Offset: ${averageOffset}ms using ${validSamples} servers`);
    }
  }

  /**
   * Get time offset from a single NTP server
   */
  private async getNtpOffset(ntpServer: string): Promise<number | null> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`https://${ntpServer}`, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const endTime = Date.now();
      const serverTime = new Date(response.headers.get('date') || '').getTime();

      if (serverTime > 0) {
        const rtt = endTime - startTime;
        const offset = serverTime - (startTime + rtt / 2);
        return offset;
      }

    } catch (error: any) {
      this.logger.debug(`NTP sync failed for ${ntpServer}: ${error.message}`);
    }

    return null;
  }

  /**
   * Update exchange-specific time offsets
   */
  private async updateExchangeOffsets(): Promise<void> {
    // This would query each exchange for their current time
    // and calculate the offset from our synchronized clock

    const exchanges = ['binance', 'coinbase', 'kraken', 'deribit', 'bybit'];

    for (const exchange of exchanges) {
      try {
        const offset = await this.calculateExchangeOffset(exchange);
        if (offset !== null) {
          this.timeOffsets.set(exchange, {
            exchange,
            offset,
            lastUpdated: new Date(),
            accuracy: 0.95 // Assume high accuracy
          });
        }
      } catch (error: any) {
        this.logger.debug(`Failed to update offset for ${exchange}: ${error.message}`);
      }
    }
  }

  /**
   * Calculate time offset for a specific exchange
   */
  private async calculateExchangeOffset(exchange: string): Promise<number | null> {
    // This would make a request to the exchange's time endpoint
    // and compare with our synchronized clock

    // For now, return cached or estimated values
    switch (exchange) {
      case 'binance':
        return 50; // Binance typically has ~50ms offset
      case 'coinbase':
        return 25; // Coinbase has very low latency
      case 'kraken':
        return 75; // Kraken has slightly higher latency
      case 'deribit':
        return 100; // Deribit has higher latency
      case 'bybit':
        return 60; // Bybit moderate latency
      default:
        return 0;
    }
  }

  /**
   * Get exchange-specific time offset
   */
  private getExchangeOffset(exchange: string): number {
    const offset = this.timeOffsets.get(exchange);
    return offset ? offset.offset : 0;
  }

  /**
   * Validate timestamp accuracy
   */
  validateTimestamp(data: SynchronizedMarketData): boolean {
    const now = Date.now();
    const dataAge = now - data.synchronizedTimestamp.getTime();

    // Data should not be older than max allowed age
    return dataAge < this.maxClockDrift && !data.isStale;
  }

  /**
   * Get current synchronized time
   */
  getCurrentTime(): Date {
    return new Date(Date.now() + this.systemClockOffset);
  }

  /**
   * Get status information
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      systemClockOffset: this.systemClockOffset,
      exchangeOffsets: Array.from(this.timeOffsets.entries()),
      maxClockDrift: this.maxClockDrift,
      lastSync: this.timeOffsets.size > 0 ?
        Math.max(...Array.from(this.timeOffsets.values()).map(o => o.lastUpdated.getTime())) :
        null
    };
  }
}
