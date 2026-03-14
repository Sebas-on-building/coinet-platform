/**
 * Startup environment validation for coinet-platform.
 *
 * Call validateEnv() immediately after dotenv.config() and before any
 * express setup.  The function throws EnvValidationError on critical
 * failures — callers should catch it and call process.exit(1).
 *
 * Severity levels:
 *   required   — missing/invalid → always throw (blocks startup)
 *   production — missing/invalid in NODE_ENV=production → throw
 *   recommended — missing in production → warn only (never throw)
 */

import { logger } from './logger';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export class EnvValidationError extends Error {
  constructor(public readonly failures: string[]) {
    super(
      `Environment validation failed with ${failures.length} error(s):\n` +
        failures.map((f) => `  • ${f}`).join('\n')
    );
    this.name = 'EnvValidationError';
  }
}

type Predicate = (value: string) => boolean;

// ─────────────────────────────────────────────────────────────────────────────
// Predicates
// ─────────────────────────────────────────────────────────────────────────────

const nonEmpty: Predicate = (v) => v.trim().length > 0;

const minLength =
  (n: number): Predicate =>
  (v) =>
    v.trim().length >= n;

const urlLike: Predicate = (v) => {
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Core check helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Always required — missing or failing predicate → adds to failures list.
 */
function required(
  key: string,
  predicate: Predicate,
  message: string,
  failures: string[]
): void {
  const value = process.env[key];
  if (!value || !predicate(value)) {
    failures.push(`${key}: ${message}`);
  }
}

/**
 * Required only in production — adds to failures list when in production.
 */
function productionOnly(
  key: string,
  predicate: Predicate,
  message: string,
  failures: string[],
  isProduction: boolean
): void {
  if (!isProduction) return;
  const value = process.env[key];
  if (!value || !predicate(value)) {
    failures.push(`${key}: ${message} (required in production)`);
  }
}

/**
 * Recommended — logs a warning but never adds to failures.
 */
function recommended(
  key: string,
  predicate: Predicate,
  message: string,
  isProduction: boolean
): void {
  if (!isProduction) return;
  const value = process.env[key];
  if (!value || !predicate(value)) {
    logger.warn(`[env] ${key}: ${message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main validation function
// ─────────────────────────────────────────────────────────────────────────────

export function validateEnv(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const failures: string[] = [];

  // ── Always required ────────────────────────────────────────────────────────
  required(
    'DATABASE_URL',
    urlLike,
    'Must be a valid URL (e.g. postgresql://user:pass@host:5432/db)',
    failures
  );

  // JWT_SECRET is optional for Clerk-only deployments. When set (legacy JWT mode),
  // it must be ≥32 chars for security. If set but too short, we ignore it and run
  // in Clerk-only mode — do not fail startup (requireAuth already handles this).
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret !== undefined && jwtSecret !== '' && !minLength(32)(jwtSecret)) {
    logger.warn(
      '[env] JWT_SECRET: Set but too short (< 32 chars) — legacy JWT disabled, running in Clerk-only mode. ' +
        'Generate a valid secret: openssl rand -base64 32'
    );
  }

  // ── AI: at least one key required for chat to work ──────────────────────
  // Graceful mode — warn only; chat will degrade gracefully when both absent.
  const hasAiKey =
    !!process.env.XAI_API_KEY?.trim() ||
    !!process.env.GROK_API_KEY?.trim() ||
    !!process.env.OPENAI_API_KEY?.trim();
  if (!hasAiKey) {
    logger.warn(
      '[env] XAI_API_KEY / GROK_API_KEY / OPENAI_API_KEY: No AI key configured — ' +
        'chat endpoints will return degraded responses. ' +
        'Set at least one to enable AI features.'
    );
  }

  // ── Production-only recommended (warn, do not fail) ─────────────────────────
  if (isProduction && !(process.env.CORS_ORIGIN ?? process.env.CORS_ORIGINS ?? '').trim()) {
    logger.warn(
      '[env] CORS_ORIGIN: Not set in production. Only built-in origins (app.coinet.ai, coinet.ai) are allowed. ' +
        'Set CORS_ORIGIN to whitelist additional origins (comma-separated).'
    );
  }

  // ── Production recommended (warn only) ────────────────────────────────────
  recommended(
    'REDIS_URL',
    nonEmpty,
    'Not configured — caching and rate limiting will run in-memory only. ' +
      'Set to enable shared cache across instances.',
    isProduction
  );

  recommended(
    'NODE_ENV',
    (v) => v === 'production',
    'NODE_ENV is not set to "production". Ensure this is intentional.',
    isProduction
  );

  // ── Throw on any failures ─────────────────────────────────────────────────
  if (failures.length > 0) {
    throw new EnvValidationError(failures);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const jwtUsable =
    process.env.JWT_SECRET && minLength(32)(process.env.JWT_SECRET);
  logger.info('[env] Startup validation passed', {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    DATABASE_URL: 'configured',
    JWT_SECRET: jwtUsable ? 'configured' : 'absent (Clerk-only)',
    XAI_API_KEY: process.env.XAI_API_KEY ? 'configured' : 'absent',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'configured' : 'absent',
    CORS_ORIGIN: process.env.CORS_ORIGIN ? 'configured' : 'absent',
    REDIS_URL: process.env.REDIS_URL ? 'configured' : 'absent',
  });
}
