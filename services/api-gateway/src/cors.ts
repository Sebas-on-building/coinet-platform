/**
 * Env-driven CORS configuration for the API Gateway.
 *
 * Reading order for allowed origins:
 *   1. CORS_ORIGIN  (primary, comma-separated)
 *   2. CORS_ORIGINS (alias for compatibility)
 *   3. Built-in production safe defaults
 *
 * Behaviour:
 *   - Requests with no Origin header (server-to-server, mobile) → allowed.
 *   - Origins in the allowed list → allowed.
 *   - Development: *.vercel.app and *.coinet.* additionally allowed.
 *   - Production: anything else → rejected.
 *   - Development: anything else → allowed (local tooling convenience).
 */

import cors, { CorsOptions } from 'cors';

const BUILT_IN_ORIGINS = [
  'https://app.coinet.ai',
  'https://coinet.ai',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

function buildAllowedOrigins(): string[] {
  const raw = (process.env.CORS_ORIGIN ?? process.env.CORS_ORIGINS ?? '').trim();
  const fromEnv = raw ? raw.split(',').map((o) => o.trim()).filter(Boolean) : [];
  return [...BUILT_IN_ORIGINS, ...fromEnv];
}

export function corsConfig(): ReturnType<typeof cors> {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = buildAllowedOrigins();

  const options: CorsOptions = {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // No Origin header → server-to-server / mobile / curl
      if (!origin) return callback(null, true);
      // Explicitly listed origin
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Development convenience: Vercel previews and coinet subdomains
      if (!isProduction && (origin.includes('vercel.app') || origin.includes('coinet'))) {
        return callback(null, true);
      }
      // Production: reject anything not explicitly listed
      if (isProduction) return callback(null, false);
      // Development: allow unknown origins for local tooling
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-User-Id',
      'X-Request-ID',
      'Accept',
      'X-API-Key',
    ],
    exposedHeaders: ['X-Request-ID', 'X-Gateway-Version'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  return cors(options);
}
