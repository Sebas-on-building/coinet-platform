/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     CONFIDENCE ENGINE v1                                                      ║
 * ║                                                                               ║
 * ║   Tells the user how much to trust the analysis.                              ║
 * ║                                                                               ║
 * ║   Confidence is computed from:                                                ║
 * ║   - Source reliability / data completeness                                    ║
 * ║   - Data freshness                                                            ║
 * ║   - Cross-source agreement                                                    ║
 * ║   - Contradiction severity                                                    ║
 * ║   - State classification clarity                                              ║
 * ║                                                                               ║
 * ║   Output: overall band, numeric score, per-category breakdown                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { toConfidenceBand } from './taxonomies';
import type { JudgmentConfidence, ConfidenceBreakdown, JudgmentContradictions, JudgmentState } from './types';
import type { SignalSnapshot } from './signal-snapshot';

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHTS — how much each category contributes to overall confidence
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_WEIGHTS = {
  market: 0.30,
  fundamentals: 0.25,
  onchain: 0.25,
  narrative: 0.20,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConfidenceInput {
  signals: SignalSnapshot;
  contradictions: JudgmentContradictions;
  state: JudgmentState;
}

/**
 * Compute confidence across all categories with penalties
 * for contradictions, data gaps, and state ambiguity.
 */
export function computeConfidence(input: ConfidenceInput): JudgmentConfidence {
  const { signals, contradictions, state } = input;

  const breakdown = computeBreakdown(signals);

  let raw =
    breakdown.market * CATEGORY_WEIGHTS.market +
    breakdown.fundamentals * CATEGORY_WEIGHTS.fundamentals +
    breakdown.onchain * CATEGORY_WEIGHTS.onchain +
    breakdown.narrative * CATEGORY_WEIGHTS.narrative;

  // --- Penalties ---

  // Contradiction penalty: more severe contradictions reduce confidence
  const contradictionPenalty = contradictions.load * 0.25;
  raw -= contradictionPenalty;

  // State ambiguity penalty: low state confidence weakens overall confidence
  if (state.confidence < 0.4) {
    raw -= 0.10;
  } else if (state.confidence < 0.6) {
    raw -= 0.05;
  }

  // Structural warning is a hard penalty
  if (contradictions.structural_warning) {
    raw -= 0.10;
  }

  // Data completeness penalty
  if (signals.data_completeness < 0.5) {
    raw -= 0.15;
  } else if (signals.data_completeness < 0.75) {
    raw -= 0.05;
  }

  // Freshness penalty
  if (signals.data_freshness < 0.5) {
    raw -= 0.10;
  }

  const score = clamp(raw, 0, 1);

  const primaryUncertainty = identifyPrimaryUncertainty(breakdown, contradictions, signals);

  return {
    overall: toConfidenceBand(score),
    score,
    breakdown,
    primary_uncertainty: primaryUncertainty,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PER-CATEGORY CONFIDENCE
// ═══════════════════════════════════════════════════════════════════════════════

function computeBreakdown(signals: SignalSnapshot): ConfidenceBreakdown {
  return {
    market: computeMarketConfidence(signals),
    fundamentals: computeFundamentalsConfidence(signals),
    onchain: computeOnchainConfidence(signals),
    narrative: computeNarrativeConfidence(signals),
  };
}

/**
 * Market confidence: do we have reliable price, volume, liquidity data?
 */
function computeMarketConfidence(s: SignalSnapshot): number {
  let conf = 0.5;

  // Volume available and non-trivial
  if (s.volume_24h > 0.01) conf += 0.15;
  // Liquidity available
  if (s.liquidity > 0.01) conf += 0.15;
  // Pair age known
  if (s.pair_age_hours !== null) conf += 0.1;
  // Derivatives data available (leverage_pressure != neutral default)
  if (s.leverage_pressure !== 0.5) conf += 0.1;

  return clamp(conf, 0, 1);
}

/**
 * Fundamentals confidence: do we have protocol data?
 */
function computeFundamentalsConfidence(s: SignalSnapshot): number {
  let conf = 0.3;

  if (s.tvl_trend > 0) conf += 0.2;
  if (s.revenue_quality > 0) conf += 0.25;
  if (s.fundamentals_strength > 0) conf += 0.25;

  return clamp(conf, 0, 1);
}

/**
 * On-chain confidence: do we have wallet and exchange flow data?
 */
function computeOnchainConfidence(s: SignalSnapshot): number {
  let conf = 0.3;

  if (s.whale_activity !== 0.5) conf += 0.2;
  if (s.exchange_inflow > 0 || s.exchange_outflow > 0) conf += 0.25;
  if (s.holder_concentration !== 0.5) conf += 0.15;
  if (s.security_risk !== 0.5) conf += 0.1;

  return clamp(conf, 0, 1);
}

/**
 * Narrative confidence: do we have sentiment and news data?
 */
function computeNarrativeConfidence(s: SignalSnapshot): number {
  let conf = 0.3;

  if (s.narrative_intensity > 0) conf += 0.25;
  if (s.sentiment !== 0) conf += 0.25;
  // Penalty for extreme values with no other confirmation
  if (Math.abs(s.sentiment) > 0.8 && s.narrative_intensity < 0.2) conf -= 0.1;

  return clamp(conf, 0, 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNCERTAINTY IDENTIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

function identifyPrimaryUncertainty(
  breakdown: ConfidenceBreakdown,
  contradictions: JudgmentContradictions,
  signals: SignalSnapshot
): string | null {
  // Structural contradiction is always primary.
  // Prefer the actual structural item instead of blindly taking the first-ranked one.
  if (contradictions.structural_warning && contradictions.items.length > 0) {
    const structural = contradictions.items.find(
      c => !c.resolvable && (c.severity === 'critical' || c.severity === 'high')
    );
    if (structural?.summary) return structural.summary;
    if (contradictions.items[0].summary) return contradictions.items[0].summary;
  }

  // Data completeness
  if (signals.data_completeness < 0.5) {
    return 'Significant data gaps — multiple modules missing or stale.';
  }

  // Find weakest category
  const entries: [string, number][] = [
    ['market data', breakdown.market],
    ['fundamental data', breakdown.fundamentals],
    ['on-chain data', breakdown.onchain],
    ['narrative data', breakdown.narrative],
  ];
  entries.sort((a, b) => a[1] - b[1]);

  if (entries[0][1] < 0.4) {
    return `Low confidence in ${entries[0][0]} — limited data available.`;
  }

  // High contradiction load
  if (contradictions.load > 0.5) {
    return 'Multiple contradictions weaken overall thesis reliability.';
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
