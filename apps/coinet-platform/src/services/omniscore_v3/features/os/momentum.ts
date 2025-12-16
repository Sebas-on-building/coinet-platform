/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📈 OS FEATURE: Momentum                                                   ║
 * ║                                                                               ║
 * ║   Measures: Multi-timeframe price returns from REAL historical data          ║
 * ║   No extrapolation - actual historical prices only                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { FeatureDefinition, FeatureFunction, FeatureResult, FeatureContext } from '../types';
import {
  getDataValue,
  checkRequiredInputs,
  calculateFreshnessHours,
  calculateConfidence,
  normalizeSigmoid,
  createUnavailableResult,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export const MOMENTUM_DEFINITION: FeatureDefinition = {
  id: 'os_momentum',
  name: 'Momentum',
  category: 'os',
  description: 'Measures price momentum across multiple timeframes using actual historical data',
  segment: 'MARKET',
  defaultWeight: 0.25,
  requiredInputs: ['price_change_24h'], // Need at least short-term
  optionalInputs: [
    'price_change_24h',
    'price_change_7d',
    'price_change_30d',
    'price_change_90d',
    'price_vs_ath_percent',
    'rsi_14',
    'macd_signal',
    'volume_change_24h',
    'volume_change_7d',
  ],
  updateFrequencyHours: 1,
  higherIsBetter: true, // For opportunity, positive momentum is better
  normalization: {
    method: 'sigmoid',
    median: 0,
    scale: 20,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const computeMomentum: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = MOMENTUM_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  // Need at least one price change
  const hasAnyPriceChange = 
    getDataValue(ctx, 'price_change_24h') !== null ||
    getDataValue(ctx, 'price_change_7d') !== null ||
    getDataValue(ctx, 'price_change_30d') !== null;
  
  if (!hasAnyPriceChange) {
    return createUnavailableResult(def, missing, 'No price change data available');
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SHORT-TERM MOMENTUM (0-35 points) - 24h/7d
  // ─────────────────────────────────────────────────────────────────────────────
  let shortTermScore = 0;
  const change24h = getDataValue(ctx, 'price_change_24h');
  const change7d = getDataValue(ctx, 'price_change_7d');
  
  if (change24h !== null) {
    // 24h momentum (sigmoid transformation)
    // Strong positive: >10%, Strong negative: <-10%
    const score24h = normalizeSigmoid(change24h, 0, 10, false);
    shortTermScore += (score24h / 100) * 15;
    
    intermediates['change_24h'] = change24h;
    intermediates['score_24h'] = (score24h / 100) * 15;
    
    if (change24h > 30) {
      warnings.push('Extreme 24h move (>30%) - possible volatility');
    } else if (change24h < -30) {
      warnings.push('Extreme 24h drop (<-30%)');
    }
  }
  
  if (change7d !== null) {
    // 7d momentum
    const score7d = normalizeSigmoid(change7d, 0, 15, false);
    shortTermScore += (score7d / 100) * 20;
    
    intermediates['change_7d'] = change7d;
    intermediates['score_7d'] = (score7d / 100) * 20;
  }
  
  shortTermScore = Math.max(0, Math.min(35, shortTermScore));
  
  // ─────────────────────────────────────────────────────────────────────────────
  // MEDIUM-TERM MOMENTUM (0-30 points) - 30d
  // ─────────────────────────────────────────────────────────────────────────────
  let mediumTermScore = 0;
  const change30d = getDataValue(ctx, 'price_change_30d');
  
  if (change30d !== null) {
    // 30d momentum (wider range)
    const score30d = normalizeSigmoid(change30d, 0, 25, false);
    mediumTermScore = (score30d / 100) * 30;
    
    intermediates['change_30d'] = change30d;
    intermediates['score_30d'] = mediumTermScore;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // LONG-TERM CONTEXT (0-15 points) - 90d + ATH distance
  // ─────────────────────────────────────────────────────────────────────────────
  let longTermScore = 0;
  const change90d = getDataValue(ctx, 'price_change_90d');
  const vsAth = getDataValue(ctx, 'price_vs_ath_percent');
  
  if (change90d !== null) {
    const score90d = normalizeSigmoid(change90d, 0, 40, false);
    longTermScore += (score90d / 100) * 10;
    
    intermediates['change_90d'] = change90d;
    intermediates['score_90d'] = (score90d / 100) * 10;
  }
  
  if (vsAth !== null) {
    // Distance from ATH (lower = closer to ATH = stronger)
    // vsAth is already negative (e.g., -25 = 25% below ATH)
    const athDistance = Math.abs(vsAth);
    
    if (athDistance <= 10) longTermScore += 5;
    else if (athDistance <= 25) longTermScore += 4;
    else if (athDistance <= 50) longTermScore += 2;
    else if (athDistance >= 90) {
      longTermScore += 0;
      warnings.push(`Price ${athDistance.toFixed(0)}% below ATH`);
    }
    
    intermediates['ath_distance'] = athDistance;
    intermediates['ath_bonus'] = athDistance <= 10 ? 5 : (athDistance <= 25 ? 4 : (athDistance <= 50 ? 2 : 0));
  }
  
  longTermScore = Math.min(15, longTermScore);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TECHNICAL SIGNALS (0-10 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let technicalScore = 0;
  const rsi = getDataValue(ctx, 'rsi_14');
  const macdSignal = getDataValue(ctx, 'macd_signal');
  
  if (rsi !== null) {
    // RSI interpretation for opportunity
    // 30-70 is neutral, <30 is oversold (buy opportunity), >70 is overbought
    if (rsi <= 30) {
      technicalScore += 5; // Oversold = opportunity
    } else if (rsi <= 40) {
      technicalScore += 3;
    } else if (rsi >= 70) {
      technicalScore += 1; // Overbought = caution
      warnings.push('RSI indicates overbought conditions');
    } else {
      technicalScore += 2; // Neutral
    }
    
    intermediates['rsi'] = rsi;
    intermediates['rsi_score'] = rsi <= 30 ? 5 : (rsi <= 40 ? 3 : (rsi >= 70 ? 1 : 2));
  }
  
  if (macdSignal !== null) {
    // MACD signal: positive = bullish, negative = bearish
    if (macdSignal > 0.5) technicalScore += 5;
    else if (macdSignal > 0) technicalScore += 3;
    else if (macdSignal > -0.5) technicalScore += 1;
    else technicalScore += 0;
    
    intermediates['macd_signal'] = macdSignal;
    intermediates['macd_score'] = macdSignal > 0.5 ? 5 : (macdSignal > 0 ? 3 : (macdSignal > -0.5 ? 1 : 0));
  }
  
  technicalScore = Math.min(10, technicalScore);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VOLUME CONFIRMATION (0-10 points bonus)
  // ─────────────────────────────────────────────────────────────────────────────
  let volumeBonus = 0;
  const volumeChange24h = getDataValue(ctx, 'volume_change_24h');
  const volumeChange7d = getDataValue(ctx, 'volume_change_7d');
  
  // Volume confirms momentum when both move same direction
  if (change24h !== null && volumeChange24h !== null) {
    if ((change24h > 5 && volumeChange24h > 20) || (change24h < -5 && volumeChange24h > 20)) {
      volumeBonus += 5; // Volume confirms the move
      intermediates['volume_confirms_24h'] = true as unknown as number;
    }
  }
  
  if (change7d !== null && volumeChange7d !== null) {
    if ((change7d > 10 && volumeChange7d > 30) || (change7d < -10 && volumeChange7d > 30)) {
      volumeBonus += 5;
      intermediates['volume_confirms_7d'] = true as unknown as number;
    }
  }
  
  volumeBonus = Math.min(10, volumeBonus);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawScore = shortTermScore + mediumTermScore + longTermScore + technicalScore + volumeBonus;
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
      formula: 'short_term + medium_term + long_term + technical + volume_bonus',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const momentumFeature = {
  definition: MOMENTUM_DEFINITION,
  compute: computeMomentum,
};
