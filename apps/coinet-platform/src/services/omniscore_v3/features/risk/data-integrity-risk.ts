/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 RISK FEATURE: Data Integrity Risk                                      ║
 * ║                                                                               ║
 * ║   Measures: Missingness, disagreement between sources, staleness             ║
 * ║   How confident can we be in the other scores?                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { FeatureDefinition, FeatureFunction, FeatureResult, FeatureContext } from '../types';
import {
  checkRequiredInputs,
  calculateFreshnessHours,
  calculateConfidence,
  createUnavailableResult,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export const DATA_INTEGRITY_RISK_DEFINITION: FeatureDefinition = {
  id: 'risk_data_integrity',
  name: 'Data Integrity Risk',
  category: 'risk',
  description: 'Measures risk from data quality issues like missingness, staleness, and source disagreement',
  segment: 'MACRO',
  defaultWeight: 0.15,
  requiredInputs: [],
  optionalInputs: [], // Computed from context, not specific data points
  updateFrequencyHours: 1,
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

export const computeDataIntegrityRisk: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = DATA_INTEGRITY_RISK_DEFINITION;
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  const allDataPoints = ctx.dataPoints;
  const totalPoints = allDataPoints.length;
  
  if (totalPoints === 0) {
    return createUnavailableResult(def, [], 'No data points to assess integrity');
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // MISSINGNESS RISK (0-35 points)
  // How many data points are null/missing?
  // ─────────────────────────────────────────────────────────────────────────────
  let missingnessRisk = 0;
  const nullPoints = allDataPoints.filter(dp => dp.raw === null).length;
  const missingRatio = nullPoints / totalPoints;
  
  if (missingRatio >= 0.6) {
    missingnessRisk = 35;
    warnings.push(`${(missingRatio * 100).toFixed(0)}% of data points missing`);
  } else if (missingRatio >= 0.4) {
    missingnessRisk = 25;
    warnings.push(`${(missingRatio * 100).toFixed(0)}% of data points missing`);
  } else if (missingRatio >= 0.25) {
    missingnessRisk = 15;
  } else if (missingRatio >= 0.1) {
    missingnessRisk = 8;
  } else {
    missingnessRisk = 3;
  }
  
  intermediates['total_points'] = totalPoints;
  intermediates['null_points'] = nullPoints;
  intermediates['missing_ratio'] = missingRatio;
  intermediates['missingness_risk'] = missingnessRisk;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STALENESS RISK (0-30 points)
  // How old is the data?
  // ─────────────────────────────────────────────────────────────────────────────
  let stalenessRisk = 0;
  const stalePoints = allDataPoints.filter(dp => dp.isStale).length;
  const validPoints = allDataPoints.filter(dp => dp.raw !== null);
  
  if (validPoints.length > 0) {
    const staleRatio = stalePoints / validPoints.length;
    
    if (staleRatio >= 0.5) {
      stalenessRisk = 30;
      warnings.push(`${(staleRatio * 100).toFixed(0)}% of data is stale`);
    } else if (staleRatio >= 0.3) {
      stalenessRisk = 20;
      warnings.push(`${(staleRatio * 100).toFixed(0)}% of data is stale`);
    } else if (staleRatio >= 0.15) {
      stalenessRisk = 12;
    } else if (staleRatio >= 0.05) {
      stalenessRisk = 5;
    } else {
      stalenessRisk = 2;
    }
    
    // Also check average freshness
    const avgFreshness = calculateFreshnessHours(ctx, validPoints.map(p => p.key));
    if (avgFreshness > 48) {
      stalenessRisk = Math.max(stalenessRisk, 25);
      warnings.push(`Average data age: ${avgFreshness.toFixed(0)} hours`);
    } else if (avgFreshness > 24) {
      stalenessRisk = Math.max(stalenessRisk, 15);
    }
    
    intermediates['stale_points'] = stalePoints;
    intermediates['stale_ratio'] = staleRatio;
    intermediates['avg_freshness_hours'] = avgFreshness;
  }
  
  intermediates['staleness_risk'] = stalenessRisk;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SOURCE DIVERSITY RISK (0-20 points)
  // Are we relying on too few sources?
  // ─────────────────────────────────────────────────────────────────────────────
  let sourceRisk = 0;
  const sources = new Set(validPoints.map(dp => dp.source));
  const sourceCount = sources.size;
  
  if (sourceCount <= 1) {
    sourceRisk = 20;
    warnings.push('Data from single source only');
  } else if (sourceCount <= 2) {
    sourceRisk = 12;
  } else if (sourceCount <= 3) {
    sourceRisk = 6;
  } else {
    sourceRisk = 2;
  }
  
  intermediates['unique_sources'] = sourceCount;
  intermediates['source_risk'] = sourceRisk;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CONFIDENCE RISK (0-15 points)
  // How reliable are the sources?
  // ─────────────────────────────────────────────────────────────────────────────
  let confidenceRisk = 0;
  const avgConfidence = calculateConfidence(ctx, validPoints.map(p => p.key));
  
  if (avgConfidence < 0.5) {
    confidenceRisk = 15;
    warnings.push('Low source reliability');
  } else if (avgConfidence < 0.7) {
    confidenceRisk = 10;
  } else if (avgConfidence < 0.85) {
    confidenceRisk = 5;
  } else {
    confidenceRisk = 2;
  }
  
  intermediates['avg_confidence'] = avgConfidence;
  intermediates['confidence_risk'] = confidenceRisk;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DERIVED DATA RISK (0-10 points bonus)
  // How much data is derived vs direct?
  // ─────────────────────────────────────────────────────────────────────────────
  let derivedRisk = 0;
  const derivedPoints = validPoints.filter(dp => dp.isDerived).length;
  const derivedRatio = validPoints.length > 0 ? derivedPoints / validPoints.length : 0;
  
  if (derivedRatio >= 0.5) {
    derivedRisk = 10;
    warnings.push('Over 50% of data is derived');
  } else if (derivedRatio >= 0.3) {
    derivedRisk = 5;
  } else {
    derivedRisk = 2;
  }
  
  intermediates['derived_points'] = derivedPoints;
  intermediates['derived_ratio'] = derivedRatio;
  intermediates['derived_risk'] = derivedRisk;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SEGMENT COVERAGE CHECK
  // Are critical segments missing?
  // ─────────────────────────────────────────────────────────────────────────────
  const segmentCounts: Record<string, number> = {};
  for (const dp of validPoints) {
    segmentCounts[dp.segment] = (segmentCounts[dp.segment] || 0) + 1;
  }
  
  const criticalSegments = ['MARKET', 'TECH', 'SEC'];
  const missingCritical = criticalSegments.filter(s => !segmentCounts[s]);
  
  let segmentRisk = 0;
  if (missingCritical.length >= 2) {
    segmentRisk = 10;
    warnings.push(`Missing critical segments: ${missingCritical.join(', ')}`);
  } else if (missingCritical.length === 1) {
    segmentRisk = 5;
    warnings.push(`Missing segment: ${missingCritical[0]}`);
  }
  
  intermediates['missing_critical_segments'] = missingCritical.length;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL RISK SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawRisk = missingnessRisk + stalenessRisk + sourceRisk + confidenceRisk + derivedRisk + segmentRisk;
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
      coverage: 1 - missingRatio, // Inverse of missing ratio
      freshnessHours: intermediates['avg_freshness_hours'] || 0,
      confidence: avgConfidence,
    },
    inputs: validPoints.map(p => p.key),
    missing: [],
    warnings,
    debug: {
      formula: 'missingness + staleness + source + confidence + derived + segment',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const dataIntegrityRiskFeature = {
  definition: DATA_INTEGRITY_RISK_DEFINITION,
  compute: computeDataIntegrityRisk,
};
