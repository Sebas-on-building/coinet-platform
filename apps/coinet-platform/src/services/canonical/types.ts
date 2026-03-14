/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     CANONICAL INTELLIGENCE PLATFORM — TYPE SYSTEM                             ║
 * ║                                                                               ║
 * ║   Coinet's internal ontology. Every engine reasons on these types,            ║
 * ║   never on raw provider payloads.                                             ║
 * ║                                                                               ║
 * ║   Entity kinds: Asset, Protocol, Chain, Wallet, Narrative, Sector             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY KINDS
// ═══════════════════════════════════════════════════════════════════════════════

export type EntityKind =
  | 'asset'
  | 'protocol'
  | 'chain'
  | 'wallet'
  | 'narrative'
  | 'sector';

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER ID MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProviderIds {
  coingecko?: string;
  coinmarketcap?: string;
  defillama?: string;
  dexscreener?: string;
  github?: string;
  twitter?: string;
  [provider: string]: string | undefined;
}

export interface ContractAddress {
  chain: string;
  address: string;
  decimals?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL ENTITY — base for all entity kinds
// ═══════════════════════════════════════════════════════════════════════════════

export interface CanonicalEntity {
  /** Unique canonical ID (format: kind:slug, e.g. "asset:bitcoin", "chain:ethereum") */
  canonicalId: string;
  kind: EntityKind;
  /** Primary display name */
  name: string;
  /** Ticker / short symbol (e.g. "BTC", "ETH") */
  symbol: string;
  /** All known symbols and aliases for fuzzy matching */
  aliases: string[];
  /** Provider-specific IDs for data fetching */
  providerIds: ProviderIds;
  /** Contract addresses across chains (assets only) */
  contracts: ContractAddress[];
  /** Confidence in identity resolution (0–100) */
  identityConfidence: number;
  /** When this entity was last refreshed */
  lastUpdated: number;
  /** Arbitrary metadata */
  meta: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIALIZED ENTITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AssetEntity extends CanonicalEntity {
  kind: 'asset';
  /** Primary chain this asset lives on (null for multi-chain natives like BTC) */
  primaryChain: string | null;
  /** Market cap bucket for regime context */
  capBucket: 'mega' | 'large' | 'mid' | 'small' | 'micro' | 'nano' | null;
  /** Sector classification */
  sector: string | null;
}

export interface ProtocolEntity extends CanonicalEntity {
  kind: 'protocol';
  /** Chain(s) this protocol operates on */
  chains: string[];
  /** Protocol category (DEX, lending, bridge, etc.) */
  category: string | null;
  /** Associated native/governance token canonical ID */
  tokenCanonicalId: string | null;
}

export interface ChainEntity extends CanonicalEntity {
  kind: 'chain';
  /** Chain ID (EVM) or network identifier */
  chainId: string | null;
  /** L1 or L2 */
  layer: 'L1' | 'L2' | 'sidechain' | null;
  /** Parent chain canonical ID (for L2s) */
  parentChainId: string | null;
}

export interface WalletEntity extends CanonicalEntity {
  kind: 'wallet';
  /** Chain this wallet operates on */
  chain: string;
  address: string;
  /** Known label (exchange, whale, team, VC, etc.) */
  label: string | null;
  /** Cluster this wallet belongs to */
  clusterId: string | null;
}

export interface NarrativeEntity extends CanonicalEntity {
  kind: 'narrative';
  /** Active or faded */
  status: 'emerging' | 'active' | 'peak' | 'fading' | 'dormant';
  /** Related asset canonical IDs */
  relatedAssets: string[];
}

export interface SectorEntity extends CanonicalEntity {
  kind: 'sector';
  /** Sector examples: DeFi, Gaming, AI, Meme, RWA, L2, Infrastructure */
  /** Related asset canonical IDs */
  memberAssets: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ResolutionInput {
  /** Raw text input (ticker, name, address, URL) */
  raw: string;
  /** Hint about what kind of entity this might be */
  kindHint?: EntityKind;
  /** Chain context if known */
  chainHint?: string;
}

export interface ResolutionResult {
  entity: CanonicalEntity | null;
  confidence: number;
  source: 'registry' | 'pattern' | 'provider' | 'inferred';
  alternatives: Array<{ entity: CanonicalEntity; confidence: number }>;
}
