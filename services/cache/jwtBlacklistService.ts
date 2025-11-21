import redis from './redisClient';

export class JWTBlacklistService {
  static async blacklist(jti: string, exp: number) {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await redis.set(`jwt:blacklist:${jti}`, '1', 'EX', ttl);
  }

  static async isBlacklisted(jti: string) {
    return !!(await redis.get(`jwt:blacklist:${jti}`));
  }
} 