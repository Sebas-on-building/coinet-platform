/**
 * L1.5 Conflict Constitution
 *
 * Per-field conflict rules, winner rules, contradiction preservation
 * policies, blocker definitions, and cross-class contradiction patterns.
 *
 * Fusion is an earned right, not the default reaction to disagreement.
 */

import { TRUTH_CLASSES, type TruthClass } from '../registry';
import {
  type WinnerRule, type ConflictSeverity, type BlockerClass, type BlockerRecord,
  type CrossClassContradictionPattern,
  L15_PLATFORM_VERSION,
} from './conflict-types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRADICTION PRESERVATION POLICY
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContradictionPreservationPolicy {
  preserveIfMaterial: boolean;
  preserveIfCrossClass: boolean;
  preserveIfCoAuthorityConflict: boolean;
  preserveIfBlockerVsConsensus: boolean;
  confidencePenaltyRange: [number, number];
  disclosureRequired: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD CONFLICT RULE
// ═══════════════════════════════════════════════════════════════════════════════

export interface FieldConflictRule {
  fieldId: string;
  winnerRule: WinnerRule;
  fusionAllowed: boolean;
  preservePolicy: ContradictionPreservationPolicy;
  hardBlockerOverride: boolean;
  downstreamEffects: string[];
}

export const FIELD_CONFLICT_RULES: Record<string, FieldConflictRule> = {
  // ── Market Surface ────────────────────────────────────────────────────────
  'price.spot.canonical': {
    fieldId: 'price.spot.canonical',
    winnerRule: 'OWNER_OVER_CONFIRMER',
    fusionAllowed: true,
    preservePolicy: {
      preserveIfMaterial: true, preserveIfCrossClass: false,
      preserveIfCoAuthorityConflict: true, preserveIfBlockerVsConsensus: true,
      confidencePenaltyRange: [0.05, 0.20], disclosureRequired: true,
    },
    hardBlockerOverride: false,
    downstreamEffects: ['all_directional_claims', 'market.cap', 'scenario_engine'],
  },
  'price.ohlcv': {
    fieldId: 'price.ohlcv', winnerRule: 'OWNER_OVER_CONFIRMER', fusionAllowed: true,
    preservePolicy: { preserveIfMaterial: false, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.03, 0.10], disclosureRequired: false },
    hardBlockerOverride: false, downstreamEffects: ['charting_claims'],
  },
  'market.cap': {
    fieldId: 'market.cap', winnerRule: 'OWNER_OVER_CONFIRMER', fusionAllowed: true,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: true, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.05, 0.15], disclosureRequired: true },
    hardBlockerOverride: false, downstreamEffects: ['ranking_claims'],
  },
  'market.supply.circulating': {
    fieldId: 'market.supply.circulating', winnerRule: 'OWNER_OVER_CONFIRMER', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: true, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.05, 0.15], disclosureRequired: true },
    hardBlockerOverride: false, downstreamEffects: ['market.cap'],
  },

  // ── DEX Emergence ─────────────────────────────────────────────────────────
  'dex.pool.liquidity': {
    fieldId: 'dex.pool.liquidity', winnerRule: 'SPECIALIST_OVER_BREADTH', fusionAllowed: true,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: true, confidencePenaltyRange: [0.05, 0.20], disclosureRequired: true },
    hardBlockerOverride: false, downstreamEffects: ['pool_safety_claims'],
  },
  'dex.pool.price': {
    fieldId: 'dex.pool.price', winnerRule: 'SPECIALIST_OVER_BREADTH', fusionAllowed: true,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.05, 0.15], disclosureRequired: true },
    hardBlockerOverride: false, downstreamEffects: ['dex_pricing_claims'],
  },
  'dex.pair.discovery': {
    fieldId: 'dex.pair.discovery', winnerRule: 'SPECIALIST_OVER_BREADTH', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: false, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.02, 0.08], disclosureRequired: false },
    hardBlockerOverride: false, downstreamEffects: [],
  },

  // ── Derivatives Pressure ──────────────────────────────────────────────────
  'derivatives.oi.aggregate': {
    fieldId: 'derivatives.oi.aggregate', winnerRule: 'SPECIALIST_OVER_BREADTH', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: true, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: true, confidencePenaltyRange: [0.10, 0.25], disclosureRequired: true },
    hardBlockerOverride: true, downstreamEffects: ['leverage_thesis', 'crowding_claims', 'fragility_thesis'],
  },
  'derivatives.funding.aggregate': {
    fieldId: 'derivatives.funding.aggregate', winnerRule: 'SPECIALIST_OVER_BREADTH', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: true, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: true, confidencePenaltyRange: [0.10, 0.20], disclosureRequired: true },
    hardBlockerOverride: true, downstreamEffects: ['funding_sentiment_claims'],
  },
  'derivatives.liquidation.orderflow': {
    fieldId: 'derivatives.liquidation.orderflow', winnerRule: 'SPECIALIST_OVER_BREADTH', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: true, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: true, confidencePenaltyRange: [0.10, 0.25], disclosureRequired: true },
    hardBlockerOverride: true, downstreamEffects: ['cascade_risk_claims'],
  },
  'derivatives.leverage.stress': {
    fieldId: 'derivatives.leverage.stress', winnerRule: 'SPECIALIST_OVER_BREADTH', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: true, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: true, confidencePenaltyRange: [0.10, 0.20], disclosureRequired: true },
    hardBlockerOverride: true, downstreamEffects: ['fragility_thesis', 'crowding_claims'],
  },

  // ── Protocol Substance ────────────────────────────────────────────────────
  'protocol.tvl.usd': {
    fieldId: 'protocol.tvl.usd', winnerRule: 'SPECIALIST_OVER_BREADTH', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: true, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.08, 0.20], disclosureRequired: true },
    hardBlockerOverride: false, downstreamEffects: ['protocol_health_claims', 'rerating_thesis'],
  },
  'protocol.fees.daily': {
    fieldId: 'protocol.fees.daily', winnerRule: 'SPECIALIST_OVER_BREADTH', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: true, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.08, 0.20], disclosureRequired: true },
    hardBlockerOverride: false, downstreamEffects: ['revenue_claims', 'valuation_thesis'],
  },
  'protocol.revenue.daily': {
    fieldId: 'protocol.revenue.daily', winnerRule: 'SPECIALIST_OVER_BREADTH', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: true, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.08, 0.20], disclosureRequired: true },
    hardBlockerOverride: false, downstreamEffects: ['sustainability_claims'],
  },

  // ── On-Chain Behavior ─────────────────────────────────────────────────────
  'onchain.transfers.evm': {
    fieldId: 'onchain.transfers.evm', winnerRule: 'NATIVE_OVER_DERIVED', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: false, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.03, 0.10], disclosureRequired: false },
    hardBlockerOverride: false, downstreamEffects: ['whale_behavior_claims'],
  },
  'onchain.transfers.solana': {
    fieldId: 'onchain.transfers.solana', winnerRule: 'NATIVE_OVER_DERIVED', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: false, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.03, 0.10], disclosureRequired: false },
    hardBlockerOverride: false, downstreamEffects: ['solana_flow_claims'],
  },
  'onchain.contract.events': {
    fieldId: 'onchain.contract.events', winnerRule: 'NATIVE_OVER_DERIVED', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: false, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.03, 0.10], disclosureRequired: false },
    hardBlockerOverride: false, downstreamEffects: [],
  },
  'onchain.whale.flows': {
    fieldId: 'onchain.whale.flows', winnerRule: 'NATIVE_OVER_DERIVED', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: true, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.08, 0.20], disclosureRequired: true },
    hardBlockerOverride: false, downstreamEffects: ['accumulation_claims', 'distribution_claims'],
  },

  // ── Structural Safety ─────────────────────────────────────────────────────
  'security.token.flags': {
    fieldId: 'security.token.flags', winnerRule: 'SPECIALIST_OVER_BREADTH', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: true, preserveIfCoAuthorityConflict: true, preserveIfBlockerVsConsensus: true, confidencePenaltyRange: [0.15, 0.40], disclosureRequired: true },
    hardBlockerOverride: true, downstreamEffects: ['safety_verdict', 'opportunity_confidence_cap', 'all_bullish_claims'],
  },
  'security.contract.risk': {
    fieldId: 'security.contract.risk', winnerRule: 'SPECIALIST_OVER_BREADTH', fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: true, preserveIfCoAuthorityConflict: true, preserveIfBlockerVsConsensus: true, confidencePenaltyRange: [0.15, 0.35], disclosureRequired: true },
    hardBlockerOverride: true, downstreamEffects: ['contract_safety_verdict'],
  },

  // ── Narrative Attention ───────────────────────────────────────────────────
  'narrative.news.velocity': {
    fieldId: 'narrative.news.velocity', winnerRule: 'OWNER_OVER_CONFIRMER', fusionAllowed: true,
    preservePolicy: { preserveIfMaterial: false, preserveIfCrossClass: true, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.03, 0.10], disclosureRequired: false },
    hardBlockerOverride: false, downstreamEffects: ['narrative_acceleration_claims'],
  },
  'narrative.social.velocity': {
    fieldId: 'narrative.social.velocity', winnerRule: 'OWNER_OVER_CONFIRMER', fusionAllowed: true,
    preservePolicy: { preserveIfMaterial: false, preserveIfCrossClass: true, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.03, 0.10], disclosureRequired: false },
    hardBlockerOverride: false, downstreamEffects: ['social_acceleration_claims'],
  },
  'narrative.retail.attention': {
    fieldId: 'narrative.retail.attention', winnerRule: 'OWNER_OVER_CONFIRMER', fusionAllowed: true,
    preservePolicy: { preserveIfMaterial: false, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: false, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.02, 0.08], disclosureRequired: false },
    hardBlockerOverride: false, downstreamEffects: [],
  },

  // ── Entity Context ────────────────────────────────────────────────────────
  'entity.wallet.labels': {
    fieldId: 'entity.wallet.labels', winnerRule: 'CO_AUTHORITY_PRESERVE_CONTRADICTION',
    fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: true, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.12, 0.25], disclosureRequired: true },
    hardBlockerOverride: false, downstreamEffects: ['smart_money_claims', 'actor_identity_claims'],
  },
  'entity.smart_money': {
    fieldId: 'entity.smart_money', winnerRule: 'CO_AUTHORITY_PRESERVE_CONTRADICTION',
    fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: true, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.12, 0.25], disclosureRequired: true },
    hardBlockerOverride: false, downstreamEffects: ['smart_money_accumulation_claims'],
  },
  'entity.cluster.attribution': {
    fieldId: 'entity.cluster.attribution', winnerRule: 'CO_AUTHORITY_PRESERVE_CONTRADICTION',
    fusionAllowed: false,
    preservePolicy: { preserveIfMaterial: true, preserveIfCrossClass: false, preserveIfCoAuthorityConflict: true, preserveIfBlockerVsConsensus: false, confidencePenaltyRange: [0.10, 0.20], disclosureRequired: true },
    hardBlockerOverride: false, downstreamEffects: ['cluster_interpretation'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-CLASS CONTRADICTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

export const CROSS_CLASS_PATTERNS: CrossClassContradictionPattern[] = [
  {
    patternId: 'narrative_bullish_vs_derivatives_crowded',
    classA: TRUTH_CLASSES.NARRATIVE_ATTENTION, classB: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    conditionA: 'social_velocity_high', conditionB: 'leverage_stress_elevated',
    description: 'Bullish narrative acceleration combined with crowded derivatives — potential fragility trap',
    severity: 'HIGH', thesisImplication: 'Narrative hype may mask leveraged fragility',
    confidencePenalty: 0.15,
  },
  {
    patternId: 'accumulation_vs_exchange_inflows',
    classA: TRUTH_CLASSES.ENTITY_CONTEXT, classB: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    conditionA: 'smart_money_accumulating', conditionB: 'exchange_inflows_rising',
    description: 'Smart money appears to accumulate while exchange inflows rise — contradictory flow signal',
    severity: 'HIGH', thesisImplication: 'Accumulation thesis weakened by exchange deposit pressure',
    confidencePenalty: 0.15,
  },
  {
    patternId: 'fee_growth_vs_unlock_risk',
    classA: TRUTH_CLASSES.PROTOCOL_SUBSTANCE, classB: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    conditionA: 'fees_revenue_growing', conditionB: 'unlock_risk_elevated',
    description: 'Protocol revenue growing but supply unlock risk elevated — dilution may neutralize growth',
    severity: 'MEDIUM', thesisImplication: 'Rerating thesis requires unlock-adjusted evaluation',
    confidencePenalty: 0.10,
  },
  {
    patternId: 'security_severe_vs_market_bullish',
    classA: TRUTH_CLASSES.STRUCTURAL_SAFETY, classB: TRUTH_CLASSES.MARKET_SURFACE,
    conditionA: 'security_flags_severe', conditionB: 'price_action_bullish',
    description: 'Severe structural safety red flag despite bullish price action — hard blocker pattern',
    severity: 'CRITICAL', thesisImplication: 'Safety veto overrides price signal',
    confidencePenalty: 0.30,
  },
  {
    patternId: 'social_extreme_vs_news_weak',
    classA: TRUTH_CLASSES.NARRATIVE_ATTENTION, classB: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    conditionA: 'social_velocity_extreme', conditionB: 'news_velocity_low',
    description: 'Extreme social velocity without confirming news events — possible unverified narrative acceleration',
    severity: 'MEDIUM', thesisImplication: 'Attention is organic or manufactured; treat as unverified',
    confidencePenalty: 0.08,
  },
  {
    patternId: 'whale_distribution_vs_protocol_strong',
    classA: TRUTH_CLASSES.ONCHAIN_BEHAVIOR, classB: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    conditionA: 'large_outflows_to_exchanges', conditionB: 'protocol_fundamentals_strong',
    description: 'Whale distribution despite strong protocol fundamentals — information asymmetry signal',
    severity: 'HIGH', thesisImplication: 'Insiders may know something fundamentals do not reflect yet',
    confidencePenalty: 0.15,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY API
// ═══════════════════════════════════════════════════════════════════════════════

export function getFieldConflictRule(fieldId: string): FieldConflictRule | undefined {
  return FIELD_CONFLICT_RULES[fieldId];
}

export function getAllFieldConflictRules(): FieldConflictRule[] {
  return Object.values(FIELD_CONFLICT_RULES);
}

export function getCrossClassPatterns(): CrossClassContradictionPattern[] {
  return CROSS_CLASS_PATTERNS;
}

export function getCrossClassPatternsByClass(truthClass: TruthClass): CrossClassContradictionPattern[] {
  return CROSS_CLASS_PATTERNS.filter(p => p.classA === truthClass || p.classB === truthClass);
}

export function getFieldsWithHardBlockerOverride(): string[] {
  return Object.values(FIELD_CONFLICT_RULES)
    .filter(r => r.hardBlockerOverride)
    .map(r => r.fieldId);
}
