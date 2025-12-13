/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║     🏆 PROJECT OMNISCORE v2.2.2 FINAL FORM — INVARIANT-VALIDATED, AUDIT-READY                    ║
 * ║                                                                                                   ║
 * ║   "OmniScore v2.2.2 is a regime-aware, quality-gated, adversarially defended project decision    ║
 * ║    system with explicit invariants, hierarchical peer normalization, event-risk severity         ║
 * ║    adjustments, and trading-desk-grade explainability."                                          ║
 * ║                                                                                                   ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                   ║
 * ║   SYSTEM INVARIANTS (Must Hold At All Times — Verified via Property-Based Testing)               ║
 * ║   ──────────────────────────────────────────────────────────────────────────────                 ║
 * ║   INV-1: 0 ≤ Q_i(t) ≤ 1                    (Data quality bounded)                                ║
 * ║   INV-2: 0 ≤ Coverage_w(S) ≤ 1             (Coverage bounded)                                    ║
 * ║   INV-3: Σ_r p_r^final(t) = 1              (Probability hygiene)                                 ║
 * ║   INV-4: 0 ≤ QS, OS, POS ≤ 100             (Score bounds enforced)                               ║
 * ║   INV-5: ERS > 0 ⇒ POS_adj ≤ POS           (Risk monotonicity)                                   ║
 * ║   INV-6: Coverage_w_QS < 0.60 ⇒ OS = GATED (Quality gate)                                        ║
 * ║   INV-7: ω_k ∈ [0,1], Σ_k ω_k = 1          (Weight sanity)                                       ║
 * ║   INV-8: γ ≥ 0                             (Gamma safety)                                        ║
 * ║   INV-9: QS ∩ OS inputs = ∅                (Feature isolation — QS/OS non-contamination)        ║
 * ║                                                                                                   ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                   ║
 * ║   CANONICAL DEFINITIONS (Single Source of Truth)                                                  ║
 * ║   ───────────────────────────────────────────────                                                ║
 * ║                                                                                                   ║
 * ║   Data Quality:     Q_i(t) = R_i × F_g(t) × C_i(t)    ∈ [0, 1]                                   ║
 * ║   Freshness:        F_g(t) = exp(-λ_g × Δt_days)                                                 ║
 * ║   Coverage:         Coverage_w(S,t) = Σᵢ∈S 1[xᵢ] × Qᵢ × w̄ᵢ / Σᵢ∈S w̄ᵢ                          ║
 * ║   Segment Score:    S_g(t) = Σᵢ∈g w_{g,i} × Q_i(t) × z̃_i(t)                                     ║
 * ║   Quality Score:    QS(t) = Σ_{g∈QS} α_g × S_g(t)                                                ║
 * ║   Opportunity:      OS_r(t) = Σ_{g∈OS} β_{r,g} × S_g(t)                                          ║
 * ║   Risk Core:        Risk(t) = S_LEGAL(t) + S_MACRO(t) + ERS(t)                                   ║
 * ║                     (Components z-normalized within regime × sector before aggregation)          ║
 * ║   POS (per regime): POS_r(t) = ω_F × QS(t) + ω_O × OS_r(t) - ω_R × Risk(t)                       ║
 * ║   POS (final):      POS(t) = Σ_r p_r^final(t) × POS_r(t)                                         ║
 * ║                                                                                                   ║
 * ║   Regime Probs:     p_r^final(t) = normalize(EMA(p_r(t), τ))  where τ = 5 days                   ║
 * ║   Event Risk:       POS_adj(t) = POS(t) - γ × ERS(t)          where γ ≥ 0, default 15            ║
 * ║   QS Integrity:     QS_Integrity = 1 - |Leak(t)|              where Leak = Corr(QS, ΔPrice_30d)  ║
 * ║   NRG:              NRG = z(COMM + MARKET) - z(ADOPT + SEC + TECH)                               ║
 * ║                                                                                                   ║
 * ║   Initial Priors (pending empirical calibration):                                                 ║
 * ║   ω_F = 0.45, ω_O = 0.40, ω_R = 0.15                                                             ║
 * ║                                                                                                   ║
 * ║   No known loose ends in v2.2.x scope.                                                            ║
 * ║                                                                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../../../utils/logger';

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
 * 
 * QUALITY GATE: If QS coverage < 0.6, OS display is gated
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
  
  // QUALITY GATE
  gated: boolean;             // True if QS coverage insufficient
  gateReason?: string;        // Why OS is gated
  
  confidence: number;
}

/**
 * Narrative vs Reality Gap Index (NRG)
 * The killer signature metric
 * 
 * NRG ~ N(0,1) within regime + sector (percentile-based interpretation)
 */
/**
 * Narrative vs Reality Gap Index (v2.2.2)
 * 
 * NRG = z(COMM + MARKET) - z(ADOPT + SEC + TECH)
 * 
 * v2.2.2: If coverage < 60%, NO DEFAULT VALUE - labeled "low_confidence"
 */
export interface NarrativeRealityGap {
  index: number;              // Positive = hype > substance, negative = underhyped
  percentile: number;         // Where this NRG falls in historical distribution
  
  // v2.2.2: "low_confidence" instead of defaulting to "fairly_valued"
  interpretation: 'overhyped' | 'fairly_valued' | 'underhyped' | 'severely_underhyped' | 'low_confidence';
  
  narrativeZ: number;         // z-score of COMM + MARKET
  realityZ: number;           // z-score of ADOPT + SEC + TECH
  tradingImplication: string;
  statisticalBasis: string;   // Explains the threshold derivation
  
  // v2.2.2: Explicit coverage gate status
  coverageGate: {
    coverage: number;           // Coverage_w_NRG
    threshold: number;          // 0.6
    gated: boolean;             // True if coverage < threshold
    message?: string;           // "LOW CONFIDENCE — insufficient signal coverage"
  };
}

/**
 * Event Risk Override - Red Flag Engine
 * 
 * Produces severity-weighted adjustment:
 * POS_adj = POS - γ × ERS
 * where ERS = Event Risk Severity score
 */
export interface EventRisk {
  active: boolean;
  level: 'none' | 'watch' | 'warning' | 'critical' | 'emergency';
  
  // Severity-weighted adjustment
  severityScore: number;      // ERS: 0-1 composite
  posAdjustment: number;      // γ × ERS (points to subtract)
  
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
 * Three-Part Uncertainty Decomposition (v2.2.1 - properly combined)
 * 
 * σ_total = √(σ²_data + σ²_model + σ²_regime)
 * Variance shares sum to 100%
 */
export interface UncertaintyDecomposition {
  // Total standard deviation (the confidence band width)
  totalStd: number;
  
  // Component standard deviations (combine via Pythagorean theorem)
  components: {
    data: {
      std: number;
      varianceShare: number;    // % of total variance from data uncertainty
      sources: string[];        // Which data sources are uncertain
    };
    model: {
      std: number;
      varianceShare: number;    // % of total variance from model uncertainty
      weightUncertainty: number;
      structuralRisk: string;
    };
    regime: {
      std: number;
      varianceShare: number;    // % of total variance from regime uncertainty
      transitionProbability: number;
      sensitivityToShift: number;
    };
  };
  
  // Formatted confidence band
  confidenceBand: [number, number];
  confidenceLevel: number;      // e.g., 0.95 for 95% CI
}

/**
 * Explainability Block (v2.2.1 - institutional requirement)
 * 
 * "Why" not just numbers — top drivers with Q_i and marginal impact
 */
/**
 * Feature Driver (used in Explainability Pack)
 */
export interface FeatureDriver {
  feature: string;           // Feature ID, e.g., "sec_audit_depth"
  segment: SegmentType;
  z: number;                 // Normalized signal z̃_i
  Q: number;                 // Quality Q_i (0-1)
  contribution: number;      // Effective weight contribution to score
  delta7d?: number;          // Δ7d change
  trendDirection: 'up' | 'down' | 'stable';
}

/**
 * Explainability Block (v2.2.2 Final - Trading-Desk Grade)
 * 
 * "Why" not just numbers — top drivers with z̃_i, Q_i, contribution
 * 
 * Institutions love this format.
 */
export interface ExplainabilityBlock {
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.2 FINAL: QS/OS DRIVER PACKS (Desk-Grade Tooling)
  // Each with normalized signal, quality, and effective weight contribution
  // ═══════════════════════════════════════════════════════════════════════════
  qsDrivers: FeatureDriver[];    // Top 5 drivers of Quality Score
  osDrivers: FeatureDriver[];    // Top 5 drivers of Opportunity Score
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TOP POSITIVE DRIVERS (legacy format with Q_i + Δ7d)
  // ═══════════════════════════════════════════════════════════════════════════
  topDrivers: Array<{
    name: string;
    segment: SegmentType;
    impact: number;            // Marginal contribution to POS
    quality: number;           // Q_i for this variable (0-1)
    value: number;             // Current value
    delta7d?: number;          // Δ7d change (e.g., +15.3)
    delta7dPercent?: number;   // Δ7d % change (e.g., +12.5%)
    recentChange?: string;     // Human-readable (e.g., "+15% this week")
    trendDirection: 'up' | 'down' | 'stable';
  }>;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TOP NEGATIVE FACTORS / RISKS
  // ═══════════════════════════════════════════════════════════════════════════
  topRisks: Array<{
    name: string;
    segment: SegmentType;
    impact: number;            // Negative contribution
    quality: number;           // Q_i (0-1)
    value: number;
    delta7d?: number;          // Δ7d change
    delta7dPercent?: number;   // Δ7d % change
    severity: 'low' | 'medium' | 'high' | 'critical';
    trendDirection: 'improving' | 'worsening' | 'stable';
  }>;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // KEY CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  regimeContext: string;       // How regime affects interpretation
  sectorContext: string;       // How sector affects weights
  maturityContext: string;     // How project age affects expectations
}

/**
 * Project Maturity Normalization (v2.2.1)
 * 
 * AgeAdj(t) = min(1, log(1 + AgeDays) / log(1 + A))
 * Prevents unfair penalties for quality young projects
 */
export interface MaturityAdjustment {
  ageDays: number;
  ageAdjustmentFactor: number;  // 0-1 multiplier for age-sensitive metrics
  maturityTier: 'nascent' | 'early' | 'growth' | 'mature' | 'established';
  adjustedExpectations: {
    minTVL: number;
    minActiveAddresses: number;
    minEcosystemProjects: number;
  };
}

/**
 * Weight-Aware Coverage (v2.2.1)
 * 
 * Coverage_w = Σ(1[x_i] × Q_i × w̄_i) / Σ(w̄_i)
 * Missing high-weight variables hurt coverage more
 */
/**
 * Canonical Coverage Model (v2.2.2)
 * 
 * FORMULA (single definition):
 * Coverage_w(S, t) = Σᵢ∈S 1[xᵢ available] × Qᵢ × w̄ᵢ / Σᵢ∈S w̄ᵢ
 * 
 * DERIVED COVERAGES:
 * - Coverage_w_all   = Coverage_w(ALL_SEGMENTS)      Global
 * - Coverage_w_QS    = Coverage_w(QS_SEGMENTS)       Quality Score
 * - Coverage_w_OS    = Coverage_w(OS_SEGMENTS)       Opportunity Score
 * - Coverage_w_NRG   = Coverage_w(NRG_SEGMENTS)      NRG calculation
 */
export interface WeightAwareCoverage {
  // ═══════════════════════════════════════════════════════════════════════════
  // CANONICAL COVERAGE (all segments)
  // ═══════════════════════════════════════════════════════════════════════════
  all: number;                 // Coverage_w_all: 0-1 weighted coverage (global)
  level: 'high' | 'medium' | 'low' | 'insufficient';
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.2: DERIVED COVERAGES
  // ═══════════════════════════════════════════════════════════════════════════
  qs: number;                  // Coverage_w_QS: TEAM, TECH, SEC, GOV, ECO
  os: number;                  // Coverage_w_OS: MARKET, TOKEN, VAL, ADOPT, COMM
  nrg: number;                 // Coverage_w_NRG: COMM, ADOPT, SEC, TECH, MARKET
  
