/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     CANONICAL ENTITY RESOLVER                                                 ║
 * ║                                                                               ║
 * ║   Single entry point for resolving any input (ticker, name, address,          ║
 * ║   URL, provider ID) into a canonical entity. Replaces the three              ║
 * ║   separate ad-hoc resolvers.                                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { registry } from './registry';
import type {
  CanonicalEntity,
  AssetEntity,
  ResolutionInput,
  ResolutionResult,
  EntityKind,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TICKER_PATTERN = /^\$?([A-Za-z][A-Za-z0-9]{1,10})$/;
const DEXSCREENER_URL = /dexscreener\.com\/([a-z]+)\/([a-zA-Z0-9]+)/;
const PUMPFUN_URL = /pump\.fun\/(?:coin\/)?([a-zA-Z0-9]+)/;
const BIRDEYE_URL = /birdeye\.so\/token\/([a-zA-Z0-9]+)/;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve a raw input into a canonical entity.
 *
 * Resolution order:
 * 1. Exact canonical ID match
 * 2. Contract address match
 * 3. Provider ID match
 * 4. Symbol match (prefer higher identity confidence)
 * 5. Alias / fuzzy match
 * 6. URL extraction + re-resolve
 * 7. Inferred entity (low confidence)
 */
export function resolve(input: ResolutionInput): ResolutionResult {
  const raw = input.raw.trim();
  if (!raw) return miss();

  // 1. Exact canonical ID
  const byId = registry.getByCanonicalId(raw);
  if (byId) return hit(byId, 100, 'registry');

  // 2. Contract address
  const contractResult = resolveByContract(raw, input.chainHint);
  if (contractResult) return contractResult;

  // 3. URL extraction
  const urlResult = resolveByUrl(raw);
  if (urlResult) return urlResult;

  // 4. Provider ID (format: "provider:id")
  if (raw.includes(':')) {
    const [provider, id] = raw.split(':', 2);
    const byProvider = registry.getByProviderId(provider, id);
    if (byProvider) return hit(byProvider, 95, 'registry');
  }

  // 5. Ticker extraction
  const tickerMatch = raw.match(TICKER_PATTERN);
  const ticker = tickerMatch ? tickerMatch[1].toUpperCase() : raw.toUpperCase();

  // Symbol match
  const bySymbol = registry.getBySymbol(ticker);
  if (bySymbol.length === 1) {
    return hit(bySymbol[0], 95, 'registry');
  }
  if (bySymbol.length > 1) {
    const filtered = input.kindHint
      ? bySymbol.filter(e => e.kind === input.kindHint)
      : bySymbol;
    const best = filtered.sort((a, b) => b.identityConfidence - a.identityConfidence)[0];
    if (best) {
      return {
        entity: best,
        confidence: 85,
        source: 'registry',
        alternatives: filtered
          .filter(e => e.canonicalId !== best.canonicalId)
          .map(e => ({ entity: e, confidence: 70 })),
      };
    }
  }

  // 6. Alias match (with kind disambiguation)
  const byAlias = registry.getByAlias(raw.toLowerCase(), input.kindHint);
  if (byAlias) return hit(byAlias, 85, 'registry');

  // 7. CoinGecko-style slug match
  const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const bySlug = registry.getByCanonicalId(`asset:${slug}`);
  if (bySlug) return hit(bySlug, 80, 'registry');

  // 8. Inferred — create a transient entity for unknown assets
  if (ticker.length >= 2 && ticker.length <= 10) {
    return {
      entity: makeInferredAsset(ticker, slug),
      confidence: 30,
      source: 'inferred',
      alternatives: [],
    };
  }

  return miss();
}

/**
 * Batch-resolve multiple inputs.
 */
export function resolveMany(inputs: ResolutionInput[]): ResolutionResult[] {
  return inputs.map(resolve);
}

/**
 * Resolve specifically by CoinGecko ID (common in existing code).
 */
export function resolveByCoingeckoId(id: string): CanonicalEntity | undefined {
  return registry.getByProviderId('coingecko', id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-RESOLVERS
// ═══════════════════════════════════════════════════════════════════════════════

function resolveByContract(raw: string, chainHint?: string): ResolutionResult | null {
  if (EVM_ADDRESS.test(raw)) {
    const chains = chainHint ? [chainHint] : ['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'optimism', 'avalanche'];
    for (const ch of chains) {
      const found = registry.getByContract(ch, raw);
      if (found) return hit(found, 95, 'registry');
    }
    return {
      entity: makeInferredAsset(raw.slice(0, 8), raw.toLowerCase(), chainHint ?? 'ethereum'),
      confidence: 25,
      source: 'pattern',
      alternatives: [],
    };
  }

  if (SOLANA_ADDRESS.test(raw) && !raw.match(/^[A-Za-z]+$/)) {
    const found = registry.getByContract('solana', raw);
    if (found) return hit(found, 95, 'registry');
    return {
      entity: makeInferredAsset(raw.slice(0, 6), raw, 'solana'),
      confidence: 25,
      source: 'pattern',
      alternatives: [],
    };
  }

  return null;
}

function resolveByUrl(raw: string): ResolutionResult | null {
  const dex = raw.match(DEXSCREENER_URL);
  if (dex) {
    const [, chain, pairOrToken] = dex;
    const byContract = registry.getByContract(chain, pairOrToken);
    if (byContract) return hit(byContract, 90, 'pattern');
    return {
      entity: makeInferredAsset(pairOrToken.slice(0, 8), pairOrToken, chain),
      confidence: 40,
      source: 'pattern',
      alternatives: [],
    };
  }

  const pump = raw.match(PUMPFUN_URL);
  if (pump) {
    const addr = pump[1];
    const found = registry.getByContract('solana', addr);
    if (found) return hit(found, 90, 'pattern');
    return {
      entity: makeInferredAsset(addr.slice(0, 6), addr, 'solana'),
      confidence: 35,
      source: 'pattern',
      alternatives: [],
    };
  }

  const birdeye = raw.match(BIRDEYE_URL);
  if (birdeye) {
    const addr = birdeye[1];
    const found = registry.getByContract('solana', addr);
    if (found) return hit(found, 90, 'pattern');
    return {
      entity: makeInferredAsset(addr.slice(0, 6), addr, 'solana'),
      confidence: 35,
      source: 'pattern',
      alternatives: [],
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function hit(entity: CanonicalEntity, confidence: number, source: ResolutionResult['source']): ResolutionResult {
  return { entity, confidence, source, alternatives: [] };
}

function miss(): ResolutionResult {
  return { entity: null, confidence: 0, source: 'inferred', alternatives: [] };
}

function makeInferredAsset(symbol: string, slug: string, chain?: string): AssetEntity {
  return {
    canonicalId: `asset:inferred-${slug.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    kind: 'asset',
    name: symbol.toUpperCase(),
    symbol: symbol.toUpperCase(),
    aliases: [slug.toLowerCase()],
    providerIds: {},
    contracts: chain ? [{ chain, address: slug }] : [],
    identityConfidence: 30,
    lastUpdated: Date.now(),
    meta: { inferred: true },
    primaryChain: chain ?? null,
    capBucket: null,
    sector: null,
  };
}
