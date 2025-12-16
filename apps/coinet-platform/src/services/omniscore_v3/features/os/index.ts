/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 OS FEATURES INDEX                                                      ║
 * ║                                                                               ║
 * ║   Opportunity Score features - fast-moving market signals (5 features)       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { Feature } from '../types';
import { liquidityFeature } from './liquidity';
import { volumeQualityFeature } from './volume-quality';
import { momentumFeature } from './momentum';
import { volRegimeFeature } from './vol-regime';
import { flowProxyFeature } from './flow-proxy';

// ═══════════════════════════════════════════════════════════════════════════════
// ALL OS FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

export const OS_FEATURES: Feature[] = [
  liquidityFeature,
  volumeQualityFeature,
  momentumFeature,
  volRegimeFeature,
  flowProxyFeature,
];

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE MAP
// ═══════════════════════════════════════════════════════════════════════════════

export const OS_FEATURE_MAP = new Map<string, Feature>(
  OS_FEATURES.map(f => [f.definition.id, f])
);

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHTS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const totalWeight = OS_FEATURES.reduce((sum, f) => sum + f.definition.defaultWeight, 0);
if (Math.abs(totalWeight - 1) > 0.01) {
  console.warn(`[OS Features] Weights sum to ${totalWeight}, expected 1.0`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { liquidityFeature } from './liquidity';
export { volumeQualityFeature } from './volume-quality';
export { momentumFeature } from './momentum';
export { volRegimeFeature } from './vol-regime';
export { flowProxyFeature } from './flow-proxy';
