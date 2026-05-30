/**
 * P3-BTAR-003 — Synthetic Episode Corpus
 *
 * 18 deterministic synthetic crypto market episodes (within the 15–25 band)
 * covering required episode families FAM-001..FAM-018. Each episode carries a
 * full `ExpectedJudgmentOracle` (authored ground truth — never AI-generated).
 *
 * No real APIs. No provider keys. No live data. No `Date.now()`. No random
 * values. No environment variable reads. No network calls.
 *
 * Authority:
 *   - Plan 3.0 §1, §6, §7, §8, §9 (BTAR sequence — third entry), §12 (no-API rule)
 *   - P3-BTAR-003 §6 (required families), §7 (canonical IDs), §8 (oracle requirements),
 *     §9 (confidence calibration), §10 (timing calibration), §11 (tags), §12 (runner compatibility)
 *
 * Owner: Phase 3 (P3-BTAR-003).
 */

import type {
  SyntheticEpisodeInput,
  SyntheticMarketRegime,
} from './synthetic-episode.types';

// -----------------------------------------------------------------------------
// SYN-001 — FAM-001 — Clean accumulation
//
// Same ID as the P3-BTAR-001 starter (SYN-001-clean-accumulation), but defined
// fresh here so the corpus can carry the family:FAM-001 tag and ≥2 required
// contradictions that the P3-BTAR-003 oracle-quality bar (Class C) requires.
// The starter file is intentionally left untouched (its own regression tests
// stay green); both definitions describe the same scenario.
// -----------------------------------------------------------------------------

const SYN_001: SyntheticEpisodeInput = {
  episode_id: 'SYN-001-clean-accumulation',
  title: 'Clean spot-led early accumulation',
  description:
    'Price is ranging upward with improving spot demand, neutral funding, accumulating whales, and not-yet-euphoric sentiment. Liquidity is moderate to deep and risk is low. Coinet should identify constructive early strength without overclaiming a confirmed breakout.',
  asset_symbol: 'SYN-A',
  market_regime: 'EARLY_ACCUMULATION',
  signals: {
    spot: {
      price_structure: 'ACCUMULATION',
      spot_volume_direction: 'UP',
      spot_demand_quality: 'CLEAN',
      buy_pressure_quality: 'CLEAN',
    },
    derivatives: {
      funding_level: 'NEUTRAL',
      open_interest_change: 'FLAT',
      leverage_direction: 'FLAT',
      liquidation_risk: 'LOW',
    },
    onchain: {
      wallet_activity: 'UP',
      holder_behavior: 'ACCUMULATING',
      whale_behavior: 'ACCUMULATING',
      exchange_flows: 'NET_OUTFLOW',
      network_activity: 'UP',
    },
    sentiment: {
      social_attention: 'FLAT',
      narrative_strength: 'MIXED',
      euphoria_risk: 'LOW',
      attention_quality: 'MIXED',
    },
    fundamentals: {
      tvl_direction: 'UP',
      revenue_or_fee_direction: 'UP',
      protocol_usage: 'UP',
      unlock_or_emission_pressure: 'LOW',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'LOW',
      unlock_risk: 'LOW',
      contradiction_severity: 'LOW',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'LOW',
      support_quality: 'CLEAN',
      resistance_quality: 'MIXED',
    },
    event_context: { event_type: 'NONE', proximity: 'NONE', expected_market_impact: 'LOW' },
  },
  blind_spots: ['no confirmed breakout candle yet'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'early accumulation',
    expected_cause_family: 'spot-led accumulation',
    expected_thesis_direction: 'constructive but not yet confirmed breakout',
    required_contradictions: [
      'sentiment has not yet confirmed the move',
      'price has not yet confirmed a clean breakout candle',
    ],
    expected_timing_phase: 'EARLY',
    expected_scenario_type: 'continuation if spot demand persists',
    expected_confidence_band: 'MEDIUM',
    forbidden_claims: [
      'confirmed breakout',
      'guaranteed continuation',
      'must buy now',
    ],
    required_reasoning_notes: [
      'spot demand is leading, not derivatives',
      'absence of euphoria supports the early-stage interpretation',
    ],
  },
  tags: [
    'family:FAM-001',
    'regime:EARLY_ACCUMULATION',
    'risk:low',
    'confidence:medium',
    'timing:early',
    'accumulation',
    'spot-led',
    'clean',
  ],
};

// -----------------------------------------------------------------------------
// SYN-002 — FAM-002 — Early accumulation with weak sentiment
// -----------------------------------------------------------------------------

const SYN_002: SyntheticEpisodeInput = {
  episode_id: 'SYN-002-early-accumulation-weak-sentiment',
  title: 'Early accumulation with weak sentiment',
  description:
    'Spot demand is improving and whales are quietly accumulating, but social attention is muted and narrative strength is weak. Coinet should identify constructive early structure while disclosing that the sentiment side has not yet confirmed.',
  asset_symbol: 'SYN-AA',
  market_regime: 'EARLY_ACCUMULATION',
  signals: {
    spot: {
      price_structure: 'ACCUMULATION',
      spot_volume_direction: 'UP',
      spot_demand_quality: 'CLEAN',
      buy_pressure_quality: 'MIXED',
    },
    derivatives: {
      funding_level: 'NEUTRAL',
      open_interest_change: 'FLAT',
      leverage_direction: 'FLAT',
      liquidation_risk: 'LOW',
    },
    onchain: {
      wallet_activity: 'UP',
      holder_behavior: 'ACCUMULATING',
      whale_behavior: 'ACCUMULATING',
      exchange_flows: 'NET_OUTFLOW',
      network_activity: 'FLAT',
    },
    sentiment: {
      social_attention: 'DOWN',
      narrative_strength: 'WEAK',
      euphoria_risk: 'LOW',
      attention_quality: 'WEAK',
    },
    fundamentals: {
      tvl_direction: 'UP',
      revenue_or_fee_direction: 'FLAT',
      protocol_usage: 'UP',
      unlock_or_emission_pressure: 'LOW',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'LOW',
      unlock_risk: 'LOW',
      contradiction_severity: 'LOW',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'LOW',
      support_quality: 'CLEAN',
      resistance_quality: 'MIXED',
    },
    event_context: { event_type: 'NONE', proximity: 'NONE', expected_market_impact: 'LOW' },
  },
  blind_spots: ['narrative not yet measurable'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'early accumulation with sentiment lag',
    expected_cause_family: 'spot-led quiet accumulation',
    expected_thesis_direction: 'constructive but unconfirmed by sentiment',
    required_contradictions: [
      'spot demand improving but sentiment weak',
      'whale accumulation without social confirmation',
    ],
    expected_timing_phase: 'EARLY',
    expected_scenario_type: 'continuation if sentiment eventually confirms',
    expected_confidence_band: 'MEDIUM',
    forbidden_claims: [
      'guaranteed continuation',
      'must buy now',
      'confirmed breakout',
    ],
    required_reasoning_notes: [
      'absence of social confirmation caps confidence',
      'spot and on-chain are leading; sentiment is lagging',
    ],
  },
  tags: [
    'family:FAM-002',
    'regime:EARLY_ACCUMULATION',
    'risk:low',
    'confidence:medium',
    'timing:early',
    'accumulation',
    'whales',
  ],
};

