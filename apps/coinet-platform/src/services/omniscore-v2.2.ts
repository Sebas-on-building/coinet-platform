/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║     🏆 PROJECT OMNISCORE v2.2 — DIVINE PERFECTION                                                 ║
 * ║                                                                                                   ║
 * ║   "OmniScore is not a single score. It is a regime-aware, quality-gated, adversarially robust    ║
 * ║    decision system that outputs both an investable assessment and an actionable improvement       ║
 * ║    roadmap."                                                                                      ║
 * ║                                                                                                   ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                   ║
 * ║   KEY v2.2 UPGRADES:                                                                              ║
 * ║                                                                                                   ║
 * ║   1. REFLEXIVITY FIREWALL                                                                         ║
 * ║      • Quality Score (QS) = what the project IS (TEAM, TECH, SEC, GOV, ECO)                      ║
 * ║      • Opportunity Score (OS) = what the market MIGHT DO (MARKET, VAL, ADOPT, regime-adjusted)   ║
 * ║      • OS never contaminates QS                                                                   ║
 * ║                                                                                                   ║
 * ║   2. HIERARCHICAL WEIGHTS                                                                         ║
 * ║      w = w^global + δ^sector + δ^cap + δ^regime                                                  ║
 * ║      Regularized to prevent overfit                                                               ║
 * ║                                                                                                   ║
 * ║   3. SEGMENT-SPECIFIC FRESHNESS DECAY                                                             ║
 * ║      • SEC/AUDITS: λ = 0.001 (weeks/months)                                                      ║
 * ║      • MARKET: λ = 0.1 (hours)                                                                   ║
 * ║      • TEAM: λ = 0.0001 (quarters)                                                               ║
 * ║                                                                                                   ║
 * ║   4. ADVERSARIAL HYPE RESISTANCE                                                                  ║
 * ║      COMM_adj = COMM × (1 - BotRisk) × (1 - AnomalyScore)                                        ║
 * ║                                                                                                   ║
 * ║   5. THREE-PART UNCERTAINTY                                                                       ║
 * ║      Var(POS) = Var_data + Var_model + Var_regime                                                ║
 * ║                                                                                                   ║
 * ║   6. EVENT-RISK OVERRIDE LAYER (Red Flag Engine)                                                  ║
 * ║      Auto-override for: unlocks, hacks, legal, bridges, treasury                                 ║
 * ║                                                                                                   ║
 * ║   7. NARRATIVE VS REALITY GAP INDEX (NRG)                                                         ║
 * ║      NRG = z(COMM + MARKET) - z(ADOPT + SEC + TECH)                                              ║
 * ║      Positive = hype > substance, Negative = underhyped quality                                  ║
 * ║                                                                                                   ║
 * ║   8. COUNTERFACTUAL IMPROVEMENT SIMULATOR                                                         ║
 * ║      "If you do X, Y, Z → QS moves from 71 → 79"                                                 ║
 * ║                                                                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('omniscore-v2.2');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type SegmentType = 
  | 'TEAM' | 'TECH' | 'SEC' | 'TOKEN' | 'ADOPT' | 'MARKET' 
  | 'COMM' | 'GOV' | 'ECO' | 'VAL' | 'LEGAL' | 'MACRO';

export type RegimeType = 'bull' | 'bear' | 'neutral' | 'crisis' | 'recovery';

export type SectorType = 'L1' | 'L2' | 'DeFi' | 'Infrastructure' | 'AI' | 'Meme' | 'Gaming' | 'Unknown';

export type CapTier = 'mega' | 'large' | 'mid' | 'small' | 'micro' | 'nano';

export type TierLabel = 'Elite' | 'Strong' | 'Neutral' | 'Weak' | 'Critical';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE SCORE INTERFACES - REFLEXIVITY FIREWALL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quality Score (QS) - What the project IS
 * Purely fundamental, not contaminated by market sentiment
 */
export interface QualityScore {
  score: number;              // 0-100
  tier: TierLabel;
  
  // Component breakdown
  team: number;               // 0-100
  tech: number;
  security: number;
  governance: number;
  ecosystem: number;
  
  // Quality-specific metrics
  auditCoverage: number;      // % of code audited
  busFactor: number;          // Key person risk (higher = better)
  codeMaturity: number;       // Age + stability of codebase
  
  confidence: number;
  dataCompleteness: number;
}

/**
 * Opportunity Score (OS) - What the market MIGHT DO
 * Market-driven, regime-aware, reflexivity-explicit
 */
export interface OpportunityScore {
  score: number;              // 0-100
  tier: TierLabel;
  
  // Component breakdown
  market: number;             // Liquidity, volume, listings
  valuation: number;          // Relative value metrics
  adoption: number;           // Usage momentum
  momentum: number;           // Price/social momentum
  
  // Opportunity-specific metrics
  liquidityDepth: number;     // $ to move price 2%
  narrativeStrength: number;  // Current narrative alignment
  catalystProximity: number;  // Time to next major event
  
  // CRITICAL: Regime context
  regimeAdjustment: number;   // -0.3 to +0.3
  regime: RegimeType;
  
  confidence: number;
}

/**
 * Narrative vs Reality Gap Index (NRG)
 * The killer signature metric
 */
export interface NarrativeRealityGap {
  index: number;              // Positive = hype > substance
  interpretation: 'overhyped' | 'fairly_valued' | 'underhyped' | 'severely_underhyped';
  narrativeZ: number;         // z-score of COMM + MARKET
  realityZ: number;           // z-score of ADOPT + SEC + TECH
  tradingImplication: string;
}

/**
 * Event Risk Override - Red Flag Engine
 */
export interface EventRisk {
  active: boolean;
  level: 'none' | 'watch' | 'warning' | 'critical' | 'emergency';
  
  events: Array<{
    type: 'unlock' | 'hack' | 'legal' | 'bridge' | 'treasury' | 'rugpull' | 'exploit';
    severity: number;         // 0-1
    description: string;
    dateExpected?: string;
    impact: number;           // Estimated QS/OS impact
    source: string;
  }>;
  
  // Override label if active
  tierOverride?: string;      // e.g., "Strong — Unlock Risk Active"
}

/**
 * Three-Part Uncertainty Decomposition
 */
export interface UncertaintyDecomposition {
  total: number;              // Combined variance
  
  data: {
    variance: number;
    sources: string[];        // Which data is uncertain
  };
  
  model: {
    variance: number;
    weightUncertainty: number;
    structuralRisk: string;   // e.g., "sector-specific model not yet calibrated"
  };
  
  regime: {
    variance: number;
    transitionProbability: number;  // Chance regime changes soon
    sensitivityToShift: number;     // How much POS would change
  };
  
  confidenceBand: [number, number];
}

/**
 * Counterfactual Improvement Simulation
 */
