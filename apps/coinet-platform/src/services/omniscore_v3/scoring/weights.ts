/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ⚖️ FIXED WEIGHTS                                                          ║
 * ║                                                                               ║
 * ║   Define weights ONCE and keep STABLE                                        ║
 * ║   NO regime modulation                                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// POS COMPONENT WEIGHTS (FIXED - DO NOT CHANGE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fixed weights for Project OmniScore calculation
 * 
 * posRaw = QS_WEIGHT*qs + OS_WEIGHT*os + SAFETY_WEIGHT*(100 - risk)
 * 
 * When OS is gated (missing opportunity data):
 * posRaw = QS_GATED_WEIGHT*qs + SAFETY_GATED_WEIGHT*(100 - risk)
 * 
 * These weights are FIXED and should NOT be modulated by regime.
 * Changes require version bump and re-validation.
 */
export const POS_WEIGHTS = {
  /** Quality Score weight - fundamentals (slow) */
  QS: 0.60,
  
  /** Opportunity Score weight - market timing (fast) */
  OS: 0.25,
  
  /** Safety weight (100 - Risk) */
  SAFETY: 0.15,
} as const;

/**
 * Weights when OS is gated (renormalized without OS)
 */
export const POS_WEIGHTS_OS_GATED = {
  /** Quality Score weight when OS unavailable */
  QS: 0.80,
  
  /** Safety weight when OS unavailable */
  SAFETY: 0.20,
} as const;

