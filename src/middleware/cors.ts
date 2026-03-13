/**
 * Custom CORS middleware.
 *
 * Allowed origins are driven by the CORS_ORIGIN (primary) or CORS_ORIGINS
 * (alias) environment variable — a comma-separated list of fully-qualified
 * origins.  The built-in list covers the production frontend origins.
 *
 * Usage:
 *   import { cors } from './middleware/cors';
 *   app.use(cors);
 */

import { Request, Response, NextFunction } from 'express';

const BUILT_IN_ORIGINS = ['https://coinet.ai', 'https://app.coinet.ai'];

function buildAllowedOrigins(): string[] {
  const raw = (process.env.CORS_ORIGIN ?? process.env.CORS_ORIGINS ?? '').trim();
  const fromEnv = raw ? raw.split(',').map((o) => o.trim()).filter(Boolean) : [];
  return [...BUILT_IN_ORIGINS, ...fromEnv];
}

const allowedOrigins = buildAllowedOrigins();
const isProduction = process.env.NODE_ENV === 'production';

export function cors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  const isAllowed =
    !origin ||
    allowedOrigins.includes(origin) ||
    (!isProduction && (origin.includes('vercel.app') || origin.includes('coinet')));

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Request-ID');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Max-Age', '86400');
      res.sendStatus(204);
      return;
    }
    next();
    return;
  }

  if (!origin) {
    // No origin header → server-to-server; allow
    next();
    return;
  }

  res.status(403).json({ error: 'CORS: Origin not allowed' });
}
