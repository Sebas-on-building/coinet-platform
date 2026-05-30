/**
 * P3-BTAR-001 — Synthetic Episode Starter Fixtures
 *
 * 3 required + up to 2 optional deterministic starter fixtures.
 * Used by Phase 3 P3-BTAR-002 (truth runner) and P3-BTAR-005 (full suite) later.
 *
 * No real APIs. No provider keys. No live data. Fully deterministic.
 *
 * Authority:
 *   - Plan 3.0 §7 (synthetic episode concept)
 *   - Plan 3.0 §12 (no-API rule)
 *
 * Owner: Phase 3 (P3-BTAR-001).
 */

import type { SyntheticEpisodeInput } from './synthetic-episode.types';

// -----------------------------------------------------------------------------
// SYN-001 — Clean accumulation
// Healthy early strength: spot-led, sentiment not euphoric, confidence capped
// below VERY_HIGH because breakout is not yet confirmed.
// -----------------------------------------------------------------------------

export const SYN_001_CLEAN_ACCUMULATION: SyntheticEpisodeInput = {
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
    event_context: {
      event_type: 'NONE',
      proximity: 'NONE',
      expected_market_impact: 'LOW',
    },
  },
  blind_spots: ['no confirmed breakout candle yet'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'early accumulation',
    expected_cause_family: 'spot-led accumulation',
    expected_thesis_direction: 'constructive but not yet confirmed breakout',
    required_contradictions: [
      'sentiment has not yet confirmed the move',
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
  tags: ['accumulation', 'spot-led', 'early', 'clean'],
};

// -----------------------------------------------------------------------------
// SYN-002 — Leverage-driven fragility
// Derivatives outpacing spot, euphoria rising, liquidity thin. Coinet must
// avoid treating leverage-driven strength as clean accumulation.
// -----------------------------------------------------------------------------

export const SYN_002_LEVERAGE_FRAGILITY: SyntheticEpisodeInput = {
  episode_id: 'SYN-002-leverage-fragility',
  title: 'Leverage-driven fragile expansion',
  description:
    'Price is rising while spot demand is mixed, funding is overheated, open interest expands aggressively, sentiment is euphoric, and liquidity below price is thin. Coinet should identify fragile leverage-assisted strength with derivatives-vs-spot contradiction and capped confidence.',
  asset_symbol: 'SYN-B',
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
    event_context: {
      event_type: 'NARRATIVE_CATALYST',
      proximity: 'NEAR',
      expected_market_impact: 'MEDIUM',
    },
  },
  blind_spots: ['no measurable cohort rotation visible yet'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'fragile expansion',
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
  tags: ['fragility', 'leverage', 'late', 'derivatives-led'],
};

// -----------------------------------------------------------------------------
// SYN-003 — Degraded mixed read
// Spot improving, but derivatives degraded/unknown and sentiment weak. Coinet
// must respect partial blindness and cap confidence with an explicit reasoning
// note about degraded data.
// -----------------------------------------------------------------------------

export const SYN_003_DEGRADED_MIXED_READ: SyntheticEpisodeInput = {
  episode_id: 'SYN-003-degraded-mixed-read',
  title: 'Degraded data, mixed signal read',
  description:
    'Spot demand is improving, but derivatives data is degraded/unknown, on-chain is mixed, and sentiment is weak. Several signal components are explicitly degraded. Coinet should produce a mixed-contradiction read with low/medium confidence and an explicit reasoning note that degraded data caps confidence.',
  asset_symbol: 'SYN-C',
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
    expected_state: 'mixed contradiction',
    expected_cause_family: 'incomplete evidence',
    expected_thesis_direction: 'unclear; wait for confirmation',
    required_contradictions: [
      'spot improvement vs missing derivatives confirmation',
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
  tags: ['degraded', 'mixed', 'unclear', 'partial-blindness'],
};

// -----------------------------------------------------------------------------
// SYN-004 — Unlock-risk distribution (optional)
// Visible distribution into a near unlock event. Coinet must recognize unlock
// risk and avoid framing the move as constructive.
// -----------------------------------------------------------------------------

export const SYN_004_UNLOCK_RISK_DISTRIBUTION: SyntheticEpisodeInput = {
  episode_id: 'SYN-004-unlock-risk-distribution',
  title: 'Distribution into a near unlock event',
  description:
    'Price is drifting up while whales distribute into a near unlock. Funding is elevated, exchange inflows rise, and protocol revenue is declining. Coinet should identify late-stage distribution risk and emphasize the unlock event rather than the surface price action.',
  asset_symbol: 'SYN-D',
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
    event_context: {
      event_type: 'UNLOCK',
      proximity: 'NEAR',
      expected_market_impact: 'HIGH',
    },
  },
  blind_spots: ['no public confirmation of OTC sales'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'late distribution',
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
  tags: ['distribution', 'unlock-risk', 'late', 'supply-event'],
};

// -----------------------------------------------------------------------------
// SYN-005 — Sentiment-only pump (optional)
// Sentiment spikes without spot or fundamentals. Coinet must avoid treating
// sentiment as substance and must cap confidence accordingly.
// -----------------------------------------------------------------------------

export const SYN_005_SENTIMENT_ONLY_PUMP: SyntheticEpisodeInput = {
  episode_id: 'SYN-005-sentiment-only-pump',
  title: 'Sentiment-only pump, no spot or fundamentals',
  description:
    'Sentiment spikes strongly upward on a narrative catalyst, but spot volume is flat, fundamentals are unchanged, and on-chain participation is muted. Coinet should avoid treating sentiment as substance and must produce a low-confidence read with an explicit non-confirmation note.',
  asset_symbol: 'SYN-E',
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
    event_context: {
      event_type: 'NARRATIVE_CATALYST',
      proximity: 'IMMEDIATE',
      expected_market_impact: 'MEDIUM',
    },
  },
  blind_spots: ['narrative durability not yet measurable'],
  degraded_components: [],
  expected_oracle: {
    expected_state: 'sentiment-only pump',
    expected_cause_family: 'narrative-driven attention spike',
    expected_thesis_direction: 'unconfirmed; narrative-led without substance',
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
  tags: ['sentiment-only', 'narrative', 'unconfirmed', 'early'],
};

// -----------------------------------------------------------------------------
// Starter corpus (4 episodes — within the 3–5 spec band).
// SYN-005 is intentionally excluded from the starter corpus to keep starter
// count modest; it remains exported so P3-BTAR-003 can include it later.
// -----------------------------------------------------------------------------

export const STARTER_SYNTHETIC_EPISODE_CORPUS: ReadonlyArray<SyntheticEpisodeInput> = [
  SYN_001_CLEAN_ACCUMULATION,
  SYN_002_LEVERAGE_FRAGILITY,
  SYN_003_DEGRADED_MIXED_READ,
  SYN_004_UNLOCK_RISK_DISTRIBUTION,
];