// -----------------------------------------------------------------------------
// SYN-003 — FAM-003 — Leverage-driven fake strength
// -----------------------------------------------------------------------------

const SYN_003: SyntheticEpisodeInput = {
  episode_id: 'SYN-003-leverage-driven-fake-strength',
  title: 'Leverage-driven fake strength',
  description:
    'Price is climbing while spot demand is mixed/weak, funding is overheated, open interest is expanding strongly, and liquidity is thin. Coinet must avoid treating leverage-driven strength as clean accumulation and must cap confidence accordingly.',
  asset_symbol: 'SYN-AB',
  market_regime: 'LEVERAGE_FRAGILITY',
  signals: {
    spot: {
      price_structure: 'BREAKOUT',
      spot_volume_direction: 'FLAT',
      spot_demand_quality: 'MIXED',
      buy_pressure_quality: 'WEAK',
    },
    derivatives: {
      funding_level: 'OVERHEATED',
      open_interest_change: 'STRONGLY_UP',
      leverage_direction: 'STRONGLY_UP',
      liquidation_risk: 'HIGH',
    },
    onchain: {
      wallet_activity: 'FLAT',
      holder_behavior: 'STABLE',
      whale_behavior: 'MIXED',
      exchange_flows: 'NET_INFLOW',
      network_activity: 'FLAT',
    },
    sentiment: {
      social_attention: 'STRONGLY_UP',
      narrative_strength: 'FRAGILE',
      euphoria_risk: 'HIGH',
      attention_quality: 'FRAGILE',
    },
    fundamentals: {
      tvl_direction: 'FLAT',
      revenue_or_fee_direction: 'FLAT',
      protocol_usage: 'FLAT',
      unlock_or_emission_pressure: 'MEDIUM',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'HIGH',
      unlock_risk: 'MEDIUM',
      contradiction_severity: 'HIGH',
    },
    liquidity: {
      liquidity_depth: 'THIN',
      slippage_risk: 'HIGH',
      support_quality: 'FRAGILE',
      resistance_quality: 'MIXED',
    },
    event_context: { event_type: 'NARRATIVE_CATALYST', proximity: 'NEAR', expected_market_impact: 'MEDIUM' },
  },
  blind_spots: ['no measurable spot cohort rotation visible yet'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'fragile leverage-driven expansion',
    expected_cause_family: 'leverage-assisted move',
    expected_thesis_direction: 'fragile upside vulnerable to leverage reset',
    required_contradictions: [
      'derivatives outpacing spot confirmation',
      'euphoric sentiment without spot demand support',
    ],
    expected_timing_phase: 'LATE',
    expected_scenario_type: 'sharp unwind risk if leverage resets',
    expected_confidence_band: 'LOW',
    forbidden_claims: [
      'clean accumulation',
      'guaranteed continuation',
      'safe entry',
    ],
    required_reasoning_notes: [
      'spot demand is not confirming the move',
      'overheated funding plus thin liquidity raises liquidation risk',
      'confidence must be capped because the move is leverage-driven',
    ],
  },
  tags: [
    'family:FAM-003',
    'regime:LEVERAGE_FRAGILITY',
    'risk:high',
    'confidence:low',
    'timing:late',
    'leverage',
    'derivatives',
  ],
};

// -----------------------------------------------------------------------------
// SYN-004 — FAM-004 — Spot-led healthy expansion
// -----------------------------------------------------------------------------

const SYN_004: SyntheticEpisodeInput = {
  episode_id: 'SYN-004-spot-led-healthy-expansion',
  title: 'Spot-led healthy expansion',
  description:
    'Spot demand is strong, on-chain holder behavior is accumulating, fundamentals are improving, derivatives are not overheated, and liquidity is deep. This is the cleanest constructive setup the corpus encodes, but confidence is capped below VERY_HIGH because crypto judgment should almost never be absolute.',
  asset_symbol: 'SYN-AC',
  market_regime: 'RISK_ON_EXPANSION',
  signals: {
    spot: {
      price_structure: 'BREAKOUT',
      spot_volume_direction: 'STRONGLY_UP',
      spot_demand_quality: 'CLEAN',
      buy_pressure_quality: 'CLEAN',
    },
    derivatives: {
      funding_level: 'NEUTRAL',
      open_interest_change: 'UP',
      leverage_direction: 'FLAT',
      liquidation_risk: 'LOW',
    },
    onchain: {
      wallet_activity: 'UP',
      holder_behavior: 'ACCUMULATING',
      whale_behavior: 'ACCUMULATING',
      exchange_flows: 'NET_OUTFLOW',
      network_activity: 'UP',
    },
    sentiment: {
      social_attention: 'UP',
      narrative_strength: 'CLEAN',
      euphoria_risk: 'LOW',
      attention_quality: 'CLEAN',
    },
    fundamentals: {
      tvl_direction: 'UP',
      revenue_or_fee_direction: 'UP',
      protocol_usage: 'UP',
      unlock_or_emission_pressure: 'LOW',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'LOW',
      unlock_risk: 'LOW',
      contradiction_severity: 'LOW',
    },
    liquidity: {
      liquidity_depth: 'DEEP',
      slippage_risk: 'LOW',
      support_quality: 'CLEAN',
      resistance_quality: 'CLEAN',
    },
    event_context: { event_type: 'NONE', proximity: 'NONE', expected_market_impact: 'LOW' },
  },
  blind_spots: ['macro regime can still shift unfavorably'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'healthy spot-led expansion',
    expected_cause_family: 'spot-led demand expansion',
    expected_thesis_direction: 'constructive expansion with multi-signal alignment',
    required_contradictions: [
      'sentiment euphoria risk still bounded but should be monitored',
      'no thesis is risk-free in crypto regardless of alignment',
    ],
    expected_timing_phase: 'MID',
    expected_scenario_type: 'continuation if spot demand persists and derivatives stay calm',
    expected_confidence_band: 'HIGH',
    forbidden_claims: [
      'guaranteed continuation',
      'risk-free entry',
      'must buy now',
    ],
    required_reasoning_notes: [
      'spot demand is leading, derivatives are calm, on-chain confirms',
      'confidence is HIGH but not VERY_HIGH because crypto regimes can still flip',
    ],
  },
  tags: [
    'family:FAM-004',
    'regime:RISK_ON_EXPANSION',
    'risk:low',
    'confidence:high',
    'timing:mid',
    'fundamentals',
  ],
};

// -----------------------------------------------------------------------------
// SYN-005 — FAM-005 — Late euphoric momentum
// -----------------------------------------------------------------------------

