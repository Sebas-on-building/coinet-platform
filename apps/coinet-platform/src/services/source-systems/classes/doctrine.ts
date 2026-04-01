/**
 * Full Source Class Doctrine — the observational constitution of Coinet.
 *
 * Each class defines what kind of truth it is allowed to speak,
 * what it is forbidden from claiming, and what companions it needs
 * for stronger claims.
 */

import { TRUTH_CLASSES, SOURCE_CLASSES } from '../registry';
import type { FullSourceClassDoctrine } from './types';
import { L11_DOCTRINE_VERSION } from './types';

const V = L11_DOCTRINE_VERSION;

export const FULL_DOCTRINES: Record<string, FullSourceClassDoctrine> = {
  [TRUTH_CLASSES.MARKET_SURFACE]: {
    id: TRUTH_CLASSES.MARKET_SURFACE,
    sourceClass: SOURCE_CLASSES.MARKET_DATA,
    name: 'Market Surface',
    purpose: 'Observe visible motion: price, volume, liquidity-adjacent market state, broad valuation surface.',
    observes: ['price', 'volume', 'market_cap', 'fdv', 'liquidity_depth', 'ranking', 'spread'],
    primaryEntities: ['token', 'pair'],
    canonicalMetricFamilies: ['price', 'volume', 'market_cap', 'liquidity'],
    allowedClaims: [
      { claim: 'Price is moving up/down', maxStrengthAlone: 'medium' },
      { claim: 'Volume is elevated or declining', maxStrengthAlone: 'medium' },
      { claim: 'Market cap ranks among X', maxStrengthAlone: 'strong' },
      { claim: 'Liquidity depth is thin/deep', maxStrengthAlone: 'medium' },
      { claim: 'This asset is broadly visible in the market', maxStrengthAlone: 'strong' },
    ],
    forbiddenClaims: [
      { claim: 'Demand is structurally real', reason: 'Requires on-chain behavior + derivatives confirmation' },
      { claim: 'This move is manipulation', reason: 'Requires structural safety + on-chain + entity context' },
      { claim: 'Protocol is fundamentally improving', reason: 'Requires protocol substance class' },
      { claim: 'Whales are accumulating with conviction', reason: 'Requires on-chain behavior + entity context' },
    ],
    requiredCompanionsForStrongClaims: [TRUTH_CLASSES.ONCHAIN_BEHAVIOR, TRUTH_CLASSES.DERIVATIVES_PRESSURE],
    typicalFreshnessProfile: 'fast',
    degradationImpact: 'high',
    downstreamConsumers: ['state_engine', 'timing_engine', 'scenario_engine', 'confidence_engine'],
    version: V,
  },

  [TRUTH_CLASSES.DEX_EMERGENCE]: {
    id: TRUTH_CLASSES.DEX_EMERGENCE,
    sourceClass: SOURCE_CLASSES.DEX_DISCOVERY,
    name: 'DEX Emergence',
    purpose: 'Observe new pair formation, liquidity ignition, fresh on-chain trading emergence, pool-level early structure.',
    observes: ['new_pairs', 'pool_liquidity', 'pair_age', 'dex_volume', 'early_momentum', 'pool_structure'],
    primaryEntities: ['pair', 'pool'],
    canonicalMetricFamilies: ['dex_liquidity', 'pair_freshness', 'dex_volume'],
    allowedClaims: [
      { claim: 'A new pair has formed with initial liquidity', maxStrengthAlone: 'strong' },
      { claim: 'Early trading activity is present', maxStrengthAlone: 'medium' },
      { claim: 'Liquidity is growing or thin', maxStrengthAlone: 'medium' },
    ],
    forbiddenClaims: [
      { claim: 'This is a quality long-term opportunity', reason: 'Requires substance + safety + behavior' },
      { claim: 'Demand is sustainable', reason: 'Early-stage data cannot prove sustainability' },
      { claim: 'Ownership is clean', reason: 'Requires structural safety class' },
    ],
    requiredCompanionsForStrongClaims: [TRUTH_CLASSES.STRUCTURAL_SAFETY, TRUTH_CLASSES.ONCHAIN_BEHAVIOR],
    typicalFreshnessProfile: 'fast',
    degradationImpact: 'medium',
    downstreamConsumers: ['state_engine', 'hypothesis_engine', 'timing_engine'],
    version: V,
  },

  [TRUTH_CLASSES.DERIVATIVES_PRESSURE]: {
    id: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    sourceClass: SOURCE_CLASSES.DERIVATIVES,
    name: 'Derivatives Pressure',
    purpose: 'Observe leverage, crowding, forced positioning, squeeze conditions, and cascade risk.',
    observes: ['open_interest', 'funding_rate', 'liquidations', 'long_short_ratio', 'perp_crowding', 'squeeze_proximity'],
    primaryEntities: ['token', 'exchange'],
    canonicalMetricFamilies: ['open_interest', 'funding', 'liquidations', 'leverage'],
    allowedClaims: [
      { claim: 'Leverage is elevated or declining', maxStrengthAlone: 'strong' },
      { claim: 'Funding is stretched in one direction', maxStrengthAlone: 'strong' },
      { claim: 'Liquidation risk is clustered', maxStrengthAlone: 'medium' },
      { claim: 'Move is leverage-driven not spot-driven', maxStrengthAlone: 'medium', requiredCompanions: [TRUTH_CLASSES.MARKET_SURFACE] },
    ],
    forbiddenClaims: [
      { claim: 'Organic spot demand exists', reason: 'Spot demand requires market surface + on-chain confirmation' },
      { claim: 'Protocol quality is improving', reason: 'Requires protocol substance class' },
      { claim: 'Treasury is accumulating', reason: 'Requires on-chain behavior + entity context' },
      { claim: 'Asset is structurally safe', reason: 'Requires structural safety class' },
    ],
    requiredCompanionsForStrongClaims: [TRUTH_CLASSES.MARKET_SURFACE, TRUTH_CLASSES.ONCHAIN_BEHAVIOR],
    typicalFreshnessProfile: 'realtime',
    degradationImpact: 'high',
    downstreamConsumers: ['hypothesis_engine', 'contradiction_engine', 'timing_engine', 'confidence_engine'],
    version: V,
  },

  [TRUTH_CLASSES.PROTOCOL_SUBSTANCE]: {
    id: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    sourceClass: SOURCE_CLASSES.FUNDAMENTALS,
    name: 'Protocol Substance',
    purpose: 'Observe business quality: TVL, fees, revenue, inflows, unlock pressure, economic reality of the protocol.',
    observes: ['tvl', 'fees', 'revenue', 'inflows', 'unlock_schedule', 'treasury_health', 'holder_capture'],
    primaryEntities: ['protocol', 'chain'],
    canonicalMetricFamilies: ['tvl', 'revenue', 'fees', 'unlock_pressure'],
    allowedClaims: [
      { claim: 'Protocol has real revenue and usage', maxStrengthAlone: 'strong' },
      { claim: 'TVL is growing or declining', maxStrengthAlone: 'strong' },
      { claim: 'Unlock pressure is approaching', maxStrengthAlone: 'strong' },
      { claim: 'Rerating may be fundamentally justified', maxStrengthAlone: 'medium', requiredCompanions: [TRUTH_CLASSES.MARKET_SURFACE] },
    ],
    forbiddenClaims: [
      { claim: 'Near-term price continuation is likely', reason: 'Substance decays slowly; cannot predict fast timing' },
      { claim: 'Leverage conditions are safe', reason: 'Requires derivatives pressure class' },
      { claim: 'Whale intent is accumulative', reason: 'Requires on-chain behavior class' },
    ],
    requiredCompanionsForStrongClaims: [TRUTH_CLASSES.MARKET_SURFACE],
    typicalFreshnessProfile: 'scheduled',
    degradationImpact: 'medium',
    downstreamConsumers: ['hypothesis_engine', 'scenario_engine', 'confidence_engine'],
    version: V,
  },

  [TRUTH_CLASSES.ONCHAIN_BEHAVIOR]: {
    id: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    sourceClass: SOURCE_CLASSES.ONCHAIN,
    name: 'On-Chain Behavior',
    purpose: 'Observe what wallets, contracts, treasuries, and actors are actually doing on-chain.',
    observes: ['wallet_transfers', 'exchange_flows', 'contract_events', 'treasury_movement', 'whale_flows', 'clustering'],
    primaryEntities: ['wallet', 'contract', 'treasury'],
    canonicalMetricFamilies: ['whale_activity', 'exchange_flows', 'treasury_movement'],
    allowedClaims: [
      { claim: 'Large wallets are moving assets', maxStrengthAlone: 'strong' },
      { claim: 'Exchange inflows/outflows are elevated', maxStrengthAlone: 'strong' },
      { claim: 'Accumulation or distribution pattern is visible', maxStrengthAlone: 'medium' },
      { claim: 'Smart money is accumulating with conviction', maxStrengthAlone: 'medium', requiredCompanions: [TRUTH_CLASSES.ENTITY_CONTEXT] },
    ],
    forbiddenClaims: [
      { claim: 'Derivatives conditions are safe', reason: 'Requires derivatives pressure class' },
      { claim: 'Protocol economics are sound', reason: 'Requires protocol substance class' },
      { claim: 'Narrative momentum is building', reason: 'Requires narrative attention class' },
    ],
    requiredCompanionsForStrongClaims: [TRUTH_CLASSES.ENTITY_CONTEXT],
    typicalFreshnessProfile: 'realtime',
    degradationImpact: 'high',
    downstreamConsumers: ['hypothesis_engine', 'contradiction_engine', 'confidence_engine'],
    version: V,
  },

  [TRUTH_CLASSES.STRUCTURAL_SAFETY]: {
    id: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    sourceClass: SOURCE_CLASSES.SECURITY,
    name: 'Structural Safety',
    purpose: 'Observe token/contract risk, ownership patterns, mint authority, verification, malicious signatures.',
    observes: ['contract_risk', 'honeypot_detection', 'mint_authority', 'lock_status', 'holder_concentration', 'verification'],
    primaryEntities: ['contract', 'token'],
    canonicalMetricFamilies: ['security_risk', 'holder_concentration', 'contract_flags'],
    allowedClaims: [
      { claim: 'Contract has dangerous characteristics', maxStrengthAlone: 'strong' },
      { claim: 'Ownership is concentrated', maxStrengthAlone: 'strong' },
      { claim: 'Structure appears legitimate', maxStrengthAlone: 'medium' },
      { claim: 'Confidence must be capped for safety reasons', maxStrengthAlone: 'strong' },
    ],
    forbiddenClaims: [
      { claim: 'This is a good opportunity', reason: 'Safety is a constraint, not an opportunity signal' },
      { claim: 'Demand is real', reason: 'Requires market surface + on-chain behavior' },
      { claim: 'Timing is favorable', reason: 'Requires timing engine, not safety class' },
    ],
    requiredCompanionsForStrongClaims: [],
    typicalFreshnessProfile: 'slow',
    degradationImpact: 'critical',
    downstreamConsumers: ['hypothesis_engine', 'confidence_engine', 'doctrine_enforcer'],
    version: V,
  },

  [TRUTH_CLASSES.NARRATIVE_ATTENTION]: {
    id: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    sourceClass: SOURCE_CLASSES.NARRATIVE,
    name: 'Narrative Attention',
    purpose: 'Observe attention flow: news intensity, social acceleration, memetic spread, sentiment velocity.',
    observes: ['news_intensity', 'social_momentum', 'sentiment_velocity', 'narrative_breadth', 'memetic_concentration'],
    primaryEntities: ['token', 'narrative_theme'],
    canonicalMetricFamilies: ['narrative_intensity', 'sentiment', 'social_dominance'],
    allowedClaims: [
      { claim: 'Attention is concentrating on this asset', maxStrengthAlone: 'strong' },
      { claim: 'Narrative heat is rising or falling', maxStrengthAlone: 'strong' },
      { claim: 'Move may be narrative-driven', maxStrengthAlone: 'weak', requiredCompanions: [TRUTH_CLASSES.PROTOCOL_SUBSTANCE] },
    ],
    forbiddenClaims: [
      { claim: 'Real accumulation is happening', reason: 'Requires on-chain behavior' },
      { claim: 'Protocol quality is improving', reason: 'Requires protocol substance' },
      { claim: 'Structure is safe', reason: 'Requires structural safety' },
      { claim: 'Move is sustainable', reason: 'Narrative alone cannot prove sustainability' },
    ],
    requiredCompanionsForStrongClaims: [TRUTH_CLASSES.PROTOCOL_SUBSTANCE, TRUTH_CLASSES.ONCHAIN_BEHAVIOR],
    typicalFreshnessProfile: 'fast',
    degradationImpact: 'low',
    downstreamConsumers: ['hypothesis_engine', 'scenario_engine'],
    version: V,
  },

  [TRUTH_CLASSES.ENTITY_CONTEXT]: {
    id: TRUTH_CLASSES.ENTITY_CONTEXT,
    sourceClass: SOURCE_CLASSES.ENTITY,
    name: 'Entity Context',
    purpose: 'Turn addresses into meaningful actors. Wallet labeling, smart-money identity, significance weighting.',
    observes: ['wallet_labels', 'entity_identity', 'smart_money_context', 'cluster_meaning', 'holder_quality'],
    primaryEntities: ['wallet', 'entity', 'fund'],
    canonicalMetricFamilies: ['entity_labels', 'holder_quality'],
    allowedClaims: [
      { claim: 'This wallet belongs to a known entity', maxStrengthAlone: 'strong' },
      { claim: 'Actor significance is high or low', maxStrengthAlone: 'medium' },
      { claim: 'Smart money is involved', maxStrengthAlone: 'medium', requiredCompanions: [TRUTH_CLASSES.ONCHAIN_BEHAVIOR] },
    ],
    forbiddenClaims: [
      { claim: 'Timing is favorable', reason: 'Entity identity does not predict timing' },
      { claim: 'Leverage conditions are known', reason: 'Requires derivatives pressure' },
      { claim: 'Protocol is sound', reason: 'Requires protocol substance' },
    ],
    requiredCompanionsForStrongClaims: [TRUTH_CLASSES.ONCHAIN_BEHAVIOR],
    typicalFreshnessProfile: 'slow',
    degradationImpact: 'medium',
    downstreamConsumers: ['hypothesis_engine', 'on-chain interpretation'],
    version: V,
  },

  [TRUTH_CLASSES.REASONING_EXPRESSION]: {
    id: TRUTH_CLASSES.REASONING_EXPRESSION,
    sourceClass: SOURCE_CLASSES.REASONING,
    name: 'Reasoning Expression',
    purpose: 'Translate structured intelligence into language. Explain, compare, compress, converse.',
    observes: [],
    primaryEntities: [],
    canonicalMetricFamilies: [],
    allowedClaims: [
      { claim: 'Explain what the engine concluded', maxStrengthAlone: 'strong' },
      { claim: 'Compare two interpretations in language', maxStrengthAlone: 'strong' },
      { claim: 'Compress complex state into readable form', maxStrengthAlone: 'strong' },
    ],
    forbiddenClaims: [
      { claim: 'Create unsupported evidence', reason: 'Reasoning is expression, not truth generation' },
      { claim: 'Replace missing truth domains', reason: 'Cannot manufacture observations' },
      { claim: 'Override contradiction or engine output', reason: 'Expression layer is downstream of truth' },
      { claim: 'Mask degraded visibility', reason: 'Must surface what the engine sees, including blindness' },
    ],
    requiredCompanionsForStrongClaims: [],
    typicalFreshnessProfile: 'realtime',
    degradationImpact: 'low',
    downstreamConsumers: ['chat', 'token_page', 'alerts', 'reports'],
    version: V,
  },
};

export function getFullDoctrine(truthClass: string): FullSourceClassDoctrine | undefined {
  return FULL_DOCTRINES[truthClass];
}

export function getAllFullDoctrines(): FullSourceClassDoctrine[] {
  return Object.values(FULL_DOCTRINES);
}
