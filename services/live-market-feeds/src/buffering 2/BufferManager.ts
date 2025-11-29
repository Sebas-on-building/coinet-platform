/**
 * =========================================
 * BUFFER MANAGER
 * =========================================
 * Handles message buffering during network partitions and replays
 * missed messages to ensure data continuity and prevent loss
 */

import { EventEmitter } from 'events';
import { MarketData, ExchangeType, MarketDataType } from '../types/index';
import { Logger } from '../utils/Logger';
import Redis from 'ioredis';
import { SynchronizedMarketData } from '../synchronization/TimestampSynchronizer'; // Import SynchronizedMarketData

export interface BufferConfig {
  maxBufferSize: number;
  maxBufferAge: number; // milliseconds
  replayBatchSize: number;
  replayDelay: number; // milliseconds between batches
  redisUrl?: string;
  enablePersistence: boolean;
}

export interface BufferedMessage {
  id: string;
  data: SynchronizedMarketData;
  timestamp: Date;
  sequence: number;
  exchange: ExchangeType;
  symbol: string;
}

export class BufferManager extends EventEmitter {
  private logger: Logger;
  private config: BufferConfig;
  private redis: Redis | null = null;
  private messageBuffer: Map<string, BufferedMessage> = new Map();
  private sequenceCounters: Map<string, number> = new Map();
  private isRunning: boolean = false;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private replayInProgress: boolean = false;

  constructor(config: BufferConfig) {
    super();
    this.config = config;
    this.logger = new Logger('BufferManager');
  }

  /**
   * Start the buffer manager
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.logger.info('📦 Starting Buffer Manager...');

    // Initialize Redis if persistence is enabled
    if (this.config.enablePersistence && this.config.redisUrl) {
      this.redis = new Redis(this.config.redisUrl);
      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error', error);
      });
    }

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldMessages();
    }, 30000); // Cleanup every 30 seconds

    this.isRunning = true;
    this.logger.info('✅ Buffer Manager started');
  }

  /**
   * Stop the buffer manager
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('📦 Stopping Buffer Manager...');

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Flush any remaining messages
    await this.flushBuffer();

    if (this.redis) {
      this.redis.disconnect();
      this.redis = null;
    }

    this.isRunning = false;
    this.logger.info('✅ Buffer Manager stopped');
  }

  /**
   * Buffer a market data message
   */
  buffer(data: SynchronizedMarketData): void {
    if (!this.isRunning) {
      this.logger.warn('Buffer manager not running, dropping message');
      return;
    }

    const key = `${data.exchange}:${data.symbol}`;
    const sequence = this.getNextSequence(key);

    const bufferedMessage: BufferedMessage = {
      id: `${key}:${sequence}:${Date.now()}`,
      data: data,
      timestamp: new Date(),
      sequence,
      exchange: data.exchange,
      symbol: data.symbol
    };

    // Add to in-memory buffer
    this.messageBuffer.set(bufferedMessage.id, bufferedMessage);

    // Persist to Redis if enabled
    if (this.config.enablePersistence && this.redis) {
      this.persistMessage(bufferedMessage);
    }

    // Check buffer size and cleanup if needed
    if (this.messageBuffer.size > this.config.maxBufferSize) {
      this.cleanupOldMessages();
    }

    this.logger.debug(`📦 Buffered message: ${bufferedMessage.id}`);
    this.emit('messageBuffered', bufferedMessage);
  }

  /**
   * Start replaying buffered messages
   */
  async startReplay(symbols?: string[], exchanges?: string[]): Promise<void> {
    if (this.replayInProgress) {
      this.logger.warn('Replay already in progress');
      return;
    }

    this.logger.info('🔄 Starting message replay...');
    this.replayInProgress = true;

    try {
      let messagesToReplay: BufferedMessage[] = [];

      if (symbols || exchanges) {
        // Filter messages by symbols and exchanges
        messagesToReplay = Array.from(this.messageBuffer.values())
          .filter(msg => {
            const symbolMatch = !symbols || symbols.includes(msg.symbol);
            const exchangeMatch = !exchanges || exchanges.includes(msg.exchange);
            return symbolMatch && exchangeMatch;
          });
      } else {
        // Replay all messages
        messagesToReplay = Array.from(this.messageBuffer.values());
      }

      // Sort by sequence number
      messagesToReplay.sort((a, b) => a.sequence - b.sequence);

      this.logger.info(`🔄 Replaying ${messagesToReplay.length} buffered messages`);

      // Replay in batches
      for (let i = 0; i < messagesToReplay.length; i += this.config.replayBatchSize) {
        const batch = messagesToReplay.slice(i, i + this.config.replayBatchSize);

        for (const message of batch) {
          this.emit('messageReplayed', message);
          await new Promise(resolve => setTimeout(resolve, this.config.replayDelay));
        }
      }

      this.logger.info('✅ Message replay completed');

    } catch (error) {
      this.logger.error('❌ Error during message replay', error);
    } finally {
      this.replayInProgress = false;
    }
  }

