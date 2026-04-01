/**
 * Truth-Atom Redundancy Registry — canonical redundancy rules for every
 * critical truth atom. Defines primary, secondary, acceptable substitutions,
 * forbidden substitutions, temporal fallback, and fail mode.
 */

import { TRUTH_CLASSES } from '../registry';
import type { TruthAtomRedundancyRule } from './types';
import { L13_REDUNDANCY_VERSION } from './types';

const V = L13_REDUNDANCY_VERSION;
const TC = TRUTH_CLASSES;

export const REDUNDANCY_RULES: TruthAtomRedundancyRule[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // DERIVATIVES PRESSURE — fast volatile truth, fail-stop for strong claims
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'oi.notional', truthClass: TC.DERIVATIVES_PRESSURE, primarySourceId: 'coinglass', secondarySourceIds: [],
    acceptableSubstitutions: [
      { sourceId: 'temporal_last_state', mode: 'TEMPORAL_FALLBACK', maxFreshnessMs: 300_000, authorityPenalty: 0.3, confidencePenalty: 0.25, claimRightsPenalty: 'high', notes: ['5-min max for continuity context only'] },
    ],
    unacceptableSubstitutions: [
      { sourceIdOrClass: 'market_surface', reason: 'Price momentum cannot substitute for OI measurement' },
      { sourceIdOrClass: 'narrative_attention', reason: 'Social buzz is not derivatives pressure' },
      { sourceIdOrClass: 'protocol_substance', reason: 'TVL cannot proxy leverage structure' },
    ],
    temporalFallback: { allowed: true, maxAgeMs: 300_000, allowedClaimStrength: 'weak', notes: ['Only for prior-state context'] },
    noFallbackClaimFamilies: ['leverage-dominance thesis', 'crowding fragility claim', 'squeeze probability'],
    blindSpotSeverity: 'high', failMode: 'fail_soft', version: V },

  { truthAtomId: 'oi.velocity', truthClass: TC.DERIVATIVES_PRESSURE, primarySourceId: 'coinglass', secondarySourceIds: [],
    acceptableSubstitutions: [],
    unacceptableSubstitutions: [
      { sourceIdOrClass: 'market_surface', reason: 'Volume velocity is not OI velocity' },
    ],
    temporalFallback: { allowed: true, maxAgeMs: 180_000, allowedClaimStrength: 'weak', notes: ['Extremely perishable'] },
    noFallbackClaimFamilies: ['leverage acceleration', 'OI-driven continuation'],
    blindSpotSeverity: 'high', failMode: 'fail_soft', version: V },

  { truthAtomId: 'funding.rate', truthClass: TC.DERIVATIVES_PRESSURE, primarySourceId: 'coinglass', secondarySourceIds: [],
    acceptableSubstitutions: [],
    unacceptableSubstitutions: [
      { sourceIdOrClass: 'narrative_attention', reason: 'Sentiment cannot proxy funding' },
    ],
    temporalFallback: { allowed: true, maxAgeMs: 600_000, allowedClaimStrength: 'weak', notes: ['Funding changes slowly enough for bounded reuse'] },
    noFallbackClaimFamilies: ['funding-stretched thesis', 'carry-trade fragility'],
    blindSpotSeverity: 'high', failMode: 'fail_soft', version: V },

  { truthAtomId: 'liq.long.usd', truthClass: TC.DERIVATIVES_PRESSURE, primarySourceId: 'coinglass', secondarySourceIds: [],
    acceptableSubstitutions: [],
    unacceptableSubstitutions: [{ sourceIdOrClass: 'market_surface', reason: 'Price drops are not liquidation data' }],
    temporalFallback: { allowed: true, maxAgeMs: 120_000, allowedClaimStrength: 'weak', notes: ['Extremely perishable event data'] },
    noFallbackClaimFamilies: ['live liquidation cascade', 'liquidation cluster proximity'],
    blindSpotSeverity: 'high', failMode: 'fail_soft', version: V },

  { truthAtomId: 'liq.short.usd', truthClass: TC.DERIVATIVES_PRESSURE, primarySourceId: 'coinglass', secondarySourceIds: [],
    acceptableSubstitutions: [],
    unacceptableSubstitutions: [{ sourceIdOrClass: 'market_surface', reason: 'Price rises are not short liquidation data' }],
    temporalFallback: { allowed: true, maxAgeMs: 120_000, allowedClaimStrength: 'weak', notes: [] },
    noFallbackClaimFamilies: ['live liquidation cascade'],
    blindSpotSeverity: 'high', failMode: 'fail_soft', version: V },

  { truthAtomId: 'crowding.index', truthClass: TC.DERIVATIVES_PRESSURE, primarySourceId: 'coinglass', secondarySourceIds: [],
    acceptableSubstitutions: [],
    unacceptableSubstitutions: [{ sourceIdOrClass: 'narrative_attention', reason: 'Social crowding is not derivatives crowding' }],
    temporalFallback: { allowed: true, maxAgeMs: 300_000, allowedClaimStrength: 'weak', notes: [] },
    noFallbackClaimFamilies: ['crowding fragility', 'leverage crowding thesis'],
    blindSpotSeverity: 'high', failMode: 'fail_soft', version: V },

  // ═══════════════════════════════════════════════════════════════════════
  // PROTOCOL SUBSTANCE — slow structural truth, temporal fallback permitted
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'protocol.tvl', truthClass: TC.PROTOCOL_SUBSTANCE, primarySourceId: 'defillama', secondarySourceIds: [],
    acceptableSubstitutions: [
      { sourceId: 'temporal_last_state', mode: 'TEMPORAL_FALLBACK', maxFreshnessMs: 3_600_000, authorityPenalty: 0.15, confidencePenalty: 0.15, claimRightsPenalty: 'medium', notes: ['1-hour temporal fallback for structural context'] },
      { sourceId: 'onchain_behavior_proxy', mode: 'ADJACENT_TRUTH_CONTINUITY', authorityPenalty: 0.5, confidencePenalty: 0.4, claimRightsPenalty: 'high', notes: ['On-chain fee/activity as weak TVL proxy'] },
    ],
    unacceptableSubstitutions: [
      { sourceIdOrClass: 'market_surface', reason: 'Market cap is not TVL' },
      { sourceIdOrClass: 'narrative_attention', reason: 'Social buzz cannot substitute protocol economics' },
    ],
    temporalFallback: { allowed: true, maxAgeMs: 3_600_000, allowedClaimStrength: 'medium', notes: ['Substance changes slowly'] },
    noFallbackClaimFamilies: ['TVL-backed substance thesis', 'protocol growth validation'],
    blindSpotSeverity: 'medium', failMode: 'fail_soft', version: V },

  { truthAtomId: 'protocol.fees.usd', truthClass: TC.PROTOCOL_SUBSTANCE, primarySourceId: 'defillama', secondarySourceIds: [],
    acceptableSubstitutions: [
      { sourceId: 'temporal_last_state', mode: 'TEMPORAL_FALLBACK', maxFreshnessMs: 7_200_000, authorityPenalty: 0.1, confidencePenalty: 0.1, claimRightsPenalty: 'low', notes: ['Fee data is slow-changing'] },
    ],
    unacceptableSubstitutions: [{ sourceIdOrClass: 'narrative_attention', reason: 'Buzz is not revenue' }],
    temporalFallback: { allowed: true, maxAgeMs: 7_200_000, allowedClaimStrength: 'medium', notes: [] },
    noFallbackClaimFamilies: ['fee-backed quality thesis'],
    blindSpotSeverity: 'medium', failMode: 'fail_soft', version: V },

  { truthAtomId: 'protocol.revenue.usd', truthClass: TC.PROTOCOL_SUBSTANCE, primarySourceId: 'defillama', secondarySourceIds: [],
    acceptableSubstitutions: [
      { sourceId: 'temporal_last_state', mode: 'TEMPORAL_FALLBACK', maxFreshnessMs: 7_200_000, authorityPenalty: 0.1, confidencePenalty: 0.1, claimRightsPenalty: 'low', notes: [] },
    ],
    unacceptableSubstitutions: [{ sourceIdOrClass: 'market_surface', reason: 'Price is not revenue' }],
    temporalFallback: { allowed: true, maxAgeMs: 7_200_000, allowedClaimStrength: 'medium', notes: [] },
    noFallbackClaimFamilies: ['revenue-backed rerating'],
    blindSpotSeverity: 'medium', failMode: 'fail_soft', version: V },

  { truthAtomId: 'protocol.unlock.next', truthClass: TC.PROTOCOL_SUBSTANCE, primarySourceId: 'defillama', secondarySourceIds: [],
    acceptableSubstitutions: [
      { sourceId: 'temporal_last_state', mode: 'TEMPORAL_FALLBACK', maxFreshnessMs: 86_400_000, authorityPenalty: 0.05, confidencePenalty: 0.05, claimRightsPenalty: 'none', notes: ['Unlock schedules change very slowly'] },
    ],
    unacceptableSubstitutions: [],
    temporalFallback: { allowed: true, maxAgeMs: 86_400_000, allowedClaimStrength: 'medium', notes: [] },
    noFallbackClaimFamilies: [],
    blindSpotSeverity: 'low', failMode: 'fail_soft', version: V },

  // ═══════════════════════════════════════════════════════════════════════
  // ON-CHAIN BEHAVIOR — chain-specific, secondary substitution possible
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'wallet.exchange_inflow', truthClass: TC.ONCHAIN_BEHAVIOR, primarySourceId: 'alchemy', secondarySourceIds: ['quicknode'],
    acceptableSubstitutions: [
      { sourceId: 'quicknode', mode: 'SAME_AUTHORITY', authorityPenalty: 0, confidencePenalty: 0, claimRightsPenalty: 'none', notes: ['Chain-equivalent for Solana'] },
      { sourceId: 'explorer_reconstruction', mode: 'LOWER_AUTHORITY_SAME_TRUTH', authorityPenalty: 0.2, confidencePenalty: 0.15, claimRightsPenalty: 'low', notes: ['Explorer-based transfer logs'] },
    ],
    unacceptableSubstitutions: [
      { sourceIdOrClass: 'entity_context', reason: 'Entity labels alone cannot substitute flow measurement' },
      { sourceIdOrClass: 'narrative_attention', reason: 'Social buzz is not exchange flow data' },
    ],
    temporalFallback: { allowed: true, maxAgeMs: 600_000, allowedClaimStrength: 'weak', notes: ['10-min for flow context'] },
    noFallbackClaimFamilies: ['exchange-deposit-pressure claim', 'inflow-driven fragility'],
    blindSpotSeverity: 'high', failMode: 'fail_soft', version: V },

  { truthAtomId: 'wallet.exchange_outflow', truthClass: TC.ONCHAIN_BEHAVIOR, primarySourceId: 'alchemy', secondarySourceIds: ['quicknode'],
    acceptableSubstitutions: [
      { sourceId: 'quicknode', mode: 'SAME_AUTHORITY', authorityPenalty: 0, confidencePenalty: 0, claimRightsPenalty: 'none', notes: [] },
      { sourceId: 'explorer_reconstruction', mode: 'LOWER_AUTHORITY_SAME_TRUTH', authorityPenalty: 0.2, confidencePenalty: 0.15, claimRightsPenalty: 'low', notes: [] },
    ],
    unacceptableSubstitutions: [{ sourceIdOrClass: 'narrative_attention', reason: 'Buzz is not outflow data' }],
    temporalFallback: { allowed: true, maxAgeMs: 600_000, allowedClaimStrength: 'weak', notes: [] },
    noFallbackClaimFamilies: ['accumulation-driven conviction claim'],
    blindSpotSeverity: 'high', failMode: 'fail_soft', version: V },

  { truthAtomId: 'wallet.whale_flow', truthClass: TC.ONCHAIN_BEHAVIOR, primarySourceId: 'alchemy', secondarySourceIds: ['quicknode'],
    acceptableSubstitutions: [
      { sourceId: 'quicknode', mode: 'SAME_AUTHORITY', authorityPenalty: 0, confidencePenalty: 0, claimRightsPenalty: 'none', notes: [] },
    ],
    unacceptableSubstitutions: [
      { sourceIdOrClass: 'entity_context', reason: 'Entity labels do not measure flow volume' },
      { sourceIdOrClass: 'market_surface', reason: 'Price is not whale flow' },
    ],
    temporalFallback: { allowed: true, maxAgeMs: 600_000, allowedClaimStrength: 'weak', notes: [] },
    noFallbackClaimFamilies: ['whale accumulation thesis', 'treasury distribution detection'],
    blindSpotSeverity: 'high', failMode: 'fail_soft', version: V },

  // ═══════════════════════════════════════════════════════════════════════
  // STRUCTURAL SAFETY — fail-stop for safety-sensitive claims
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'security.risk_score', truthClass: TC.STRUCTURAL_SAFETY, primarySourceId: 'goplus', secondarySourceIds: ['etherscan', 'solscan'],
    acceptableSubstitutions: [
      { sourceId: 'etherscan', mode: 'LOWER_AUTHORITY_SAME_TRUTH', authorityPenalty: 0.25, confidencePenalty: 0.2, claimRightsPenalty: 'medium', notes: ['Explorer-level structural check only'] },
      { sourceId: 'temporal_last_state', mode: 'TEMPORAL_FALLBACK', maxFreshnessMs: 3_600_000, authorityPenalty: 0.2, confidencePenalty: 0.15, claimRightsPenalty: 'medium', notes: ['Safety changes slowly for established contracts'] },
    ],
    unacceptableSubstitutions: [
      { sourceIdOrClass: 'market_surface', reason: 'Price performance cannot validate safety' },
      { sourceIdOrClass: 'narrative_attention', reason: 'Community reputation is not structural safety' },
      { sourceIdOrClass: 'onchain_behavior', reason: 'Activity volume does not prove structural legitimacy' },
    ],
    temporalFallback: { allowed: true, maxAgeMs: 3_600_000, allowedClaimStrength: 'weak', notes: [] },
    noFallbackClaimFamilies: ['token appears safe', 'no structural risk detected', 'safety-cleared opportunity'],
    blindSpotSeverity: 'critical', failMode: 'fail_stop', version: V },

  { truthAtomId: 'security.mint_authority', truthClass: TC.STRUCTURAL_SAFETY, primarySourceId: 'goplus', secondarySourceIds: [],
    acceptableSubstitutions: [
      { sourceId: 'explorer_contract_check', mode: 'LOWER_AUTHORITY_SAME_TRUTH', authorityPenalty: 0.3, confidencePenalty: 0.25, claimRightsPenalty: 'high', notes: ['Direct contract inspection fallback'] },
    ],
    unacceptableSubstitutions: [
      { sourceIdOrClass: 'market_surface', reason: 'Price cannot confirm mint safety' },
      { sourceIdOrClass: 'narrative_attention', reason: 'Social trust cannot substitute for mint authority verification' },
    ],
    temporalFallback: { allowed: true, maxAgeMs: 86_400_000, allowedClaimStrength: 'weak', notes: ['Mint authority rarely changes'] },
    noFallbackClaimFamilies: ['mint authority is safe', 'no centralized minting risk'],
    blindSpotSeverity: 'critical', failMode: 'fail_stop', version: V },

  { truthAtomId: 'security.ownership_conc', truthClass: TC.STRUCTURAL_SAFETY, primarySourceId: 'goplus', secondarySourceIds: ['etherscan'],
    acceptableSubstitutions: [
      { sourceId: 'etherscan', mode: 'LOWER_AUTHORITY_SAME_TRUTH', authorityPenalty: 0.2, confidencePenalty: 0.15, claimRightsPenalty: 'medium', notes: [] },
    ],
    unacceptableSubstitutions: [{ sourceIdOrClass: 'narrative_attention', reason: 'Community size is not holder distribution' }],
    temporalFallback: { allowed: true, maxAgeMs: 3_600_000, allowedClaimStrength: 'weak', notes: [] },
    noFallbackClaimFamilies: ['ownership is distributed', 'holder structure is healthy'],
    blindSpotSeverity: 'high', failMode: 'fail_stop', version: V },

  // ═══════════════════════════════════════════════════════════════════════
  // MARKET SURFACE — well-substitutable across providers
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'price.spot', truthClass: TC.MARKET_SURFACE, primarySourceId: 'coingecko', secondarySourceIds: ['coinmarketcap', 'birdeye'],
    acceptableSubstitutions: [
      { sourceId: 'coinmarketcap', mode: 'SAME_AUTHORITY', authorityPenalty: 0, confidencePenalty: 0, claimRightsPenalty: 'none', notes: ['Equivalent authority'] },
      { sourceId: 'birdeye', mode: 'LOWER_AUTHORITY_SAME_TRUTH', authorityPenalty: 0.1, confidencePenalty: 0.05, claimRightsPenalty: 'none', notes: ['Solana-focused but valid'] },
      { sourceId: 'dexscreener', mode: 'LOWER_AUTHORITY_SAME_TRUTH', authorityPenalty: 0.15, confidencePenalty: 0.1, claimRightsPenalty: 'low', notes: ['DEX-native price'] },
    ],
    unacceptableSubstitutions: [],
    temporalFallback: { allowed: true, maxAgeMs: 300_000, allowedClaimStrength: 'medium', notes: ['5-min price is still useful context'] },
    noFallbackClaimFamilies: [],
    blindSpotSeverity: 'high', failMode: 'fail_soft', version: V },

  { truthAtomId: 'volume.usd', truthClass: TC.MARKET_SURFACE, primarySourceId: 'coingecko', secondarySourceIds: ['coinmarketcap'],
    acceptableSubstitutions: [
      { sourceId: 'coinmarketcap', mode: 'SAME_AUTHORITY', authorityPenalty: 0, confidencePenalty: 0, claimRightsPenalty: 'none', notes: [] },
    ],
    unacceptableSubstitutions: [],
    temporalFallback: { allowed: true, maxAgeMs: 600_000, allowedClaimStrength: 'weak', notes: [] },
    noFallbackClaimFamilies: [],
    blindSpotSeverity: 'medium', failMode: 'fail_soft', version: V },

  // ═══════════════════════════════════════════════════════════════════════
  // DEX EMERGENCE — fast volatile, reasonable secondary coverage
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'pair.newly_created', truthClass: TC.DEX_EMERGENCE, primarySourceId: 'dexscreener', secondarySourceIds: ['geckoterminal'],
    acceptableSubstitutions: [
      { sourceId: 'geckoterminal', mode: 'SAME_AUTHORITY', authorityPenalty: 0.1, confidencePenalty: 0.05, claimRightsPenalty: 'none', notes: [] },
    ],
    unacceptableSubstitutions: [{ sourceIdOrClass: 'market_surface', reason: 'CoinGecko listing is not DEX pair creation' }],
    temporalFallback: { allowed: true, maxAgeMs: 300_000, allowedClaimStrength: 'weak', notes: [] },
    noFallbackClaimFamilies: ['early-discovery opportunity'],
    blindSpotSeverity: 'medium', failMode: 'fail_soft', version: V },

  { truthAtomId: 'pair.liquidity.depth', truthClass: TC.DEX_EMERGENCE, primarySourceId: 'dexscreener', secondarySourceIds: ['geckoterminal'],
    acceptableSubstitutions: [
      { sourceId: 'geckoterminal', mode: 'SAME_AUTHORITY', authorityPenalty: 0.1, confidencePenalty: 0.05, claimRightsPenalty: 'none', notes: [] },
    ],
    unacceptableSubstitutions: [],
    temporalFallback: { allowed: true, maxAgeMs: 300_000, allowedClaimStrength: 'weak', notes: [] },
    noFallbackClaimFamilies: [],
    blindSpotSeverity: 'medium', failMode: 'fail_soft', version: V },

  // ═══════════════════════════════════════════════════════════════════════
  // NARRATIVE ATTENTION — multi-source composite, partial degradation OK
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'narrative.intensity', truthClass: TC.NARRATIVE_ATTENTION, primarySourceId: 'lunarcrush', secondarySourceIds: ['cryptopanic', 'twitter_api'],
    acceptableSubstitutions: [
      { sourceId: 'cryptopanic', mode: 'SAME_AUTHORITY', authorityPenalty: 0.1, confidencePenalty: 0.1, claimRightsPenalty: 'low', notes: ['News-focused intensity subset'] },
      { sourceId: 'twitter_api', mode: 'LOWER_AUTHORITY_SAME_TRUTH', authorityPenalty: 0.2, confidencePenalty: 0.15, claimRightsPenalty: 'low', notes: ['Social-only subset'] },
    ],
    unacceptableSubstitutions: [
      { sourceIdOrClass: 'protocol_substance', reason: 'TVL is not narrative' },
      { sourceIdOrClass: 'derivatives_pressure', reason: 'Leverage is not attention' },
    ],
    temporalFallback: { allowed: true, maxAgeMs: 600_000, allowedClaimStrength: 'weak', notes: [] },
    noFallbackClaimFamilies: ['narrative-driven move thesis'],
    blindSpotSeverity: 'low', failMode: 'fail_soft', version: V },

  { truthAtomId: 'social.acceleration', truthClass: TC.NARRATIVE_ATTENTION, primarySourceId: 'lunarcrush', secondarySourceIds: ['twitter_api'],
    acceptableSubstitutions: [
      { sourceId: 'twitter_api', mode: 'LOWER_AUTHORITY_SAME_TRUTH', authorityPenalty: 0.15, confidencePenalty: 0.1, claimRightsPenalty: 'low', notes: [] },
    ],
    unacceptableSubstitutions: [{ sourceIdOrClass: 'market_surface', reason: 'Price action is not social signal' }],
    temporalFallback: { allowed: true, maxAgeMs: 600_000, allowedClaimStrength: 'weak', notes: [] },
    noFallbackClaimFamilies: ['memetic acceleration claim'],
    blindSpotSeverity: 'low', failMode: 'fail_soft', version: V },

  // ═══════════════════════════════════════════════════════════════════════
  // ENTITY CONTEXT — fail-stop for strong identity claims
  // ═══════════════════════════════════════════════════════════════════════
  { truthAtomId: 'entity.label_confidence', truthClass: TC.ENTITY_CONTEXT, primarySourceId: 'arkham', secondarySourceIds: ['nansen'],
    acceptableSubstitutions: [
      { sourceId: 'nansen', mode: 'SAME_AUTHORITY', authorityPenalty: 0, confidencePenalty: 0, claimRightsPenalty: 'none', notes: ['Equivalent entity intelligence'] },
      { sourceId: 'internal_heuristic', mode: 'LOWER_AUTHORITY_SAME_TRUTH', authorityPenalty: 0.4, confidencePenalty: 0.35, claimRightsPenalty: 'high', notes: ['Weak internal clustering only'] },
    ],
    unacceptableSubstitutions: [
      { sourceIdOrClass: 'onchain_behavior', reason: 'Raw wallet behavior is not actor identity' },
      { sourceIdOrClass: 'narrative_attention', reason: 'Popularity is not entity labeling' },
    ],
    temporalFallback: { allowed: true, maxAgeMs: 86_400_000, allowedClaimStrength: 'weak', notes: ['Entity labels change slowly'] },
    noFallbackClaimFamilies: ['smart money is accumulating', 'exchange wallets are distributing', 'fund is involved'],
    blindSpotSeverity: 'medium', failMode: 'fail_stop', version: V },

  { truthAtomId: 'entity.institutional', truthClass: TC.ENTITY_CONTEXT, primarySourceId: 'arkham', secondarySourceIds: ['nansen'],
    acceptableSubstitutions: [
      { sourceId: 'nansen', mode: 'SAME_AUTHORITY', authorityPenalty: 0, confidencePenalty: 0, claimRightsPenalty: 'none', notes: [] },
    ],
    unacceptableSubstitutions: [{ sourceIdOrClass: 'onchain_behavior', reason: 'Transfer size alone cannot confirm institutional status' }],
    temporalFallback: { allowed: true, maxAgeMs: 86_400_000, allowedClaimStrength: 'weak', notes: [] },
    noFallbackClaimFamilies: ['institutional involvement confirmed'],
    blindSpotSeverity: 'medium', failMode: 'fail_stop', version: V },
];

const RULE_MAP = new Map<string, TruthAtomRedundancyRule>(REDUNDANCY_RULES.map(r => [r.truthAtomId, r]));

export function getRedundancyRule(truthAtomId: string): TruthAtomRedundancyRule | undefined {
  return RULE_MAP.get(truthAtomId);
}

export function getFailStopAtoms(): TruthAtomRedundancyRule[] {
  return REDUNDANCY_RULES.filter(r => r.failMode === 'fail_stop');
}

export function getFailSoftAtoms(): TruthAtomRedundancyRule[] {
  return REDUNDANCY_RULES.filter(r => r.failMode === 'fail_soft');
}

export function getAtomsByBlindSeverity(severity: string): TruthAtomRedundancyRule[] {
  return REDUNDANCY_RULES.filter(r => r.blindSpotSeverity === severity);
}
