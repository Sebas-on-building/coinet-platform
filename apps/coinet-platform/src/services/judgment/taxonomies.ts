/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     COINET JUDGMENT STANDARD — CORE TAXONOMIES                                ║
 * ║                                                                               ║
 * ║   Controlled vocabularies for:                                                ║
 * ║   - Market states                                                             ║
 * ║   - Causal families                                                           ║
 * ║   - Hypothesis classes                                                        ║
 * ║   - Contradiction classes                                                     ║
 * ║   - Timing phases                                                             ║
 * ║   - Confidence bands                                                          ║
 * ║                                                                               ║
 * ║   These MUST NOT be free-form strings. Every classification uses              ║
 * ║   these controlled enums. AI text is for explanation only.                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET STATES
// ═══════════════════════════════════════════════════════════════════════════════

export const MARKET_STATES = {
  // Discovery
  DORMANT: 'dormant',
  FRESH_DISCOVERY: 'fresh_discovery',
  EARLY_LIQUIDITY_FORMATION: 'early_liquidity_formation',
  NEW_NARRATIVE_IGNITION: 'new_narrative_ignition',

  // Expansion
  EARLY_ACCUMULATION: 'early_accumulation',
  SPOT_LED_EXPANSION: 'spot_led_expansion',
  LEVERAGE_LED_EXPANSION: 'leverage_led_expansion',
  FUNDAMENTALLY_SUPPORTED_RERATING: 'fundamentally_supported_rerating',

  // Fragility
  CROWDED_CONTINUATION: 'crowded_continuation',
  REFLEXIVE_LATE_STAGE: 'reflexive_late_stage',
  THIN_LIQUIDITY_RISK: 'thin_liquidity_risk',
  POST_EVENT_OVEREXTENSION: 'post_event_overextension',

  // Risk
  DISTRIBUTION: 'distribution',
  TREASURY_SELL_PRESSURE: 'treasury_sell_pressure',
  UNLOCK_OVERHANG: 'unlock_overhang',
  STRUCTURALLY_WEAK_RALLY: 'structurally_weak_rally',
  MANIPULATION_RISK: 'manipulation_risk',
} as const;

export type MarketState = (typeof MARKET_STATES)[keyof typeof MARKET_STATES];

export const MarketStateSchema = z.enum([
  MARKET_STATES.DORMANT,
  MARKET_STATES.FRESH_DISCOVERY,
  MARKET_STATES.EARLY_LIQUIDITY_FORMATION,
  MARKET_STATES.NEW_NARRATIVE_IGNITION,
  MARKET_STATES.EARLY_ACCUMULATION,
  MARKET_STATES.SPOT_LED_EXPANSION,
  MARKET_STATES.LEVERAGE_LED_EXPANSION,
  MARKET_STATES.FUNDAMENTALLY_SUPPORTED_RERATING,
  MARKET_STATES.CROWDED_CONTINUATION,
  MARKET_STATES.REFLEXIVE_LATE_STAGE,
  MARKET_STATES.THIN_LIQUIDITY_RISK,
  MARKET_STATES.POST_EVENT_OVEREXTENSION,
  MARKET_STATES.DISTRIBUTION,
  MARKET_STATES.TREASURY_SELL_PRESSURE,
  MARKET_STATES.UNLOCK_OVERHANG,
  MARKET_STATES.STRUCTURALLY_WEAK_RALLY,
  MARKET_STATES.MANIPULATION_RISK,
]);

/** Human-readable labels for UI */
export const MARKET_STATE_LABELS: Record<MarketState, string> = {
  dormant: 'Dormant',
  fresh_discovery: 'Fresh Discovery',
  early_liquidity_formation: 'Early Liquidity Formation',
  new_narrative_ignition: 'New Narrative Ignition',
  early_accumulation: 'Early Accumulation',
  spot_led_expansion: 'Spot-Led Expansion',
  leverage_led_expansion: 'Leverage-Led Expansion',
  fundamentally_supported_rerating: 'Fundamentally Supported Rerating',
  crowded_continuation: 'Crowded Continuation',
  reflexive_late_stage: 'Reflexive Late Stage',
  thin_liquidity_risk: 'Thin Liquidity Risk',
  post_event_overextension: 'Post-Event Overextension',
  distribution: 'Distribution',
  treasury_sell_pressure: 'Treasury Sell Pressure',
  unlock_overhang: 'Unlock Overhang',
  structurally_weak_rally: 'Structurally Weak Rally',
  manipulation_risk: 'Manipulation / Low-Quality Risk',
};

