/**
 * Provider Capability Registry — maps each provider's endpoint families
 * to specific truth atoms they can speak on.
 *
 * Authority binds to endpoints, not vague provider brands.
 */

import type { ProviderCapability, AuthorityStrength } from './types';

export const PROVIDER_CAPABILITIES: ProviderCapability[] = [
  // ── CoinGecko ─────────────────────────────────────────────────────────
  { sourceId: 'coingecko', endpointFamily: 'market',    truthAtoms: ['price.spot', 'volume.usd', 'market_cap', 'fdv', 'liquidity.usd'],      authorityStrength: 'HIGH',   supportedChains: ['*'],       freshnessMs: 60_000,  notes: ['Broad listed asset coverage'] },
  // ── CoinMarketCap ────────────────────────────────────────────────────
  { sourceId: 'coinmarketcap', endpointFamily: 'market', truthAtoms: ['price.spot', 'volume.usd', 'market_cap', 'fdv'],                      authorityStrength: 'HIGH',   supportedChains: ['*'],       freshnessMs: 60_000,  notes: ['Strong ranking and listing data'] },
  // ── Birdeye ───────────────────────────────────────────────────────────
  { sourceId: 'birdeye', endpointFamily: 'market',       truthAtoms: ['price.spot', 'price.dex', 'volume.usd', 'liquidity.usd'],              authorityStrength: 'MEDIUM', supportedChains: ['solana'],   freshnessMs: 30_000,  notes: ['Solana-focused; strong DEX price'] },
  { sourceId: 'birdeye', endpointFamily: 'dex',          truthAtoms: ['pair.liquidity.depth', 'pair.age'],                                    authorityStrength: 'WEAK',   supportedChains: ['solana'],   freshnessMs: 30_000,  notes: ['Secondary DEX data via Birdeye'] },
  // ── DexScreener ───────────────────────────────────────────────────────
  { sourceId: 'dexscreener', endpointFamily: 'pairs',    truthAtoms: ['pair.newly_created', 'pair.age', 'pair.liquidity.depth', 'pair.fragmentation', 'pair.ignition_score', 'price.dex'], authorityStrength: 'HIGH', supportedChains: ['*'], freshnessMs: 30_000, notes: ['Primary discovery engine'] },
  // ── GeckoTerminal ─────────────────────────────────────────────────────
  { sourceId: 'geckoterminal', endpointFamily: 'pools',  truthAtoms: ['pair.newly_created', 'pair.age', 'pair.liquidity.depth', 'pair.ignition_score'],                                  authorityStrength: 'MEDIUM', supportedChains: ['*'], freshnessMs: 60_000, notes: ['Secondary DEX discovery'] },
  // ── CoinGlass ─────────────────────────────────────────────────────────
  { sourceId: 'coinglass', endpointFamily: 'derivatives', truthAtoms: ['oi.notional', 'oi.velocity', 'funding.rate', 'liq.long.usd', 'liq.short.usd', 'crowding.index', 'long_short.ratio'], authorityStrength: 'ABSOLUTE', supportedChains: ['*'], freshnessMs: 60_000, notes: ['Sole authoritative derivatives source'] },
  // ── DeFiLlama ─────────────────────────────────────────────────────────
  { sourceId: 'defillama', endpointFamily: 'protocols',  truthAtoms: ['protocol.tvl', 'protocol.inflows.usd', 'protocol.fees.usd', 'protocol.revenue.usd', 'protocol.holders_rev'],       authorityStrength: 'ABSOLUTE', supportedChains: ['*'], freshnessMs: 300_000, notes: ['Sole authoritative protocol substance source'] },
  { sourceId: 'defillama', endpointFamily: 'unlocks',    truthAtoms: ['protocol.unlock.next'],                                                                                           authorityStrength: 'HIGH',     supportedChains: ['*'], freshnessMs: 600_000, notes: ['Unlock schedule data'] },
  // ── Alchemy ───────────────────────────────────────────────────────────
  { sourceId: 'alchemy', endpointFamily: 'transfers',    truthAtoms: ['wallet.exchange_inflow', 'wallet.exchange_outflow', 'wallet.whale_flow', 'wallet.treasury_risk', 'contract.interaction'], authorityStrength: 'HIGH', supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], freshnessMs: 15_000, notes: ['EVM-chain primary'] },
  { sourceId: 'alchemy', endpointFamily: 'smart_money',  truthAtoms: ['wallet.smart_money'],                                                                                             authorityStrength: 'MEDIUM',   supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], freshnessMs: 30_000, notes: ['Requires entity enrichment for full authority'] },
  // ── QuickNode ─────────────────────────────────────────────────────────
  { sourceId: 'quicknode', endpointFamily: 'transfers',   truthAtoms: ['wallet.exchange_inflow', 'wallet.exchange_outflow', 'wallet.whale_flow', 'contract.interaction'],                  authorityStrength: 'HIGH',     supportedChains: ['solana'],   freshnessMs: 15_000,  notes: ['Solana primary chain observer'] },
  // ── GoPlus ────────────────────────────────────────────────────────────
  { sourceId: 'goplus', endpointFamily: 'security',      truthAtoms: ['security.risk_score', 'security.mint_authority', 'security.ownership_conc', 'security.rug_pattern'],                authorityStrength: 'HIGH',     supportedChains: ['*'],       freshnessMs: 300_000, notes: ['Primary contract security scanner'] },
  // ── Etherscan ─────────────────────────────────────────────────────────
  { sourceId: 'etherscan', endpointFamily: 'verification', truthAtoms: ['security.verification'],                                                                                         authorityStrength: 'HIGH',     supportedChains: ['ethereum'], freshnessMs: 600_000, notes: ['EVM contract verification'] },
  { sourceId: 'etherscan', endpointFamily: 'security',    truthAtoms: ['security.ownership_conc'],                                                                                        authorityStrength: 'MEDIUM',   supportedChains: ['ethereum'], freshnessMs: 300_000, notes: ['Supplementary holder data'] },
  // ── Solscan ───────────────────────────────────────────────────────────
  { sourceId: 'solscan', endpointFamily: 'verification',  truthAtoms: ['security.verification'],                                                                                          authorityStrength: 'HIGH',     supportedChains: ['solana'],   freshnessMs: 600_000, notes: ['Solana contract verification'] },
  // ── CryptoPanic ───────────────────────────────────────────────────────
  { sourceId: 'cryptopanic', endpointFamily: 'news',      truthAtoms: ['news.intensity', 'narrative.intensity'],                                                                           authorityStrength: 'HIGH',     supportedChains: ['*'],       freshnessMs: 120_000, notes: ['News-focused narrative signal'] },
  // ── LunarCrush ────────────────────────────────────────────────────────
  { sourceId: 'lunarcrush', endpointFamily: 'social',     truthAtoms: ['social.acceleration', 'narrative.breadth', 'sentiment.velocity', 'narrative.intensity'],                            authorityStrength: 'HIGH',     supportedChains: ['*'],       freshnessMs: 120_000, notes: ['Social-focused narrative signal'] },
  // ── Twitter/X APIs ────────────────────────────────────────────────────
  { sourceId: 'twitter_api', endpointFamily: 'social',    truthAtoms: ['social.acceleration', 'narrative.intensity'],                                                                      authorityStrength: 'MEDIUM',   supportedChains: ['*'],       freshnessMs: 60_000,  notes: ['Real-time social, limited scope'] },
  { sourceId: 'twitter_api_io', endpointFamily: 'social', truthAtoms: ['social.acceleration', 'narrative.intensity'],                                                                      authorityStrength: 'WEAK',     supportedChains: ['*'],       freshnessMs: 120_000, notes: ['Tertiary social fallback'] },
  // ── Arkham ────────────────────────────────────────────────────────────
  { sourceId: 'arkham', endpointFamily: 'entity',         truthAtoms: ['entity.label_confidence', 'entity.cluster_identity', 'entity.institutional'],                                      authorityStrength: 'HIGH',     supportedChains: ['ethereum', 'polygon', 'arbitrum', 'solana'], freshnessMs: 300_000, notes: ['Premium entity intelligence'] },
  // ── Nansen ────────────────────────────────────────────────────────────
  { sourceId: 'nansen', endpointFamily: 'entity',         truthAtoms: ['entity.label_confidence', 'entity.cluster_identity', 'entity.exchange_proximity', 'entity.institutional'],          authorityStrength: 'HIGH',     supportedChains: ['ethereum', 'polygon', 'arbitrum'], freshnessMs: 300_000, notes: ['Premium entity intelligence'] },
  // ── Reasoning models (no truth atoms) ─────────────────────────────────
  { sourceId: 'openai', endpointFamily: 'reasoning',      truthAtoms: [],                                                                                                                 authorityStrength: 'WEAK',     supportedChains: [],          freshnessMs: Infinity, notes: ['Expression only — zero truth authority'] },
  { sourceId: 'gemini', endpointFamily: 'reasoning',      truthAtoms: [],                                                                                                                 authorityStrength: 'WEAK',     supportedChains: [],          freshnessMs: Infinity, notes: ['Expression only — zero truth authority'] },
  { sourceId: 'xai',    endpointFamily: 'reasoning',      truthAtoms: [],                                                                                                                 authorityStrength: 'WEAK',     supportedChains: [],          freshnessMs: Infinity, notes: ['Expression only — zero truth authority'] },
];

