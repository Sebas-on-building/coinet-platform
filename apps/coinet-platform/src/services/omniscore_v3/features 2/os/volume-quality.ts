/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 OS FEATURE: Volume Quality                                             ║
 * ║                                                                               ║
 * ║   Measures: Unique venues, wash trading signals, real vs fake volume         ║
 * ║   Is the volume genuine or manipulated?                                      ║
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

export const VOLUME_QUALITY_DEFINITION: FeatureDefinition = {
  id: 'os_volume_quality',
  name: 'Volume Quality',
  category: 'os',
  description: 'Measures authenticity of trading volume through venue diversity and wash trading detection',
  segment: 'MARKET',
  defaultWeight: 0.15,
  requiredInputs: [],
  optionalInputs: [
    'volume_24h',
    'num_trading_pairs',
    'num_exchanges',
    'cex_volume_percent',
    'dex_volume_percent',
    'volume_concentration_top3',
    'wash_trading_score',
    'trade_size_distribution',
    'volume_consistency_7d',
    'unique_traders_24h',
  ],
  updateFrequencyHours: 4,
  higherIsBetter: true,
  normalization: {
    method: 'custom',
    min: 0,
    max: 100,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const computeVolumeQuality: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = VOLUME_QUALITY_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  if (present.length < 2) {
    return createUnavailableResult(def, missing, 'Insufficient volume quality data');
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VENUE DIVERSITY (0-30 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let diversityScore = 0;
  const numExchanges = getDataValue(ctx, 'num_exchanges');
  const numPairs = getDataValue(ctx, 'num_trading_pairs');
  const volumeConcentration = getDataValue(ctx, 'volume_concentration_top3');
  
  if (numExchanges !== null) {
    if (numExchanges >= 15) diversityScore = 15;
    else if (numExchanges >= 10) diversityScore = 12;
    else if (numExchanges >= 5) diversityScore = 9;
    else if (numExchanges >= 3) diversityScore = 5;
    else diversityScore = 2;
    
    intermediates['exchange_diversity'] = diversityScore;
  }
  
  if (numPairs !== null) {
    // More trading pairs = more access points
    let pairBonus = 0;
    if (numPairs >= 100) pairBonus = 10;
    else if (numPairs >= 50) pairBonus = 7;
    else if (numPairs >= 20) pairBonus = 5;
    else if (numPairs >= 10) pairBonus = 3;
    
    diversityScore += pairBonus;
    intermediates['pair_diversity_bonus'] = pairBonus;
  }
  
  if (volumeConcentration !== null) {
    // Penalize if volume is concentrated on few venues
    if (volumeConcentration > 0.9) {
      diversityScore -= 10;
      warnings.push('Volume concentrated on 1-2 venues (>90%)');
    } else if (volumeConcentration > 0.8) {
      diversityScore -= 5;
    }
    
    intermediates['concentration_penalty'] = volumeConcentration > 0.9 ? -10 : (volumeConcentration > 0.8 ? -5 : 0);
  }
  
  diversityScore = Math.max(0, Math.min(30, diversityScore));
  
  // ─────────────────────────────────────────────────────────────────────────────
  // WASH TRADING DETECTION (0-35 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let washScore = 35; // Start optimistic
  const washTradingScore = getDataValue(ctx, 'wash_trading_score');
  const tradeDistribution = getDataValue(ctx, 'trade_size_distribution');
  const volumeConsistency = getDataValue(ctx, 'volume_consistency_7d');
  
  if (washTradingScore !== null) {
    // Higher wash trading score = more suspicious
    if (washTradingScore <= 10) washScore = 35;      // Clean
    else if (washTradingScore <= 25) washScore = 28;  // Mostly clean
    else if (washTradingScore <= 50) washScore = 18;  // Some concerns
    else if (washTradingScore <= 75) {
      washScore = 8;
      warnings.push('Significant wash trading signals detected');
    } else {
      washScore = 0;
      warnings.push('High wash trading score - volume likely manipulated');
    }
    
    intermediates['wash_trading_score'] = washScore;
  }
  
  if (tradeDistribution !== null) {
    // Natural distribution should have variety
    // Score 0-1 where 1 = perfectly distributed
    if (tradeDistribution < 0.3) {
      washScore -= 10;
      warnings.push('Suspicious trade size distribution');
    } else if (tradeDistribution >= 0.7) {
      washScore += 5; // Healthy distribution bonus
    }
    
    intermediates['distribution_adj'] = tradeDistribution >= 0.7 ? 5 : (tradeDistribution < 0.3 ? -10 : 0);
  }
  
  if (volumeConsistency !== null) {
    // Consistency score (0-1) - too perfect = suspicious
    if (volumeConsistency > 0.95) {
      washScore -= 5;
      warnings.push('Suspiciously consistent volume patterns');
    }
    
    intermediates['consistency_adj'] = volumeConsistency > 0.95 ? -5 : 0;
  }
  
  washScore = Math.max(0, Math.min(35, washScore));
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CEX/DEX MIX (0-20 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let mixScore = 0;
  const cexPercent = getDataValue(ctx, 'cex_volume_percent');
  const dexPercent = getDataValue(ctx, 'dex_volume_percent');
  
  if (cexPercent !== null && dexPercent !== null) {
    // Healthy mix is better than single source
    const minPercent = Math.min(cexPercent, dexPercent);
    
    if (minPercent >= 30) mixScore = 20;      // Good balance
    else if (minPercent >= 20) mixScore = 15;
    else if (minPercent >= 10) mixScore = 10;
    else if (minPercent >= 5) mixScore = 5;
    else mixScore = 2;
    
    intermediates['cex_dex_mix_score'] = mixScore;
    
    // Pure CEX or pure DEX is acceptable but not ideal
    if (cexPercent > 98 || dexPercent > 98) {
      mixScore = Math.max(mixScore, 8); // At least some credit
    }
  } else if (cexPercent !== null || dexPercent !== null) {
    mixScore = 8; // Partial data
    intermediates['partial_mix_score'] = 8;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // UNIQUE TRADERS (0-15 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let traderScore = 0;
  const uniqueTraders = getDataValue(ctx, 'unique_traders_24h');
  const volume24h = getDataValue(ctx, 'volume_24h');
  
  if (uniqueTraders !== null) {
    if (uniqueTraders >= 10000) traderScore = 15;
    else if (uniqueTraders >= 5000) traderScore = 12;
    else if (uniqueTraders >= 1000) traderScore = 9;
    else if (uniqueTraders >= 500) traderScore = 6;
    else if (uniqueTraders >= 100) traderScore = 3;
    else traderScore = 1;
    
    intermediates['unique_traders_score'] = traderScore;
    
    // Check volume per trader (too high = suspicious)
    if (volume24h !== null && uniqueTraders > 0) {
      const volPerTrader = volume24h / uniqueTraders;
      if (volPerTrader > 1_000_000) {
        warnings.push('High volume per unique trader - possible whale manipulation');
      }
      intermediates['vol_per_trader'] = volPerTrader;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawScore = diversityScore + washScore + mixScore + traderScore;
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
      formula: 'diversity_score + wash_score + mix_score + trader_score',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const volumeQualityFeature = {
  definition: VOLUME_QUALITY_DEFINITION,
  compute: computeVolumeQuality,
};
