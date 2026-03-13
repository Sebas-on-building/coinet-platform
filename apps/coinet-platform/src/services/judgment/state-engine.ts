/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     STATE CLASSIFICATION ENGINE v1                                            ║
 * ║                                                                               ║
 * ║   Turns multi-layer signals into a clear current market state.                ║
 * ║   Output is a controlled classification, NOT free-form AI text.               ║
 * ║                                                                               ║
 * ║   Input: feature signals from Evidence Pack / OmniScore                       ║
 * ║   Output: primary state, secondary state, confidence                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  MARKET_STATES,
  type MarketState,
  MARKET_STATE_GROUPS,
} from './taxonomies';
import type { JudgmentState } from './types';
import type { SignalSnapshot } from './signal-snapshot';

interface StateCandidate {
  state: MarketState;
  score: number;
  reasons: string[];
}

/**
 * Classify the current market state from signal data.
 *
 * Each state has a set of conditions. We score all states and pick the
 * highest-scoring primary and secondary.
 */
export function classifyState(signals: SignalSnapshot): JudgmentState {
  const candidates: StateCandidate[] = [];

  // --- Discovery states ---
  candidates.push(scoreDormant(signals));
  candidates.push(scoreFreshDiscovery(signals));
  candidates.push(scoreEarlyLiquidityFormation(signals));
  candidates.push(scoreNewNarrativeIgnition(signals));

  // --- Expansion states ---
  candidates.push(scoreEarlyAccumulation(signals));
  candidates.push(scoreSpotLedExpansion(signals));
  candidates.push(scoreLeverageLedExpansion(signals));
  candidates.push(scoreFundamentallySupportedRerating(signals));

  // --- Fragility states ---
  candidates.push(scoreCrowdedContinuation(signals));
  candidates.push(scoreReflexiveLateStage(signals));
  candidates.push(scoreThinLiquidityRisk(signals));
  candidates.push(scorePostEventOverextension(signals));

  // --- Risk states ---
  candidates.push(scoreDistribution(signals));
  candidates.push(scoreTreasurySellPressure(signals));
  candidates.push(scoreUnlockOverhang(signals));
  candidates.push(scoreStructurallyWeakRally(signals));
  candidates.push(scoreManipulationRisk(signals));

  // Defensive fallback in case scoring list is changed and becomes empty.
  if (candidates.length === 0) {
    return {
      primary: MARKET_STATES.DORMANT,
      secondary: null,
      confidence: 0,
    };
  }

  candidates.sort((a, b) => b.score - a.score);

  const primary = candidates[0];
  const secondary = candidates[1];

  const sameGroup =
    primary &&
    secondary &&
    MARKET_STATE_GROUPS[primary.state] === MARKET_STATE_GROUPS[secondary.state];

  return {
    primary: primary.state,
    secondary:
      secondary && secondary.score > 0.15 && !sameGroup
        ? secondary.state
        : null,
    confidence: Math.min(1, primary.score),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING FUNCTIONS — one per state
//
// Each returns 0–1. Inputs are normalized signal values from SignalSnapshot.
// A score > 0.5 means the state is a plausible classification.
// ═══════════════════════════════════════════════════════════════════════════════

function scoreDormant(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.volume_24h < 0.1) { score += 0.3; reasons.push('very low volume'); }
  if (s.narrative_intensity < 0.1) { score += 0.2; reasons.push('no narrative'); }
  if (s.liquidity < 0.1) { score += 0.2; reasons.push('thin liquidity'); }
  if (s.price_momentum_24h < 0.05 && s.price_momentum_24h > -0.05) {
    score += 0.15; reasons.push('flat price');
  }
  if (s.whale_activity < 0.1) { score += 0.15; reasons.push('no whale activity'); }

  return { state: MARKET_STATES.DORMANT, score: Math.min(1, score), reasons };
}

function scoreFreshDiscovery(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.pair_age_hours !== null && s.pair_age_hours < 72) {
    score += 0.35; reasons.push('very new pair');
  }
  if (s.liquidity > 0.05 && s.liquidity < 0.3) {
    score += 0.2; reasons.push('initial liquidity forming');
  }
  if (s.volume_24h > 0.05) { score += 0.15; reasons.push('some trading activity'); }
  if (s.narrative_intensity < 0.2) { score += 0.15; reasons.push('pre-narrative'); }
  if (s.security_risk < 0.7) { score += 0.15; reasons.push('no critical security flags'); }

  return { state: MARKET_STATES.FRESH_DISCOVERY, score: Math.min(1, score), reasons };
}

