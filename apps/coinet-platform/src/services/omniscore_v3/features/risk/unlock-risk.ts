/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔓 RISK FEATURE: Unlock Risk                                              ║
 * ║                                                                               ║
 * ║   Measures: Next 30/90d unlock intensity, cliff events                       ║
 * ║   Is there a wall of tokens about to hit the market?                         ║
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

export const UNLOCK_RISK_DEFINITION: FeatureDefinition = {
  id: 'risk_unlock',
  name: 'Unlock Risk',
  category: 'risk',
  description: 'Measures risk from upcoming token unlocks and vesting cliffs',
  segment: 'TOKEN',
  defaultWeight: 0.15,
  requiredInputs: [],
  optionalInputs: [
    'unlock_30d_percent',
    'unlock_90d_percent',
    'unlock_365d_percent',
    'next_unlock_date',
    'next_unlock_percent',
    'circulating_supply_ratio',
    'days_to_next_cliff',
    'monthly_emission_percent',
    'total_locked_percent',
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

export const computeUnlockRisk: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = UNLOCK_RISK_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  if (present.length < 1) {
    return createUnavailableResult(def, missing, 'No unlock schedule data available');
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SHORT-TERM UNLOCK RISK (0-40 points) - Next 30 days
  // ─────────────────────────────────────────────────────────────────────────────
  let shortTermRisk = 0;
  const unlock30d = getDataValue(ctx, 'unlock_30d_percent');
  const nextUnlockPercent = getDataValue(ctx, 'next_unlock_percent');
  const daysToCliff = getDataValue(ctx, 'days_to_next_cliff');
  
  if (unlock30d !== null) {
    if (unlock30d >= 10) {
      shortTermRisk = 40;
      warnings.push(`Major unlock: ${unlock30d.toFixed(1)}% in next 30 days`);
    } else if (unlock30d >= 5) {
      shortTermRisk = 30;
      warnings.push(`Significant unlock: ${unlock30d.toFixed(1)}% in next 30 days`);
    } else if (unlock30d >= 3) {
      shortTermRisk = 20;
    } else if (unlock30d >= 1) {
      shortTermRisk = 10;
    } else {
      shortTermRisk = 3;
    }
    
    intermediates['unlock_30d'] = unlock30d;
    intermediates['short_term_risk'] = shortTermRisk;
  }
  
  // Cliff event bonus risk
  if (daysToCliff !== null && daysToCliff <= 30 && nextUnlockPercent !== null) {
    if (nextUnlockPercent >= 5) {
      shortTermRisk = Math.max(shortTermRisk, 35);
      warnings.push(`Cliff unlock: ${nextUnlockPercent.toFixed(1)}% in ${daysToCliff} days`);
    } else if (nextUnlockPercent >= 2) {
      shortTermRisk = Math.max(shortTermRisk, 25);
    }
    
    intermediates['days_to_cliff'] = daysToCliff;
    intermediates['cliff_unlock_percent'] = nextUnlockPercent;
  }
  
  shortTermRisk = Math.min(40, shortTermRisk);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // MEDIUM-TERM UNLOCK RISK (0-25 points) - Next 90 days
  // ─────────────────────────────────────────────────────────────────────────────
  let mediumTermRisk = 0;
  const unlock90d = getDataValue(ctx, 'unlock_90d_percent');
  
  if (unlock90d !== null) {
    if (unlock90d >= 20) {
      mediumTermRisk = 25;
      warnings.push(`Heavy dilution ahead: ${unlock90d.toFixed(1)}% in next 90 days`);
    } else if (unlock90d >= 15) {
      mediumTermRisk = 20;
    } else if (unlock90d >= 10) {
      mediumTermRisk = 15;
    } else if (unlock90d >= 5) {
      mediumTermRisk = 8;
    } else {
      mediumTermRisk = 3;
    }
    
    intermediates['unlock_90d'] = unlock90d;
    intermediates['medium_term_risk'] = mediumTermRisk;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // EMISSION RATE RISK (0-20 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let emissionRisk = 0;
  const monthlyEmission = getDataValue(ctx, 'monthly_emission_percent');
  const circulatingRatio = getDataValue(ctx, 'circulating_supply_ratio');
  
  if (monthlyEmission !== null) {
    if (monthlyEmission >= 5) {
      emissionRisk = 20;
      warnings.push(`High monthly inflation: ${monthlyEmission.toFixed(1)}%`);
    } else if (monthlyEmission >= 3) {
      emissionRisk = 15;
    } else if (monthlyEmission >= 2) {
      emissionRisk = 10;
    } else if (monthlyEmission >= 1) {
      emissionRisk = 5;
    } else {
      emissionRisk = 2;
    }
    
    intermediates['monthly_emission'] = monthlyEmission;
    intermediates['emission_risk'] = emissionRisk;
  }
  
  // Circulating ratio compounds the risk
  if (circulatingRatio !== null && circulatingRatio < 0.5) {
    const unlockablePercent = (1 - circulatingRatio) * 100;
    emissionRisk = Math.min(20, emissionRisk + 5);
    intermediates['unlockable_supply'] = unlockablePercent;
    
    if (circulatingRatio < 0.3) {
      warnings.push(`Only ${(circulatingRatio * 100).toFixed(0)}% circulating - ${unlockablePercent.toFixed(0)}% still to unlock`);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TOTAL LOCKED CONTEXT (0-15 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let lockedRisk = 0;
  const totalLocked = getDataValue(ctx, 'total_locked_percent');
  
  if (totalLocked !== null) {
    // More locked = more future dilution potential
    if (totalLocked >= 70) {
      lockedRisk = 15;
      warnings.push(`${totalLocked.toFixed(0)}% of supply still locked`);
    } else if (totalLocked >= 50) {
      lockedRisk = 10;
    } else if (totalLocked >= 30) {
      lockedRisk = 5;
    } else {
      lockedRisk = 2;
    }
    
    intermediates['total_locked'] = totalLocked;
    intermediates['locked_risk'] = lockedRisk;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL RISK SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawRisk = shortTermRisk + mediumTermRisk + emissionRisk + lockedRisk;
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
      formula: 'short_term_risk + medium_term_risk + emission_risk + locked_risk',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const unlockRiskFeature = {
  definition: UNLOCK_RISK_DEFINITION,
  compute: computeUnlockRisk,
};
