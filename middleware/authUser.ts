import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET must be set in environment (min 32 chars). Generate: openssl rand -base64 32');
  }
  return s;
}

export function attachUser(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token provided' });
  const token = auth.split(' ')[1];
  try {
    (req as any).user = jwt.verify(token, getJwtSecret());
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
} 