import redis from './redisClient';

export class StaticDataService {
  static async getSymbol(symbol: string) {
    const key = `symbol:${symbol}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  static async setSymbol(symbol: string, info: any) {
    await redis.set(`symbol:${symbol}`, JSON.stringify(info));
  }
} 