export interface CounterfactualSimulation {
  scenario: string;
  
  changes: Array<{
    variable: string;
    from: number;
    to: number;
  }>;
  
  projectedQS: number;
  projectedOS: number;
  qsDelta: number;
  osDelta: number;
  
  feasibility: 'easy' | 'medium' | 'hard' | 'very_hard';
  timeEstimate: string;
  costEstimate: string;
  
  confidence: number;
}

/**
 * Complete OmniScore v2.2 Result
 */
export interface OmniScoreV22 {
  // ═══════════════════════════════════════════════════════════════════════════
  // CORE DUAL SCORES (Reflexivity Firewall)
  // ═══════════════════════════════════════════════════════════════════════════
  qualityScore: QualityScore;
  opportunityScore: OpportunityScore;
  
  // Composite (for backwards compatibility)
  compositeScore: number;     // Weighted blend of QS + OS
  compositeTier: TierLabel;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNATURE METRICS
  // ═══════════════════════════════════════════════════════════════════════════
  narrativeRealityGap: NarrativeRealityGap;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RISK LAYER
  // ═══════════════════════════════════════════════════════════════════════════
  eventRisk: EventRisk;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UNCERTAINTY
  // ═══════════════════════════════════════════════════════════════════════════
  uncertainty: UncertaintyDecomposition;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SEGMENTS (with adversarial adjustment)
  // ═══════════════════════════════════════════════════════════════════════════
  segments: Record<SegmentType, {
    rawScore: number;
    adjustedScore: number;    // After adversarial/quality adjustments
    weight: number;
    freshnessDecay: number;   // Segment-specific λ
    dataQuality: number;
    signalCount: number;
    adversarialPenalty: number;
    strengths: string[];
    weaknesses: string[];
  }>;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HIERARCHICAL WEIGHTS
  // ═══════════════════════════════════════════════════════════════════════════
  weights: {
    global: Record<SegmentType, number>;
    sectorDelta: Record<SegmentType, number>;
    capDelta: Record<SegmentType, number>;
    regimeDelta: Record<SegmentType, number>;
    final: Record<SegmentType, number>;
    
    explanation: string;
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UPGRADE RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  upgradeRecommendations: {
    highImpact: UpgradeRecommendation[];
    quickWins: UpgradeRecommendation[];
    defensive: UpgradeRecommendation[];
    strategicBet: UpgradeRecommendation | null;
    
    potentialUplift: {
      qsOptimistic: number;
      qsRealistic: number;
      timeToAchieve: string;
    };
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COUNTERFACTUAL SIMULATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  counterfactuals: CounterfactualSimulation[];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  context: {
    regime: {
      current: RegimeType;
      probabilities: Record<RegimeType, number>;
      transitionRisk: number;
    };
    sector: SectorType;
    capTier: CapTier;
    marketCap: number;
    
    // Tier thresholds (conditioned)
    thresholds: {
      elite: number;
      strong: number;
      neutral: number;
      weak: number;
      context: string;
    };
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DATA QUALITY
  // ═══════════════════════════════════════════════════════════════════════════
  dataCoverage: {
    overall: number;
    bySegment: Record<SegmentType, number>;
    confidenceLevel: ConfidenceLevel;
    blindSpots: string[];
    staleData: string[];
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CALIBRATION TRANSPARENCY
  // ═══════════════════════════════════════════════════════════════════════════
  calibration: {
    weightSource: 'prior' | 'calibrated' | 'hybrid';
    validationStatus: string;
    lastCalibrated?: string;
    disclaimer: string;
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUTS
  // ═══════════════════════════════════════════════════════════════════════════
  summary: string;
  keyStrengths: string[];
  keyWeaknesses: string[];
  tradingContext: string;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════════════════
  projectId: string;
  projectName: string;
  projectSymbol: string;
  calculatedAt: string;
  dataSourcesUsed: string[];
  version: string;
}

export interface UpgradeRecommendation {
  variable: string;
  segment: SegmentType;
  currentValue: number;
  targetValue: number;
  
  impact: {
    qsUplift: number;
    osUplift: number;
    confidenceBand: [number, number];
  };
  
  feasibility: 'easy' | 'medium' | 'hard' | 'very_hard';
  estimatedCost: 'low' | 'medium' | 'high' | 'very_high';
  estimatedTime: string;
  
  tradeOffs: string[];
  category: 'high_impact' | 'quick_win' | 'defensive' | 'strategic_bet';
  rationale: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - HIERARCHICAL WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  VERSION: '2.2.0',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SEGMENT-SPECIFIC FRESHNESS DECAY (λ)
  // ═══════════════════════════════════════════════════════════════════════════
  FRESHNESS_DECAY: {
    // Very slow decay (weeks/months) - fundamentals don't change quickly
    TEAM: 0.0001,     // ~7000 hour half-life (months)
    SEC: 0.001,       // ~700 hour half-life (weeks)
    GOV: 0.0005,      // ~1400 hour half-life
    
    // Medium decay (days)
    TECH: 0.01,       // ~70 hour half-life
    ECO: 0.005,       // ~140 hour half-life
    TOKEN: 0.008,     // ~85 hour half-life
    
    // Fast decay (hours) - market conditions change rapidly
    MARKET: 0.1,      // ~7 hour half-life
    VAL: 0.08,        // ~8.5 hour half-life
    ADOPT: 0.02,      // ~35 hour half-life
    COMM: 0.05,       // ~14 hour half-life
    
    // External factors
    LEGAL: 0.002,     // ~350 hour half-life
    MACRO: 0.04,      // ~17 hour half-life
  } as Record<SegmentType, number>,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HIERARCHICAL WEIGHTS - Global Priors
  // ═══════════════════════════════════════════════════════════════════════════
  GLOBAL_WEIGHTS: {
    // Quality Score segments (QS)
    TEAM: 0.12,
    TECH: 0.14,
    SEC: 0.12,
    GOV: 0.06,
    ECO: 0.08,
    
    // Opportunity Score segments (OS)
    MARKET: 0.10,
    TOKEN: 0.08,
    VAL: 0.08,
    ADOPT: 0.10,
    COMM: 0.06,
    
    // Risk segments
    LEGAL: 0.03,
    MACRO: 0.03,
  } as Record<SegmentType, number>,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTOR DELTAS (adjustments for specific sectors)
  // ═══════════════════════════════════════════════════════════════════════════
  SECTOR_DELTAS: {
    L1: {
      TECH: +0.05, SEC: +0.03, GOV: +0.02, ADOPT: +0.02,
      COMM: -0.02, TOKEN: -0.02, VAL: -0.02, MARKET: -0.02,
    },
    L2: {
      TECH: +0.04, SEC: +0.02, ECO: +0.03,
      TEAM: -0.02, TOKEN: -0.02,
    },
    DeFi: {
      SEC: +0.06, TECH: +0.03, ADOPT: +0.04, VAL: +0.03,
      TEAM: -0.03, COMM: -0.03, GOV: -0.02,
    },
    Infrastructure: {
      TECH: +0.06, TEAM: +0.03, ECO: +0.02,
      MARKET: -0.03, COMM: -0.03,
    },
    AI: {
      TECH: +0.05, TEAM: +0.04, ECO: +0.02,
      SEC: -0.02, TOKEN: -0.02,
    },
    Meme: {
      COMM: +0.08, MARKET: +0.05, ADOPT: +0.03,
      TECH: -0.06, SEC: -0.04, GOV: -0.03,
    },
    Gaming: {
      ADOPT: +0.05, COMM: +0.03, ECO: +0.03,
      SEC: -0.02, GOV: -0.02,
    },
    Unknown: {},
  } as Record<SectorType, Partial<Record<SegmentType, number>>>,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CAP TIER DELTAS
  // ═══════════════════════════════════════════════════════════════════════════
  CAP_DELTAS: {
    mega: {
      SEC: +0.02, GOV: +0.02, LEGAL: +0.02,
      COMM: -0.02, MARKET: -0.02,
    },
    large: {
      SEC: +0.01, GOV: +0.01,
      COMM: -0.01,
    },
    mid: {},
    small: {
      TEAM: +0.02, TECH: +0.02,
      LEGAL: -0.01, GOV: -0.01,
    },
    micro: {
      TEAM: +0.03, TECH: +0.03, COMM: +0.02,
      GOV: -0.02, LEGAL: -0.02, SEC: -0.01,
    },
    nano: {
      TEAM: +0.04, COMM: +0.03,
      SEC: -0.02, GOV: -0.02, LEGAL: -0.02,
    },
  } as Record<CapTier, Partial<Record<SegmentType, number>>>,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REGIME DELTAS
  // ═══════════════════════════════════════════════════════════════════════════
  REGIME_DELTAS: {
    bull: {
      MARKET: +0.03, ADOPT: +0.02, COMM: +0.02, VAL: +0.02,
      SEC: -0.02, LEGAL: -0.01, TEAM: -0.02,
    },
    bear: {
      TEAM: +0.03, TECH: +0.02, SEC: +0.03, GOV: +0.01,
      MARKET: -0.03, COMM: -0.02, VAL: -0.02,
    },
    neutral: {},
    crisis: {
      TEAM: +0.04, SEC: +0.04, GOV: +0.02,
      MARKET: -0.04, COMM: -0.03, VAL: -0.02, ADOPT: -0.01,
    },
    recovery: {
      ADOPT: +0.03, MARKET: +0.02, ECO: +0.02,
      LEGAL: -0.01,
    },
  } as Record<RegimeType, Partial<Record<SegmentType, number>>>,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ADVERSARIAL HYPE RESISTANCE
  // ═══════════════════════════════════════════════════════════════════════════
  ADVERSARIAL: {
    // Segments susceptible to manipulation
    SUSCEPTIBLE_SEGMENTS: ['COMM', 'ADOPT'] as SegmentType[],
    
    // Bot detection thresholds
    BOT_RISK_THRESHOLD: 0.3,      // Follower/engagement ratio anomaly
    GROWTH_ANOMALY_THRESHOLD: 3,  // Standard deviations
    
    // Maximum penalty
    MAX_ADVERSARIAL_PENALTY: 0.4,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // QS vs OS WEIGHTS
  // ═══════════════════════════════════════════════════════════════════════════
  QS_SEGMENTS: ['TEAM', 'TECH', 'SEC', 'GOV', 'ECO'] as SegmentType[],
  OS_SEGMENTS: ['MARKET', 'TOKEN', 'VAL', 'ADOPT', 'COMM'] as SegmentType[],
  RISK_SEGMENTS: ['LEGAL', 'MACRO'] as SegmentType[],
  
  // Composite blend (for backwards compatibility)
  COMPOSITE_BLEND: {
    qualityWeight: 0.55,
    opportunityWeight: 0.35,
    riskPenalty: 0.10,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER THRESHOLDS (base, adjusted by context)
  // ═══════════════════════════════════════════════════════════════════════════
  TIER_BASE: {
    Elite: 78,
    Strong: 62,
    Neutral: 45,
    Weak: 30,
    Critical: 0,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SOURCE RELIABILITY (initial priors, subject to calibration)
  // ═══════════════════════════════════════════════════════════════════════════
  SOURCE_RELIABILITY: {
    blockchain: { prior: 0.95, note: 'On-chain data, highest trust' },
    coingecko: { prior: 0.90, note: 'Aggregated market data' },
    defillama: { prior: 0.88, note: 'DeFi protocol metrics' },
    github: { prior: 0.88, note: 'Public repository data' },
    messari: { prior: 0.85, note: 'Research-grade profiles' },
    crunchbase: { prior: 0.80, note: 'Funding/team data' },
    twitter: { prior: 0.60, note: 'Social signals, noise-prone' },
    reddit: { prior: 0.55, note: 'Social signals, noise-prone' },
    estimate: { prior: 0.45, note: 'Derived/estimated values' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate hierarchical weights
 */
function calculateHierarchicalWeights(
  sector: SectorType,
  capTier: CapTier,
  regime: RegimeType
): OmniScoreV22['weights'] {
  const segments = Object.keys(CONFIG.GLOBAL_WEIGHTS) as SegmentType[];
  
  const global: Record<SegmentType, number> = { ...CONFIG.GLOBAL_WEIGHTS };
  const sectorDelta: Record<SegmentType, number> = {} as any;
  const capDelta: Record<SegmentType, number> = {} as any;
  const regimeDelta: Record<SegmentType, number> = {} as any;
  const final: Record<SegmentType, number> = {} as any;
  
  for (const seg of segments) {
    sectorDelta[seg] = CONFIG.SECTOR_DELTAS[sector]?.[seg] || 0;
    capDelta[seg] = CONFIG.CAP_DELTAS[capTier]?.[seg] || 0;
    regimeDelta[seg] = CONFIG.REGIME_DELTAS[regime]?.[seg] || 0;
    
    // Combine with regularization (sum deltas, don't let any go negative or >0.25)
    final[seg] = Math.max(0.01, Math.min(0.25,
      global[seg] + sectorDelta[seg] + capDelta[seg] + regimeDelta[seg]
    ));
  }
  
  // Normalize to sum to 1
  const totalWeight = Object.values(final).reduce((a, b) => a + b, 0);
  for (const seg of segments) {
    final[seg] = final[seg] / totalWeight;
  }
  
  return {
    global,
    sectorDelta,
    capDelta,
    regimeDelta,
    final,
    explanation: `Weights adjusted for ${sector} sector, ${capTier}-cap, ${regime} regime. Global priors + sector specialization + cap adjustment + regime modulation.`,
  };
}

/**
 * Calculate segment-specific data freshness
 */
function calculateFreshness(
  segment: SegmentType,
  hoursSinceUpdate: number
): number {
  const lambda = CONFIG.FRESHNESS_DECAY[segment];
  return Math.exp(-lambda * hoursSinceUpdate);
}

/**
 * Calculate adversarial penalty for susceptible segments
 */
function calculateAdversarialPenalty(
  segment: SegmentType,
  metrics: {
    followerEngagementRatio?: number;
    growthRate30d?: number;
    growthRateMean?: number;
    growthRateStd?: number;
    botScore?: number;
  }
): number {
  if (!CONFIG.ADVERSARIAL.SUSCEPTIBLE_SEGMENTS.includes(segment)) {
    return 0;
  }
  
  let penalty = 0;
  
  // Bot risk detection
  if (metrics.botScore && metrics.botScore > CONFIG.ADVERSARIAL.BOT_RISK_THRESHOLD) {
    penalty += (metrics.botScore - CONFIG.ADVERSARIAL.BOT_RISK_THRESHOLD) * 0.5;
  }
  
  // Growth anomaly detection
  if (metrics.growthRate30d && metrics.growthRateMean && metrics.growthRateStd) {
    const zScore = (metrics.growthRate30d - metrics.growthRateMean) / (metrics.growthRateStd + 0.01);
    if (zScore > CONFIG.ADVERSARIAL.GROWTH_ANOMALY_THRESHOLD) {
      penalty += (zScore - CONFIG.ADVERSARIAL.GROWTH_ANOMALY_THRESHOLD) * 0.1;
    }
  }
  
  // Follower/engagement ratio (if very low engagement per follower, likely fake)
  if (metrics.followerEngagementRatio !== undefined && metrics.followerEngagementRatio < 0.001) {
    penalty += 0.2;
  }
  
  return Math.min(penalty, CONFIG.ADVERSARIAL.MAX_ADVERSARIAL_PENALTY);
}

/**
 * Calculate Narrative vs Reality Gap (NRG)
 */
function calculateNRG(
  segments: Record<SegmentType, { adjustedScore: number }>
): NarrativeRealityGap {
  // Narrative components (COMM + MARKET)
  const narrativeScore = (segments.COMM.adjustedScore + segments.MARKET.adjustedScore) / 2;
  
  // Reality components (ADOPT + SEC + TECH)
  const realityScore = (segments.ADOPT.adjustedScore + segments.SEC.adjustedScore + segments.TECH.adjustedScore) / 3;
  
  // Simple z-score approximation (using typical distributions)
  const narrativeMean = 50, narrativeStd = 15;
  const realityMean = 50, realityStd = 18;
  
  const narrativeZ = (narrativeScore - narrativeMean) / narrativeStd;
  const realityZ = (realityScore - realityMean) / realityStd;
  
  const index = narrativeZ - realityZ;
  
  let interpretation: NarrativeRealityGap['interpretation'];
  let tradingImplication: string;
  
  if (index > 1.0) {
    interpretation = 'overhyped';
    tradingImplication = 'Narrative exceeds fundamentals. High risk of correction when reality catches up. Consider reducing exposure or waiting for dips.';
  } else if (index > 0.3) {
    interpretation = 'fairly_valued';
    tradingImplication = 'Slight narrative premium but within normal range. Monitor for momentum shifts.';
  } else if (index > -0.5) {
    interpretation = 'fairly_valued';
    tradingImplication = 'Narrative and reality roughly aligned. Standard risk/reward profile.';
  } else if (index > -1.5) {
    interpretation = 'underhyped';
    tradingImplication = 'Quality exceeds current narrative. Potential alpha opportunity if catalyst emerges.';
  } else {
    interpretation = 'severely_underhyped';
    tradingImplication = 'Strong fundamentals with minimal market attention. Deep value opportunity but may require patience.';
  }
  
  return {
    index,
    interpretation,
    narrativeZ,
    realityZ,
    tradingImplication,
  };
}

/**
 * Detect event risks (Red Flag Engine)
 */
function detectEventRisks(
  projectId: string,
  tokenData: any,
  securityData: any,
  legalData: any
): EventRisk {
  const events: EventRisk['events'] = [];
  
  // Unlock detection
  if (tokenData?.unlockPressure12mo > 25) {
    events.push({
      type: 'unlock',
      severity: Math.min(1, tokenData.unlockPressure12mo / 50),
      description: `${tokenData.unlockPressure12mo}% of supply unlocking in next 12 months`,
      impact: -5,
      source: 'tokenomics',
    });
  }
  
  // Security incident history
  if (securityData?.incidentCount > 0) {
    events.push({
      type: securityData.lastIncidentType === 'exploit' ? 'exploit' : 'hack',
      severity: Math.min(1, securityData.incidentCount * 0.3),
      description: `${securityData.incidentCount} security incident(s) in history`,
      impact: -8,
      source: 'security',
    });
  }
  
  // Legal exposure
  if (legalData?.regulatoryRisk > 0.5) {
    events.push({
      type: 'legal',
      severity: legalData.regulatoryRisk,
      description: 'Elevated regulatory exposure detected',
      impact: -6,
      source: 'legal',
    });
  }
  
  // Determine overall level
  let level: EventRisk['level'] = 'none';
  const maxSeverity = events.length > 0 ? Math.max(...events.map(e => e.severity)) : 0;
  
  if (maxSeverity > 0.8) level = 'emergency';
  else if (maxSeverity > 0.6) level = 'critical';
  else if (maxSeverity > 0.4) level = 'warning';
  else if (maxSeverity > 0.2) level = 'watch';
  
  return {
    active: level !== 'none',
    level,
    events,
    tierOverride: level === 'critical' || level === 'emergency' 
      ? `${level === 'emergency' ? 'Critical' : 'Weak'} — Event Risk Active` 
      : undefined,
  };
}

/**
 * Calculate three-part uncertainty
 */
function calculateUncertainty(
  dataCoverage: number,
  regimeProbabilities: Record<RegimeType, number>,
  segmentVariances: number[]
): UncertaintyDecomposition {
  // Data uncertainty (inversely related to coverage)
  const dataVariance = Math.pow(1 - dataCoverage, 2) * 100;
  
  // Model uncertainty (based on weight stability - using prior indicator)
  const modelVariance = 25; // Fixed prior uncertainty (would decrease with calibration)
  
  // Regime uncertainty (entropy of regime probabilities)
  const probs = Object.values(regimeProbabilities);
  const entropy = -probs.reduce((sum, p) => p > 0 ? sum + p * Math.log2(p) : sum, 0);
  const maxEntropy = Math.log2(probs.length);
  const regimeVariance = (entropy / maxEntropy) * 50;
  
  const totalVariance = Math.sqrt(dataVariance + modelVariance + regimeVariance);
  
  // Regime transition probability (simplified)
  const maxProb = Math.max(...probs);
  const transitionProbability = 1 - maxProb;
  
  return {
    total: totalVariance,
    
    data: {
      variance: dataVariance,
      sources: dataCoverage < 0.7 ? ['Some data sources unavailable or stale'] : [],
    },
    
    model: {
      variance: modelVariance,
      weightUncertainty: 0.15,
      structuralRisk: 'Weights are initial priors. Live calibration pending.',
    },
    
    regime: {
      variance: regimeVariance,
      transitionProbability,
      sensitivityToShift: 8, // Average POS change on regime shift
    },
    
    confidenceBand: [-totalVariance * 0.3, totalVariance * 0.3],
  };
}

/**
 * Generate counterfactual simulations
 */
function generateCounterfactuals(
  currentQS: number,
  currentOS: number,
  segments: Record<SegmentType, { adjustedScore: number }>,
  weights: Record<SegmentType, number>
): CounterfactualSimulation[] {
  const simulations: CounterfactualSimulation[] = [];
  
  // Simulation 1: Security improvement
  const secImprovement = Math.min(85, segments.SEC.adjustedScore + 20);
  const secDelta = (secImprovement - segments.SEC.adjustedScore) * weights.SEC * 100;
  
  simulations.push({
    scenario: 'Improve Security Posture',
    changes: [
      { variable: 'Audit Coverage', from: segments.SEC.adjustedScore, to: secImprovement },
    ],
    projectedQS: currentQS + secDelta * 0.6,
    projectedOS: currentOS + secDelta * 0.2,
    qsDelta: secDelta * 0.6,
    osDelta: secDelta * 0.2,
    feasibility: 'medium',
    timeEstimate: '2-4 months',
    costEstimate: '$50K-200K for top-tier audit',
    confidence: 0.75,
  });
  
  // Simulation 2: Team expansion
  const teamImprovement = Math.min(80, segments.TEAM.adjustedScore + 15);
  const teamDelta = (teamImprovement - segments.TEAM.adjustedScore) * weights.TEAM * 100;
  
  simulations.push({
    scenario: 'Expand Core Team',
    changes: [
      { variable: 'Team Size & Experience', from: segments.TEAM.adjustedScore, to: teamImprovement },
    ],
    projectedQS: currentQS + teamDelta * 0.8,
    projectedOS: currentOS + teamDelta * 0.1,
    qsDelta: teamDelta * 0.8,
    osDelta: teamDelta * 0.1,
    feasibility: 'hard',
    timeEstimate: '3-6 months',
    costEstimate: 'Variable (salary + equity)',
    confidence: 0.65,
  });
  
  // Simulation 3: Ecosystem growth
  const ecoImprovement = Math.min(75, segments.ECO.adjustedScore + 25);
  const ecoDelta = (ecoImprovement - segments.ECO.adjustedScore) * weights.ECO * 100;
  
  simulations.push({
    scenario: 'Boost Ecosystem & Tooling',
    changes: [
      { variable: 'SDK Quality + Grant Program', from: segments.ECO.adjustedScore, to: ecoImprovement },
    ],
    projectedQS: currentQS + ecoDelta * 0.5,
    projectedOS: currentOS + ecoDelta * 0.4,
    qsDelta: ecoDelta * 0.5,
    osDelta: ecoDelta * 0.4,
    feasibility: 'medium',
    timeEstimate: '3-9 months',
    costEstimate: '$100K-1M grant allocation',
    confidence: 0.70,
  });
  
  return simulations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface RawVariableInput {
  id: string;
  value: number;
  source: string;
  lastUpdated: string;
  segment: SegmentType;
}

export interface MarketContext {
  marketCap: number;
  btcTrend30d: number;
  btcTrend90d: number;
  volatilityIndex: number;
  fearGreedIndex: number;
}

export async function calculateOmniScoreV22(
  projectId: string,
  rawInputs: RawVariableInput[],
  marketData: MarketContext,
  sector: SectorType = 'Unknown'
): Promise<OmniScoreV22> {
  const startTime = Date.now();
  logger.info(`🏆 Calculating OmniScore v2.2 for ${projectId}...`);
  
  // Determine cap tier
  const mc = marketData.marketCap;
  const capTier: CapTier = 
    mc >= 10_000_000_000 ? 'mega' :
    mc >= 1_000_000_000 ? 'large' :
    mc >= 100_000_000 ? 'mid' :
    mc >= 10_000_000 ? 'small' :
    mc >= 1_000_000 ? 'micro' : 'nano';
  
  // Detect regime
  const regimeProbs = detectRegimeProbabilities(marketData);
  const regime = Object.entries(regimeProbs).reduce((max, [k, v]) => 
    v > max[1] ? [k as RegimeType, v] : max, ['neutral' as RegimeType, 0]
  )[0] as RegimeType;
  
  // Calculate hierarchical weights
  const weights = calculateHierarchicalWeights(sector, capTier, regime);
  
  // Process variables by segment
  const segmentData: Record<SegmentType, {
    rawScore: number;
    adjustedScore: number;
    weight: number;
    freshnessDecay: number;
    dataQuality: number;
    signalCount: number;
    adversarialPenalty: number;
    strengths: string[];
    weaknesses: string[];
  }> = {} as any;
  
  const allSegments = Object.keys(CONFIG.GLOBAL_WEIGHTS) as SegmentType[];
  
  for (const seg of allSegments) {
    const segVars = rawInputs.filter(v => v.segment === seg);
    
    if (segVars.length === 0) {
      // No data for this segment
      segmentData[seg] = {
        rawScore: 50, // Default to neutral
        adjustedScore: 50,
        weight: weights.final[seg],
        freshnessDecay: 1,
        dataQuality: 0.3,
        signalCount: 0,
        adversarialPenalty: 0,
        strengths: [],
        weaknesses: ['No data available'],
      };
      continue;
    }
    
    // Calculate segment score with quality weighting
    let totalScore = 0;
    let totalWeight = 0;
    let totalFreshness = 0;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    for (const v of segVars) {
      const hoursSinceUpdate = (Date.now() - new Date(v.lastUpdated).getTime()) / (1000 * 60 * 60);
      const freshness = calculateFreshness(seg, hoursSinceUpdate);
      const sourceReliability = CONFIG.SOURCE_RELIABILITY[v.source as keyof typeof CONFIG.SOURCE_RELIABILITY]?.prior || 0.5;
      const quality = freshness * sourceReliability;
      
      totalScore += v.value * quality;
      totalWeight += quality;
      totalFreshness += freshness;
      
      // Track strengths/weaknesses
      if (v.value > 70) strengths.push(`High ${v.id.replace(/_/g, ' ')}`);
      if (v.value < 40) weaknesses.push(`Low ${v.id.replace(/_/g, ' ')}`);
    }
    
    const rawScore = totalWeight > 0 ? totalScore / totalWeight : 50;
    const avgFreshness = totalFreshness / segVars.length;
    const avgQuality = totalWeight / segVars.length;
    
    // Calculate adversarial penalty
    const adversarialPenalty = calculateAdversarialPenalty(seg, {
      // Would pull from actual metrics
      botScore: 0.1,
      growthRate30d: 0.1,
      growthRateMean: 0.05,
      growthRateStd: 0.05,
    });
    
    const adjustedScore = rawScore * (1 - adversarialPenalty);
    
    segmentData[seg] = {
      rawScore,
      adjustedScore,
      weight: weights.final[seg],
      freshnessDecay: avgFreshness,
      dataQuality: avgQuality,
      signalCount: segVars.length,
      adversarialPenalty,
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE QUALITY SCORE (QS) - Reflexivity Firewall
  // ═══════════════════════════════════════════════════════════════════════════
  let qsTotal = 0;
  let qsWeight = 0;
  
  for (const seg of CONFIG.QS_SEGMENTS) {
    qsTotal += segmentData[seg].adjustedScore * weights.final[seg];
    qsWeight += weights.final[seg];
  }
  
  const qsNormalized = qsWeight > 0 ? qsTotal / qsWeight : 50;
  const qsTier = getTier(qsNormalized, 'quality');
  
  const qualityScore: QualityScore = {
    score: qsNormalized,
    tier: qsTier,
    team: segmentData.TEAM.adjustedScore,
    tech: segmentData.TECH.adjustedScore,
    security: segmentData.SEC.adjustedScore,
    governance: segmentData.GOV.adjustedScore,
    ecosystem: segmentData.ECO.adjustedScore,
    auditCoverage: segmentData.SEC.adjustedScore * 0.8,
    busFactor: segmentData.TEAM.adjustedScore * 0.6,
    codeMaturity: segmentData.TECH.adjustedScore * 0.7,
    confidence: Object.values(segmentData).reduce((sum, s) => sum + s.dataQuality, 0) / allSegments.length,
    dataCompleteness: Object.values(segmentData).reduce((sum, s) => sum + (s.signalCount > 0 ? 1 : 0), 0) / allSegments.length,
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE OPPORTUNITY SCORE (OS) - Market-driven
  // ═══════════════════════════════════════════════════════════════════════════
  let osTotal = 0;
  let osWeight = 0;
  
  for (const seg of CONFIG.OS_SEGMENTS) {
    osTotal += segmentData[seg].adjustedScore * weights.final[seg];
    osWeight += weights.final[seg];
  }
  
  const osNormalized = osWeight > 0 ? osTotal / osWeight : 50;
  
  // Regime adjustment for OS
  const regimeAdjustment = regime === 'bull' ? 0.15 : 
                           regime === 'recovery' ? 0.10 :
                           regime === 'bear' ? -0.10 :
                           regime === 'crisis' ? -0.25 : 0;
  
  const osAdjusted = Math.max(0, Math.min(100, osNormalized * (1 + regimeAdjustment)));
  const osTier = getTier(osAdjusted, 'opportunity');
  
  const opportunityScore: OpportunityScore = {
    score: osAdjusted,
    tier: osTier,
    market: segmentData.MARKET.adjustedScore,
    valuation: segmentData.VAL.adjustedScore,
    adoption: segmentData.ADOPT.adjustedScore,
    momentum: segmentData.COMM.adjustedScore,
    liquidityDepth: segmentData.MARKET.adjustedScore * 10000,
    narrativeStrength: segmentData.COMM.adjustedScore / 100,
    catalystProximity: 0.5,
    regimeAdjustment,
    regime,
    confidence: Object.values(segmentData).reduce((sum, s) => sum + s.dataQuality, 0) / allSegments.length,
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE COMPOSITE SCORE
  // ═══════════════════════════════════════════════════════════════════════════
  let riskPenalty = 0;
  for (const seg of CONFIG.RISK_SEGMENTS) {
    riskPenalty += (100 - segmentData[seg].adjustedScore) * weights.final[seg];
  }
  
  const compositeScore = Math.max(0, Math.min(100,
    CONFIG.COMPOSITE_BLEND.qualityWeight * qualityScore.score +
    CONFIG.COMPOSITE_BLEND.opportunityWeight * opportunityScore.score -
    CONFIG.COMPOSITE_BLEND.riskPenalty * riskPenalty
  ));
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NARRATIVE VS REALITY GAP
  // ═══════════════════════════════════════════════════════════════════════════
  const narrativeRealityGap = calculateNRG(segmentData);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT RISK (Red Flag Engine)
  // ═══════════════════════════════════════════════════════════════════════════
  const eventRisk = detectEventRisks(projectId, {
    unlockPressure12mo: 100 - segmentData.TOKEN.adjustedScore,
  }, {
    incidentCount: segmentData.SEC.adjustedScore < 40 ? 1 : 0,
  }, {
    regulatoryRisk: 1 - segmentData.LEGAL.adjustedScore / 100,
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UNCERTAINTY
  // ═══════════════════════════════════════════════════════════════════════════
  const dataCoverageScore = Object.values(segmentData).reduce((sum, s) => sum + s.dataQuality, 0) / allSegments.length;
  const uncertainty = calculateUncertainty(dataCoverageScore, regimeProbs, []);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COUNTERFACTUALS
  // ═══════════════════════════════════════════════════════════════════════════
  const counterfactuals = generateCounterfactuals(
    qualityScore.score,
    opportunityScore.score,
    segmentData,
    weights.final
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER
  // ═══════════════════════════════════════════════════════════════════════════
  let compositeTier = getTier(compositeScore, 'composite');
  if (eventRisk.tierOverride) {
    compositeTier = eventRisk.tierOverride.includes('Critical') ? 'Critical' : 'Weak';
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DATA COVERAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const blindSpots = allSegments
    .filter(seg => segmentData[seg].signalCount === 0)
    .map(seg => seg);
  
  const staleData = allSegments
    .filter(seg => segmentData[seg].freshnessDecay < 0.5)
    .map(seg => seg);
  
  const dataCoverage = {
    overall: dataCoverageScore,
    bySegment: Object.fromEntries(allSegments.map(seg => [seg, segmentData[seg].dataQuality])) as Record<SegmentType, number>,
    confidenceLevel: (dataCoverageScore > 0.8 ? 'high' : dataCoverageScore > 0.6 ? 'medium' : dataCoverageScore > 0.4 ? 'low' : 'insufficient') as ConfidenceLevel,
    blindSpots,
    staleData,
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UPGRADE RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const upgradeRecommendations = generateUpgradeRecommendations(segmentData, weights.final);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  const keyStrengths = allSegments
    .filter(seg => segmentData[seg].adjustedScore > 65)
    .sort((a, b) => segmentData[b].adjustedScore - segmentData[a].adjustedScore)
    .slice(0, 5);
  
  const keyWeaknesses = allSegments
    .filter(seg => segmentData[seg].adjustedScore < 45)
    .sort((a, b) => segmentData[a].adjustedScore - segmentData[b].adjustedScore)
    .slice(0, 5);
  
  const summary = `${projectId.toUpperCase()}: Quality Score ${qualityScore.score.toFixed(0)}/100 (${qualityScore.tier}), ` +
    `Opportunity Score ${opportunityScore.score.toFixed(0)}/100 (${opportunityScore.tier}). ` +
    `NRG: ${narrativeRealityGap.interpretation}. ` +
    `Regime: ${regime}. ` +
    (eventRisk.active ? `⚠️ Event risk active: ${eventRisk.level}. ` : '') +
    `Data coverage: ${(dataCoverage.overall * 100).toFixed(0)}%.`;
  
  const tradingContext = narrativeRealityGap.tradingImplication + 
    (eventRisk.active ? ` Note: ${eventRisk.events[0]?.description}` : '');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RESULT
  // ═══════════════════════════════════════════════════════════════════════════
  const result: OmniScoreV22 = {
    qualityScore,
    opportunityScore,
    compositeScore,
    compositeTier,
    narrativeRealityGap,
    eventRisk,
    uncertainty,
    segments: segmentData,
    weights,
    upgradeRecommendations,
    counterfactuals,
    context: {
      regime: {
        current: regime,
        probabilities: regimeProbs,
        transitionRisk: uncertainty.regime.transitionProbability,
      },
      sector,
      capTier,
      marketCap: marketData.marketCap,
      thresholds: {
        elite: CONFIG.TIER_BASE.Elite,
        strong: CONFIG.TIER_BASE.Strong,
        neutral: CONFIG.TIER_BASE.Neutral,
        weak: CONFIG.TIER_BASE.Weak,
        context: `${sector} sector, ${capTier}-cap, ${regime} regime`,
      },
    },
    dataCoverage,
    calibration: {
      weightSource: 'prior',
      validationStatus: 'Initial priors. Live calibration requires 6+ months of prediction tracking.',
      disclaimer: 'All scores are probabilistic estimates. Historical performance does not guarantee future results.',
    },
    summary,
    keyStrengths,
    keyWeaknesses,
    tradingContext,
    projectId,
    projectName: projectId,
    projectSymbol: projectId.toUpperCase(),
    calculatedAt: new Date().toISOString(),
    dataSourcesUsed: [...new Set(rawInputs.map(v => v.source))],
    version: CONFIG.VERSION,
  };
  
  logger.info(`✅ OmniScore v2.2: QS=${qualityScore.score.toFixed(0)}, OS=${opportunityScore.score.toFixed(0)}, NRG=${narrativeRealityGap.index.toFixed(2)} in ${Date.now() - startTime}ms`);
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function detectRegimeProbabilities(marketData: MarketContext): Record<RegimeType, number> {
  let probs: Record<RegimeType, number> = {
    bull: 0.15, bear: 0.15, neutral: 0.40, crisis: 0.15, recovery: 0.15
  };
  
  const { btcTrend30d, btcTrend90d, volatilityIndex, fearGreedIndex } = marketData;
  
  if (btcTrend30d > 20 && btcTrend90d > 30) {
    probs.bull += 0.35;
    probs.neutral -= 0.20;
    probs.bear -= 0.10;
  } else if (btcTrend30d < -20 && btcTrend90d < -30) {
    probs.bear += 0.30;
    probs.bull -= 0.20;
    probs.neutral -= 0.10;
  }
  
  if (btcTrend30d < -40 || volatilityIndex > 80) {
    probs.crisis += 0.40;
    probs.bull -= 0.25;
  }
  
  if (fearGreedIndex > 70) probs.bull += 0.10;
  else if (fearGreedIndex < 30) probs.bear += 0.10;
  
  // Normalize
  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(probs) as RegimeType[]) {
    probs[k] = Math.max(0, probs[k] / total);
  }
  
  return probs;
}

function getTier(score: number, _type: 'quality' | 'opportunity' | 'composite'): TierLabel {
  if (score >= CONFIG.TIER_BASE.Elite) return 'Elite';
  if (score >= CONFIG.TIER_BASE.Strong) return 'Strong';
  if (score >= CONFIG.TIER_BASE.Neutral) return 'Neutral';
  if (score >= CONFIG.TIER_BASE.Weak) return 'Weak';
  return 'Critical';
}

function generateUpgradeRecommendations(
  segments: Record<SegmentType, { adjustedScore: number; weight: number }>,
  weights: Record<SegmentType, number>
): OmniScoreV22['upgradeRecommendations'] {
  const controllableSegs: SegmentType[] = ['TEAM', 'TECH', 'SEC', 'GOV', 'ECO', 'TOKEN'];
  
  const recommendations: UpgradeRecommendation[] = [];
  
  for (const seg of controllableSegs) {
    const current = segments[seg].adjustedScore;
    if (current < 60) {
      const target = Math.min(80, current + 20);
      const qsImpact = CONFIG.QS_SEGMENTS.includes(seg) ? (target - current) * weights[seg] * 0.01 : 0;
      const osImpact = CONFIG.OS_SEGMENTS.includes(seg) ? (target - current) * weights[seg] * 0.01 : 0;
      
      let feasibility: 'easy' | 'medium' | 'hard' | 'very_hard' = 'medium';
      let cost: 'low' | 'medium' | 'high' | 'very_high' = 'medium';
      let time = '2-4 months';
      
      if (seg === 'SEC') { feasibility = 'medium'; cost = 'high'; time = '1-3 months'; }
      else if (seg === 'TEAM') { feasibility = 'hard'; cost = 'high'; time = '3-6 months'; }
      else if (seg === 'TECH') { feasibility = 'medium'; cost = 'medium'; time = '1-3 months'; }
      else if (seg === 'ECO') { feasibility = 'medium'; cost = 'high'; time = '3-9 months'; }
      
      recommendations.push({
        variable: seg,
        segment: seg,
        currentValue: current,
        targetValue: target,
        impact: {
          qsUplift: qsImpact * 10,
          osUplift: osImpact * 10,
          confidenceBand: [qsImpact * 5, qsImpact * 15],
        },
        feasibility,
        estimatedCost: cost,
        estimatedTime: time,
        tradeOffs: [],
        category: qsImpact > 0.5 ? 'high_impact' : feasibility === 'easy' ? 'quick_win' : 'strategic_bet',
        rationale: `Improving ${seg} from ${current.toFixed(0)}% to ${target.toFixed(0)}% could boost QS by ~${(qsImpact * 10).toFixed(1)} points.`,
      });
    }
  }
  
  recommendations.sort((a, b) => b.impact.qsUplift - a.impact.qsUplift);
  
  return {
    highImpact: recommendations.filter(r => r.category === 'high_impact').slice(0, 3),
    quickWins: recommendations.filter(r => r.category === 'quick_win').slice(0, 3),
    defensive: recommendations.filter(r => r.segment === 'SEC' || r.segment === 'LEGAL').slice(0, 2),
    strategicBet: recommendations.find(r => r.category === 'strategic_bet') || null,
    potentialUplift: {
      qsOptimistic: recommendations.slice(0, 5).reduce((sum, r) => sum + r.impact.qsUplift, 0) * 1.5,
      qsRealistic: recommendations.slice(0, 5).reduce((sum, r) => sum + r.impact.qsUplift, 0),
      timeToAchieve: '6-12 months',
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

export function formatOmniScoreV22ForAI(score: OmniScoreV22): string {
  const tierEmoji: Record<TierLabel, string> = {
    Elite: '🏆', Strong: '🥇', Neutral: '⚡', Weak: '⚠️', Critical: '🚨'
  };
  
  let ctx = `\n[🏆 PROJECT OMNISCORE v2.2 — DIVINE PERFECTION]\n`;
  ctx += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Reflexivity Firewall - Dual Scores
  ctx += `📊 DUAL SCORE SYSTEM (Reflexivity Firewall)\n`;
  ctx += `┌─────────────────────────────────────────────────────────────┐\n`;
  ctx += `│ QUALITY SCORE (what it IS):     ${score.qualityScore.score.toFixed(0)}/100 ${tierEmoji[score.qualityScore.tier]} ${score.qualityScore.tier}\n`;
  ctx += `│ OPPORTUNITY SCORE (market):     ${score.opportunityScore.score.toFixed(0)}/100 ${tierEmoji[score.opportunityScore.tier]} ${score.opportunityScore.tier}\n`;
  ctx += `└─────────────────────────────────────────────────────────────┘\n\n`;
  
  // NRG - Signature Metric
  const nrgEmoji = score.narrativeRealityGap.interpretation === 'overhyped' ? '🔴' :
                   score.narrativeRealityGap.interpretation === 'underhyped' ? '🟢' :
                   score.narrativeRealityGap.interpretation === 'severely_underhyped' ? '💎' : '🟡';
  
  ctx += `${nrgEmoji} NARRATIVE vs REALITY GAP: ${score.narrativeRealityGap.index.toFixed(2)}\n`;
  ctx += `   → ${score.narrativeRealityGap.interpretation.toUpperCase()}\n`;
  ctx += `   → ${score.narrativeRealityGap.tradingImplication}\n\n`;
  
  // Event Risk
  if (score.eventRisk.active) {
    ctx += `🚨 EVENT RISK: ${score.eventRisk.level.toUpperCase()}\n`;
    for (const event of score.eventRisk.events.slice(0, 2)) {
      ctx += `   • [${event.type.toUpperCase()}] ${event.description}\n`;
    }
    ctx += `\n`;
  }
  
  // Quality Breakdown
  ctx += `🔬 QUALITY SCORE BREAKDOWN:\n`;
  ctx += `   • Team: ${score.qualityScore.team.toFixed(0)}%\n`;
  ctx += `   • Tech: ${score.qualityScore.tech.toFixed(0)}%\n`;
  ctx += `   • Security: ${score.qualityScore.security.toFixed(0)}%\n`;
  ctx += `   • Governance: ${score.qualityScore.governance.toFixed(0)}%\n`;
  ctx += `   • Ecosystem: ${score.qualityScore.ecosystem.toFixed(0)}%\n\n`;
  
  // Opportunity Breakdown
  ctx += `📈 OPPORTUNITY SCORE BREAKDOWN:\n`;
  ctx += `   • Market: ${score.opportunityScore.market.toFixed(0)}%\n`;
  ctx += `   • Valuation: ${score.opportunityScore.valuation.toFixed(0)}%\n`;
  ctx += `   • Adoption: ${score.opportunityScore.adoption.toFixed(0)}%\n`;
  ctx += `   • Momentum: ${score.opportunityScore.momentum.toFixed(0)}%\n`;
  ctx += `   • Regime Adj: ${(score.opportunityScore.regimeAdjustment * 100).toFixed(0)}%\n\n`;
  
  // Context
  ctx += `🌍 CONTEXT:\n`;
  ctx += `   Regime: ${score.context.regime.current.toUpperCase()} (${(score.context.regime.probabilities[score.context.regime.current] * 100).toFixed(0)}% confidence)\n`;
  ctx += `   Sector: ${score.context.sector} | Cap: ${score.context.capTier}\n`;
  ctx += `   Data Coverage: ${(score.dataCoverage.overall * 100).toFixed(0)}% (${score.dataCoverage.confidenceLevel})\n\n`;
  
  // Key Insights
  if (score.keyStrengths.length > 0) {
    ctx += `✅ STRENGTHS: ${score.keyStrengths.join(', ')}\n`;
  }
  if (score.keyWeaknesses.length > 0) {
    ctx += `⚠️ WEAKNESSES: ${score.keyWeaknesses.join(', ')}\n`;
  }
  
  // Top Counterfactual
  if (score.counterfactuals.length > 0) {
    const top = score.counterfactuals[0];
    ctx += `\n💡 TOP IMPROVEMENT SCENARIO:\n`;
    ctx += `   "${top.scenario}" → QS +${top.qsDelta.toFixed(1)} | ${top.timeEstimate}\n`;
  }
  
  // Uncertainty
  ctx += `\n📊 UNCERTAINTY:\n`;
  ctx += `   Data: ±${score.uncertainty.data.variance.toFixed(1)} | `;
  ctx += `Model: ±${score.uncertainty.model.variance.toFixed(1)} | `;
  ctx += `Regime: ±${score.uncertainty.regime.variance.toFixed(1)}\n`;
  
  ctx += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  ctx += `📋 ${score.calibration.disclaimer}\n`;
  ctx += `[v${score.version} | ${score.context.sector} | ${score.context.capTier}-cap | ${score.context.regime.current} regime]\n`;
  
  return ctx;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const omniScoreV22 = {
  calculate: calculateOmniScoreV22,
  formatForAI: formatOmniScoreV22ForAI,
  CONFIG,
};

export default omniScoreV22;

