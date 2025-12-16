/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 CALIBRATION TYPES                                                      ║
 * ║                                                                               ║
 * ║   Types for score distribution sanity, anchor priors, and golden cases       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DISTRIBUTION STATS
// ═══════════════════════════════════════════════════════════════════════════════

export interface DistributionStats {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  skewness: number;
  kurtosis: number;
}

export interface ScoreDistribution {
  timestamp: Date;
  universeSize: number;
  
  // Score distributions
  pos: DistributionStats;
  qs: DistributionStats;
  os: DistributionStats;
  risk: DistributionStats;
  confidence: DistributionStats;
  
  // Coverage stats
  coverageQs: DistributionStats;
  coverageOs: DistributionStats;
  
  // Gating stats
  gatedCount: number;
  gatedPercent: number;
  partialCount: number;
  partialPercent: number;
  
  // Legitimacy breakdown
  legitimacyCounts: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISTRIBUTION HEALTH
// ═══════════════════════════════════════════════════════════════════════════════

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface DistributionHealthCheck {
  status: HealthStatus;
  metric: string;
  expected: string;
  actual: string;
  message: string;
}

export interface DistributionHealth {
  overall: HealthStatus;
  checks: DistributionHealthCheck[];
  warnings: string[];
  criticalIssues: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANCHOR PRIORS
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnchorPrior {
  /** Asset canonical ID */
  assetId: string;
  
  /** Historical QS baseline */
  qsPrior: number;
  
  /** Historical OS baseline (null if insufficient history) */
  osPrior: number | null;
  
  /** Historical Risk baseline */
  riskPrior: number;
  
  /** Confidence in the prior (based on history depth) */
  priorConfidence: number;
  
  /** Number of historical observations */
  observationCount: number;
  
  /** Last updated */
  updatedAt: Date;
}

export interface AnchorPriorConfig {
  /** Minimum coverage to start using observed data over prior */
  minCoverageForObserved: number;
  
  /** Coverage at which prior influence becomes zero */
  fullCoverageThreshold: number;
  
  /** Maximum prior influence (0-1) */
  maxPriorInfluence: number;
  
