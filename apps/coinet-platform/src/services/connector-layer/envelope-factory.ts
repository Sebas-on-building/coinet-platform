/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ENVELOPE FACTORY                                                          ║
 * ║                                                                               ║
 * ║   Creates ConnectorEnvelopes from completed Evidence Pack module results.     ║
 * ║   This is the bridge between the existing fetch infrastructure and the        ║
 * ║   governed connector contract.                                                ║
 * ║                                                                               ║
 * ║   Every piece of data entering Coinet passes through this factory,            ║
 * ║   guaranteeing: provenance, timing, trust, traceability, fallback status.     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  ConnectorEnvelope,
  EntityType,
  TrustClass,
  FallbackStatus,
} from './types';
import type { SourceClass, TruthClass } from '../source-systems/registry';
import { generateTraceId } from './trace';
import { computeFreshness, computeFreshnessNoSourceTime } from './freshness';
import { validateEnvelope } from './envelope-validator';

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE METADATA — Connector doctrine for each evidence module
// ═══════════════════════════════════════════════════════════════════════════════

interface ModuleDoctrine {
  provider: string;
  source_class: SourceClass;
  truth_class: TruthClass;
  entity_type: EntityType;
  source_label: string;
}

const MODULE_DOCTRINE: Record<string, ModuleDoctrine> = {
  dexscreener: {
    provider: 'dexscreener',
    source_class: 'dex_discovery',
    truth_class: 'dex_emergence',
    entity_type: 'pair',
    source_label: 'DexScreener',
  },
  derivatives: {
    provider: 'coinglass',
    source_class: 'derivatives',
    truth_class: 'derivatives_pressure',
    entity_type: 'asset',
    source_label: 'CoinGlass',
  },
  security: {
    provider: 'goplus',
    source_class: 'security',
    truth_class: 'structural_safety',
    entity_type: 'asset',
    source_label: 'GoPlus',
  },
  holders: {
    provider: 'goplus',
    source_class: 'security',
    truth_class: 'structural_safety',
    entity_type: 'asset',
    source_label: 'GoPlus',
  },
  sentiment: {
    provider: 'lunarcrush',
    source_class: 'narrative',
    truth_class: 'narrative_attention',
    entity_type: 'market_event',
    source_label: 'LunarCrush',
  },
  news: {
    provider: 'cryptopanic',
    source_class: 'narrative',
    truth_class: 'narrative_attention',
    entity_type: 'narrative',
    source_label: 'CryptoPanic',
  },
  onchain: {
    provider: 'alchemy',
    source_class: 'onchain',
    truth_class: 'onchain_behavior',
    entity_type: 'asset',
    source_label: 'Alchemy',
  },
  market_snapshot: {
    provider: 'coingecko',
    source_class: 'market_data',
    truth_class: 'market_surface',
    entity_type: 'market_event',
    source_label: 'CoinGecko',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENVELOPE CREATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnvelopeFactoryInput {
  moduleName: string;
  /** Evidence module status: 'ok', 'error', 'missing', 'stale' */
  status: string;
  /** Timestamp of observation (unix seconds from evidence module) */
  ts: number;
  /** Normalized data payload from evidence module */
  data: unknown;
  /** Raw provider response (for auditability) */
  raw_payload?: unknown;
  /** Fetch latency in ms */
  latency_ms: number;
  /** Symbol being analyzed */
  symbol?: string;
  /** Contract address */
  address?: string | null;
  /** Chain identifier */
  chain?: string;
}

/**
 * Create a ConnectorEnvelope from a completed evidence module fetch.
 *
 * This is the standard path through which all evidence data is enveloped.
 * It guarantees: provenance, timing, trust, traceability, and fallback status.
 */
export function createEnvelope(input: EnvelopeFactoryInput): ConnectorEnvelope {
  const doctrine = MODULE_DOCTRINE[input.moduleName];
  if (!doctrine) {
    throw new Error(`No connector doctrine for module: ${input.moduleName}`);
  }

  const now = Date.now();
  const observedAt = input.ts > 0 ? input.ts * 1000 : now;
  const ingestedAt = now;

  const freshness = input.ts > 0
    ? computeFreshness(observedAt, ingestedAt, doctrine.provider)
    : computeFreshnessNoSourceTime(ingestedAt, doctrine.provider);

  const isOk = input.status === 'ok' || input.status === 'success';
  const isStale = input.status === 'stale' || !freshness.acceptable;

  const trustClass: TrustClass = !isOk
    ? 'degraded'
    : isStale
      ? 'low'
      : freshness.bucket === 'live' || freshness.bucket === 'fresh'
        ? 'high'
        : 'medium';

  const fallbackStatus: FallbackStatus = !isOk
    ? 'degraded'
    : isStale
      ? 'degraded'
      : 'primary';

  const canonicalId = buildCanonicalId(doctrine.entity_type, input);
  const canonicalConfidence = assessCanonicalConfidence(input);

  const envelope: ConnectorEnvelope = {
    source: doctrine.provider,
    entity_type: doctrine.entity_type,
    canonical_candidate_id: canonicalId,
    canonical_confidence: canonicalConfidence,
    chain: input.chain ?? null,
    timestamp_observed: observedAt,
    timestamp_ingested: ingestedAt,
    freshness,
    trust_class: trustClass,
    raw_payload: input.raw_payload ?? input.data,
    normalized_payload_fragment: input.data,
    trace_id: generateTraceId(),
    fallback_status: fallbackStatus,
  };

  // Invariant enforcement — log violations but don't throw (factory is best-effort)
  const validation = validateEnvelope(envelope);
  if (!validation.valid) {
    const errors = validation.violations
      .filter(v => v.severity === 'error')
      .map(v => `[${v.invariant}] ${v.message}`);
    // Attach violations to envelope for downstream inspection
    (envelope as any)._invariant_violations = errors;
  }

  return envelope;
}

/**
 * Create envelopes for all modules in an evidence pack.
 */
export function createEnvelopesFromEvidence(
  evidence: Record<string, any>,
  moduleEvents: Array<{ module: string; status: string; latency_ms: number }>,
  context: { symbol?: string; address?: string | null; chain?: string },
): Map<string, ConnectorEnvelope> {
  const envelopes = new Map<string, ConnectorEnvelope>();

  for (const event of moduleEvents) {
    const mod = evidence[event.module];
    if (!mod || !MODULE_DOCTRINE[event.module]) continue;

    try {
      const envelope = createEnvelope({
        moduleName: event.module,
        status: mod.status ?? event.status,
        ts: mod.ts ?? 0,
        data: mod.data ?? null,
        raw_payload: mod,
        latency_ms: event.latency_ms,
        symbol: context.symbol,
        address: context.address,
        chain: context.chain,
      });
      envelopes.set(event.module, envelope);
    } catch {
      // Best-effort envelope creation
    }
  }

  return envelopes;
}

/**
 * Get the doctrine metadata for a module.
 */
export function getModuleDoctrine(moduleName: string): ModuleDoctrine | undefined {
  return MODULE_DOCTRINE[moduleName];
}

/**
 * Get all registered module doctrines.
 */
export function getAllModuleDoctrines(): Record<string, ModuleDoctrine> {
  return { ...MODULE_DOCTRINE };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function assessCanonicalConfidence(input: EnvelopeFactoryInput): number {
  if (input.symbol && input.address) return 0.9;
  if (input.symbol) return 0.7;
  if (input.address) return 0.5;
  return 0.3;
}

function buildCanonicalId(entityType: EntityType, input: EnvelopeFactoryInput): string {
  switch (entityType) {
    case 'pair':
      return `pair:${input.address ?? input.symbol?.toLowerCase() ?? 'unknown'}`;
    case 'asset':
      return `asset:${input.symbol?.toLowerCase() ?? input.address ?? 'unknown'}`;
    case 'narrative':
      return `narrative:${input.symbol?.toLowerCase() ?? 'market'}`;
    case 'market_event':
      return 'market:global';
    default:
      return `${entityType}:${input.symbol?.toLowerCase() ?? 'unknown'}`;
  }
}