/** Which state group each state belongs to */
export const MARKET_STATE_GROUPS: Record<MarketState, 'discovery' | 'expansion' | 'fragility' | 'risk'> = {
  dormant: 'discovery',
  fresh_discovery: 'discovery',
  early_liquidity_formation: 'discovery',
  new_narrative_ignition: 'discovery',
  early_accumulation: 'expansion',
  spot_led_expansion: 'expansion',
  leverage_led_expansion: 'expansion',
  fundamentally_supported_rerating: 'expansion',
  crowded_continuation: 'fragility',
  reflexive_late_stage: 'fragility',
  thin_liquidity_risk: 'fragility',
  post_event_overextension: 'fragility',
  distribution: 'risk',
  treasury_sell_pressure: 'risk',
  unlock_overhang: 'risk',
  structurally_weak_rally: 'risk',
  manipulation_risk: 'risk',
};

// ═══════════════════════════════════════════════════════════════════════════════
// CAUSAL FAMILIES
// ═══════════════════════════════════════════════════════════════════════════════

export const CAUSAL_FAMILIES = {
  LEVERAGE_EXPANSION: 'leverage_expansion',
  SPOT_DEMAND: 'spot_demand',
  SMART_MONEY_ACCUMULATION: 'smart_money_accumulation',
  NARRATIVE_ACCELERATION: 'narrative_acceleration',
  FUNDAMENTALS_IMPROVEMENT: 'fundamentals_improvement',
  LIQUIDITY_EMERGENCE: 'liquidity_emergence',
  SUPPLY_OVERHANG: 'supply_overhang',
  STRUCTURAL_FRAGILITY: 'structural_fragility',
  SECURITY_CONCERN: 'security_concern',
  DISTRIBUTION_PRESSURE: 'distribution_pressure',
} as const;

export type CausalFamily = (typeof CAUSAL_FAMILIES)[keyof typeof CAUSAL_FAMILIES];

export const CausalFamilySchema = z.enum([
  CAUSAL_FAMILIES.LEVERAGE_EXPANSION,
  CAUSAL_FAMILIES.SPOT_DEMAND,
  CAUSAL_FAMILIES.SMART_MONEY_ACCUMULATION,
  CAUSAL_FAMILIES.NARRATIVE_ACCELERATION,
  CAUSAL_FAMILIES.FUNDAMENTALS_IMPROVEMENT,
  CAUSAL_FAMILIES.LIQUIDITY_EMERGENCE,
  CAUSAL_FAMILIES.SUPPLY_OVERHANG,
  CAUSAL_FAMILIES.STRUCTURAL_FRAGILITY,
  CAUSAL_FAMILIES.SECURITY_CONCERN,
  CAUSAL_FAMILIES.DISTRIBUTION_PRESSURE,
]);

// ═══════════════════════════════════════════════════════════════════════════════
// HYPOTHESIS CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

export const HYPOTHESIS_CLASSES = {
  EARLY_ACCUMULATION: 'early_accumulation',
  FUNDAMENTALLY_SUPPORTED_RERATING: 'fundamentally_supported_rerating',
  LEVERAGE_DRIVEN_SQUEEZE: 'leverage_driven_squeeze',
  NARRATIVE_ONLY_PUMP: 'narrative_only_pump',
  LOW_QUALITY_MANIPULATED_LAUNCH: 'low_quality_manipulated_launch',
  POST_UNLOCK_SELL_PRESSURE: 'post_unlock_sell_pressure',
  DISTRIBUTION_UNDER_HYPE: 'distribution_under_hype',
  SECTOR_SPILLOVER_REPRICING: 'sector_spillover_repricing',
  CROWDED_CONTINUATION: 'crowded_continuation',
  GENUINE_BREAKOUT: 'genuine_breakout',
  CAPITULATION_RESET: 'capitulation_reset',
  FORCED_LIQUIDATION_CASCADE: 'forced_liquidation_cascade',
} as const;

