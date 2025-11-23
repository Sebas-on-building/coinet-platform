import Redis from "ioredis";
import { config } from "../config/env";

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryStrategy?: (times: number) => number | void;
  maxRetriesPerRequest?: number;
}

// Add missing interfaces
export interface RealTimePrice {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: number;
  source: string;
}

export type PriceCallback = (price: RealTimePrice) => void;

export class RedisService {
  private static instance: RedisService;
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private priceSubscribers: Map<string, PriceCallback[]> = new Map();

  private readonly CACHE_KEYS = {
    PRICE: "realtime:price",
    ORDER_BOOK: "realtime:orderbook",
    TRADE: "realtime:trade",
    SOURCE_STATUS: "realtime:source:status",
  };

  private constructor() {
    const redisConfig: RedisConfig = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: 0,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    };

    // Create Redis clients
    this.client = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);

    this.setupErrorHandling();
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private setupErrorHandling(): void {
    const handleError = (client: Redis, error: Error): void => {
      console.error(`Redis client error:`, error);
      // Implement retry logic or failover if needed
    };

    this.client.on("error", (error: Error) => handleError(this.client, error));
    this.subscriber.on("error", (error: Error) =>
      handleError(this.subscriber, error),
    );
    this.publisher.on("error", (error: Error) =>
      handleError(this.publisher, error),
    );

    // Monitor connection status
    [this.client, this.subscriber, this.publisher].forEach((client) => {
      client.on("connect", () => console.log("Connected to Redis"));
      client.on("ready", () => console.log("Redis client ready"));
      client.on("close", () => console.log("Redis connection closed"));
      client.on("reconnecting", () => console.log("Reconnecting to Redis"));
    });
  }

  // Cache Operations
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting key ${key} from Redis:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error(`Error setting key ${key} in Redis:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Error deleting key ${key} from Redis:`, error);
      return false;
    }
  }

  // Pub/Sub Operations
  async publish(channel: string, message: any): Promise<void> {
    try {
      await this.publisher.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error(`Error publishing to channel ${channel}:`, error);
    }
  }

  async subscribe(
    channel: string,
    callback: (message: unknown) => void,
  ): Promise<void> {
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on("message", (ch: string, message: string) => {
        if (ch === channel) {
          try {
            const parsed = JSON.parse(message);
            callback(parsed);
          } catch (error) {
            console.error(
              `Error parsing message from channel ${channel}:`,
              error,
            );
          }
        }
      });
    } catch (error) {
      console.error(`Error subscribing to channel ${channel}:`, error);
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    try {
      await this.subscriber.unsubscribe(channel);
    } catch (error) {
      console.error(`Error unsubscribing from channel ${channel}:`, error);
    }
  }

  // Hash Operations
  async hget<T>(hash: string, field: string): Promise<T | null> {
    try {
      const value = await this.client.hget(hash, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting hash field ${field} from ${hash}:`, error);
      return null;
    }
  }

  async hset<T>(hash: string, field: string, value: T): Promise<boolean> {
    try {
      await this.client.hset(hash, field, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting hash field ${field} in ${hash}:`, error);
      return false;
    }
  }

  async hgetall(hash: string): Promise<Record<string, string> | null> {
    try {
      const result = await this.client.hgetall(hash);
      return result &&
        typeof result === "object" &&
        Object.keys(result).length > 0
        ? result
        : null;
    } catch (error) {
      console.error(`Error getting all hash fields from ${hash}:`, error);
      return null;
    }
  }

  // List Operations
  async lpush<T>(key: string, value: T): Promise<boolean> {
    try {
      await this.client.lpush(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error pushing to list ${key}:`, error);
      return false;
    }
  }

  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    try {
      const values = await this.client.lrange(key, start, stop);
      return values.map((v: string) => JSON.parse(v));
    } catch (error) {
      console.error(`Error getting range from list ${key}:`, error);
      return [];
    }
  }

  // Sorted Set Operations
  async zadd(key: string, score: number, member: string): Promise<boolean> {
    try {
      await this.client.zadd(key, score, member);
      return true;
    } catch (error) {
      console.error(`Error adding to sorted set ${key}:`, error);
      return false;
    }
  }

  async zrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    try {
      const values = await this.client.zrange(key, start, stop);
      return values.map((v) => JSON.parse(v));
    } catch (error) {
      console.error(`Error getting range from sorted set ${key}:`, error);
      return [];
    }
  }

  // Utility Methods
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }

  async flush(): Promise<void> {
    try {
      await this.client.flushdb();
    } catch (error) {
      console.error("Error flushing Redis database:", error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.client.quit(),
        this.subscriber.quit(),
        this.publisher.quit(),
      ]);
    } catch (error) {
      console.error("Error disconnecting from Redis:", error);
    }
  }

  private async restoreStateFromCache(): Promise<void> {
    try {
      // Restore price cache
      const prices = await this.hgetall(this.CACHE_KEYS.PRICE);
      if (prices) {
        Object.entries(prices).forEach(([symbol, priceStr]) => {
          try {
            const price = JSON.parse(priceStr) as RealTimePrice;
            this.notifyPriceSubscribers(symbol, price);
          } catch (error) {
            console.error(`Error parsing cached price for ${symbol}:`, error);
          }
        });
      }
      // ... similar restoration for order books and source status
    } catch (error) {
      console.error("Error restoring state from cache:", error);
    }
  }

  private async updateCache<T>(
    type: keyof typeof this.CACHE_KEYS,
    symbol: string,
    data: T,
  ): Promise<void> {
    try {
      await this.client.hset(
        this.CACHE_KEYS[type],
        symbol,
        JSON.stringify(data),
      );
    } catch (error) {
      console.error(`Error updating ${type} cache:`, error);
    }
  }

  private async getLatestPrice(symbol: string): Promise<RealTimePrice | null> {
    try {
      const key = `${this.CACHE_KEYS.PRICE}:${symbol}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.handleError(error as Error, `getLatestPrice for ${symbol}`);
      return null;
    }
  }

  async subscribeToPriceUpdates(
    symbol: string,
    callback: PriceCallback,
  ): Promise<void> {
    try {
      // ... setup subscription ...

      // Send cached price immediately if available
      const cachedPrice = await this.getLatestPrice(symbol);
      if (cachedPrice) {
        callback(cachedPrice);
      }
    } catch (error) {
      this.handleError(error as Error, "subscribeToPriceUpdates");
    }
  }

  // Add the handleError method
  private handleError(error: Error, context: string): void {
    console.error(`Redis error in ${context}:`, error);
    // Additional error handling logic if needed
  }

  // Add the notifyPriceSubscribers method
  private notifyPriceSubscribers(symbol: string, price: RealTimePrice): void {
    const callbacks = this.priceSubscribers.get(symbol);
    if (callbacks && callbacks.length > 0) {
      callbacks.forEach((callback) => {
        try {
          callback(price);
        } catch (error) {
          this.handleError(
            error as Error,
            `price subscriber callback for ${symbol}`,
          );
        }
      });
    }
  }
}
