import Redis, { Redis as RedisType } from 'ioredis';

export class RedisCacheService {
  private redis: RedisType;
  private prefix: string;

  constructor(prefix: string = '') {
    this.redis = new Redis();
    this.prefix = prefix;
  }

  // Query Result Cache (with TTL)
  async getQueryResult<T>(key: string, computeFn: () => Promise<T>, ttl: number = 5): Promise<T> {
    const cacheKey = `${this.prefix}cache:query:${key}`;
    let value = await this.redis.get(cacheKey);
    if (value) return JSON.parse(value);
    const result = await computeFn();
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', ttl);
    return result;
  }

  // Static Data Cache (no TTL)
  async getStatic<T>(key: string, computeFn: () => Promise<T>): Promise<T> {
    const cacheKey = `${this.prefix}cache:static:${key}`;
    let value = await this.redis.get(cacheKey);
    if (value) return JSON.parse(value);
    const result = await computeFn();
    await this.redis.set(cacheKey, JSON.stringify(result));
    return result;
  }

  // Session/Auth Cache (with TTL or blacklist)
  async setSession(key: string, value: any, ttl: number = 3600) {
    const cacheKey = `${this.prefix}session:${key}`;
    await this.redis.set(cacheKey, JSON.stringify(value), 'EX', ttl);
  }
  async getSession<T>(key: string): Promise<T | null> {
    const cacheKey = `${this.prefix}session:${key}`;
    const value = await this.redis.get(cacheKey);
    return value ? JSON.parse(value) : null;
  }
  async blacklistToken(token: string, ttl: number = 3600) {
    await this.redis.set(`${this.prefix}blacklist:${token}`, '1', 'EX', ttl);
  }
  async isTokenBlacklisted(token: string): Promise<boolean> {
    return !!(await this.redis.get(`${this.prefix}blacklist:${token}`));
  }

  // Rate Limiting (per user/IP)
  async incrementRateLimit(key: string, windowSec: number): Promise<number> {
    const cacheKey = `${this.prefix}rate:${key}`;
    const count = await this.redis.incr(cacheKey);
    if (count === 1) {
      await this.redis.expire(cacheKey, windowSec);
    }
    return count;
  }
  async getRateLimit(key: string): Promise<number> {
    const cacheKey = `${this.prefix}rate:${key}`;
    const count = await this.redis.get(cacheKey);
    return count ? parseInt(count, 10) : 0;
  }

  // Extensible: Add more cache patterns as needed
} 