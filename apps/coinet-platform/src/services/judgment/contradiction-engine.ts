/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     CONTRADICTION ENGINE v1                                                   ║
 * ║                                                                               ║
 * ║   Detects when the market story is internally inconsistent.                   ║
 * ║   This is where Coinet becomes strongest — where the story breaks.            ║
 * ║                                                                               ║
 * ║   For every analysis:                                                         ║
 * ║   - top contradictions                                                        ║
 * ║   - contradiction severity                                                    ║
 * ║   - which scores they affect                                                  ║
 * ║   - whether contradiction is resolvable or structural                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  CONTRADICTION_CLASSES,
  type ContradictionSeverity,
} from './taxonomies';
import type { Contradiction, JudgmentContradictions } from './types';
import type { SignalSnapshot } from './signal-snapshot';

/**
 * L3.3-B identity confidence context for contradiction gate enforcement.
 * Supplied by the judgment orchestrator when L3.3 confidence state exists.
 */
export interface IdentityConfidenceContext {
  band: string;
  allowed: boolean;
  mode: string;
  scars: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect contradictions in the current signal state.
 * Returns a ranked list of contradictions with severity and affected scores.
 *
 * When identityGate is supplied, the engine enforces L3.3-B confidence rights:
 * - DENY removes the entity from contradiction graph participation
 * - CONDITIONAL/ALLOW_WITH_SCAR attaches a disclosure note
 */
export function detectContradictions(
  signals: SignalSnapshot,
  identityGate?: IdentityConfidenceContext,
): JudgmentContradictions {
  if (identityGate && !identityGate.allowed) {
    return {
      items: [],
      load: 0,
      structural_warning: false,
      identity_gate_denial: `Identity confidence gate denied: band=${identityGate.band} mode=${identityGate.mode}`,
    };
  }

  const detected: Contradiction[] = [];

  detected.push(...checkLeverageVsSpot(signals));
  detected.push(...checkPriceVsFundamentals(signals));
  detected.push(...checkSentimentVsOnchain(signals));
  detected.push(...checkTvlVsInflows(signals));
  detected.push(...checkNarrativeBeforeFundamentals(signals));
  detected.push(...checkLateWhaleEntry(signals));
  detected.push(...checkVolumeVsLiquidity(signals));
  detected.push(...checkPriceVsSpotStructure(signals));
  detected.push(...checkPositiveVsSecurity(signals));
  detected.push(...checkGrowthVsUnlock(signals));

  detected.sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity));

  const top = detected.slice(0, 5);
  const load = computeContradictionLoad(detected);
  const structural = detected.some(
    c => !c.resolvable && (c.severity === 'critical' || c.severity === 'high')
  );

  const result: JudgmentContradictions & { identity_gate_note?: string } = {
    items: top,
    load,
    structural_warning: structural,
  };

  if (identityGate && (identityGate.mode === 'ALLOW_WITH_SCAR' || identityGate.mode === 'CONDITIONAL')) {
    result.identity_gate_note = `Identity confidence: band=${identityGate.band} scars=[${identityGate.scars.join(',')}]`;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDIVIDUAL CONTRADICTION CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

function checkLeverageVsSpot(s: SignalSnapshot): Contradiction[] {
  const results: Contradiction[] = [];
  const leverageStrong = s.leverage_pressure > 0.5;
  const spotWeak = s.volume_24h < 0.25 || s.buy_sell_ratio < 0.45;

  if (leverageStrong && spotWeak) {
    const gap = s.leverage_pressure - s.volume_24h;
    results.push({
      class: CONTRADICTION_CLASSES.LEVERAGE_VS_SPOT,
      severity: gap > 0.4 ? 'critical' : gap > 0.25 ? 'high' : 'moderate',
      positive_side: ['open_interest', 'funding_rate'],
      negative_side: ['volume_24h', 'txns_buys'],
      affects_scores: ['risk', 'confidence', 'timing'],
      resolvable: true,
      summary: 'Derivatives participation exceeds spot confirmation. Rally relies on leverage, not organic demand.',
    });
  }
  return results;
}

/**
 * Applicability gate for fundamentals-based contradictions. A "weak fundamentals"
 * contradiction is only honest when fundamentals are the RIGHT lens for this asset
 * AND we actually have the data. For assets where fundamentals are NOT_APPLICABLE
 * (e.g. memecoins) or we lack a source (APPLICABLE_NO_DATA — e.g. BTC's network
 * fundamentals), absence is not a contradiction — we must never invent weakness.
 * Legacy fallback: when no applicability is attached, behave as before.
 */
function fundamentalsJudgeable(s: SignalSnapshot): boolean {
  const a = s._applicability;
  if (!a) return true;
  return a.fundamentals_protocol === 'SCORED' || a.fundamentals_network === 'SCORED';
}

function checkPriceVsFundamentals(s: SignalSnapshot): Contradiction[] {
  const results: Contradiction[] = [];
  if (!fundamentalsJudgeable(s)) return results;
  const priceBullish = s.price_momentum_24h > 0.15;
  const fundamentalsWeak = s.fundamentals_strength < 0.2;

  if (priceBullish && fundamentalsWeak) {
    results.push({
      class: CONTRADICTION_CLASSES.PRICE_VS_FUNDAMENTALS,
      severity: s.fundamentals_strength < 0.1 ? 'high' : 'moderate',
      positive_side: ['price_change_24h'],
      negative_side: ['tvl', 'protocol_fees', 'revenue'],
      affects_scores: ['confidence', 'thesis_coherence'],
      resolvable: true,
      summary: 'Price rising without fundamental improvement. Move may be speculative.',
    });
  }
  return results;
}

function checkSentimentVsOnchain(s: SignalSnapshot): Contradiction[] {
  const results: Contradiction[] = [];
  const sentimentStrong = s.sentiment > 0.4 && s.narrative_intensity > 0.4;
  const whalesDistributing = s.exchange_inflow > 0.35 && s.whale_activity < 0.3;

  if (sentimentStrong && whalesDistributing) {
    results.push({
      class: CONTRADICTION_CLASSES.SENTIMENT_VS_ONCHAIN,
      severity: s.exchange_inflow > 0.5 ? 'critical' : 'high',
      positive_side: ['sentiment_score', 'social_dominance'],
      negative_side: ['whale_net_flow', 'exchange_inflow'],
      affects_scores: ['confidence', 'opportunity'],
      resolvable: false,
      summary: 'Social hype is strong, but smart money is distributing. Retail may be buying the top.',
    });
  }
  return results;
}

function checkTvlVsInflows(s: SignalSnapshot): Contradiction[] {
  const results: Contradiction[] = [];
  if (!fundamentalsJudgeable(s)) return results;
  const tvlUp = s.tvl_trend > 0.4;
  const revenueWeak = s.revenue_quality < 0.15;

  if (tvlUp && revenueWeak) {
    results.push({
      class: CONTRADICTION_CLASSES.TVL_VS_INFLOWS,
      severity: 'moderate',
      positive_side: ['tvl_usd'],
      negative_side: ['protocol_fees', 'protocol_revenue'],
      affects_scores: ['quality', 'thesis_coherence'],
      resolvable: true,
      summary: 'TVL rising but fee revenue remains flat. Growth may be valuation-driven, not usage-driven.',
    });
  }
  return results;
}

function checkNarrativeBeforeFundamentals(s: SignalSnapshot): Contradiction[] {
  const results: Contradiction[] = [];
  if (!fundamentalsJudgeable(s)) return results;
  const narrativeHot = s.narrative_intensity > 0.5;
  const fundamentalsLagging = s.fundamentals_strength < 0.25;

  if (narrativeHot && fundamentalsLagging) {
    results.push({
      class: CONTRADICTION_CLASSES.NARRATIVE_BEFORE_FUNDAMENTALS,
      severity: s.fundamentals_strength < 0.1 ? 'high' : 'moderate',
      positive_side: ['sentiment', 'news_intensity', 'social_dominance'],
      negative_side: ['tvl', 'protocol_fees', 'active_addresses'],
      affects_scores: ['timing', 'thesis_coherence'],
      resolvable: true,
      summary: 'Narrative moved before fundamentals caught up. Story is ahead of substance.',
    });
  }
  return results;
}

function checkLateWhaleEntry(s: SignalSnapshot): Contradiction[] {
  const results: Contradiction[] = [];
  const whalesActive = s.whale_activity > 0.4;
  const alreadyExtended = s.price_momentum_24h > 0.2 && s.leverage_pressure > 0.5;

  if (whalesActive && alreadyExtended) {
    results.push({
      class: CONTRADICTION_CLASSES.LATE_WHALE_ENTRY,
      severity: 'moderate',
      positive_side: ['whale_net_flow', 'large_transactions'],
      negative_side: ['price_change_24h', 'open_interest_change'],
      affects_scores: ['timing', 'risk'],
      resolvable: false,
      summary: 'Whale entry after significant price and leverage expansion. May be late-stage participation.',
    });
  }
  return results;
}

function checkVolumeVsLiquidity(s: SignalSnapshot): Contradiction[] {
  const results: Contradiction[] = [];
  const volumeHigh = s.volume_24h > 0.3;
  const liquidityLow = s.liquidity < 0.15;

  if (volumeHigh && liquidityLow) {
    const ratio = s.volume_24h / Math.max(s.liquidity, 0.01);
    results.push({
      class: CONTRADICTION_CLASSES.VOLUME_VS_LIQUIDITY,
      severity: ratio > 5 ? 'critical' : ratio > 3 ? 'high' : 'moderate',
      positive_side: ['volume_24h'],
      negative_side: ['liquidity_usd'],
      affects_scores: ['risk', 'confidence'],
      resolvable: true,
      summary: 'Volume significantly exceeds available liquidity. High slippage risk and potential manipulation.',
    });
  }
  return results;
}

function checkPriceVsSpotStructure(s: SignalSnapshot): Contradiction[] {
  const results: Contradiction[] = [];
  const priceUp = s.price_momentum_24h > 0.1;
  const spotWeak = s.volume_24h < 0.15 && s.buy_sell_ratio < 0.5 && s.liquidity < 0.2;

  if (priceUp && spotWeak) {
    results.push({
      class: CONTRADICTION_CLASSES.PRICE_VS_SPOT_STRUCTURE,
      severity: 'high',
      positive_side: ['price_change_24h'],
      negative_side: ['volume_24h', 'txns_buys', 'liquidity'],
      affects_scores: ['risk', 'confidence'],
      resolvable: true,
      summary: 'Price is rising but spot structure is weak — low volume, thin liquidity, poor buy pressure.',
    });
  }
  return results;
}

function checkPositiveVsSecurity(s: SignalSnapshot): Contradiction[] {
  const results: Contradiction[] = [];
  const positiveSignals = s.price_momentum_24h > 0.05 || s.narrative_intensity > 0.3;
  const securityBad = s.security_risk > 0.6;

  if (positiveSignals && securityBad) {
    results.push({
      class: CONTRADICTION_CLASSES.POSITIVE_SIGNALS_VS_SECURITY,
      severity: s.security_risk > 0.8 ? 'critical' : 'high',
      positive_side: ['price_change_24h', 'sentiment'],
      negative_side: ['risk_score', 'is_honeypot', 'concentration_risk'],
      affects_scores: ['risk', 'confidence', 'legitimacy'],
      resolvable: false,
      summary: 'Positive market signals but elevated security risk. Proceed with extreme caution.',
    });
  }
  return results;
}

function checkGrowthVsUnlock(s: SignalSnapshot): Contradiction[] {
  const results: Contradiction[] = [];
  const growing = s.price_momentum_24h > 0.05 || s.tvl_trend > 0.3;
  const unlockNear = s.unlock_pressure > 0.3;

  if (growing && unlockNear) {
    results.push({
      class: CONTRADICTION_CLASSES.GROWTH_VS_UNLOCK,
      severity: s.unlock_pressure > 0.5 ? 'high' : 'moderate',
      positive_side: ['price_change_24h', 'tvl'],
      negative_side: ['unlock_next_usd'],
      affects_scores: ['risk', 'timing'],
      resolvable: false,
      summary: 'Growth metrics are positive but significant unlock approaching. Supply overhang may cap upside.',
    });
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function severityOrder(s: ContradictionSeverity): number {
  switch (s) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'moderate': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

function computeContradictionLoad(contradictions: Contradiction[]): number {
  if (contradictions.length === 0) return 0;

  let total = 0;
  for (const c of contradictions) {
    total += severityOrder(c.severity) / 4;
  }
  return Math.min(1, total / Math.max(contradictions.length, 1) * (1 + contradictions.length * 0.1));
}
