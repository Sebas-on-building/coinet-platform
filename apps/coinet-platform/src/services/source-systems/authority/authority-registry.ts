/**
 * Authority Registry — defines primary, secondary, and challenger rules
 * for every critical truth atom.
 *
 * Authority is domain-scoped, not global by provider.
 */

import type { TruthAtomAuthorityRule } from './types';
import { L12_AUTHORITY_VERSION } from './types';

const V = L12_AUTHORITY_VERSION;

export const AUTHORITY_RULES: TruthAtomAuthorityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // MARKET SURFACE
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'price.spot', sourceId: 'coingecko',      role: 'PRIMARY',    strength: 'HIGH',     conditions: { freshnessMaxMs: 120_000 }, maySubstituteFor: [], notes: ['Broad listed assets'],             version: V },
  { truthAtomId: 'price.spot', sourceId: 'coinmarketcap',  role: 'SECONDARY',  strength: 'HIGH',     conditions: { freshnessMaxMs: 120_000 }, maySubstituteFor: ['coingecko'], notes: ['Equivalent for listed assets'], version: V },
  { truthAtomId: 'price.spot', sourceId: 'birdeye',        role: 'SECONDARY',  strength: 'MEDIUM',   conditions: { supportedChains: ['solana'], freshnessMaxMs: 60_000 }, maySubstituteFor: ['coingecko', 'coinmarketcap'], notes: ['Solana-chain priority'], version: V },
  { truthAtomId: 'price.dex',  sourceId: 'dexscreener',    role: 'PRIMARY',    strength: 'HIGH',     conditions: { freshnessMaxMs: 60_000 },  notes: ['Authoritative for DEX pricing'],   version: V },
  { truthAtomId: 'price.dex',  sourceId: 'birdeye',        role: 'SECONDARY',  strength: 'MEDIUM',   conditions: { supportedChains: ['solana'] }, maySubstituteFor: ['dexscreener'], notes: ['Solana DEX fallback'], version: V },
  { truthAtomId: 'volume.usd', sourceId: 'coingecko',      role: 'PRIMARY',    strength: 'HIGH',     conditions: {}, notes: ['Aggregate volume'],                                      version: V },
  { truthAtomId: 'volume.usd', sourceId: 'coinmarketcap',  role: 'SECONDARY',  strength: 'HIGH',     conditions: {}, maySubstituteFor: ['coingecko'], notes: [],                       version: V },
  { truthAtomId: 'market_cap', sourceId: 'coingecko',      role: 'PRIMARY',    strength: 'HIGH',     conditions: {}, notes: [],                                                        version: V },
  { truthAtomId: 'market_cap', sourceId: 'coinmarketcap',  role: 'SECONDARY',  strength: 'HIGH',     conditions: {}, maySubstituteFor: ['coingecko'], notes: [],                       version: V },
  { truthAtomId: 'fdv',        sourceId: 'coingecko',      role: 'PRIMARY',    strength: 'HIGH',     conditions: {}, notes: [],                                                        version: V },
  { truthAtomId: 'liquidity.usd', sourceId: 'coingecko',   role: 'PRIMARY',    strength: 'MEDIUM',   conditions: {}, notes: ['CEX+DEX composite'],                                     version: V },
  { truthAtomId: 'liquidity.usd', sourceId: 'dexscreener', role: 'CHALLENGER', strength: 'HIGH',     conditions: {}, mayChallenge: ['coingecko'], challengeType: 'metric', notes: ['May show different DEX-native liquidity'], version: V },

  // ═══════════════════════════════════════════════════════════════════════
  // DEX EMERGENCE
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'pair.newly_created',   sourceId: 'dexscreener',    role: 'PRIMARY',    strength: 'HIGH',     conditions: { freshnessMaxMs: 60_000 }, notes: ['Fastest new pair detection'],     version: V },
  { truthAtomId: 'pair.newly_created',   sourceId: 'geckoterminal',  role: 'SECONDARY',  strength: 'MEDIUM',   conditions: {}, maySubstituteFor: ['dexscreener'], notes: [],              version: V },
  { truthAtomId: 'pair.age',             sourceId: 'dexscreener',    role: 'PRIMARY',    strength: 'HIGH',     conditions: {}, notes: [],                                                version: V },
  { truthAtomId: 'pair.liquidity.depth', sourceId: 'dexscreener',    role: 'PRIMARY',    strength: 'HIGH',     conditions: {}, notes: [],                                                version: V },
  { truthAtomId: 'pair.fragmentation',   sourceId: 'dexscreener',    role: 'PRIMARY',    strength: 'MEDIUM',   conditions: {}, notes: ['Cross-pool fragmentation'],                      version: V },
  { truthAtomId: 'pair.ignition_score',  sourceId: 'dexscreener',    role: 'PRIMARY',    strength: 'HIGH',     conditions: {}, notes: ['Early momentum composite'],                      version: V },

  // ═══════════════════════════════════════════════════════════════════════
  // DERIVATIVES PRESSURE
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'oi.notional',     sourceId: 'coinglass', role: 'PRIMARY', strength: 'ABSOLUTE', conditions: { freshnessMaxMs: 120_000 }, notes: ['Sole authoritative source'], version: V },
  { truthAtomId: 'oi.velocity',     sourceId: 'coinglass', role: 'PRIMARY', strength: 'ABSOLUTE', conditions: { freshnessMaxMs: 120_000 }, notes: [],                           version: V },
  { truthAtomId: 'funding.rate',    sourceId: 'coinglass', role: 'PRIMARY', strength: 'ABSOLUTE', conditions: { freshnessMaxMs: 120_000 }, notes: [],                           version: V },
  { truthAtomId: 'liq.long.usd',   sourceId: 'coinglass', role: 'PRIMARY', strength: 'ABSOLUTE', conditions: { freshnessMaxMs: 120_000 }, notes: [],                           version: V },
  { truthAtomId: 'liq.short.usd',  sourceId: 'coinglass', role: 'PRIMARY', strength: 'ABSOLUTE', conditions: { freshnessMaxMs: 120_000 }, notes: [],                           version: V },
  { truthAtomId: 'crowding.index',  sourceId: 'coinglass', role: 'PRIMARY', strength: 'ABSOLUTE', conditions: { freshnessMaxMs: 120_000 }, notes: [],                           version: V },
  { truthAtomId: 'long_short.ratio', sourceId: 'coinglass', role: 'PRIMARY', strength: 'HIGH',    conditions: {},                          notes: [],                           version: V },

  // ═══════════════════════════════════════════════════════════════════════
  // PROTOCOL SUBSTANCE
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'protocol.tvl',         sourceId: 'defillama', role: 'PRIMARY', strength: 'ABSOLUTE', conditions: { freshnessMaxMs: 600_000 }, notes: ['Sole authoritative TVL source'], version: V },
  { truthAtomId: 'protocol.inflows.usd', sourceId: 'defillama', role: 'PRIMARY', strength: 'ABSOLUTE', conditions: {}, notes: [],                                                       version: V },
  { truthAtomId: 'protocol.fees.usd',    sourceId: 'defillama', role: 'PRIMARY', strength: 'ABSOLUTE', conditions: {}, notes: [],                                                       version: V },
  { truthAtomId: 'protocol.revenue.usd', sourceId: 'defillama', role: 'PRIMARY', strength: 'ABSOLUTE', conditions: {}, notes: [],                                                       version: V },
  { truthAtomId: 'protocol.holders_rev', sourceId: 'defillama', role: 'PRIMARY', strength: 'HIGH',     conditions: {}, notes: [],                                                       version: V },
  { truthAtomId: 'protocol.unlock.next', sourceId: 'defillama', role: 'PRIMARY', strength: 'HIGH',     conditions: {}, notes: [],                                                       version: V },

  // ═══════════════════════════════════════════════════════════════════════
  // ON-CHAIN BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'wallet.exchange_inflow',  sourceId: 'alchemy',   role: 'PRIMARY',   strength: 'HIGH', conditions: { supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'] }, notes: ['EVM chains'],     version: V },
  { truthAtomId: 'wallet.exchange_inflow',  sourceId: 'quicknode', role: 'PRIMARY',   strength: 'HIGH', conditions: { supportedChains: ['solana'] },                                                notes: ['Solana chain'],   version: V },
  { truthAtomId: 'wallet.exchange_outflow', sourceId: 'alchemy',   role: 'PRIMARY',   strength: 'HIGH', conditions: { supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'] }, notes: [],                 version: V },
  { truthAtomId: 'wallet.exchange_outflow', sourceId: 'quicknode', role: 'PRIMARY',   strength: 'HIGH', conditions: { supportedChains: ['solana'] },                                                notes: [],                 version: V },
  { truthAtomId: 'wallet.smart_money',      sourceId: 'alchemy',   role: 'PRIMARY',   strength: 'MEDIUM', conditions: { supportedChains: ['ethereum'] },                                           notes: ['Needs entity enrichment'], version: V },
  { truthAtomId: 'wallet.treasury_risk',    sourceId: 'alchemy',   role: 'PRIMARY',   strength: 'HIGH', conditions: { supportedChains: ['ethereum', 'polygon', 'arbitrum'] },                      notes: [],                 version: V },
  { truthAtomId: 'wallet.treasury_risk',    sourceId: 'quicknode', role: 'PRIMARY',   strength: 'HIGH', conditions: { supportedChains: ['solana'] },                                                notes: [],                 version: V },
  { truthAtomId: 'contract.interaction',    sourceId: 'alchemy',   role: 'PRIMARY',   strength: 'HIGH', conditions: { supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'] }, notes: [],                 version: V },
  { truthAtomId: 'contract.interaction',    sourceId: 'quicknode', role: 'PRIMARY',   strength: 'HIGH', conditions: { supportedChains: ['solana'] },                                                notes: [],                 version: V },
  { truthAtomId: 'wallet.whale_flow',       sourceId: 'alchemy',   role: 'PRIMARY',   strength: 'HIGH', conditions: { supportedChains: ['ethereum', 'polygon', 'arbitrum'] },                      notes: [],                 version: V },
  { truthAtomId: 'wallet.whale_flow',       sourceId: 'quicknode', role: 'PRIMARY',   strength: 'HIGH', conditions: { supportedChains: ['solana'] },                                                notes: [],                 version: V },

  // ═══════════════════════════════════════════════════════════════════════
  // STRUCTURAL SAFETY
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'security.risk_score',     sourceId: 'goplus',    role: 'PRIMARY',    strength: 'HIGH', conditions: {}, notes: ['Primary contract risk scanner'],     version: V },
  { truthAtomId: 'security.mint_authority', sourceId: 'goplus',    role: 'PRIMARY',    strength: 'HIGH', conditions: {}, notes: [],                                   version: V },
  { truthAtomId: 'security.ownership_conc', sourceId: 'goplus',    role: 'PRIMARY',    strength: 'HIGH', conditions: {}, notes: [],                                   version: V },
  { truthAtomId: 'security.ownership_conc', sourceId: 'etherscan', role: 'SECONDARY',  strength: 'MEDIUM', conditions: { supportedChains: ['ethereum'] }, maySubstituteFor: ['goplus'], notes: [], version: V },
  { truthAtomId: 'security.verification',   sourceId: 'etherscan', role: 'PRIMARY',    strength: 'HIGH', conditions: { supportedChains: ['ethereum'] }, notes: [],    version: V },
  { truthAtomId: 'security.verification',   sourceId: 'solscan',   role: 'PRIMARY',    strength: 'HIGH', conditions: { supportedChains: ['solana'] },   notes: [],    version: V },
  { truthAtomId: 'security.rug_pattern',    sourceId: 'goplus',    role: 'PRIMARY',    strength: 'HIGH', conditions: {}, notes: [],                                   version: V },

  // ═══════════════════════════════════════════════════════════════════════
  // NARRATIVE ATTENTION
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'narrative.intensity', sourceId: 'lunarcrush',  role: 'PRIMARY',   strength: 'HIGH',   conditions: {}, notes: ['Composite social intensity'],         version: V },
  { truthAtomId: 'narrative.intensity', sourceId: 'cryptopanic', role: 'PRIMARY',   strength: 'HIGH',   conditions: {}, notes: ['News-driven intensity'],              version: V },
  { truthAtomId: 'narrative.breadth',   sourceId: 'lunarcrush',  role: 'PRIMARY',   strength: 'HIGH',   conditions: {}, notes: [],                                    version: V },
  { truthAtomId: 'sentiment.velocity',  sourceId: 'lunarcrush',  role: 'PRIMARY',   strength: 'HIGH',   conditions: {}, notes: [],                                    version: V },
  { truthAtomId: 'news.intensity',      sourceId: 'cryptopanic', role: 'PRIMARY',   strength: 'HIGH',   conditions: {}, notes: ['Primary news feed'],                 version: V },
  { truthAtomId: 'social.acceleration', sourceId: 'lunarcrush',  role: 'PRIMARY',   strength: 'HIGH',   conditions: {}, notes: [],                                    version: V },
  { truthAtomId: 'social.acceleration', sourceId: 'twitter_api', role: 'SECONDARY', strength: 'MEDIUM', conditions: {}, maySubstituteFor: ['lunarcrush'], notes: [],  version: V },

  // ═══════════════════════════════════════════════════════════════════════
  // ENTITY CONTEXT
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'entity.label_confidence',  sourceId: 'arkham',  role: 'PRIMARY',   strength: 'HIGH', conditions: { supportedChains: ['ethereum', 'polygon', 'arbitrum', 'solana'] }, notes: [], version: V },
  { truthAtomId: 'entity.label_confidence',  sourceId: 'nansen',  role: 'PRIMARY',   strength: 'HIGH', conditions: { supportedChains: ['ethereum', 'polygon', 'arbitrum'] },          notes: [], version: V },
  { truthAtomId: 'entity.cluster_identity',  sourceId: 'arkham',  role: 'PRIMARY',   strength: 'HIGH', conditions: {},                                                                notes: [], version: V },
  { truthAtomId: 'entity.cluster_identity',  sourceId: 'nansen',  role: 'PRIMARY',   strength: 'HIGH', conditions: {},                                                                notes: [], version: V },
  { truthAtomId: 'entity.exchange_proximity', sourceId: 'nansen', role: 'PRIMARY',   strength: 'HIGH', conditions: {},                                                                notes: [], version: V },
  { truthAtomId: 'entity.institutional',     sourceId: 'arkham',  role: 'PRIMARY',   strength: 'HIGH', conditions: {},                                                                notes: [], version: V },
  { truthAtomId: 'entity.institutional',     sourceId: 'nansen',  role: 'PRIMARY',   strength: 'HIGH', conditions: {},                                                                notes: [], version: V },
];

export function getRulesForAtom(truthAtomId: string): TruthAtomAuthorityRule[] {
  return AUTHORITY_RULES.filter(r => r.truthAtomId === truthAtomId);
}

export function getPrimaryRulesForAtom(truthAtomId: string): TruthAtomAuthorityRule[] {
  return AUTHORITY_RULES.filter(r => r.truthAtomId === truthAtomId && r.role === 'PRIMARY');
}

export function getSecondaryRulesForAtom(truthAtomId: string): TruthAtomAuthorityRule[] {
  return AUTHORITY_RULES.filter(r => r.truthAtomId === truthAtomId && r.role === 'SECONDARY');
}

export function getChallengerRulesForAtom(truthAtomId: string): TruthAtomAuthorityRule[] {
  return AUTHORITY_RULES.filter(r => r.truthAtomId === truthAtomId && r.role === 'CHALLENGER');
}

export function getRulesForSource(sourceId: string): TruthAtomAuthorityRule[] {
  return AUTHORITY_RULES.filter(r => r.sourceId === sourceId);
}
