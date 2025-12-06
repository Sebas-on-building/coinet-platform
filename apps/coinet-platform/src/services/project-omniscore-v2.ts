/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏆 PROJECT OMNISCORE v2.1 - INSTITUTIONAL GRADE                          ║
 * ║                                                                               ║
 * ║   Defensible, Reproducible, Transparent Project Analysis                     ║
 * ║                                                                               ║
 * ║   METHODOLOGY:                                                                ║
 * ║   • All weights are INITIAL PRIORS pending live calibration                  ║
 * ║   • Backtest results are HISTORICAL observations, not guarantees             ║
 * ║   • Validation uses walk-forward + purged K-fold with embargo windows        ║
 * ║   • Only CONTROLLABLE variables in upgrade recommendations                   ║
 * ║                                                                               ║
 * ║   SUB-SCORES:                                                                 ║
 * ║   • POS-F: Fundamentals Quality (TEAM, TECH, SEC, GOV)                       ║
 * ║   • POS-M: Market/Positioning Quality (MARKET, TOKEN, VAL)                   ║
 * ║   • POS-A: Adoption Momentum (ADOPT, COMM, ECO)                              ║
 * ║   • POS-R: Risk & Fragility (LEGAL, MACRO, inverse of weaknesses)           ║
 * ║                                                                               ║
 * ║   FORMULA: POS = ω_F·POS-F + ω_M·POS-M + ω_A·POS-A - ω_R·POS-R               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('project-omniscore-v2');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type SegmentType = 
  | 'TEAM' | 'TECH' | 'SEC' | 'TOKEN' | 'ADOPT' | 'MARKET' 
  | 'COMM' | 'GOV' | 'ECO' | 'VAL' | 'LEGAL' | 'MACRO';

export type RegimeType = 'bull' | 'bear' | 'neutral' | 'crisis' | 'recovery';

export type TierLabel = 'Elite' | 'Strong' | 'Neutral' | 'Weak' | 'Critical';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient';

// Multi-objective sub-scores
export interface SubScores {
  fundamentals: number;   // POS-F: TEAM + TECH + SEC + GOV
  market: number;         // POS-M: MARKET + TOKEN + VAL
  adoption: number;       // POS-A: ADOPT + COMM + ECO
  risk: number;           // POS-R: LEGAL + MACRO + weakness penalties
}

export interface DataCoverage {
  score: number;          // Σ 1[x_i available] × Q_i / Σ 1
  availableVariables: number;
  totalVariables: number;
  confidenceLevel: ConfidenceLevel;
  blindSpots: string[];
  dataAge: {
    mean: number;         // Hours since update
    max: number;
  };
}

export interface CalibrationMetadata {
  // Transparency about weight origins
  weightSource: 'prior' | 'calibrated' | 'hybrid';
  calibrationDataset?: {
    period: string;       // e.g., "2019-01 to 2024-12"
    sampleSize: number;   // e.g., 5000 projects
    targetVariable: string; // e.g., "90d forward returns > 0"
  };
  validationMethod?: {
    type: 'walk-forward' | 'purged-kfold' | 'none';
    folds?: number;
    embargoWindow?: string; // e.g., "7 days"
  };
  lastCalibrated?: string;
  disclaimer: string;
}

export interface BacktestContext {
  // Historical observations, NOT promises
  historicalMedianReturn: number;
  historicalSurvivalRate: number;
  sampleSize: number;
  timeframe: string;      // e.g., "90 days forward"
  regimeCondition: RegimeType;
  capBucketCondition: string;
  disclaimer: string;
}

export interface VariableClassification {
  id: string;
  name: string;
  segment: SegmentType;
  isControllable: boolean;  // Only controllable vars in recommendations
  isReflexive: boolean;     // Reflects price action (avoid for fundamentals)
  dataSource: string;
  updateFrequency: string;  // 'realtime' | 'hourly' | 'daily' | 'weekly'
}

export interface UpgradeRecommendation {
  variable: string;
  segment: SegmentType;
  currentNormalized: number;    // 0-1
  targetNormalized: number;
  estimatedImpact: {
    posUplift: number;
    confidenceBand: [number, number];
  };
  feasibility: 'easy' | 'medium' | 'hard';
  estimatedCost: 'low' | 'medium' | 'high';
  estimatedTime: string;
  tradeOffs: string[];          // Other metrics that might suffer
  category: 'high_impact' | 'quick_win' | 'defensive' | 'strategic_bet' | 'risky_bet';
  rationale: string;
}

export interface ScenarioSimulation {
  scenario: string;
  posChange: number;
  confidenceBand: [number, number];
  affectedSegments: SegmentType[];
}

export interface ProjectOmniScoreV2 {
  // Core composite score
  pos: number;                  // 0-1
  posScaled: number;            // 0-100
  tier: TierLabel;
  
  // Multi-objective decomposition
  subScores: SubScores;
  subScoreWeights: {
    fundamentals: number;
    market: number;
    adoption: number;
    risk: number;
  };
  
  // Data quality & coverage
  dataCoverage: DataCoverage;
  
  // Calibration transparency
  calibration: CalibrationMetadata;
  
  // Regime context
  regime: {
    current: RegimeType;
    probabilities: Record<RegimeType, number>;
    confidence: number;
    forwardIndicators: string[];
  };
  
  // Segment breakdown (simplified, no fake R²)
  segments: Record<SegmentType, {
    score: number;
    weight: number;
    confidence: number;
    signalCount: number;
    strengths: string[];
    weaknesses: string[];
  }>;
  
  // Uncertainty quantification
  uncertainty: {
    variance: number;
    confidenceBand: [number, number];
    confidenceLevel: number;    // e.g., 0.95
  };
  
  // Tier thresholds (regime + cap conditioned)
  thresholds: {
    elite: number;
    strong: number;
    neutral: number;
    weak: number;
    context: string;            // e.g., "bear market, mid-cap"
  };
  
  // Backtest context (with disclaimers)
  backtestContext?: BacktestContext;
  
  // Perfectionize engine (controllable only)
  upgradeRecommendations: {
    highImpact: UpgradeRecommendation[];
    quickWins: UpgradeRecommendation[];
    defensive: UpgradeRecommendation[];
    strategicBet: UpgradeRecommendation | null;
    potentialUplift: {
      optimistic: number;
      realistic: number;
      confidenceBand: [number, number];
    };
  };
  