const SYN_005: SyntheticEpisodeInput = {
  episode_id: 'SYN-005-late-euphoric-momentum',
  title: 'Late euphoric momentum',
  description:
    'Price has run far, sentiment is euphoric, derivatives are overheated, and on-chain holder behavior shows distribution into the strength. Coinet should identify late-stage exhaustion risk and refuse to frame the move as fresh.',
  asset_symbol: 'SYN-AD',
  market_regime: 'LATE_DISTRIBUTION',
  signals: {
    spot: {
      price_structure: 'DISTRIBUTION',
      spot_volume_direction: 'UP',
      spot_demand_quality: 'MIXED',
      buy_pressure_quality: 'WEAK',
    },
    derivatives: {
      funding_level: 'OVERHEATED',
      open_interest_change: 'UP',
      leverage_direction: 'UP',
      liquidation_risk: 'HIGH',
    },
    onchain: {
      wallet_activity: 'UP',
      holder_behavior: 'DISTRIBUTING',
      whale_behavior: 'DISTRIBUTING',
      exchange_flows: 'NET_INFLOW',
      network_activity: 'UP',
    },
    sentiment: {
      social_attention: 'STRONGLY_UP',
      narrative_strength: 'FRAGILE',
      euphoria_risk: 'EXTREME',
      attention_quality: 'FRAGILE',
    },
    fundamentals: {
      tvl_direction: 'FLAT',
      revenue_or_fee_direction: 'FLAT',
      protocol_usage: 'FLAT',
      unlock_or_emission_pressure: 'MEDIUM',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'MEDIUM',
      unlock_risk: 'MEDIUM',
      contradiction_severity: 'HIGH',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'MEDIUM',
      support_quality: 'FRAGILE',
      resistance_quality: 'MIXED',
    },
    event_context: { event_type: 'NARRATIVE_CATALYST', proximity: 'IMMEDIATE', expected_market_impact: 'MEDIUM' },
  },
  blind_spots: ['no public catalyst expected near-term'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'late euphoric momentum with distribution',
    expected_cause_family: 'late-stage attention-driven momentum',
    expected_thesis_direction: 'exhaustion risk into euphoria',
    required_contradictions: [
      'euphoric sentiment alongside visible holder distribution',
      'rising price masked by deteriorating buy-pressure quality',
    ],
    expected_timing_phase: 'EXHAUSTED',
    expected_scenario_type: 'mean reversion if euphoria fades or leverage unwinds',
    expected_confidence_band: 'LOW',
    forbidden_claims: [
      'fresh breakout',
      'guaranteed continuation',
      'must buy now',
    ],
    required_reasoning_notes: [
      'extreme euphoria typically marks late-stage moves',
      'visible distribution undermines the bullish narrative',
    ],
  },
  tags: [
    'family:FAM-005',
    'regime:LATE_DISTRIBUTION',
    'risk:high',
    'confidence:low',
    'timing:exhausted',
    'sentiment',
    'leverage',
  ],
};

// -----------------------------------------------------------------------------
// SYN-006 — FAM-006 — Unlock-risk distribution
// -----------------------------------------------------------------------------

const SYN_006: SyntheticEpisodeInput = {
  episode_id: 'SYN-006-unlock-risk-distribution',
  title: 'Distribution into a near unlock event',
  description:
    'Price is drifting up while whales distribute into a near token unlock. Funding is elevated, exchange inflows rise, and protocol revenue is declining. Coinet should emphasize the unlock event rather than the surface price action.',
  asset_symbol: 'SYN-AE',
  market_regime: 'LATE_DISTRIBUTION',
  signals: {
    spot: {
      price_structure: 'DISTRIBUTION',
      spot_volume_direction: 'UP',
      spot_demand_quality: 'FRAGILE',
      buy_pressure_quality: 'WEAK',
    },
    derivatives: {
      funding_level: 'ELEVATED',
      open_interest_change: 'UP',
      leverage_direction: 'UP',
      liquidation_risk: 'MEDIUM',
    },
    onchain: {
      wallet_activity: 'UP',
      holder_behavior: 'DISTRIBUTING',
      whale_behavior: 'DISTRIBUTING',
      exchange_flows: 'NET_INFLOW',
      network_activity: 'FLAT',
    },
    sentiment: {
      social_attention: 'UP',
      narrative_strength: 'MIXED',
      euphoria_risk: 'MEDIUM',
      attention_quality: 'MIXED',
    },
    fundamentals: {
      tvl_direction: 'DOWN',
      revenue_or_fee_direction: 'DOWN',
      protocol_usage: 'FLAT',
      unlock_or_emission_pressure: 'HIGH',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'MEDIUM',
      unlock_risk: 'HIGH',
      contradiction_severity: 'HIGH',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'MEDIUM',
      support_quality: 'FRAGILE',
      resistance_quality: 'CLEAN',
    },
    event_context: { event_type: 'UNLOCK', proximity: 'NEAR', expected_market_impact: 'HIGH' },
  },
  blind_spots: ['no public confirmation of OTC sales'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'late distribution into unlock',
    expected_cause_family: 'pre-unlock supply rotation',
    expected_thesis_direction: 'distribution into supply event',
    required_contradictions: [
      'rising price masked by visible distribution',
      'declining revenue against rising attention',
    ],
    expected_timing_phase: 'LATE',
    expected_scenario_type: 'unlock-driven mean reversion risk',
    expected_confidence_band: 'MEDIUM',
    forbidden_claims: [
      'constructive accumulation',
      'safe to buy into the unlock',
      'guaranteed continuation',
    ],
    required_reasoning_notes: [
      'whale distribution coincides with the unlock proximity',
      'protocol revenue declining undermines a fundamentals-led thesis',
    ],
  },
  tags: [
    'family:FAM-006',
    'regime:LATE_DISTRIBUTION',
    'risk:high',
    'confidence:medium',
    'timing:late',
    'unlock',
    'whales',
  ],
};

// -----------------------------------------------------------------------------
// SYN-007 — FAM-007 — Fundamentals improving but timing late
// -----------------------------------------------------------------------------

const SYN_007: SyntheticEpisodeInput = {
  episode_id: 'SYN-007-fundamentals-improve-late-timing',
  title: 'Fundamentals improving but timing late',
  description:
    'Protocol revenue and TVL improve cleanly, but price has already had a long run, derivatives are stretched, and sentiment is crowded. Coinet should acknowledge improving fundamentals while flagging that the entry timing is late.',
  asset_symbol: 'SYN-AF',
  market_regime: 'LATE_DISTRIBUTION',
  signals: {
    spot: {
      price_structure: 'DISTRIBUTION',
      spot_volume_direction: 'UP',
      spot_demand_quality: 'MIXED',
      buy_pressure_quality: 'MIXED',
    },
    derivatives: {
      funding_level: 'ELEVATED',
      open_interest_change: 'UP',
      leverage_direction: 'UP',
      liquidation_risk: 'MEDIUM',
    },
    onchain: {
      wallet_activity: 'UP',
      holder_behavior: 'STABLE',
      whale_behavior: 'MIXED',
      exchange_flows: 'BALANCED',
      network_activity: 'UP',
    },
    sentiment: {
      social_attention: 'STRONGLY_UP',
      narrative_strength: 'CLEAN',
      euphoria_risk: 'HIGH',
      attention_quality: 'MIXED',
    },
    fundamentals: {
      tvl_direction: 'STRONGLY_UP',
      revenue_or_fee_direction: 'STRONGLY_UP',
      protocol_usage: 'UP',
      unlock_or_emission_pressure: 'LOW',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'MEDIUM',
      unlock_risk: 'LOW',
      contradiction_severity: 'MEDIUM',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'MEDIUM',
      support_quality: 'MIXED',
      resistance_quality: 'MIXED',
    },
    event_context: { event_type: 'NONE', proximity: 'NONE', expected_market_impact: 'LOW' },
  },
  blind_spots: ['no measurable cohort rotation visible yet'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'fundamentally improving but late entry',
    expected_cause_family: 'fundamentals-led but already crowded',
    expected_thesis_direction: 'constructive thesis with late entry risk',
    required_contradictions: [
      'improving fundamentals but already crowded positioning',
      'rising revenue alongside elevated derivatives pressure',
    ],
    expected_timing_phase: 'LATE',
    expected_scenario_type: 'continuation possible but pullback entries safer',
    expected_confidence_band: 'MEDIUM',
    forbidden_claims: [
      'guaranteed continuation',
      'must buy now',
      'risk-free entry',
    ],
    required_reasoning_notes: [
      'fundamentals support a constructive view',
      'price has already discounted much of the improvement',
    ],
  },
  tags: [
    'family:FAM-007',
    'regime:LATE_DISTRIBUTION',
    'risk:medium',
    'confidence:medium',
    'timing:late',
    'fundamentals',
  ],
};

