/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📉 OS FEATURE: Volatility Regime                                          ║
 * ║                                                                               ║
 * ║   Measures: Realized volatility, regime classification                       ║
 * ║   Is this a good time to trade based on volatility conditions?               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { FeatureDefinition, FeatureFunction, FeatureResult, FeatureContext } from '../types';
import {
  getDataValue,
  checkRequiredInputs,
  calculateFreshnessHours,
  calculateConfidence,
  createUnavailableResult,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export const VOL_REGIME_DEFINITION: FeatureDefinition = {
  id: 'os_vol_regime',
  name: 'Volatility Regime',
  category: 'os',
  description: 'Measures current volatility environment and its favorability for trading',
  segment: 'MARKET',
  defaultWeight: 0.20,
  requiredInputs: [],
  optionalInputs: [
    'volatility_7d',
    'volatility_30d',
    'volatility_90d',
    'volatility_percentile',
    'vol_vs_btc_ratio',
    'avg_true_range_14d',
    'max_drawdown_30d',
    'intraday_range_avg',
  ],
  updateFrequencyHours: 4,
  higherIsBetter: true, // For opportunity, moderate vol is better than extremes
  normalization: {
    method: 'custom',
    min: 0,
    max: 100,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// VOLATILITY REGIME CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

type VolRegime = 'extreme_high' | 'high' | 'elevated' | 'normal' | 'low' | 'extreme_low';

function classifyVolRegime(annualizedVol: number): VolRegime {
  // Crypto-specific thresholds (annualized volatility %)
  if (annualizedVol >= 150) return 'extreme_high';
  if (annualizedVol >= 100) return 'high';
  if (annualizedVol >= 70) return 'elevated';
  if (annualizedVol >= 40) return 'normal';
  if (annualizedVol >= 20) return 'low';
  return 'extreme_low';
}

function getRegimeScore(regime: VolRegime): number {
  // Moderate volatility is best for trading opportunity
  switch (regime) {
    case 'normal': return 100;      // Sweet spot
    case 'elevated': return 85;      // Good for directional trades
    case 'low': return 70;           // Harder to profit
    case 'high': return 55;          // Risky but tradeable
    case 'extreme_low': return 40;   // Dead market
    case 'extreme_high': return 30;  // Too risky
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const computeVolRegime: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = VOL_REGIME_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  // Need at least one volatility measure
  const vol30d = getDataValue(ctx, 'volatility_30d');
  const vol7d = getDataValue(ctx, 'volatility_7d');
  
  if (vol30d === null && vol7d === null) {
    return createUnavailableResult(def, missing, 'No volatility data available');
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // REGIME CLASSIFICATION (0-40 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let regimeScore = 0;
  const primaryVol = vol30d ?? vol7d!;
  const regime = classifyVolRegime(primaryVol);
  
  regimeScore = (getRegimeScore(regime) / 100) * 40;
  
  intermediates['primary_vol'] = primaryVol;
  intermediates['regime'] = regime as unknown as number;
  intermediates['regime_score'] = regimeScore;
  
  if (regime === 'extreme_high') {
    warnings.push('Extreme volatility - high risk environment');
  } else if (regime === 'extreme_low') {
    warnings.push('Very low volatility - limited trading opportunities');
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VOLATILITY TREND (0-25 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let trendScore = 0;
  const vol90d = getDataValue(ctx, 'volatility_90d');
  
  if (vol30d !== null && vol90d !== null) {
    const volRatio = vol30d / vol90d;
    
    // Declining volatility is favorable (compression before expansion)
    if (volRatio < 0.7) {
      trendScore = 25; // Vol compression - opportunity forming
      intermediates['vol_trend'] = 'compressing' as unknown as number;
    } else if (volRatio < 0.9) {
      trendScore = 20;
      intermediates['vol_trend'] = 'declining' as unknown as number;
    } else if (volRatio < 1.1) {
      trendScore = 15; // Stable
      intermediates['vol_trend'] = 'stable' as unknown as number;
    } else if (volRatio < 1.3) {
      trendScore = 10; // Rising
      intermediates['vol_trend'] = 'rising' as unknown as number;
    } else {
      trendScore = 5; // Vol expansion (risk)
      intermediates['vol_trend'] = 'expanding' as unknown as number;
      warnings.push('Volatility expanding - increased risk');
    }
    
    intermediates['vol_ratio_30_90'] = volRatio;
    intermediates['trend_score'] = trendScore;
  } else if (vol7d !== null && vol30d !== null) {
    // Shorter term trend
    const shortRatio = vol7d / vol30d;
    
    if (shortRatio < 0.8) trendScore = 20;
    else if (shortRatio < 1.0) trendScore = 15;
    else if (shortRatio < 1.2) trendScore = 10;
    else trendScore = 5;
    
    intermediates['vol_ratio_7_30'] = shortRatio;
    intermediates['trend_score'] = trendScore;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // RELATIVE VOLATILITY (0-20 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let relativeScore = 0;
  const volVsBtc = getDataValue(ctx, 'vol_vs_btc_ratio');
  const volPercentile = getDataValue(ctx, 'volatility_percentile');
  
  if (volVsBtc !== null) {
    // Lower volatility relative to BTC is safer
    if (volVsBtc < 0.8) relativeScore = 10;
    else if (volVsBtc < 1.0) relativeScore = 8;
    else if (volVsBtc < 1.5) relativeScore = 5;
    else if (volVsBtc < 2.0) relativeScore = 2;
    else {
      relativeScore = 0;
      warnings.push('Much more volatile than BTC');
    }
    
    intermediates['vol_vs_btc'] = volVsBtc;
    intermediates['btc_relative_score'] = relativeScore;
  }
  
  if (volPercentile !== null) {
    // Historical percentile (0-100, lower = less volatile than usual)
    if (volPercentile < 30) relativeScore += 10;
    else if (volPercentile < 50) relativeScore += 7;
    else if (volPercentile < 70) relativeScore += 4;
    else if (volPercentile < 90) relativeScore += 1;
    else relativeScore += 0;
    
    intermediates['vol_percentile'] = volPercentile;
    intermediates['percentile_score'] = volPercentile < 30 ? 10 : (volPercentile < 50 ? 7 : (volPercentile < 70 ? 4 : 1));
  }
  
  relativeScore = Math.min(20, relativeScore);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DRAWDOWN RISK (0-15 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let drawdownScore = 15;
  const maxDrawdown = getDataValue(ctx, 'max_drawdown_30d');
  
  if (maxDrawdown !== null) {
    // Negative value (e.g., -25 = 25% drawdown)
    const ddPercent = Math.abs(maxDrawdown);
    
    if (ddPercent < 10) drawdownScore = 15;
    else if (ddPercent < 20) drawdownScore = 12;
    else if (ddPercent < 30) drawdownScore = 8;
    else if (ddPercent < 50) {
      drawdownScore = 4;
      warnings.push(`Significant recent drawdown: ${ddPercent.toFixed(0)}%`);
    } else {
      drawdownScore = 0;
      warnings.push(`Severe drawdown: ${ddPercent.toFixed(0)}%`);
    }
    
    intermediates['max_drawdown'] = ddPercent;
    intermediates['drawdown_score'] = drawdownScore;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawScore = regimeScore + trendScore + relativeScore + drawdownScore;
  const normalizedScore = Math.max(0, Math.min(100, rawScore));
  
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    raw: rawScore,
    normalized: normalizedScore,
    weight: def.defaultWeight,
    contribution: normalizedScore * def.defaultWeight,
    available: true,
    quality: {
      coverage: present.length / allInputs.length,
      freshnessHours: calculateFreshnessHours(ctx, present),
      confidence: calculateConfidence(ctx, present),
    },
    inputs: present,
    missing,
    warnings,
    debug: {
      formula: 'regime_score + trend_score + relative_score + drawdown_score',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const volRegimeFeature = {
  definition: VOL_REGIME_DEFINITION,
  compute: computeVolRegime,
};