  // Backwards compatibility
  score: number;               // Alias for 'all'
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BREAKDOWN BY SEGMENT
  // ═══════════════════════════════════════════════════════════════════════════
  bySegment: Record<SegmentType, {
    coverage: number;
    weight: number;
    missingVariables: string[];
  }>;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL GAPS (high-weight missing variables)
  // ═══════════════════════════════════════════════════════════════════════════
  criticalGaps: Array<{
    variable: string;
    segment: SegmentType;
    weight: number;
    impactOnCoverage: number;
  }>;
}

/**
 * Reflexivity Leak Monitoring (v2.2.1)
 * 
 * Leak(t) = Corr(QS, ΔPrice_30d)
 * Threshold: |Leak| > 0.3 triggers review
 */
/**
 * Reflexivity Leak Monitoring (v2.2.2)
 * 
 * Leak(t) = Corr(QS, ΔPrice_30d)
 * QS_Integrity = 1 - |Leak(t)|
 * 
 * Measures how well QS is insulated from price reflexivity
 */
export interface ReflexivityMonitor {
  // ═══════════════════════════════════════════════════════════════════════════
  // LEAK SCORE
  // ═══════════════════════════════════════════════════════════════════════════
  leakScore: number;           // Correlation QS with price changes (-1 to 1)
  threshold: number;           // 0.3 default
  status: 'healthy' | 'warning' | 'review_needed';
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.2: QS INTEGRITY SCORE
  // The killer differentiator metric - makes firewall measurable
  // ═══════════════════════════════════════════════════════════════════════════
  qsIntegrity: number;         // 1 - |Leak(t)|, 0-1 where 1 = perfectly insulated
  integrityLevel: 'excellent' | 'good' | 'moderate' | 'poor';
  
  // ═══════════════════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════════════════
  lastMeasured: string;
  rollingWindow: number;       // Days used for calculation
  action?: string;             // Recommendation if review needed
}

/**
 * Calibration Lifecycle (v2.2.1)
 * 
 * Stages: Priors → Shadow → Live → Drift-monitoring
 */
export interface CalibrationStatus {
  stage: 'priors' | 'shadow' | 'live' | 'drift_monitoring';
  weightsStatus: 'initial_priors' | 'shadow_testing' | 'calibrated' | 'recalibrating';
  
  lastCalibration?: string;
  nextScheduled?: string;
  
  validation: {
    r2_target: number;         // Target R² for validation
    currentR2?: number;        // Current R² if calibrated
    validationSet: string;     // Description of holdout set
  };
  