// -----------------------------------------------------------------------------
// SYN-008 — FAM-008 — Whale accumulation with flat price
// -----------------------------------------------------------------------------

const SYN_008: SyntheticEpisodeInput = {
  episode_id: 'SYN-008-whale-accumulation-flat-price',
  title: 'Whale accumulation with flat price',
  description:
    'Whales are visibly accumulating and exchange outflows are rising, but price is flat and sentiment is muted. Coinet should identify pre-confirmation accumulation rather than a confirmed trend.',
  asset_symbol: 'SYN-AG',
  market_regime: 'RANGE_COMPRESSION',
  signals: {
    spot: {
      price_structure: 'RANGE',
      spot_volume_direction: 'FLAT',
      spot_demand_quality: 'MIXED',
      buy_pressure_quality: 'MIXED',
    },
    derivatives: {
      funding_level: 'NEUTRAL',
      open_interest_change: 'FLAT',
      leverage_direction: 'FLAT',
      liquidation_risk: 'LOW',
    },
    onchain: {
      wallet_activity: 'UP',
      holder_behavior: 'ACCUMULATING',
      whale_behavior: 'ACCUMULATING',
      exchange_flows: 'NET_OUTFLOW',
      network_activity: 'FLAT',
    },
    sentiment: {
      social_attention: 'FLAT',
      narrative_strength: 'WEAK',
      euphoria_risk: 'LOW',
      attention_quality: 'WEAK',
    },
    fundamentals: {
      tvl_direction: 'FLAT',
      revenue_or_fee_direction: 'FLAT',
      protocol_usage: 'FLAT',
      unlock_or_emission_pressure: 'LOW',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'LOW',
      unlock_risk: 'LOW',
      contradiction_severity: 'LOW',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'LOW',
      support_quality: 'CLEAN',
      resistance_quality: 'MIXED',
    },
    event_context: { event_type: 'NONE', proximity: 'NONE', expected_market_impact: 'LOW' },
  },
  blind_spots: ['no near-term catalyst identified'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'pre-confirmation whale accumulation',
    expected_cause_family: 'whale-led quiet accumulation',
    expected_thesis_direction: 'constructive but unconfirmed by price',
    required_contradictions: [
      'whales accumulating while price is flat',
      'sentiment muted despite on-chain positioning',
    ],
    expected_timing_phase: 'EARLY',
    expected_scenario_type: 'breakout potential if a catalyst arrives',
    expected_confidence_band: 'MEDIUM',
    forbidden_claims: [
      'confirmed breakout',
      'guaranteed continuation',
      'must buy now',
    ],
    required_reasoning_notes: [
      'price has not confirmed the accumulation pattern',
      'whale positioning alone is not a confirmation signal',
    ],
  },
  tags: [
    'family:FAM-008',
    'regime:RANGE_COMPRESSION',
    'risk:low',
    'confidence:medium',
    'timing:early',
    'whales',
  ],
};

// -----------------------------------------------------------------------------
// SYN-009 — FAM-009 — Price pump with weak on-chain quality
// -----------------------------------------------------------------------------

const SYN_009: SyntheticEpisodeInput = {
  episode_id: 'SYN-009-price-pump-weak-onchain',
  title: 'Price pump with weak on-chain quality',
  description:
    'Price is climbing aggressively while on-chain holder behavior shows rotation rather than accumulation, network activity is flat, and exchange inflows are rising. Coinet should refuse to treat the pump as substance-backed.',
  asset_symbol: 'SYN-AH',
  market_regime: 'MIXED_CONTRADICTION',
  signals: {
    spot: {
      price_structure: 'BREAKOUT',
      spot_volume_direction: 'UP',
      spot_demand_quality: 'MIXED',
      buy_pressure_quality: 'WEAK',
    },
    derivatives: {
      funding_level: 'ELEVATED',
      open_interest_change: 'UP',
      leverage_direction: 'UP',
      liquidation_risk: 'MEDIUM',
    },
    onchain: {
      wallet_activity: 'FLAT',
      holder_behavior: 'ROTATING',
      whale_behavior: 'MIXED',
      exchange_flows: 'NET_INFLOW',
      network_activity: 'FLAT',
    },
    sentiment: {
      social_attention: 'UP',
      narrative_strength: 'FRAGILE',
      euphoria_risk: 'MEDIUM',
      attention_quality: 'FRAGILE',
    },
    fundamentals: {
      tvl_direction: 'FLAT',
      revenue_or_fee_direction: 'FLAT',
      protocol_usage: 'FLAT',
      unlock_or_emission_pressure: 'MEDIUM',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'MEDIUM',
      unlock_risk: 'MEDIUM',
      contradiction_severity: 'HIGH',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'MEDIUM',
      support_quality: 'FRAGILE',
      resistance_quality: 'MIXED',
    },
    event_context: { event_type: 'NONE', proximity: 'NONE', expected_market_impact: 'LOW' },
  },
  blind_spots: ['attribution of buyers difficult without OTC data'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'price pump without on-chain confirmation',
    expected_cause_family: 'speculative pump',
    expected_thesis_direction: 'fragile move without on-chain substance',
    required_contradictions: [
      'rising price with weak on-chain participation',
      'inflows rising while holder behavior rotates',
    ],
    expected_timing_phase: 'MID',
    expected_scenario_type: 'reversion risk if buyers exhaust',
    expected_confidence_band: 'LOW',
    forbidden_claims: [
      'fundamental rerating',
      'guaranteed continuation',
      'safe to chase',
    ],
    required_reasoning_notes: [
      'on-chain rotation is not accumulation',
      'speculative pumps require confirmation from network activity',
    ],
  },
  tags: [
    'family:FAM-009',
    'regime:MIXED_CONTRADICTION',
    'risk:medium',
    'confidence:low',
    'timing:mid',
  ],
};

// -----------------------------------------------------------------------------
// SYN-010 — FAM-010 — Sentiment-only pump
// -----------------------------------------------------------------------------