function scoreEarlyLiquidityFormation(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.liquidity > 0.1 && s.liquidity < 0.4) {
    score += 0.3; reasons.push('liquidity building');
  }
  if (s.pair_age_hours !== null && s.pair_age_hours < 168) {
    score += 0.2; reasons.push('young pair');
  }
  if (s.volume_24h > 0.1) { score += 0.15; reasons.push('trading picking up'); }
  if (s.price_momentum_24h > 0) { score += 0.15; reasons.push('positive momentum'); }
  if (s.whale_activity > 0.1) { score += 0.2; reasons.push('early whale interest'); }

  return { state: MARKET_STATES.EARLY_LIQUIDITY_FORMATION, score: Math.min(1, score), reasons };
}

function scoreNewNarrativeIgnition(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.narrative_intensity > 0.4) { score += 0.3; reasons.push('narrative rising'); }
  if (s.sentiment > 0.3) { score += 0.2; reasons.push('positive sentiment'); }
  if (s.volume_24h > 0.2) { score += 0.15; reasons.push('volume expanding'); }
  if (s.fundamentals_strength < 0.3) {
    score += 0.15; reasons.push('fundamentals not yet confirmed');
  }
  if (s.leverage_pressure < 0.3) { score += 0.2; reasons.push('derivatives uncrowded'); }

  return { state: MARKET_STATES.NEW_NARRATIVE_IGNITION, score: Math.min(1, score), reasons };
}

function scoreEarlyAccumulation(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.whale_activity > 0.3) { score += 0.3; reasons.push('whale accumulation'); }
  if (s.exchange_outflow > 0.3) { score += 0.2; reasons.push('exchange outflows'); }
  if (s.leverage_pressure < 0.3) { score += 0.15; reasons.push('low leverage'); }
  if (s.narrative_intensity < 0.3) { score += 0.15; reasons.push('under the radar'); }
  if (s.price_momentum_24h > -0.05) { score += 0.2; reasons.push('stable or rising price'); }

  return { state: MARKET_STATES.EARLY_ACCUMULATION, score: Math.min(1, score), reasons };
}

function scoreSpotLedExpansion(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.volume_24h > 0.4) { score += 0.25; reasons.push('strong volume'); }
  if (s.price_momentum_24h > 0.1) { score += 0.25; reasons.push('strong momentum'); }
  if (s.leverage_pressure < 0.4) { score += 0.2; reasons.push('derivatives not overheated'); }
  if (s.liquidity > 0.3) { score += 0.15; reasons.push('adequate liquidity'); }
  if (s.buy_sell_ratio > 0.55) { score += 0.15; reasons.push('buy-side dominant'); }

  return { state: MARKET_STATES.SPOT_LED_EXPANSION, score: Math.min(1, score), reasons };
}

function scoreLeverageLedExpansion(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.leverage_pressure > 0.5) { score += 0.3; reasons.push('high leverage / OI'); }
  if (s.funding_rate > 0.3) { score += 0.2; reasons.push('elevated funding'); }
  if (s.price_momentum_24h > 0.05) { score += 0.15; reasons.push('positive momentum'); }
  if (s.volume_24h < s.leverage_pressure) {
    score += 0.2; reasons.push('spot weaker than derivatives');
  }
  if (s.liquidation_density > 0.3) { score += 0.15; reasons.push('liquidation pressure building'); }

  return { state: MARKET_STATES.LEVERAGE_LED_EXPANSION, score: Math.min(1, score), reasons };
}

function scoreFundamentallySupportedRerating(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.fundamentals_strength > 0.5) { score += 0.3; reasons.push('strong fundamentals'); }
  if (s.tvl_trend > 0.3) { score += 0.2; reasons.push('TVL growing'); }
  if (s.revenue_quality > 0.4) { score += 0.2; reasons.push('revenue improving'); }
  if (s.price_momentum_24h > 0) { score += 0.15; reasons.push('positive price'); }
  if (s.security_risk < 0.3) { score += 0.15; reasons.push('low security risk'); }

  return { state: MARKET_STATES.FUNDAMENTALLY_SUPPORTED_RERATING, score: Math.min(1, score), reasons };
}

function scoreCrowdedContinuation(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.leverage_pressure > 0.6) { score += 0.3; reasons.push('high leverage'); }
  if (s.funding_rate > 0.5) { score += 0.2; reasons.push('stretched funding'); }
  if (s.price_momentum_24h > 0.05) { score += 0.15; reasons.push('still rising'); }
  if (s.narrative_intensity > 0.5) { score += 0.15; reasons.push('high attention'); }
  if (s.liquidation_density > 0.4) { score += 0.2; reasons.push('dense liquidation levels'); }

  return { state: MARKET_STATES.CROWDED_CONTINUATION, score: Math.min(1, score), reasons };
}

function scoreReflexiveLateStage(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.leverage_pressure > 0.7) { score += 0.25; reasons.push('extreme leverage'); }
  if (s.funding_rate > 0.6) { score += 0.2; reasons.push('very stretched funding'); }
  if (s.narrative_intensity > 0.6) { score += 0.15; reasons.push('peak attention'); }
  if (s.price_momentum_24h > 0.15) { score += 0.15; reasons.push('rapid price rise'); }
  if (s.exchange_inflow > 0.3) { score += 0.25; reasons.push('exchange inflows rising'); }

  return { state: MARKET_STATES.REFLEXIVE_LATE_STAGE, score: Math.min(1, score), reasons };
}

