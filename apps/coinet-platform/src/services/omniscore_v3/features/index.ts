/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 FEATURES INDEX                                                         ║
 * ║                                                                               ║
 * ║   All OmniScore v3.0 features - minimal, high-signal set                     ║
 * ║                                                                               ║
 * ║   Feature counts:                                                             ║
 * ║   - QS: 6 features (slow-moving fundamentals)                                ║
 * ║   - OS: 5 features (fast-moving opportunity)                                 ║
 * ║   - Risk: 6 features (explicit risks)                                        ║
 * ║   Total: 17 features                                                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { Feature, FeatureContext, FeatureResult, FeatureCategory } from './types';
import type { DataPoint } from '../types';

// Import feature groups
import { QS_FEATURES, QS_FEATURE_MAP } from './qs';
import { OS_FEATURES, OS_FEATURE_MAP } from './os';
import { RISK_FEATURES, RISK_FEATURE_MAP } from './risk';

// ═══════════════════════════════════════════════════════════════════════════════
// ALL FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_FEATURES: Feature[] = [
  ...QS_FEATURES,
  ...OS_FEATURES,
  ...RISK_FEATURES,
];

export const ALL_FEATURES_MAP = new Map<string, Feature>([
  ...QS_FEATURE_MAP,
  ...OS_FEATURE_MAP,
  ...RISK_FEATURE_MAP,
]);

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const FEATURE_COUNTS = {
  qs: QS_FEATURES.length,
  os: OS_FEATURES.length,
  risk: RISK_FEATURES.length,
  total: ALL_FEATURES.length,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a feature context from data points
 */
export function buildFeatureContext(
  dataPoints: DataPoint[],
  timestamp?: Date
): FeatureContext {
  const dataByKey = new Map<string, DataPoint>();
  
  for (const dp of dataPoints) {
    dataByKey.set(dp.key, dp);
  }
  
  return {
    dataPoints,
    dataByKey,
    timestamp: timestamp ?? new Date(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute all features in a category
 */
export function computeCategory(
  category: FeatureCategory,
  ctx: FeatureContext
): FeatureResult[] {
  const features = category === 'qs' ? QS_FEATURES :
                   category === 'os' ? OS_FEATURES :
                   RISK_FEATURES;
  
  return features.map(f => f.compute(ctx));
}

/**
 * Compute all features
 */
export function computeAllFeatures(
  ctx: FeatureContext
): {
  qs: FeatureResult[];
  os: FeatureResult[];
  risk: FeatureResult[];
} {
  return {
    qs: computeCategory('qs', ctx),
    os: computeCategory('os', ctx),
    risk: computeCategory('risk', ctx),
  };
}

/**
 * Compute a single feature by ID
 */
export function computeFeatureById(
  featureId: string,
  ctx: FeatureContext
): FeatureResult | null {
  const feature = ALL_FEATURES_MAP.get(featureId);
  if (!feature) return null;
  return feature.compute(ctx);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface CategoryScore {
  score: number;
  coverage: number;
  confidence: number;
  availableFeatures: number;
  totalFeatures: number;
  results: FeatureResult[];
}

/**
 * Aggregate feature results into a category score
 */
export function aggregateResults(results: FeatureResult[]): CategoryScore {
  const available = results.filter(r => r.available && r.normalized !== null);
  
  if (available.length === 0) {
    return {
      score: 0,
      coverage: 0,
      confidence: 0,
      availableFeatures: 0,
      totalFeatures: results.length,
      results,
    };
  }
  
  // Weighted average
  let weightedSum = 0;
  let totalWeight = 0;
  let totalCoverage = 0;
  let totalConfidence = 0;
  
  for (const r of available) {
    const weight = r.weight;
    weightedSum += r.normalized! * weight;
    totalWeight += weight;
    totalCoverage += r.quality.coverage;
    totalConfidence += r.quality.confidence;
  }
  
  // Renormalize weights if not all features available
  const score = totalWeight > 0 ? weightedSum / totalWeight : 0;
  
  return {
    score: Math.round(score * 10) / 10,
    coverage: available.length > 0 ? totalCoverage / available.length : 0,
    confidence: available.length > 0 ? totalConfidence / available.length : 0,
    availableFeatures: available.length,
    totalFeatures: results.length,
    results,
  };
}

/**
 * Get top N drivers (highest contributors)
 */
export function getTopDrivers(
  results: FeatureResult[],
  n: number = 5
): FeatureResult[] {
  return results
    .filter(r => r.available && r.contribution !== null)
    .sort((a, b) => Math.abs(b.contribution!) - Math.abs(a.contribution!))
    .slice(0, n);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RE-EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Types
export type {
  Feature,
  FeatureDefinition,
  FeatureFunction,
  FeatureResult,
  FeatureContext,
  FeatureCategory,
} from './types';

export {
  getDataValue,
  getDataValues,
  checkRequiredInputs,
  calculateFreshnessHours,
  calculateConfidence,
  normalizeLinear,
  normalizeLog,
  normalizeSigmoid,
  createUnavailableResult,
} from './types';

// QS Features
export { QS_FEATURES, QS_FEATURE_MAP } from './qs';
export { securityPostureFeature } from './qs/security-posture';
export { devDeliveryFeature } from './qs/dev-delivery';
export { adoptionFeature } from './qs/adoption';
export { ecosystemDepthFeature } from './qs/ecosystem-depth';
export { sustainabilityFeature } from './qs/sustainability';
export { decentralizationFeature } from './qs/decentralization';

// OS Features
export { OS_FEATURES, OS_FEATURE_MAP } from './os';
export { liquidityFeature } from './os/liquidity';
export { volumeQualityFeature } from './os/volume-quality';
export { momentumFeature } from './os/momentum';
export { volRegimeFeature } from './os/vol-regime';
export { flowProxyFeature } from './os/flow-proxy';

// Risk Features
export { RISK_FEATURES, RISK_FEATURE_MAP } from './risk';
export { liquidityFragilityFeature } from './risk/liquidity-fragility';
export { concentrationRiskFeature } from './risk/concentration-risk';
export { unlockRiskFeature } from './risk/unlock-risk';
export { adminPrivilegeRiskFeature } from './risk/admin-privilege-risk';
export { incidentRiskFeature } from './risk/incident-risk';
export { dataIntegrityRiskFeature } from './risk/data-integrity-risk';
