/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📈 QS FEATURE: Adoption                                                   ║
 * ║                                                                               ║
 * ║   Measures: Fees paid, retained activity, real usage                         ║
 * ║   Focus on PAYING users, not vanity metrics                                  ║
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

export const ADOPTION_DEFINITION: FeatureDefinition = {
  id: 'qs_adoption',
  name: 'Adoption',
  category: 'qs',
  description: 'Measures real usage through fees paid and retained activity',
  segment: 'ADOPT',
  defaultWeight: 0.20,
  requiredInputs: [],
  optionalInputs: [
    'fees_usd_24h',
    'fees_usd_7d',
    'fees_usd_30d',
    'active_addresses_30d',
    'tx_count_24h',
    'tx_count_7d',
    'dau_to_mau_ratio',
    'retention_30d',
    'unique_users_30d',
  ],
  updateFrequencyHours: 24,
  higherIsBetter: true,
  normalization: {
    method: 'log',
    min: 1000,      // $1K fees
    max: 100000000, // $100M fees
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const computeAdoption: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = ADOPTION_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  if (present.length < 2) {
    return createUnavailableResult(def, missing, 'Insufficient adoption data');
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FEES SCORE (0-40 points) - Best proxy for real value
  // ─────────────────────────────────────────────────────────────────────────────
  let feesScore = 0;
  const fees24h = getDataValue(ctx, 'fees_usd_24h');
  const fees7d = getDataValue(ctx, 'fees_usd_7d');
  const fees30d = getDataValue(ctx, 'fees_usd_30d');
  
  // Use best available fee data
  let primaryFees = fees30d ?? (fees7d ? fees7d * 4.3 : null) ?? (fees24h ? fees24h * 30 : null);
  
  if (primaryFees !== null) {
    // Log scale for fees (monthly)
    if (primaryFees >= 100_000_000) feesScore = 40;      // $100M+
    else if (primaryFees >= 10_000_000) feesScore = 35;   // $10M+
    else if (primaryFees >= 1_000_000) feesScore = 30;    // $1M+
    else if (primaryFees >= 100_000) feesScore = 22;      // $100K+
    else if (primaryFees >= 10_000) feesScore = 15;       // $10K+
    else if (primaryFees >= 1_000) feesScore = 8;         // $1K+
    else feesScore = 3;
    
    intermediates['fees_30d_estimate'] = primaryFees;
    intermediates['fees_score'] = feesScore;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIVITY SCORE (0-30 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let activityScore = 0;
  const activeAddresses = getDataValue(ctx, 'active_addresses_30d');
  const txCount24h = getDataValue(ctx, 'tx_count_24h');
  
  if (activeAddresses !== null) {
    // Active addresses (log scale)
    if (activeAddresses >= 1_000_000) activityScore = 20;
    else if (activeAddresses >= 100_000) activityScore = 16;
    else if (activeAddresses >= 10_000) activityScore = 12;
    else if (activeAddresses >= 1_000) activityScore = 8;
    else if (activeAddresses >= 100) activityScore = 4;
    else activityScore = 1;
    
    intermediates['active_addresses_score'] = activityScore;
  }
  
  if (txCount24h !== null) {
    // Transaction volume bonus
    let txBonus = 0;
    if (txCount24h >= 1_000_000) txBonus = 10;
    else if (txCount24h >= 100_000) txBonus = 7;
    else if (txCount24h >= 10_000) txBonus = 4;
    else if (txCount24h >= 1_000) txBonus = 2;
    
    activityScore += txBonus;
    intermediates['tx_volume_bonus'] = txBonus;
  }
  
  activityScore = Math.min(30, activityScore);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // RETENTION SCORE (0-30 points) - Stickiness
  // ─────────────────────────────────────────────────────────────────────────────
  let retentionScore = 0;
  const dauMauRatio = getDataValue(ctx, 'dau_to_mau_ratio');
  const retention30d = getDataValue(ctx, 'retention_30d');
  
  if (dauMauRatio !== null) {
    // DAU/MAU ratio (higher = stickier)
    // Excellent: >0.4, Good: >0.25, Okay: >0.15
    if (dauMauRatio >= 0.4) retentionScore = 20;
    else if (dauMauRatio >= 0.3) retentionScore = 16;
    else if (dauMauRatio >= 0.2) retentionScore = 12;
    else if (dauMauRatio >= 0.1) retentionScore = 8;
    else retentionScore = 4;
    
    intermediates['dau_mau_score'] = retentionScore;
  }
  
  if (retention30d !== null) {
    // 30-day retention rate
    let retBonus = 0;
    if (retention30d >= 0.5) retBonus = 10;
    else if (retention30d >= 0.3) retBonus = 7;
    else if (retention30d >= 0.15) retBonus = 4;
    else if (retention30d >= 0.05) retBonus = 2;
    
    retentionScore += retBonus;
    intermediates['retention_bonus'] = retBonus;
  }
  
  retentionScore = Math.min(30, retentionScore);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // WARNINGS
  // ─────────────────────────────────────────────────────────────────────────────
  if (primaryFees !== null && primaryFees < 10_000) {
    warnings.push('Low fee generation (<$10K/month)');
  }
  
  if (activeAddresses !== null && activeAddresses < 1_000) {
    warnings.push('Low active user count (<1K/month)');
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawScore = feesScore + activityScore + retentionScore;
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
      formula: 'fees_score + activity_score + retention_score',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const adoptionFeature = {
  definition: ADOPTION_DEFINITION,
  compute: computeAdoption,
};