const SYN_010: SyntheticEpisodeInput = {
  episode_id: 'SYN-010-sentiment-only-pump',
  title: 'Sentiment-only pump, no spot or fundamentals',
  description:
    'Sentiment spikes strongly upward on a narrative catalyst, but spot volume is flat, fundamentals are unchanged, and on-chain participation is muted. Coinet should avoid treating sentiment as substance and produce a low-confidence read with an explicit non-confirmation note.',
  asset_symbol: 'SYN-AI',
  market_regime: 'RISK_ON_EXPANSION',
  signals: {
    spot: {
      price_structure: 'RANGE',
      spot_volume_direction: 'FLAT',
      spot_demand_quality: 'WEAK',
      buy_pressure_quality: 'WEAK',
    },
    derivatives: {
      funding_level: 'ELEVATED',
      open_interest_change: 'UP',
      leverage_direction: 'UP',
      liquidation_risk: 'MEDIUM',
    },
    onchain: {
      wallet_activity: 'FLAT',
      holder_behavior: 'STABLE',
      whale_behavior: 'INACTIVE',
      exchange_flows: 'BALANCED',
      network_activity: 'FLAT',
    },
    sentiment: {
      social_attention: 'STRONGLY_UP',
      narrative_strength: 'FRAGILE',
      euphoria_risk: 'HIGH',
      attention_quality: 'FRAGILE',
    },
    fundamentals: {
      tvl_direction: 'FLAT',
      revenue_or_fee_direction: 'FLAT',
      protocol_usage: 'FLAT',
      unlock_or_emission_pressure: 'LOW',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'MEDIUM',
      unlock_risk: 'LOW',
      contradiction_severity: 'HIGH',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'MEDIUM',
      support_quality: 'MIXED',
      resistance_quality: 'MIXED',
    },
    event_context: { event_type: 'NARRATIVE_CATALYST', proximity: 'IMMEDIATE', expected_market_impact: 'MEDIUM' },
  },
  blind_spots: ['narrative durability not yet measurable'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'sentiment-only pump',
    expected_cause_family: 'narrative-driven attention spike',
    expected_thesis_direction: 'unconfirmed narrative-led move without substance',
    required_contradictions: [
      'sentiment spike without spot volume confirmation',
      'rising attention without fundamentals change',
    ],
    expected_timing_phase: 'EARLY',
    expected_scenario_type: 'mean reversion risk if narrative fades',
    expected_confidence_band: 'LOW',
    forbidden_claims: [
      'confirmed trend',
      'fundamental rerating',
      'safe to chase',
    ],
    required_reasoning_notes: [
      'sentiment is not substance',
      'spot and fundamentals must confirm before raising confidence',
    ],
  },
  tags: [
    'family:FAM-010',
    'regime:RISK_ON_EXPANSION',
    'risk:medium',
    'confidence:low',
    'timing:early',
    'sentiment',
    'narrative',
  ],
};

// -----------------------------------------------------------------------------
// SYN-011 — FAM-011 — Derivatives squeeze risk
// -----------------------------------------------------------------------------

const SYN_011: SyntheticEpisodeInput = {
  episode_id: 'SYN-011-derivatives-squeeze-risk',
  title: 'Derivatives squeeze risk',
  description:
    'Funding is strongly negative, open interest has expanded, and liquidation risk is high in the short direction. Coinet should identify a short-squeeze setup but cap confidence because squeezes are inherently violent and unpredictable in magnitude.',
  asset_symbol: 'SYN-AJ',
  market_regime: 'LEVERAGE_FRAGILITY',
  signals: {
    spot: {
      price_structure: 'RANGE',
      spot_volume_direction: 'FLAT',
      spot_demand_quality: 'MIXED',
      buy_pressure_quality: 'MIXED',
    },
    derivatives: {
      funding_level: 'NEGATIVE',
      open_interest_change: 'STRONGLY_UP',
      leverage_direction: 'STRONGLY_DOWN',
      liquidation_risk: 'HIGH',
    },
    onchain: {
      wallet_activity: 'FLAT',
      holder_behavior: 'STABLE',
      whale_behavior: 'MIXED',
      exchange_flows: 'BALANCED',
      network_activity: 'FLAT',
    },
    sentiment: {
      social_attention: 'DOWN',
      narrative_strength: 'WEAK',
      euphoria_risk: 'LOW',
      attention_quality: 'MIXED',
    },
    fundamentals: {
      tvl_direction: 'FLAT',
      revenue_or_fee_direction: 'FLAT',
      protocol_usage: 'FLAT',
      unlock_or_emission_pressure: 'LOW',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'MEDIUM',
      unlock_risk: 'LOW',
      contradiction_severity: 'HIGH',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'MEDIUM',
      support_quality: 'MIXED',
      resistance_quality: 'FRAGILE',
    },
    event_context: { event_type: 'NONE', proximity: 'NONE', expected_market_impact: 'MEDIUM' },
  },
  blind_spots: ['squeeze magnitude is not predictable from on-chain data'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'short-squeeze risk setup',
    expected_cause_family: 'derivatives positioning imbalance',
    expected_thesis_direction: 'asymmetric upside risk if squeeze triggers',
    required_contradictions: [
      'crowded short positioning against weak spot demand',
      'liquidation risk asymmetric to spot conviction',
    ],
    expected_timing_phase: 'MID',
    expected_scenario_type: 'violent upside if positioning unwinds',
    expected_confidence_band: 'LOW',
    forbidden_claims: [
      'guaranteed squeeze',
      'safe to short',
      'must buy now',
    ],
    required_reasoning_notes: [
      'squeezes are violent but unpredictable in magnitude',
      'derivatives setup is not a directional confirmation by itself',
    ],
  },
  tags: [
    'family:FAM-011',
    'regime:LEVERAGE_FRAGILITY',
    'risk:high',
    'confidence:low',
    'timing:mid',
    'derivatives',
  ],
};

// -----------------------------------------------------------------------------
// SYN-012 — FAM-012 — Liquidity-thin breakout
// -----------------------------------------------------------------------------

const SYN_012: SyntheticEpisodeInput = {
  episode_id: 'SYN-012-liquidity-thin-breakout',
  title: 'Breakout on thin liquidity',
  description:
    'Price breaks out on thin liquidity with rising slippage risk. Spot demand is constructive but support quality is fragile. Coinet should disclose that the breakout is structurally vulnerable to reversal.',
  asset_symbol: 'SYN-AK',
  market_regime: 'RISK_ON_EXPANSION',
  signals: {
    spot: {
      price_structure: 'BREAKOUT',
      spot_volume_direction: 'UP',
      spot_demand_quality: 'CLEAN',
      buy_pressure_quality: 'MIXED',
    },
    derivatives: {
      funding_level: 'NEUTRAL',
      open_interest_change: 'UP',
      leverage_direction: 'UP',
      liquidation_risk: 'MEDIUM',
    },
    onchain: {
      wallet_activity: 'UP',
      holder_behavior: 'ACCUMULATING',
      whale_behavior: 'ACCUMULATING',
      exchange_flows: 'NET_OUTFLOW',
      network_activity: 'UP',
    },
    sentiment: {
      social_attention: 'UP',
      narrative_strength: 'MIXED',
      euphoria_risk: 'MEDIUM',
      attention_quality: 'MIXED',
    },
    fundamentals: {
      tvl_direction: 'UP',
      revenue_or_fee_direction: 'UP',
      protocol_usage: 'UP',
      unlock_or_emission_pressure: 'LOW',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'HIGH',
      unlock_risk: 'LOW',
      contradiction_severity: 'MEDIUM',
    },
    liquidity: {
      liquidity_depth: 'THIN',
      slippage_risk: 'HIGH',
      support_quality: 'FRAGILE',
      resistance_quality: 'MIXED',
    },
    event_context: { event_type: 'NONE', proximity: 'NONE', expected_market_impact: 'LOW' },
  },
  blind_spots: ['order-book depth telemetry may shift quickly'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'breakout on thin liquidity',
    expected_cause_family: 'constructive demand into thin order book',
    expected_thesis_direction: 'constructive but liquidity-fragile',
    required_contradictions: [
      'breakout occurring with thin liquidity',
      'demand quality constructive but support fragile',
    ],
    expected_timing_phase: 'EARLY',
    expected_scenario_type: 'continuation if liquidity deepens; sharp reversal if not',
    expected_confidence_band: 'MEDIUM',
    forbidden_claims: [
      'guaranteed breakout',
      'risk-free entry',
      'safe to chase',
    ],
    required_reasoning_notes: [
      'thin liquidity makes the breakout structurally fragile',
      'confidence depends on whether liquidity deepens post-breakout',
    ],
  },
  tags: [
    'family:FAM-012',
    'regime:RISK_ON_EXPANSION',
    'risk:high',
    'confidence:medium',
    'timing:early',
    'liquidity',
  ],
};