export type HypothesisClass = (typeof HYPOTHESIS_CLASSES)[keyof typeof HYPOTHESIS_CLASSES];

export const HypothesisClassSchema = z.enum([
  HYPOTHESIS_CLASSES.EARLY_ACCUMULATION,
  HYPOTHESIS_CLASSES.FUNDAMENTALLY_SUPPORTED_RERATING,
  HYPOTHESIS_CLASSES.LEVERAGE_DRIVEN_SQUEEZE,
  HYPOTHESIS_CLASSES.NARRATIVE_ONLY_PUMP,
  HYPOTHESIS_CLASSES.LOW_QUALITY_MANIPULATED_LAUNCH,
  HYPOTHESIS_CLASSES.POST_UNLOCK_SELL_PRESSURE,
  HYPOTHESIS_CLASSES.DISTRIBUTION_UNDER_HYPE,
  HYPOTHESIS_CLASSES.SECTOR_SPILLOVER_REPRICING,
  HYPOTHESIS_CLASSES.CROWDED_CONTINUATION,
  HYPOTHESIS_CLASSES.GENUINE_BREAKOUT,
  HYPOTHESIS_CLASSES.CAPITULATION_RESET,
  HYPOTHESIS_CLASSES.FORCED_LIQUIDATION_CASCADE,
]);

