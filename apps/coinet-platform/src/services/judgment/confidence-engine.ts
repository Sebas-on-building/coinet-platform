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
import { isAxisApplicable, type ConfidenceAxis } from './asset-applicability';

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
  /**
   * Regime-based confidence modifier (0.5–1.2).
   * Produced by the Regime Engine (Layer 8).
   * Applied as a final multiplier after all additive penalties.
   */
  regimeModifier?: number;
}

/**
 * Compute confidence across all categories with penalties
 * for contradictions, data gaps, state ambiguity, and regime context.
 */
export function computeConfidence(input: ConfidenceInput): JudgmentConfidence {
  const { signals, contradictions, state, regimeModifier } = input;

  const breakdown = computeBreakdown(signals);

  // Weighted average over APPLICABLE axes only. An axis whose every family is
  // NOT_APPLICABLE for this asset (e.g. a stablecoin's fundamentals axis) is
  // excluded and the remaining weights renormalize — so an asset is never dragged
  // down by a lens that doesn't apply to it. When all four axes apply (the common
  // case) the divisor is 1.0 and this is identical to the prior weighted sum.
  const applicability = signals._applicability;
  const axes: ConfidenceAxis[] = ['market', 'fundamentals', 'onchain', 'narrative'];
  let weightedSum = 0;
  let totalWeight = 0;
  for (const axis of axes) {
    if (applicability && !isAxisApplicable(axis, applicability)) continue;
    weightedSum += breakdown[axis] * CATEGORY_WEIGHTS[axis];
    totalWeight += CATEGORY_WEIGHTS[axis];
  }
  let raw = totalWeight > 0 ? weightedSum / totalWeight : 0;

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

  // Missing-signal penalty: each missing category reduces trust proportionally
  const missing = signals._missing;
  if (missing && missing.size > 0) {
    const missingFraction = missing.size / 9;
    raw -= missingFraction * 0.2;

    // Critical categories missing: derivatives or onchain = extra penalty
    if (missing.has('derivatives') || missing.has('onchain')) {
      raw -= 0.05;
    }
  }

  // Regime modifier: macro risk-off, stressed ecosystem, or high volatility
  // reduce confidence; strong risk-on with healthy ecosystem can boost it.
  if (regimeModifier !== undefined) {
    raw *= regimeModifier;
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

function computeMarketConfidence(s: SignalSnapshot): number {
  const missing = s._missing;

  // If the market data source is entirely missing, cap confidence low
  if (missing?.has('market')) return 0.2;

  let conf = 0.5;
  if (s.volume_24h > 0.01) conf += 0.15;
  if (s.liquidity > 0.01) conf += 0.15;
  if (s.pair_age_hours !== null) conf += 0.1;
  if (!missing?.has('derivatives') && s.leverage_pressure !== 0.5) conf += 0.1;

  return clamp(conf, 0, 1);
}

function computeFundamentalsConfidence(s: SignalSnapshot): number {
  if (s._missing?.has('protocol')) return 0.15;

  let conf = 0.3;
  if (s.tvl_trend > 0) conf += 0.2;
  if (s.revenue_quality > 0) conf += 0.25;
  if (s.fundamentals_strength > 0) conf += 0.25;

  return clamp(conf, 0, 1);
}

function computeOnchainConfidence(s: SignalSnapshot): number {
  if (s._missing?.has('onchain')) return 0.15;

  let conf = 0.3;
  if (s.whale_activity !== 0.5) conf += 0.2;
  if (s.exchange_inflow > 0 || s.exchange_outflow > 0) conf += 0.25;
  if (!s._missing?.has('holders') && s.holder_concentration !== 0.5) conf += 0.15;
  if (!s._missing?.has('security') && s.security_risk !== 0.5) conf += 0.1;

  return clamp(conf, 0, 1);
}

function computeNarrativeConfidence(s: SignalSnapshot): number {
  const hasSentiment = !s._missing?.has('sentiment');
  const hasNews = !s._missing?.has('news');
  if (!hasSentiment && !hasNews) return 0.15;

  let conf = 0.3;
  if (s.narrative_intensity > 0) conf += 0.25;
  if (hasSentiment && s.sentiment !== 0) conf += 0.25;
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

  // Explicit missing-data surfacing
  const missing = signals._missing;
  if (missing && missing.size >= 4) {
    const cats = [...missing].slice(0, 4).join(', ');
    return `Significant data gaps — missing: ${cats}. Confidence is structurally limited.`;
  }

  if (signals.data_completeness < 0.5) {
    return 'Significant data gaps — multiple modules missing or stale.';
  }

  if (missing && missing.size >= 2) {
    const cats = [...missing].slice(0, 3).join(', ');
    return `Partial data coverage — missing: ${cats}. Some conclusions may be less reliable.`;
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
