/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ♻️ QS FEATURE: Sustainability                                              ║
 * ║                                                                               ║
 * ║   Measures: Fees vs emissions, dilution pressure, economic viability         ║
 * ║   Can the protocol sustain itself without token emissions?                   ║
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

export const SUSTAINABILITY_DEFINITION: FeatureDefinition = {
  id: 'qs_sustainability',
  name: 'Sustainability',
  category: 'qs',
  description: 'Measures economic sustainability through revenue vs emissions and dilution pressure',
  segment: 'ECO',
  defaultWeight: 0.10,
  requiredInputs: [],
  optionalInputs: [
    'revenue_usd_30d',
    'fees_usd_30d',
    'token_incentives_usd_30d',
    'fee_to_incentive_ratio',
    'inflation_rate_annual',
    'circulating_supply_ratio',
    'treasury_runway_months',
    'revenue_to_valuation_ratio',
  ],
  updateFrequencyHours: 168, // Weekly
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

export const computeSustainability: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = SUSTAINABILITY_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  if (present.length < 2) {
    return createUnavailableResult(def, missing, 'Insufficient sustainability data');
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FEE/INCENTIVE RATIO (0-40 points)
  // Can the protocol pay for its own security/incentives with fees?
  // ─────────────────────────────────────────────────────────────────────────────
  let feeRatioScore = 0;
  const feeToIncentive = getDataValue(ctx, 'fee_to_incentive_ratio');
  const revenue = getDataValue(ctx, 'revenue_usd_30d');
  const fees = getDataValue(ctx, 'fees_usd_30d');
  const incentives = getDataValue(ctx, 'token_incentives_usd_30d');
  
  // Try direct ratio first, then calculate
  let ratio = feeToIncentive;
  if (ratio === null && fees !== null && incentives !== null && incentives > 0) {
    ratio = fees / incentives;
    intermediates['calculated_fee_ratio'] = ratio;
  }
  
  if (ratio !== null) {
    // Ratio > 1 means fees cover incentives (sustainable)
    if (ratio >= 2) feeRatioScore = 40;      // Very sustainable
    else if (ratio >= 1) feeRatioScore = 35;  // Sustainable
    else if (ratio >= 0.5) feeRatioScore = 25; // Getting there
    else if (ratio >= 0.2) feeRatioScore = 15; // Needs work
    else if (ratio >= 0.05) feeRatioScore = 8; // Highly subsidized
    else feeRatioScore = 3;                    // Unsustainable
    
    intermediates['fee_ratio_score'] = feeRatioScore;
    
    if (ratio < 0.1) {
      warnings.push('Revenue covers <10% of token incentives');
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // INFLATION/DILUTION PRESSURE (0-30 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let inflationScore = 30; // Start optimistic
  const inflation = getDataValue(ctx, 'inflation_rate_annual');
  const circulatingRatio = getDataValue(ctx, 'circulating_supply_ratio');
  
  if (inflation !== null) {
    // Lower inflation = better
    if (inflation <= 0) inflationScore = 30;      // Deflationary
    else if (inflation <= 2) inflationScore = 27;  // Low inflation
    else if (inflation <= 5) inflationScore = 22;  // Moderate
    else if (inflation <= 10) inflationScore = 15; // High
    else if (inflation <= 20) inflationScore = 8;  // Very high
    else {
      inflationScore = 3;
      warnings.push(`High inflation rate: ${inflation.toFixed(1)}%`);
    }
    
    intermediates['inflation_score'] = inflationScore;
  }
  
  if (circulatingRatio !== null) {
    // More circulating = less future dilution
    if (circulatingRatio < 0.3) {
      inflationScore -= 10;
      warnings.push(`Only ${(circulatingRatio * 100).toFixed(0)}% of supply circulating`);
    } else if (circulatingRatio < 0.5) {
      inflationScore -= 5;
    } else if (circulatingRatio > 0.9) {
      inflationScore += 5; // Bonus for mostly unlocked
    }
    
    intermediates['circulating_adj'] = circulatingRatio > 0.9 ? 5 : (circulatingRatio < 0.5 ? -5 : 0);
  }
  
  inflationScore = Math.max(0, Math.min(30, inflationScore));
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TREASURY RUNWAY (0-15 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let treasuryScore = 0;
  const runway = getDataValue(ctx, 'treasury_runway_months');
  
  if (runway !== null) {
    if (runway >= 48) treasuryScore = 15;      // 4+ years
    else if (runway >= 24) treasuryScore = 12;  // 2+ years
    else if (runway >= 12) treasuryScore = 8;   // 1+ year
    else if (runway >= 6) treasuryScore = 4;    // 6+ months
    else {
      treasuryScore = 1;
      warnings.push(`Low treasury runway: ${runway.toFixed(0)} months`);
    }
    
    intermediates['treasury_score'] = treasuryScore;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // REVENUE QUALITY (0-15 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let revenueScore = 0;
  const revToVal = getDataValue(ctx, 'revenue_to_valuation_ratio');
  
  if (revToVal !== null) {
    // P/S ratio inverse - higher revenue relative to valuation is better
    if (revToVal >= 0.5) revenueScore = 15;     // Cheap
    else if (revToVal >= 0.2) revenueScore = 12;
    else if (revToVal >= 0.1) revenueScore = 8;
    else if (revToVal >= 0.05) revenueScore = 4;
    else revenueScore = 1;
    
    intermediates['revenue_quality_score'] = revenueScore;
  } else if (revenue !== null && revenue > 0) {
    // Fallback: just having revenue is positive
    revenueScore = 5;
    intermediates['revenue_exists_bonus'] = 5;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawScore = feeRatioScore + inflationScore + treasuryScore + revenueScore;
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
      formula: 'fee_ratio_score + inflation_score + treasury_score + revenue_score',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const sustainabilityFeature = {
  definition: SUSTAINABILITY_DEFINITION,
  compute: computeSustainability,
};
