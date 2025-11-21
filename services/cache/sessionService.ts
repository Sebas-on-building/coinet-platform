import redis from './redisClient';

export class SessionService {
  static async setSession(sessionId: string, data: any, ttl = 3600) {
    await redis.set(`session:${sessionId}`, JSON.stringify(data), 'EX', ttl);
  }

  static async getSession(sessionId: string) {
    const data = await redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  static async deleteSession(sessionId: string) {
    await redis.del(`session:${sessionId}`);
  }

  // JWT Blacklist
  static async blacklistJWT(jti: string, exp: number) {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await redis.set(`jwt:blacklist:${jti}`, '1', 'EX', ttl);
  }

  static async isJWTBlacklisted(jti: string) {
    return !!(await redis.get(`jwt:blacklist:${jti}`));
  }
} 