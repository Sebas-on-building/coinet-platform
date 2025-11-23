import redis from './redisClient';

export class RateLimitService {
  static async increment(key: string, windowSec: number, max: number) {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    if (count > max) return false;
    return true;
  }

  static async getCount(key: string) {
    return Number(await redis.get(key)) || 0;
  }

  static async reset(key: string) {
    await redis.del(key);
  }
} 