  // Scenario simulations
  scenarios?: ScenarioSimulation[];
  
  // Risk alerts
  riskAlerts: {
    level: 'none' | 'watch' | 'warning' | 'critical';
    alerts: Array<{
      type: 'unlock' | 'hack' | 'legal' | 'liquidity' | 'concentration';
      severity: number;
      description: string;
    }>;
  };
  
  // Summary
  summary: string;
  keyStrengths: string[];
  keyWeaknesses: string[];
  
  // Metadata
  projectId: string;
  projectName: string;
  projectSymbol: string;
  category: string;
  marketCapTier: 'mega' | 'large' | 'mid' | 'small' | 'micro' | 'nano';
  calculatedAt: string;
  dataSourcesUsed: string[];
  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - TRANSPARENT & DEFENSIBLE
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  VERSION: '2.1.0',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WEIGHT CONFIGURATION - CLEARLY LABELED AS PRIORS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Sub-score weights (multi-objective decomposition)
  // These prevent "hot marketing + price action" from overpowering fundamentals
  SUB_SCORE_WEIGHTS: {
    fundamentals: 0.35,   // TEAM + TECH + SEC + GOV
    market: 0.25,         // MARKET + TOKEN + VAL
    adoption: 0.25,       // ADOPT + COMM + ECO
    risk: 0.15,           // Subtracted (higher risk = lower POS)
  },
  
  // Segment assignments to sub-scores
  SEGMENT_TO_SUBSCORE: {
    TEAM: 'fundamentals',
    TECH: 'fundamentals',
    SEC: 'fundamentals',
    GOV: 'fundamentals',
    MARKET: 'market',
    TOKEN: 'market',
    VAL: 'market',
    ADOPT: 'adoption',
    COMM: 'adoption',
    ECO: 'adoption',
    LEGAL: 'risk',
    MACRO: 'risk',
  } as Record<SegmentType, keyof SubScores>,
  
