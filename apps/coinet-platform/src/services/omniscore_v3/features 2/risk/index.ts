/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 RISK FEATURES INDEX                                                    ║
 * ║                                                                               ║
 * ║   Risk Score features - explicit risk factors (6 features)                   ║
 * ║   Higher risk score = MORE risk (inverted from QS/OS)                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { Feature } from '../types';
import { liquidityFragilityFeature } from './liquidity-fragility';
import { concentrationRiskFeature } from './concentration-risk';
import { unlockRiskFeature } from './unlock-risk';
import { adminPrivilegeRiskFeature } from './admin-privilege-risk';
import { incidentRiskFeature } from './incident-risk';
import { dataIntegrityRiskFeature } from './data-integrity-risk';

// ═══════════════════════════════════════════════════════════════════════════════
// ALL RISK FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

export const RISK_FEATURES: Feature[] = [
  liquidityFragilityFeature,
  concentrationRiskFeature,
  unlockRiskFeature,
  adminPrivilegeRiskFeature,
  incidentRiskFeature,
  dataIntegrityRiskFeature,
];

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE MAP
// ═══════════════════════════════════════════════════════════════════════════════

export const RISK_FEATURE_MAP = new Map<string, Feature>(
  RISK_FEATURES.map(f => [f.definition.id, f])
);

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHTS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const totalWeight = RISK_FEATURES.reduce((sum, f) => sum + f.definition.defaultWeight, 0);
if (Math.abs(totalWeight - 1) > 0.01) {
  console.warn(`[Risk Features] Weights sum to ${totalWeight}, expected 1.0`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { liquidityFragilityFeature } from './liquidity-fragility';
export { concentrationRiskFeature } from './concentration-risk';
export { unlockRiskFeature } from './unlock-risk';
export { adminPrivilegeRiskFeature } from './admin-privilege-risk';
export { incidentRiskFeature } from './incident-risk';
export { dataIntegrityRiskFeature } from './data-integrity-risk';
