/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     UNIFIED REGIME ENGINE — Layer 8  (v2.0)                                   ║
 * ║                                                                               ║
 * ║   Three-level regime classification:                                          ║
 * ║     1. MACRO — global risk posture (risk-on / risk-off / neutral)            ║
 * ║     2. ECOSYSTEM — chain-level health (ethereum, solana, bsc, etc.)          ║
 * ║     3. TOKEN — asset-level state (from state-engine.ts)                      ║
 * ║                                                                               ║
 * ║   v2 improvements over v1:                                                    ║
 * ║     - Realized volatility replaces naive 1h extrapolation                    ║
 * ║     - Explicit data_unavailable states when coverage is low                  ║
 * ║     - Versioned config for threshold governance                              ║
 * ║     - Coverage-aware confidence modifier                                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { SignalSnapshot } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSIONED CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const REGIME_CONFIG = {
  version: '2.0.0',
  updatedAt: '2026-03-13',

  macro: {
    btcWeeklyStrongRally: 10,
    btcWeeklyPositive: 3,
    btcWeeklySharpDecline: -10,
    btcWeeklyNegative: -3,
    fundingElevated: 0.05,
    fundingNegative: -0.02,
    longShortExtreme: 2.0,
    longShortShortHeavy: 0.8,
    greedThreshold: 75,
    fearThreshold: 25,
    stablecoinInflow: 2,
    stablecoinOutflow: -2,
    oiRapidExpansion: 10,
    riskOnThreshold: 2.5,
    transitionBullishThreshold: 1,
    riskOffThreshold: -2.5,
    transitionBearishThreshold: -1,
  },

  ecosystem: {
    tvlRisingThreshold: 5,
    tvlFallingThreshold: -5,
    tvlThriving: 15,
    tvlStressed: -15,
    activityRising: 10,
    activityFalling: -10,
    activityThriving: 20,
    activityStressed: -20,
  },

  volatility: {
    extremeHigh: 200,
    high: 120,
    elevated: 75,
    normal: 40,
    low: 15,
  },

  confidenceModifier: {
    riskOffPenalty: 0.15,
    transitionBearishPenalty: 0.08,
    riskOnBoost: 0.05,
    ecosystemCrisisPenalty: 0.15,
    ecosystemStressedPenalty: 0.1,
    ecosystemWeakeningPenalty: 0.05,
    ecosystemThrivingBoost: 0.05,
    volExtremeHighPenalty: 0.1,
    volHighPenalty: 0.05,
    transitionHighPenalty: 0.1,
    transitionElevatedPenalty: 0.05,
    smallCapAdverseExtra: 0.08,
    smallCapVolExtra: 0.05,
    lowCoveragePenalty: 0.12,
  },
} as const;

export type RegimeConfigVersion = typeof REGIME_CONFIG.version;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type MacroPosture = 'risk_on' | 'risk_off' | 'neutral' | 'transition_bearish' | 'transition_bullish' | 'data_unavailable';

export type EcosystemHealth = 'thriving' | 'growing' | 'stable' | 'weakening' | 'stressed' | 'crisis' | 'unknown';

export type VolatilityRegime = 'extreme_high' | 'high' | 'elevated' | 'normal' | 'low' | 'extreme_low';

export type TransitionRisk = 'low' | 'moderate' | 'elevated' | 'high';

export interface MacroContext {
  posture: MacroPosture;
  confidence: number;
  drivers: string[];
  btcTrend: 'bullish' | 'bearish' | 'neutral';
  btcDominanceTrend: 'rising' | 'falling' | 'stable';
  overallLeverage: 'low' | 'moderate' | 'high' | 'extreme';
  /** Number of available macro inputs (out of 10) */
  coverage: number;
}

export interface EcosystemPosture {
  chain: string;
  health: EcosystemHealth;
  tvlTrend: 'rising' | 'falling' | 'stable';
  activityTrend: 'rising' | 'falling' | 'stable';
  capitalFlow: 'inflow' | 'outflow' | 'neutral';
  coverage: number;
}

export interface VolatilityContext {
  regime: VolatilityRegime;
  /** Realized annualized volatility (%) */
  realizedAnnualized: number;
  trend: 'expanding' | 'contracting' | 'stable';
  method: 'realized_multi' | 'intraday_proxy';
}