// -----------------------------------------------------------------------------
// SYN-013 — FAM-013 — Risk-off market despite asset strength
// -----------------------------------------------------------------------------

const SYN_013: SyntheticEpisodeInput = {
  episode_id: 'SYN-013-risk-off-asset-strength',
  title: 'Risk-off market regime despite asset-specific strength',
  description:
    'The broader market regime is risk-off and contracting, but this specific asset shows constructive on-chain accumulation and improving fundamentals. Coinet should explain the regime-vs-asset contradiction explicitly and refuse to overstate the asset thesis.',
  asset_symbol: 'SYN-AL',
  market_regime: 'RISK_OFF_CONTRACTION',
  signals: {
    spot: {
      price_structure: 'RANGE',
      spot_volume_direction: 'FLAT',
      spot_demand_quality: 'MIXED',
      buy_pressure_quality: 'MIXED',
    },
    derivatives: {
      funding_level: 'NEUTRAL',
      open_interest_change: 'FLAT',
      leverage_direction: 'FLAT',
      liquidation_risk: 'LOW',
    },
    onchain: {
      wallet_activity: 'UP',
      holder_behavior: 'ACCUMULATING',
      whale_behavior: 'ACCUMULATING',
      exchange_flows: 'NET_OUTFLOW',
      network_activity: 'UP',
    },
    sentiment: {
      social_attention: 'DOWN',
      narrative_strength: 'WEAK',
      euphoria_risk: 'LOW',
      attention_quality: 'WEAK',
    },
    fundamentals: {
      tvl_direction: 'UP',
      revenue_or_fee_direction: 'UP',
      protocol_usage: 'UP',
      unlock_or_emission_pressure: 'LOW',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'MEDIUM',
      unlock_risk: 'LOW',
      contradiction_severity: 'MEDIUM',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'LOW',
      support_quality: 'CLEAN',
      resistance_quality: 'MIXED',
    },
    event_context: { event_type: 'MACRO', proximity: 'NEAR', expected_market_impact: 'MEDIUM' },
  },
  blind_spots: ['macro regime may dominate idiosyncratic strength'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'asset-specific strength inside risk-off regime',
    expected_cause_family: 'idiosyncratic accumulation against macro headwind',
    expected_thesis_direction: 'constructive but capped by regime risk',
    required_contradictions: [
      'asset strength against risk-off market regime',
      'macro headwind capping idiosyncratic outperformance',
    ],
    expected_timing_phase: 'EARLY',
    expected_scenario_type: 'outperformance possible but regime risk caps upside',
    expected_confidence_band: 'MEDIUM',
    forbidden_claims: [
      'guaranteed outperformance',
      'risk-free entry',
      'must buy now',
    ],
    required_reasoning_notes: [
      'macro regime can override idiosyncratic strength',
      'confidence is capped by the regime contradiction',
    ],
  },
  tags: [
    'family:FAM-013',
    'regime:RISK_OFF_CONTRACTION',
    'risk:medium',
    'confidence:medium',
    'timing:early',
    'fundamentals',
  ],
};

// -----------------------------------------------------------------------------
// SYN-014 — FAM-014 — Mixed signals / low confidence
// -----------------------------------------------------------------------------

const SYN_014: SyntheticEpisodeInput = {
  episode_id: 'SYN-014-mixed-signals-low-confidence',
  title: 'Mixed signals with no dominant thesis',
  description:
    'Signals contradict each other without a dominant thesis: spot mixed, derivatives elevated but not extreme, on-chain rotating, sentiment muted. Coinet should refuse to force a directional thesis and produce a low-confidence read.',
  asset_symbol: 'SYN-AM',
  market_regime: 'MIXED_CONTRADICTION',
  signals: {
    spot: {
      price_structure: 'RANGE',
      spot_volume_direction: 'FLAT',
      spot_demand_quality: 'MIXED',
      buy_pressure_quality: 'MIXED',
    },
    derivatives: {
      funding_level: 'ELEVATED',
      open_interest_change: 'FLAT',
      leverage_direction: 'FLAT',
      liquidation_risk: 'MEDIUM',
    },
    onchain: {
      wallet_activity: 'FLAT',
      holder_behavior: 'ROTATING',
      whale_behavior: 'MIXED',
      exchange_flows: 'BALANCED',
      network_activity: 'FLAT',
    },
    sentiment: {
      social_attention: 'FLAT',
      narrative_strength: 'MIXED',
      euphoria_risk: 'MEDIUM',
      attention_quality: 'MIXED',
    },
    fundamentals: {
      tvl_direction: 'FLAT',
      revenue_or_fee_direction: 'FLAT',
      protocol_usage: 'FLAT',
      unlock_or_emission_pressure: 'MEDIUM',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'MEDIUM',
      unlock_risk: 'MEDIUM',
      contradiction_severity: 'MEDIUM',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'MEDIUM',
      support_quality: 'MIXED',
      resistance_quality: 'MIXED',
    },
    event_context: { event_type: 'NONE', proximity: 'NONE', expected_market_impact: 'LOW' },
  },
  blind_spots: ['no dominant signal direction available'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'mixed signals; no dominant thesis',
    expected_cause_family: 'signal disagreement',
    expected_thesis_direction: 'no directional bias warranted',
    required_contradictions: [
      'spot mixed alongside derivatives elevated',
      'on-chain rotation alongside muted sentiment',
    ],
    expected_timing_phase: 'UNCLEAR',
    expected_scenario_type: 'wait-and-watch for a dominant signal to emerge',
    expected_confidence_band: 'LOW',
    forbidden_claims: [
      'confirmed thesis',
      'guaranteed direction',
      'must buy now',
    ],
    required_reasoning_notes: [
      'mixed signals do not justify a directional bet',
      'low confidence is the honest read here',
    ],
  },
  tags: [
    'family:FAM-014',
    'regime:MIXED_CONTRADICTION',
    'risk:medium',
    'confidence:low',
    'timing:unclear',
  ],
};

