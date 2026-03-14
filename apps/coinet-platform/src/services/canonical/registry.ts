/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     CANONICAL ENTITY REGISTRY                                                 ║
 * ║                                                                               ║
 * ║   The single source of truth for all canonical entities.                      ║
 * ║   Provides lookup by canonical ID, symbol, alias, provider ID,               ║
 * ║   or contract address. Populated at startup with well-known entities         ║
 * ║   and extended at runtime through resolution.                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  CanonicalEntity,
  AssetEntity,
  ProtocolEntity,
  ChainEntity,
  EntityKind,
  ContractAddress,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

class EntityRegistry {
  private byCanonicalId = new Map<string, CanonicalEntity>();
  private bySymbol = new Map<string, CanonicalEntity[]>();
  private byAlias = new Map<string, CanonicalEntity[]>();
  private byProvider = new Map<string, CanonicalEntity>();
  private byContract = new Map<string, CanonicalEntity>();

  register(entity: CanonicalEntity): void {
    this.byCanonicalId.set(entity.canonicalId, entity);

    const sym = entity.symbol.toUpperCase();
    const existing = this.bySymbol.get(sym) ?? [];
    if (!existing.some(e => e.canonicalId === entity.canonicalId)) {
      existing.push(entity);
    }
    this.bySymbol.set(sym, existing);

    for (const alias of entity.aliases) {
      const key = alias.toLowerCase();
      const aliasList = this.byAlias.get(key) ?? [];
      if (!aliasList.some(e => e.canonicalId === entity.canonicalId)) {
        aliasList.push(entity);
      }
      this.byAlias.set(key, aliasList);
    }

    for (const [provider, id] of Object.entries(entity.providerIds)) {
      if (id) this.byProvider.set(`${provider}:${id}`, entity);
    }

    for (const c of entity.contracts) {
      this.byContract.set(`${c.chain}:${c.address.toLowerCase()}`, entity);
    }
  }

  getByCanonicalId(id: string): CanonicalEntity | undefined {
    return this.byCanonicalId.get(id);
  }

  getBySymbol(symbol: string): CanonicalEntity[] {
    return this.bySymbol.get(symbol.toUpperCase()) ?? [];
  }

  /**
   * Look up entities by alias. Returns all matches sorted by identity confidence.
   * Use kindHint to disambiguate (e.g. "sol" → asset vs chain).
   */
  getByAlias(alias: string, kindHint?: EntityKind): CanonicalEntity | undefined {
    const candidates = this.byAlias.get(alias.toLowerCase());
    if (!candidates || candidates.length === 0) return undefined;
    if (candidates.length === 1) return candidates[0];
    if (kindHint) {
      const filtered = candidates.filter(e => e.kind === kindHint);
      if (filtered.length > 0) return filtered.sort((a, b) => b.identityConfidence - a.identityConfidence)[0];
    }
    return candidates.sort((a, b) => b.identityConfidence - a.identityConfidence)[0];
  }

  getByProviderId(provider: string, id: string): CanonicalEntity | undefined {
    return this.byProvider.get(`${provider}:${id}`);
  }

  getByContract(chain: string, address: string): CanonicalEntity | undefined {
    return this.byContract.get(`${chain}:${address.toLowerCase()}`);
  }

  getAll(kind?: EntityKind): CanonicalEntity[] {
    const all = [...this.byCanonicalId.values()];
    return kind ? all.filter(e => e.kind === kind) : all;
  }

  has(canonicalId: string): boolean {
    return this.byCanonicalId.has(canonicalId);
  }