export interface RegimeTransition {
  risk: TransitionRisk;
  probability: number;
  direction: 'improving' | 'deteriorating' | 'stable';
  signals: string[];
}

export interface UnifiedRegime {
  macro: MacroContext;
  ecosystem: EcosystemPosture;
  volatility: VolatilityContext;
  transition: RegimeTransition;
  summary: string;
  confidenceModifier: number;
  /** Overall regime data coverage (0–1): how much of the regime is grounded in real data */
  dataCoverage: number;
  configVersion: string;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTERNAL DATA INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface MarketWideInputs {
  btc_price_change_24h: number;
  btc_price_change_7d: number;
  btc_dominance: number;
  btc_dominance_change_7d: number;
  total_market_cap_change_24h: number;
  total_open_interest_change_24h: number;
  aggregate_funding_rate: number;
  aggregate_long_short_ratio: number;
  fear_greed_index: number;
  stablecoin_market_cap_change_7d: number;
  ecosystem_tvl?: number;
  ecosystem_tvl_change_7d?: number;
  ecosystem_active_addresses_change_7d?: number;
  ecosystem_chain?: string;
  sector?: string;
  capBucket?: string;
  /** Historical price returns for realized volatility (e.g. last 30 hourly returns) */
  priceReturns?: number[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COVERAGE ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════

function assessMacroCoverage(market: MarketWideInputs, wasDefaulted: Set<string>): number {
  const totalFields = 10;
  return (totalFields - wasDefaulted.size) / totalFields;
}

function assessEcosystemCoverage(market: MarketWideInputs, wasDefaulted: Set<string>): number {
  let available = 1; // chain is always present
  if (!wasDefaulted.has('ecosystem_tvl_change_7d')) available++;
  if (!wasDefaulted.has('ecosystem_active_addresses_change_7d')) available++;
  if (market.ecosystem_tvl !== undefined) available++;
  return available / 4;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MACRO POSTURE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function classifyMacro(market: MarketWideInputs, coverage: number): MacroContext {
  const C = REGIME_CONFIG.macro;
  const drivers: string[] = [];

  if (coverage < 0.3) {
    return {
      posture: 'data_unavailable',
      confidence: 15,
      drivers: ['Insufficient macro data — operating without market context'],
      btcTrend: 'neutral',
      btcDominanceTrend: 'stable',
      overallLeverage: 'moderate',
      coverage,
    };
  }

  let btcScore = 0;
  if (market.btc_price_change_7d > C.btcWeeklyStrongRally) { btcScore += 2; drivers.push('BTC strong weekly rally'); }
  else if (market.btc_price_change_7d > C.btcWeeklyPositive) { btcScore += 1; drivers.push('BTC positive weekly'); }
  else if (market.btc_price_change_7d < C.btcWeeklySharpDecline) { btcScore -= 2; drivers.push('BTC sharp weekly decline'); }
  else if (market.btc_price_change_7d < C.btcWeeklyNegative) { btcScore -= 1; drivers.push('BTC negative weekly'); }

  let leverageScore = 0;
  if (market.aggregate_funding_rate > C.fundingElevated) { leverageScore -= 1; drivers.push('Elevated aggregate funding rate'); }
  else if (market.aggregate_funding_rate < C.fundingNegative) { leverageScore += 0.5; drivers.push('Negative funding — potential short squeeze setup'); }

  if (market.aggregate_long_short_ratio > C.longShortExtreme) { leverageScore -= 1; drivers.push('Extreme long-heavy positioning'); }
  else if (market.aggregate_long_short_ratio < C.longShortShortHeavy) { leverageScore += 0.5; drivers.push('Short-heavy positioning'); }

  let sentimentScore = 0;
  if (market.fear_greed_index > C.greedThreshold) { sentimentScore += 0.5; drivers.push('Greed territory'); }
  else if (market.fear_greed_index < C.fearThreshold) { sentimentScore -= 0.5; drivers.push('Fear territory'); }

  let flowScore = 0;
  if (market.stablecoin_market_cap_change_7d > C.stablecoinInflow) { flowScore += 1; drivers.push('Stablecoin inflows — capital entering crypto'); }
  else if (market.stablecoin_market_cap_change_7d < C.stablecoinOutflow) { flowScore -= 1; drivers.push('Stablecoin outflows — capital leaving crypto'); }

  if (market.total_open_interest_change_24h > C.oiRapidExpansion) { flowScore -= 0.5; drivers.push('Rapid OI expansion'); }

  const totalScore = btcScore + leverageScore + sentimentScore + flowScore;

  const btcTrend: MacroContext['btcTrend'] =
    market.btc_price_change_7d > C.btcWeeklyPositive ? 'bullish' :
    market.btc_price_change_7d < C.btcWeeklyNegative ? 'bearish' : 'neutral';

  const btcDominanceTrend: MacroContext['btcDominanceTrend'] =
    market.btc_dominance_change_7d > 1 ? 'rising' :
    market.btc_dominance_change_7d < -1 ? 'falling' : 'stable';

  const overallLeverage: MacroContext['overallLeverage'] =
    market.aggregate_funding_rate > 0.08 || market.aggregate_long_short_ratio > 3.0 ? 'extreme' :
    market.aggregate_funding_rate > 0.04 || market.aggregate_long_short_ratio > 2.0 ? 'high' :
    market.aggregate_funding_rate > 0.01 ? 'moderate' : 'low';

  let posture: MacroPosture;
  let confidence: number;

  if (totalScore >= C.riskOnThreshold) { posture = 'risk_on'; confidence = Math.min(90, 60 + totalScore * 8); }
  else if (totalScore >= C.transitionBullishThreshold) { posture = 'transition_bullish'; confidence = 55 + totalScore * 5; }
  else if (totalScore <= C.riskOffThreshold) { posture = 'risk_off'; confidence = Math.min(90, 60 + Math.abs(totalScore) * 8); }
  else if (totalScore <= C.transitionBearishThreshold) { posture = 'transition_bearish'; confidence = 55 + Math.abs(totalScore) * 5; }
  else { posture = 'neutral'; confidence = 50; }

  // Reduce confidence proportionally to missing data
  confidence *= (0.5 + 0.5 * coverage);

  return { posture, confidence: clamp(confidence, 15, 95), drivers, btcTrend, btcDominanceTrend, overallLeverage, coverage };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ECOSYSTEM POSTURE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function classifyEcosystem(market: MarketWideInputs, coverage: number): EcosystemPosture {
  const C = REGIME_CONFIG.ecosystem;
  const chain = market.ecosystem_chain ?? 'ethereum';

  if (coverage < 0.25) {
    return { chain, health: 'unknown', tvlTrend: 'stable', activityTrend: 'stable', capitalFlow: 'neutral', coverage };
  }

  const tvlChange = market.ecosystem_tvl_change_7d ?? 0;
  const activityChange = market.ecosystem_active_addresses_change_7d ?? 0;

  const tvlTrend: EcosystemPosture['tvlTrend'] =
    tvlChange > C.tvlRisingThreshold ? 'rising' : tvlChange < C.tvlFallingThreshold ? 'falling' : 'stable';

  const activityTrend: EcosystemPosture['activityTrend'] =
    activityChange > C.activityRising ? 'rising' : activityChange < C.activityFalling ? 'falling' : 'stable';

  let healthScore = 0;
  if (tvlChange > C.tvlThriving) healthScore += 2;
  else if (tvlChange > C.tvlRisingThreshold) healthScore += 1;
  else if (tvlChange < C.tvlStressed) healthScore -= 2;
  else if (tvlChange < C.tvlFallingThreshold) healthScore -= 1;

  if (activityChange > C.activityThriving) healthScore += 1.5;
  else if (activityChange > C.activityRising) healthScore += 0.5;
  else if (activityChange < C.activityStressed) healthScore -= 1.5;
  else if (activityChange < C.activityFalling) healthScore -= 0.5;

  let health: EcosystemHealth;
  if (healthScore >= 3) health = 'thriving';
  else if (healthScore >= 1.5) health = 'growing';
  else if (healthScore >= -0.5) health = 'stable';
  else if (healthScore >= -2) health = 'weakening';
  else if (healthScore >= -3) health = 'stressed';
  else health = 'crisis';

  const capitalFlow: EcosystemPosture['capitalFlow'] =
    tvlChange > 3 ? 'inflow' : tvlChange < -3 ? 'outflow' : 'neutral';

  return { chain, health, tvlTrend, activityTrend, capitalFlow, coverage };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REALIZED VOLATILITY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function computeRealizedVolatility(priceReturns: number[]): { annualized: number; method: 'realized_multi' | 'intraday_proxy' } {
  if (priceReturns.length < 5) {
    return { annualized: 0, method: 'intraday_proxy' };
  }

  const n = priceReturns.length;
  const mean = priceReturns.reduce((s, r) => s + r, 0) / n;
  const variance = priceReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  // Assume hourly returns → annualize: √(24*365)
  const periodsPerYear = 24 * 365;
  const annualized = stdDev * Math.sqrt(periodsPerYear) * 100;

  return { annualized, method: 'realized_multi' };
}

function classifyVolatility(signals: SignalSnapshot, market: MarketWideInputs): VolatilityContext {
  const C = REGIME_CONFIG.volatility;

  let annualized: number;
  let method: 'realized_multi' | 'intraday_proxy';

  if (market.priceReturns && market.priceReturns.length >= 5) {
    const rv = computeRealizedVolatility(market.priceReturns);
    annualized = rv.annualized;
    method = rv.method;
  } else {
    // Fallback: intraday proxy from single snapshot
    const priceMom1h = signals.price_momentum_1h;
    const intraday = Math.abs(priceMom1h * 24);
    annualized = intraday * Math.sqrt(365) * 100;
    method = 'intraday_proxy';
  }

  let regime: VolatilityRegime;
  if (annualized >= C.extremeHigh) regime = 'extreme_high';
  else if (annualized >= C.high) regime = 'high';
  else if (annualized >= C.elevated) regime = 'elevated';
  else if (annualized >= C.normal) regime = 'normal';
  else if (annualized >= C.low) regime = 'low';
  else regime = 'extreme_low';

  const shortTermVol = Math.abs(signals.price_momentum_1h);
  const longerTermVol = Math.abs(signals.price_momentum_24h / 24);
  const volRatio = longerTermVol > 0 ? shortTermVol / longerTermVol : 1;

  let trend: VolatilityContext['trend'];
  if (volRatio > 1.5) trend = 'expanding';
  else if (volRatio < 0.6) trend = 'contracting';
  else trend = 'stable';

  return { regime, realizedAnnualized: clamp(annualized, 0, 1000), trend, method };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITION RISK
// ═══════════════════════════════════════════════════════════════════════════════

function classifyTransitionRisk(
  macro: MacroContext,
  ecosystem: EcosystemPosture,
  volatility: VolatilityContext,
  signals: SignalSnapshot,
): RegimeTransition {
  const transitionSignals: string[] = [];
  let riskScore = 0;

  if (macro.posture === 'transition_bearish' || macro.posture === 'transition_bullish') {
    riskScore += 1.5;
    transitionSignals.push(`Macro in transition (${macro.posture})`);
  }
  if (macro.posture === 'data_unavailable') {
    riskScore += 0.8;
    transitionSignals.push('Macro data unavailable — elevated uncertainty');
  }

  if (macro.overallLeverage === 'extreme') {
    riskScore += 1.5;
    transitionSignals.push('Extreme aggregate leverage — deleveraging risk');
  } else if (macro.overallLeverage === 'high') {
    riskScore += 0.5;
    transitionSignals.push('High aggregate leverage');
  }

  if (ecosystem.health === 'stressed' || ecosystem.health === 'crisis') {
    riskScore += 1;
    transitionSignals.push(`Ecosystem under ${ecosystem.health}`);
  }
  if (ecosystem.health === 'unknown') {
    riskScore += 0.5;
    transitionSignals.push('Ecosystem health unknown — insufficient data');
  }

  if (volatility.trend === 'expanding' && (volatility.regime === 'high' || volatility.regime === 'extreme_high')) {
    riskScore += 1;
    transitionSignals.push('Volatility expanding into high regime');
  }

  if (signals.leverage_pressure > 0.7 && signals.buy_sell_ratio < 0.4) {
    riskScore += 1;
    transitionSignals.push('Leverage-heavy with weak spot demand');
  }
  if (signals.whale_activity > 0.7 && signals.exchange_inflow > 0.6) {
    riskScore += 0.5;
    transitionSignals.push('Whale activity concurrent with exchange inflows — potential distribution');
  }

  let risk: TransitionRisk;
  if (riskScore >= 4) risk = 'high';
  else if (riskScore >= 2.5) risk = 'elevated';
  else if (riskScore >= 1) risk = 'moderate';
  else risk = 'low';

  const probability = clamp(riskScore / 6, 0, 0.95);

  let direction: RegimeTransition['direction'];
  if (macro.posture === 'risk_on' && (ecosystem.health === 'thriving' || ecosystem.health === 'growing')) direction = 'improving';
  else if (macro.posture === 'risk_off' || ecosystem.health === 'crisis' || ecosystem.health === 'stressed') direction = 'deteriorating';
  else direction = 'stable';

  return { risk, probability, direction, signals: transitionSignals };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGIME SUMMARY BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildSummary(
  macro: MacroContext,
  ecosystem: EcosystemPosture,
  volatility: VolatilityContext,
  transition: RegimeTransition,
  dataCoverage: number,
): string {
  const macroLabel: Record<MacroPosture, string> = {
    risk_on: 'risk-on environment',
    risk_off: 'risk-off environment',
    neutral: 'neutral macro posture',
    transition_bearish: 'transitioning toward risk-off',
    transition_bullish: 'transitioning toward risk-on',
    data_unavailable: 'macro context unavailable',
  };

  const ecoLabel: Record<EcosystemHealth, string> = {
    thriving: 'thriving',
    growing: 'growing',
    stable: 'stable',
    weakening: 'weakening',
    stressed: 'stressed',
    crisis: 'in crisis',
    unknown: 'unknown (insufficient data)',
  };

  const parts = [
    `Macro: ${macroLabel[macro.posture]} (BTC ${macro.btcTrend}, dominance ${macro.btcDominanceTrend}, leverage ${macro.overallLeverage}).`,
    `Ecosystem: ${ecosystem.chain} is ${ecoLabel[ecosystem.health]} (TVL ${ecosystem.tvlTrend}, activity ${ecosystem.activityTrend}, capital ${ecosystem.capitalFlow}).`,
    `Volatility: ${volatility.regime} regime (${volatility.realizedAnnualized.toFixed(0)}% ann.), ${volatility.trend} [${volatility.method}].`,
  ];

  if (transition.risk !== 'low') {
    parts.push(`Transition risk: ${transition.risk} — ${transition.signals.slice(0, 2).join('; ')}.`);
  }

  if (dataCoverage < 0.5) {
    parts.push(`⚠ Regime data coverage: ${(dataCoverage * 100).toFixed(0)}% — conclusions have elevated uncertainty.`);
  }

  return parts.join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE MODIFIER
// ═══════════════════════════════════════════════════════════════════════════════

function computeConfidenceModifier(
  macro: MacroContext,
  ecosystem: EcosystemPosture,
  volatility: VolatilityContext,
  transition: RegimeTransition,
  market: MarketWideInputs,
  dataCoverage: number,
): number {
  const C = REGIME_CONFIG.confidenceModifier;
  let modifier = 1.0;

  // Macro
  if (macro.posture === 'risk_off') modifier -= C.riskOffPenalty;
  else if (macro.posture === 'transition_bearish') modifier -= C.transitionBearishPenalty;
  else if (macro.posture === 'risk_on') modifier += C.riskOnBoost;
  else if (macro.posture === 'data_unavailable') modifier -= C.lowCoveragePenalty;

  // Ecosystem
  if (ecosystem.health === 'crisis') modifier -= C.ecosystemCrisisPenalty;
  else if (ecosystem.health === 'stressed') modifier -= C.ecosystemStressedPenalty;
  else if (ecosystem.health === 'weakening') modifier -= C.ecosystemWeakeningPenalty;
  else if (ecosystem.health === 'thriving') modifier += C.ecosystemThrivingBoost;
  else if (ecosystem.health === 'unknown') modifier -= C.lowCoveragePenalty * 0.5;

  // Volatility
  if (volatility.regime === 'extreme_high') modifier -= C.volExtremeHighPenalty;
  else if (volatility.regime === 'high') modifier -= C.volHighPenalty;

  // Transition risk
  if (transition.risk === 'high') modifier -= C.transitionHighPenalty;
  else if (transition.risk === 'elevated') modifier -= C.transitionElevatedPenalty;

  // Cap-bucket context
  const cap = market.capBucket;
  if (cap === 'micro' || cap === 'small') {
    if (macro.posture === 'risk_off' || ecosystem.health === 'stressed' || ecosystem.health === 'crisis') {
      modifier -= C.smallCapAdverseExtra;
    }
    if (volatility.regime === 'extreme_high' || volatility.regime === 'high') {
      modifier -= C.smallCapVolExtra;
    }
  }

  // Low overall regime coverage reduces trust
  if (dataCoverage < 0.4) {
    modifier -= C.lowCoveragePenalty;
  } else if (dataCoverage < 0.6) {
    modifier -= C.lowCoveragePenalty * 0.5;
  }

  return clamp(modifier, 0.5, 1.2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

export function classifyRegime(
  signals: SignalSnapshot,
  marketWide?: Partial<MarketWideInputs>,
): UnifiedRegime {
  const { fullMarket, defaultedFields } = withDefaults(marketWide);

  const macroCov = assessMacroCoverage(fullMarket, defaultedFields);
  const ecoCov = assessEcosystemCoverage(fullMarket, defaultedFields);
  const dataCoverage = (macroCov * 0.5 + ecoCov * 0.3 + (fullMarket.priceReturns && fullMarket.priceReturns.length >= 5 ? 1 : 0.3) * 0.2);

  const macro = classifyMacro(fullMarket, macroCov);
  const ecosystem = classifyEcosystem(fullMarket, ecoCov);
  const volatility = classifyVolatility(signals, fullMarket);
  const transition = classifyTransitionRisk(macro, ecosystem, volatility, signals);

  const summary = buildSummary(macro, ecosystem, volatility, transition, dataCoverage);
  const confidenceModifier = computeConfidenceModifier(macro, ecosystem, volatility, transition, fullMarket, dataCoverage);

  return {
    macro,
    ecosystem,
    volatility,
    transition,
    summary,
    confidenceModifier,
    dataCoverage,
    configVersion: REGIME_CONFIG.version,
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function withDefaults(partial?: Partial<MarketWideInputs>): { fullMarket: MarketWideInputs; defaultedFields: Set<string> } {
  const defaultedFields = new Set<string>();

  function d<T>(key: string, value: T | undefined, fallback: T): T {
    if (value === undefined || value === null) {
      defaultedFields.add(key);
      return fallback;
    }
    return value;
  }

  const fullMarket: MarketWideInputs = {
    btc_price_change_24h: d('btc_price_change_24h', partial?.btc_price_change_24h, 0),
    btc_price_change_7d: d('btc_price_change_7d', partial?.btc_price_change_7d, 0),
    btc_dominance: d('btc_dominance', partial?.btc_dominance, 50),
    btc_dominance_change_7d: d('btc_dominance_change_7d', partial?.btc_dominance_change_7d, 0),
    total_market_cap_change_24h: d('total_market_cap_change_24h', partial?.total_market_cap_change_24h, 0),
    total_open_interest_change_24h: d('total_open_interest_change_24h', partial?.total_open_interest_change_24h, 0),
    aggregate_funding_rate: d('aggregate_funding_rate', partial?.aggregate_funding_rate, 0.01),
    aggregate_long_short_ratio: d('aggregate_long_short_ratio', partial?.aggregate_long_short_ratio, 1.0),
    fear_greed_index: d('fear_greed_index', partial?.fear_greed_index, 50),
    stablecoin_market_cap_change_7d: d('stablecoin_market_cap_change_7d', partial?.stablecoin_market_cap_change_7d, 0),
    ecosystem_tvl: partial?.ecosystem_tvl,
    ecosystem_tvl_change_7d: d('ecosystem_tvl_change_7d', partial?.ecosystem_tvl_change_7d, 0),
    ecosystem_active_addresses_change_7d: d('ecosystem_active_addresses_change_7d', partial?.ecosystem_active_addresses_change_7d, 0),
    ecosystem_chain: partial?.ecosystem_chain ?? 'ethereum',
    sector: partial?.sector,
    capBucket: partial?.capBucket,
    priceReturns: partial?.priceReturns,
  };

  return { fullMarket, defaultedFields };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