  /**
   * Flush all buffered messages
   */
  async flushBuffer(): Promise<void> {
    if (this.messageBuffer.size === 0) {
      return;
    }

    this.logger.info(`📤 Flushing ${this.messageBuffer.size} buffered messages`);

    const messages = Array.from(this.messageBuffer.values());

    // Emit all messages
    for (const message of messages) {
      this.emit('messageReplayed', message);
    }

    // Clear buffer
    this.messageBuffer.clear();
    this.sequenceCounters.clear();

    // Clear Redis if enabled
    if (this.config.enablePersistence && this.redis) {
      await this.redis.flushdb();
    }

    this.logger.info('✅ Buffer flushed');
  }

  /**
   * Get buffer statistics
   */
  getBufferStats(): any {
    const stats = {
      totalMessages: this.messageBuffer.size,
      byExchange: {} as Record<string, number>,
      bySymbol: {} as Record<string, number>,
      oldestMessage: null as Date | null,
      newestMessage: null as Date | null
    };

    for (const message of Array.from(this.messageBuffer.values())) {
      // Count by exchange
      stats.byExchange[message.exchange] = (stats.byExchange[message.exchange] || 0) + 1;

      // Count by symbol
      stats.bySymbol[message.symbol] = (stats.bySymbol[message.symbol] || 0) + 1;

      // Track age
      if (!stats.oldestMessage || message.timestamp < stats.oldestMessage) {
        stats.oldestMessage = message.timestamp;
      }
      if (!stats.newestMessage || message.timestamp > stats.newestMessage) {
        stats.newestMessage = message.timestamp;
      }
    }

    return stats;
  }

  /**
   * Get next sequence number for a key
   */
  private getNextSequence(key: string): number {
    const current = this.sequenceCounters.get(key) || 0;
    const next = current + 1;
    this.sequenceCounters.set(key, next);
    return next;
  }

  /**
   * Persist message to Redis
   */
  private async persistMessage(message: BufferedMessage): Promise<void> {
    if (!this.redis) return;

    try {
      const key = `buffer:${message.exchange}:${message.symbol}`;
      const serialized = JSON.stringify(message);

      // Store message with timestamp-based score for easy cleanup
      await this.redis.zadd(key, message.timestamp.getTime(), serialized);

      // Set expiry for the sorted set
      await this.redis.expire(key, Math.floor(this.config.maxBufferAge / 1000));

    } catch (error) {
      this.logger.error('Failed to persist message to Redis', error);
    }
  }

  /**
   * Load messages from Redis on startup
   */
  private async loadFromRedis(): Promise<void> {
    if (!this.redis) return;

    try {
      const keys = await this.redis.keys('buffer:*:*');

      for (const key of keys) {
        const messages = await this.redis.zrange(key, 0, -1);

        for (const serialized of messages) {
          try {
            const message: BufferedMessage = JSON.parse(serialized);
            this.messageBuffer.set(message.id, message);

            // Update sequence counters
            const sequenceKey = `${message.exchange}:${message.symbol}`;
            const current = this.sequenceCounters.get(sequenceKey) || 0;
            if (message.sequence > current) {
              this.sequenceCounters.set(sequenceKey, message.sequence);
            }

          } catch (error) {
            this.logger.error('Failed to parse persisted message', error);
          }
        }
      }

      this.logger.info(`📦 Loaded ${this.messageBuffer.size} messages from Redis`);

    } catch (error) {
      this.logger.error('Failed to load messages from Redis', error);
    }
  }

  /**
   * Cleanup old messages from buffer
   */
  private cleanupOldMessages(): void {
    const now = Date.now();
    const cutoffTime = now - this.config.maxBufferAge;

    let cleanedCount = 0;
    for (const [id, message] of Array.from(this.messageBuffer.entries())) {
      if (message.timestamp.getTime() < cutoffTime) {
        this.messageBuffer.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`🧹 Cleaned up ${cleanedCount} old messages`);
    }

    // Cleanup Redis as well
    if (this.config.enablePersistence && this.redis) {
      this.cleanupRedisMessages(cutoffTime);
    }
  }

  /**
   * Cleanup old messages from Redis
   */
  private async cleanupRedisMessages(cutoffTime: number): Promise<void> {
    if (!this.redis) return;

    try {
      const keys = await this.redis.keys('buffer:*:*');

      for (const key of keys) {
        await this.redis.zremrangebyscore(key, 0, cutoffTime);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup Redis messages', error);
    }
  }

  /**
   * Get status information
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      bufferSize: this.messageBuffer.size,
      maxBufferSize: this.config.maxBufferSize,
      replayInProgress: this.replayInProgress,
      redisConnected: this.redis ? this.redis.status === 'ready' : false,
      stats: this.getBufferStats()
    };
  }
}