// Validate weights sum to 1
const _posWeightSum = POS_WEIGHTS.QS + POS_WEIGHTS.OS + POS_WEIGHTS.SAFETY;
if (Math.abs(_posWeightSum - 1) > 0.001) {
  throw new Error(`POS weights must sum to 1.0, got ${_posWeightSum}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QS FEATURE WEIGHTS (FIXED - DO NOT CHANGE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fixed weights for Quality Score features
 */
export const QS_FEATURE_WEIGHTS = {
  qs_security_posture: 0.20,
  qs_dev_delivery: 0.20,
  qs_adoption: 0.20,
  qs_ecosystem_depth: 0.15,
  qs_sustainability: 0.10,
  qs_decentralization: 0.15,
} as const;

// Validate weights sum to 1
const _qsWeightSum = Object.values(QS_FEATURE_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(_qsWeightSum - 1) > 0.001) {
  throw new Error(`QS feature weights must sum to 1.0, got ${_qsWeightSum}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// OS FEATURE WEIGHTS (FIXED - DO NOT CHANGE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fixed weights for Opportunity Score features
 */
export const OS_FEATURE_WEIGHTS = {
  os_liquidity: 0.25,
  os_volume_quality: 0.15,
  os_momentum: 0.25,
  os_vol_regime: 0.20,
  os_flow_proxy: 0.15,
} as const;

// Validate weights sum to 1
const _osWeightSum = Object.values(OS_FEATURE_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(_osWeightSum - 1) > 0.001) {
  throw new Error(`OS feature weights must sum to 1.0, got ${_osWeightSum}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RISK FEATURE WEIGHTS (FIXED - DO NOT CHANGE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fixed weights for Risk Score features
 */
export const RISK_FEATURE_WEIGHTS = {
  risk_liquidity_fragility: 0.20,
  risk_concentration: 0.20,
  risk_unlock: 0.15,
  risk_admin_privilege: 0.15,
  risk_incident: 0.15,
  risk_data_integrity: 0.15,
} as const;

// Validate weights sum to 1
const _riskWeightSum = Object.values(RISK_FEATURE_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(_riskWeightSum - 1) > 0.001) {
  throw new Error(`Risk feature weights must sum to 1.0, got ${_riskWeightSum}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHT LOOKUP
// ═══════════════════════════════════════════════════════════════════════════════

export type FeatureWeightId = 
  | keyof typeof QS_FEATURE_WEIGHTS 
  | keyof typeof OS_FEATURE_WEIGHTS 
  | keyof typeof RISK_FEATURE_WEIGHTS;

/**
 * Get the fixed weight for any feature
 */
export function getFeatureWeight(featureId: string): number {
  if (featureId in QS_FEATURE_WEIGHTS) {
    return QS_FEATURE_WEIGHTS[featureId as keyof typeof QS_FEATURE_WEIGHTS];
  }
  if (featureId in OS_FEATURE_WEIGHTS) {
    return OS_FEATURE_WEIGHTS[featureId as keyof typeof OS_FEATURE_WEIGHTS];
  }
  if (featureId in RISK_FEATURE_WEIGHTS) {
    return RISK_FEATURE_WEIGHTS[featureId as keyof typeof RISK_FEATURE_WEIGHTS];
  }
  
  // Unknown feature - return 0 (will not contribute)
  console.warn(`Unknown feature weight requested: ${featureId}`);
  return 0;
}

/**
 * Get all feature weights for a category
 */
export function getCategoryWeights(
  category: 'qs' | 'os' | 'risk'
): Record<string, number> {
  switch (category) {
    case 'qs': return { ...QS_FEATURE_WEIGHTS };
    case 'os': return { ...OS_FEATURE_WEIGHTS };
    case 'risk': return { ...RISK_FEATURE_WEIGHTS };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHT DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Human-readable weight documentation
 */
export const WEIGHT_DOCUMENTATION = {
  formula: 'posRaw = 0.60*QS + 0.25*OS + 0.15*(100 - Risk)',
  formulaOsGated: 'posRaw = 0.80*QS + 0.20*(100 - Risk) [when OS unavailable]',
  
  components: {
    QS: {
      weight: 0.60,
      description: 'Quality Score - slow-moving fundamentals',
      rationale: 'Fundamentals are the PRIMARY driver of long-term value (60%)',
    },
    OS: {
      weight: 0.25,
      description: 'Opportunity Score - fast-moving market signals',
      rationale: 'Timing matters for entry/exit, but less than fundamentals (25%)',
    },
    SAFETY: {
      weight: 0.15,
      description: 'Safety Score (100 - Risk)',
      rationale: 'Risk must be explicitly penalized, not hidden in other scores (15%)',
    },
  },
  
  features: {
    qs: {
      security_posture: { weight: 0.20, description: 'Audits, incidents, bounties' },
      dev_delivery: { weight: 0.20, description: 'Releases, maintainers, issues' },
      adoption: { weight: 0.20, description: 'Fees, users, retention' },
      ecosystem_depth: { weight: 0.15, description: 'TVL, protocols, integrations' },
      sustainability: { weight: 0.10, description: 'Economics, runway' },
      decentralization: { weight: 0.15, description: 'Validators, governance' },
    },
    os: {
      liquidity: { weight: 0.25, description: 'Volume, spread, depth' },
      volume_quality: { weight: 0.15, description: 'Wash trading detection' },
      momentum: { weight: 0.25, description: 'Multi-timeframe returns' },
      vol_regime: { weight: 0.20, description: 'Volatility environment' },
      flow_proxy: { weight: 0.15, description: 'Exchange/whale flows' },
    },
    risk: {
      liquidity_fragility: { weight: 0.20, description: 'Thin books risk' },
      concentration: { weight: 0.20, description: 'Holder concentration' },
      unlock: { weight: 0.15, description: 'Vesting/unlock schedule' },
      admin_privilege: { weight: 0.15, description: 'Contract permissions' },
      incident: { weight: 0.15, description: 'Past security issues' },
      data_integrity: { weight: 0.15, description: 'Data quality risk' },
    },
  },
  
  tiers: {
    Elite: { min: 85, description: 'Top-tier assets' },
    Strong: { min: 70, description: 'Solid fundamentals' },
    Neutral: { min: 50, description: 'Average quality' },
    Weak: { min: 30, description: 'Below average' },
    Critical: { min: 0, description: 'High risk / poor quality' },
  },
  
  version: '3.0.0',
  lastUpdated: '2024-12-16',
  changeRequiresVersionBump: true,
} as const;
