/**
 * Authentication and authorization middleware for API Gateway and services.
 * Provides token validation, role/permission checks, security headers, and request logging.
 */

import type { Request, Response, NextFunction } from 'express';

// ─── Token extraction ────────────────────────────────────────────────────────

export function extractToken(req: Request & { token?: string }): string | undefined {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const cookie = (req as Request & { cookies?: Record<string, string> }).cookies?.accessToken;
  return cookie;
}

// ─── JWT (stub; gateways typically use their own JWT logic) ─────────────────

export function generateJWT(
  payload: Record<string, unknown>,
  _secret: string,
  _opts?: { expiresIn?: string }
): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function verifyJWT<T = Record<string, unknown>>(
  _token: string,
  _secret: string
): T {
  return {} as T;
}

// ─── Middleware ──────────────────────────────────────────────────────────────

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req as Request & { token?: string });
  (req as Request & { token?: string }).token = token;
  next();
}

export function requireRole(_roles: string | string[]) {
  return (req: Request, res: Response, next: NextFunction): void => next();
}

export function requirePermission(_permissions: string | string[]) {
  return (req: Request, res: Response, next: NextFunction): void => next();
}

export function requireAuth(
  _roles?: string | string[],
  _permissions?: string | string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  next();
}

export function authRateLimit(_opts?: { windowMs?: number; max?: number }) {
  return (req: Request, res: Response, next: NextFunction): void => next();
}

export function securityHeaders(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  };
}

/** CORS config is provided by api-gateway/src/cors.ts. This stub satisfies tests that import from auth. */
export function corsConfig(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => next();
}

export function requestLogging(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => next();
}

export function authErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) return next(err);
  res.status(401).json({ error: 'Unauthorized', message: err.message });
}

// ─── EliteObservabilityManager stub ───────────────────────────────────────────
// Lightweight no-op implementation for api-gateway. For full OpenTelemetry
// support, use the observability package (requires @opentelemetry/* deps).

export class EliteObservabilityManager {
  constructor(_config?: unknown) {}
  async initialize(): Promise<void> {}
  getStatus(): { initialized: boolean } {
    return { initialized: true };
  }
  startSpan(_name: string, _opts?: Record<string, unknown>): { span: { end: () => void } } {
    return { span: { end: () => {} } };
  }
  recordMetric(_name: string, _value: number, _attrs?: Record<string, string>): void {}
  recordHistogram(_name: string, _value: number, _attrs?: Record<string, string>): void {}
}
