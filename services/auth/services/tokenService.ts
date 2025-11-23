import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getRedisClient } from '../../../src/lib/data/redisClient';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@prisma/client';

const redis = getRedisClient();

export interface DeviceInfo {
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export const TokenService = {
  async refreshToken(req: Request, res: Response) {
    const { refreshToken } = req.body;
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_SECRET!);
      if (typeof payload !== 'string' && payload) {
        const token = jwt.sign({ id: payload.id, role: payload.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
        res.json({ token });
      } else {
        res.status(401).json({ error: 'Invalid refresh token' });
      }
    } catch {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  },
  async issueTokens(user: User, deviceInfo: DeviceInfo) {
    const sessionId = uuidv4();
    const accessToken = jwt.sign({ sub: user.id, role: user.role, sessionId }, process.env.ACCESS_SECRET!, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user.id, sessionId, device: deviceInfo }, process.env.REFRESH_SECRET!, { expiresIn: '7d' });
    await redis.set(`session:${sessionId}`, JSON.stringify({ userId: user.id, deviceInfo, createdAt: Date.now() }), 'EX', 60 * 60 * 24 * 7);
    return { accessToken, refreshToken, sessionId };
  },
  async rotateRefreshToken(oldRefreshToken: string, deviceInfo: DeviceInfo) {
    try {
      const payload = jwt.verify(oldRefreshToken, process.env.REFRESH_SECRET!) as any;
      if (typeof payload !== 'string' && payload) {
        // Invalidate old session
        await redis.del(`session:${payload.sessionId}`);
        // Issue new tokens
        return this.issueTokens({ id: payload.sub, role: payload.role } as User, deviceInfo);
      }
      throw new Error('Invalid refresh token');
    } catch {
      throw new Error('Invalid refresh token');
    }
  },
  async revokeSession(sessionId: string) {
    await redis.del(`session:${sessionId}`);
  },
  async getSession(sessionId: string): Promise<any> {
    const session = await redis.get(`session:${sessionId}`);
    return session ? JSON.parse(session) : null;
  },
  async isBlacklisted(token: string): Promise<boolean> {
    return !!(await redis.get(`blacklist:${token}`));
  },
  async blacklistToken(token: string) {
    await redis.set(`blacklist:${token}`, '1', 'EX', 60 * 60 * 24 * 7);
  },
  async detectAnomaly(userId: string, deviceInfo: DeviceInfo) {
    // Example: check for new device/location
    // ... implement geo/device anomaly detection ...
  },
}; 