  get size(): number {
    return this.byCanonicalId.size;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON + BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════════

export const registry = new EntityRegistry();

function asset(
  slug: string,
  name: string,
  symbol: string,
  opts: Partial<Omit<AssetEntity, 'canonicalId' | 'kind' | 'name' | 'symbol' | 'lastUpdated'>>
): AssetEntity {
  return {
    canonicalId: `asset:${slug}`,
    kind: 'asset',
    name,
    symbol,
    aliases: [slug, symbol.toLowerCase(), name.toLowerCase(), ...(opts.aliases ?? [])],
    providerIds: opts.providerIds ?? {},
    contracts: opts.contracts ?? [],
    identityConfidence: opts.identityConfidence ?? 100,
    lastUpdated: Date.now(),
    meta: opts.meta ?? {},
    primaryChain: opts.primaryChain ?? null,
    capBucket: opts.capBucket ?? null,
    sector: opts.sector ?? null,
  };
}

function chain(
  slug: string,
  name: string,
  symbol: string,
  opts: Partial<Omit<ChainEntity, 'canonicalId' | 'kind' | 'name' | 'symbol' | 'lastUpdated'>>
): ChainEntity {
  return {
    canonicalId: `chain:${slug}`,
    kind: 'chain',
    name,
    symbol,
    aliases: [slug, symbol.toLowerCase(), name.toLowerCase(), ...(opts.aliases ?? [])],
    providerIds: opts.providerIds ?? {},
    contracts: [],
    identityConfidence: 100,
    lastUpdated: Date.now(),
    meta: {},
    chainId: opts.chainId ?? null,
    layer: opts.layer ?? null,
    parentChainId: opts.parentChainId ?? null,
  };
}

function protocol(
  slug: string,
  name: string,
  symbol: string,
  opts: Partial<Omit<ProtocolEntity, 'canonicalId' | 'kind' | 'name' | 'symbol' | 'lastUpdated'>>
): ProtocolEntity {
  return {
    canonicalId: `protocol:${slug}`,
    kind: 'protocol',
    name,
    symbol,
    aliases: [slug, symbol.toLowerCase(), name.toLowerCase(), ...(opts.aliases ?? [])],
    providerIds: opts.providerIds ?? {},
    contracts: [],
    identityConfidence: 100,
    lastUpdated: Date.now(),
    meta: {},
    chains: opts.chains ?? [],
    category: opts.category ?? null,
    tokenCanonicalId: opts.tokenCanonicalId ?? null,
  };
}

/** Bootstrap the registry with well-known entities at import time. */
function bootstrap(): void {
  // ── CHAINS ────────────────────────────────────────────────────────────
  registry.register(chain('ethereum', 'Ethereum', 'ETH', { chainId: '1', layer: 'L1', aliases: ['eth', 'erc20'] }));
  registry.register(chain('solana', 'Solana', 'SOL', { layer: 'L1', aliases: ['sol', 'spl'] }));
  registry.register(chain('bsc', 'BNB Smart Chain', 'BNB', { chainId: '56', layer: 'L1', aliases: ['binance', 'bep20'] }));
  registry.register(chain('polygon', 'Polygon', 'MATIC', { chainId: '137', layer: 'L2', parentChainId: 'chain:ethereum', aliases: ['matic'] }));
  registry.register(chain('arbitrum', 'Arbitrum', 'ARB', { chainId: '42161', layer: 'L2', parentChainId: 'chain:ethereum' }));
  registry.register(chain('base', 'Base', 'BASE', { chainId: '8453', layer: 'L2', parentChainId: 'chain:ethereum' }));
  registry.register(chain('avalanche', 'Avalanche', 'AVAX', { chainId: '43114', layer: 'L1', aliases: ['avax'] }));
  registry.register(chain('optimism', 'Optimism', 'OP', { chainId: '10', layer: 'L2', parentChainId: 'chain:ethereum' }));

  // ── MAJOR ASSETS ──────────────────────────────────────────────────────
  registry.register(asset('bitcoin', 'Bitcoin', 'BTC', {
    providerIds: { coingecko: 'bitcoin', coinmarketcap: '1' },
    primaryChain: null, capBucket: 'mega', sector: 'Store of Value',
    aliases: ['btc', 'xbt', 'sats'],
  }));
  registry.register(asset('ethereum', 'Ethereum', 'ETH', {
    providerIds: { coingecko: 'ethereum', coinmarketcap: '1027', defillama: 'ethereum' },
    primaryChain: 'ethereum', capBucket: 'mega', sector: 'Smart Contract Platform',
    aliases: ['eth', 'ether'],
  }));
  registry.register(asset('solana', 'Solana', 'SOL', {
    providerIds: { coingecko: 'solana', coinmarketcap: '5426', defillama: 'solana' },
    primaryChain: 'solana', capBucket: 'large', sector: 'Smart Contract Platform',
  }));
  registry.register(asset('binancecoin', 'BNB', 'BNB', {
    providerIds: { coingecko: 'binancecoin', coinmarketcap: '1839' },
    primaryChain: 'bsc', capBucket: 'mega', sector: 'Exchange',
  }));
  registry.register(asset('ripple', 'XRP', 'XRP', {
    providerIds: { coingecko: 'ripple', coinmarketcap: '52' },
    primaryChain: null, capBucket: 'large', sector: 'Payments',
  }));
  registry.register(asset('cardano', 'Cardano', 'ADA', {
    providerIds: { coingecko: 'cardano', coinmarketcap: '2010' },
    primaryChain: null, capBucket: 'large', sector: 'Smart Contract Platform',
  }));
  registry.register(asset('dogecoin', 'Dogecoin', 'DOGE', {
    providerIds: { coingecko: 'dogecoin', coinmarketcap: '74' },
    primaryChain: null, capBucket: 'large', sector: 'Meme',
  }));
  registry.register(asset('chainlink', 'Chainlink', 'LINK', {
    providerIds: { coingecko: 'chainlink', coinmarketcap: '1975' },
    primaryChain: 'ethereum', capBucket: 'large', sector: 'Oracle',
  }));
  registry.register(asset('uniswap', 'Uniswap', 'UNI', {
    providerIds: { coingecko: 'uniswap', coinmarketcap: '7083', defillama: 'uniswap' },
    primaryChain: 'ethereum', capBucket: 'mid', sector: 'DeFi',
  }));
  registry.register(asset('aave', 'Aave', 'AAVE', {
    providerIds: { coingecko: 'aave', coinmarketcap: '7278', defillama: 'aave' },
    primaryChain: 'ethereum', capBucket: 'mid', sector: 'DeFi',
  }));
  registry.register(asset('pepe', 'Pepe', 'PEPE', {
    providerIds: { coingecko: 'pepe' },
    primaryChain: 'ethereum', capBucket: 'mid', sector: 'Meme',
    contracts: [{ chain: 'ethereum', address: '0x6982508145454ce325ddbe47a25d4ec3d2311933' }],
  }));
  registry.register(asset('usdt', 'Tether', 'USDT', {
    providerIds: { coingecko: 'tether', coinmarketcap: '825' },
    primaryChain: 'ethereum', capBucket: 'mega', sector: 'Stablecoin',
  }));
  registry.register(asset('usdc', 'USD Coin', 'USDC', {
    providerIds: { coingecko: 'usd-coin', coinmarketcap: '3408' },
    primaryChain: 'ethereum', capBucket: 'mega', sector: 'Stablecoin',
  }));
  registry.register(asset('avalanche', 'Avalanche', 'AVAX', {
    providerIds: { coingecko: 'avalanche-2', coinmarketcap: '5805', defillama: 'avalanche' },
    primaryChain: 'avalanche', capBucket: 'large', sector: 'Smart Contract Platform',
    aliases: ['avax'],
  }));
  registry.register(asset('polkadot', 'Polkadot', 'DOT', {
    providerIds: { coingecko: 'polkadot', coinmarketcap: '6636' },
    primaryChain: null, capBucket: 'large', sector: 'Interoperability',
  }));

  // ── MAJOR PROTOCOLS ───────────────────────────────────────────────────
  registry.register(protocol('uniswap', 'Uniswap', 'UNI', {
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    category: 'DEX', tokenCanonicalId: 'asset:uniswap',
    providerIds: { defillama: 'uniswap' },
  }));
  registry.register(protocol('aave', 'Aave', 'AAVE', {
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    category: 'Lending', tokenCanonicalId: 'asset:aave',
    providerIds: { defillama: 'aave' },
  }));
  registry.register(protocol('lido', 'Lido', 'LDO', {
    chains: ['ethereum'],
    category: 'Liquid Staking', tokenCanonicalId: null,
    providerIds: { defillama: 'lido' },
  }));
  registry.register(protocol('makerdao', 'MakerDAO', 'MKR', {
    chains: ['ethereum'],
    category: 'Lending', tokenCanonicalId: null,
    providerIds: { defillama: 'makerdao' },
  }));
  registry.register(protocol('sushiswap', 'SushiSwap', 'SUSHI', {
    chains: ['ethereum', 'polygon', 'arbitrum', 'avalanche'],
    category: 'DEX', tokenCanonicalId: null,
    providerIds: { defillama: 'sushi' },
  }));
  registry.register(protocol('compound', 'Compound', 'COMP', {
    chains: ['ethereum'],
    category: 'Lending', tokenCanonicalId: null,
    providerIds: { defillama: 'compound' },
  }));
  registry.register(protocol('curve', 'Curve', 'CRV', {
    chains: ['ethereum', 'polygon', 'arbitrum'],
    category: 'DEX', tokenCanonicalId: null,
    providerIds: { defillama: 'curve-dex' },
  }));
  registry.register(protocol('gmx', 'GMX', 'GMX', {
    chains: ['arbitrum', 'avalanche'],
    category: 'Perps DEX', tokenCanonicalId: null,
    providerIds: { defillama: 'gmx' },
  }));
  registry.register(protocol('jupiter', 'Jupiter', 'JUP', {
    chains: ['solana'],
    category: 'DEX Aggregator', tokenCanonicalId: null,
    providerIds: { defillama: 'jupiter' },
  }));
  registry.register(protocol('raydium', 'Raydium', 'RAY', {
    chains: ['solana'],
    category: 'DEX', tokenCanonicalId: null,
    providerIds: { defillama: 'raydium' },
  }));

  // ── MISSING HIGH-PRIORITY CHAINS ─────────────────────────────────────
  registry.register(chain('polkadot', 'Polkadot', 'DOT', { layer: 'L1' }));
  registry.register(chain('near', 'NEAR Protocol', 'NEAR', { layer: 'L1' }));
  registry.register(chain('sui', 'Sui', 'SUI', { layer: 'L1' }));
  registry.register(chain('aptos', 'Aptos', 'APT', { layer: 'L1' }));
  registry.register(chain('cosmos', 'Cosmos Hub', 'ATOM', { layer: 'L1' }));
  registry.register(chain('tron', 'TRON', 'TRX', { chainId: '728126428', layer: 'L1' }));
  registry.register(chain('ton', 'TON', 'TON', { layer: 'L1' }));
  registry.register(chain('fantom', 'Fantom', 'FTM', { chainId: '250', layer: 'L1' }));

  // ── MISSING HIGH-PRIORITY ASSETS ──────────────────────────────────────
  registry.register(asset('sui', 'Sui', 'SUI', {
    providerIds: { coingecko: 'sui', coinmarketcap: '20947' },
    primaryChain: 'sui', capBucket: 'large', sector: 'Smart Contract Platform',
  }));
  registry.register(asset('aptos', 'Aptos', 'APT', {
    providerIds: { coingecko: 'aptos', coinmarketcap: '21794' },
    primaryChain: 'aptos', capBucket: 'large', sector: 'Smart Contract Platform',
  }));
  registry.register(asset('near', 'NEAR Protocol', 'NEAR', {
    providerIds: { coingecko: 'near', coinmarketcap: '6535' },
    primaryChain: 'near', capBucket: 'large', sector: 'Smart Contract Platform',
  }));
  registry.register(asset('toncoin', 'Toncoin', 'TON', {
    providerIds: { coingecko: 'the-open-network', coinmarketcap: '11419' },
    primaryChain: 'ton', capBucket: 'large', sector: 'Smart Contract Platform',
    aliases: ['ton'],
  }));
  registry.register(asset('cosmos', 'Cosmos', 'ATOM', {
    providerIds: { coingecko: 'cosmos', coinmarketcap: '3794' },
    primaryChain: 'cosmos', capBucket: 'large', sector: 'Interoperability',
    aliases: ['atom'],
  }));
  registry.register(asset('tron', 'TRON', 'TRX', {
    providerIds: { coingecko: 'tron', coinmarketcap: '1958' },
    primaryChain: 'tron', capBucket: 'large', sector: 'Smart Contract Platform',
  }));
  registry.register(asset('litecoin', 'Litecoin', 'LTC', {
    providerIds: { coingecko: 'litecoin', coinmarketcap: '2' },
    primaryChain: null, capBucket: 'large', sector: 'Payments',
  }));
  registry.register(asset('arbitrum', 'Arbitrum', 'ARB', {
    providerIds: { coingecko: 'arbitrum', coinmarketcap: '11841' },
    primaryChain: 'arbitrum', capBucket: 'mid', sector: 'L2',
  }));
  registry.register(asset('optimism-token', 'Optimism', 'OP', {
    providerIds: { coingecko: 'optimism', coinmarketcap: '11840' },
    primaryChain: 'optimism', capBucket: 'mid', sector: 'L2',
    aliases: ['op'],
  }));
  registry.register(asset('polygon', 'Polygon', 'POL', {
    providerIds: { coingecko: 'matic-network', coinmarketcap: '3890' },
    primaryChain: 'polygon', capBucket: 'large', sector: 'L2',
    aliases: ['matic', 'pol'],
  }));
  registry.register(asset('fantom', 'Fantom', 'FTM', {
    providerIds: { coingecko: 'fantom', coinmarketcap: '3513' },
    primaryChain: 'fantom', capBucket: 'mid', sector: 'Smart Contract Platform',
  }));
  registry.register(asset('maker', 'Maker', 'MKR', {
    providerIds: { coingecko: 'maker', coinmarketcap: '1518' },
    primaryChain: 'ethereum', capBucket: 'mid', sector: 'DeFi',
  }));
  registry.register(asset('compound', 'Compound', 'COMP', {
    providerIds: { coingecko: 'compound-governance-token', coinmarketcap: '5692' },
    primaryChain: 'ethereum', capBucket: 'mid', sector: 'DeFi',
  }));
  registry.register(asset('curve-dao', 'Curve DAO', 'CRV', {
    providerIds: { coingecko: 'curve-dao-token', coinmarketcap: '6538' },
    primaryChain: 'ethereum', capBucket: 'mid', sector: 'DeFi',
  }));
  registry.register(asset('lido-dao', 'Lido DAO', 'LDO', {
    providerIds: { coingecko: 'lido-dao', coinmarketcap: '8000' },
    primaryChain: 'ethereum', capBucket: 'mid', sector: 'DeFi',
    aliases: ['ldo'],
  }));

  // ── CROSS-CHAIN CONTRACTS (USDT, USDC) ───────────────────────────────
  const usdt = registry.getByCanonicalId('asset:usdt');
  if (usdt) {
    usdt.contracts = [
      { chain: 'ethereum', address: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
      { chain: 'bsc', address: '0x55d398326f99059ff775485246999027b3197955' },
      { chain: 'polygon', address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f' },
      { chain: 'arbitrum', address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9' },
      { chain: 'avalanche', address: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7' },
      { chain: 'optimism', address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58' },
      { chain: 'tron', address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' },
    ];
    registry.register(usdt);
  }
  const usdc = registry.getByCanonicalId('asset:usdc');
  if (usdc) {
    usdc.contracts = [
      { chain: 'ethereum', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
      { chain: 'bsc', address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d' },
      { chain: 'polygon', address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359' },
      { chain: 'arbitrum', address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831' },
      { chain: 'avalanche', address: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e' },
      { chain: 'optimism', address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85' },
      { chain: 'base', address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' },
      { chain: 'solana', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    ];
    registry.register(usdc);
  }

  // ── SECTOR ENTITIES ───────────────────────────────────────────────────
  const sectors = [
    'defi', 'meme', 'smart-contract-platform', 'oracle', 'stablecoin',
    'l2', 'interoperability', 'payments', 'gaming', 'ai', 'rwa', 'infrastructure',
  ];
  for (const s of sectors) {
    registry.register({
      canonicalId: `sector:${s}`,
      kind: 'sector' as const,
      name: s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      symbol: s.toUpperCase(),
      aliases: [s],
      providerIds: {},
      contracts: [],
      identityConfidence: 100,
      lastUpdated: Date.now(),
      meta: {},
    } as CanonicalEntity);
  }
}

bootstrap();

export { EntityRegistry };