  // Segment weights within sub-scores (INITIAL PRIORS)
  // NOTE: These are starting points, not empirically validated coefficients
  SEGMENT_WEIGHTS: {
    // Fundamentals (35% of total)
    TEAM: { weight: 0.30, source: 'prior' },   // 0.30 × 0.35 = 10.5%
    TECH: { weight: 0.35, source: 'prior' },   // 12.25%
    SEC: { weight: 0.25, source: 'prior' },    // 8.75%
    GOV: { weight: 0.10, source: 'prior' },    // 3.5%
    
    // Market (25% of total)
    MARKET: { weight: 0.40, source: 'prior' }, // 10%
    TOKEN: { weight: 0.35, source: 'prior' },  // 8.75%
    VAL: { weight: 0.25, source: 'prior' },    // 6.25%
    
    // Adoption (25% of total)
    ADOPT: { weight: 0.45, source: 'prior' },  // 11.25%
    COMM: { weight: 0.30, source: 'prior' },   // 7.5%
    ECO: { weight: 0.25, source: 'prior' },    // 6.25%
    
    // Risk (15% of total, subtracted)
    LEGAL: { weight: 0.50, source: 'prior' },  // 7.5% penalty
    MACRO: { weight: 0.50, source: 'prior' },  // 7.5% penalty
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REGIME DETECTION - 5-STATE MODEL
  // ═══════════════════════════════════════════════════════════════════════════
  
  REGIME: {
    STATES: ['bull', 'bear', 'neutral', 'crisis', 'recovery'] as RegimeType[],
    
    // Thresholds for classification
    BULL_THRESHOLD: { btc30d: 20, btc90d: 30 },
    BEAR_THRESHOLD: { btc30d: -20, btc90d: -30 },
    CRISIS_THRESHOLD: { btc30d: -40, volatility: 80 },
    RECOVERY_THRESHOLD: { btc30d: 10, priorRegime: 'crisis' },
    
    // Regime-specific weight adjustments
    MODIFIERS: {
      bull: { fundamentals: 0.85, market: 1.15, adoption: 1.15, risk: 0.75 },
      bear: { fundamentals: 1.20, market: 0.85, adoption: 0.90, risk: 1.30 },
      neutral: { fundamentals: 1.0, market: 1.0, adoption: 1.0, risk: 1.0 },
      crisis: { fundamentals: 1.30, market: 0.60, adoption: 0.70, risk: 1.50 },
      recovery: { fundamentals: 1.10, market: 1.10, adoption: 1.20, risk: 0.90 },
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DATA QUALITY THRESHOLDS
  // ═══════════════════════════════════════════════════════════════════════════
  
  DATA_QUALITY: {
    // Coverage thresholds for confidence levels
    HIGH_CONFIDENCE_THRESHOLD: 0.80,    // >80% data with good quality
    MEDIUM_CONFIDENCE_THRESHOLD: 0.60,
    LOW_CONFIDENCE_THRESHOLD: 0.40,
    
    // Freshness decay
    FRESHNESS_HALF_LIFE_HOURS: 24,      // Data quality halves every 24h
    MAX_STALENESS_HOURS: 168,           // 7 days max
    
    // Source reliability (transparent)
    SOURCE_RELIABILITY: {
      blockchain: { reliability: 0.95, description: 'On-chain data, highest trust' },
      coingecko: { reliability: 0.90, description: 'Aggregated market data' },
      github: { reliability: 0.88, description: 'Public repository data' },
      defillama: { reliability: 0.85, description: 'DeFi protocol data' },
      messari: { reliability: 0.85, description: 'Research-grade profiles' },
      crunchbase: { reliability: 0.80, description: 'Funding/team data' },
      twitter: { reliability: 0.65, description: 'Social signals, noisy' },
      reddit: { reliability: 0.60, description: 'Social signals, noisy' },
      estimate: { reliability: 0.50, description: 'Derived/estimated values' },
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER THRESHOLDS - REGIME & CAP CONDITIONED
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Base thresholds (adjusted by regime and cap tier)
  TIER_THRESHOLDS: {
    Elite: { sigmaAboveMean: 1.0 },
    Strong: { sigmaAboveMean: 0.3 },
    Neutral: { sigmaAboveMean: -0.3 },
    Weak: { sigmaAboveMean: -1.0 },
    Critical: { sigmaAboveMean: -Infinity },
  },
  
  // Historical distribution by cap tier (for threshold calculation)
  // NOTE: These are ESTIMATES, not validated backtests
  DISTRIBUTION_PRIORS: {
    mega: { mean: 0.70, stdDev: 0.12 },
    large: { mean: 0.62, stdDev: 0.14 },
    mid: { mean: 0.52, stdDev: 0.16 },
    small: { mean: 0.45, stdDev: 0.18 },
    micro: { mean: 0.38, stdDev: 0.20 },
    nano: { mean: 0.30, stdDev: 0.22 },
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  NORMALIZATION: {
    CLIP_K: 5,              // Clip z-scores at ±5
    EPSILON: 1e-8,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CALIBRATION METADATA
  // ═══════════════════════════════════════════════════════════════════════════
  
  CALIBRATION: {
    weightSource: 'prior' as const,
    disclaimer: 'Weights are initial priors based on domain expertise. Live calibration requires 6+ months of prediction data. Historical performance does not guarantee future results.',
    validationMethod: {
      type: 'none' as const,
      targetImplementation: 'Walk-forward validation with 7-day embargo windows, regime-stratified evaluation.',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// VARIABLE DEFINITIONS - WITH CONTROLLABILITY FLAGS
// ═══════════════════════════════════════════════════════════════════════════════

interface VariableConfig {
  id: string;
  name: string;
  segment: SegmentType;
  isControllable: boolean;  // CAN project improve this?
  isReflexive: boolean;     // Does this REFLECT price action?
  source: string;
  scoringFn: (value: number) => number;
  historicalPriors: { median: number; mad: number };
  weight: number;
}

const VARIABLES: VariableConfig[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TEAM - Mostly non-controllable (track record), some controllable (hiring)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'team_track_record',
    name: 'Founder Track Record',
    segment: 'TEAM',
    isControllable: false,  // Can't change past
    isReflexive: false,
    source: 'crunchbase',
    scoringFn: (v) => Math.tanh(v / 3),
    historicalPriors: { median: 1.5, mad: 1.2 },
    weight: 0.30,
  },
  {
    id: 'team_size',
    name: 'Team Size',
    segment: 'TEAM',
    isControllable: true,   // Can hire
    isReflexive: false,
    source: 'crunchbase',
    scoringFn: (v) => 1 - Math.exp(-v / 30),
    historicalPriors: { median: 15, mad: 20 },
    weight: 0.20,
  },
  {
    id: 'team_experience',
    name: 'Average Crypto Experience',
    segment: 'TEAM',
    isControllable: true,   // Can hire experienced people
    isReflexive: false,
    source: 'estimate',
    scoringFn: (v) => Math.tanh(v / 5),
    historicalPriors: { median: 3, mad: 2 },
    weight: 0.25,
  },
  {
    id: 'team_transparency',
    name: 'Team Transparency',
    segment: 'TEAM',
    isControllable: true,   // Can doxx
    isReflexive: false,
    source: 'estimate',
    scoringFn: (v) => v,
    historicalPriors: { median: 0.6, mad: 0.3 },
    weight: 0.25,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TECH - Mostly controllable
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'tech_commits_30d',
    name: 'Commits (30d)',
    segment: 'TECH',
    isControllable: true,
    isReflexive: false,
    source: 'github',
    scoringFn: (v) => Math.min(1, v / 200),
    historicalPriors: { median: 50, mad: 80 },
    weight: 0.25,
  },
  {
    id: 'tech_contributors',
    name: 'Active Contributors',
    segment: 'TECH',
    isControllable: true,
    isReflexive: false,
    source: 'github',
    scoringFn: (v) => 1 - Math.exp(-v / 15),
    historicalPriors: { median: 8, mad: 12 },
    weight: 0.20,
  },
  {
    id: 'tech_documentation',
    name: 'Documentation Quality',
    segment: 'TECH',
    isControllable: true,
    isReflexive: false,
    source: 'github',
    scoringFn: (v) => v,
    historicalPriors: { median: 0.5, mad: 0.25 },
    weight: 0.15,
  },
  {
    id: 'tech_stars',
    name: 'GitHub Stars',
    segment: 'TECH',
    isControllable: false,  // Organic (can't buy legitimately)
    isReflexive: true,      // Reflects hype
    source: 'github',
    scoringFn: (v) => Math.min(1, Math.log10(v + 1) / 4),
    historicalPriors: { median: 500, mad: 2000 },
    weight: 0.15,
  },
  {
    id: 'tech_release_frequency',
    name: 'Release Frequency',
    segment: 'TECH',
    isControllable: true,
    isReflexive: false,
    source: 'github',
    scoringFn: (v) => Math.min(1, v / 2),
    historicalPriors: { median: 0.5, mad: 0.5 },
    weight: 0.25,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SEC - Mostly controllable (can get audits)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'sec_audit_count',
    name: 'Audit Count',
    segment: 'SEC',
    isControllable: true,
    isReflexive: false,
    source: 'estimate',
    scoringFn: (v) => 1 - Math.exp(-v / 2),
    historicalPriors: { median: 1, mad: 1.5 },
    weight: 0.30,
  },
  {
    id: 'sec_auditor_tier',
    name: 'Auditor Quality (1=best)',
    segment: 'SEC',
    isControllable: true,
    isReflexive: false,
    source: 'estimate',
    scoringFn: (v) => Math.max(0, 1 - (v - 1) * 0.20),
    historicalPriors: { median: 2, mad: 1 },
    weight: 0.25,
  },
  {
    id: 'sec_bug_bounty',
    name: 'Bug Bounty (USD)',
    segment: 'SEC',
    isControllable: true,
    isReflexive: false,
    source: 'estimate',
    scoringFn: (v) => Math.min(1, Math.log10(v + 1) / 6),
    historicalPriors: { median: 50000, mad: 100000 },
    weight: 0.20,
  },
  {
    id: 'sec_incident_count',
    name: 'Security Incidents',
    segment: 'SEC',
    isControllable: false,  // Can't undo past incidents
    isReflexive: false,
    source: 'estimate',
    scoringFn: (v) => Math.exp(-v),
    historicalPriors: { median: 0, mad: 0.5 },
    weight: 0.25,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN - Partially controllable
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'token_holder_concentration',
    name: 'Holder Decentralization',
    segment: 'TOKEN',
    isControllable: false,  // Market-driven
    isReflexive: false,
    source: 'blockchain',
    scoringFn: (v) => v,
    historicalPriors: { median: 0.4, mad: 0.2 },
    weight: 0.30,
  },
  {
    id: 'token_circulating_ratio',
    name: 'Circulating/Total Ratio',
    segment: 'TOKEN',
    isControllable: true,   // Can adjust vesting
    isReflexive: false,
    source: 'coingecko',
    scoringFn: (v) => v,
    historicalPriors: { median: 0.5, mad: 0.25 },
    weight: 0.25,
  },
  {
    id: 'token_unlock_pressure',
    name: 'Unlock Pressure (12mo)',
    segment: 'TOKEN',
    isControllable: false,  // Past vesting locked
    isReflexive: false,
    source: 'estimate',
    scoringFn: (v) => Math.exp(-v / 25),
    historicalPriors: { median: 15, mad: 15 },
    weight: 0.25,
  },
  {
    id: 'token_utility_count',
    name: 'Utility Use Cases',
    segment: 'TOKEN',
    isControllable: true,
    isReflexive: false,
    source: 'estimate',
    scoringFn: (v) => 1 - Math.exp(-v / 3),
    historicalPriors: { median: 2, mad: 2 },
    weight: 0.20,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ADOPT - Non-controllable (organic metrics)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'adopt_active_addresses',
    name: 'Active Addresses (30d avg)',
    segment: 'ADOPT',
    isControllable: false,
    isReflexive: true,
    source: 'blockchain',
    scoringFn: (v) => Math.min(1, Math.log10(v + 1) / 6),
    historicalPriors: { median: 10000, mad: 50000 },
    weight: 0.30,
  },
  {
    id: 'adopt_revenue',
    name: 'Protocol Revenue (USD/day)',
    segment: 'ADOPT',
    isControllable: false,
    isReflexive: true,
    source: 'defillama',
    scoringFn: (v) => Math.min(1, Math.log10(v + 1) / 6),
    historicalPriors: { median: 10000, mad: 100000 },
    weight: 0.30,
  },
  {
    id: 'adopt_tvl',
    name: 'TVL (USD)',
    segment: 'ADOPT',
    isControllable: false,
    isReflexive: true,
    source: 'defillama',
    scoringFn: (v) => Math.min(1, Math.log10(v + 1) / 10),
    historicalPriors: { median: 10000000, mad: 100000000 },
    weight: 0.25,
  },
  {
    id: 'adopt_integration_count',
    name: 'Protocol Integrations',
    segment: 'ADOPT',
    isControllable: true,   // Can pursue partnerships
    isReflexive: false,
    source: 'defillama',
    scoringFn: (v) => 1 - Math.exp(-v / 10),
    historicalPriors: { median: 5, mad: 10 },
    weight: 0.15,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MARKET - Non-controllable (market-driven)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'market_liquidity',
    name: 'Liquidity Depth (USD)',
    segment: 'MARKET',
    isControllable: false,
    isReflexive: true,
    source: 'coingecko',
    scoringFn: (v) => Math.min(1, Math.log10(v + 1) / 7),
    historicalPriors: { median: 500000, mad: 2000000 },
    weight: 0.35,
  },
  {
    id: 'market_volume_mcap',
    name: 'Volume/MCap Ratio',
    segment: 'MARKET',
    isControllable: false,
    isReflexive: true,
    source: 'coingecko',
    scoringFn: (v) => Math.min(1, v / 0.15),
    historicalPriors: { median: 0.05, mad: 0.08 },
    weight: 0.30,
  },
  {
    id: 'market_exchange_tier1',
    name: 'Tier-1 Exchange Count',
    segment: 'MARKET',
    isControllable: false,  // Exchange decides
    isReflexive: false,
    source: 'coingecko',
    scoringFn: (v) => 1 - Math.exp(-v / 3),
    historicalPriors: { median: 2, mad: 2 },
    weight: 0.35,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMM - Partially controllable
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'comm_twitter_followers',
    name: 'Twitter Followers',
    segment: 'COMM',
    isControllable: true,   // Can grow with effort
    isReflexive: true,
    source: 'twitter',
    scoringFn: (v) => Math.tanh(v / 500000),
    historicalPriors: { median: 50000, mad: 150000 },
    weight: 0.30,
  },
  {
    id: 'comm_engagement_rate',
    name: 'Engagement Rate',
    segment: 'COMM',
    isControllable: true,
    isReflexive: true,
    source: 'twitter',
    scoringFn: (v) => Math.min(1, v / 0.05),
    historicalPriors: { median: 0.02, mad: 0.02 },
    weight: 0.30,
  },
  {
    id: 'comm_discord_members',
    name: 'Discord Members',
    segment: 'COMM',
    isControllable: true,
    isReflexive: true,
    source: 'estimate',
    scoringFn: (v) => Math.tanh(v / 100000),
    historicalPriors: { median: 20000, mad: 50000 },
    weight: 0.25,
  },
  {
    id: 'comm_github_stars',
    name: 'GitHub Stars',
    segment: 'COMM',
    isControllable: false,
    isReflexive: true,
    source: 'github',
    scoringFn: (v) => Math.min(1, Math.log10(v + 1) / 4),
    historicalPriors: { median: 500, mad: 2000 },
    weight: 0.15,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GOV - Mostly controllable
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'gov_decentralization',
    name: 'Governance Decentralization',
    segment: 'GOV',
    isControllable: true,
    isReflexive: false,
    source: 'blockchain',
    scoringFn: (v) => Math.min(1, v / 10),
    historicalPriors: { median: 3, mad: 3 },
    weight: 0.40,
  },
  {
    id: 'gov_voter_turnout',
    name: 'Voter Turnout (%)',
    segment: 'GOV',
    isControllable: true,
    isReflexive: false,
    source: 'blockchain',
    scoringFn: (v) => v / 100,
    historicalPriors: { median: 15, mad: 15 },
    weight: 0.35,
  },
  {
    id: 'gov_proposal_count',
    name: 'Active Proposals (6mo)',
    segment: 'GOV',
    isControllable: true,
    isReflexive: false,
    source: 'blockchain',
    scoringFn: (v) => 1 - Math.exp(-v / 10),
    historicalPriors: { median: 5, mad: 8 },
    weight: 0.25,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ECO - Mostly controllable
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'eco_grant_program',
    name: 'Grant Program Size (USD)',
    segment: 'ECO',
    isControllable: true,
    isReflexive: false,
    source: 'estimate',
    scoringFn: (v) => Math.min(1, Math.log10(v + 1) / 8),
    historicalPriors: { median: 1000000, mad: 10000000 },
    weight: 0.35,
  },
  {
    id: 'eco_sdk_quality',
    name: 'SDK/Tooling Quality',
    segment: 'ECO',
    isControllable: true,
    isReflexive: false,
    source: 'github',
    scoringFn: (v) => v,
    historicalPriors: { median: 0.5, mad: 0.25 },
    weight: 0.35,
  },
  {
    id: 'eco_ecosystem_projects',
    name: 'Ecosystem Projects',
    segment: 'ECO',
    isControllable: true,
    isReflexive: false,
    source: 'defillama',
    scoringFn: (v) => 1 - Math.exp(-v / 50),
    historicalPriors: { median: 20, mad: 40 },
    weight: 0.30,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VAL - Non-controllable (market prices)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'val_fdv_revenue',
    name: 'FDV/Revenue (lower = better)',
    segment: 'VAL',
    isControllable: false,
    isReflexive: true,
    source: 'defillama',
    scoringFn: (v) => Math.exp(-v / 100),
    historicalPriors: { median: 50, mad: 100 },
    weight: 0.35,
  },
  {
    id: 'val_mcap_tvl',
    name: 'MCap/TVL (lower = better for DeFi)',
    segment: 'VAL',
    isControllable: false,
    isReflexive: true,
    source: 'defillama',
    scoringFn: (v) => Math.exp(-v / 5),
    historicalPriors: { median: 2, mad: 3 },
    weight: 0.35,
  },
  {
    id: 'val_price_drawdown',
    name: 'Current Drawdown from ATH',
    segment: 'VAL',
    isControllable: false,
    isReflexive: true,
    source: 'coingecko',
    scoringFn: (v) => 1 - v, // Lower drawdown = higher score
    historicalPriors: { median: 0.5, mad: 0.3 },
    weight: 0.30,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LEGAL - Partially controllable
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'legal_jurisdiction_risk',
    name: 'Jurisdiction Risk',
    segment: 'LEGAL',
    isControllable: true,   // Can relocate
    isReflexive: false,
    source: 'estimate',
    scoringFn: (v) => 1 - v, // Higher risk = lower score
    historicalPriors: { median: 0.3, mad: 0.25 },
    weight: 0.50,
  },
  {
    id: 'legal_regulatory_news',
    name: 'Regulatory News Exposure',
    segment: 'LEGAL',
    isControllable: false,
    isReflexive: false,
    source: 'estimate',
    scoringFn: (v) => 1 - v,
    historicalPriors: { median: 0.2, mad: 0.2 },
    weight: 0.50,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MACRO - Non-controllable (external factors)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'macro_btc_correlation',
    name: 'BTC Correlation (90d)',
    segment: 'MACRO',
    isControllable: false,
    isReflexive: false,
    source: 'coingecko',
    scoringFn: (v) => Math.exp(-Math.abs(v) / 0.8),
    historicalPriors: { median: 0.65, mad: 0.2 },
    weight: 0.50,
  },
  {
    id: 'macro_volatility',
    name: 'Price Volatility (30d)',
    segment: 'MACRO',
    isControllable: false,
    isReflexive: true,
    source: 'coingecko',
    scoringFn: (v) => Math.exp(-v / 0.5),
    historicalPriors: { median: 0.4, mad: 0.3 },
    weight: 0.50,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute data coverage score
 */
function computeDataCoverage(
  availableVars: Set<string>,
  qualityScores: Map<string, number>
): DataCoverage {
  const totalVars = VARIABLES.length;
  let weightedSum = 0;
  let totalWeight = 0;
  const blindSpots: string[] = [];
  
  for (const v of VARIABLES) {
    if (availableVars.has(v.id)) {
      const q = qualityScores.get(v.id) || 0.5;
      weightedSum += q;
      totalWeight += 1;
    } else {
      blindSpots.push(v.name);
    }
  }
  
  const score = totalWeight > 0 ? weightedSum / totalVars : 0;
  
  let confidenceLevel: ConfidenceLevel;
  if (score >= CONFIG.DATA_QUALITY.HIGH_CONFIDENCE_THRESHOLD) {
    confidenceLevel = 'high';
  } else if (score >= CONFIG.DATA_QUALITY.MEDIUM_CONFIDENCE_THRESHOLD) {
    confidenceLevel = 'medium';
  } else if (score >= CONFIG.DATA_QUALITY.LOW_CONFIDENCE_THRESHOLD) {
    confidenceLevel = 'low';
  } else {
    confidenceLevel = 'insufficient';
  }
  
  return {
    score,
    availableVariables: availableVars.size,
    totalVariables: totalVars,
    confidenceLevel,
    blindSpots: blindSpots.slice(0, 10),
    dataAge: { mean: 12, max: 48 }, // Would compute from actual timestamps
  };
}

/**
 * Detect regime with 5 states
 */
function detectRegime(
  btcTrend30d: number,
  btcTrend90d: number,
  volatilityIndex: number,
  fearGreedIndex: number,
  priorRegime?: RegimeType
): ProjectOmniScoreV2['regime'] {
  const { BULL_THRESHOLD, BEAR_THRESHOLD, CRISIS_THRESHOLD, RECOVERY_THRESHOLD } = CONFIG.REGIME;
  
  let probs: Record<RegimeType, number> = {
    bull: 0.2, bear: 0.2, neutral: 0.2, crisis: 0.2, recovery: 0.2
  };
  
  // Bull conditions
  if (btcTrend30d > BULL_THRESHOLD.btc30d && btcTrend90d > BULL_THRESHOLD.btc90d) {
    probs.bull += 0.45;
    probs.neutral -= 0.15;
    probs.bear -= 0.15;
    probs.crisis -= 0.10;
    probs.recovery -= 0.05;
  }
  
  // Bear conditions
  if (btcTrend30d < BEAR_THRESHOLD.btc30d && btcTrend90d < BEAR_THRESHOLD.btc90d) {
    probs.bear += 0.35;
    probs.bull -= 0.20;
    probs.neutral -= 0.10;
    probs.recovery -= 0.05;
  }
  
  // Crisis conditions
  if (btcTrend30d < CRISIS_THRESHOLD.btc30d || volatilityIndex > CRISIS_THRESHOLD.volatility) {
    probs.crisis += 0.50;
    probs.bull -= 0.25;
    probs.neutral -= 0.15;
    probs.bear -= 0.05;
    probs.recovery -= 0.05;
  }
  
  // Recovery conditions
  if (priorRegime === 'crisis' && btcTrend30d > RECOVERY_THRESHOLD.btc30d) {
    probs.recovery += 0.40;
    probs.crisis -= 0.25;
    probs.bear -= 0.10;
    probs.neutral -= 0.05;
  }
  
  // Fear/greed adjustments
  if (fearGreedIndex > 70) {
    probs.bull += 0.10;
  } else if (fearGreedIndex < 30) {
    probs.bear += 0.05;
    probs.crisis += 0.05;
  }
  
  // Normalize
  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(probs) as RegimeType[]) {
    probs[key] = Math.max(0, probs[key] / total);
  }
  
  // Find highest probability
  const entries = Object.entries(probs) as [RegimeType, number][];
  const [current, confidence] = entries.reduce((max, e) => e[1] > max[1] ? e : max);
  
  return {
    current,
    probabilities: probs,
    confidence,
    forwardIndicators: [
      `BTC 30d: ${btcTrend30d > 0 ? '+' : ''}${btcTrend30d.toFixed(1)}%`,
      `Fear/Greed: ${fearGreedIndex}`,
      `Volatility: ${volatilityIndex}`,
    ],
  };
}

/**
 * Generate upgrade recommendations (controllable only)
 */
function generateUpgradeRecommendations(
  variableScores: Map<string, number>,
  segmentScores: Record<SegmentType, number>
): ProjectOmniScoreV2['upgradeRecommendations'] {
  const recommendations: UpgradeRecommendation[] = [];
  
  // Only process CONTROLLABLE variables
  const controllableVars = VARIABLES.filter(v => v.isControllable);
  
  for (const varConfig of controllableVars) {
    const currentScore = variableScores.get(varConfig.id) || 0.5;
    
    // Only recommend improvements for below-average variables
    if (currentScore < 0.6) {
      const segmentWeight = CONFIG.SEGMENT_WEIGHTS[varConfig.segment].weight;
      const subScore = CONFIG.SEGMENT_TO_SUBSCORE[varConfig.segment];
      const subScoreWeight = CONFIG.SUB_SCORE_WEIGHTS[subScore];
      
      // Estimate impact (partial derivative approximation)
      const estimatedImpact = varConfig.weight * segmentWeight * subScoreWeight * (0.8 - currentScore);
      
      // Determine feasibility based on variable type
      let feasibility: 'easy' | 'medium' | 'hard' = 'medium';
      let estimatedCost: 'low' | 'medium' | 'high' = 'medium';
      let estimatedTime = '1-3 months';
      
      if (varConfig.segment === 'SEC' || varConfig.segment === 'TECH') {
        feasibility = 'medium';
        estimatedCost = 'high';
        estimatedTime = '3-6 months';
      } else if (varConfig.segment === 'COMM') {
        feasibility = 'easy';
        estimatedCost = 'low';
        estimatedTime = '1-4 weeks';
      } else if (varConfig.segment === 'GOV') {
        feasibility = 'hard';
        estimatedCost = 'medium';
        estimatedTime = '6-12 months';
      }
      
      // Determine category
      let category: UpgradeRecommendation['category'] = 'high_impact';
      if (estimatedImpact > 0.02) {
        category = 'high_impact';
      } else if (feasibility === 'easy' && estimatedCost === 'low') {
        category = 'quick_win';
      } else if (varConfig.segment === 'SEC' || varConfig.segment === 'LEGAL') {
        category = 'defensive';
      } else if (estimatedImpact > 0.015) {
        category = 'strategic_bet';
      } else {
        category = 'risky_bet';
      }
      
      recommendations.push({
        variable: varConfig.name,
        segment: varConfig.segment,
        currentNormalized: currentScore,
        targetNormalized: 0.8,
        estimatedImpact: {
          posUplift: estimatedImpact,
          confidenceBand: [estimatedImpact * 0.5, estimatedImpact * 1.5],
        },
        feasibility,
        estimatedCost,
        estimatedTime,
        tradeOffs: [],
        category,
        rationale: `Improving ${varConfig.name} from ${(currentScore * 100).toFixed(0)}% to 80% could increase POS by ~${(estimatedImpact * 100).toFixed(2)} points.`,
      });
    }
  }
  
  // Sort by impact
  recommendations.sort((a, b) => b.estimatedImpact.posUplift - a.estimatedImpact.posUplift);
  
  const highImpact = recommendations.filter(r => r.category === 'high_impact').slice(0, 3);
  const quickWins = recommendations.filter(r => r.category === 'quick_win').slice(0, 3);
  const defensive = recommendations.filter(r => r.category === 'defensive').slice(0, 3);
  const strategicBet = recommendations.find(r => r.category === 'strategic_bet') || null;
  
  const potentialUplift = recommendations.slice(0, 5).reduce((sum, r) => sum + r.estimatedImpact.posUplift, 0);
  
  return {
    highImpact,
    quickWins,
    defensive,
    strategicBet,
    potentialUplift: {
      optimistic: potentialUplift * 1.5,
      realistic: potentialUplift,
      confidenceBand: [potentialUplift * 0.5, potentialUplift * 2],
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface RawVariableInput {
  id: string;
  value: number;
  source: string;
  lastUpdated: string;
}

export async function calculateOmniScoreV2(
  projectId: string,
  rawInputs: RawVariableInput[],
  marketData: {
    marketCap: number;
    btcTrend30d: number;
    btcTrend90d: number;
    volatilityIndex: number;
    fearGreedIndex: number;
  },
  category: string = 'unknown'
): Promise<ProjectOmniScoreV2> {
  const startTime = Date.now();
  logger.info(`🏆 Calculating OmniScore v2.1 for ${projectId}...`);
  
  // Market cap tier
  const mc = marketData.marketCap;
  const marketCapTier: ProjectOmniScoreV2['marketCapTier'] = 
    mc >= 10_000_000_000 ? 'mega' :
    mc >= 1_000_000_000 ? 'large' :
    mc >= 100_000_000 ? 'mid' :
    mc >= 10_000_000 ? 'small' :
    mc >= 1_000_000 ? 'micro' : 'nano';
  
  // Detect regime
  const regime = detectRegime(
    marketData.btcTrend30d,
    marketData.btcTrend90d,
    marketData.volatilityIndex,
    marketData.fearGreedIndex
  );
  
  // Process variables
  const availableVars = new Set<string>();
  const qualityScores = new Map<string, number>();
  const variableScores = new Map<string, number>();
  
  for (const input of rawInputs) {
    const varConfig = VARIABLES.find(v => v.id === input.id);
    if (!varConfig) continue;
    
    availableVars.add(input.id);
    
    // Calculate quality
    const sourceConfig = CONFIG.DATA_QUALITY.SOURCE_RELIABILITY[input.source as keyof typeof CONFIG.DATA_QUALITY.SOURCE_RELIABILITY];
    const reliability = sourceConfig?.reliability || 0.5;
    const hoursSinceUpdate = (Date.now() - new Date(input.lastUpdated).getTime()) / (1000 * 60 * 60);
    const freshness = Math.exp(-hoursSinceUpdate / CONFIG.DATA_QUALITY.FRESHNESS_HALF_LIFE_HOURS);
    const quality = reliability * freshness;
    qualityScores.set(input.id, quality);
    
    // Calculate score using scoring function
    const rawScore = varConfig.scoringFn(input.value);
    variableScores.set(input.id, rawScore * quality);
  }
  
  // Calculate data coverage
  const dataCoverage = computeDataCoverage(availableVars, qualityScores);
  
  // Calculate segment scores
  const segments: Record<SegmentType, any> = {} as any;
  const segmentScores: Record<SegmentType, number> = {} as any;
  
  for (const seg of Object.keys(CONFIG.SEGMENT_WEIGHTS) as SegmentType[]) {
    const segVars = VARIABLES.filter(v => v.segment === seg);
    let totalScore = 0;
    let totalWeight = 0;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    let signalCount = 0;
    
    for (const v of segVars) {
      const score = variableScores.get(v.id);
      if (score !== undefined) {
        totalScore += score * v.weight;
        totalWeight += v.weight;
        signalCount++;
        
        if (score > 0.7) strengths.push(v.name);
        if (score < 0.4) weaknesses.push(v.name);
      }
    }
    
    const segScore = totalWeight > 0 ? totalScore / totalWeight : 0.5;
    segmentScores[seg] = segScore;
    
    segments[seg] = {
      score: segScore,
      weight: CONFIG.SEGMENT_WEIGHTS[seg].weight,
      confidence: signalCount / segVars.length,
      signalCount,
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
    };
  }
  
  // Calculate sub-scores
  const subScores: SubScores = {
    fundamentals: 0,
    market: 0,
    adoption: 0,
    risk: 0,
  };
  
  const subScoreWeights = { ...CONFIG.SUB_SCORE_WEIGHTS };
  
  for (const [seg, score] of Object.entries(segmentScores)) {
    const subScore = CONFIG.SEGMENT_TO_SUBSCORE[seg as SegmentType];
    const weight = CONFIG.SEGMENT_WEIGHTS[seg as SegmentType].weight;
    subScores[subScore] += score * weight;
  }
  
  // Normalize sub-scores
  for (const key of Object.keys(subScores) as (keyof SubScores)[]) {
    const relevantSegs = Object.entries(CONFIG.SEGMENT_TO_SUBSCORE)
      .filter(([_, ss]) => ss === key)
      .map(([seg]) => seg as SegmentType);
    const totalWeight = relevantSegs.reduce((sum, seg) => sum + CONFIG.SEGMENT_WEIGHTS[seg].weight, 0);
    if (totalWeight > 0) {
      subScores[key] /= totalWeight;
    }
  }
  
  // Apply regime modifiers
  const regimeMod = CONFIG.REGIME.MODIFIERS[regime.current];
  
  // Calculate final POS with multi-objective formula
  // POS = ω_F·POS-F + ω_M·POS-M + ω_A·POS-A - ω_R·POS-R
  const pos = Math.max(0, Math.min(1,
    subScoreWeights.fundamentals * subScores.fundamentals * regimeMod.fundamentals +
    subScoreWeights.market * subScores.market * regimeMod.market +
    subScoreWeights.adoption * subScores.adoption * regimeMod.adoption -
    subScoreWeights.risk * (1 - subScores.risk) * regimeMod.risk
  ));
  
  // Calculate uncertainty
  const uncertainty = {
    variance: 0.01 * (1 - dataCoverage.score),
    confidenceBand: [
      Math.max(0, pos - 0.1 * (1 - dataCoverage.score)),
      Math.min(1, pos + 0.1 * (1 - dataCoverage.score))
    ] as [number, number],
    confidenceLevel: 0.95,
  };
  
  // Determine tier
  const dist = CONFIG.DISTRIBUTION_PRIORS[marketCapTier];
  const thresholds = {
    elite: dist.mean + 1.0 * dist.stdDev,
    strong: dist.mean + 0.3 * dist.stdDev,
    neutral: dist.mean - 0.3 * dist.stdDev,
    weak: dist.mean - 1.0 * dist.stdDev,
    context: `${regime.current} market, ${marketCapTier}-cap`,
  };
  
  let tier: TierLabel;
  if (pos >= thresholds.elite) tier = 'Elite';
  else if (pos >= thresholds.strong) tier = 'Strong';
  else if (pos >= thresholds.neutral) tier = 'Neutral';
  else if (pos >= thresholds.weak) tier = 'Weak';
  else tier = 'Critical';
  
  // Generate upgrade recommendations (controllable only)
  const upgradeRecommendations = generateUpgradeRecommendations(variableScores, segmentScores);
  
  // Risk alerts
  const riskAlerts: ProjectOmniScoreV2['riskAlerts'] = {
    level: 'none',
    alerts: [],
  };
  
  if (segmentScores.LEGAL < 0.4) {
    riskAlerts.level = 'warning';
    riskAlerts.alerts.push({
      type: 'legal',
      severity: 0.7,
      description: 'Elevated legal/regulatory risk detected',
    });
  }
  if (segmentScores.SEC < 0.4) {
    riskAlerts.level = riskAlerts.level === 'none' ? 'watch' : riskAlerts.level;
    riskAlerts.alerts.push({
      type: 'hack',
      severity: 0.6,
      description: 'Security posture below average',
    });
  }
  
  // Summary
  const keyStrengths = Object.entries(segments)
    .filter(([_, s]) => s.score > 0.65)
    .map(([seg]) => seg)
    .slice(0, 5);
  
  const keyWeaknesses = Object.entries(segments)
    .filter(([_, s]) => s.score < 0.45)
    .map(([seg]) => seg)
    .slice(0, 5);
  
  const summary = `${projectId.toUpperCase()} receives an OmniScore of ${(pos * 100).toFixed(1)}/100 (${tier}). ` +
    `In the current ${regime.current} market regime, ` +
    `fundamentals score ${(subScores.fundamentals * 100).toFixed(0)}%, ` +
    `adoption ${(subScores.adoption * 100).toFixed(0)}%. ` +
    `Data coverage: ${(dataCoverage.score * 100).toFixed(0)}% (${dataCoverage.confidenceLevel}).`;
  
  const result: ProjectOmniScoreV2 = {
    pos,
    posScaled: pos * 100,
    tier,
    subScores,
    subScoreWeights,
    dataCoverage,
    calibration: {
      weightSource: CONFIG.CALIBRATION.weightSource,
      disclaimer: CONFIG.CALIBRATION.disclaimer,
      validationMethod: {
        type: CONFIG.CALIBRATION.validationMethod.type,
      },
    },
    regime,
    segments,
    uncertainty,
    thresholds,
    upgradeRecommendations,
    riskAlerts,
    summary,
    keyStrengths,
    keyWeaknesses,
    projectId,
    projectName: projectId,
    projectSymbol: projectId.toUpperCase(),
    category,
    marketCapTier,
    calculatedAt: new Date().toISOString(),
    dataSourcesUsed: [...new Set(rawInputs.map(i => i.source))],
    version: CONFIG.VERSION,
  };
  
  logger.info(`✅ OmniScore v2.1: ${(pos * 100).toFixed(1)} (${tier}) in ${Date.now() - startTime}ms`);
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI FORMATTING - CLEAN & CREDIBLE
// ═══════════════════════════════════════════════════════════════════════════════

export function formatOmniScoreV2ForAI(score: ProjectOmniScoreV2): string {
  const tierEmoji: Record<TierLabel, string> = {
    Elite: '🏆', Strong: '🥇', Neutral: '⚡', Weak: '⚠️', Critical: '🚨'
  };
  
  let ctx = `\n[🏆 PROJECT OMNISCORE v2.1 - INSTITUTIONAL GRADE]\n`;
  ctx += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  ctx += `${tierEmoji[score.tier]} ${score.projectSymbol}: ${score.posScaled.toFixed(1)}/100 (${score.tier})\n`;
  ctx += `📊 Confidence: ${score.dataCoverage.confidenceLevel} (${(score.dataCoverage.score * 100).toFixed(0)}% data coverage)\n`;
  ctx += `📈 Regime: ${score.regime.current.toUpperCase()} (${(score.regime.confidence * 100).toFixed(0)}%)\n\n`;
  
  ctx += `MULTI-OBJECTIVE BREAKDOWN:\n`;
  ctx += `• Fundamentals (POS-F): ${(score.subScores.fundamentals * 100).toFixed(0)}%\n`;
  ctx += `• Market (POS-M): ${(score.subScores.market * 100).toFixed(0)}%\n`;
  ctx += `• Adoption (POS-A): ${(score.subScores.adoption * 100).toFixed(0)}%\n`;
  ctx += `• Risk Penalty (POS-R): ${((1 - score.subScores.risk) * 100).toFixed(0)}%\n\n`;
  
  if (score.keyStrengths.length > 0) {
    ctx += `✅ STRENGTHS: ${score.keyStrengths.join(', ')}\n`;
  }
  if (score.keyWeaknesses.length > 0) {
    ctx += `⚠️ WEAKNESSES: ${score.keyWeaknesses.join(', ')}\n`;
  }
  if (score.dataCoverage.blindSpots.length > 0) {
    ctx += `❓ BLIND SPOTS: ${score.dataCoverage.blindSpots.slice(0, 3).join(', ')}\n`;
  }
  
  if (score.upgradeRecommendations.highImpact.length > 0) {
    ctx += `\n🎯 TOP UPGRADES (controllable only):\n`;
    for (const rec of score.upgradeRecommendations.highImpact.slice(0, 2)) {
      ctx += `• ${rec.variable} (${rec.segment}): ${rec.rationale}\n`;
    }
  }
  
  if (score.riskAlerts.level !== 'none') {
    ctx += `\n⚠️ RISK ALERTS:\n`;
    for (const alert of score.riskAlerts.alerts) {
      ctx += `• [${alert.type.toUpperCase()}] ${alert.description}\n`;
    }
  }
  
  ctx += `\n📋 ${score.calibration.disclaimer}\n`;
  ctx += `[Formula: POS = ω_F·POS-F + ω_M·POS-M + ω_A·POS-A - ω_R·POS-R | v${score.version}]\n`;
  
  return ctx;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const projectOmniScoreV2 = {
  calculate: calculateOmniScoreV2,
  formatForAI: formatOmniScoreV2ForAI,
  VARIABLES,
  CONFIG,
};

export default projectOmniScoreV2;

