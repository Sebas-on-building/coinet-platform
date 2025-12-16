/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     💔 RISK FEATURE: Liquidity Fragility                                      ║
 * ║                                                                               ║
 * ║   Measures: Thin books, high slippage, liquidity concentration               ║
 * ║   How easy is it for liquidity to evaporate?                                 ║
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

export const LIQUIDITY_FRAGILITY_DEFINITION: FeatureDefinition = {
  id: 'risk_liquidity_fragility',
  name: 'Liquidity Fragility',
  category: 'risk',
  description: 'Measures risk of liquidity evaporating under stress',
  segment: 'MARKET',
  defaultWeight: 0.20,
  requiredInputs: [],
  optionalInputs: [
    'volume_24h',
    'market_cap',
    'bid_ask_spread_percent',
    'slippage_100k_usd',
    'depth_2_percent',
    'liquidity_concentration',
    'num_liquid_markets',
    'volume_volatility_7d',
    'liquidity_score',
  ],
  updateFrequencyHours: 4,
  higherIsBetter: false, // Higher score = MORE risk
  normalization: {
    method: 'custom',
    min: 0,
    max: 100,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const computeLiquidityFragility: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = LIQUIDITY_FRAGILITY_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  if (present.length < 2) {
    return createUnavailableResult(def, missing, 'Insufficient liquidity data for risk assessment');
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // RISK SCORE: Higher = MORE RISK
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SPREAD RISK (0-25 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let spreadRisk = 0;
  const spread = getDataValue(ctx, 'bid_ask_spread_percent');
  
  if (spread !== null) {
    if (spread >= 5) {
      spreadRisk = 25;
      warnings.push('Very wide bid-ask spreads (>5%)');
    } else if (spread >= 2) {
      spreadRisk = 20;
      warnings.push('Wide bid-ask spreads (>2%)');
    } else if (spread >= 1) {
      spreadRisk = 15;
    } else if (spread >= 0.5) {
      spreadRisk = 8;
    } else if (spread >= 0.2) {
      spreadRisk = 4;
    } else {
      spreadRisk = 1;
    }
    
    intermediates['spread_risk'] = spreadRisk;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SLIPPAGE RISK (0-25 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let slippageRisk = 0;
  const slippage100k = getDataValue(ctx, 'slippage_100k_usd');
  const depth = getDataValue(ctx, 'depth_2_percent');
  
  if (slippage100k !== null) {
    if (slippage100k >= 5) {
      slippageRisk = 25;
      warnings.push('Extreme slippage risk (>5% for $100K)');
    } else if (slippage100k >= 2) {
      slippageRisk = 20;
      warnings.push('High slippage (>2% for $100K)');
    } else if (slippage100k >= 1) {
      slippageRisk = 12;
    } else if (slippage100k >= 0.5) {
      slippageRisk = 6;
    } else {
      slippageRisk = 2;
    }
    
    intermediates['slippage_risk'] = slippageRisk;
  } else if (depth !== null) {
    // Use depth as proxy
    if (depth < 10000) {
      slippageRisk = 22;
      warnings.push('Very thin order books');
    } else if (depth < 50000) {
      slippageRisk = 15;
    } else if (depth < 200000) {
      slippageRisk = 8;
    } else {
      slippageRisk = 3;
    }
    
    intermediates['depth_derived_risk'] = slippageRisk;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CONCENTRATION RISK (0-20 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let concentrationRisk = 0;
  const liqConcentration = getDataValue(ctx, 'liquidity_concentration');
  const numMarkets = getDataValue(ctx, 'num_liquid_markets');
  
  if (liqConcentration !== null) {
    // Higher concentration = more fragile
    if (liqConcentration > 0.9) {
      concentrationRisk = 20;
      warnings.push('Liquidity concentrated on single venue (>90%)');
    } else if (liqConcentration > 0.7) {
      concentrationRisk = 15;
    } else if (liqConcentration > 0.5) {
      concentrationRisk = 8;
    } else {
      concentrationRisk = 3;
    }
    
    intermediates['concentration_risk'] = concentrationRisk;
  }
  
  if (numMarkets !== null) {
    // Fewer markets = more fragile
    if (numMarkets <= 1) {
      concentrationRisk = Math.max(concentrationRisk, 18);
      warnings.push('Only 1 liquid trading venue');
    } else if (numMarkets <= 3) {
      concentrationRisk = Math.max(concentrationRisk, 12);
    }
    
    intermediates['market_count_adj'] = numMarkets <= 1 ? 18 : (numMarkets <= 3 ? 12 : 0);
  }
  
  concentrationRisk = Math.min(20, concentrationRisk);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VOLUME/MCAP RISK (0-15 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let volMcapRisk = 0;
  const volume = getDataValue(ctx, 'volume_24h');
  const mcap = getDataValue(ctx, 'market_cap');
  
  if (volume !== null && mcap !== null && mcap > 0) {
    const ratio = volume / mcap;
    
    // Very low volume relative to mcap = illiquid
    if (ratio < 0.001) {
      volMcapRisk = 15;
      warnings.push('Very low trading activity relative to market cap');
    } else if (ratio < 0.005) {
      volMcapRisk = 10;
    } else if (ratio < 0.01) {
      volMcapRisk = 5;
    } else {
      volMcapRisk = 2;
    }
    
    intermediates['vol_mcap_ratio'] = ratio;
    intermediates['vol_mcap_risk'] = volMcapRisk;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VOLUME STABILITY RISK (0-15 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let volatilityRisk = 0;
  const volVolatility = getDataValue(ctx, 'volume_volatility_7d');
  
  if (volVolatility !== null) {
    // High volume volatility = unreliable liquidity
    if (volVolatility > 200) {
      volatilityRisk = 15;
      warnings.push('Very unstable trading volumes');
    } else if (volVolatility > 100) {
      volatilityRisk = 10;
    } else if (volVolatility > 50) {
      volatilityRisk = 5;
    } else {
      volatilityRisk = 2;
    }
    
    intermediates['volume_volatility_risk'] = volatilityRisk;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL RISK SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawRisk = spreadRisk + slippageRisk + concentrationRisk + volMcapRisk + volatilityRisk;
  const normalizedRisk = Math.max(0, Math.min(100, rawRisk));
  
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    raw: rawRisk,
    normalized: normalizedRisk,
    weight: def.defaultWeight,
    contribution: normalizedRisk * def.defaultWeight,
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
      formula: 'spread_risk + slippage_risk + concentration_risk + vol_mcap_risk + volatility_risk',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const liquidityFragilityFeature = {
  definition: LIQUIDITY_FRAGILITY_DEFINITION,
  compute: computeLiquidityFragility,
};
