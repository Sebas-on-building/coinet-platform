/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     CONNECTOR & ROUTING LAYER — Layer 2 Type System                           ║
 * ║                                                                               ║
 * ║   The ConnectorEnvelope is the minimum valid unit of data ingress in Coinet.  ║
 * ║   No downstream system may ever consume raw provider output.                  ║
 * ║   Everything enters through this contract.                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { SourceClass, TruthClass } from '../source-systems/registry';

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY TYPE — What kind of object the payload refers to
// ═══════════════════════════════════════════════════════════════════════════════

export type EntityType =
  | 'asset'
  | 'pair'
  | 'protocol'
  | 'wallet'
  | 'chain'
  | 'narrative'
  | 'market_event';

// ═══════════════════════════════════════════════════════════════════════════════
// TRUST CLASS — Current usable trust, not abstract provider reputation
// ═══════════════════════════════════════════════════════════════════════════════

export type TrustClass =
  | 'high'       // Primary source, healthy, fresh
  | 'medium'     // Primary source but slightly stale, or strong secondary
  | 'low'        // Degraded primary or weaker secondary
  | 'degraded'   // Source is unhealthy or data is significantly stale
  | 'fallback';  // Data came from a fallback path

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK STATUS — How the data was obtained
// ═══════════════════════════════════════════════════════════════════════════════

export type FallbackStatus =
  | 'primary'    // Direct from primary source
  | 'fallback'   // From a fallback provider
  | 'cached'     // From trusted cached state
  | 'degraded'   // Reconstructed under degraded conditions
  | 'backfill';  // From historical/replay process

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR CATEGORY — Transport mode classification
// ═══════════════════════════════════════════════════════════════════════════════

export type ConnectorCategory =
  | 'polling'    // Scheduled provider fetches
  | 'stream'     // WebSocket or event-based flows
  | 'triggered'  // User-requested or AI-requested retrievals
  | 'backfill';  // Historical rebuilds, calibration, replay

// ═══════════════════════════════════════════════════════════════════════════════
// FRESHNESS — Computed at ingress, never guessed downstream
// ═══════════════════════════════════════════════════════════════════════════════

export type FreshnessBucket =
  | 'live'        // < 5s — realtime
  | 'fresh'       // < expected freshness threshold
  | 'acceptable'  // < 2× expected freshness threshold
  | 'stale'       // > 2× expected freshness threshold
  | 'expired';    // > 5× expected freshness threshold or manual expiry

export interface Freshness {
  /** Age of observation in seconds at ingestion time */
  age_seconds: number;
  /** Classified freshness bucket */
  bucket: FreshnessBucket;
  /** Whether this freshness is acceptable for the use case */
  acceptable: boolean;
  /** Provider's expected freshness threshold in ms */
  threshold_ms: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR ENVELOPE — The standard internal ingress unit
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectorEnvelope<T = unknown> {
  /** Concrete provider identity (e.g. 'coingecko', 'dexscreener') */
  source: string;

  /** Kind of object the payload refers to */
  entity_type: EntityType;

  /** Best current internal candidate ID (e.g. 'asset:btc', 'pair:sol-usdc-raydium') */
  canonical_candidate_id: string;

  /**
   * Confidence in the canonical_candidate_id (0–1).
   * 1.0 = identity is fully resolved and certain.
   * < 1.0 = ambiguity exists; downstream must not treat as authoritative.
   * Required by Rule 8: identity ambiguity must be preserved, never silently erased.
   */
  canonical_confidence: number;

  /** Relevant chain/network context (null if truly chain-agnostic) */
  chain: string | null;

  /** When the data was observed/valid at the source (unix ms) */
  timestamp_observed: number;

  /** When Coinet received and wrapped the data (unix ms) */
  timestamp_ingested: number;

  /** Computed freshness assessment */
  freshness: Freshness;

  /** Current usable trust classification */
  trust_class: TrustClass;

  /** Original provider response for auditability and replay */
  raw_payload: unknown;

  /** Provider-decoupled normalized data fragment */
  normalized_payload_fragment: T;

  /** Unique trace ID for cross-layer diagnostics */
  trace_id: string;

  /** How the data was obtained */
  fallback_status: FallbackStatus;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR RESULT — What a connector execution returns
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectorResult<T = unknown> {
  ok: boolean;
  envelope?: ConnectorEnvelope<T>;
  error?: string;
  error_code?: string;
  latency_ms: number;
  connector_id: string;
  provider: string;
  source_class: SourceClass;
  truth_class: TruthClass;
  category: ConnectorCategory;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectorConfig {
  /** Unique connector identifier */
  id: string;
  /** Provider this connector integrates with */
  provider: string;
  /** Source class in the source-systems registry */
  source_class: SourceClass;
  /** Truth class this connector contributes to */
  truth_class: TruthClass;
  /** Transport mode */
  category: ConnectorCategory;
  /** Default entity type for this connector */
  default_entity_type: EntityType;
  /** Default timeout in ms */
  default_timeout_ms: number;
  /** Whether this connector is enabled */
  enabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR ACQUIRE PARAMS — Input to connector execution
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectorAcquireParams {
  /** Symbol to query (e.g. 'BTC', 'SOL') */
  symbol?: string;
  /** Contract address */
  address?: string | null;
  /** Chain identifier */
  chain?: string;
  /** Override timeout for this execution */
  timeout_ms?: number;
  /** Override entity type */
  entity_type?: EntityType;
  /** Override canonical candidate ID */
  canonical_candidate_id?: string;
  /** Mark this as a fallback execution */
  is_fallback?: boolean;
  /** Mark this as a backfill execution */
  is_backfill?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR LIFECYCLE HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectorLifecycleTrace {
  connector_id: string;
  provider: string;
  trace_id: string;
  started_at: number;
  completed_at?: number;
  steps: {
    acquire: { ok: boolean; latency_ms: number; error?: string };
    validate: { ok: boolean; issues?: string[] };
    classify: { entity_type: EntityType; source_class: SourceClass; trust_class: TrustClass };
    timing: { observed: number; ingested: number; freshness: Freshness };
    normalize: { ok: boolean; fragment_keys?: string[] };
    trace: { trace_id: string };
    fallback: { status: FallbackStatus };
  };
}
