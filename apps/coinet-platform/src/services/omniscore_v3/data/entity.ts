/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔍 ENTITY RESOLUTION                                                        ║
 * ║                                                                               ║
 * ║   Resolves asset identifiers to canonical entity with provider IDs.           ║
 * ║   "50% of weird scores come from wrong mapping" - this prevents that.        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { TokenIdentity, Segment, SectorType, CapBucket } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EntityResolutionInput {
  id?: string;
  symbol?: string;
  name?: string;
  chain?: string;
  contractAddress?: string;
  contract?: string;
}

export interface ProviderIds {
  coingecko?: string;
  coinmarketcap?: string;
  defillama?: string;
  github?: string;
  twitter?: string;
  [key: string]: string | undefined;
}

export interface ContractAddresses {
  primary?: string;
  [chain: string]: string | undefined;
}

export interface OfficialUrls {
  website?: string;
  twitter?: string;
  github?: string;
  [key: string]: string | undefined;
}

export interface IdentityVerification {
  sources: string[];
  matchScore: number;
  verifiedAt: Date;
}

/**
 * Resolved entity - flattened for pipeline compatibility.
 * identity is derived for backward compatibility with well-known entity consumers.
 */
export interface ResolvedEntity {
  canonicalId: string;
  symbol: string;
  name: string;
  chain?: string;
  identityConfidence: number;
  providerIds: ProviderIds;
  contractAddresses?: ContractAddresses;
  officialUrls?: OfficialUrls;
  verification?: IdentityVerification;
  /** For backward compatibility with entity.test / WELL_KNOWN consumers */
  identity?: TokenIdentity;
  method?: 'exact' | 'inferred';
  warnings?: string[];
  sector?: SectorType;
  capBucket?: CapBucket;
}

export interface EntityResolutionResult {
  identity: TokenIdentity;
  method: 'exact' | 'inferred';
  confidence: number;
  warnings: string[];
}

export type KnownChain = 'bitcoin' | 'ethereum' | 'solana' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche' | 'base' | 'other';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const IDENTITY_CONFIDENCE_THRESHOLD = 60;

export const KNOWN_CHAINS: KnownChain[] = [
  'bitcoin',
  'ethereum',
  'solana',
  'bsc',
  'polygon',
  'arbitrum',
  'optimism',
  'avalanche',
  'base',
  'other',
];

// ═══════════════════════════════════════════════════════════════════════════════
// WELL-KNOWN ENTITIES
// ═══════════════════════════════════════════════════════════════════════════════

interface WellKnownEntityDef {
  identity: TokenIdentity;
  canonicalId: string;
  confidence: number;
  sector: SectorType;
  capBucket: CapBucket;
}