function scoreThinLiquidityRisk(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.liquidity < 0.15) { score += 0.35; reasons.push('very thin liquidity'); }
  if (s.volume_24h > 0.3 && s.liquidity < 0.2) {
    score += 0.25; reasons.push('volume/liquidity mismatch');
  }
  if (s.price_momentum_24h > 0.1) { score += 0.2; reasons.push('price moving on thin base'); }
  if (s.whale_activity > 0.2) { score += 0.2; reasons.push('whales can dominate'); }

  return { state: MARKET_STATES.THIN_LIQUIDITY_RISK, score: Math.min(1, score), reasons };
}

function scorePostEventOverextension(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.price_momentum_24h > 0.2) { score += 0.25; reasons.push('sharp recent move'); }
  if (s.narrative_intensity > 0.5) { score += 0.2; reasons.push('event-driven attention'); }
  if (s.leverage_pressure > 0.4) { score += 0.2; reasons.push('derivatives followed'); }
  if (s.fundamentals_strength < 0.3) {
    score += 0.2; reasons.push('fundamentals did not change');
  }
  if (s.volume_24h > 0.5) { score += 0.15; reasons.push('spike volume'); }

  return { state: MARKET_STATES.POST_EVENT_OVEREXTENSION, score: Math.min(1, score), reasons };
}

function scoreDistribution(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.exchange_inflow > 0.4) { score += 0.3; reasons.push('exchange inflows elevated'); }
  if (s.whale_activity < 0.2 || s.exchange_inflow > s.exchange_outflow) {
    score += 0.2; reasons.push('whales selling or neutral');
  }
  if (s.narrative_intensity > 0.3 && s.exchange_inflow > 0.3) {
    score += 0.2; reasons.push('selling under cover of hype');
  }
  if (s.price_momentum_24h < 0.05 && s.price_momentum_24h > -0.1) {
    score += 0.15; reasons.push('range-bound despite activity');
  }
  if (s.volume_24h > 0.3) { score += 0.15; reasons.push('active turnover'); }

  return { state: MARKET_STATES.DISTRIBUTION, score: Math.min(1, score), reasons };
}

function scoreTreasurySellPressure(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.exchange_inflow > 0.5) { score += 0.35; reasons.push('large exchange deposits'); }
  if (s.whale_activity < 0.15) { score += 0.2; reasons.push('no accumulation'); }
  if (s.price_momentum_24h < 0) { score += 0.2; reasons.push('negative momentum'); }
  if (s.fundamentals_strength > 0.3) {
    score += 0.15; reasons.push('project still active (treasury sale, not death)');
  }
  if (s.volume_24h > 0.2) { score += 0.1; reasons.push('selling volume present'); }

  return { state: MARKET_STATES.TREASURY_SELL_PRESSURE, score: Math.min(1, score), reasons };
}

function scoreUnlockOverhang(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.unlock_pressure > 0.5) { score += 0.4; reasons.push('major unlock approaching'); }
  if (s.price_momentum_24h < 0) { score += 0.2; reasons.push('pre-unlock weakness'); }
  if (s.exchange_inflow > 0.2) { score += 0.2; reasons.push('anticipatory selling'); }
  if (s.leverage_pressure > 0.3) { score += 0.2; reasons.push('short positioning building'); }

  return { state: MARKET_STATES.UNLOCK_OVERHANG, score: Math.min(1, score), reasons };
}

function scoreStructurallyWeakRally(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.price_momentum_24h > 0.05) { score += 0.15; reasons.push('price rising'); }
  if (s.volume_24h < 0.2) { score += 0.25; reasons.push('low volume support'); }
  if (s.liquidity < 0.2) { score += 0.2; reasons.push('poor liquidity'); }
  if (s.fundamentals_strength < 0.2) { score += 0.2; reasons.push('weak fundamentals'); }
  if (s.whale_activity < 0.15) { score += 0.2; reasons.push('no smart money confirmation'); }

  return { state: MARKET_STATES.STRUCTURALLY_WEAK_RALLY, score: Math.min(1, score), reasons };
}

function scoreManipulationRisk(s: SignalSnapshot): StateCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (s.security_risk > 0.6) { score += 0.35; reasons.push('security flags elevated'); }
  if (s.holder_concentration > 0.7) { score += 0.25; reasons.push('high concentration'); }
  if (s.liquidity < 0.15) { score += 0.2; reasons.push('extremely thin liquidity'); }
  if (s.pair_age_hours !== null && s.pair_age_hours < 24) {
    score += 0.2; reasons.push('very new');
  }

  return { state: MARKET_STATES.MANIPULATION_RISK, score: Math.min(1, score), reasons };
}