export const HYPOTHESIS_LABELS: Record<HypothesisClass, string> = {
  early_accumulation: 'Early Accumulation',
  fundamentally_supported_rerating: 'Fundamentally Supported Rerating',
  leverage_driven_squeeze: 'Leverage-Driven Squeeze',
  narrative_only_pump: 'Narrative-Only Pump',
  low_quality_manipulated_launch: 'Low-Quality / Manipulated Launch',
  post_unlock_sell_pressure: 'Post-Unlock Sell Pressure',
  distribution_under_hype: 'Distribution Under Hype',
  sector_spillover_repricing: 'Sector Spillover Repricing',
  crowded_continuation: 'Crowded Continuation',
  genuine_breakout: 'Genuine Breakout',
  capitulation_reset: 'Capitulation Reset',
  forced_liquidation_cascade: 'Forced Liquidation Cascade',
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRADICTION CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

export const CONTRADICTION_CLASSES = {
  // Cross-layer
  PRICE_VS_FUNDAMENTALS: 'price_vs_fundamentals',
  SENTIMENT_VS_ONCHAIN: 'sentiment_vs_onchain',
  TVL_VS_INFLOWS: 'tvl_vs_inflows',
  LEVERAGE_VS_SPOT: 'leverage_vs_spot',

  // Timing
  NARRATIVE_BEFORE_FUNDAMENTALS: 'narrative_before_fundamentals',
  LATE_WHALE_ENTRY: 'late_whale_entry',

  // Structure
  VOLUME_VS_LIQUIDITY: 'volume_vs_liquidity',
  PRICE_VS_SPOT_STRUCTURE: 'price_vs_spot_structure',

  // Trust
  POSITIVE_SIGNALS_VS_SECURITY: 'positive_signals_vs_security',
  GROWTH_VS_UNLOCK: 'growth_vs_unlock',
} as const;

export type ContradictionClass = (typeof CONTRADICTION_CLASSES)[keyof typeof CONTRADICTION_CLASSES];

export const ContradictionClassSchema = z.enum([
  CONTRADICTION_CLASSES.PRICE_VS_FUNDAMENTALS,
  CONTRADICTION_CLASSES.SENTIMENT_VS_ONCHAIN,
  CONTRADICTION_CLASSES.TVL_VS_INFLOWS,
  CONTRADICTION_CLASSES.LEVERAGE_VS_SPOT,
  CONTRADICTION_CLASSES.NARRATIVE_BEFORE_FUNDAMENTALS,
  CONTRADICTION_CLASSES.LATE_WHALE_ENTRY,
  CONTRADICTION_CLASSES.VOLUME_VS_LIQUIDITY,
  CONTRADICTION_CLASSES.PRICE_VS_SPOT_STRUCTURE,
  CONTRADICTION_CLASSES.POSITIVE_SIGNALS_VS_SECURITY,
  CONTRADICTION_CLASSES.GROWTH_VS_UNLOCK,
]);

export const CONTRADICTION_LABELS: Record<ContradictionClass, string> = {
  price_vs_fundamentals: 'Price vs Fundamentals',
  sentiment_vs_onchain: 'Sentiment vs On-Chain',
  tvl_vs_inflows: 'TVL vs Real Inflows',
  leverage_vs_spot: 'Leverage vs Spot',
  narrative_before_fundamentals: 'Narrative Before Fundamentals',
  late_whale_entry: 'Late Whale Entry',
  volume_vs_liquidity: 'Volume vs Liquidity',
  price_vs_spot_structure: 'Price vs Spot Structure',
  positive_signals_vs_security: 'Positive Signals vs Security Risk',
  growth_vs_unlock: 'Growth vs Unlock Pressure',
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRADICTION SEVERITY
// ═══════════════════════════════════════════════════════════════════════════════

export const CONTRADICTION_SEVERITIES = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type ContradictionSeverity = (typeof CONTRADICTION_SEVERITIES)[keyof typeof CONTRADICTION_SEVERITIES];

export const ContradictionSeveritySchema = z.enum([
  CONTRADICTION_SEVERITIES.LOW,
  CONTRADICTION_SEVERITIES.MODERATE,
  CONTRADICTION_SEVERITIES.HIGH,
  CONTRADICTION_SEVERITIES.CRITICAL,
]);

// ═══════════════════════════════════════════════════════════════════════════════
// TIMING PHASES
// ═══════════════════════════════════════════════════════════════════════════════

export const TIMING_PHASES = {
  PRE_SIGNAL: 'pre_signal',
  EARLY: 'early',
  EARLY_VALIDATING: 'early_validating',
  EXPANSION: 'expansion',
  MATURE: 'mature',
  CROWDED: 'crowded',
  LATE_REFLEXIVE: 'late_reflexive',
  POST_PEAK: 'post_peak',
  DECAY_DISTRIBUTION: 'decay_distribution',
} as const;

export type TimingPhase = (typeof TIMING_PHASES)[keyof typeof TIMING_PHASES];

export const TimingPhaseSchema = z.enum([
  TIMING_PHASES.PRE_SIGNAL,
  TIMING_PHASES.EARLY,
  TIMING_PHASES.EARLY_VALIDATING,
  TIMING_PHASES.EXPANSION,
  TIMING_PHASES.MATURE,
  TIMING_PHASES.CROWDED,
  TIMING_PHASES.LATE_REFLEXIVE,
  TIMING_PHASES.POST_PEAK,
  TIMING_PHASES.DECAY_DISTRIBUTION,
]);

export const TIMING_LABELS: Record<TimingPhase, string> = {
  pre_signal: 'Pre-Signal',
  early: 'Early',
  early_validating: 'Early Validating',
  expansion: 'Expansion',
  mature: 'Mature',
  crowded: 'Crowded',
  late_reflexive: 'Late Reflexive',
  post_peak: 'Post Peak',
  decay_distribution: 'Decay / Distribution',
};

/** Numeric position for timing score derivation */
export const TIMING_POSITION: Record<TimingPhase, number> = {
  pre_signal: 1,
  early: 2,
  early_validating: 3,
  expansion: 4,
  mature: 5,
  crowded: 6,
  late_reflexive: 7,
  post_peak: 8,
  decay_distribution: 9,
};

export const TIMING_TOTAL_STEPS = 9;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE BANDS
// ═══════════════════════════════════════════════════════════════════════════════

export const CONFIDENCE_BANDS = {
  VERY_HIGH: 'very_high',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  VERY_LOW: 'very_low',
  UNRESOLVED: 'unresolved',
} as const;

export type ConfidenceBand = (typeof CONFIDENCE_BANDS)[keyof typeof CONFIDENCE_BANDS];

export const ConfidenceBandSchema = z.enum([
  CONFIDENCE_BANDS.VERY_HIGH,
  CONFIDENCE_BANDS.HIGH,
  CONFIDENCE_BANDS.MEDIUM,
  CONFIDENCE_BANDS.LOW,
  CONFIDENCE_BANDS.VERY_LOW,
  CONFIDENCE_BANDS.UNRESOLVED,
]);

/** Map numeric 0–1 to confidence band */
export function toConfidenceBand(score: number): ConfidenceBand {
  if (score >= 0.85) return CONFIDENCE_BANDS.VERY_HIGH;
  if (score >= 0.70) return CONFIDENCE_BANDS.HIGH;
  if (score >= 0.50) return CONFIDENCE_BANDS.MEDIUM;
  if (score >= 0.30) return CONFIDENCE_BANDS.LOW;
  if (score >= 0.15) return CONFIDENCE_BANDS.VERY_LOW;
  return CONFIDENCE_BANDS.UNRESOLVED;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE → CONCEPT MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps OmniScore / Evidence Pack feature keys to causal families.
 * Used by the Causal Attribution Engine.
 */
export const FEATURE_TO_CAUSAL_FAMILY: Record<string, CausalFamily> = {
  // Leverage expansion
  open_interest_usd: CAUSAL_FAMILIES.LEVERAGE_EXPANSION,
  open_interest_change_24h: CAUSAL_FAMILIES.LEVERAGE_EXPANSION,
  funding_rate: CAUSAL_FAMILIES.LEVERAGE_EXPANSION,
  funding_rate_annualized: CAUSAL_FAMILIES.LEVERAGE_EXPANSION,
  long_short_ratio: CAUSAL_FAMILIES.LEVERAGE_EXPANSION,
  liquidations_24h_usd: CAUSAL_FAMILIES.LEVERAGE_EXPANSION,

  // Spot demand
  volume_24h_usd: CAUSAL_FAMILIES.SPOT_DEMAND,
  volume_6h_usd: CAUSAL_FAMILIES.SPOT_DEMAND,
  volume_1h_usd: CAUSAL_FAMILIES.SPOT_DEMAND,
  price_change_24h: CAUSAL_FAMILIES.SPOT_DEMAND,
  price_change_1h: CAUSAL_FAMILIES.SPOT_DEMAND,
  txns_buys_24h: CAUSAL_FAMILIES.SPOT_DEMAND,
  txns_sells_24h: CAUSAL_FAMILIES.SPOT_DEMAND,

  // Smart money
  whale_inflow_24h: CAUSAL_FAMILIES.SMART_MONEY_ACCUMULATION,
  whale_outflow_24h: CAUSAL_FAMILIES.SMART_MONEY_ACCUMULATION,
  whale_net_flow_24h: CAUSAL_FAMILIES.SMART_MONEY_ACCUMULATION,
  large_transactions_24h: CAUSAL_FAMILIES.SMART_MONEY_ACCUMULATION,

  // Narrative
  sentiment_score: CAUSAL_FAMILIES.NARRATIVE_ACCELERATION,
  sentiment_change_24h: CAUSAL_FAMILIES.NARRATIVE_ACCELERATION,
  volume_mentions_24h: CAUSAL_FAMILIES.NARRATIVE_ACCELERATION,
  social_dominance: CAUSAL_FAMILIES.NARRATIVE_ACCELERATION,
  news_intensity: CAUSAL_FAMILIES.NARRATIVE_ACCELERATION,

  // Fundamentals
  tvl_usd: CAUSAL_FAMILIES.FUNDAMENTALS_IMPROVEMENT,
  protocol_fees_usd: CAUSAL_FAMILIES.FUNDAMENTALS_IMPROVEMENT,
  protocol_revenue_usd: CAUSAL_FAMILIES.FUNDAMENTALS_IMPROVEMENT,
  active_addresses_24h: CAUSAL_FAMILIES.FUNDAMENTALS_IMPROVEMENT,
  transaction_count_24h: CAUSAL_FAMILIES.FUNDAMENTALS_IMPROVEMENT,

  // Liquidity
  liquidity_usd: CAUSAL_FAMILIES.LIQUIDITY_EMERGENCE,
  pair_age_hours: CAUSAL_FAMILIES.LIQUIDITY_EMERGENCE,

  // Supply overhang
  unlock_next_usd: CAUSAL_FAMILIES.SUPPLY_OVERHANG,

  // Distribution
  exchange_inflow_24h: CAUSAL_FAMILIES.DISTRIBUTION_PRESSURE,
  exchange_outflow_24h: CAUSAL_FAMILIES.DISTRIBUTION_PRESSURE,
  exchange_net_flow_24h: CAUSAL_FAMILIES.DISTRIBUTION_PRESSURE,

  // Security
  risk_score: CAUSAL_FAMILIES.SECURITY_CONCERN,
  is_honeypot: CAUSAL_FAMILIES.SECURITY_CONCERN,
  top_10_percentage: CAUSAL_FAMILIES.SECURITY_CONCERN,
  concentration_risk: CAUSAL_FAMILIES.SECURITY_CONCERN,
};

/**
 * Maps features to which contradiction families they participate in.
 * Key is the contradiction class, value is { positive: features, negative: features }.
 */
export const CONTRADICTION_RULES: Record<ContradictionClass, {
  positive_features: string[];
  negative_features: string[];
  affects: string[];
}> = {
  price_vs_fundamentals: {
    positive_features: ['price_change_24h', 'price_change_1h'],
    negative_features: ['tvl_usd', 'protocol_fees_usd', 'protocol_revenue_usd', 'active_addresses_24h'],
    affects: ['confidence', 'thesis_coherence'],
  },
  sentiment_vs_onchain: {
    positive_features: ['sentiment_score', 'volume_mentions_24h', 'social_dominance'],
    negative_features: ['whale_net_flow_24h', 'exchange_inflow_24h'],
    affects: ['confidence', 'opportunity'],
  },
  tvl_vs_inflows: {
    positive_features: ['tvl_usd'],
    negative_features: ['protocol_fees_usd', 'protocol_revenue_usd'],
    affects: ['quality', 'thesis_coherence'],
  },
  leverage_vs_spot: {
    positive_features: ['open_interest_usd', 'open_interest_change_24h', 'funding_rate'],
    negative_features: ['volume_24h_usd', 'txns_buys_24h'],
    affects: ['risk', 'confidence', 'timing'],
  },
  narrative_before_fundamentals: {
    positive_features: ['sentiment_score', 'volume_mentions_24h', 'news_intensity'],
    negative_features: ['tvl_usd', 'protocol_fees_usd', 'active_addresses_24h'],
    affects: ['timing', 'thesis_coherence'],
  },
  late_whale_entry: {
    positive_features: ['whale_net_flow_24h', 'large_transactions_24h'],
    negative_features: ['price_change_24h', 'open_interest_change_24h'],
    affects: ['timing', 'risk'],
  },
  volume_vs_liquidity: {
    positive_features: ['volume_24h_usd'],
    negative_features: ['liquidity_usd'],
    affects: ['risk', 'confidence'],
  },
  price_vs_spot_structure: {
    positive_features: ['price_change_24h'],
    negative_features: ['volume_24h_usd', 'txns_buys_24h', 'liquidity_usd'],
    affects: ['risk', 'confidence'],
  },
  positive_signals_vs_security: {
    positive_features: ['price_change_24h', 'volume_24h_usd', 'sentiment_score'],
    negative_features: ['risk_score', 'is_honeypot', 'concentration_risk', 'top_10_percentage'],
    affects: ['risk', 'confidence', 'legitimacy'],
  },
  growth_vs_unlock: {
    positive_features: ['price_change_24h', 'tvl_usd', 'protocol_fees_usd'],
    negative_features: ['unlock_next_usd'],
    affects: ['risk', 'timing'],
  },
};
