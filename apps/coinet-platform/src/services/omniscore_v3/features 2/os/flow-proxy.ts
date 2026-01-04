/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🌊 OS FEATURE: Flow Proxy                                                 ║
 * ║                                                                               ║
 * ║   Measures: Net exchange flows (if real data available)                      ║
 * ║   Only computed with actual on-chain data - no estimates                     ║
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

export const FLOW_PROXY_DEFINITION: FeatureDefinition = {
  id: 'os_flow_proxy',
  name: 'Flow Proxy',
  category: 'os',
  description: 'Measures net exchange flows and smart money movements from on-chain data',
  segment: 'MARKET',
  defaultWeight: 0.15,
  requiredInputs: [], // Only compute if we have real data
  optionalInputs: [
    'exchange_net_flow_24h',
    'exchange_net_flow_7d',
    'exchange_balance_change_30d',
    'whale_transactions_24h',
    'smart_money_flow',
    'stablecoin_inflow_ratio',
    'futures_funding_rate',
    'open_interest_change_24h',
  ],
  updateFrequencyHours: 4,
  higherIsBetter: true, // Positive flows = accumulation = bullish
  normalization: {
    method: 'custom',
    min: 0,
    max: 100,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const computeFlowProxy: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = FLOW_PROXY_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  // This feature requires REAL on-chain data - skip if not available
  if (present.length < 2) {
    return createUnavailableResult(
      def, 
      missing, 
      'Flow data requires real on-chain metrics (not estimated)'
    );
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // EXCHANGE FLOW SCORE (0-35 points)
  // Negative flow = leaving exchanges = bullish (accumulation)
  // Positive flow = entering exchanges = bearish (distribution)
  // ─────────────────────────────────────────────────────────────────────────────
  let flowScore = 17; // Start neutral
  const netFlow24h = getDataValue(ctx, 'exchange_net_flow_24h');
  const netFlow7d = getDataValue(ctx, 'exchange_net_flow_7d');
  const balanceChange30d = getDataValue(ctx, 'exchange_balance_change_30d');
  
  if (netFlow24h !== null) {
    // Net flow as percentage (negative = outflow = bullish)
    if (netFlow24h < -5) {
      flowScore += 10;
      intermediates['flow_24h_signal'] = 'strong_accumulation' as unknown as number;
    } else if (netFlow24h < -1) {
      flowScore += 5;
      intermediates['flow_24h_signal'] = 'accumulation' as unknown as number;
    } else if (netFlow24h > 5) {
      flowScore -= 10;
      warnings.push('Significant exchange inflows detected');
      intermediates['flow_24h_signal'] = 'distribution' as unknown as number;
    } else if (netFlow24h > 1) {
      flowScore -= 5;
      intermediates['flow_24h_signal'] = 'slight_distribution' as unknown as number;
    }
    
    intermediates['net_flow_24h'] = netFlow24h;
  }
  
  if (netFlow7d !== null) {
    // Weekly flow (more significant trend)
    if (netFlow7d < -10) flowScore += 8;
    else if (netFlow7d < -3) flowScore += 4;
    else if (netFlow7d > 10) {
      flowScore -= 8;
      warnings.push('Sustained exchange inflows over 7 days');
    } else if (netFlow7d > 3) flowScore -= 4;
    
    intermediates['net_flow_7d'] = netFlow7d;
  }
  
  flowScore = Math.max(0, Math.min(35, flowScore));
  
  // ─────────────────────────────────────────────────────────────────────────────
  // WHALE ACTIVITY (0-25 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let whaleScore = 0;
  const whaleTx = getDataValue(ctx, 'whale_transactions_24h');
  const smartMoneyFlow = getDataValue(ctx, 'smart_money_flow');
  
  if (whaleTx !== null) {
    // Higher whale activity can be bullish (interest) or risky
    // This is a proxy for institutional interest
    if (whaleTx >= 100) {
      whaleScore = 15;
      intermediates['whale_activity'] = 'very_high' as unknown as number;
    } else if (whaleTx >= 50) {
      whaleScore = 12;
      intermediates['whale_activity'] = 'high' as unknown as number;
    } else if (whaleTx >= 20) {
      whaleScore = 8;
      intermediates['whale_activity'] = 'moderate' as unknown as number;
    } else if (whaleTx >= 5) {
      whaleScore = 4;
      intermediates['whale_activity'] = 'low' as unknown as number;
    } else {
      whaleScore = 1;
      intermediates['whale_activity'] = 'minimal' as unknown as number;
    }
    
    intermediates['whale_transactions'] = whaleTx;
  }
  
  if (smartMoneyFlow !== null) {
    // Smart money flow score (-100 to +100 typically)
    // Positive = smart money buying
    if (smartMoneyFlow > 50) whaleScore += 10;
    else if (smartMoneyFlow > 20) whaleScore += 6;
    else if (smartMoneyFlow > 0) whaleScore += 3;
    else if (smartMoneyFlow < -50) {
      whaleScore -= 5;
      warnings.push('Smart money selling');
    } else if (smartMoneyFlow < -20) {
      whaleScore -= 2;
    }
    
    intermediates['smart_money_flow'] = smartMoneyFlow;
  }
  
  whaleScore = Math.max(0, Math.min(25, whaleScore));
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STABLECOIN FLOW (0-20 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let stableScore = 0;
  const stableInflow = getDataValue(ctx, 'stablecoin_inflow_ratio');
  
  if (stableInflow !== null) {
    // Stablecoin flowing to exchanges = dry powder = potential buying
    if (stableInflow > 0.1) {
      stableScore = 20;
      intermediates['stable_signal'] = 'strong_inflow' as unknown as number;
    } else if (stableInflow > 0.05) {
      stableScore = 15;
      intermediates['stable_signal'] = 'moderate_inflow' as unknown as number;
    } else if (stableInflow > 0) {
      stableScore = 10;
      intermediates['stable_signal'] = 'slight_inflow' as unknown as number;
    } else if (stableInflow > -0.05) {
      stableScore = 5;
      intermediates['stable_signal'] = 'neutral' as unknown as number;
    } else {
      stableScore = 2;
      intermediates['stable_signal'] = 'outflow' as unknown as number;
    }
    
    intermediates['stablecoin_inflow_ratio'] = stableInflow;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DERIVATIVES SIGNALS (0-20 points) - Optional
  // ─────────────────────────────────────────────────────────────────────────────
  let derivScore = 0;
  const fundingRate = getDataValue(ctx, 'futures_funding_rate');
  const oiChange = getDataValue(ctx, 'open_interest_change_24h');
  
  if (fundingRate !== null) {
    // Funding rate: positive = longs pay shorts (crowded long)
    // Extreme positive is contrarian bearish, negative can be bullish
    if (fundingRate < -0.05) {
      derivScore = 10; // Shorts paying - potential squeeze
    } else if (fundingRate < 0) {
      derivScore = 7;
    } else if (fundingRate < 0.05) {
      derivScore = 5; // Neutral
    } else if (fundingRate < 0.1) {
      derivScore = 3;
    } else {
      derivScore = 1;
      warnings.push('High funding rate - crowded long positioning');
    }
    
    intermediates['funding_rate'] = fundingRate;
    intermediates['funding_score'] = derivScore;
  }
  
  if (oiChange !== null) {
    // Open interest change
    // Rising OI with price up = new money entering = bullish
    // Rising OI with price down = shorts opening = bearish short term but could squeeze
    if (oiChange > 20) derivScore += 5;
    else if (oiChange > 10) derivScore += 3;
    else if (oiChange < -20) derivScore += 2; // Deleveraging can be healthy
    
    intermediates['oi_change_24h'] = oiChange;
  }
  
  derivScore = Math.min(20, derivScore);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawScore = flowScore + whaleScore + stableScore + derivScore;
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
      formula: 'flow_score + whale_score + stable_score + deriv_score',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const flowProxyFeature = {
  definition: FLOW_PROXY_DEFINITION,
  compute: computeFlowProxy,
};
