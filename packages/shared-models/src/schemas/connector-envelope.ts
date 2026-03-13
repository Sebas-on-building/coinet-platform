/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📦 CONNECTOR ENVELOPE — STANDARD OUTPUT FOR ALL SOURCE CONNECTORS       ║
 * ║                                                                               ║
 * ║   Every connector MUST return data in this envelope.                         ║
 * ║   Downstream systems MUST NOT depend on provider-specific JSON.               ║
 * ║                                                                               ║
 * ║   Part of Coinet AI Production Architecture — Layer 1                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export const EntityTypeEnum = z.enum([
  'asset',
  'pair',
  'protocol',
  'wallet',
  'chain',
]);
export type EntityType = z.infer<typeof EntityTypeEnum>;

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR ENVELOPE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const ConnectorEnvelopeSchema = z.object({
  /** Provider identifier (e.g. "coingecko", "dexscreener", "defillama") */
  source: z.string().min(1),

  /** Type of entity this data describes */
  entity_type: EntityTypeEnum,

  /** Canonical entity ID (internal or provider ID) */
  entity_id: z.string().min(1),

  /** Chain (e.g. "ethereum", "solana", "base") or null for cross-chain */
  chain: z.string().nullable(),

  /** Trading symbol if applicable */
  symbol: z.string().nullable(),

  /** When data was observed at source (ISO8601) */
  timestamp_observed: z.string().refine((s) => !isNaN(Date.parse(s)), 'Invalid ISO8601'),

  /** When data was ingested into Coinet (ISO8601) */
  timestamp_ingested: z.string().refine((s) => !isNaN(Date.parse(s)), 'Invalid ISO8601'),

  /** Raw provider response (for audit, replay, debugging) */
  raw_payload: z.record(z.unknown()),

  /** Normalized fields mapping to canonical metric namespace */
  normalized_partial_payload: z.record(z.unknown()),

  /** Seconds since data was observed */
  freshness_seconds: z.number().int().nonnegative(),

  /** Source trust score 0–1 (for conflict resolution) */
  source_confidence: z.number().min(0).max(1),

  /** Rate limit cost (for provider cost tracking) */
  rate_limit_cost: z.number().nonnegative(),

  /** Trace ID for distributed tracing (UUID, W3C traceparent, or provider ID) */
  trace_id: z.string().min(1),
});

export type ConnectorEnvelope = z.infer<typeof ConnectorEnvelopeSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR RULES (for resilience)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectorRules {
  /** Max retries on transient failure */
  maxRetries: number;
  /** Initial backoff ms */
  initialBackoffMs: number;
  /** Request timeout ms */
  timeoutMs: number;
  /** Circuit breaker: open after N consecutive failures */
  circuitBreakerThreshold: number;
  /** Circuit breaker: half-open after ms */
  circuitBreakerResetMs: number;
  /** Mark data stale if older than this (seconds) */
  staleThresholdSeconds: number;
  /** Schema version for response validation */
  responseSchemaVersion?: string;
}

export const DEFAULT_CONNECTOR_RULES: ConnectorRules = {
  maxRetries: 3,
  initialBackoffMs: 1000,
  timeoutMs: 10000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 60000,
  staleThresholdSeconds: 300,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/** Create a connector envelope from raw provider data (adapter pattern) */
export function createConnectorEnvelope(
  params: Omit<ConnectorEnvelope, 'timestamp_ingested' | 'freshness_seconds'> & {
    timestamp_ingested?: string;
  }
): ConnectorEnvelope {
  const timestamp_ingested = params.timestamp_ingested ?? new Date().toISOString();
  const observed = new Date(params.timestamp_observed).getTime();
  const ingested = new Date(timestamp_ingested).getTime();
  const freshness_seconds = Math.max(0, Math.floor((ingested - observed) / 1000));

  return ConnectorEnvelopeSchema.parse({
    ...params,
    timestamp_ingested,
    freshness_seconds,
  });
}
