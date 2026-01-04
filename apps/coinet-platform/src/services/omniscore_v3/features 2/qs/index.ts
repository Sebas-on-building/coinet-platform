/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 QS FEATURES INDEX                                                      ║
 * ║                                                                               ║
 * ║   Quality Score features - slow-moving fundamentals (6 features)             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { Feature } from '../types';
import { securityPostureFeature } from './security-posture';
import { devDeliveryFeature } from './dev-delivery';
import { adoptionFeature } from './adoption';
import { ecosystemDepthFeature } from './ecosystem-depth';
import { sustainabilityFeature } from './sustainability';
import { decentralizationFeature } from './decentralization';

// ═══════════════════════════════════════════════════════════════════════════════
// ALL QS FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

export const QS_FEATURES: Feature[] = [
  securityPostureFeature,
  devDeliveryFeature,
  adoptionFeature,
  ecosystemDepthFeature,
  sustainabilityFeature,
  decentralizationFeature,
];

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE MAP
// ═══════════════════════════════════════════════════════════════════════════════

export const QS_FEATURE_MAP = new Map<string, Feature>(
  QS_FEATURES.map(f => [f.definition.id, f])
);

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHTS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const totalWeight = QS_FEATURES.reduce((sum, f) => sum + f.definition.defaultWeight, 0);
if (Math.abs(totalWeight - 1) > 0.01) {
  console.warn(`[QS Features] Weights sum to ${totalWeight}, expected 1.0`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { securityPostureFeature } from './security-posture';
export { devDeliveryFeature } from './dev-delivery';
export { adoptionFeature } from './adoption';
export { ecosystemDepthFeature } from './ecosystem-depth';
export { sustainabilityFeature } from './sustainability';
export { decentralizationFeature } from './decentralization';
