import { Request, Response, NextFunction } from 'express';
import * as redis from 'redis';

const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect();

const WINDOW_SIZE = 60; // seconds
const MAX_REQUESTS = 100; // per window

export async function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = `ratelimit:${req.ip}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - WINDOW_SIZE;
  const requests = await redisClient.zRangeByScore(key, windowStart, now);
  if (requests.length >= MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  await redisClient.zAdd(key, [{ score: now, value: now.toString() }]);
  await redisClient.expire(key, WINDOW_SIZE);
  next();
} 