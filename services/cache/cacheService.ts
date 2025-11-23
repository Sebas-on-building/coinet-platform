import redis from './redisClient';

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  static async set<T>(key: string, value: T, ttl?: number) {
    if (ttl) {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
    } else {
      await redis.set(key, JSON.stringify(value));
    }
  }

  static async del(key: string) {
    await redis.del(key);
  }

  // Tag-based invalidation for advanced use-cases
  static async addTag(key: string, tag: string) {
    await redis.sadd(`tag:${tag}`, key);
  }

  static async invalidateTag(tag: string) {
    const keys = await redis.smembers(`tag:${tag}`);
    if (keys.length) await redis.del(...keys);
    await redis.del(`tag:${tag}`);
  }
} 