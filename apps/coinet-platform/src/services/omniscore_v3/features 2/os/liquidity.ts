/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     💧 OS FEATURE: Liquidity                                                  ║
 * ║                                                                               ║
 * ║   Measures: Depth, spreads, slippage                                         ║
 * ║   Can you trade size without moving the market?                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { FeatureDefinition, FeatureFunction, FeatureResult, FeatureContext } from '../types';
import {
  getDataValue,
  checkRequiredInputs,
  calculateFreshnessHours,
  calculateConfidence,
  normalizeLog,
  createUnavailableResult,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export const LIQUIDITY_DEFINITION: FeatureDefinition = {
  id: 'os_liquidity',
  name: 'Liquidity',
  category: 'os',
  description: 'Measures market depth, bid-ask spreads, and execution quality',
  segment: 'MARKET',
  defaultWeight: 0.25,
  requiredInputs: [],
  optionalInputs: [
    'volume_24h',
    'liquidity_score',
    'bid_ask_spread_percent',
    'slippage_1k_usd',
    'slippage_10k_usd',
    'slippage_100k_usd',
    'depth_2_percent',
    'num_liquid_markets',
    'volume_to_mcap_ratio',
  ],
  updateFrequencyHours: 1,
  higherIsBetter: true,
  normalization: {
    method: 'log',
    min: 100_000,        // $100K volume
    max: 10_000_000_000,  // $10B volume
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const computeLiquidity: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = LIQUIDITY_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  if (present.length < 1) {
    return createUnavailableResult(def, missing, 'No liquidity data available');
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VOLUME SCORE (0-30 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let volumeScore = 0;
  const volume24h = getDataValue(ctx, 'volume_24h');
  
  if (volume24h !== null) {
    // Log scale for volume
    if (volume24h >= 1_000_000_000) volumeScore = 30;       // $1B+
    else if (volume24h >= 100_000_000) volumeScore = 25;    // $100M+
    else if (volume24h >= 10_000_000) volumeScore = 20;     // $10M+
    else if (volume24h >= 1_000_000) volumeScore = 15;      // $1M+
    else if (volume24h >= 100_000) volumeScore = 8;         // $100K+
    else volumeScore = 3;
    
    intermediates['volume_score'] = volumeScore;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SPREAD SCORE (0-25 points) - Tighter spreads = better
  // ─────────────────────────────────────────────────────────────────────────────
  let spreadScore = 0;
  const spread = getDataValue(ctx, 'bid_ask_spread_percent');
  
  if (spread !== null) {
    // Lower spread = higher score
    if (spread <= 0.05) spreadScore = 25;      // Excellent
    else if (spread <= 0.1) spreadScore = 22;
    else if (spread <= 0.2) spreadScore = 18;
    else if (spread <= 0.5) spreadScore = 13;
    else if (spread <= 1) spreadScore = 8;
    else if (spread <= 2) spreadScore = 4;
    else {
      spreadScore = 1;
      warnings.push(`Wide bid-ask spread: ${spread.toFixed(2)}%`);
    }
    
    intermediates['spread_score'] = spreadScore;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DEPTH SCORE (0-25 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let depthScore = 0;
  const depth2 = getDataValue(ctx, 'depth_2_percent');
  const slippage100k = getDataValue(ctx, 'slippage_100k_usd');
  
  if (depth2 !== null) {
    // Depth at 2% from mid (USD value)
    if (depth2 >= 10_000_000) depthScore = 25;     // $10M+
    else if (depth2 >= 1_000_000) depthScore = 20;  // $1M+
    else if (depth2 >= 100_000) depthScore = 15;    // $100K+
    else if (depth2 >= 10_000) depthScore = 8;      // $10K+
    else depthScore = 3;
    
    intermediates['depth_score'] = depthScore;
  } else if (slippage100k !== null) {
    // Use slippage as proxy for depth
    if (slippage100k <= 0.1) depthScore = 25;
    else if (slippage100k <= 0.3) depthScore = 20;
    else if (slippage100k <= 0.5) depthScore = 15;
    else if (slippage100k <= 1) depthScore = 10;
    else if (slippage100k <= 2) depthScore = 5;
    else {
      depthScore = 2;
      warnings.push(`High slippage for $100K trade: ${slippage100k.toFixed(2)}%`);
    }
    
    intermediates['slippage_derived_depth'] = depthScore;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // MARKET ACCESS (0-20 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let accessScore = 0;
  const numMarkets = getDataValue(ctx, 'num_liquid_markets');
  const liquidityScore = getDataValue(ctx, 'liquidity_score');
  
  if (numMarkets !== null) {
    // Number of liquid trading venues
    if (numMarkets >= 20) accessScore = 15;
    else if (numMarkets >= 10) accessScore = 12;
    else if (numMarkets >= 5) accessScore = 8;
    else if (numMarkets >= 3) accessScore = 5;
    else accessScore = 2;
    
    intermediates['market_access_score'] = accessScore;
  }
  
  if (liquidityScore !== null) {
    // Provider's liquidity score (0-100)
    accessScore += Math.min(5, liquidityScore / 20);
    intermediates['provider_liquidity_bonus'] = Math.min(5, liquidityScore / 20);
  }
  
  accessScore = Math.min(20, accessScore);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VOLUME/MCAP RATIO CHECK
  // ─────────────────────────────────────────────────────────────────────────────
  const volMcapRatio = getDataValue(ctx, 'volume_to_mcap_ratio');
  if (volMcapRatio !== null) {
    if (volMcapRatio > 2) {
      warnings.push('Unusually high volume/mcap ratio - possible wash trading');
    } else if (volMcapRatio < 0.005) {
      warnings.push('Very low trading activity relative to market cap');
    }
    intermediates['vol_mcap_ratio'] = volMcapRatio;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawScore = volumeScore + spreadScore + depthScore + accessScore;
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
      formula: 'volume_score + spread_score + depth_score + access_score',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const liquidityFeature = {
  definition: LIQUIDITY_DEFINITION,
  compute: computeLiquidity,
};
