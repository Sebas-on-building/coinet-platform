/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 RISK FEATURE: Concentration Risk                                       ║
 * ║                                                                               ║
 * ║   Measures: Top holder concentration, supply distribution                    ║
 * ║   Can whales move the market at will?                                        ║
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

export const CONCENTRATION_RISK_DEFINITION: FeatureDefinition = {
  id: 'risk_concentration',
  name: 'Concentration Risk',
  category: 'risk',
  description: 'Measures risk from concentrated token holdings and supply distribution',
  segment: 'TOKEN',
  defaultWeight: 0.20,
  requiredInputs: [],
  optionalInputs: [
    'top10_holders_percent',
    'top50_holders_percent',
    'top100_holders_percent',
    'exchange_holdings_percent',
    'team_holdings_percent',
    'foundation_holdings_percent',
    'vc_holdings_percent',
    'gini_coefficient',
    'unique_holders',
  ],
  updateFrequencyHours: 24,
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

export const computeConcentrationRisk: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = CONCENTRATION_RISK_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  if (present.length < 1) {
    return createUnavailableResult(def, missing, 'No holder concentration data available');
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TOP HOLDER CONCENTRATION (0-40 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let topHolderRisk = 0;
  const top10 = getDataValue(ctx, 'top10_holders_percent');
  const top50 = getDataValue(ctx, 'top50_holders_percent');
  
  if (top10 !== null) {
    if (top10 >= 80) {
      topHolderRisk = 40;
      warnings.push('Extreme concentration: top 10 hold >80%');
    } else if (top10 >= 60) {
      topHolderRisk = 32;
      warnings.push('High concentration: top 10 hold >60%');
    } else if (top10 >= 40) {
      topHolderRisk = 22;
    } else if (top10 >= 25) {
      topHolderRisk = 12;
    } else {
      topHolderRisk = 5;
    }
    
    intermediates['top10_percent'] = top10;
    intermediates['top10_risk'] = topHolderRisk;
  } else if (top50 !== null) {
    // Use top 50 as fallback
    if (top50 >= 90) {
      topHolderRisk = 35;
    } else if (top50 >= 75) {
      topHolderRisk = 25;
    } else if (top50 >= 50) {
      topHolderRisk = 15;
    } else {
      topHolderRisk = 8;
    }
    
    intermediates['top50_percent'] = top50;
    intermediates['top50_derived_risk'] = topHolderRisk;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // INSIDER HOLDINGS (0-30 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let insiderRisk = 0;
  const teamHoldings = getDataValue(ctx, 'team_holdings_percent');
  const foundationHoldings = getDataValue(ctx, 'foundation_holdings_percent');
  const vcHoldings = getDataValue(ctx, 'vc_holdings_percent');
  
  const totalInsider = 
    (teamHoldings ?? 0) + 
    (foundationHoldings ?? 0) + 
    (vcHoldings ?? 0);
  
  if (totalInsider > 0) {
    if (totalInsider >= 50) {
      insiderRisk = 30;
      warnings.push(`Insiders control ${totalInsider.toFixed(0)}% of supply`);
    } else if (totalInsider >= 35) {
      insiderRisk = 22;
      warnings.push(`High insider holdings: ${totalInsider.toFixed(0)}%`);
    } else if (totalInsider >= 20) {
      insiderRisk = 14;
    } else if (totalInsider >= 10) {
      insiderRisk = 7;
    } else {
      insiderRisk = 3;
    }
    
    intermediates['total_insider_percent'] = totalInsider;
    intermediates['insider_risk'] = insiderRisk;
    
    if (teamHoldings !== null) intermediates['team_percent'] = teamHoldings;
    if (foundationHoldings !== null) intermediates['foundation_percent'] = foundationHoldings;
    if (vcHoldings !== null) intermediates['vc_percent'] = vcHoldings;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // EXCHANGE CONCENTRATION (0-15 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let exchangeRisk = 0;
  const exchangeHoldings = getDataValue(ctx, 'exchange_holdings_percent');
  
  if (exchangeHoldings !== null) {
    // Very high exchange holdings = potential selling pressure
    // Very low = tokens are held, less liquid
    if (exchangeHoldings >= 40) {
      exchangeRisk = 15;
      warnings.push('High exchange holdings - potential selling pressure');
    } else if (exchangeHoldings >= 25) {
      exchangeRisk = 10;
    } else if (exchangeHoldings >= 10) {
      exchangeRisk = 5;
    } else if (exchangeHoldings < 3) {
      exchangeRisk = 8; // Too low can also be risky
    } else {
      exchangeRisk = 3;
    }
    
    intermediates['exchange_percent'] = exchangeHoldings;
    intermediates['exchange_risk'] = exchangeRisk;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DISTRIBUTION QUALITY (0-15 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let distributionRisk = 0;
  const gini = getDataValue(ctx, 'gini_coefficient');
  const uniqueHolders = getDataValue(ctx, 'unique_holders');
  
  if (gini !== null) {
    // Gini coefficient (0 = perfect equality, 1 = perfect inequality)
    if (gini >= 0.95) {
      distributionRisk = 15;
      warnings.push('Extremely unequal distribution (Gini >0.95)');
    } else if (gini >= 0.90) {
      distributionRisk = 12;
    } else if (gini >= 0.85) {
      distributionRisk = 8;
    } else if (gini >= 0.75) {
      distributionRisk = 4;
    } else {
      distributionRisk = 2;
    }
    
    intermediates['gini'] = gini;
    intermediates['gini_risk'] = distributionRisk;
  }
  
  if (uniqueHolders !== null) {
    // Fewer unique holders = more concentration risk
    if (uniqueHolders < 1000) {
      distributionRisk = Math.max(distributionRisk, 12);
      warnings.push(`Very few unique holders: ${uniqueHolders}`);
    } else if (uniqueHolders < 10000) {
      distributionRisk = Math.max(distributionRisk, 8);
    } else if (uniqueHolders < 50000) {
      distributionRisk = Math.max(distributionRisk, 4);
    }
    
    intermediates['unique_holders'] = uniqueHolders;
  }
  
  distributionRisk = Math.min(15, distributionRisk);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL RISK SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawRisk = topHolderRisk + insiderRisk + exchangeRisk + distributionRisk;
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
      formula: 'top_holder_risk + insider_risk + exchange_risk + distribution_risk',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const concentrationRiskFeature = {
  definition: CONCENTRATION_RISK_DEFINITION,
  compute: computeConcentrationRisk,
};