export const WELL_KNOWN_ENTITIES: Record<string, WellKnownEntityDef> = {
  bitcoin: {
    canonicalId: 'bitcoin',
    confidence: 100,
    sector: 'L1',
    capBucket: 'mega',
    identity: {
      id: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      chain: 'bitcoin',
      contract: null,
      canonicalProviderIds: {
        coingecko: 'bitcoin',
        github: 'bitcoin/bitcoin',
        twitter: 'bitcoin',
      },
    },
  },
  ethereum: {
    canonicalId: 'ethereum',
    confidence: 100,
    sector: 'L1',
    capBucket: 'mega',
    identity: {
      id: 'ethereum',
      symbol: 'ETH',
      name: 'Ethereum',
      chain: 'ethereum',
      contract: null,
      canonicalProviderIds: {
        coingecko: 'ethereum',
        defillama: 'ethereum',
        github: 'ethereum/go-ethereum',
        twitter: 'ethereum',
      },
    },
  },
  solana: {
    canonicalId: 'solana',
    confidence: 100,
    sector: 'L1',
    capBucket: 'mega',
    identity: {
      id: 'solana',
      symbol: 'SOL',
      name: 'Solana',
      chain: 'solana',
      contract: null,
      canonicalProviderIds: {
        coingecko: 'solana',
        github: 'solana-labs/solana',
        twitter: 'solana',
      },
    },
  },
  binancecoin: {
    canonicalId: 'binancecoin',
    confidence: 100,
    sector: 'L1',
    capBucket: 'mega',
    identity: {
      id: 'binancecoin',
      symbol: 'BNB',
      name: 'BNB',
      chain: 'bsc',
      contract: null,
      canonicalProviderIds: {
        coingecko: 'binancecoin',
        defillama: 'bsc',
      },
    },
  },
  ripple: {
    canonicalId: 'ripple',
    confidence: 100,
    sector: 'L1',
    capBucket: 'large',
    identity: {
      id: 'ripple',
      symbol: 'XRP',
      name: 'XRP',
      chain: 'ripple',
      contract: null,
      canonicalProviderIds: {
        coingecko: 'ripple',
        twitter: 'Ripple',
      },
    },
  },
  'usd-coin': {
    canonicalId: 'usd-coin',
    confidence: 100,
    sector: 'DeFi',
    capBucket: 'mega',
    identity: {
      id: 'usd-coin',
      symbol: 'USDC',
      name: 'USD Coin',
      chain: 'ethereum',
      contract: null,
      canonicalProviderIds: {
        coingecko: 'usd-coin',
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

/** Normalize identifier for lookup (lowercase, trim) */
function normalizeId(id: string): string {
  return id.toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * Resolve well-known entity by canonical ID (sync)
 */
export function resolveWellKnown(idOrSymbol: string): ResolvedEntity | undefined {
  const normalized = normalizeId(idOrSymbol);
  const lowerSymbol = idOrSymbol.toUpperCase();

  for (const [key, def] of Object.entries(WELL_KNOWN_ENTITIES)) {
    if (key === normalized) {
      return toResolvedEntity(def);
    }
    if (def.identity.symbol.toLowerCase() === lowerSymbol.toLowerCase()) {
      return toResolvedEntity(def);
    }
  }
  return undefined;
}

function toResolvedEntity(def: WellKnownEntityDef): ResolvedEntity {
  const ids: ProviderIds = { ...def.identity.canonicalProviderIds };
  return {
    canonicalId: def.canonicalId,
    symbol: def.identity.symbol,
    name: def.identity.name,
    chain: def.identity.chain,
    identityConfidence: def.confidence,
    providerIds: ids,
    contractAddresses: def.identity.contract
      ? { primary: def.identity.contract }
      : undefined,
    verification: {
      sources: Object.keys(ids),
      matchScore: def.confidence,
      verifiedAt: new Date(),
    },
    identity: def.identity,
    method: 'exact',
    sector: def.sector,
    capBucket: def.capBucket,
  };
}

/**
 * Resolve entity from input (sync - supports well-known; async for future API lookup)
 */
export function resolveEntity(input: EntityResolutionInput): ResolvedEntity {
  const id = input.id ?? input.symbol ?? input.name ?? 'unknown';
  const normalized = normalizeId(id);

  const wellKnown = resolveWellKnown(normalized);
  if (wellKnown) {
    return wellKnown;
  }

  // Inferred: unknown entity
  const symbol = (input.symbol ?? id).toUpperCase();
  const name = input.name ?? id.charAt(0).toUpperCase() + id.slice(1);
  const chain = input.chain ?? 'other';

  const entity: ResolvedEntity = {
    canonicalId: normalized,
    symbol,
    name,
    chain,
    identityConfidence: 30,
    providerIds: {
      coingecko: normalized,
      coinmarketcap: normalized,
    },
    contractAddresses: input.contractAddress ?? input.contract
      ? { primary: input.contractAddress ?? input.contract }
      : undefined,
    method: 'inferred',
    warnings: ['Entity not found in well-known database'],
    identity: {
      id: normalized,
      symbol,
      name,
      chain,
      contract: input.contractAddress ?? input.contract ?? null,
      canonicalProviderIds: {
        coingecko: normalized,
      },
    },
  };
  return entity;
}

/**
 * Resolve multiple entities (batch)
 */
export function resolveEntities(inputs: EntityResolutionInput[]): ResolvedEntity[] {
  return inputs.map(resolveEntity);
}

/**
 * Can this entity be scored? (meets minimum confidence)
 */
export function canEntityBeScored(entity: ResolvedEntity): boolean {
  return (entity.identityConfidence ?? 0) >= IDENTITY_CONFIDENCE_THRESHOLD;
}

/**
 * Get provider ID for a given provider
 */
export function getProviderId(entity: ResolvedEntity, provider: string): string | undefined {
  return entity.providerIds?.[provider] ?? entity.identity?.canonicalProviderIds?.[provider as keyof typeof entity.identity.canonicalProviderIds];
}

/**
 * Does entity have minimum provider IDs for scoring?
 */
export function hasMinimumProviderIds(entity: ResolvedEntity): boolean {
  const ids = entity.providerIds ?? entity.identity?.canonicalProviderIds ?? {};
  const count = Object.values(ids).filter(Boolean).length;
  return count >= 1;
}
