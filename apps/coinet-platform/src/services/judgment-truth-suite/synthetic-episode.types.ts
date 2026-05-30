/**
 * P3-BTAR-001 — Synthetic Episode Contract
 *
 * This is a Phase 3 synthetic episode contract used by the Backend Judgment Truth Suite.
 * It defines what a controlled fake crypto market situation looks like and what the
 * correct ("expected") judgment for that situation is.
 *
 * It does NOT run any judgment engine.
 * It does NOT compare judgment output.
 * No real APIs. No provider keys. No fan-out behavior change.
 *
 * Authority:
 *   - Plan 3.0 §6 (judgment contract under test)
 *   - Plan 3.0 §7 (synthetic episode concept)
 *   - Plan 3.0 §8 (expected judgment oracle concept)
 *   - Plan 3.0 §12 (no-API rule)
 *
 * Owner: Phase 3 (P3-BTAR-001).
 */

// -----------------------------------------------------------------------------
// 1. Identity
// -----------------------------------------------------------------------------

export type SyntheticEpisodeId = string;

// -----------------------------------------------------------------------------
// 2. Market regime
// -----------------------------------------------------------------------------

export type SyntheticMarketRegime =
  | 'RISK_ON_EXPANSION'
  | 'RISK_OFF_CONTRACTION'
  | 'RANGE_COMPRESSION'
  | 'LEVERAGE_FRAGILITY'
  | 'EARLY_ACCUMULATION'
  | 'LATE_DISTRIBUTION'
  | 'MIXED_CONTRADICTION';

// -----------------------------------------------------------------------------
// 3. Shared signal enums
// -----------------------------------------------------------------------------

export type SyntheticSignalDirection =
  | 'STRONGLY_UP'
  | 'UP'
  | 'FLAT'
  | 'DOWN'
  | 'STRONGLY_DOWN'
  | 'UNKNOWN';

export type SyntheticSignalQuality =
  | 'CLEAN'
  | 'MIXED'
  | 'WEAK'
  | 'FRAGILE'
  | 'UNRELIABLE'
  | 'UNKNOWN';

// -----------------------------------------------------------------------------
// 4. Expected-judgment enums
// -----------------------------------------------------------------------------

export type ExpectedConfidenceBand =
  | 'VERY_LOW'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'VERY_HIGH';

export type ExpectedTimingPhase =
  | 'EARLY'
  | 'MID'
  | 'LATE'
  | 'EXHAUSTED'
  | 'INVALIDATING'
  | 'UNCLEAR';

// -----------------------------------------------------------------------------
// 5. Signal groups
// -----------------------------------------------------------------------------

export type SpotPriceStructure =
  | 'BREAKOUT'
  | 'RANGE'
  | 'DISTRIBUTION'
  | 'ACCUMULATION'
  | 'BREAKDOWN'
  | 'UNKNOWN';

export interface SyntheticSpotSignal {
  price_structure: SpotPriceStructure;
  spot_volume_direction: SyntheticSignalDirection;
  spot_demand_quality: SyntheticSignalQuality;
  buy_pressure_quality: SyntheticSignalQuality;
}

export type DerivativesFundingLevel =
  | 'NEGATIVE'
  | 'NEUTRAL'
  | 'ELEVATED'
  | 'OVERHEATED'
  | 'UNKNOWN';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' | 'UNKNOWN';

export interface SyntheticDerivativesSignal {
  funding_level: DerivativesFundingLevel;
  open_interest_change: SyntheticSignalDirection;
  leverage_direction: SyntheticSignalDirection;
  liquidation_risk: RiskLevel;
}

export type OnchainHolderBehavior =
  | 'ACCUMULATING'
  | 'DISTRIBUTING'
  | 'STABLE'
  | 'ROTATING'
  | 'UNKNOWN';

export type OnchainWhaleBehavior =
  | 'ACCUMULATING'
  | 'DISTRIBUTING'
  | 'INACTIVE'
  | 'MIXED'
  | 'UNKNOWN';

export type ExchangeFlowDirection =
  | 'NET_INFLOW'
  | 'NET_OUTFLOW'
  | 'BALANCED'
  | 'UNKNOWN';