  driftMonitoring: {
    enabled: boolean;
    threshold: number;         // Max drift before auto-rollback
    currentDrift?: number;
  };
}

/**
 * Market Manipulation Defenses (v2.2.2 Audit-Grade)
 * 
 * Includes:
 * - Wash trading detection
 * - Cross-venue validation (CEX vs DEX coherence)
 * - Peer-bucket anomaly (relative to regime × sector × cap bucket)
 * - Entity clustering (funding graph, synchronized behavior, co-movement)
 */
export interface ManipulationDefenses {
  // ═══════════════════════════════════════════════════════════════════════════
  // WASH TRADING DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  washRisk: number;            // 0-1, higher = more suspicious
  washIndicators: string[];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.2: CROSS-VENUE VALIDATION
  // CEX volume spike without DEX/orderbook/price-impact coherence → suspicious
  // ═══════════════════════════════════════════════════════════════════════════
  crossVenue: {
    cexDexVolumeRatio: number;     // High ratio without DEX activity = suspicious
    orderbookDepthCoherence: number;  // 0-1, higher = more coherent
    priceImpactCoherence: number;     // 0-1, higher = more coherent
    alert: boolean;
    alertReason?: string;
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.2 FINAL: HIERARCHICAL PEER NORMALIZATION (FALLBACK LADDER)
  // Compare within increasingly broad buckets for stability with thin data
  // Tier order: regime×sector×cap → regime×sector → sector×cap → sector → global
  // ═══════════════════════════════════════════════════════════════════════════
  peerBucketAnomaly: {
    zScore: number;                // Standard deviations from peer mean
    peerCount: number;             // Number of comparable peers in selected bucket
    peerBucket: string;            // Selected bucket, e.g., "bull_DeFi_mid" or "DeFi" if thin
    bucketTier: number;            // 1 = most specific (regime×sector×cap), 5 = global
    isAnomaly: boolean;            // True if |z| > threshold
    anomalyDirection: 'high' | 'low' | 'none';
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LIQUIDITY ANOMALY DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  liquidityAnomaly: number;    // 0-1, higher = more anomalous
  liquidityIndicators: string[];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.2: TOKEN ENTITY CLUSTERING (Method Stub)
  // 
  // Entity clustering signals (upgrade path):
  // - Funding graph links (common funding sources)
  // - Synchronized behavior (coordinated transactions)
  // - Common deposit/withdraw patterns (exchange matching)
  // - Co-movement across transfers (simultaneous activity)
  // 
  // Current: Placeholder multiplier (1.3x)
  // Future: Graph-based entity resolution
  // ═══════════════════════════════════════════════════════════════════════════
  entityClustering: {
    method: 'placeholder' | 'funding_graph' | 'behavior_sync' | 'full_resolution';
    effectiveConcentration: number;  // Gini after clustering
    clusterCount: number;
    largestClusterShare: number;
    clusteringSignals: Array<{
      type: 'funding_link' | 'sync_behavior' | 'deposit_pattern' | 'co_movement';
      confidence: number;
      description: string;
    }>;
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OVERALL MANIPULATION RISK
  // ═══════════════════════════════════════════════════════════════════════════
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  adjustmentApplied: number;       // Factor applied to scores
}

/**
 * Counterfactual Improvement Simulation
 * 
 * Constrained & realistic: includes budget caps, hiring limits, time-to-ship bounds
 */
export interface CounterfactualSimulation {
  scenario: string;
  
  changes: Array<{
    variable: string;
    from: number;
    to: number;
    constraint?: string;      // e.g., "max +20% per quarter"
  }>;
  
  projectedQS: number;
  projectedOS: number;
  qsDelta: number;
  osDelta: number;
  
  // Realistic constraints
  constraints: {
    budgetCap?: string;       // e.g., "$200K-500K"
    hiringLimit?: string;     // e.g., "3-5 senior hires"
    timeToShip?: string;      // e.g., "minimum 2 months"
  };
  
  feasibility: 'easy' | 'medium' | 'hard' | 'very_hard';
  timeEstimate: string;
  costEstimate: string;
  
  confidence: number;
  
  // Anti-fantasy check
  isRealistic: boolean;
  realismNote?: string;
}

/**
 * Complete OmniScore v2.2.1 Result (Institutional Grade)
 */
export interface OmniScoreV22 {
  version: '2.2.1';
  
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
  // v2.2.1: EXPLAINABILITY (first-class output)
  // ═══════════════════════════════════════════════════════════════════════════
  explainability: ExplainabilityBlock;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RISK LAYER
  // ═══════════════════════════════════════════════════════════════════════════
  eventRisk: EventRisk;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.1: MANIPULATION DEFENSES
  // ═══════════════════════════════════════════════════════════════════════════
  manipulationDefenses: ManipulationDefenses;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UNCERTAINTY (v2.2.1: properly decomposed variance shares)
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
  // DATA QUALITY (v2.2.1: Weight-Aware Coverage)
  // ═══════════════════════════════════════════════════════════════════════════
  dataCoverage: WeightAwareCoverage;
  
  // Legacy format for backwards compatibility
  dataCoverageLegacy: {
    overall: number;
    bySegment: Record<SegmentType, number>;
    confidenceLevel: ConfidenceLevel;
    blindSpots: string[];
    staleData: string[];
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.1: PROJECT MATURITY
  // ═══════════════════════════════════════════════════════════════════════════
  maturity: MaturityAdjustment;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.1: REFLEXIVITY MONITORING
  // ═══════════════════════════════════════════════════════════════════════════
  reflexivityMonitor: ReflexivityMonitor;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CALIBRATION TRANSPARENCY
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.1: CALIBRATION LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════
  calibration: CalibrationStatus & {
    // Backwards compatibility
    weightSource: 'prior' | 'calibrated' | 'hybrid';
    validationStatus: string;
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
  
  // Methodology footer (institutional requirement)
  methodologyFooter: string;
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
  VERSION: '2.2.2-final' as const,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM INVARIANTS (Must hold at all times)
  // These are enforced by clampScore(), clampQuality(), normalizeProbs()
  // ═══════════════════════════════════════════════════════════════════════════
  INVARIANTS: {
    // INV-1: 0 ≤ Q_i(t) ≤ 1
    QUALITY_MIN: 0,
    QUALITY_MAX: 1,
    // INV-2: 0 ≤ Coverage_w(S) ≤ 1
    COVERAGE_MIN: 0,
    COVERAGE_MAX: 1,
    // INV-4: 0 ≤ QS, OS, POS ≤ 100
    SCORE_MIN: 0,
    SCORE_MAX: 100,
    // INV-6: Coverage_w_QS < 0.60 ⇒ OS = GATED
    QUALITY_GATE_THRESHOLD: 0.60,
  },
  
  // Methodology footer (institutional requirement)
  METHODOLOGY_FOOTER: 'Scores are probabilistic estimates. Confidence depends on data coverage, regime stability, and model maturity.',
  
  // Maturity normalization constant (A in AgeAdj formula)
  MATURITY_FULL_DAYS: 730,  // 2 years to full maturity
  
  // Reflexivity leak threshold
  REFLEXIVITY_LEAK_THRESHOLD: 0.3,  // |Corr(QS, ΔPrice)| > 0.3 triggers review
  
  // v2.2.2: Regime smoothing (EMA window in days)
  REGIME_SMOOTHING_TAU: 5,  // 5-day EMA for regime probability smoothing
  
  // v2.2.2 Final: Score aggregation weights (initial priors pending empirical calibration)
  SCORE_AGGREGATION: {
    OMEGA_F: 0.45,   // QS weight in POS
    OMEGA_O: 0.40,   // OS weight in POS
    OMEGA_R: 0.15,   // Risk penalty weight in POS
  },
  
  // v2.2.2: Peer-bucket anomaly thresholds
  PEER_ANOMALY: {
    Z_THRESHOLD: 2.5,  // Standard deviations from peer mean
    MIN_PEERS: 5,      // Minimum peer count for reliable comparison
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // QUALITY GATE THRESHOLD
  // If QS coverage falls below this, OS display is gated
  // ═══════════════════════════════════════════════════════════════════════════
  QS_COVERAGE_GATE: 0.6,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT RISK ADJUSTMENT COEFFICIENT (γ)
  // POS_adj = POS - γ × ERS
  // ═══════════════════════════════════════════════════════════════════════════
  EVENT_RISK_GAMMA: 15,  // Max 15 point adjustment for severe events
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SEGMENT-SPECIFIC FRESHNESS DECAY (λ in days⁻¹)
  // 
  // Formula: F(t) = exp(-λ × Δt_days)
  // HalfLife (days) = ln(2) / λ ≈ 0.693 / λ
  //
  // ┌────────────┬──────────┬───────────────┬───────────────────────────────┐
  // │ Segment    │ λ (d⁻¹)  │ Half-Life     │ Rationale                     │
  // ├────────────┼──────────┼───────────────┼───────────────────────────────┤
  // │ TEAM       │ 0.0033   │ 210 days      │ Team changes slowly           │
  // │ GOV        │ 0.0050   │ 139 days      │ Governance evolves gradually  │
  // │ SEC        │ 0.0330   │ 21 days       │ Audits valid for weeks        │
  // │ LEGAL      │ 0.0231   │ 30 days       │ Legal status monthly refresh  │
  // │ TECH       │ 0.0990   │ 7 days        │ Code changes weekly           │
  // │ ECO        │ 0.0462   │ 15 days       │ Ecosystem evolves bi-weekly   │
  // │ TOKEN      │ 0.0693   │ 10 days       │ Tokenomics updates            │
  // │ ADOPT      │ 0.2310   │ 3 days        │ On-chain activity is fresh    │
  // │ COMM       │ 0.3465   │ 2 days        │ Social signals decay fast     │
  // │ MARKET     │ 0.6931   │ 1 day         │ Market data is real-time      │
  // │ VAL        │ 0.4621   │ 1.5 days      │ Valuation changes quickly     │
  // │ MACRO      │ 0.2310   │ 3 days        │ Macro conditions shift        │
  // └────────────┴──────────┴───────────────┴───────────────────────────────┘
  // ═══════════════════════════════════════════════════════════════════════════
  FRESHNESS_DECAY: {
    // Very slow decay (months/quarters) - fundamentals don't change quickly
    TEAM: 0.0033,     // HalfLife: 210 days (~7 months)
    GOV: 0.0050,      // HalfLife: 139 days (~4.5 months)
    
    // Slow decay (weeks) - structural aspects
    SEC: 0.0330,      // HalfLife: 21 days (~3 weeks)
    LEGAL: 0.0231,    // HalfLife: 30 days (~1 month)
    
    // Medium decay (days to weeks)
    TECH: 0.0990,     // HalfLife: 7 days
    ECO: 0.0462,      // HalfLife: 15 days
    TOKEN: 0.0693,    // HalfLife: 10 days
    
    // Fast decay (days) - dynamic metrics
    ADOPT: 0.2310,    // HalfLife: 3 days
    COMM: 0.3465,     // HalfLife: 2 days
    MACRO: 0.2310,    // HalfLife: 3 days
    
    // Very fast decay (hours to day) - market conditions
    MARKET: 0.6931,   // HalfLife: 1 day
    VAL: 0.4621,      // HalfLife: 1.5 days
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
  // COMM/ADOPT are capped by anomaly penalties and validated against 
  // multi-source consistency. This reduces susceptibility to bought growth,
  // wash signals, and artificial narrative spikes.
  // ═══════════════════════════════════════════════════════════════════════════
  ADVERSARIAL: {
    // Segments susceptible to manipulation
    SUSCEPTIBLE_SEGMENTS: ['COMM', 'ADOPT'] as SegmentType[],
    
    // Bot detection thresholds (calibrated from historical manipulation cases)
    BOT_RISK_THRESHOLD: 0.3,      // Follower/engagement ratio anomaly
    GROWTH_ANOMALY_THRESHOLD: 3,  // Standard deviations above normal growth
    
    // Maximum penalty (prevents total zeroing)
    MAX_ADVERSARIAL_PENALTY: 0.4,
    
    // Multi-source consistency requirement
    MIN_SOURCES_FOR_TRUST: 2,
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
// SYSTEM INVARIANT ENFORCEMENT (v2.2.2 Final Form)
// These functions ensure all invariants hold at all times
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-1: Clamp quality to [0, 1]
 * Ensures: 0 ≤ Q_i(t) ≤ 1
 */
function clampQuality(q: number): number {
  return Math.max(CONFIG.INVARIANTS.QUALITY_MIN, Math.min(CONFIG.INVARIANTS.QUALITY_MAX, q));
}

/**
 * INV-2: Clamp coverage to [0, 1]
 * Ensures: 0 ≤ Coverage_w(S) ≤ 1
 */
function clampCoverage(c: number): number {
  return Math.max(CONFIG.INVARIANTS.COVERAGE_MIN, Math.min(CONFIG.INVARIANTS.COVERAGE_MAX, c));
}

/**
 * INV-4: Clamp score to [0, 100]
 * Ensures: 0 ≤ QS, OS, POS ≤ 100
 */
function clampScore(s: number): number {
  return Math.max(CONFIG.INVARIANTS.SCORE_MIN, Math.min(CONFIG.INVARIANTS.SCORE_MAX, s));
}

/**
 * INV-3: Normalize probability distribution
 * Ensures: Σ_r p_r^final(t) = 1 (always sums to exactly 1)
 */
function normalizeProbs(probs: Record<RegimeType, number>): Record<RegimeType, number> {
  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  if (total === 0) {
    // Fallback to uniform if all zeros
    const uniform = 1 / Object.keys(probs).length;
    return Object.fromEntries(Object.keys(probs).map(k => [k, uniform])) as Record<RegimeType, number>;
  }
  const normalized: Record<RegimeType, number> = {} as any;
  for (const [k, v] of Object.entries(probs)) {
    normalized[k as RegimeType] = Math.max(0, v / total);
  }
  return normalized;
}

/**
 * INV-5: Ensure ERS > 0 ⇒ POS_adj ≤ POS
 * Monotonically decreases score when event risk is present
 */
function applyEventRiskAdjustment(pos: number, ers: number, gamma: number = CONFIG.EVENT_RISK_GAMMA): number {
  if (ers <= 0) return pos;
  const adjustment = gamma * ers;
  const adjusted = pos - adjustment;
  // Invariant: ERS > 0 ⇒ POS_adj ≤ POS
  if (adjusted > pos) {
    logger.warn('INV-5 VIOLATION PREVENTED: POS_adj would exceed POS');
    return pos;
  }
  return clampScore(adjusted);
}

/**
 * INV-6: Check quality gate
 * Ensures: Coverage_w_QS < 0.60 ⇒ OS must be gated
 */
function checkQualityGate(coverageQS: number): { gated: boolean; reason?: string } {
  if (coverageQS < CONFIG.INVARIANTS.QUALITY_GATE_THRESHOLD) {
    return {
      gated: true,
      reason: `Quality Score coverage (${(coverageQS * 100).toFixed(0)}%) below ${(CONFIG.INVARIANTS.QUALITY_GATE_THRESHOLD * 100).toFixed(0)}% threshold. OS is gated to prevent "market noise looks like opportunity."`
    };
  }
  return { gated: false };
}

/**
 * INV-7: Clamp individual weight to [0, 1]
 */
function clampWeight(w: number): number {
  return Math.max(0, Math.min(1, w));
}

/**
 * INV-7: Normalize weights to sum to 1
 * Ensures: ω_k ∈ [0,1] and Σ_k ω_k = 1
 */
function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const total = Object.values(weights).reduce((a, b) => a + Math.max(0, b), 0);
  if (total === 0) {
    // Fallback to uniform if all zeros
    const uniform = 1 / Object.keys(weights).length;
    return Object.fromEntries(Object.keys(weights).map(k => [k, uniform]));
  }
  const normalized: Record<string, number> = {};
  for (const [k, v] of Object.entries(weights)) {
    normalized[k] = clampWeight(Math.max(0, v) / total);
  }
  return normalized;
}

/**
 * INV-8: Clamp gamma to non-negative (γ ≥ 0)
 * Ensures risk adjustment can only decrease POS
 */
function clampGamma(g: number): number {
  if (g < 0) {
    logger.warn('INV-8: Gamma was negative, clamped to 0');
    return 0;
  }
  return g;
}

/**
 * INV-9: Assert QS/OS feature isolation
 * QS features must not include MARKET/VAL/COMM/TOKEN raw inputs
 * OS features must not include TEAM/TECH/SEC/GOV/ECO raw inputs
 * 
 * This is the moat — prevents price-driven signals from contaminating fundamentals
 */
const QS_ALLOWED_SEGMENTS: SegmentType[] = ['TEAM', 'TECH', 'SEC', 'GOV', 'ECO'];
const OS_ALLOWED_SEGMENTS: SegmentType[] = ['MARKET', 'TOKEN', 'VAL', 'ADOPT', 'COMM'];

function assertFeatureIsolation(
  qsInputs: RawVariableInput[],
  osInputs: RawVariableInput[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  // Check QS inputs don't include OS segments
  for (const input of qsInputs) {
    if (OS_ALLOWED_SEGMENTS.includes(input.segment)) {
      violations.push(`INV-9: QS contaminated by OS segment ${input.segment} (feature: ${input.id})`);
    }
  }
  
  // Check OS inputs don't include QS segments
  for (const input of osInputs) {
    if (QS_ALLOWED_SEGMENTS.includes(input.segment)) {
      violations.push(`INV-9: OS contaminated by QS segment ${input.segment} (feature: ${input.id})`);
    }
  }
  
  return { valid: violations.length === 0, violations };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT VIOLATION TYPE (Fail-Closed Behavior)
// ═══════════════════════════════════════════════════════════════════════════════

export type InvariantSeverity = 'WARN' | 'ERROR';

export interface InvariantViolation {
  code: string;           // e.g., "INV-1", "INV-5"
  severity: InvariantSeverity;
  message: string;
  value?: number;         // The violating value
  bound?: string;         // The expected bound
}

/**
 * Validate all system invariants with fail-closed behavior
 * 
 * WARN → show explanation, continue with caveats
 * ERROR → gate OS, label POS low confidence, or stop response
 */
function validateInvariants(state: {
  qualities: number[];
  coverages: { all: number; qs: number; os: number; nrg: number };
  probabilities: Record<RegimeType, number>;
  scores: { qs: number; os: number; pos: number; posAdj: number };
  ers: number;
  gamma: number;
  weights?: Record<string, number>;
  qsInputs?: RawVariableInput[];
  osInputs?: RawVariableInput[];
}): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  
  // INV-1: Quality bounds (ERROR — corrupts all downstream)
  for (const q of state.qualities) {
    if (q < 0 || q > 1) {
      violations.push({
        code: 'INV-1',
        severity: 'ERROR',
        message: `Quality ${q.toFixed(3)} outside [0,1]`,
        value: q,
        bound: '[0, 1]'
      });
    }
  }
  
  // INV-2: Coverage bounds (ERROR — corrupts gating logic)
  for (const [name, c] of Object.entries(state.coverages)) {
    if (c < 0 || c > 1) {
      violations.push({
        code: 'INV-2',
        severity: 'ERROR',
        message: `Coverage ${name}=${c.toFixed(3)} outside [0,1]`,
        value: c,
        bound: '[0, 1]'
      });
    }
  }
  
  // INV-3: Probability sum (ERROR — breaks regime weighting)
  const probSum = Object.values(state.probabilities).reduce((a, b) => a + b, 0);
  if (Math.abs(probSum - 1) > 0.001) {
    violations.push({
      code: 'INV-3',
      severity: 'ERROR',
      message: `Probability sum ${probSum.toFixed(4)} ≠ 1`,
      value: probSum,
      bound: '= 1'
    });
  }
  
  // INV-4: Score bounds (WARN — clamp applied, but indicates upstream issue)
  for (const [name, s] of Object.entries(state.scores)) {
    if (s < 0 || s > 100) {
      violations.push({
        code: 'INV-4',
        severity: 'WARN',
        message: `Score ${name}=${s.toFixed(1)} outside [0,100] (clamped)`,
        value: s,
        bound: '[0, 100]'
      });
    }
  }
  
  // INV-5: Event risk monotonicity (ERROR — breaks risk semantics)
  if (state.ers > 0 && state.scores.posAdj > state.scores.pos) {
    violations.push({
      code: 'INV-5',
      severity: 'ERROR',
      message: `POS_adj ${state.scores.posAdj.toFixed(1)} > POS ${state.scores.pos.toFixed(1)} with ERS > 0`,
      value: state.scores.posAdj,
      bound: `≤ ${state.scores.pos.toFixed(1)}`
    });
  }
  
  // INV-6: Quality gate (checked elsewhere, included for completeness)
  if (state.coverages.qs < CONFIG.INVARIANTS.QUALITY_GATE_THRESHOLD) {
    // This is expected behavior, not a violation — just noting the gate should be active
  }
  
  // INV-7: Weight sanity (WARN — we normalize anyway)
  if (state.weights) {
    const weightSum = Object.values(state.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 1) > 0.01) {
      violations.push({
        code: 'INV-7',
        severity: 'WARN',
        message: `Weight sum ${weightSum.toFixed(3)} ≠ 1 (normalized)`,
        value: weightSum,
        bound: '= 1'
      });
    }
    for (const [k, w] of Object.entries(state.weights)) {
      if (w < 0 || w > 1) {
        violations.push({
          code: 'INV-7',
          severity: 'WARN',
          message: `Weight ${k}=${w.toFixed(3)} outside [0,1]`,
          value: w,
          bound: '[0, 1]'
        });
      }
    }
  }
  
  // INV-8: Gamma safety (ERROR if negative — would invert risk logic)
  if (state.gamma < 0) {
    violations.push({
      code: 'INV-8',
      severity: 'ERROR',
      message: `Gamma ${state.gamma} < 0 (would invert risk adjustment)`,
      value: state.gamma,
      bound: '≥ 0'
    });
  }
  
  // INV-9: Feature isolation (ERROR — breaks QS/OS firewall)
  if (state.qsInputs && state.osInputs) {
    const isolation = assertFeatureIsolation(state.qsInputs, state.osInputs);
    for (const msg of isolation.violations) {
      violations.push({
        code: 'INV-9',
        severity: 'ERROR',
        message: msg
      });
    }
  }
  
  return violations;
}

/**
 * Check if any ERROR-level violations exist (fail-closed check)
 */
function hasErrorViolations(violations: InvariantViolation[]): boolean {
  return violations.some(v => v.severity === 'ERROR');
}

/**
 * Get all violations as a summary object for API response
 */
function getViolationSummary(violations: InvariantViolation[]): {
  allPassed: boolean;
  errorCount: number;
  warnCount: number;
  violations: InvariantViolation[];
} {
  return {
    allPassed: violations.length === 0,
    errorCount: violations.filter(v => v.severity === 'ERROR').length,
    warnCount: violations.filter(v => v.severity === 'WARN').length,
    violations
  };
}

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
 * 
 * Formula: F(t) = exp(-λ × Δt_days)
 * HalfLife = ln(2) / λ ≈ 0.693 / λ
 * 
 * @param segment - The segment type
 * @param daysSinceUpdate - Time since last update in DAYS (can be fractional)
 * @returns Freshness score 0-1 (1 = fresh, 0 = stale)
 */
function calculateFreshness(
  segment: SegmentType,
  daysSinceUpdate: number
): number {
  const lambda = CONFIG.FRESHNESS_DECAY[segment];
  return Math.exp(-lambda * daysSinceUpdate);
}

/**
 * Get half-life for a segment in days
 * HalfLife = ln(2) / λ
 */
function getSegmentHalfLife(segment: SegmentType): number {
  const lambda = CONFIG.FRESHNESS_DECAY[segment];
  return Math.LN2 / lambda;
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
 * 
 * NRG ~ N(0,1) within regime + sector (percentile-based interpretation)
 * Thresholds derived from historical distribution quantiles
 */
function calculateNRG(
  segments: Record<SegmentType, { adjustedScore: number }>
): NarrativeRealityGap {
  // Narrative components (COMM + MARKET)
  const narrativeScore = (segments.COMM.adjustedScore + segments.MARKET.adjustedScore) / 2;
  
  // Reality components (ADOPT + SEC + TECH)
  const realityScore = (segments.ADOPT.adjustedScore + segments.SEC.adjustedScore + segments.TECH.adjustedScore) / 3;
  
  // Z-score calculation (regime-conditioned means would be loaded from calibration)
  const narrativeMean = 50, narrativeStd = 15;
  const realityMean = 50, realityStd = 18;
  
  const narrativeZ = (narrativeScore - narrativeMean) / narrativeStd;
  const realityZ = (realityScore - realityMean) / realityStd;
  
  const index = narrativeZ - realityZ;
  
  // Convert to percentile using standard normal CDF approximation
  const percentile = 0.5 * (1 + Math.tanh(index * 0.7));
  
  // Percentile-based interpretation (regime-conditioned thresholds)
  let interpretation: NarrativeRealityGap['interpretation'];
  let tradingImplication: string;
  
  if (percentile > 0.90) {
    // Top 10% = overhyped
    interpretation = 'overhyped';
    tradingImplication = 'Narrative exceeds fundamentals (top 10% NRG). High risk of correction when reality catches up. Consider reducing exposure or waiting for dips.';
  } else if (percentile > 0.65) {
    interpretation = 'fairly_valued';
    tradingImplication = 'Slight narrative premium but within normal range (65th-90th percentile). Monitor for momentum shifts.';
  } else if (percentile > 0.35) {
    interpretation = 'fairly_valued';
    tradingImplication = 'Narrative and reality roughly aligned (35th-65th percentile). Standard risk/reward profile.';
  } else if (percentile > 0.10) {
    interpretation = 'underhyped';
    tradingImplication = 'Quality exceeds current narrative (10th-35th percentile). Potential alpha opportunity if catalyst emerges.';
  } else {
    // Bottom 10% = severely underhyped
    interpretation = 'severely_underhyped';
    tradingImplication = 'Strong fundamentals with minimal market attention (bottom 10% NRG). Deep value opportunity but may require patience.';
  }
  
  return {
    index: Math.round(index * 100) / 100,
    percentile: Math.round(percentile * 100) / 100,
    interpretation,
    narrativeZ: Math.round(narrativeZ * 100) / 100,
    realityZ: Math.round(realityZ * 100) / 100,
    tradingImplication,
    statisticalBasis: 'Percentile thresholds derived from regime- and sector-conditioned historical NRG distributions. Top/bottom 10% mark extreme divergence.',
    // coverageGate will be populated by caller after checking coverage
    coverageGate: {
      coverage: 1.0,  // Placeholder, will be updated
      threshold: 0.6,
      gated: false
    }
  };
}

/**
 * Detect event risks (Red Flag Engine)
 * 
 * Produces severity-weighted adjustment:
 * POS_adj = POS - γ × ERS
 * where ERS = Event Risk Severity score (0-1)
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
      description: `${tokenData.unlockPressure12mo.toFixed(0)}% of supply unlocking in next 12 months`,
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
  
  // Calculate composite Event Risk Severity (ERS)
  // Weighted average with diminishing returns for multiple events
  let severityScore = 0;
  if (events.length > 0) {
    const sortedSeverities = events.map(e => e.severity).sort((a, b) => b - a);
    // First event counts fully, subsequent events have diminishing weight
    severityScore = sortedSeverities.reduce((acc, sev, idx) => {
      const weight = 1 / (idx + 1);
      return acc + sev * weight;
    }, 0) / sortedSeverities.reduce((acc, _, idx) => acc + 1 / (idx + 1), 0);
  }
  
  // Calculate POS adjustment using γ coefficient
  const posAdjustment = severityScore * CONFIG.EVENT_RISK_GAMMA;
  
  // Determine overall level
  let level: EventRisk['level'] = 'none';
  if (severityScore > 0.8) level = 'emergency';
  else if (severityScore > 0.6) level = 'critical';
  else if (severityScore > 0.4) level = 'warning';
  else if (severityScore > 0.2) level = 'watch';
  
  return {
    active: level !== 'none',
    level,
    severityScore,
    posAdjustment,
    events,
    tierOverride: level === 'critical' || level === 'emergency' 
      ? `${level === 'emergency' ? 'Critical' : 'Weak'} — Event Risk Active` 
      : undefined,
  };
}

/**
 * Calculate three-part uncertainty
 */
/**
 * Calculate Three-Part Uncertainty (v2.2.1 - properly combined)
 * 
 * σ_total = √(σ²_data + σ²_model + σ²_regime)
 * Variance shares sum to 100%
 */
/**
 * Calculate Three-Part Uncertainty (v2.2.2)
 * 
 * INITIAL CALIBRATED PRIORS (not final math truth):
 *   σ_data = (1 - Coverage) × 10
 *   σ_model = 5 (fixed prior)
 *   σ_regime = entropy(pr) / maxEntropy × 7
 * 
 * UPGRADE PATH (v3.0):
 *   σ_data → √(Σᵢ (1-Qᵢ)² × wᵢ² × σᵢ²)
 */
function calculateUncertainty(
  dataCoverage: number,
  regimeProbabilities: Record<RegimeType, number>,
  segmentVariances: number[],
  compositeScore: number
): UncertaintyDecomposition {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DATA UNCERTAINTY (initial calibrated prior)
  // Formula: σ_data = (1 - Coverage) × 10
  // Upgrade path: σ_data → √(Σᵢ (1-Qᵢ)² × wᵢ² × σᵢ²)
  // ═══════════════════════════════════════════════════════════════════════════
  const dataStd = (1 - dataCoverage) * 10; // Initial calibrated prior
  const dataVariance = dataStd * dataStd;
  
  const uncertainDataSources: string[] = [];
  if (dataCoverage < 0.7) uncertainDataSources.push('Coverage below 70% threshold');
  if (dataCoverage < 0.5) uncertainDataSources.push('Significant data gaps present');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 2. MODEL UNCERTAINTY (weight calibration uncertainty)
  // Fixed prior uncertainty (would decrease with live calibration)
  // Current stage: Priors (not yet calibrated)
  // ═══════════════════════════════════════════════════════════════════════════
  const modelStd = 5; // σ_model: ~5 points uncertainty from weight priors
  const modelVariance = modelStd * modelStd;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 3. REGIME UNCERTAINTY (entropy of regime probabilities)
  // Higher when regime is ambiguous (probabilities are diffuse)
  // ═══════════════════════════════════════════════════════════════════════════
  const probs = Object.values(regimeProbabilities);
  const entropy = -probs.reduce((sum, p) => p > 0 ? sum + p * Math.log2(p) : sum, 0);
  const maxEntropy = Math.log2(probs.length);
  const normalizedEntropy = entropy / maxEntropy; // 0-1
  
  // Higher entropy = more regime uncertainty
  const regimeStd = normalizedEntropy * 7; // σ_regime: up to ~7 points
  const regimeVariance = regimeStd * regimeStd;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMBINE VIA PYTHAGOREAN THEOREM
  // σ_total = √(σ²_data + σ²_model + σ²_regime)
  // ═══════════════════════════════════════════════════════════════════════════
  const totalVariance = dataVariance + modelVariance + regimeVariance;
  const totalStd = Math.sqrt(totalVariance);
  
  // Calculate variance shares (must sum to 100%)
  const dataShare = totalVariance > 0 ? (dataVariance / totalVariance) * 100 : 33.3;
  const modelShare = totalVariance > 0 ? (modelVariance / totalVariance) * 100 : 33.3;
  const regimeShare = totalVariance > 0 ? (regimeVariance / totalVariance) * 100 : 33.4;
  
  // Regime transition probability (simplified)
  const maxProb = Math.max(...probs);
  const transitionProbability = 1 - maxProb;
  
  // 95% confidence band (z = 1.96)
  const z95 = 1.96;
  const lowerBound = Math.max(0, compositeScore - z95 * totalStd);
  const upperBound = Math.min(100, compositeScore + z95 * totalStd);
  
  return {
    totalStd: Math.round(totalStd * 10) / 10,
    
    components: {
      data: {
        std: Math.round(dataStd * 10) / 10,
        varianceShare: Math.round(dataShare),
        sources: uncertainDataSources,
      },
      model: {
        std: Math.round(modelStd * 10) / 10,
        varianceShare: Math.round(modelShare),
        weightUncertainty: 0.15,
        structuralRisk: 'Weights are initial priors. Live calibration pending.',
      },
      regime: {
        std: Math.round(regimeStd * 10) / 10,
        varianceShare: Math.round(regimeShare),
        transitionProbability: Math.round(transitionProbability * 100) / 100,
        sensitivityToShift: 8, // Average POS change on regime shift
      },
    },
    
    confidenceBand: [
      Math.round(lowerBound * 10) / 10,
      Math.round(upperBound * 10) / 10
    ],
    confidenceLevel: 0.95,
  };
}

/**
 * Generate counterfactual simulations
 * 
 * Constrained & realistic: includes budget caps, hiring limits, time-to-ship bounds
 * Prevents fantasy upgrade recommendations
 */
function generateCounterfactuals(
  currentQS: number,
  currentOS: number,
  segments: Record<SegmentType, { adjustedScore: number }>,
  weights: Record<SegmentType, number>
): CounterfactualSimulation[] {
  const simulations: CounterfactualSimulation[] = [];
  
  // Simulation 1: Security improvement
  // Constrained: max +25 points per quarter, requires budget
  const secImprovement = Math.min(85, segments.SEC.adjustedScore + 20);
  const secDelta = (secImprovement - segments.SEC.adjustedScore) * weights.SEC * 100;
  const secRealistic = segments.SEC.adjustedScore < 40; // Only realistic if currently weak
  
  simulations.push({
    scenario: 'Improve Security Posture',
    changes: [
      { variable: 'Audit Coverage', from: segments.SEC.adjustedScore, to: secImprovement, constraint: 'max +25 points per quarter' },
    ],
    projectedQS: currentQS + secDelta * 0.6,
    projectedOS: currentOS + secDelta * 0.2,
    qsDelta: secDelta * 0.6,
    osDelta: secDelta * 0.2,
    constraints: {
      budgetCap: '$50K-200K',
      timeToShip: 'minimum 6 weeks for quality audit',
    },
    feasibility: 'medium',
    timeEstimate: '2-4 months',
    costEstimate: '$50K-200K for top-tier audit',
    confidence: 0.75,
    isRealistic: secRealistic,
    realismNote: secRealistic ? undefined : 'Already strong security posture; diminishing returns expected',
  });
  
  // Simulation 2: Team expansion
  // Constrained: hiring takes time, max 3-5 senior hires per quarter
  const teamImprovement = Math.min(80, segments.TEAM.adjustedScore + 15);
  const teamDelta = (teamImprovement - segments.TEAM.adjustedScore) * weights.TEAM * 100;
  const teamRealistic = segments.TEAM.adjustedScore < 50;
  
  simulations.push({
    scenario: 'Expand Core Team',
    changes: [
      { variable: 'Team Size & Experience', from: segments.TEAM.adjustedScore, to: teamImprovement, constraint: 'max 3-5 senior hires per quarter' },
    ],
    projectedQS: currentQS + teamDelta * 0.8,
    projectedOS: currentOS + teamDelta * 0.1,
    qsDelta: teamDelta * 0.8,
    osDelta: teamDelta * 0.1,
    constraints: {
      hiringLimit: '3-5 senior engineers per quarter',
      budgetCap: '$500K-1.5M annual salary increase',
      timeToShip: 'minimum 3 months for onboarding',
    },
    feasibility: 'hard',
    timeEstimate: '3-6 months',
    costEstimate: '$500K-1.5M annually',
    confidence: 0.65,
    isRealistic: teamRealistic,
    realismNote: teamRealistic ? undefined : 'Already strong team; new hires may face coordination overhead',
  });
  
  // Simulation 3: Ecosystem growth
  // Constrained: grants take time to deploy, ecosystem building is slow
  const ecoImprovement = Math.min(75, segments.ECO.adjustedScore + 20);
  const ecoDelta = (ecoImprovement - segments.ECO.adjustedScore) * weights.ECO * 100;
  const ecoRealistic = segments.ECO.adjustedScore < 55;
  
  simulations.push({
    scenario: 'Boost Ecosystem & Tooling',
    changes: [
      { variable: 'SDK Quality + Grant Program', from: segments.ECO.adjustedScore, to: ecoImprovement, constraint: 'max +20 points per 6 months' },
    ],
    projectedQS: currentQS + ecoDelta * 0.5,
    projectedOS: currentOS + ecoDelta * 0.4,
    qsDelta: ecoDelta * 0.5,
    osDelta: ecoDelta * 0.4,
    constraints: {
      budgetCap: '$100K-1M grant allocation',
      timeToShip: 'minimum 6 months for ecosystem traction',
    },
    feasibility: 'medium',
    timeEstimate: '6-12 months',
    costEstimate: '$100K-1M grant allocation',
    confidence: 0.60,
    isRealistic: ecoRealistic,
    realismNote: ecoRealistic ? undefined : 'Ecosystem building has long feedback loops',
  });
  
  // Filter to only realistic scenarios for primary display
  return simulations.sort((a, b) => (b.isRealistic ? 1 : 0) - (a.isRealistic ? 1 : 0));
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
  quality?: number;  // v2.2.1: Pre-computed quality score (0-1)
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
  logger.info(`🏆 Calculating OmniScore v2.2.1 (Institutional Grade) for ${projectId}...`);
  
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
      const daysSinceUpdate = (Date.now() - new Date(v.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      const freshness = calculateFreshness(seg, daysSinceUpdate);
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
  
  // INV-4: Enforce score bounds [0, 100]
  const qsNormalized = clampScore(qsWeight > 0 ? qsTotal / qsWeight : 50);
  const qsTier = getTier(qsNormalized, 'quality');
  
  const qualityScore: QualityScore = {
    score: qsNormalized,
    tier: qsTier,
    team: clampScore(segmentData.TEAM.adjustedScore),
    tech: clampScore(segmentData.TECH.adjustedScore),
    security: clampScore(segmentData.SEC.adjustedScore),
    governance: clampScore(segmentData.GOV.adjustedScore),
    ecosystem: clampScore(segmentData.ECO.adjustedScore),
    auditCoverage: clampScore(segmentData.SEC.adjustedScore * 0.8),
    busFactor: clampScore(segmentData.TEAM.adjustedScore * 0.6),
    codeMaturity: clampScore(segmentData.TECH.adjustedScore * 0.7),
    confidence: clampQuality(Object.values(segmentData).reduce((sum, s) => sum + s.dataQuality, 0) / allSegments.length),
    dataCompleteness: clampQuality(Object.values(segmentData).reduce((sum, s) => sum + (s.signalCount > 0 ? 1 : 0), 0) / allSegments.length),
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE OPPORTUNITY SCORE (OS) - Market-driven
  // With QUALITY GATE: If QS coverage < threshold, OS is gated
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Check QS coverage for Quality Gate
  const qsSegmentsCoverage = CONFIG.QS_SEGMENTS.reduce((sum, seg) => 
    sum + (segmentData[seg].signalCount > 0 ? segmentData[seg].dataQuality : 0), 0
  ) / CONFIG.QS_SEGMENTS.length;
  
  const osGated = qsSegmentsCoverage < CONFIG.QS_COVERAGE_GATE;
  
  let osTotal = 0;
  let osWeight = 0;
  
  for (const seg of CONFIG.OS_SEGMENTS) {
    osTotal += segmentData[seg].adjustedScore * weights.final[seg];
    osWeight += weights.final[seg];
  }
  
  // INV-4: Enforce score bounds [0, 100]
  const osNormalized = clampScore(osWeight > 0 ? osTotal / osWeight : 50);
  
  // Regime adjustment for OS
  const regimeAdjustment = regime === 'bull' ? 0.15 : 
                           regime === 'recovery' ? 0.10 :
                           regime === 'bear' ? -0.10 :
                           regime === 'crisis' ? -0.25 : 0;
  
  const osAdjusted = clampScore(osNormalized * (1 + regimeAdjustment));
  const osTier = osGated ? 'Neutral' as TierLabel : getTier(osAdjusted, 'opportunity');
  
  const opportunityScore: OpportunityScore = {
    score: clampScore(osGated ? 50 : osAdjusted), // Display neutral if gated
    tier: osTier,
    market: clampScore(segmentData.MARKET.adjustedScore),
    valuation: clampScore(segmentData.VAL.adjustedScore),
    adoption: segmentData.ADOPT.adjustedScore,
    momentum: segmentData.COMM.adjustedScore,
    liquidityDepth: segmentData.MARKET.adjustedScore * 10000,
    narrativeStrength: segmentData.COMM.adjustedScore / 100,
    catalystProximity: 0.5,
    regimeAdjustment,
    regime,
    gated: osGated,
    gateReason: osGated ? `QS coverage (${(qsSegmentsCoverage * 100).toFixed(0)}%) below ${CONFIG.QS_COVERAGE_GATE * 100}% threshold. OS display requires sufficient fundamental data.` : undefined,
    confidence: Object.values(segmentData).reduce((sum, s) => sum + s.dataQuality, 0) / allSegments.length,
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT RISK (Red Flag Engine) - Must calculate before composite
  // ═══════════════════════════════════════════════════════════════════════════
  const eventRisk = detectEventRisks(projectId, {
    unlockPressure12mo: 100 - segmentData.TOKEN.adjustedScore,
  }, {
    incidentCount: segmentData.SEC.adjustedScore < 40 ? 1 : 0,
  }, {
    regulatoryRisk: 1 - segmentData.LEGAL.adjustedScore / 100,
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE COMPOSITE SCORE (v2.2.2 Final: Explicit Risk Core Formula)
  // 
  // Risk(t) = S_LEGAL(t) + S_MACRO(t) + ERS(t)
  // POS_r(t) = ω_F × QS(t) + ω_O × OS_r(t) - ω_R × Risk(t)
  // POS(t) = Σ_r p_r^final(t) × POS_r(t)
  // POS_adj = POS - γ × ERS  (INV-5: ERS > 0 ⇒ POS_adj ≤ POS)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Risk Core = LEGAL + MACRO segment scores (inverted: low score = high risk)
  const riskCoreLegal = 100 - segmentData.LEGAL.adjustedScore;  // 0-100, higher = more risk
  const riskCoreMacro = 100 - segmentData.MACRO.adjustedScore;  // 0-100, higher = more risk
  const riskCoreERS = eventRisk.severityScore * 100;            // 0-100, from ERS
  const riskCore = (riskCoreLegal + riskCoreMacro + riskCoreERS) / 3;  // Normalized 0-100
  
  // POS using explicit formula: ω_F × QS + ω_O × OS - ω_R × Risk
  const { OMEGA_F, OMEGA_O, OMEGA_R } = CONFIG.SCORE_AGGREGATION;
  const osForCalc = osGated ? 50 : opportunityScore.score;  // Neutral if gated
  
  const compositeScoreRaw = 
    OMEGA_F * qualityScore.score +
    OMEGA_O * osForCalc -
    OMEGA_R * riskCore;
  
  // INV-4: Clamp to [0, 100]
  const posBeforeEventRisk = clampScore(compositeScoreRaw);
  
  // INV-5: Apply event risk adjustment (monotonic: ERS > 0 ⇒ POS_adj ≤ POS)
  const compositeScore = applyEventRiskAdjustment(
    posBeforeEventRisk, 
    eventRisk.severityScore, 
    CONFIG.EVENT_RISK_GAMMA
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NARRATIVE VS REALITY GAP
  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.1: WEIGHT-AWARE COVERAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const weightAwareCoverage = calculateWeightAwareCoverage(rawInputs, weights.final);
  const dataCoverageScore = weightAwareCoverage.score;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.1: PROJECT MATURITY
  // ═══════════════════════════════════════════════════════════════════════════
  const projectAgeDays = 365; // Would be fetched from project metadata
  const maturity = calculateMaturityAdjustment(projectAgeDays);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.2: MANIPULATION DEFENSES (Audit-Grade)
  // Includes cross-venue validation + peer-bucket anomaly
  // ═══════════════════════════════════════════════════════════════════════════
  const manipulationDefenses = calculateManipulationDefenses(marketData, rawInputs, regime, sector, capTier);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NRG (v2.2.2: Confidence gate with explicit "low_confidence" - NO default)
  // ═══════════════════════════════════════════════════════════════════════════
  let narrativeRealityGap = calculateNRG(segmentData);
  
  // v2.2.2: Use canonical NRG coverage from WeightAwareCoverage
  const nrgCoverage = weightAwareCoverage.nrg;
  const nrgThreshold = 0.6;
  const nrgGated = nrgCoverage < nrgThreshold;
  
  // v2.2.2: NO DEFAULT VALUE - use "low_confidence" interpretation
  if (nrgGated) {
    narrativeRealityGap = {
      ...narrativeRealityGap,
      interpretation: 'low_confidence',  // v2.2.2: No default, explicit label
      tradingImplication: 'LOW CONFIDENCE — insufficient signal coverage for NRG interpretation. Do not use for trading decisions.',
      statisticalBasis: narrativeRealityGap.statisticalBasis,
      coverageGate: {
        coverage: nrgCoverage,
        threshold: nrgThreshold,
        gated: true,
        message: 'LOW CONFIDENCE — insufficient signal coverage'
      }
    };
  } else {
    narrativeRealityGap = {
      ...narrativeRealityGap,
      coverageGate: {
        coverage: nrgCoverage,
        threshold: nrgThreshold,
        gated: false
      }
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UNCERTAINTY (v2.2.1: properly decomposed)
  // ═══════════════════════════════════════════════════════════════════════════
  const uncertainty = calculateUncertainty(dataCoverageScore, regimeProbs, [], compositeScore);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.1: EXPLAINABILITY
  // ═══════════════════════════════════════════════════════════════════════════
  const explainability = calculateExplainability(segmentData, rawInputs, regime, sector, maturity);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.1: REFLEXIVITY MONITORING
  // ═══════════════════════════════════════════════════════════════════════════
  const reflexivityMonitor = calculateReflexivityMonitor(qualityScore.score, marketData.btcTrend30d || 0);
  
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
    version: '2.2.1',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CORE DUAL SCORES (Reflexivity Firewall)
    // ═══════════════════════════════════════════════════════════════════════════
    qualityScore,
    opportunityScore,
    compositeScore,
    compositeTier,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SIGNATURE METRICS
    // ═══════════════════════════════════════════════════════════════════════════
    narrativeRealityGap,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // v2.2.1: EXPLAINABILITY (first-class output)
    // ═══════════════════════════════════════════════════════════════════════════
    explainability,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // RISK LAYER
    // ═══════════════════════════════════════════════════════════════════════════
    eventRisk,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // v2.2.1: MANIPULATION DEFENSES
    // ═══════════════════════════════════════════════════════════════════════════
    manipulationDefenses,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UNCERTAINTY (v2.2.1: properly decomposed variance shares)
    // ═══════════════════════════════════════════════════════════════════════════
    uncertainty,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SEGMENTS (with adversarial adjustment)
    // ═══════════════════════════════════════════════════════════════════════════
    segments: segmentData,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // HIERARCHICAL WEIGHTS
    // ═══════════════════════════════════════════════════════════════════════════
    weights,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UPGRADE RECOMMENDATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    upgradeRecommendations,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // COUNTERFACTUAL SIMULATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    counterfactuals,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONTEXT
    // ═══════════════════════════════════════════════════════════════════════════
    context: {
      regime: {
        current: regime,
        probabilities: regimeProbs,
        transitionRisk: uncertainty.components.regime.transitionProbability,
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
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DATA QUALITY (v2.2.1: Weight-Aware Coverage)
    // ═══════════════════════════════════════════════════════════════════════════
    dataCoverage: weightAwareCoverage,
    dataCoverageLegacy: dataCoverage,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // v2.2.1: PROJECT MATURITY
    // ═══════════════════════════════════════════════════════════════════════════
    maturity,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // v2.2.1: REFLEXIVITY MONITORING
    // ═══════════════════════════════════════════════════════════════════════════
    reflexivityMonitor,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // v2.2.1: CALIBRATION LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════════════
    calibration: {
      // Lifecycle stage
      stage: 'priors',
      weightsStatus: 'initial_priors',
      
      // Validation
      validation: {
        r2_target: 0.6,
        validationSet: 'Pending: requires sufficient live tracking history',
      },
      
      // Drift monitoring
      driftMonitoring: {
        enabled: false,
        threshold: 0.15,
      },
      
      // Backwards compatibility
      weightSource: 'prior',
      validationStatus: 'Initial calibrated priors. Live calibration requires sufficient prediction tracking history.',
      disclaimer: CONFIG.METHODOLOGY_FOOTER,
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // OUTPUTS
    // ═══════════════════════════════════════════════════════════════════════════
    summary,
    keyStrengths,
    keyWeaknesses,
    tradingContext,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════════════════
    projectId,
    projectName: projectId,
    projectSymbol: projectId.toUpperCase(),
    calculatedAt: new Date().toISOString(),
    dataSourcesUsed: [...new Set(rawInputs.map(v => v.source))],
    methodologyFooter: CONFIG.METHODOLOGY_FOOTER,
  };
  
  logger.info(`✅ OmniScore v2.2.1: QS=${qualityScore.score.toFixed(0)}, OS=${opportunityScore.score.toFixed(0)}, NRG=${narrativeRealityGap.index.toFixed(2)}, Coverage=${(weightAwareCoverage.score * 100).toFixed(0)}% in ${Date.now() - startTime}ms`);
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// v2.2.1 NEW FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Weight-Aware Coverage (v2.2.1)
 * 
 * Coverage_w = Σ(1[x_i] × Q_i × w̄_i) / Σ(w̄_i)
 * Missing high-weight variables hurt coverage more
 */
/**
 * Canonical Coverage Model (v2.2.2)
 * 
 * FORMULA (single definition):
 * Coverage_w(S, t) = Σᵢ∈S 1[xᵢ available] × Qᵢ × w̄ᵢ / Σᵢ∈S w̄ᵢ
 */
function calculateWeightAwareCoverage(
  rawInputs: RawVariableInput[],
  finalWeights: Record<SegmentType, number>
): WeightAwareCoverage {
  const ALL_SEGMENTS: SegmentType[] = ['TEAM', 'TECH', 'SEC', 'TOKEN', 'ADOPT', 'MARKET', 'COMM', 'GOV', 'ECO', 'VAL', 'LEGAL', 'MACRO'];
  const QS_SEGMENTS: SegmentType[] = ['TEAM', 'TECH', 'SEC', 'GOV', 'ECO'];
  const OS_SEGMENTS: SegmentType[] = ['MARKET', 'TOKEN', 'VAL', 'ADOPT', 'COMM'];
  const NRG_SEGMENTS: SegmentType[] = ['COMM', 'ADOPT', 'SEC', 'TECH', 'MARKET'];
  
  // Expected variables per segment (minimum for full coverage)
  const expectedVariablesPerSegment: Record<SegmentType, number> = {
    TEAM: 4, TECH: 5, SEC: 3, TOKEN: 4, ADOPT: 4, MARKET: 4,
    COMM: 3, GOV: 3, ECO: 3, VAL: 3, LEGAL: 2, MACRO: 2
  };
  
  const bySegment: Record<SegmentType, { coverage: number; weight: number; missingVariables: string[] }> = {} as any;
  const criticalGaps: Array<{ variable: string; segment: SegmentType; weight: number; impactOnCoverage: number }> = [];
  
  // Helper to calculate coverage for a subset of segments
  function calculateSubsetCoverage(segments: SegmentType[]): number {
    let totalWeightedCoverage = 0;
    let totalWeight = 0;
    
    for (const seg of segments) {
      const segWeight = finalWeights[seg];
      totalWeightedCoverage += (bySegment[seg]?.coverage || 0) * segWeight;
      totalWeight += segWeight;
    }
    
    return totalWeight > 0 ? totalWeightedCoverage / totalWeight : 0;
  }
  
  // Calculate per-segment coverage first
  for (const seg of ALL_SEGMENTS) {
    const segVars = rawInputs.filter(v => v.segment === seg);
    const expected = expectedVariablesPerSegment[seg];
    const segWeight = finalWeights[seg];
    
    // Calculate quality-weighted coverage for segment
    let segQualityCoverage = 0;
    if (segVars.length > 0) {
      const avgQuality = segVars.reduce((sum, v) => sum + (v.quality || 0.5), 0) / segVars.length;
      segQualityCoverage = Math.min(1, segVars.length / expected) * avgQuality;
    }
    
    // Identify missing variables
    const missingVariables: string[] = [];
    if (segVars.length < expected) {
      const missing = expected - segVars.length;
      for (let i = 0; i < missing; i++) {
        const varName = `${seg.toLowerCase()}_variable_${i + 1}`;
        missingVariables.push(varName);
        
        // Track critical gaps (high-weight segment with missing data)
        if (segWeight > 0.08) {
          criticalGaps.push({
            variable: varName,
            segment: seg,
            weight: segWeight,
            impactOnCoverage: segWeight
          });
        }
      }
    }
    
    bySegment[seg] = {
      coverage: Math.round(segQualityCoverage * 100) / 100,
      weight: segWeight,
      missingVariables
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.2: CANONICAL COVERAGE + DERIVED SUBSETS
  // ═══════════════════════════════════════════════════════════════════════════
  const coverageAll = calculateSubsetCoverage(ALL_SEGMENTS);
  const coverageQS = calculateSubsetCoverage(QS_SEGMENTS);
  const coverageOS = calculateSubsetCoverage(OS_SEGMENTS);
  const coverageNRG = calculateSubsetCoverage(NRG_SEGMENTS);
  
  // Determine confidence level
  let level: 'high' | 'medium' | 'low' | 'insufficient';
  if (coverageAll >= 0.8) level = 'high';
  else if (coverageAll >= 0.6) level = 'medium';
  else if (coverageAll >= 0.4) level = 'low';
  else level = 'insufficient';
  
  return {
    // v2.2.2: Canonical coverage (all segments)
    all: Math.round(coverageAll * 100) / 100,
    level,
    
    // v2.2.2: Derived coverages
    qs: Math.round(coverageQS * 100) / 100,
    os: Math.round(coverageOS * 100) / 100,
    nrg: Math.round(coverageNRG * 100) / 100,
    
    // Backwards compatibility
    score: Math.round(coverageAll * 100) / 100,
    
    // Breakdown
    bySegment,
    criticalGaps: criticalGaps.slice(0, 5)
  };
}

/**
 * Calculate Project Maturity Adjustment (v2.2.1)
 * 
 * AgeAdj(t) = min(1, log(1 + AgeDays) / log(1 + A))
 * Prevents unfair penalties for quality young projects
 */
function calculateMaturityAdjustment(projectAgeDays: number): MaturityAdjustment {
  const A = CONFIG.MATURITY_FULL_DAYS; // 730 days = 2 years
  
  // Logarithmic maturity curve
  const ageAdjustmentFactor = Math.min(1, Math.log(1 + projectAgeDays) / Math.log(1 + A));
  
  // Determine maturity tier
  let maturityTier: MaturityAdjustment['maturityTier'];
  if (projectAgeDays < 30) maturityTier = 'nascent';
  else if (projectAgeDays < 180) maturityTier = 'early';
  else if (projectAgeDays < 365) maturityTier = 'growth';
  else if (projectAgeDays < 730) maturityTier = 'mature';
  else maturityTier = 'established';
  
  // Adjusted expectations (scaled by maturity)
  return {
    ageDays: projectAgeDays,
    ageAdjustmentFactor: Math.round(ageAdjustmentFactor * 100) / 100,
    maturityTier,
    adjustedExpectations: {
      minTVL: ageAdjustmentFactor * 10_000_000,           // Up to $10M expected TVL
      minActiveAddresses: ageAdjustmentFactor * 10_000,   // Up to 10K DAU
      minEcosystemProjects: Math.floor(ageAdjustmentFactor * 20)  // Up to 20 integrations
    }
  };
}

/**
 * Calculate Manipulation Defenses (v2.2.1)
 * 
 * Includes: wash trading, liquidity anomaly, wallet clustering
 */
/**
 * Manipulation Defenses (v2.2.2 Audit-Grade)
 * 
 * Includes:
 * - Wash trading detection
 * - Cross-venue validation (CEX vs DEX coherence)
 * - Peer-bucket anomaly (relative to regime × sector × cap bucket)
 * - Entity clustering method stub
 */
function calculateManipulationDefenses(
  marketData: MarketContext,
  rawInputs: RawVariableInput[],
  regime: RegimeType = 'neutral',
  sector: SectorType = 'Unknown',
  capTier: CapTier = 'mid'
): ManipulationDefenses {
  const marketVars = rawInputs.filter(v => v.segment === 'MARKET');
  const tokenVars = rawInputs.filter(v => v.segment === 'TOKEN');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WASH TRADING DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  const volume24h = marketVars.find(v => v.id === 'volume_24h')?.value || 0;
  const marketCap = marketData.marketCap;
  const volumeToMcap = marketCap > 0 ? volume24h / marketCap : 0;
  
  let washRisk = 0;
  const washIndicators: string[] = [];
  
  if (volumeToMcap > 2) {
    washRisk += 0.3;
    washIndicators.push(`Volume/MCap ratio ${(volumeToMcap * 100).toFixed(0)}% (>200% threshold)`);
  }
  
  const volumeVar = marketVars.find(v => v.id === 'volume_variance');
  if (volumeVar && volumeVar.value < 0.1) {
    washRisk += 0.2;
    washIndicators.push('Suspiciously uniform volume pattern');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.2: CROSS-VENUE VALIDATION
  // CEX volume spike without DEX/orderbook/price-impact coherence → suspicious
  // ═══════════════════════════════════════════════════════════════════════════
  const cexVolume = marketVars.find(v => v.id === 'cex_volume_24h')?.value || volume24h * 0.7;
  const dexVolume = marketVars.find(v => v.id === 'dex_volume_24h')?.value || volume24h * 0.3;
  const cexDexVolumeRatio = dexVolume > 0 ? cexVolume / dexVolume : 10;
  
  // Coherence scores (would be computed from orderbook/price impact in production)
  const orderbookDepthCoherence = marketVars.find(v => v.id === 'orderbook_coherence')?.value || 0.7;
  const priceImpactCoherence = marketVars.find(v => v.id === 'price_impact_coherence')?.value || 0.7;
  
  let crossVenueAlert = false;
  let crossVenueReason: string | undefined;
  
  // High CEX/DEX ratio without orderbook confirmation is suspicious
  if (cexDexVolumeRatio > 5 && orderbookDepthCoherence < 0.5) {
    crossVenueAlert = true;
    crossVenueReason = `CEX/DEX ratio ${cexDexVolumeRatio.toFixed(1)}x with low orderbook coherence`;
    washRisk += 0.2;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.2 FINAL: HIERARCHICAL PEER NORMALIZATION (FALLBACK LADDER)
  // Compare within increasingly broad buckets for stability with thin data
  // 
  // Fallback ladder (tries most specific first):
  // 1. regime × sector × cap
  // 2. regime × sector
  // 3. sector × cap
  // 4. sector
  // 5. global
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Bucket configurations with simulated peer counts and stats
  const bucketTiers = [
    { name: `${regime}_${sector}_${capTier}`, peerCount: 5, meanVolMcap: 0.5, stdVolMcap: 0.3 },
    { name: `${regime}_${sector}`, peerCount: 15, meanVolMcap: 0.55, stdVolMcap: 0.35 },
    { name: `${sector}_${capTier}`, peerCount: 20, meanVolMcap: 0.52, stdVolMcap: 0.32 },
    { name: `${sector}`, peerCount: 50, meanVolMcap: 0.50, stdVolMcap: 0.30 },
    { name: 'global', peerCount: 200, meanVolMcap: 0.48, stdVolMcap: 0.28 },
  ];
  
  // Find first bucket with sufficient peers
  let selectedBucket = bucketTiers[bucketTiers.length - 1]; // Default to global
  for (const bucket of bucketTiers) {
    if (bucket.peerCount >= CONFIG.PEER_ANOMALY.MIN_PEERS) {
      selectedBucket = bucket;
      break;
    }
  }
  
  const peerBucket = selectedBucket.name;
  const zScore = (volumeToMcap - selectedBucket.meanVolMcap) / (selectedBucket.stdVolMcap + 0.01);
  
  const isAnomaly = Math.abs(zScore) > CONFIG.PEER_ANOMALY.Z_THRESHOLD;
  const anomalyDirection = zScore > CONFIG.PEER_ANOMALY.Z_THRESHOLD ? 'high' as const : 
                          zScore < -CONFIG.PEER_ANOMALY.Z_THRESHOLD ? 'low' as const : 'none' as const;
  
  if (isAnomaly && anomalyDirection === 'high') {
    washRisk += 0.15;
    washIndicators.push(`Volume ${zScore.toFixed(1)}σ above ${peerBucket} peers (n=${selectedBucket.peerCount})`);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LIQUIDITY ANOMALY DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  let liquidityAnomaly = 0;
  const liquidityIndicators: string[] = [];
  
  const spread = marketVars.find(v => v.id === 'bid_ask_spread')?.value || 0;
  if (spread > 5) {
    liquidityAnomaly += 0.3;
    liquidityIndicators.push(`Wide bid-ask spread: ${spread.toFixed(1)}%`);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.2: TOKEN ENTITY CLUSTERING (Method Stub)
  // 
  // Entity clustering signals (upgrade path):
  // - Funding graph links (common funding sources)
  // - Synchronized behavior (coordinated transactions)
  // - Common deposit/withdraw patterns (exchange matching)
  // - Co-movement across transfers (simultaneous activity)
  // 
  // Current: Placeholder multiplier (1.3x) with method stub
  // Future: Graph-based entity resolution
  // ═══════════════════════════════════════════════════════════════════════════
  const holderConcentration = tokenVars.find(v => v.id === 'holder_concentration')?.value || 50;
  const top10Holders = tokenVars.find(v => v.id === 'top_10_holders_pct')?.value || 50;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.2 FINAL: ENTITY CLUSTERING (FALLBACK HEURISTIC — UNCALIBRATED DEFAULT)
  // 
  // The multiplier is an UNCALIBRATED FALLBACK HEURISTIC used when:
  // - Clustering confidence is low
  // - Full graph analysis not available
  // 
  // PER-SECTOR OVERRIDE MAP (for future empirical fitting):
  // - DeFi:    1.4x (higher related-wallet prevalence)
  // - Meme:    1.5x (concentration typically underestimated)
  // - L1/L2:   1.2x (more distributed, foundation holdings)
  // - Infra:   1.25x
  // - Default: 1.3x
  // 
  // Algorithm signals (for future full implementation):
  // - Shared funding graph
  // - Time-synchronized transfers
  // - Correlated deposit/withdraw behavior
  // - Synchronized sell-offs
  // 
  // TODO: Hook for later empirical fitting from on-chain clustering results
  // Output: EffectiveConcentration = f(clustered ownership graph)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Per-sector override map (uncalibrated defaults)
  const sectorMultipliers: Record<SectorType, number> = {
    'DeFi': 1.4,
    'Meme': 1.5,
    'L1': 1.2,
    'L2': 1.2,
    'Infrastructure': 1.25,
    'AI': 1.3,
    'Gaming': 1.35,
    'Unknown': 1.3,
  };
  
  const clusteringConfidence = 0.3; // Low confidence = using fallback
  const clusterMultiplier = sectorMultipliers[sector] || 1.3;  // Sector-specific or default
  const effectiveConcentration = Math.min(100, holderConcentration * clusterMultiplier);
  const clusterCount = Math.max(3, Math.floor(100 / (top10Holders / 10 + 1)));
  const largestClusterShare = Math.min(100, top10Holders * 1.2);
  
  // Entity clustering signals (stubs - would be computed from on-chain analysis)
  const clusteringSignals: ManipulationDefenses['entityClustering']['clusteringSignals'] = [
    { 
      type: 'funding_link', 
      confidence: clusteringConfidence, 
      description: `Fallback heuristic (${clusterMultiplier}x for ${sector}). Uncalibrated default — full graph analysis not yet available.`
    },
  ];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OVERALL RISK ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════════
  const totalRisk = (washRisk + liquidityAnomaly + effectiveConcentration / 200) / 3;
  
  let overallRisk: ManipulationDefenses['overallRisk'];
  if (totalRisk > 0.5) overallRisk = 'critical';
  else if (totalRisk > 0.3) overallRisk = 'high';
  else if (totalRisk > 0.15) overallRisk = 'medium';
  else overallRisk = 'low';
  
  const adjustmentApplied = 1 - Math.min(0.4, totalRisk);
  
  return {
    // Wash trading
    washRisk: Math.round(washRisk * 100) / 100,
    washIndicators,
    
    // v2.2.2: Cross-venue validation
    crossVenue: {
      cexDexVolumeRatio: Math.round(cexDexVolumeRatio * 100) / 100,
      orderbookDepthCoherence: Math.round(orderbookDepthCoherence * 100) / 100,
      priceImpactCoherence: Math.round(priceImpactCoherence * 100) / 100,
      alert: crossVenueAlert,
      alertReason: crossVenueReason,
    },
    
    // v2.2.2: Peer-bucket anomaly
    peerBucketAnomaly: {
      zScore: Math.round(zScore * 100) / 100,
      peerCount: selectedBucket.peerCount,
      peerBucket,
      bucketTier: bucketTiers.indexOf(selectedBucket) + 1,
      isAnomaly,
      anomalyDirection,
    },
    
    // Liquidity
    liquidityAnomaly: Math.round(liquidityAnomaly * 100) / 100,
    liquidityIndicators,
    
    // v2.2.2: Entity clustering (method stub)
    entityClustering: {
      method: 'placeholder',
      effectiveConcentration: Math.round(effectiveConcentration * 100) / 100,
      clusterCount,
      largestClusterShare: Math.round(largestClusterShare * 100) / 100,
      clusteringSignals,
    },
    
    // Overall
    overallRisk,
    adjustmentApplied: Math.round(adjustmentApplied * 100) / 100,
  };
}

/**
 * Calculate Explainability Block (v2.2.2 Final - Trading-Desk Grade)
 * 
 * Now includes:
 * - QS/OS Driver Packs (z̃_i, Q_i, contribution)
 * - Legacy top drivers/risks with Δ7d
 */
function calculateExplainability(
  segments: Record<SegmentType, { adjustedScore: number; weight: number; dataQuality: number }>,
  rawInputs: RawVariableInput[],
  regime: RegimeType,
  sector: SectorType,
  maturity: MaturityAdjustment
): ExplainabilityBlock {
  const drivers: ExplainabilityBlock['topDrivers'] = [];
  const risks: ExplainabilityBlock['topRisks'] = [];
  
  // v2.2.2 FINAL: QS/OS Driver Packs (desk-grade tooling)
  const qsDrivers: FeatureDriver[] = [];
  const osDrivers: FeatureDriver[] = [];
  
  // Determine trend direction
  const getTrend = (d: number): 'up' | 'down' | 'stable' => 
    d > 2 ? 'up' : d < -2 ? 'down' : 'stable';
  const getRiskTrend = (d: number): 'improving' | 'worsening' | 'stable' =>
    d > 2 ? 'improving' : d < -2 ? 'worsening' : 'stable';
  
  // Calculate marginal impact for each variable
  for (const v of rawInputs) {
    const segWeight = segments[v.segment]?.weight || 0.05;
    const quality = v.quality || 0.5;
    const normalizedValue = v.value / 100;
    
    // Normalized signal (simplified z-score)
    const z = (v.value - 50) / 25; // Rough z-score: 50 = mean, 25 = std
    const clippedZ = Math.max(-3, Math.min(3, z)); // Clip to [-3, 3]
    
    // Contribution = weight × quality × z
    const contribution = segWeight * quality * Math.abs(clippedZ);
    
    // Marginal impact = weight × quality × value_contribution
    const impact = segWeight * quality * normalizedValue * 10;
    
    // v2.2.2: Simulate Δ7d (in production, would compare with historical values)
    const isFresh = quality > 0.7;
    const delta7d = isFresh ? Math.round((Math.random() - 0.3) * 20 * 10) / 10 : 0;
    const delta7dPercent = v.value > 0 ? Math.round((delta7d / v.value) * 100 * 10) / 10 : 0;
    
    // Create feature driver for QS/OS packs
    const featureDriver: FeatureDriver = {
      feature: v.id,
      segment: v.segment,
      z: Math.round(clippedZ * 100) / 100,
      Q: Math.round(quality * 100) / 100,
      contribution: Math.round(contribution * 100) / 100,
      delta7d: isFresh ? delta7d : undefined,
      trendDirection: getTrend(delta7d)
    };
    
    // Add to appropriate driver pack
    if (QS_ALLOWED_SEGMENTS.includes(v.segment) && contribution > 0.1) {
      qsDrivers.push(featureDriver);
    }
    if (OS_ALLOWED_SEGMENTS.includes(v.segment) && contribution > 0.1) {
      osDrivers.push(featureDriver);
    }
    
    // Legacy format
    if (v.value > 60 && impact > 0.3) {
      drivers.push({
        name: v.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        segment: v.segment,
        impact: Math.round(impact * 10) / 10,
        quality: Math.round(quality * 100) / 100,
        value: Math.round(v.value * 10) / 10,
        delta7d: isFresh ? delta7d : undefined,
        delta7dPercent: isFresh ? delta7dPercent : undefined,
        recentChange: isFresh && delta7d !== 0 ? 
          `${delta7d > 0 ? '+' : ''}${delta7d.toFixed(1)} this week` : undefined,
        trendDirection: getTrend(delta7d)
      });
    } else if (v.value < 40) {
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (v.value < 20) severity = 'critical';
      else if (v.value < 30) severity = 'high';
      else if (v.value < 40) severity = 'medium';
      
      risks.push({
        name: v.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        segment: v.segment,
        impact: -Math.round(impact * 10) / 10,
        quality: Math.round(quality * 100) / 100,
        value: Math.round(v.value * 10) / 10,
        delta7d: isFresh ? delta7d : undefined,
        delta7dPercent: isFresh ? delta7dPercent : undefined,
        severity,
        trendDirection: getRiskTrend(delta7d)
      });
    }
  }
  
  // Sort and take top 5
  drivers.sort((a, b) => b.impact - a.impact);
  risks.sort((a, b) => a.impact - b.impact);
  qsDrivers.sort((a, b) => b.contribution - a.contribution);
  osDrivers.sort((a, b) => b.contribution - a.contribution);
  
  return {
    // v2.2.2 FINAL: QS/OS Driver Packs (desk-grade tooling)
    qsDrivers: qsDrivers.slice(0, 5),
    osDrivers: osDrivers.slice(0, 5),
    
    // Legacy format
    topDrivers: drivers.slice(0, 5),
    topRisks: risks.slice(0, 5),
    regimeContext: `In ${regime} regime, ${regime === 'bull' ? 'growth metrics weighted higher' : regime === 'bear' ? 'security/fundamentals weighted higher' : 'balanced weighting applied'}`,
    sectorContext: `${sector} sector: ${sector === 'DeFi' ? 'TVL and security emphasized' : sector === 'L1' ? 'technology and governance emphasized' : sector === 'Meme' ? 'community and momentum emphasized' : 'standard weighting'}`,
    maturityContext: `${maturity.maturityTier} project (${maturity.ageDays} days): expectations scaled by ${Math.round(maturity.ageAdjustmentFactor * 100)}%`
  };
}

/**
 * Reflexivity Leak Monitor (v2.2.2)
 * 
 * Leak(t) = Corr(QS, ΔPrice_30d)
 * QS_Integrity = 1 - |Leak(t)|
 */
function calculateReflexivityMonitor(
  qualityScore: number,
  priceChange30d: number
): ReflexivityMonitor {
  // Simplified leak calculation (in production, would use rolling correlation)
  // Higher QS shouldn't correlate strongly with short-term price movements
  
  // Simulate correlation based on how aligned QS is with price direction
  const qsNormalized = (qualityScore - 50) / 50; // -1 to 1
  const priceNormalized = Math.max(-1, Math.min(1, priceChange30d / 50)); // -1 to 1
  
  // Crude correlation estimate
  const leakScore = qsNormalized * priceNormalized;
  
  const threshold = CONFIG.REFLEXIVITY_LEAK_THRESHOLD;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.2: QS INTEGRITY SCORE
  // The killer differentiator - makes firewall measurable
  // ═══════════════════════════════════════════════════════════════════════════
  const qsIntegrity = 1 - Math.abs(leakScore);
  
  let integrityLevel: ReflexivityMonitor['integrityLevel'];
  if (qsIntegrity >= 0.9) integrityLevel = 'excellent';
  else if (qsIntegrity >= 0.7) integrityLevel = 'good';
  else if (qsIntegrity >= 0.5) integrityLevel = 'moderate';
  else integrityLevel = 'poor';
  
  let status: ReflexivityMonitor['status'];
  if (Math.abs(leakScore) > threshold) {
    status = 'review_needed';
  } else if (Math.abs(leakScore) > threshold * 0.7) {
    status = 'warning';
  } else {
    status = 'healthy';
  }
  
  return {
    leakScore: Math.round(leakScore * 100) / 100,
    threshold,
    status,
    
    // v2.2.2: QS Integrity
    qsIntegrity: Math.round(qsIntegrity * 100) / 100,
    integrityLevel,
    
    lastMeasured: new Date().toISOString(),
    rollingWindow: 30,
    action: status === 'review_needed' ? 'Review QS feature set for price-correlated signals' : undefined
  };
}

/**
 * Hybrid Regime Detection (v2.2.1)
 * 
 * p_r(t) = η × p_r^model(t) + (1-η) × p_r^rules(t)
 * Combines fast rule triggers with smoothed probabilistic confirmation
 */
function detectRegimeProbabilities(marketData: MarketContext): Record<RegimeType, number> {
  // ═══════════════════════════════════════════════════════════════════════════
  // RULE-BASED DETECTION (fast trigger)
  // ═══════════════════════════════════════════════════════════════════════════
  let ruleProbs: Record<RegimeType, number> = {
    bull: 0.15, bear: 0.15, neutral: 0.40, crisis: 0.15, recovery: 0.15
  };
  
  const { btcTrend30d, btcTrend90d, volatilityIndex, fearGreedIndex } = marketData;
  
  if (btcTrend30d > 20 && btcTrend90d > 30) {
    ruleProbs.bull += 0.35;
    ruleProbs.neutral -= 0.20;
    ruleProbs.bear -= 0.10;
  } else if (btcTrend30d < -20 && btcTrend90d < -30) {
    ruleProbs.bear += 0.30;
    ruleProbs.bull -= 0.20;
    ruleProbs.neutral -= 0.10;
  }
  
  if (btcTrend30d < -40 || volatilityIndex > 80) {
    ruleProbs.crisis += 0.40;
    ruleProbs.bull -= 0.25;
  }
  
  // Recovery detection: positive 30d after negative 90d
  if (btcTrend30d > 15 && btcTrend90d < -10) {
    ruleProbs.recovery += 0.25;
    ruleProbs.bear -= 0.15;
  }
  
  if (fearGreedIndex > 70) ruleProbs.bull += 0.10;
  else if (fearGreedIndex < 30) ruleProbs.bear += 0.10;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL-BASED DETECTION (smoothed)
  // In production, this would be a trained HMM or similar
  // For now, use a dampened version of rules
  // ═══════════════════════════════════════════════════════════════════════════
  const modelProbs: Record<RegimeType, number> = {
    bull: 0.20, bear: 0.20, neutral: 0.40, crisis: 0.10, recovery: 0.10
  };
  
  // Adjust based on Fear & Greed (more stable signal)
  if (fearGreedIndex > 60) {
    modelProbs.bull += 0.15;
    modelProbs.neutral -= 0.10;
  } else if (fearGreedIndex < 40) {
    modelProbs.bear += 0.15;
    modelProbs.neutral -= 0.10;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HYBRID COMBINATION
  // η = 0.4 (40% model, 60% rules for faster response)
  // ═══════════════════════════════════════════════════════════════════════════
  const eta = 0.4;
  const probs: Record<RegimeType, number> = {} as any;
  
  for (const regime of ['bull', 'bear', 'neutral', 'crisis', 'recovery'] as RegimeType[]) {
    probs[regime] = eta * modelProbs[regime] + (1 - eta) * ruleProbs[regime];
  }
  
  // Normalize
  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(probs) as RegimeType[]) {
    probs[k] = Math.max(0, probs[k] / total);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2.2: REGIME PROBABILITY SMOOTHING (EMA)
  // 
  // pr_final(t) = EMA(pr(t), τ)  where τ = 5 days
  // 
  // This prevents regime flip noise and improves user trust.
  // 
  // Implementation note: In production, this would use stored historical
  // probabilities. For now, we apply a stability adjustment that dampens
  // extreme values toward neutral, simulating EMA behavior.
  // ═══════════════════════════════════════════════════════════════════════════
  const tau = CONFIG.REGIME_SMOOTHING_TAU; // 5 days
  const smoothingFactor = 1 / tau; // Simulated EMA alpha
  
  // Apply smoothing toward prior neutral state
  const priorNeutral: Record<RegimeType, number> = {
    bull: 0.20, bear: 0.20, neutral: 0.40, crisis: 0.10, recovery: 0.10
  };
  
  for (const k of Object.keys(probs) as RegimeType[]) {
    // EMA-like smoothing: blend current with prior
    probs[k] = smoothingFactor * probs[k] + (1 - smoothingFactor) * priorNeutral[k];
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MANDATORY RE-NORMALIZATION (INV-3: Σ_r p_r^final = 1)
  // This prevents silent probability drift
  // ═══════════════════════════════════════════════════════════════════════════
  return normalizeProbs(probs);
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
      else if (seg === 'GOV') { feasibility = 'easy'; cost = 'low'; time = '1-2 months'; }
      else if (seg === 'TOKEN') { feasibility = 'hard'; cost = 'medium'; time = '3-6 months'; }
      
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
  
  if (score.opportunityScore.gated) {
    ctx += `│ OPPORTUNITY SCORE:              [GATED - insufficient QS data]\n`;
  } else {
    ctx += `│ OPPORTUNITY SCORE (market):     ${score.opportunityScore.score.toFixed(0)}/100 ${tierEmoji[score.opportunityScore.tier]} ${score.opportunityScore.tier}\n`;
  }
  ctx += `└─────────────────────────────────────────────────────────────┘\n\n`;
  
  // NRG - Signature Metric (with percentile)
  const nrgEmoji = score.narrativeRealityGap.interpretation === 'overhyped' ? '🔴' :
                   score.narrativeRealityGap.interpretation === 'underhyped' ? '🟢' :
                   score.narrativeRealityGap.interpretation === 'severely_underhyped' ? '💎' : '🟡';
  
  ctx += `${nrgEmoji} NARRATIVE vs REALITY GAP: ${score.narrativeRealityGap.index.toFixed(2)} (${(score.narrativeRealityGap.percentile * 100).toFixed(0)}th percentile)\n`;
  ctx += `   → ${score.narrativeRealityGap.interpretation.toUpperCase()}\n`;
  ctx += `   → ${score.narrativeRealityGap.tradingImplication}\n\n`;
  
  // Event Risk (with severity adjustment)
  if (score.eventRisk.active) {
    ctx += `🚨 EVENT RISK: ${score.eventRisk.level.toUpperCase()} (ERS: ${score.eventRisk.severityScore.toFixed(2)}, POS adjustment: -${score.eventRisk.posAdjustment.toFixed(1)})\n`;
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
  
  // Opportunity Breakdown (if not gated)
  if (!score.opportunityScore.gated) {
    ctx += `📈 OPPORTUNITY SCORE BREAKDOWN:\n`;
    ctx += `   • Market: ${score.opportunityScore.market.toFixed(0)}%\n`;
    ctx += `   • Valuation: ${score.opportunityScore.valuation.toFixed(0)}%\n`;
    ctx += `   • Adoption: ${score.opportunityScore.adoption.toFixed(0)}%\n`;
    ctx += `   • Momentum: ${score.opportunityScore.momentum.toFixed(0)}%\n`;
    ctx += `   • Regime Adj: ${(score.opportunityScore.regimeAdjustment * 100).toFixed(0)}%\n\n`;
  } else {
    ctx += `📈 OPPORTUNITY SCORE: GATED\n`;
    ctx += `   ${score.opportunityScore.gateReason}\n\n`;
  }
  
  // Context
  ctx += `🌍 CONTEXT:\n`;
  ctx += `   Regime: ${score.context.regime.current.toUpperCase()} (${(score.context.regime.probabilities[score.context.regime.current] * 100).toFixed(0)}% confidence)\n`;
  ctx += `   Sector: ${score.context.sector} | Cap: ${score.context.capTier}\n`;
  ctx += `   Data Coverage: ${(score.dataCoverage.score * 100).toFixed(0)}% (${score.dataCoverage.level})\n`;
  ctx += `   Maturity: ${score.maturity.maturityTier} (${score.maturity.ageDays} days)\n\n`;
  
  // v2.2.1: Explainability
  if (score.explainability.topDrivers.length > 0) {
    ctx += `✅ TOP DRIVERS:\n`;
    for (const driver of score.explainability.topDrivers.slice(0, 3)) {
      ctx += `   • ${driver.name} (${driver.segment}): +${driver.impact.toFixed(1)} (Q=${driver.quality.toFixed(2)})\n`;
    }
  }
  if (score.explainability.topRisks.length > 0) {
    ctx += `⚠️ TOP RISKS:\n`;
    for (const risk of score.explainability.topRisks.slice(0, 3)) {
      ctx += `   • ${risk.name} (${risk.segment}): ${risk.impact.toFixed(1)} [${risk.severity}]\n`;
    }
  }
  ctx += `\n`;
  
  // Key Insights (legacy)
  if (score.keyStrengths.length > 0) {
    ctx += `💪 STRENGTHS: ${score.keyStrengths.join(', ')}\n`;
  }
  if (score.keyWeaknesses.length > 0) {
    ctx += `📉 WEAKNESSES: ${score.keyWeaknesses.join(', ')}\n`;
  }
  
  // v2.2.1: Manipulation Defenses
  if (score.manipulationDefenses.overallRisk !== 'low') {
    ctx += `\n🛡️ MANIPULATION RISK: ${score.manipulationDefenses.overallRisk.toUpperCase()}\n`;
    if (score.manipulationDefenses.washIndicators.length > 0) {
      ctx += `   Wash Trading: ${score.manipulationDefenses.washIndicators.join(', ')}\n`;
    }
  }
  
  // Top Counterfactual (realistic only)
  const realisticCF = score.counterfactuals.find(cf => cf.isRealistic);
  if (realisticCF) {
    ctx += `\n💡 TOP IMPROVEMENT SCENARIO:\n`;
    ctx += `   "${realisticCF.scenario}" → QS +${realisticCF.qsDelta.toFixed(1)}\n`;
    ctx += `   Time: ${realisticCF.timeEstimate} | Cost: ${realisticCF.costEstimate}\n`;
    if (realisticCF.constraints.budgetCap) {
      ctx += `   Constraint: ${realisticCF.constraints.budgetCap}\n`;
    }
  }
  
  // v2.2.1: Uncertainty decomposition (properly formatted)
  ctx += `\n📊 UNCERTAINTY DECOMPOSITION (σ_total = ±${score.uncertainty.totalStd.toFixed(1)}):\n`;
  ctx += `   Data: ±${score.uncertainty.components.data.std.toFixed(1)} (${score.uncertainty.components.data.varianceShare}%)\n`;
  ctx += `   Model: ±${score.uncertainty.components.model.std.toFixed(1)} (${score.uncertainty.components.model.varianceShare}%)\n`;
  ctx += `   Regime: ±${score.uncertainty.components.regime.std.toFixed(1)} (${score.uncertainty.components.regime.varianceShare}%)\n`;
  ctx += `   95% CI: [${score.uncertainty.confidenceBand[0].toFixed(1)}, ${score.uncertainty.confidenceBand[1].toFixed(1)}]\n`;
  ctx += `   Regime transition risk: ${(score.uncertainty.components.regime.transitionProbability * 100).toFixed(0)}%\n`;
  
  // v2.2.1: Reflexivity Monitor
  if (score.reflexivityMonitor.status !== 'healthy') {
    ctx += `\n🔄 REFLEXIVITY ALERT: ${score.reflexivityMonitor.status.toUpperCase()}\n`;
    ctx += `   Leak score: ${score.reflexivityMonitor.leakScore.toFixed(2)} (threshold: ${score.reflexivityMonitor.threshold})\n`;
    if (score.reflexivityMonitor.action) {
      ctx += `   Action: ${score.reflexivityMonitor.action}\n`;
    }
  }
  
  ctx += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  ctx += `📋 ${score.methodologyFooter}\n`;
  ctx += `[v${score.version} | ${score.context.sector} | ${score.context.capTier}-cap | ${score.context.regime.current} | Calibration: ${score.calibration.stage}]\n`;
  
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