// -----------------------------------------------------------------------------
// SYN-015 — FAM-015 — Degraded data / partial blindness
// -----------------------------------------------------------------------------

const SYN_015: SyntheticEpisodeInput = {
  episode_id: 'SYN-015-degraded-partial-blindness',
  title: 'Degraded data, mixed signal read',
  description:
    'Several signal components are explicitly degraded (derivatives feed unavailable, risk telemetry stale). Spot demand is improving, but the partial blindness prevents leverage-vs-spot disambiguation. Coinet must respect the partial blindness and cap confidence with an explicit reasoning note.',
  asset_symbol: 'SYN-AN',
  market_regime: 'MIXED_CONTRADICTION',
  signals: {
    spot: {
      price_structure: 'RANGE',
      spot_volume_direction: 'UP',
      spot_demand_quality: 'MIXED',
      buy_pressure_quality: 'MIXED',
    },
    derivatives: {
      funding_level: 'UNKNOWN',
      open_interest_change: 'UNKNOWN',
      leverage_direction: 'UNKNOWN',
      liquidation_risk: 'UNKNOWN',
    },
    onchain: {
      wallet_activity: 'FLAT',
      holder_behavior: 'ROTATING',
      whale_behavior: 'MIXED',
      exchange_flows: 'BALANCED',
      network_activity: 'FLAT',
    },
    sentiment: {
      social_attention: 'DOWN',
      narrative_strength: 'WEAK',
      euphoria_risk: 'LOW',
      attention_quality: 'WEAK',
    },
    fundamentals: {
      tvl_direction: 'FLAT',
      revenue_or_fee_direction: 'FLAT',
      protocol_usage: 'FLAT',
      unlock_or_emission_pressure: 'UNKNOWN',
    },
    risk: {
      security_risk: 'UNKNOWN',
      liquidity_risk: 'MEDIUM',
      unlock_risk: 'UNKNOWN',
      contradiction_severity: 'MEDIUM',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'MEDIUM',
      support_quality: 'MIXED',
      resistance_quality: 'MIXED',
    },
  },
  blind_spots: [
    'derivatives feed unavailable for this window',
    'fundamentals telemetry stale',
  ],
  degraded_components: [
    'derivatives.funding_level',
    'derivatives.open_interest_change',
    'derivatives.leverage_direction',
    'derivatives.liquidation_risk',
    'risk.security_risk',
    'risk.unlock_risk',
    'fundamentals.unlock_or_emission_pressure',
  ],
  expected_oracle: {
    expected_state: 'partial blindness; mixed contradiction',
    expected_cause_family: 'incomplete evidence',
    expected_thesis_direction: 'unclear; wait for confirmation',
    required_contradictions: [
      'spot improvement vs missing derivatives confirmation',
      'partial blindness preventing leverage-vs-spot disambiguation',
    ],
    expected_timing_phase: 'UNCLEAR',
    expected_scenario_type: 'wait-and-watch until derivatives data is restored',
    expected_confidence_band: 'LOW',
    forbidden_claims: [
      'confirmed accumulation',
      'guaranteed continuation',
      'clean breakout',
    ],
    required_reasoning_notes: [
      'degraded data caps confidence',
      'derivatives blindness prevents leverage-vs-spot disambiguation',
    ],
  },
  tags: [
    'family:FAM-015',
    'regime:MIXED_CONTRADICTION',
    'risk:medium',
    'confidence:low',
    'timing:unclear',
    'degraded',
  ],
};

// -----------------------------------------------------------------------------
// SYN-016 — FAM-016 — Security-risk override
// -----------------------------------------------------------------------------

const SYN_016: SyntheticEpisodeInput = {
  episode_id: 'SYN-016-security-risk-override',
  title: 'Security risk overrides constructive surface signals',
  description:
    'Surface signals are constructive (spot up, on-chain holders accumulating, fundamentals stable), but security risk is HIGH on the protocol layer (recent exploit-class event). Coinet must let the security risk override the surface thesis.',
  asset_symbol: 'SYN-AO',
  market_regime: 'MIXED_CONTRADICTION',
  signals: {
    spot: {
      price_structure: 'RANGE',
      spot_volume_direction: 'UP',
      spot_demand_quality: 'MIXED',
      buy_pressure_quality: 'MIXED',
    },
    derivatives: {
      funding_level: 'NEUTRAL',
      open_interest_change: 'FLAT',
      leverage_direction: 'FLAT',
      liquidation_risk: 'MEDIUM',
    },
    onchain: {
      wallet_activity: 'UP',
      holder_behavior: 'ACCUMULATING',
      whale_behavior: 'MIXED',
      exchange_flows: 'BALANCED',
      network_activity: 'FLAT',
    },
    sentiment: {
      social_attention: 'UP',
      narrative_strength: 'MIXED',
      euphoria_risk: 'MEDIUM',
      attention_quality: 'MIXED',
    },
    fundamentals: {
      tvl_direction: 'FLAT',
      revenue_or_fee_direction: 'FLAT',
      protocol_usage: 'FLAT',
      unlock_or_emission_pressure: 'LOW',
    },
    risk: {
      security_risk: 'HIGH',
      liquidity_risk: 'MEDIUM',
      unlock_risk: 'LOW',
      contradiction_severity: 'EXTREME',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'MEDIUM',
      support_quality: 'MIXED',
      resistance_quality: 'MIXED',
    },
    event_context: { event_type: 'EXPLOIT', proximity: 'IMMEDIATE', expected_market_impact: 'HIGH' },
  },
  blind_spots: ['full damage attribution may not be public yet'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'security risk override',
    expected_cause_family: 'protocol-layer security event',
    expected_thesis_direction: 'surface thesis invalidated by security event',
    required_contradictions: [
      'constructive surface signals against HIGH security risk',
      'on-chain accumulation despite a security event',
    ],
    expected_timing_phase: 'INVALIDATING',
    expected_scenario_type: 'thesis cannot proceed until security event is resolved',
    expected_confidence_band: 'VERY_LOW',
    forbidden_claims: [
      'safe entry',
      'guaranteed continuation',
      'must buy now',
    ],
    required_reasoning_notes: [
      'security risk overrides surface signal quality',
      'confidence must be VERY_LOW until the security event is resolved',
    ],
  },
  tags: [
    'family:FAM-016',
    'regime:MIXED_CONTRADICTION',
    'risk:extreme',
    'confidence:very_low',
    'timing:invalidating',
    'security',
  ],
};

// -----------------------------------------------------------------------------
// SYN-017 — FAM-017 — Exchange inflow distribution risk
// -----------------------------------------------------------------------------