export interface SyntheticOnchainSignal {
  wallet_activity: SyntheticSignalDirection;
  holder_behavior: OnchainHolderBehavior;
  whale_behavior: OnchainWhaleBehavior;
  exchange_flows: ExchangeFlowDirection;
  network_activity: SyntheticSignalDirection;
}

export type EuphoriaRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' | 'UNKNOWN';

export interface SyntheticSentimentSignal {
  social_attention: SyntheticSignalDirection;
  narrative_strength: SyntheticSignalQuality;
  euphoria_risk: EuphoriaRisk;
  attention_quality: SyntheticSignalQuality;
}

export type EmissionPressure = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' | 'UNKNOWN';

export interface SyntheticFundamentalSignal {
  tvl_direction: SyntheticSignalDirection;
  revenue_or_fee_direction: SyntheticSignalDirection;
  protocol_usage: SyntheticSignalDirection;
  unlock_or_emission_pressure: EmissionPressure;
}

export type SecurityRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';

export interface SyntheticRiskSignal {
  security_risk: SecurityRisk;
  liquidity_risk: RiskLevel;
  unlock_risk: RiskLevel;
  contradiction_severity: RiskLevel;
}

export type LiquidityDepth = 'THIN' | 'MODERATE' | 'DEEP' | 'UNKNOWN';

export type SlippageRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';

export interface SyntheticLiquiditySignal {
  liquidity_depth: LiquidityDepth;
  slippage_risk: SlippageRisk;
  support_quality: SyntheticSignalQuality;
  resistance_quality: SyntheticSignalQuality;
}

// -----------------------------------------------------------------------------
// 6. Optional event context
// -----------------------------------------------------------------------------

export type SyntheticEventType =
  | 'UNLOCK'
  | 'LISTING'
  | 'EXPLOIT'
  | 'GOVERNANCE'
  | 'MACRO'
  | 'NARRATIVE_CATALYST'
  | 'NONE'
  | 'UNKNOWN';

export type SyntheticEventProximity =
  | 'IMMEDIATE'
  | 'NEAR'
  | 'DISTANT'
  | 'NONE'
  | 'UNKNOWN';

export type SyntheticEventImpact = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';

export interface SyntheticEventContext {
  event_type: SyntheticEventType;
  proximity: SyntheticEventProximity;
  expected_market_impact: SyntheticEventImpact;
}

// -----------------------------------------------------------------------------
// 7. Aggregated signals
// -----------------------------------------------------------------------------

export interface SyntheticEpisodeSignals {
  spot: SyntheticSpotSignal;
  derivatives: SyntheticDerivativesSignal;
  onchain: SyntheticOnchainSignal;
  sentiment: SyntheticSentimentSignal;
  fundamentals: SyntheticFundamentalSignal;
  risk: SyntheticRiskSignal;
  liquidity: SyntheticLiquiditySignal;
  event_context?: SyntheticEventContext;
}

// -----------------------------------------------------------------------------
// 8. Expected judgment oracle
//
// Authored ground truth — NEVER generated by AI.
// This is the correct answer Coinet should arrive at for the episode.
// -----------------------------------------------------------------------------

export interface ExpectedJudgmentOracle {
  expected_state: string;
  expected_cause_family: string;
  expected_thesis_direction: string;
  required_contradictions: string[];
  expected_timing_phase: ExpectedTimingPhase;
  expected_scenario_type: string;
  expected_confidence_band: ExpectedConfidenceBand;
  forbidden_claims: string[];
  required_reasoning_notes: string[];
}

// -----------------------------------------------------------------------------
// 9. Episode input (the public contract)
// -----------------------------------------------------------------------------

export interface SyntheticEpisodeInput {
  episode_id: SyntheticEpisodeId;
  title: string;
  description: string;
  asset_symbol?: string;
  market_regime: SyntheticMarketRegime;
  signals: SyntheticEpisodeSignals;
  blind_spots: string[];
  degraded_components: string[];
  expected_oracle: ExpectedJudgmentOracle;
  tags: string[];
}

// -----------------------------------------------------------------------------
// 10. Validation result
// -----------------------------------------------------------------------------

export interface SyntheticEpisodeValidationResult {
  valid: boolean;
  episode_id: string;
  errors: string[];
  warnings: string[];
}
