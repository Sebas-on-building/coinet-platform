import { Request, Response } from 'express';
import { getRedisClient } from '../../../src/lib/data/redisClient';

const redis = getRedisClient();

export const SessionService = {
  async logout(req: Request, res: Response) {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) await redis.del(`session:${token}`);
    res.json({ success: true });
  },
  async storeSession(sessionId: string, userId: string) {
    await redis.set(`session:${sessionId}`, userId, 'EX', 60 * 60 * 24 * 7); // 7 days
  },
  async getSession(sessionId: string): Promise<string | null> {
    return redis.get(`session:${sessionId}`);
  },
}; 