const SYN_017: SyntheticEpisodeInput = {
  episode_id: 'SYN-017-exchange-inflow-distribution',
  title: 'Rising exchange inflows ahead of distribution',
  description:
    'Exchange inflows are rising while price is flat and whale behavior is shifting from accumulation toward distribution. Coinet should detect the pre-distribution warning even though price has not yet broken down.',
  asset_symbol: 'SYN-AP',
  market_regime: 'LATE_DISTRIBUTION',
  signals: {
    spot: {
      price_structure: 'RANGE',
      spot_volume_direction: 'FLAT',
      spot_demand_quality: 'MIXED',
      buy_pressure_quality: 'WEAK',
    },
    derivatives: {
      funding_level: 'NEUTRAL',
      open_interest_change: 'FLAT',
      leverage_direction: 'FLAT',
      liquidation_risk: 'LOW',
    },
    onchain: {
      wallet_activity: 'UP',
      holder_behavior: 'DISTRIBUTING',
      whale_behavior: 'DISTRIBUTING',
      exchange_flows: 'NET_INFLOW',
      network_activity: 'FLAT',
    },
    sentiment: {
      social_attention: 'FLAT',
      narrative_strength: 'WEAK',
      euphoria_risk: 'LOW',
      attention_quality: 'WEAK',
    },
    fundamentals: {
      tvl_direction: 'FLAT',
      revenue_or_fee_direction: 'FLAT',
      protocol_usage: 'FLAT',
      unlock_or_emission_pressure: 'LOW',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'MEDIUM',
      unlock_risk: 'LOW',
      contradiction_severity: 'HIGH',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'MEDIUM',
      support_quality: 'MIXED',
      resistance_quality: 'CLEAN',
    },
    event_context: { event_type: 'NONE', proximity: 'NONE', expected_market_impact: 'LOW' },
  },
  blind_spots: ['attribution of inflow buyers difficult without OTC data'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'pre-distribution exchange inflow risk',
    expected_cause_family: 'whale distribution into exchange wallets',
    expected_thesis_direction: 'downside risk if distribution continues',
    required_contradictions: [
      'rising exchange inflows alongside flat price',
      'distribution behavior masked by surface calm',
    ],
    expected_timing_phase: 'LATE',
    expected_scenario_type: 'distribution-driven breakdown risk if inflows continue',
    expected_confidence_band: 'MEDIUM',
    forbidden_claims: [
      'safe to hold',
      'guaranteed continuation',
      'must buy now',
    ],
    required_reasoning_notes: [
      'exchange inflows often precede distribution events',
      'flat price does not invalidate the distribution warning',
    ],
  },
  tags: [
    'family:FAM-017',
    'regime:LATE_DISTRIBUTION',
    'risk:medium',
    'confidence:medium',
    'timing:late',
    'exchange-flows',
    'whales',
  ],
};

// -----------------------------------------------------------------------------
// SYN-018 — FAM-018 — Narrative catalyst with weak fundamentals
// -----------------------------------------------------------------------------

const SYN_018: SyntheticEpisodeInput = {
  episode_id: 'SYN-018-narrative-catalyst-weak-fundamentals',
  title: 'Narrative catalyst with weak fundamentals',
  description:
    'A narrative catalyst is immediate (e.g. listing or governance event), and sentiment is rising sharply, but fundamentals are weak (revenue declining, protocol usage flat). Coinet should treat the move as narrative-driven without fundamentals backing.',
  asset_symbol: 'SYN-AQ',
  market_regime: 'RISK_ON_EXPANSION',
  signals: {
    spot: {
      price_structure: 'RANGE',
      spot_volume_direction: 'UP',
      spot_demand_quality: 'MIXED',
      buy_pressure_quality: 'MIXED',
    },
    derivatives: {
      funding_level: 'ELEVATED',
      open_interest_change: 'UP',
      leverage_direction: 'UP',
      liquidation_risk: 'MEDIUM',
    },
    onchain: {
      wallet_activity: 'UP',
      holder_behavior: 'ROTATING',
      whale_behavior: 'MIXED',
      exchange_flows: 'BALANCED',
      network_activity: 'UP',
    },
    sentiment: {
      social_attention: 'STRONGLY_UP',
      narrative_strength: 'MIXED',
      euphoria_risk: 'HIGH',
      attention_quality: 'MIXED',
    },
    fundamentals: {
      tvl_direction: 'DOWN',
      revenue_or_fee_direction: 'DOWN',
      protocol_usage: 'FLAT',
      unlock_or_emission_pressure: 'MEDIUM',
    },
    risk: {
      security_risk: 'LOW',
      liquidity_risk: 'MEDIUM',
      unlock_risk: 'MEDIUM',
      contradiction_severity: 'HIGH',
    },
    liquidity: {
      liquidity_depth: 'MODERATE',
      slippage_risk: 'MEDIUM',
      support_quality: 'MIXED',
      resistance_quality: 'MIXED',
    },
    event_context: { event_type: 'LISTING', proximity: 'IMMEDIATE', expected_market_impact: 'HIGH' },
  },
  blind_spots: ['narrative durability beyond the catalyst is uncertain'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'narrative-led move without fundamentals',
    expected_cause_family: 'narrative catalyst with weak fundamental backing',
    expected_thesis_direction: 'fragile narrative-driven thesis',
    required_contradictions: [
      'rising narrative attention against declining fundamentals',
      'price momentum without fundamental support',
    ],
    expected_timing_phase: 'MID',
    expected_scenario_type: 'mean reversion risk after the catalyst dissipates',
    expected_confidence_band: 'LOW',
    forbidden_claims: [
      'fundamental rerating',
      'guaranteed continuation',
      'safe to chase',
    ],
    required_reasoning_notes: [
      'declining revenue undermines a fundamentals-based bullish case',
      'narrative catalysts often produce short-lived moves',
    ],
  },
  tags: [
    'family:FAM-018',
    'regime:RISK_ON_EXPANSION',
    'risk:medium',
    'confidence:low',
    'timing:mid',
    'narrative',
    'fundamentals',
  ],
};

// -----------------------------------------------------------------------------
// Canonical 18-episode corpus (P3-BTAR-003 §5 — within the 15–25 band).
// -----------------------------------------------------------------------------

export const SYNTHETIC_EPISODE_CORPUS: ReadonlyArray<SyntheticEpisodeInput> = [
  SYN_001,
  SYN_002,
  SYN_003,
  SYN_004,
  SYN_005,
  SYN_006,
  SYN_007,
  SYN_008,
  SYN_009,
  SYN_010,
  SYN_011,
  SYN_012,
  SYN_013,
  SYN_014,
  SYN_015,
  SYN_016,
  SYN_017,
  SYN_018,
];

// -----------------------------------------------------------------------------
// Corpus-by-id lookup (computed once at module load).
// -----------------------------------------------------------------------------

export const SYNTHETIC_EPISODE_CORPUS_BY_ID: Readonly<Record<string, SyntheticEpisodeInput>> =
  Object.freeze(
    SYNTHETIC_EPISODE_CORPUS.reduce<Record<string, SyntheticEpisodeInput>>((acc, ep) => {
      acc[ep.episode_id] = ep;
      return acc;
    }, {}),
  );

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export function getSyntheticEpisodeById(
  episodeId: string,
): SyntheticEpisodeInput | undefined {
  return SYNTHETIC_EPISODE_CORPUS_BY_ID[episodeId];
}

export function getSyntheticEpisodesByTag(tag: string): SyntheticEpisodeInput[] {
  return SYNTHETIC_EPISODE_CORPUS.filter((ep) => ep.tags.includes(tag));
}

export function getSyntheticEpisodesByRegime(
  regime: SyntheticMarketRegime,
): SyntheticEpisodeInput[] {
  return SYNTHETIC_EPISODE_CORPUS.filter((ep) => ep.market_regime === regime);
}