  /** Decay rate for prior influence as coverage increases */
  decayRate: number;
}

export const DEFAULT_ANCHOR_PRIOR_CONFIG: AnchorPriorConfig = {
  minCoverageForObserved: 0.3,    // Below 30% coverage, prior dominates
  fullCoverageThreshold: 0.8,     // At 80% coverage, prior is ignored
  maxPriorInfluence: 0.7,         // Prior can contribute at most 70%
  decayRate: 2.0,                 // Quadratic decay
};

// ═══════════════════════════════════════════════════════════════════════════════
// WELL-KNOWN PRIORS (Majors)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pre-defined priors for major assets
 * These are based on historical analysis and should be stable
 * 
 * Formula: POS = 0.60*QS + 0.25*OS + 0.15*(100-Risk)
 * 
 * Expected tiers:
 * - BTC: Elite (POS ~91.5) = 0.60*95 + 0.25*85 + 0.15*88 = 57 + 21.25 + 13.2 = 91.45
 * - ETH: Elite (POS ~88.7) = 0.60*94 + 0.25*80 + 0.15*82 = 56.4 + 20 + 12.3 = 88.7
 * - SOL: Strong (POS ~77.0) = 0.60*80 + 0.25*75 + 0.15*68 = 48 + 18.75 + 10.2 = 76.95
 * - BNB: Strong (POS ~72.3) = 0.60*72 + 0.25*70 + 0.15*58 = 43.2 + 17.5 + 8.7 = 69.4
 * - XRP: Neutral (POS ~68.8) = 0.60*68 + 0.25*65 + 0.15*55 = 40.8 + 16.25 + 8.25 = 65.3
 */
export const WELL_KNOWN_PRIORS: Record<string, Omit<AnchorPrior, 'updatedAt'>> = {
  'bitcoin': {
    assetId: 'bitcoin',
    qsPrior: 95,
    osPrior: 85,
    riskPrior: 12,
    priorConfidence: 100,
    observationCount: 10000,
  },
  'ethereum': {
    assetId: 'ethereum',
    qsPrior: 94,
    osPrior: 80,
    riskPrior: 18,
    priorConfidence: 100,
    observationCount: 10000,
  },
  'solana': {
    assetId: 'solana',
    qsPrior: 80,
    osPrior: 75,
    riskPrior: 32,
    priorConfidence: 95,
    observationCount: 5000,
  },
  'binancecoin': {
    assetId: 'binancecoin',
    qsPrior: 72,
    osPrior: 70,
    riskPrior: 42,
    priorConfidence: 90,
    observationCount: 5000,
  },
  'ripple': {
    assetId: 'ripple',
    qsPrior: 68,
    osPrior: 65,
    riskPrior: 45,
    priorConfidence: 85,
    observationCount: 5000,
  },
  'cardano': {
    assetId: 'cardano',
    qsPrior: 75,
    osPrior: 60,
    riskPrior: 35,
    priorConfidence: 85,
    observationCount: 4000,
  },
  'polkadot': {
    assetId: 'polkadot',
    qsPrior: 73,
    osPrior: 55,
    riskPrior: 38,
    priorConfidence: 80,
    observationCount: 3000,
  },
  'avalanche': {
    assetId: 'avalanche',
    qsPrior: 72,
    osPrior: 60,
    riskPrior: 40,
    priorConfidence: 75,
    observationCount: 2000,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN CASES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GoldenCaseInput {
  /** Asset ID */
  assetId: string;
  
  /** Methodology version this golden case is for */
  methodologyId: string;
  
  /** Frozen input data */
  dataPoints: Record<string, number | null>;
  
  /** Identity confidence */
  identityConfidence: number;
  
  /** Bundle quality */
  quality: {
    totalRequested: number;
    totalFetched: number;
    staleness: number;
    sourceCount: number;
  };
}

export interface GoldenCaseExpected {
  /** Expected QS (with tolerance) */
  qs: { value: number; tolerance: number };
  
  /** Expected OS (with tolerance, null if should be gated) */
  os: { value: number; tolerance: number } | null;
  
  /** Expected Risk (with tolerance) */
  risk: { value: number; tolerance: number };
  
  /** Expected POS (with tolerance, null if should be gated) */
  posFinal: { value: number; tolerance: number } | null;
  
  /** Expected legitimacy label */
  legitimacy: string;
  
  /** Expected tier */
  tier: string;
  
  /** Expected flag */
  flag: string;
}

export interface GoldenCase {
  /** Case name */
  name: string;
  
  /** Description */
  description: string;
  
  /** Input data */
  input: GoldenCaseInput;
  
  /** Expected output */
  expected: GoldenCaseExpected;
  
  /** Created at */
  createdAt: Date;
  
  /** Last verified */
  lastVerifiedAt?: Date;
}

export interface GoldenCaseResult {
  case: GoldenCase;
  passed: boolean;
  actual: {
    qs: number;
    os: number | null;
    risk: number;
    posFinal: number | null;
    legitimacy: string;
    tier: string | null;
    flag: string;
  };
  deviations: Array<{
    field: string;
    expected: string;
    actual: string;
    withinTolerance: boolean;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALIBRATION REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CalibrationReport {
  /** Report timestamp */
  timestamp: Date;
  
  /** Methodology version */
  methodologyId: string;
  
  /** Engine version */
  engineVersion: string;
  
  /** Universe analyzed */
  universeSize: number;
  
  /** Score distribution analysis */
  distribution: ScoreDistribution;
  
  /** Distribution health */
  health: DistributionHealth;
  
  /** Golden case results */
  goldenCases: {
    total: number;
    passed: number;
    failed: number;
    results: GoldenCaseResult[];
  };
  
  /** Major asset spot checks */
  majorSpotChecks: Array<{
    assetId: string;
    currentScore: number;
    priorScore: number;
    delta: number;
    withinExpected: boolean;
    explanation?: string;
  }>;
  
  /** Overall calibration status */
  status: HealthStatus;
  
  /** Summary */
  summary: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALIBRATION THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

export const CALIBRATION_THRESHOLDS = {
  // Distribution health thresholds
  distribution: {
    /** Expected mean POS range */
    posMeanRange: { min: 40, max: 70 },
    
    /** Expected standard deviation range */
    posStdDevRange: { min: 10, max: 30 },
    
    /** Maximum acceptable skewness (absolute) */
    maxSkewness: 1.0,
    
    /** Maximum acceptable gated percentage */
    maxGatedPercent: 30,
    
    /** Minimum elite tier percentage (sanity check) */
    minElitePercent: 1,
    
    /** Maximum elite tier percentage */
    maxElitePercent: 15,
  },
  
  // Golden case tolerances
  goldenCase: {
    /** Default tolerance for scores */
    defaultTolerance: 2.0,
    
    /** Tight tolerance for majors */
    majorTolerance: 1.0,
  },
  
  // Major asset thresholds
  majors: {
    /** Maximum acceptable delta from prior */
    maxDeltaFromPrior: 10,
    
    /** Minimum acceptable score for BTC/ETH */
    minMajorScore: 60,
  },
} as const;
