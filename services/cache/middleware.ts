import { RateLimitService } from './rateLimitService';
import { SessionService } from './sessionService';
import { Request, Response, NextFunction } from 'express';

export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || req.ip;
  const key = `rate:${userId}`;
  const allowed = await RateLimitService.increment(key, 60, 100); // 100 req/min
  if (!allowed) return res.status(429).json({ error: 'Rate limit exceeded' });
  next();
}

export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies.sessionId;
  if (!sessionId) return res.status(401).json({ error: 'No session' });
  const session = await SessionService.getSession(sessionId);
  if (!session) return res.status(401).json({ error: 'Session expired' });
  (req as any).session = session;
  next();
} 