const BY_SOURCE = new Map<string, ProviderCapability[]>();
for (const cap of PROVIDER_CAPABILITIES) {
  const existing = BY_SOURCE.get(cap.sourceId) ?? [];
  existing.push(cap);
  BY_SOURCE.set(cap.sourceId, existing);
}

const BY_ATOM = new Map<string, ProviderCapability[]>();
for (const cap of PROVIDER_CAPABILITIES) {
  for (const atom of cap.truthAtoms) {
    const existing = BY_ATOM.get(atom) ?? [];
    existing.push(cap);
    BY_ATOM.set(atom, existing);
  }
}

export function getCapabilitiesForSource(sourceId: string): ProviderCapability[] {
  return BY_SOURCE.get(sourceId) ?? [];
}

export function getCapabilitiesForAtom(truthAtomId: string): ProviderCapability[] {
  return BY_ATOM.get(truthAtomId) ?? [];
}

export function canSourceSpeakOn(sourceId: string, truthAtomId: string): boolean {
  const caps = BY_SOURCE.get(sourceId) ?? [];
  return caps.some(c => c.truthAtoms.includes(truthAtomId));
}

export function getStrongestCapabilityForAtom(truthAtomId: string): ProviderCapability | undefined {
  const caps = getCapabilitiesForAtom(truthAtomId);
  const order: Record<string, number> = { ABSOLUTE: 4, HIGH: 3, MEDIUM: 2, WEAK: 1 };
  return caps.sort((a, b) => (order[b.authorityStrength] ?? 0) - (order[a.authorityStrength] ?? 0))[0];
}
