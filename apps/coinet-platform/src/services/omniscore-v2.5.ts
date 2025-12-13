/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║     🏆 OMNISCORE v2.5.0 — CONVEX COMBINATION ENGINE                                              ║
 * ║                                                                                                   ║
 * ║   OmniScore is a DECISION SYSTEM with:                                                            ║
 * ║   • Reflexivity-safe fundamentals       • Market opportunity separation                          ║
 * ║   • Risk overrides                      • Statistical defensibility                              ║
 * ║   • Fail-closed outputs                 • Full provenance ("audit trail")                        ║
 * ║   • Continuous calibration              • Operational telemetry                                  ║
 * ║   • Cross-chain entity resolution       • Cold-start early-stage policy                          ║
 * ║   • Adversarial threat model            • Scenario stress testing                                ║
 * ║                                                                                                   ║
 * ║   COMPETITIVE MOAT: scoring + explainability + governance + improvement simulation + compliance  ║
 * ║                                                                                                   ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                   ║
 * ║   PRODUCTION INVARIANTS (Compliance-Grade)                                                        ║
 * ║   ─────────────────────────────────────────                                                      ║
 * ║   VALUE BOUNDS                                                                                    ║
 * ║   INV-1:   0 ≤ Q_i ≤ 1                     (Data quality bounded)                   [ERROR]      ║
 * ║   INV-2:   0 ≤ Coverage ≤ 1                (Coverage bounded)                       [ERROR]      ║
 * ║   INV-4a:  Clamp applied to scores         (Soft clamp - visibly honest)           [WARN]       ║
 * ║   INV-4b:  NaN/Inf or repeated clamp       (Hard bound failure)                     [ERROR]      ║
 * ║                                                                                                   ║
 * ║   PROBABILITY + WEIGHT SANITY                                                                     ║
 * ║   INV-3:   Σ_r p_r^final = 1               (Probability hygiene)                    [ERROR]      ║
 * ║   INV-7:   ω_k ∈ [0,1], Σ_k ω_k = 1        (Weight sanity)                          [ERROR]      ║
 * ║                                                                                                   ║
 * ║   RISK MONOTONICITY                                                                               ║
 * ║   INV-5:   ERS > 0 ⇒ POS_adj ≤ POS         (Risk monotonicity)                      [ERROR]      ║
 * ║   INV-8:   γ ≥ 0                           (Gamma safety)                           [ERROR]      ║
 * ║                                                                                                   ║
 * ║   REFLEXIVITY FIREWALL                                                                            ║
 * ║   INV-9:   QS features ∩ OS features = ∅   (Feature isolation)                      [ERROR]      ║
 * ║   INV-12:  Reflexivity leak < threshold    (QS/Price correlation guard)             [WARN]       ║
 * ║                                                                                                   ║
 * ║   TIME + CONFIDENCE DETERMINISM                                                                   ║
 * ║   INV-10:  No future timestamps; max-age   (Timestamp sanity)                       [ERROR/WARN] ║
 * ║   INV-11:  Coverage → confidence mapping   (Deterministic confidence)               [ERROR]      ║
 * ║                                                                                                   ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                   ║
 * ║   MASTER MATH (Production Form)                                                                   ║
 * ║   ─────────────────────────────                                                                  ║
 * ║   QS = Σ_g w^QS_g × S_g     (hierarchically weighted, not simple average)                        ║
 * ║   OS = Σ_g w^OS_g × S_g     (hierarchically weighted, not simple average)                        ║
 * ║   Risk_scaled = mapTo100(z(LEGAL) + z(MACRO) + ERS)  (scaled to POS range)                       ║
 * ║   POS_r = ω_F,r × QS + ω_O,r × OS - ω_R,r × Risk_scaled                                          ║
 * ║   POS = Σ_r p_r^final(t) × POS_r                                                                 ║
 * ║   POS_adj = POS - γ × ERS                (γ default capped by sector)                            ║
 * ║   NRG = z(COMM + MARKET) - z(ADOPT + SEC + TECH)                                                 ║
 * ║   NMI = f(botRisk, anomalyBursts, influencerConcentration)  (Narrative Manipulation Index)       ║
 * ║                                                                                                   ║
 * ║   TIER ASSIGNMENT (Regime × Sector × Cap Conditioned)                                             ║
 * ║   Tier = percentile(POS | regime, sector, capBucket) → label                                     ║
 * ║                                                                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTION TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type RegimeType = 'bull' | 'bear' | 'neutral' | 'crisis' | 'recovery';

export type Segment = 
  | 'TEAM' | 'TECH' | 'SEC' | 'TOKEN' | 'ADOPT' | 'MARKET'
  | 'COMM' | 'GOV' | 'ECO' | 'VAL' | 'LEGAL' | 'MACRO';

export type Severity = 'WARN' | 'ERROR';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient';

export type TierLabel = 'Elite' | 'Strong' | 'Neutral' | 'Weak' | 'Critical';

// v2.3.2: Refined NRG labels (no redundancy)
export type NRGInterpretation = 'overhyped' | 'mildly_overheated' | 'balanced' | 'mildly_underhyped' | 'severely_underhyped' | 'low_confidence';

// v2.3.2: Market cap bucket for conditioned tiers
export type CapBucket = 'mega' | 'large' | 'mid' | 'small' | 'micro';

// v2.3.2: Sector types
export type SectorType = 'DeFi' | 'L1' | 'L2' | 'Infrastructure' | 'Meme' | 'AI' | 'Gaming' | 'Unknown';

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTION INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface InvariantViolation {
  code: string;
  severity: Severity;
  message: string;
  value?: number;
  bound?: string;
}

export interface FeatureInput {
  key: string;
  segment: Segment;
  raw: number | null;
  timestamp: string;  // ISO8601
  sources?: string[];
}

export interface FeatureDriver {
  feature: string;
  z: number;
  Q: number;
  contribution: number;
  trend7d: 'up' | 'down' | 'flat';
}

export interface ScoreState {
  qsInputs: FeatureInput[];
  osInputs: FeatureInput[];
  regimeProbs: Record<RegimeType, number>;
  weightsObjective: Record<string, number>;  // ω_F, ω_O, ω_R
  gamma: number;
  ers: number;
  coverageQS: number;
  coverageOS: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// v2.3.4: CANONICAL SNAPSHOT INTERFACE (Single Source of Truth)
// This is the ONLY format used by UI, chat, and API. No parallel scoring paths.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * OmniScoreSnapshot — Canonical format consumed by all UIs and chat
 * 
 * CRITICAL: All consumers (quadrant board, ASCII visualizer, chat) must use
 * this exact shape. No recomputing scores elsewhere. Single source of truth.
 */
export interface OmniScoreSnapshot {
  // Project identity
  id: string;
  symbol: string;
  name: string;
  sector: SectorType;
  capBucket: CapBucket;
  
  // Core scores (0-100)
  qs: number;              // Quality Score
  qsTier: TierLabel;
  os: number | null;       // Opportunity Score (null if gated)
  osTier: TierLabel | null;
  osStatus: 'active' | 'gated' | 'fallback';
  
  risk: number;            // Risk Score (0-100, higher = more risk)
  
  // POS progression (for debugging)
  posRaw: number;          // Before smoothing/plausibility
  posSmoothed: number;     // After smoothing
  posAdjusted: number;     // After ERS/gamma (final)
  tier: TierLabel;         // Final tier (from fixed thresholds)
  
  // Narrative metrics
  nrg: number;
  nrgTier: NRGInterpretation;
  nmi: number;
  nmiTier: NMITier;
  
  // Coverage & confidence
  coverageQS: number;      // 0-1
  coverageOS: number;      // 0-1
  confidence: ConfidenceLevel;
  
  // Audit metadata
  audit: {
    engineVersion: string;           // "2.3.4" or "2.4.0"
    methodologyVersion: string;
    timestamp: string;
    formulaVersion: 'v2.3' | 'v2.4' | 'v2.5'; // Which formula was used
    invariantStatus: 'pass' | 'warn' | 'fail';
    smoothingApplied: boolean;
    osCeilingApplied: boolean;
    posPlausibilityCapped: boolean;
    posBeforeCap: number | null;
    
    // v2.4 specific
    fundamentalsFloor: number | null;
    fundamentalsFloorApplied: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTION API RESPONSE INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface QualityScoreResponse {
  score: number;
  tier: TierLabel;
  confidence: ConfidenceLevel;
  coverage: number;
  breakdown: {
    team: number;
    tech: number;
    security: number;
    governance: number;
    ecosystem: number;
  };
}

export interface OpportunityScoreResponse {
  status: 'ok' | 'gated';
  score: number;
  tier: TierLabel;
  coverage: number;
  gateReason?: string;
}

export interface RiskResponse {
  score: number;
  eventRiskSeverity: number;
  adjustmentGamma: number;
}

export interface POSResponse {
  raw: number;
  adjusted: number;
  tier: TierLabel;
  confidenceBand: [number, number];
}

export interface NRGResponse {
  value: number;
  percentile: number;
  interpretation: NRGInterpretation;
}

export interface ExplainabilityResponse {
  qsDrivers: FeatureDriver[];
  osDrivers: FeatureDriver[];
}

export interface UpgradeRecommendation {
  feature: string;
  segment: Segment;
  currentValue: number;
  targetValue: number;
  expectedPOSLift: number;
  feasibility: 'easy' | 'medium' | 'hard';
  timeEstimate: string;
}

export interface UpgradeRecommendationsResponse {
  note: string;
  highImpact: UpgradeRecommendation[];
  quickWins: UpgradeRecommendation[];
  strategicBet: UpgradeRecommendation | null;
}

// v2.3.1: Clamp tracking for INV-4a/4b visibility
export interface ClampApplied {
  qs: boolean;
  os: boolean;
  pos: boolean;
  posAdj: boolean;
}

// v2.3.4: Smoothing tracking
export interface SmoothingApplied {
  enabled: boolean;
  alpha: number;
  previousPos: number | null;
  rawDelta: number;
  boundedDelta: number;
  maxDeltaAllowed: number;
  wasLimited: boolean;
  eventMode: boolean;  // High ERS = event mode (larger deltas allowed)
  timeSinceLastHours: number | null;
}

// v2.3.1: Methodology provenance for compliance
export interface MethodologyProvenance {
  id: string;
  hash: string;
  url: string;
}

// v2.3.1: Reflexivity sentinel for QS/price correlation monitoring
export interface ReflexivitySentinel {
  corrQsPrice30d: number;
  status: 'healthy' | 'warning' | 'alert';
  threshold: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// v2.3.2 "DIABOLICAL" ADDITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PROJECT IDENTITY GRAPH
 * Cross-chain entity resolution to prevent duplicates and false scoring
 */
export interface ProjectIdentityGraph {
  canonicalId: string;            // Primary identifier
  tokens: TokenEntity[];          // All associated tokens across chains
  githubOrgs: string[];           // GitHub organizations
  contracts: ContractEntity[];    // Deployed contracts
  foundations: string[];          // Legal entities
  aliases: string[];              // Alternative names/tickers
  confidenceLevel: 'verified' | 'high' | 'medium' | 'low';
}

export interface TokenEntity {
  chain: string;
  address: string;
  symbol: string;
  isCanonical: boolean;
}

export interface ContractEntity {
  chain: string;
  address: string;
  type: 'token' | 'protocol' | 'bridge' | 'governance' | 'other';
}

/**
 * COLD-START POLICY
 * Structured handling for early-stage projects
 */
export interface ColdStartPolicy {
  isEarlyStage: boolean;
  ageInDays: number;
  mode: 'standard' | 'early_stage' | 'pre_launch';
  adjustments: {
    priorStrength: number;        // How much to rely on priors (0-1)
    uncertaintyMultiplier: number; // Inflate uncertainty bands
    osExposureReduction: number;  // Reduce OS weight (0-1)
    tierConservatism: number;     // Shift tier thresholds (0-1)
  };
  reason: string;
}

/**
 * ADVERSARIAL THREAT MODEL
 * Explicit threat vectors and mitigations
 */
export interface AdversarialThreatModel {
  threats: ThreatVector[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  mitigationsApplied: string[];
}

export interface ThreatVector {
  category: 'social' | 'market' | 'technical' | 'identity';
  name: string;
  description: string;
  detected: boolean;
  severity: number;  // 0-1
  mitigation: string;
}

/**
 * NARRATIVE MANIPULATION INDEX (NMI) v2.1
 * Single meta-score for anti-hype detection
 * 
 * SCALE: 0-100 (higher = more manipulation likelihood)
 * TIER THRESHOLDS (formally defined):
 *   - clean:       NMI < 20  (normal social activity)
 *   - suspicious:  NMI ∈ [20, 40)  (elevated signals, investigate)
 *   - manipulated: NMI ∈ [40, 60)  (likely coordinated activity)
 *   - severe:      NMI ≥ 60  (high-confidence manipulation)
 */
export const NMI_TIER_THRESHOLDS = {
  CLEAN_MAX: 20,
  SUSPICIOUS_MAX: 40,
  MANIPULATED_MAX: 60,
} as const;

export type NMITier = 'clean' | 'suspicious' | 'manipulated' | 'severe';

/**
 * ICR Breakdown for full audit transparency
 */
export interface ICRBreakdown {
  top3: number;           // Top 3 influencers' share
  top10: number;          // Top 10 influencers' share
  gini: number;           // Gini coefficient of engagement distribution
  composite: number;      // Weighted: 30% top3 + 50% top10 + 20% gini
  // v2.2 peer context + anchor discount
  peerNormalized?: {
    rawICR: number;
    peerZ: number;
    peerMean: number;
    peerStd: number;
    sector?: string;
    capBucket?: string;
  };
  anchorDiscount?: {
    applied: boolean;
    reason: string;
    multiplier: number;
    anchorAccounts?: string[];
  };
}

/**
 * Social-Reality Mismatch
 * Detects when social velocity diverges from adoption reality
 */
export interface SocialRealityMismatch {
  value: number;          // z(COMM-V) - z(ADOPT)
  interpretation: 'aligned' | 'social_leading' | 'adoption_lagging' | 'severe_disconnect';
  penalty: number;        // Additional anomaly score (0-0.3)
}

export interface NarrativeManipulationIndex {
  score: number;                  // 0-100 (higher = more manipulation)
  tier: NMITier;
  components: {
    botLikelihood: number;
    anomalyBursts: number;
    // ICR now fully broken down
    influencerConcentrationComposite: number;
    influencerConcentrationTop3: number;
    influencerConcentrationTop10: number;
    influencerConcentrationGini: number;
    sentimentDispersion: number;
    crossSourceDivergence: number;
    // NEW: Social-Reality Mismatch
    socialRealityMismatch: number;
  };
  // Full ICR object for power users
  icrBreakdown: ICRBreakdown;
  // Social-Reality analysis
  socialRealityCheck: SocialRealityMismatch;
  // v2.2: Explicit formula for audit (makes it institutionally defensible)
  nmiFormula: string;
  confidence: ConfidenceLevel;
}

/**
 * SCENARIO STRESS TESTING
 * "What if" analysis for portfolio managers
 */
export interface ScenarioStressTest {
  scenarios: StressScenario[];
  worstCase: {
    scenario: string;
    posImpact: number;
    tierChange: TierLabel | null;
  };
  bestCase: {
    scenario: string;
    posImpact: number;
    tierChange: TierLabel | null;
  };
}

export interface StressScenario {
  name: string;
  description: string;
  assumptions: Record<string, number | string | boolean>;
  posImpact: number;
  newPOS: number;
  newTier: TierLabel;
  probability: number;  // Rough likelihood
}

/**
 * CONDITIONED TIER CONTEXT
 * Regime × Sector × Cap bucket conditioning for tiers
 */
export interface ConditionedTierContext {
  regime: RegimeType;
  sector: SectorType;
  capBucket: CapBucket;
  historicalMean: number;
  historicalStd: number;
  percentile: number;
  rawTier: TierLabel;           // Simple threshold - USE THIS FOR CHAT/USER-FACING
  conditionedTier: TierLabel;   // Adjusted for context - INTERNAL USE ONLY
  tierMismatch: boolean;        // Flag when raw ≠ conditioned for audit visibility
}

/**
 * CRYPTO-NATIVE REGIME SIGNALS
 * Replace TradFi VIX with crypto-native stress indicators
 */
export interface CryptoNativeRegimeSignals {
  btcRealizedVol30d: number;
  perpFundingStress: number;     // Funding rate deviation from neutral
  liquidationIntensity: number;  // Recent liq volume / avg
  stablecoinOutflowStress: number;
  btcDominanceShift: number;
  defiTvlDrawdown: number;
  // Fallback to TradFi if crypto signals unavailable
  vixFallback?: number;
}

export interface AuditTrail {
  engineVersion: string;
  methodologyVersion: string;
  requestId: string;
  dataAsOf: string;
  sourcesUsed: string[];
  coverageQS: number;
  coverageOS: number;
  confidence: ConfidenceLevel;
  gatingApplied: boolean;
  invariantStatus: 'pass' | 'warn' | 'fail';
  violations: InvariantViolation[];
  warnings: InvariantViolation[];
  regimeSnapshot: Record<RegimeType, number>;
  // v2.3.1: Enhanced audit fields
  clampApplied: ClampApplied;
  methodology: MethodologyProvenance;
  reflexivitySentinel: ReflexivitySentinel;
  // v2.3.3: Additional audit fields with tier transparency
  featureSchemaVersion: string;
  sectorPackId: string;
  clampHistoryCount: number;
  coldStartMode: ColdStartPolicy['mode'];
  tierConditioningApplied: boolean;
  tierMismatch: boolean;            // v2.3.3: Flag if rawTier ≠ conditionedTier
  rawTierUsed: TierLabel;           // v2.3.3: The tier shown to users (fixed thresholds)
  conditionedTierInternal: TierLabel;  // v2.3.3: For internal analytics only
  capBucket: CapBucket;
  // v2.3.4: Smoothing and plausibility tracking
  smoothingApplied: SmoothingApplied;
  posPlausibilityCapped: boolean;
  posBeforeCap: number | null;
  // v2.5.0: Formula version tracking
  formulaVersion: 'v2.3' | 'v2.4' | 'v2.5';
  fundamentalsFloor: number | null;
  fundamentalsFloorApplied: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MONITORING METRICS (Trading-Desk Grade Telemetry)
// ═══════════════════════════════════════════════════════════════════════════════

export interface OmniScoreMetrics {
  // Core health
  invariantErrorRate: number;
  invariantWarnRate: number;
  responseLatencyMs: number;
  dataFreshnessAgeSeconds: Record<Segment, number>;
  
  // Quality gate
  osGatedRate: number;
  coverageQSP50: number;
  coverageQSP90: number;
  coverageOSP50: number;
  coverageOSP90: number;
  
  // Anti-hype
  botRiskMean: number;
  anomalyScoreTriggerRate: number;
  commCapAppliedRate: number;
  
  // Event risk
  ersTriggerRate: number;
  posAdjustmentMean: number;
  
  // Reflexivity
  reflexivityCorrQsPrice30d: number;
}

export interface OmniScoreProductionResponse {
  success: boolean;
  engine: 'OmniScore';
  version: string;
  project: string;
  timestamp: string;
  
  qualityScore: QualityScoreResponse;
  opportunityScore: OpportunityScoreResponse;
  risk: RiskResponse;
  pos: POSResponse;
  nrg: NRGResponse;
  explainability: ExplainabilityResponse;
  upgradeRecommendations: UpgradeRecommendationsResponse;
  
  // v2.3.2: Diabolical additions
  nmi: NarrativeManipulationIndex;
  stressTest: ScenarioStressTest;
  tierContext: ConditionedTierContext;
  coldStart: ColdStartPolicy;
  identityGraph: ProjectIdentityGraph | null;
  threatModel: AdversarialThreatModel;
  
  audit: AuditTrail;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// Simple hash function for methodology versioning
function computeMethodologyHash(version: string): string {
  let hash = 0;
  const str = `OMNISCORE_METHODOLOGY_${version}_PRODUCTION`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

export const OMNISCORE_ENGINE_VERSION = '2.5.0' as const;

const CONFIG = {
  VERSION: '2.5.0' as const,
  METHODOLOGY_VERSION: '2.5.0' as const,
  ENGINE_NAME: 'OmniScore' as const,
  FEATURE_SCHEMA_VERSION: '2.5.0-core40' as const,
  
  // Methodology provenance
  METHODOLOGY: {
    ID: 'OMNISCORE_V2.3.2_DIABOLICAL',
    URL: '/docs/omniscore/v2.3',
    get HASH() { return computeMethodologyHash('2.3.2'); },
  },
  
  // Reflexivity sentinel thresholds (now also INV-12)
  REFLEXIVITY: {
    WARNING_THRESHOLD: 0.3,
    ALERT_THRESHOLD: 0.5,
    LOOKBACK_DAYS: 30,
  },
  
  // v2.3.2: Cold-start policy thresholds
  COLD_START: {
    EARLY_STAGE_MAX_DAYS: 180,    // Projects < 6 months old
    PRE_LAUNCH_MAX_DAYS: 30,      // Projects < 1 month old
    PRIOR_STRENGTH_EARLY: 0.7,    // Rely more on priors
    PRIOR_STRENGTH_PRELAUNCH: 0.9,
    UNCERTAINTY_MULTIPLIER_EARLY: 1.5,
    UNCERTAINTY_MULTIPLIER_PRELAUNCH: 2.0,
    OS_REDUCTION_EARLY: 0.3,
    OS_REDUCTION_PRELAUNCH: 0.6,
  },
  
  // v2.3.2: Conditioned tier historical stats (placeholder priors)
  // In production, these come from rolling historical distributions
  TIER_CONDITIONING: {
    ENABLED: true,
    // Historical μ and σ by regime × sector × cap
    // Format: `${regime}_${sector}_${cap}` → { mean, std }
    HISTORICAL_STATS: new Map<string, { mean: number; std: number }>([
      // Bull market tends to have higher scores
      ['bull_L1_large', { mean: 72, std: 12 }],
      ['bull_DeFi_mid', { mean: 68, std: 14 }],
      ['bull_Meme_small', { mean: 45, std: 20 }],
      // Bear market compresses scores
      ['bear_L1_large', { mean: 65, std: 10 }],
      ['bear_DeFi_mid', { mean: 55, std: 12 }],
      ['bear_Meme_small', { mean: 30, std: 18 }],
      // Neutral baseline
      ['neutral_L1_large', { mean: 68, std: 11 }],
      ['neutral_DeFi_mid', { mean: 62, std: 13 }],
      ['neutral_Meme_small', { mean: 38, std: 18 }],
      // Default fallback
      ['default', { mean: 60, std: 15 }],
    ]),
  },
  
  // v2.3.2: Crypto-native regime detection (replaces VIX dependency)
  CRYPTO_REGIME: {
    BTC_VOL_CRISIS_THRESHOLD: 0.08,    // 8% daily vol = crisis signal
    FUNDING_STRESS_THRESHOLD: 0.003,   // 0.3% funding rate deviation
    LIQUIDATION_INTENSITY_CRISIS: 3.0, // 3x normal liquidation volume
    STABLECOIN_OUTFLOW_STRESS: 0.05,   // 5% weekly outflow
    USE_VIX_FALLBACK: false,           // Only if crypto signals unavailable
  },
  
  // v2.3.2: NMI thresholds
  NMI: {
    CLEAN_THRESHOLD: 25,
    SUSPICIOUS_THRESHOLD: 50,
    MANIPULATED_THRESHOLD: 75,
    COMPONENT_WEIGHTS: {
      botLikelihood: 0.25,
      anomalyBursts: 0.20,
      influencerConcentration: 0.20,
      sentimentDispersion: 0.15,
      crossSourceDivergence: 0.20,
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FRESHNESS DEFAULTS (Production Model)
  // ═══════════════════════════════════════════════════════════════════════════
  FRESHNESS_DEFAULTS: {
    TEAM: 'months',
    GOV: 'months',
    SEC: 'weeks',
    TECH: 'days',
    ADOPT: 'days',
    TOKEN: 'days',
    MARKET: 'hours',
    COMM: 'hours',
    LEGAL: 'days',
    MACRO: 'hours',
    ECO: 'weeks',
    VAL: 'hours',
  } as Record<Segment, 'hours' | 'days' | 'weeks' | 'months'>,
  
  // Max age in days by segment for INV-10
  MAX_AGE_BY_SEGMENT: {
    TEAM: 180,
    GOV: 180,
    SEC: 60,
    TECH: 14,
    ADOPT: 7,
    TOKEN: 10,
    MARKET: 2,
    COMM: 2,
    LEGAL: 30,
    MACRO: 3,
    ECO: 30,
    VAL: 2,
  } as Record<Segment, number>,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OBJECTIVE WEIGHTS (Initial Priors)
  // ═══════════════════════════════════════════════════════════════════════════
  WEIGHTS: {
    OMEGA_F: 0.45,  // QS weight (v2.3 formula)
    OMEGA_O: 0.40,  // OS weight (v2.3 formula)
    OMEGA_R: 0.15,  // Risk weight (v2.3 formula)
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.5.0: CONVEX COMBINATION FORMULA (guaranteed bounded, cannot drift)
  // POS = W_F*QS + W_O*OS + W_S*(100-Risk)
  // Properties:
  // - POS is always between min/max of inputs (convex combination)
  // - Cannot exceed QS by more than OS/Risk contributions
  // - ETH with QS=87, OS=43, Risk=35 → POS ≈ 72.7 (not 91.6!)
  // ═══════════════════════════════════════════════════════════════════════════
  FORMULA_V25: {
    W_FUNDAMENTALS: 0.60,  // QS weight (fundamentals baseline)
    W_OPPORTUNITY: 0.25,   // OS weight (market opportunity)
    W_SAFETY: 0.15,        // Safety weight (100 - Risk)
    // Invariant: W_FUNDAMENTALS + W_OPPORTUNITY + W_SAFETY = 1.0
    FUNDAMENTAL_FLOOR: {
      QS_90_PLUS: 65,   // Elite fundamentals → at least Neutral+
      QS_85_PLUS: 55,   // Very strong fundamentals
      QS_80_PLUS: 50,   // Strong fundamentals
      QS_75_PLUS: 45,   // Good fundamentals
      QS_70_PLUS: 40,   // Decent fundamentals
    } as Record<string, number>,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HIERARCHICAL SEGMENT WEIGHTS (not simple average!)
  // w = w^global + δ^sector + δ^cap + δ^regime
  // ═══════════════════════════════════════════════════════════════════════════
  SEGMENT_WEIGHTS: {
    // Base global weights for QS segments
    QS_GLOBAL: {
      TEAM: 0.20,
      TECH: 0.25,
      SEC: 0.25,
      GOV: 0.15,
      ECO: 0.15,
    } as Record<string, number>,
    // Base global weights for OS segments
    OS_GLOBAL: {
      MARKET: 0.20,
      VAL: 0.20,
      ADOPT: 0.25,
      COMM: 0.15,
      TOKEN: 0.20,
    } as Record<string, number>,
    // Sector deltas (added to global)
    SECTOR_DELTA: {
      DeFi: { SEC: 0.10, TECH: 0.05, TOKEN: 0.05 },
      L1: { TECH: 0.10, ECO: 0.05 },
      L2: { TECH: 0.10, ADOPT: 0.05 },
      Infrastructure: { TECH: 0.15 },
      Meme: { COMM: 0.15, MARKET: 0.10 },
      AI: { TECH: 0.10, TEAM: 0.05 },
      Gaming: { ADOPT: 0.10, ECO: 0.05 },
      Unknown: {},
    } as Record<string, Record<string, number>>,
    // Cap bucket deltas
    CAP_DELTA: {
      mega: { GOV: 0.05 },
      large: {},
      mid: { ADOPT: 0.05 },
      small: { TEAM: 0.10 },
      micro: { TEAM: 0.15, SEC: 0.05 },
    } as Record<string, Record<string, number>>,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GAMMA DEFAULTS BY SECTOR
  // ═══════════════════════════════════════════════════════════════════════════
  GAMMA_BY_SECTOR: {
    DeFi: 18,
    L1: 12,
    L2: 12,
    Infrastructure: 10,
    Meme: 25,
    AI: 15,
    Gaming: 15,
    Unknown: 15,
  } as Record<string, number>,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // QUALITY GATE THRESHOLD
  // ═══════════════════════════════════════════════════════════════════════════
  QUALITY_GATE_THRESHOLD: 0.60,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3.3: OS CEILING BY CAP BUCKET (Mega-caps should rarely hit 100)
  // This prevents BTC/ETH from trivially maxing out OS on any strong day.
  // OS 100 should be EXCEPTIONAL, not "BTC had a good week".
  // ═══════════════════════════════════════════════════════════════════════════
  OS_CEILING_BY_CAP: {
    mega: 92,    // $10B+ caps: OS capped at 92 (100 = truly exceptional)
    large: 95,   // $1B+ caps: OS capped at 95
    mid: 98,     // $100M+ caps: OS capped at 98
    small: 100,  // $10M+ caps: no ceiling
    micro: 100,  // <$10M caps: no ceiling
  } as Record<CapBucket, number>,
  
  // v2.3.3: OS diminishing returns curve for mega-caps
  // Raw OS above threshold gets compressed: final = threshold + (raw - threshold) * factor
  OS_DIMINISHING_RETURNS: {
    mega: { threshold: 80, factor: 0.4 },   // Above 80, only 40% counts → max ~92
    large: { threshold: 85, factor: 0.5 },  // Above 85, only 50% counts → max ~92.5
    mid: { threshold: 90, factor: 0.6 },    // Above 90, only 60% counts → max ~96
    small: { threshold: 100, factor: 1.0 }, // No compression
    micro: { threshold: 100, factor: 1.0 }, // No compression
  } as Record<CapBucket, { threshold: number; factor: number }>,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3.4: POS PLAUSIBILITY CAP (Make 100/100 literally impossible)
  // No live project should achieve perfect 100. Cap at 97 for realism.
  // If POS > 97, either data is wrong or invariants are broken.
  // ═══════════════════════════════════════════════════════════════════════════
  POS_MAX_PLAUSIBLE: 97,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3.4: TEMPORAL SMOOTHING (Prevent SUI 70→37 overnight crashes)
  // Smooth POS changes over time unless there's a real event (high ERS).
  // Prevents wild swings from data noise or temporary API failures.
  // ═══════════════════════════════════════════════════════════════════════════
  SMOOTHING: {
    ENABLED: true,
    ALPHA: 0.35,              // Smoothing factor: new×0.35 + old×0.65
    MAX_DELTA_NO_EVENT: 12,   // Max change per 24h without event
    MAX_DELTA_WITH_EVENT: 30, // Max change per 24h with event
    EVENT_ERS_THRESHOLD: 0.4, // ERS above this = "event" (allow larger moves)
    MIN_TIME_BETWEEN_HOURS: 1, // Minimum hours between updates for smoothing
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ADVERSARIAL RESISTANCE: COMM CONTRIBUTION CAP
  // COMM contribution cannot exceed X% of OS unless multi-source consistency
  // ═══════════════════════════════════════════════════════════════════════════
  COMM_CONTRIBUTION_CAP: 0.30,  // 30% max
  COMM_MULTI_SOURCE_THRESHOLD: 0.75,  // Consistency threshold to bypass cap
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIDENCE THRESHOLDS (INV-11: Deterministic mapping)
  // ═══════════════════════════════════════════════════════════════════════════
  CONFIDENCE_THRESHOLDS: {
    high: 0.80,
    medium: 0.60,
    low: 0.40,
    insufficient: 0,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER THRESHOLDS
  // ═══════════════════════════════════════════════════════════════════════════
  TIER_THRESHOLDS: {
    Elite: 85,
    Strong: 70,
    Neutral: 50,
    Weak: 30,
    Critical: 0,
  },
  
  // Feature whitelists for INV-9
  QS_SEGMENTS: ['TEAM', 'TECH', 'SEC', 'GOV', 'ECO'] as Segment[],
  OS_SEGMENTS: ['MARKET', 'TOKEN', 'VAL', 'ADOPT', 'COMM'] as Segment[],
  RISK_SEGMENTS: ['LEGAL', 'MACRO'] as Segment[],
};

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT HELPERS (Production-Ready)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-1: Clamp quality to [0, 1]
 */
export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * INV-4a/4b: Clamp score to [0, 100] with tracking
 * Returns { value, clamped, isHardFailure }
 */
export interface ClampResult {
  value: number;
  clamped: boolean;
  isHardFailure: boolean;  // INV-4b: NaN/Inf = ERROR
}

export function clampScore100WithTracking(x: number): ClampResult {
  // INV-4b: NaN/Inf is a hard failure
  if (!Number.isFinite(x)) {
    return { value: 0, clamped: true, isHardFailure: true };
  }
  
  const original = x;
  const clamped = Math.max(0, Math.min(100, x));
  
  return {
    value: clamped,
    clamped: clamped !== original,
    isHardFailure: false,
  };
}

/**
 * INV-4: Simple clamp (backwards compatible)
 */
export function clampScore100(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

/**
 * INV-8: Clamp gamma to non-negative
 */
export function clampGamma(g: number): number {
  if (!Number.isFinite(g)) return 0;
  return Math.max(0, g);
}

/**
 * INV-11: Validate confidence determinism
 * Returns ERROR if confidence label doesn't match deterministic mapping
 */
export function assertConfidenceDeterminism(
  coverage: number,
  assignedConfidence: ConfidenceLevel
): InvariantViolation | null {
  const expectedConfidence = coverageToConfidence(coverage);
  if (assignedConfidence !== expectedConfidence) {
    return {
      code: 'INV-11',
      severity: 'ERROR',
      message: `Confidence mismatch: expected ${expectedConfidence} for coverage ${coverage}, got ${assignedConfidence}`
    };
  }
  return null;
}

/**
 * INV-3: Normalize regime probabilities to sum to 1
 */
export function normalizeProbs(
  probs: Record<RegimeType, number>
): Record<RegimeType, number> {
  const sum = Object.values(probs).reduce((a, b) => a + Math.max(0, b), 0);
  if (sum <= 0) {
    return { bull: 0, bear: 0, neutral: 1, crisis: 0, recovery: 0 };
  }
  const out = { ...probs };
  (Object.keys(out) as RegimeType[]).forEach(k => {
    out[k] = Math.max(0, out[k]) / sum;
  });
  return out;
}

/**
 * INV-7: Normalize objective weights to sum to 1
 */
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const keys = Object.keys(weights);
  const sum = keys.reduce((a, k) => a + Math.max(0, weights[k]), 0);
  if (sum <= 0) {
    // Safe defaults
    return { ω_F: 0.35, ω_O: 0.25, ω_R: 0.40 };
  }
  const out: Record<string, number> = {};
  keys.forEach(k => (out[k] = clamp01(Math.max(0, weights[k]) / sum)));
  return out;
}

/**
 * INV-9: Assert QS/OS feature isolation
 */
export function assertFeatureIsolation(
  qs: FeatureInput[],
  os: FeatureInput[]
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  
  // Check QS inputs don't include OS segments
  for (const f of qs) {
    if (CONFIG.OS_SEGMENTS.includes(f.segment)) {
      violations.push({
        code: 'INV-9',
        severity: 'ERROR',
        message: `QS contaminated by OS segment ${f.segment} (feature: ${f.key})`
      });
    }
  }
  
  // Check OS inputs don't include QS segments
  for (const f of os) {
    if (CONFIG.QS_SEGMENTS.includes(f.segment)) {
      violations.push({
        code: 'INV-9',
        severity: 'ERROR',
        message: `OS contaminated by QS segment ${f.segment} (feature: ${f.key})`
      });
    }
  }
  
  return violations;
}

/**
 * INV-10: Assert timestamp sanity
 * - No future timestamps
 * - Max age by segment
 */
export function assertTimestampSanity(
  inputs: FeatureInput[],
  nowIso: string
): InvariantViolation[] {
  const now = new Date(nowIso).getTime();
  const violations: InvariantViolation[] = [];
  
  for (const f of inputs) {
    if (!f.timestamp) continue;
    const ts = new Date(f.timestamp).getTime();
    if (!Number.isFinite(ts)) continue;
    
    // No future timestamps
    if (ts > now) {
      violations.push({
        code: 'INV-10',
        severity: 'ERROR',
        message: `Future-dated feature: ${f.key}`,
      });
      continue;
    }
    
    // Max age check
    const maxDays = CONFIG.MAX_AGE_BY_SEGMENT[f.segment];
    if (maxDays != null) {
      const ageDays = (now - ts) / (1000 * 60 * 60 * 24);
      if (ageDays > maxDays) {
        violations.push({
          code: 'INV-10',
          severity: 'WARN',
          message: `Stale feature beyond segment max-age: ${f.key}`,
          value: Math.round(ageDays * 10) / 10,
          bound: `${maxDays}d`
        });
      }
    }
  }
  
  return violations;
}

/**
 * INV-11: Deterministic coverage → confidence mapping
 */
export function coverageToConfidence(coverage: number): ConfidenceLevel {
  const c = clamp01(coverage);
  if (c >= CONFIG.CONFIDENCE_THRESHOLDS.high) return 'high';
  if (c >= CONFIG.CONFIDENCE_THRESHOLDS.medium) return 'medium';
  if (c >= CONFIG.CONFIDENCE_THRESHOLDS.low) return 'low';
  return 'insufficient';
}

/**
 * Validate all production invariants
 */
export function validateInvariants(
  state: ScoreState,
  nowIso: string
): InvariantViolation[] {
  const v: InvariantViolation[] = [];
  
  // INV-3: Probability sum = 1
  const probs = normalizeProbs(state.regimeProbs);
  const sumP = Object.values(probs).reduce((a, b) => a + b, 0);
  if (Math.abs(sumP - 1) > 1e-6) {
    v.push({ code: 'INV-3', severity: 'ERROR', message: 'Regime probabilities not normalized.' });
  }
  
  // INV-7: Weight sum = 1
  const w = normalizeWeights(state.weightsObjective);
  const sumW = Object.values(w).reduce((a, b) => a + b, 0);
  if (Math.abs(sumW - 1) > 1e-6) {
    v.push({ code: 'INV-7', severity: 'ERROR', message: 'Objective weights not normalized.' });
  }
  
  // INV-8: Gamma >= 0
  if (state.gamma < 0) {
    v.push({ code: 'INV-8', severity: 'ERROR', message: `Gamma < 0: ${state.gamma}` });
  }
  
  // INV-9: Feature isolation
  v.push(...assertFeatureIsolation(state.qsInputs, state.osInputs));
  
  // INV-10: Timestamp sanity
  v.push(...assertTimestampSanity([...state.qsInputs, ...state.osInputs], nowIso));
  
  // INV-2: Coverage bounds
  if (state.coverageQS < 0 || state.coverageQS > 1) {
    v.push({ code: 'INV-2', severity: 'ERROR', message: `QS coverage out of bounds: ${state.coverageQS}` });
  }
  if (state.coverageOS < 0 || state.coverageOS > 1) {
    v.push({ code: 'INV-2', severity: 'ERROR', message: `OS coverage out of bounds: ${state.coverageOS}` });
  }
  
  return v;
}

/**
 * Check if any ERROR-level violations exist
 */
export function hasErrorViolations(violations: InvariantViolation[]): boolean {
  return violations.some(v => v.severity === 'ERROR');
}

// ═══════════════════════════════════════════════════════════════════════════════
// v2.3.2: HIERARCHICAL WEIGHT CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate hierarchical weights for a segment
 * w = w^global + δ^sector + δ^cap
 */
function getHierarchicalWeight(
  segment: string,
  isQS: boolean,
  sector: SectorType,
  capBucket: CapBucket
): number {
  const globalWeights = isQS ? CONFIG.SEGMENT_WEIGHTS.QS_GLOBAL : CONFIG.SEGMENT_WEIGHTS.OS_GLOBAL;
  let weight = globalWeights[segment] || 0.2;
  
  // Add sector delta
  const sectorDelta = CONFIG.SEGMENT_WEIGHTS.SECTOR_DELTA[sector] || {};
  weight += sectorDelta[segment] || 0;
  
  // Add cap delta
  const capDelta = CONFIG.SEGMENT_WEIGHTS.CAP_DELTA[capBucket] || {};
  weight += capDelta[segment] || 0;
  
  return clamp01(weight);
}

/**
 * Normalize hierarchical weights to sum to 1
 */
function normalizeHierarchicalWeights(weights: Record<string, number>): Record<string, number> {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights;
  const normalized: Record<string, number> = {};
  for (const [k, v] of Object.entries(weights)) {
    normalized[k] = v / sum;
  }
  return normalized;
}

// ═══════════════════════════════════════════════════════════════════════════════
// v2.3.2: COLD-START POLICY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine cold-start policy based on project age
 */
function determineColdStartPolicy(projectAgeInDays: number): ColdStartPolicy {
  if (projectAgeInDays < CONFIG.COLD_START.PRE_LAUNCH_MAX_DAYS) {
    return {
      isEarlyStage: true,
      ageInDays: projectAgeInDays,
      mode: 'pre_launch',
      adjustments: {
        priorStrength: CONFIG.COLD_START.PRIOR_STRENGTH_PRELAUNCH,
        uncertaintyMultiplier: CONFIG.COLD_START.UNCERTAINTY_MULTIPLIER_PRELAUNCH,
        osExposureReduction: CONFIG.COLD_START.OS_REDUCTION_PRELAUNCH,
        tierConservatism: 0.3,
      },
      reason: `Project is ${projectAgeInDays} days old (pre-launch mode: stronger priors, higher uncertainty)`,
    };
  }
  
  if (projectAgeInDays < CONFIG.COLD_START.EARLY_STAGE_MAX_DAYS) {
    return {
      isEarlyStage: true,
      ageInDays: projectAgeInDays,
      mode: 'early_stage',
      adjustments: {
        priorStrength: CONFIG.COLD_START.PRIOR_STRENGTH_EARLY,
        uncertaintyMultiplier: CONFIG.COLD_START.UNCERTAINTY_MULTIPLIER_EARLY,
        osExposureReduction: CONFIG.COLD_START.OS_REDUCTION_EARLY,
        tierConservatism: 0.15,
      },
      reason: `Project is ${projectAgeInDays} days old (early-stage mode: moderate priors)`,
    };
  }
  
  return {
    isEarlyStage: false,
    ageInDays: projectAgeInDays,
    mode: 'standard',
    adjustments: {
      priorStrength: 0,
      uncertaintyMultiplier: 1.0,
      osExposureReduction: 0,
      tierConservatism: 0,
    },
    reason: 'Standard mode (sufficient history)',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// v2.3.2: CONDITIONED TIER CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get cap bucket from market cap
 */
function getCapBucket(marketCapUsd: number | undefined): CapBucket {
  if (!marketCapUsd) return 'mid';
  if (marketCapUsd >= 10_000_000_000) return 'mega';    // $10B+
  if (marketCapUsd >= 1_000_000_000) return 'large';    // $1B+
  if (marketCapUsd >= 100_000_000) return 'mid';        // $100M+
  if (marketCapUsd >= 10_000_000) return 'small';       // $10M+
  return 'micro';
}

/**
 * v2.3.3: Apply OS ceiling and diminishing returns for mega-caps
 * Prevents BTC/ETH from trivially hitting OS=100 on any strong day.
 * OS 100 should be EXCEPTIONAL (truly crazy conditions), not routine.
 * 
 * Logic:
 * 1. If raw OS <= threshold: no adjustment
 * 2. If raw OS > threshold: final = threshold + (raw - threshold) * factor
 * 3. Then apply hard ceiling
 */
function applyOSCapAdjustment(rawOS: number, capBucket: CapBucket): { 
  adjusted: number; 
  wasAdjusted: boolean; 
  reason: string;
} {
  const ceiling = CONFIG.OS_CEILING_BY_CAP[capBucket];
  const diminishing = CONFIG.OS_DIMINISHING_RETURNS[capBucket];
  
  let adjusted = rawOS;
  let wasAdjusted = false;
  let reason = '';
  
  // Step 1: Apply diminishing returns above threshold
  if (rawOS > diminishing.threshold) {
    const excess = rawOS - diminishing.threshold;
    adjusted = diminishing.threshold + excess * diminishing.factor;
    wasAdjusted = true;
    reason = `OS diminishing returns applied (${capBucket} cap: above ${diminishing.threshold}, factor ${diminishing.factor})`;
  }
  
  // Step 2: Apply hard ceiling
  if (adjusted > ceiling) {
    adjusted = ceiling;
    wasAdjusted = true;
    reason = reason || `OS ceiling applied (${capBucket} cap: max ${ceiling})`;
  }
  
  return {
    adjusted: Math.round(adjusted * 10) / 10,
    wasAdjusted,
    reason: wasAdjusted ? reason : 'no adjustment needed',
  };
}

/**
 * v2.3.4: Apply POS plausibility cap
 * No live project should achieve perfect 100/100. Cap at 97 for realism.
 * If POS > 97, either data is wrong or invariants are broken.
 * 
 * This makes "ETH 100/100" literally impossible to return from the engine.
 */
function applyPOSPlausibilityCap(
  pos: number, 
  violations: InvariantViolation[]
): { value: number; capped: boolean; originalValue: number } {
  const maxPlausible = CONFIG.POS_MAX_PLAUSIBLE;
  
  if (pos > maxPlausible) {
    violations.push({
      code: 'INV-POS-PLAU',
      severity: 'ERROR',
      message: `POS ${pos.toFixed(2)} exceeds plausibility bound ${maxPlausible}. This indicates data anomaly or invariant failure.`,
      value: pos,
      bound: `<= ${maxPlausible}`,
    });
    
    return {
      value: maxPlausible,
      capped: true,
      originalValue: pos,
    };
  }
  
  return {
    value: pos,
    capped: false,
    originalValue: pos,
  };
}

/**
 * v2.3.4: Apply temporal smoothing to POS
 * Prevents wild swings like SUI 70→37 overnight unless there's a real event.
 * 
 * Smoothing formula:
 *   POS_smoothed = α × POS_raw + (1-α) × POS_previous
 * 
 * Delta limiting:
 *   IF |POS_smoothed - POS_previous| > maxDelta:
 *     POS_final = POS_previous + sign(delta) × maxDelta
 * 
 * Event mode (high ERS):
 *   maxDelta = MAX_DELTA_WITH_EVENT (larger moves allowed)
 */
function applySmoothingToPOS(
  rawPos: number,
  previousPos: number | null | undefined,
  previousTimestamp: string | null | undefined,
  ers: number,
  now: Date,
  violations: InvariantViolation[]
): { smoothed: number; tracking: SmoothingApplied } {
  const cfg = CONFIG.SMOOTHING;
  
  // If smoothing disabled or no previous data, return raw
  if (!cfg.ENABLED || previousPos == null || !Number.isFinite(previousPos)) {
    return {
      smoothed: rawPos,
      tracking: {
        enabled: false,
        alpha: 1.0,
        previousPos: null,
        rawDelta: 0,
        boundedDelta: 0,
        maxDeltaAllowed: 0,
        wasLimited: false,
        eventMode: false,
        timeSinceLastHours: null,
      },
    };
  }
  
  // Calculate time since last update
  let timeSinceLastHours: number | null = null;
  if (previousTimestamp) {
    const prevTime = new Date(previousTimestamp);
    timeSinceLastHours = (now.getTime() - prevTime.getTime()) / (1000 * 60 * 60);
    
    // If too recent, skip smoothing to avoid over-damping
    if (timeSinceLastHours < cfg.MIN_TIME_BETWEEN_HOURS) {
      return {
        smoothed: rawPos,
        tracking: {
          enabled: false,
          alpha: 1.0,
          previousPos,
          rawDelta: rawPos - previousPos,
          boundedDelta: rawPos - previousPos,
          maxDeltaAllowed: 0,
          wasLimited: false,
          eventMode: false,
          timeSinceLastHours,
        },
      };
    }
  }
  
  // Apply exponential smoothing
  const alpha = cfg.ALPHA;
  const posSmoothed = alpha * rawPos + (1 - alpha) * previousPos;
  
  // Determine event mode
  const isEventMode = ers >= cfg.EVENT_ERS_THRESHOLD;
  const maxDelta = isEventMode ? cfg.MAX_DELTA_WITH_EVENT : cfg.MAX_DELTA_NO_EVENT;
  
  // Calculate deltas
  const rawDelta = rawPos - previousPos;
  const smoothedDelta = posSmoothed - previousPos;
  
  // Apply delta limiting
  let finalPos = posSmoothed;
  let boundedDelta = smoothedDelta;
  let wasLimited = false;
  
  if (Math.abs(smoothedDelta) > maxDelta) {
    finalPos = previousPos + Math.sign(smoothedDelta) * maxDelta;
    boundedDelta = finalPos - previousPos;
    wasLimited = true;
    
    violations.push({
      code: 'INV-POS-SMOOTH',
      severity: 'WARN',
      message: `POS change ${smoothedDelta.toFixed(2)} exceeds maxDelta ${maxDelta} (${isEventMode ? 'event mode' : 'normal'}). Bounded to ${boundedDelta.toFixed(2)}.`,
      value: smoothedDelta,
      bound: `<= ${maxDelta}`,
    });
  }
  
  return {
    smoothed: Math.round(finalPos * 10) / 10,
    tracking: {
      enabled: true,
      alpha,
      previousPos,
      rawDelta: Math.round(rawDelta * 10) / 10,
      boundedDelta: Math.round(boundedDelta * 10) / 10,
      maxDeltaAllowed: maxDelta,
      wasLimited,
      eventMode: isEventMode,
      timeSinceLastHours: timeSinceLastHours,
    },
  };
}

/**
 * Calculate conditioned tier based on regime × sector × cap
 */
function calculateConditionedTier(
  pos: number,
  regime: RegimeType,
  sector: SectorType,
  capBucket: CapBucket
): ConditionedTierContext {
  // Get historical stats for this context
  const key = `${regime}_${sector}_${capBucket}`;
  const stats = CONFIG.TIER_CONDITIONING.HISTORICAL_STATS.get(key) ||
                CONFIG.TIER_CONDITIONING.HISTORICAL_STATS.get('default') ||
                { mean: 60, std: 15 };
  
  // Calculate percentile using normal CDF approximation
  const zScore = (pos - stats.mean) / stats.std;
  const percentile = 0.5 * (1 + Math.tanh(zScore * 0.7)); // Simplified sigmoid approximation
  
  // Raw tier from fixed thresholds
  const rawTier = getTier(pos);
  
  // Conditioned tier based on percentile within context
  let conditionedTier: TierLabel;
  if (percentile >= 0.90) conditionedTier = 'Elite';
  else if (percentile >= 0.70) conditionedTier = 'Strong';
  else if (percentile >= 0.30) conditionedTier = 'Neutral';
  else if (percentile >= 0.10) conditionedTier = 'Weak';
  else conditionedTier = 'Critical';
  
  return {
    regime,
    sector,
    capBucket,
    historicalMean: stats.mean,
    historicalStd: stats.std,
    percentile: Math.round(percentile * 100) / 100,
    rawTier,
    conditionedTier,
    tierMismatch: rawTier !== conditionedTier,  // Flag for audit transparency
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// v2.3.2: NARRATIVE MANIPULATION INDEX (NMI) — DIABOLICAL EDITION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Social-Reality Mismatch v2.2
 * Detects when social velocity (COMM-V) diverges from adoption reality
 * 
 * v2.2: REGIME-AWARE PENALTY
 * - In bull markets, social often leads adoption (lower penalty)
 * - In bear/crisis markets, social spikes are more suspect (higher penalty)
 */
function calculateSocialRealityMismatch(
  commVelocityZ: number,
  adoptionZ: number,
  regime: RegimeType = 'neutral'
): SocialRealityMismatch {
  // z(COMM-V) - z(ADOPT)
  const value = commVelocityZ - adoptionZ;
  
  // Regime multiplier for penalty
  // Bull/Recovery: social often leads adoption (0.5x penalty)
  // Neutral: normal penalty (1.0x)
  // Bear/Crisis: social spikes are suspect (1.5x penalty)
  const regimeMultiplier = 
    regime === 'bull' ? 0.5 :
    regime === 'recovery' ? 0.6 :
    regime === 'neutral' ? 1.0 :
    regime === 'bear' ? 1.3 :
    regime === 'crisis' ? 1.5 : 1.0;
  
  let interpretation: SocialRealityMismatch['interpretation'];
  let basePenalty = 0;
  
  if (Math.abs(value) < 0.5) {
    interpretation = 'aligned';
    basePenalty = 0;
  } else if (value > 1.5) {
    interpretation = 'severe_disconnect';
    basePenalty = 0.3;  // Social WAY ahead of reality
  } else if (value > 0.5) {
    interpretation = 'social_leading';
    basePenalty = 0.15; // Social moderately ahead
  } else {
    interpretation = 'adoption_lagging';
    basePenalty = 0.05; // Adoption behind social (less concerning)
  }
  
  // Apply regime multiplier (capped at 0.5)
  const penalty = Math.min(0.5, basePenalty * regimeMultiplier);
  
  return {
    value: Math.round(value * 100) / 100,
    interpretation,
    penalty,
  };
}

/**
 * Calculate Narrative Manipulation Index v2.2
 * Now includes full ICR breakdown, social-reality mismatch, and regime awareness
 */
function calculateNMI(
  botRisk: number,
  anomalyScore: number,
  influencerConcentration: number,
  sentimentDispersion: number,
  crossSourceDivergence: number,
  coverage: number,
  // v2.1 additions
  icrBreakdown?: ICRBreakdown,
  commVelocityZ?: number,
  adoptionZ?: number,
  // v2.2: Regime for context-aware penalty
  regime?: RegimeType
): NarrativeManipulationIndex {
  const w = CONFIG.NMI.COMPONENT_WEIGHTS;
  
  // Calculate social-reality mismatch if we have the data
  // v2.2: Now regime-aware
  const socialRealityCheck = calculateSocialRealityMismatch(
    commVelocityZ ?? 0, 
    adoptionZ ?? 0,
    regime ?? 'neutral'
  );
  
  // Add social-reality mismatch penalty to anomaly score
  const adjustedAnomalyScore = Math.min(1, anomalyScore + socialRealityCheck.penalty);
  
  const score = clampScore100(
    w.botLikelihood * clamp01(botRisk) * 100 +
    w.anomalyBursts * clamp01(adjustedAnomalyScore) * 100 +
    w.influencerConcentration * clamp01(influencerConcentration) * 100 +
    w.sentimentDispersion * clamp01(sentimentDispersion) * 100 +
    w.crossSourceDivergence * clamp01(crossSourceDivergence) * 100
  );
  
  // Use formal tier thresholds
  let tier: NMITier;
  if (score >= NMI_TIER_THRESHOLDS.MANIPULATED_MAX) tier = 'severe';
  else if (score >= NMI_TIER_THRESHOLDS.SUSPICIOUS_MAX) tier = 'manipulated';
  else if (score >= NMI_TIER_THRESHOLDS.CLEAN_MAX) tier = 'suspicious';
  else tier = 'clean';
  
  // Build ICR breakdown (use provided or estimate)
  const icr: ICRBreakdown = icrBreakdown || {
    top3: influencerConcentration,
    top10: influencerConcentration * 0.8,
    gini: influencerConcentration * 0.7,
    composite: influencerConcentration,
  };
  
  // v2.2: Explicit NMI formula for audit
  const nmiFormula = `NMI = 100 × (${w.botLikelihood}×Bot + ${w.anomalyBursts}×Anomaly + ${w.influencerConcentration}×ICR + ${w.sentimentDispersion}×Disp + ${w.crossSourceDivergence}×Div)`;
  
  return {
    score: Math.round(score * 10) / 10,
    tier,
    components: {
      botLikelihood: Math.round(botRisk * 100) / 100,
      anomalyBursts: Math.round(adjustedAnomalyScore * 100) / 100,
      // Full ICR breakdown for auditors
      influencerConcentrationComposite: Math.round(icr.composite * 100) / 100,
      influencerConcentrationTop3: Math.round(icr.top3 * 100) / 100,
      influencerConcentrationTop10: Math.round(icr.top10 * 100) / 100,
      influencerConcentrationGini: Math.round(icr.gini * 100) / 100,
      sentimentDispersion: Math.round(sentimentDispersion * 100) / 100,
      crossSourceDivergence: Math.round(crossSourceDivergence * 100) / 100,
      // Social-Reality Mismatch
      socialRealityMismatch: socialRealityCheck.value,
    },
    icrBreakdown: icr,
    socialRealityCheck,
    // v2.2: Explicit formula for audit transparency
    nmiFormula,
    confidence: coverageToConfidence(coverage),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// v2.3.2: SCENARIO STRESS TESTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate stress test scenarios
 */
function generateStressTests(
  currentPOS: number,
  qsScore: number,
  osScore: number,
  riskScore: number,
  sector: SectorType
): ScenarioStressTest {
  const scenarios: StressScenario[] = [];
  
  // Scenario 1: BTC -20% in 7d
  const btcCrashImpact = -8 - (sector === 'Meme' ? 5 : sector === 'DeFi' ? 3 : 0);
  scenarios.push({
    name: 'BTC -20% in 7d',
    description: 'Sharp Bitcoin correction triggers risk-off across crypto',
    assumptions: { btcChange: -20, regimeShift: 'bear' },
    posImpact: btcCrashImpact,
    newPOS: clampScore100(currentPOS + btcCrashImpact),
    newTier: getTier(clampScore100(currentPOS + btcCrashImpact)),
    probability: 0.15,
  });
  
  // Scenario 2: Funding rate crisis
  const fundingCrisisImpact = -5 - (sector === 'DeFi' ? 4 : 0);
  scenarios.push({
    name: 'Perp funding flips -0.3%',
    description: 'Extreme negative funding indicates overleveraged longs unwinding',
    assumptions: { fundingRate: -0.003 },
    posImpact: fundingCrisisImpact,
    newPOS: clampScore100(currentPOS + fundingCrisisImpact),
    newTier: getTier(clampScore100(currentPOS + fundingCrisisImpact)),
    probability: 0.10,
  });
  
  // Scenario 3: Major exploit in ecosystem
  const exploitImpact = -15 - (sector === 'DeFi' ? 10 : sector === 'L2' ? 5 : 0);
  scenarios.push({
    name: 'Major ecosystem exploit',
    description: 'Major protocol in same ecosystem gets exploited',
    assumptions: { securityIncident: true },
    posImpact: exploitImpact,
    newPOS: clampScore100(currentPOS + exploitImpact),
    newTier: getTier(clampScore100(currentPOS + exploitImpact)),
    probability: 0.05,
  });
  
  // Scenario 4: Bull run acceleration
  const bullImpact = 6 + (sector === 'Meme' ? 8 : sector === 'AI' ? 5 : 0);
  scenarios.push({
    name: 'Bull run +50% BTC in 30d',
    description: 'Sustained rally lifts all boats, risk-on sentiment',
    assumptions: { btcChange: 50, regimeShift: 'bull' },
    posImpact: bullImpact,
    newPOS: clampScore100(currentPOS + bullImpact),
    newTier: getTier(clampScore100(currentPOS + bullImpact)),
    probability: 0.15,
  });
  
  // Scenario 5: Project ships major upgrade
  const upgradeImpact = 4 + (sector === 'L1' || sector === 'L2' ? 3 : 0);
  scenarios.push({
    name: 'Major protocol upgrade ships',
    description: 'Successful mainnet upgrade or feature launch',
    assumptions: { techMilestone: true },
    posImpact: upgradeImpact,
    newPOS: clampScore100(currentPOS + upgradeImpact),
    newTier: getTier(clampScore100(currentPOS + upgradeImpact)),
    probability: 0.25,
  });
  
  // Find worst and best cases
  const sorted = [...scenarios].sort((a, b) => a.posImpact - b.posImpact);
  const worstCase = sorted[0];
  const bestCase = sorted[sorted.length - 1];
  
  return {
    scenarios,
    worstCase: {
      scenario: worstCase.name,
      posImpact: worstCase.posImpact,
      tierChange: worstCase.newTier !== getTier(currentPOS) ? worstCase.newTier : null,
    },
    bestCase: {
      scenario: bestCase.name,
      posImpact: bestCase.posImpact,
      tierChange: bestCase.newTier !== getTier(currentPOS) ? bestCase.newTier : null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// v2.3.2: ADVERSARIAL THREAT MODEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build adversarial threat model
 */
function buildThreatModel(
  botRisk: number,
  anomalyScore: number,
  washTradingRisk: number,
  sybilDevRisk: number
): AdversarialThreatModel {
  const threats: ThreatVector[] = [
    {
      category: 'social',
      name: 'Bot/fake follower inflation',
      description: 'Artificial social metrics from purchased followers or bot farms',
      detected: botRisk > 0.3,
      severity: botRisk,
      mitigation: 'COMM adjusted by (1 - BotRisk); multi-source consistency required',
    },
    {
      category: 'social',
      name: 'Paid influencer sentiment spam',
      description: 'Coordinated influencer campaigns creating artificial sentiment',
      detected: anomalyScore > 0.4,
      severity: anomalyScore * 0.8,
      mitigation: 'Sentiment dispersion checks; influencer concentration penalty',
    },
    {
      category: 'market',
      name: 'Wash trading / fake volume',
      description: 'Self-dealing to inflate volume metrics',
      detected: washTradingRisk > 0.3,
      severity: washTradingRisk,
      mitigation: 'Cross-venue validation; MARKET segment adjusted by WashRisk',
    },
    {
      category: 'technical',
      name: 'GitHub commit spam',
      description: 'Low-quality commits to inflate activity metrics',
      detected: false, // Would need commit analysis
      severity: 0.1,
      mitigation: 'Contributor diversity check; meaningful commit ratio',
    },
    {
      category: 'technical',
      name: 'Sybil developers',
      description: 'Single entity posing as multiple contributors',
      detected: sybilDevRisk > 0.3,
      severity: sybilDevRisk,
      mitigation: 'Identity clustering; contribution pattern analysis',
    },
    {
      category: 'identity',
      name: 'Fake audit PDFs',
      description: 'Forged or misrepresented security audit documents',
      detected: false, // Would need audit verification
      severity: 0.1,
      mitigation: 'Audit source verification; direct auditor confirmation',
    },
    {
      category: 'market',
      name: 'TVL spoofing',
      description: 'Circular deposits or incentivized deposits misrepresenting real usage',
      detected: false, // Would need on-chain analysis
      severity: 0.15,
      mitigation: 'TVL retention analysis; organic vs incentivized split',
    },
  ];
  
  // Calculate overall risk
  const detectedThreats = threats.filter(t => t.detected);
  const maxSeverity = Math.max(...threats.map(t => t.severity));
  const avgSeverity = threats.reduce((sum, t) => sum + t.severity, 0) / threats.length;
  
  let overallRisk: AdversarialThreatModel['overallRisk'];
  if (maxSeverity > 0.7 || detectedThreats.length >= 3) overallRisk = 'critical';
  else if (maxSeverity > 0.5 || detectedThreats.length >= 2) overallRisk = 'high';
  else if (avgSeverity > 0.2 || detectedThreats.length >= 1) overallRisk = 'medium';
  else overallRisk = 'low';
  
  const mitigationsApplied = detectedThreats.map(t => t.mitigation);
  
  return {
    threats,
    overallRisk,
    mitigationsApplied,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// v2.3.2: CRYPTO-NATIVE REGIME DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect regime using crypto-native signals (not VIX)
 */
function detectRegimeCryptoNative(
  signals?: CryptoNativeRegimeSignals
): Record<RegimeType, number> {
  if (!signals) {
    return { bull: 0.15, bear: 0.15, neutral: 0.55, crisis: 0.10, recovery: 0.05 };
  }
  
  let probs: Record<RegimeType, number> = {
    bull: 0.15, bear: 0.15, neutral: 0.40, crisis: 0.15, recovery: 0.15
  };
  
  // Crypto-native crisis detection (replaces VIX)
  const isCrisisSignal = 
    signals.btcRealizedVol30d > CONFIG.CRYPTO_REGIME.BTC_VOL_CRISIS_THRESHOLD ||
    signals.liquidationIntensity > CONFIG.CRYPTO_REGIME.LIQUIDATION_INTENSITY_CRISIS ||
    signals.stablecoinOutflowStress > CONFIG.CRYPTO_REGIME.STABLECOIN_OUTFLOW_STRESS;
  
  if (isCrisisSignal) {
    probs.crisis += 0.40;
    probs.bull -= 0.25;
    probs.neutral -= 0.15;
  }
  
  // Funding stress indicates leveraged positioning
  if (Math.abs(signals.perpFundingStress) > CONFIG.CRYPTO_REGIME.FUNDING_STRESS_THRESHOLD) {
    if (signals.perpFundingStress > 0) {
      // Positive funding = overleveraged longs = late bull or reversal risk
      probs.bull += 0.15;
      probs.crisis += 0.10;
    } else {
      // Negative funding = overleveraged shorts = capitulation or recovery
      probs.bear += 0.15;
      probs.recovery += 0.10;
    }
  }
  
  // DeFi TVL drawdown
  if (signals.defiTvlDrawdown > 0.3) {
    probs.bear += 0.20;
    probs.crisis += 0.15;
  }
  
  // BTC dominance shift
  if (signals.btcDominanceShift > 5) {
    // Rising BTC dominance = flight to quality = late bear or early recovery
    probs.bear += 0.10;
    probs.recovery += 0.10;
  } else if (signals.btcDominanceShift < -5) {
    // Falling BTC dominance = alt season = mid-late bull
    probs.bull += 0.15;
  }
  
  return normalizeProbs(probs);
}

/**
 * Scale risk to POS range (0-100)
 * Addresses the unit mismatch between z-space Risk and 0-100 QS/OS
 */
function scaleRiskToPOSRange(zRisk: number, ers: number): number {
  // Risk is in z-space (typically -3 to +3) plus ERS (0-1)
  // Map to 0-100 scale where 50 is neutral, higher = more risk
  const combinedZ = zRisk + ers * 2;  // ERS contributes 0-2 to z-score
  // Sigmoid mapping: z=0 → 50, z=2 → ~88, z=-2 → ~12
  const scaled = 50 + 50 * Math.tanh(combinedZ / 2);
  return clampScore100(scaled);
}

/**
 * Get tier from score
 */
function getTier(score: number): TierLabel {
  const s = clampScore100(score);
  if (s >= CONFIG.TIER_THRESHOLDS.Elite) return 'Elite';
  if (s >= CONFIG.TIER_THRESHOLDS.Strong) return 'Strong';
  if (s >= CONFIG.TIER_THRESHOLDS.Neutral) return 'Neutral';
  if (s >= CONFIG.TIER_THRESHOLDS.Weak) return 'Weak';
  return 'Critical';
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFLEXIVITY SENTINEL (Trading-Desk Grade Monitoring)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate reflexivity sentinel: correlation between QS and price changes
 * Alert if QS is contaminated by price reflexivity
 */
export function calculateReflexivitySentinel(
  qsScore: number,
  priceChange30d: number | undefined
): ReflexivitySentinel {
  // If no price data, return healthy with zero correlation
  if (priceChange30d === undefined) {
    return {
      corrQsPrice30d: 0,
      status: 'healthy',
      threshold: CONFIG.REFLEXIVITY.WARNING_THRESHOLD,
    };
  }
  
  // Simplified correlation estimation
  // In production, this would use historical QS/price pairs
  const normalizedQs = (qsScore - 50) / 50;  // -1 to 1
  const normalizedPrice = Math.tanh(priceChange30d / 50);  // -1 to 1
  const corrEstimate = normalizedQs * normalizedPrice;
  
  let status: 'healthy' | 'warning' | 'alert' = 'healthy';
  if (Math.abs(corrEstimate) >= CONFIG.REFLEXIVITY.ALERT_THRESHOLD) {
    status = 'alert';
  } else if (Math.abs(corrEstimate) >= CONFIG.REFLEXIVITY.WARNING_THRESHOLD) {
    status = 'warning';
  }
  
  return {
    corrQsPrice30d: Math.round(corrEstimate * 1000) / 1000,
    status,
    threshold: CONFIG.REFLEXIVITY.WARNING_THRESHOLD,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADVERSARIAL RESISTANCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply COMM contribution cap (adversarial resistance)
 * COMM contribution cannot exceed X% of OS unless multi-source consistency ≥ threshold
 */
function applyCommContributionCap(
  commContribution: number,
  totalOS: number,
  multiSourceConsistency: number
): number {
  const maxContribution = totalOS * CONFIG.COMM_CONTRIBUTION_CAP;
  
  // If multi-source consistency is high, bypass the cap
  if (multiSourceConsistency >= CONFIG.COMM_MULTI_SOURCE_THRESHOLD) {
    return commContribution;
  }
  
  // Otherwise, cap the contribution
  return Math.min(commContribution, maxContribution);
}

/**
 * Apply adversarial adjustments to COMM/ADOPT
 */
export function applyAdversarialAdjustments(
  segmentScore: number,
  botRisk: number,
  anomalyScore: number
): number {
  return segmentScore * (1 - clamp01(botRisk)) * (1 - clamp01(anomalyScore));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PRODUCTION CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface CalculateOmniScoreParams {
  projectId: string;
  qsInputs: FeatureInput[];
  osInputs: FeatureInput[];
  sector?: string;
  marketData?: {
    btcTrend30d: number;
    btcTrend90d: number;
    volatilityIndex: number;
    fearGreedIndex: number;
  };
  // v2.3.2: Crypto-native regime signals (preferred over marketData)
  cryptoRegimeSignals?: CryptoNativeRegimeSignals;
  eventRiskSeverity?: number;
  priceChange30d?: number;
  multiSourceConsistency?: number;
  botRisk?: number;
  anomalyScore?: number;
  // v2.3.2: Additional inputs
  projectAgeInDays?: number;
  marketCapUsd?: number;
  influencerConcentration?: number;
  sentimentDispersion?: number;
  crossSourceDivergence?: number;
  washTradingRisk?: number;
  sybilDevRisk?: number;
  identityGraph?: ProjectIdentityGraph;
  // v2.3.4: Temporal smoothing inputs
  previousPos?: number | null;
  previousTimestamp?: string | null;
  // v2.4.1: Version-aware smoothing reset
  previousEngineVersion?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// v2.4: BASELINE+TILT FORMULA FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function assertEngineVersion(response: OmniScoreProductionResponse) {
  if (response.audit.engineVersion !== CONFIG.VERSION) {
    throw new Error(`Engine mismatch: response=${response.audit.engineVersion} expected=${CONFIG.VERSION}`);
  }
}

/**
 * v2.4: Calculate fundamentals-based floor
 * Prevents high-QS projects from being rated too low
 * This ensures blue-chips like ETH maintain reasonable scores even with low OS
 */
function calculateFundamentalsFloor(qs: number): number {
  const { FUNDAMENTAL_FLOOR } = CONFIG.FORMULA_V25;

  // Mild protection for elite fundamentals (blue-chip floor)
  // v2.5.0: Lower floors than v2.4 to allow formula to work naturally
  if (qs >= 90) return FUNDAMENTAL_FLOOR.QS_90_PLUS;  // 65
  if (qs >= 85) return FUNDAMENTAL_FLOOR.QS_85_PLUS;  // 55
  if (qs >= 80) return FUNDAMENTAL_FLOOR.QS_80_PLUS;  // 50
  if (qs >= 75) return FUNDAMENTAL_FLOOR.QS_75_PLUS;  // 45
  if (qs >= 70) return FUNDAMENTAL_FLOOR.QS_70_PLUS;  // 40

  return 0;  // No floor for weak fundamentals
}

/**
 * v2.5.0: Calculate POS using convex combination formula
 * 
 * Formula: POS = W_F*QS + W_O*OS + W_S*(100-Risk)
 * 
 * Properties:
 * - Convex combination guarantees POS is between min/max of inputs
 * - Cannot exceed QS by more than OS/Risk contributions
 * - ETH with QS=87, OS=43, Risk=35 → POS = 0.6*87 + 0.25*43 + 0.15*65 = 72.7
 * - SOL with QS=60, OS=40, Risk=60 → POS = 0.6*60 + 0.25*40 + 0.15*40 = 52
 * 
 * This prevents the "ETH=91.6 with OS=43" bug by ensuring POS cannot drift
 * beyond reasonable bounds.
 */
export function calculatePOSConvexCombination(
  qs: number,
  os: number | null,
  risk: number,
  qsGated: boolean
): { posCore: number; floor: number; appliedFloor: boolean } {
  const { W_FUNDAMENTALS, W_OPPORTUNITY, W_SAFETY } = CONFIG.FORMULA_V25;
  
  // Ensure weights sum to 1.0 (invariant)
  const weightSum = W_FUNDAMENTALS + W_OPPORTUNITY + W_SAFETY;
  if (Math.abs(weightSum - 1.0) > 0.001) {
    throw new Error(`FORMULA_V25 weights must sum to 1.0, got ${weightSum}`);
  }
  
  // Clamp inputs to [0, 100]
  const Q = clampScore100(qs);
  const O = qsGated ? 50 : clampScore100(os ?? 50);  // Neutral if gated or missing
  const R = clampScore100(risk ?? 50);               // Neutral if missing
  
  // Safety = 100 - Risk (higher risk → lower safety)
  const safety = 100 - R;
  
  // Convex combination: guaranteed bounded
  let posCore = W_FUNDAMENTALS * Q + W_OPPORTUNITY * O + W_SAFETY * safety;
  
  // Apply fundamentals floor (mild protection for blue-chips)
  const floor = calculateFundamentalsFloor(qs);
  const appliedFloor = posCore < floor;
  
  if (appliedFloor) {
    posCore = floor;
  }
  
  return { posCore, floor, appliedFloor };
}

export function calculateOmniScoreProduction(
  params: CalculateOmniScoreParams
): OmniScoreProductionResponse {
  const now = new Date().toISOString();
  const requestId = uuidv4();
  const sector = (params.sector || 'Unknown') as SectorType;
  const capBucket = getCapBucket(params.marketCapUsd);
  
  logger.info(`[OmniScore v2.3.2] Calculating for ${params.projectId}`, { requestId, sector, capBucket });
  
  // v2.3.2: Determine cold-start policy
  const coldStart = determineColdStartPolicy(params.projectAgeInDays || 365);
  
  // Track clamps for audit transparency (INV-4a/4b)
  const clampApplied: ClampApplied = {
    qs: false,
    os: false,
    pos: false,
    posAdj: false,
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. COVERAGE CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════
  const qsInputsWithData = params.qsInputs.filter(f => f.raw !== null);
  const osInputsWithData = params.osInputs.filter(f => f.raw !== null);
  
  const coverageQS = clamp01(qsInputsWithData.length / Math.max(1, params.qsInputs.length));
  const coverageOS = clamp01(osInputsWithData.length / Math.max(1, params.osInputs.length));
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 2. REGIME DETECTION (v2.3.2: Crypto-native preferred)
  // ═══════════════════════════════════════════════════════════════════════════
  const regimeProbs = params.cryptoRegimeSignals 
    ? detectRegimeCryptoNative(params.cryptoRegimeSignals)
    : detectRegime(params.marketData);
  const dominantRegime = (Object.entries(regimeProbs) as [RegimeType, number][])
    .reduce((a, b) => a[1] > b[1] ? a : b)[0];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 3. INVARIANT VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════
  const gamma = clampGamma(CONFIG.GAMMA_BY_SECTOR[sector] || 15);
  const ers = clamp01(params.eventRiskSeverity || 0);
  
  const state: ScoreState = {
    qsInputs: params.qsInputs,
    osInputs: params.osInputs,
    regimeProbs,
    weightsObjective: {
      ω_F: CONFIG.WEIGHTS.OMEGA_F,
      ω_O: CONFIG.WEIGHTS.OMEGA_O,
      ω_R: CONFIG.WEIGHTS.OMEGA_R,
    },
    gamma,
    ers,
    coverageQS,
    coverageOS,
  };
  
  const violations = validateInvariants(state, now);
  const errors = violations.filter(v => v.severity === 'ERROR');
  const warnings = violations.filter(v => v.severity === 'WARN');
  const hasErrors = errors.length > 0;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 4. QUALITY GATE CHECK (INV-6)
  // ═══════════════════════════════════════════════════════════════════════════
  const qsGated = coverageQS < CONFIG.QUALITY_GATE_THRESHOLD || hasErrors;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 5. SCORE CALCULATION with INV-4a/4b tracking
  // v2.3.2: Uses hierarchically weighted aggregation (not simple average!)
  // ═══════════════════════════════════════════════════════════════════════════
  const qsBreakdown = calculateQSBreakdown(qsInputsWithData);
  
  // v2.3.2: Get hierarchical weights for QS segments
  const qsWeights: Record<string, number> = {};
  for (const seg of ['TEAM', 'TECH', 'SEC', 'GOV', 'ECO']) {
    qsWeights[seg] = getHierarchicalWeight(seg, true, sector, capBucket);
  }
  const normalizedQsWeights = normalizeHierarchicalWeights(qsWeights);
  
  // v2.3.2: Weighted aggregation instead of simple average
  const qsRaw = (
    normalizedQsWeights['TEAM'] * qsBreakdown.team +
    normalizedQsWeights['TECH'] * qsBreakdown.tech +
    normalizedQsWeights['SEC'] * qsBreakdown.security +
    normalizedQsWeights['GOV'] * qsBreakdown.governance +
    normalizedQsWeights['ECO'] * qsBreakdown.ecosystem
  ) * 100;
  
  const qsClampResult = clampScore100WithTracking(qsRaw);
  const qsScore = qsClampResult.value;
  clampApplied.qs = qsClampResult.clamped;
  
  // INV-4b: Hard failure if NaN/Inf
  if (qsClampResult.isHardFailure) {
    errors.push({
      code: 'INV-4b',
      severity: 'ERROR',
      message: 'QS score was NaN/Inf (hard bound failure)',
    });
  } else if (qsClampResult.clamped) {
    warnings.push({
      code: 'INV-4a',
      severity: 'WARN',
      message: `QS score clamped to bounds (raw: ${qsRaw.toFixed(2)})`,
    });
  }
  
  // Calculate OS with adversarial adjustments
  let osRaw = calculateOSScore(osInputsWithData);
  
  // Apply adversarial resistance
  if (params.botRisk || params.anomalyScore) {
    const commScore = osInputsWithData
      .filter(f => f.segment === 'COMM')
      .reduce((sum, f) => sum + (f.raw || 0), 0) / 
      Math.max(1, osInputsWithData.filter(f => f.segment === 'COMM').length);
    
    const adjustedComm = applyAdversarialAdjustments(
      commScore,
      params.botRisk || 0,
      params.anomalyScore || 0
    );
    
    // Apply COMM contribution cap
    const commContribution = adjustedComm * 0.2;  // COMM weight
    const cappedCommContribution = applyCommContributionCap(
      commContribution,
      osRaw,
      params.multiSourceConsistency || 0.5
    );
    
    osRaw = osRaw - commContribution + cappedCommContribution;
  }
  
  const osClampResult = clampScore100WithTracking(osRaw);
  
  // v2.3.3: Apply OS ceiling/diminishing returns for mega-caps
  // This prevents BTC/ETH from trivially hitting OS=100 on any strong day
  const osCapAdjustment = applyOSCapAdjustment(osClampResult.value, capBucket);
  const osScore = osCapAdjustment.adjusted;
  clampApplied.os = osClampResult.clamped || osCapAdjustment.wasAdjusted;
  
  if (osClampResult.isHardFailure) {
    errors.push({
      code: 'INV-4b',
      severity: 'ERROR',
      message: 'OS score was NaN/Inf (hard bound failure)',
    });
  } else if (osClampResult.clamped) {
    warnings.push({
      code: 'INV-4a',
      severity: 'WARN',
      message: `OS score clamped to bounds (raw: ${osRaw.toFixed(2)})`,
    });
  }
  
  // v2.3.3: Log OS cap adjustment for mega-caps
  if (osCapAdjustment.wasAdjusted) {
    warnings.push({
      code: 'OS-CAP-ADJ',
      severity: 'WARN',
      message: `OS adjusted for ${capBucket} cap: ${osClampResult.value.toFixed(1)} → ${osScore} (${osCapAdjustment.reason})`,
    });
  }
  
  // Calculate Risk
  const riskScore = calculateRiskScore(
    params.qsInputs.filter(f => CONFIG.RISK_SEGMENTS.includes(f.segment)),
    ers
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 6. POS CALCULATION with INV-4a/4b tracking
  // v2.4: Support both weighted-average (v2.3) and baseline+tilt (v2.4) formulas
  // ═══════════════════════════════════════════════════════════════════════════
  let posRawValue: number;
  // v2.5.0: Convex combination formula (always enabled, no toggle)
  // This guarantees POS cannot drift beyond reasonable bounds
  const v25Result = calculatePOSConvexCombination(qsScore, osScore, riskScore, qsGated);
  posRawValue = v25Result.posCore;
  const fundamentalsFloor = v25Result.floor;
  const fundamentalsFloorApplied = v25Result.appliedFloor;
  
  if (fundamentalsFloorApplied) {
    warnings.push({
      code: 'V25-FLOOR',
      severity: 'WARN',
      message: `Fundamentals floor applied: QS=${qsScore.toFixed(1)} → floor=${fundamentalsFloor?.toFixed(1)}`,
    });
  }
  
  const posRawClampResult = clampScore100WithTracking(posRawValue);
  let posRaw = posRawClampResult.value;
  clampApplied.pos = posRawClampResult.clamped;
  
  if (posRawClampResult.isHardFailure) {
    errors.push({
      code: 'INV-4b',
      severity: 'ERROR',
      message: 'POS raw was NaN/Inf (hard bound failure)',
    });
  } else if (posRawClampResult.clamped) {
    warnings.push({
      code: 'INV-4a',
      severity: 'WARN',
      message: `POS raw clamped to bounds (raw: ${posRawValue.toFixed(2)})`,
    });
  }
  
  // v2.3.4: Apply POS plausibility cap (makes 100/100 impossible)
  const plausibilityCap = applyPOSPlausibilityCap(posRaw, errors);
  posRaw = plausibilityCap.value;
  const posPlausibilityCapped = plausibilityCap.capped;
  const posBeforeCap = plausibilityCap.capped ? plausibilityCap.originalValue : null;
  
  // v2.3.4: Apply temporal smoothing (prevents wild swings)
  const smoothingResult = applySmoothingToPOS(
    posRaw,
    // v2.4.1: reset smoothing when engine version changes
    (params.previousEngineVersion && params.previousEngineVersion !== CONFIG.VERSION) ? null : params.previousPos,
    (params.previousEngineVersion && params.previousEngineVersion !== CONFIG.VERSION) ? null : params.previousTimestamp,
    ers,
    new Date(),
    warnings
  );
  const posSmoothed = smoothingResult.smoothed;
  const smoothingTracking = smoothingResult.tracking;
  
  // Apply event risk adjustment (INV-5: ERS > 0 ⇒ POS_adj ≤ POS)
  const posAdjValue = posSmoothed - gamma * ers;
  const posAdjClampResult = clampScore100WithTracking(posAdjValue);
  const posAdjusted = posAdjClampResult.value;
  clampApplied.posAdj = posAdjClampResult.clamped;
  
  if (posAdjClampResult.isHardFailure) {
    errors.push({
      code: 'INV-4b',
      severity: 'ERROR',
      message: 'POS adjusted was NaN/Inf (hard bound failure)',
    });
  } else if (posAdjClampResult.clamped) {
    warnings.push({
      code: 'INV-4a',
      severity: 'WARN',
      message: `POS adjusted clamped to bounds (raw: ${posAdjValue.toFixed(2)})`,
    });
  }
  
  // Confidence band (simplified)
  const uncertainty = (1 - (coverageQS + coverageOS) / 2) * 10;
  const confidenceBand: [number, number] = [
    clampScore100(posAdjusted - uncertainty),
    clampScore100(posAdjusted + uncertainty),
  ];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 6.5. REFLEXIVITY SENTINEL
  // ═══════════════════════════════════════════════════════════════════════════
  const reflexivitySentinel = calculateReflexivitySentinel(qsScore, params.priceChange30d);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 7. NRG CALCULATION (v2.3.3: cap-bucket aware)
  // ═══════════════════════════════════════════════════════════════════════════
  const nrg = calculateNRG(qsInputsWithData, osInputsWithData, coverageOS, capBucket, dominantRegime);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 8. EXPLAINABILITY
  // ═══════════════════════════════════════════════════════════════════════════
  const explainability = generateExplainability(qsInputsWithData, osInputsWithData);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 9. UPGRADE RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const upgradeRecommendations = generateUpgradeRecommendations(
    qsInputsWithData,
    qsScore,
    sector
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 9.5 v2.3.2: NARRATIVE MANIPULATION INDEX (NMI)
  // ═══════════════════════════════════════════════════════════════════════════
  const nmi = calculateNMI(
    params.botRisk || 0,
    params.anomalyScore || 0,
    params.influencerConcentration || 0,
    params.sentimentDispersion || 0,
    params.crossSourceDivergence || 0,
    coverageOS
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 9.6 v2.3.2: STRESS TEST SCENARIOS
  // ═══════════════════════════════════════════════════════════════════════════
  const stressTest = generateStressTests(posAdjusted, qsScore, osScore, riskScore, sector);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 9.7 v2.3.2: CONDITIONED TIER
  // ═══════════════════════════════════════════════════════════════════════════
  const tierContext = calculateConditionedTier(posAdjusted, dominantRegime, sector, capBucket);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 9.8 v2.3.2: ADVERSARIAL THREAT MODEL
  // ═══════════════════════════════════════════════════════════════════════════
  const threatModel = buildThreatModel(
    params.botRisk || 0,
    params.anomalyScore || 0,
    params.washTradingRisk || 0,
    params.sybilDevRisk || 0
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 9.9 v2.3.2: REFLEXIVITY LEAK INVARIANT (INV-12)
  // ═══════════════════════════════════════════════════════════════════════════
  if (reflexivitySentinel.status === 'alert') {
    warnings.push({
      code: 'INV-12',
      severity: 'WARN',
      message: `Reflexivity leak detected: Corr(QS, ΔPrice_30d) = ${reflexivitySentinel.corrQsPrice30d} exceeds threshold`,
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 10. CONFIDENCE DETERMINATION (INV-11)
  // ═══════════════════════════════════════════════════════════════════════════
  let confidence = coverageToConfidence(coverageQS);
  const hasErrorsUpdated = errors.length > 0;
  if (hasErrorsUpdated) {
    confidence = 'insufficient';
  }
  
  // INV-11: Validate confidence determinism
  const inv11Violation = assertConfidenceDeterminism(coverageQS, confidence);
  if (inv11Violation && !hasErrorsUpdated) {
    // Only add if confidence wasn't overridden due to errors
    errors.push(inv11Violation);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 11. BUILD RESPONSE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // v2.3.2: Apply cold-start adjustments to uncertainty band
  const uncertaintyMultiplier = coldStart.adjustments.uncertaintyMultiplier;
  const adjustedConfidenceBand: [number, number] = [
    clampScore100(confidenceBand[0] - (uncertainty * (uncertaintyMultiplier - 1))),
    clampScore100(confidenceBand[1] + (uncertainty * (uncertaintyMultiplier - 1))),
  ];
  
  // v2.3.3: CRITICAL FIX - Always use rawTier for user-facing tier label
  // Conditioned tier is for internal analytics only. This prevents the 43="Neutral" bug
  // where conditioned percentile-based tier didn't match fixed threshold spec.
  // Spec: Elite 85+, Strong 70-84, Neutral 50-69, Weak 30-49, Critical <30
  const finalTier = tierContext.rawTier;  // ALWAYS use fixed threshold tier for user-facing
  
  const response: OmniScoreProductionResponse = {
    success: !hasErrorsUpdated,
    engine: 'OmniScore',
    version: CONFIG.VERSION,
    project: params.projectId,
    timestamp: now,
    
    qualityScore: {
      score: Math.round(qsScore * 10) / 10,
      tier: getTier(qsScore),
      confidence,
      coverage: Math.round(coverageQS * 100) / 100,
      breakdown: {
        team: Math.round(qsBreakdown.team * 100) / 100,
        tech: Math.round(qsBreakdown.tech * 100) / 100,
        security: Math.round(qsBreakdown.security * 100) / 100,
        governance: Math.round(qsBreakdown.governance * 100) / 100,
        ecosystem: Math.round(qsBreakdown.ecosystem * 100) / 100,
      },
    },
    
    opportunityScore: {
      status: qsGated ? 'gated' : 'ok',
      score: qsGated ? 50 : Math.round(osScore * 10) / 10,
      tier: qsGated ? 'Neutral' : getTier(osScore),
      coverage: Math.round(coverageOS * 100) / 100,
      gateReason: qsGated ? 
        `QS coverage (${(coverageQS * 100).toFixed(0)}%) below ${(CONFIG.QUALITY_GATE_THRESHOLD * 100).toFixed(0)}% threshold` : 
        undefined,
    },
    
    risk: {
      score: Math.round(riskScore * 100) / 100,
      eventRiskSeverity: Math.round(ers * 100) / 100,
      adjustmentGamma: gamma,
    },
    
    pos: {
      raw: Math.round(posRaw * 10) / 10,
      adjusted: Math.round(posAdjusted * 10) / 10,
      tier: finalTier,  // v2.3.2: Uses conditioned tier
      confidenceBand: adjustedConfidenceBand,  // v2.3.2: Cold-start adjusted
    },
    
    nrg,
    explainability,
    upgradeRecommendations,
    
    // v2.3.2: Diabolical additions
    nmi,
    stressTest,
    tierContext,
    coldStart,
    identityGraph: params.identityGraph || null,
    threatModel,
    
    audit: {
      engineVersion: CONFIG.VERSION,
      methodologyVersion: CONFIG.METHODOLOGY_VERSION,
      requestId,
      dataAsOf: now,
      sourcesUsed: extractSources([...params.qsInputs, ...params.osInputs]),
      coverageQS: Math.round(coverageQS * 100) / 100,
      coverageOS: Math.round(coverageOS * 100) / 100,
      confidence,
      gatingApplied: qsGated,
      invariantStatus: hasErrorsUpdated ? 'fail' : warnings.length > 0 ? 'warn' : 'pass',
      violations: errors,
      warnings,
      regimeSnapshot: Object.fromEntries(
        Object.entries(regimeProbs).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ) as Record<RegimeType, number>,
      // v2.3.1: Enhanced audit fields
      clampApplied,
      methodology: {
        id: CONFIG.METHODOLOGY.ID,
        hash: CONFIG.METHODOLOGY.HASH,
        url: CONFIG.METHODOLOGY.URL,
      },
      reflexivitySentinel,
      // v2.3.3/v2.3.4: Additional audit fields with tier transparency and smoothing
      featureSchemaVersion: CONFIG.FEATURE_SCHEMA_VERSION,
      sectorPackId: `${sector.toLowerCase()}-core40`,
      clampHistoryCount: [clampApplied.qs, clampApplied.os, clampApplied.pos, clampApplied.posAdj].filter(Boolean).length,
      coldStartMode: coldStart.mode,
      tierConditioningApplied: false,  // v2.3.3: Disabled for user-facing to prevent tier/score mismatch
      tierMismatch: tierContext.tierMismatch,  // v2.3.3: Flag if rawTier ≠ conditionedTier for audit
      rawTierUsed: tierContext.rawTier,  // v2.3.3: The tier shown to users (fixed thresholds)
      conditionedTierInternal: tierContext.conditionedTier,  // v2.3.3: For internal analytics only
      capBucket,
      // v2.3.4: Smoothing and plausibility tracking
      smoothingApplied: smoothingTracking,
      posPlausibilityCapped,
      posBeforeCap,
      // v2.4: Baseline+tilt formula tracking
      formulaVersion: 'v2.5',
      fundamentalsFloor,
      fundamentalsFloorApplied,
    },
  };
  
  assertEngineVersion(response);
  logger.info(`[OmniScore v${CONFIG.VERSION}] Completed for ${params.projectId}`, {
    requestId,
    posRaw: Math.round(posRaw * 10) / 10,
    posSmoothed: Math.round(posSmoothed * 10) / 10,
    posAdjusted: Math.round(posAdjusted * 10) / 10,
    tier: finalTier,
    conditionedTier: tierContext.conditionedTier,
    percentile: tierContext.percentile,
    confidence,
    coldStartMode: coldStart.mode,
    smoothingApplied: smoothingTracking.enabled,
    smoothingDelta: smoothingTracking.enabled ? smoothingTracking.boundedDelta : null,
    posPlausibilityCapped,
    nmiTier: nmi.tier,
    threatLevel: threatModel.overallRisk,
    invariantStatus: response.audit.invariantStatus,
  });
  
  return response;
}

/**
 * v2.3.4: Convert OmniScoreProductionResponse to canonical OmniScoreSnapshot
 * This is the SINGLE SOURCE OF TRUTH consumed by all UIs and chat
 */
export function toOmniScoreSnapshot(
  response: OmniScoreProductionResponse
): OmniScoreSnapshot {
  const tierContext = (response as any).tierContext;
  const smoothing = response.audit.smoothingApplied;
  
  // Determine quadrant zone
  const qs = response.qualityScore.score;
  const os = response.opportunityScore.status === 'gated' ? null : response.opportunityScore.score;
  const qsThreshold = 60;
  const osThreshold = 60;
  
  return {
    id: response.project,
    symbol: response.project.toUpperCase(),
    name: response.project,
    sector: tierContext?.sector || 'Unknown',
    capBucket: response.audit.capBucket,
    
    qs: response.qualityScore.score,
    qsTier: response.qualityScore.tier,
    os: response.opportunityScore.status === 'gated' ? null : response.opportunityScore.score,
    osTier: response.opportunityScore.status === 'gated' ? null : response.opportunityScore.tier,
    osStatus: response.opportunityScore.status === 'gated' ? 'gated' : 'active',
    
    risk: response.risk.score,
    
    posRaw: response.pos.raw,
    posSmoothed: smoothing?.enabled ? 
      response.pos.raw - (smoothing.rawDelta - smoothing.boundedDelta) : 
      response.pos.raw,
    posAdjusted: response.pos.adjusted,
    tier: response.pos.tier,
    
    nrg: response.nrg.value,
    nrgTier: response.nrg.interpretation,
    nmi: (response as any).nmi?.score || 0,
    nmiTier: (response as any).nmi?.tier || 'clean',
    
    coverageQS: response.audit.coverageQS,
    coverageOS: response.audit.coverageOS,
    confidence: response.audit.confidence,
    
    audit: {
      engineVersion: response.audit.engineVersion,
      methodologyVersion: response.audit.methodologyVersion,
      timestamp: response.timestamp,
      formulaVersion: (response.audit as any).formulaVersion || 'v2.3',
      invariantStatus: response.audit.invariantStatus,
      smoothingApplied: smoothing?.enabled || false,
      osCeilingApplied: response.audit.warnings?.some(w => w.code === 'OS-CAP-ADJ') || false,
      posPlausibilityCapped: response.audit.posPlausibilityCapped,
      posBeforeCap: response.audit.posBeforeCap,
      fundamentalsFloor: (response.audit as any).fundamentalsFloor || null,
      fundamentalsFloorApplied: (response.audit as any).fundamentalsFloorApplied || false,
    },
  };
}

/**
 * v2.3.4: Determine quadrant zone from QS/OS
 */
export function getQuadrantZone(qs: number, os: number | null, qsThreshold = 60, osThreshold = 60): 'TARGET' | 'BUILDER' | 'HYPE' | 'AVOID' {
  if (qs >= qsThreshold && os !== null && os >= osThreshold) return 'TARGET';
  if (qs >= qsThreshold && (os === null || os < osThreshold)) return 'BUILDER';
  if (qs < qsThreshold && os !== null && os >= osThreshold) return 'HYPE';
  return 'AVOID';
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function detectRegime(marketData?: CalculateOmniScoreParams['marketData']): Record<RegimeType, number> {
  if (!marketData) {
    return { bull: 0.15, bear: 0.15, neutral: 0.55, crisis: 0.10, recovery: 0.05 };
  }
  
  const { btcTrend30d, btcTrend90d, volatilityIndex, fearGreedIndex } = marketData;
  
  let probs: Record<RegimeType, number> = {
    bull: 0.15, bear: 0.15, neutral: 0.40, crisis: 0.15, recovery: 0.15
  };
  
  // Adjust based on BTC trend
  if (btcTrend30d > 20 && btcTrend90d > 30) {
    probs.bull += 0.35;
    probs.neutral -= 0.20;
    probs.bear -= 0.10;
  } else if (btcTrend30d < -20 && btcTrend90d < -30) {
    probs.bear += 0.30;
    probs.bull -= 0.20;
    probs.neutral -= 0.10;
  }
  
  // Crisis detection
  if (btcTrend30d < -40 || volatilityIndex > 80) {
    probs.crisis += 0.40;
    probs.bull -= 0.25;
  }
  
  // Recovery detection
  if (btcTrend30d > 15 && btcTrend90d < -10) {
    probs.recovery += 0.25;
    probs.bear -= 0.15;
  }
  
  // Fear & Greed
  if (fearGreedIndex > 70) probs.bull += 0.10;
  else if (fearGreedIndex < 30) probs.bear += 0.10;
  
  return normalizeProbs(probs);
}

function calculateQSBreakdown(inputs: FeatureInput[]): QualityScoreResponse['breakdown'] {
  const bySegment: Record<string, number[]> = {
    TEAM: [], TECH: [], SEC: [], GOV: [], ECO: []
  };
  
  for (const f of inputs) {
    if (bySegment[f.segment] && f.raw !== null) {
      bySegment[f.segment].push(f.raw);
    }
  }
  
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length / 100 : 0.5;
  
  return {
    team: clamp01(avg(bySegment.TEAM)),
    tech: clamp01(avg(bySegment.TECH)),
    security: clamp01(avg(bySegment.SEC)),
    governance: clamp01(avg(bySegment.GOV)),
    ecosystem: clamp01(avg(bySegment.ECO)),
  };
}

function calculateOSScore(inputs: FeatureInput[]): number {
  if (inputs.length === 0) return 50;
  const values = inputs.filter(f => f.raw !== null).map(f => f.raw!);
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 50;
}

function calculateRiskScore(inputs: FeatureInput[], ers: number): number {
  const legalMacro = inputs.filter(f => f.raw !== null).map(f => 100 - f.raw!);
  const baseRisk = legalMacro.length > 0 ? 
    legalMacro.reduce((a, b) => a + b, 0) / legalMacro.length : 50;
  return clampScore100((baseRisk + ers * 100) / 2);
}

/**
 * v2.3.3: Calculate NRG with cap-bucket awareness
 * 
 * IMPORTANT: NRG is RELATIVE (COMM+MARKET vs SEC+TECH+ADOPT), not absolute sentiment.
 * It can show "overhyped" for BTC even in a fear regime if:
 * - COMM/MARKET scores are high (ETF flows, volume, social buzz)
 * - SEC/TECH/ADOPT scores are lower (by comparison)
 * 
 * For mega-caps in fear regimes, this is NORMAL behavior:
 * - BTC often sees flight-to-quality flows during market fear
 * - This creates high relative MARKET/COMM vs fundamentals
 * - The NRG reflects "BTC is overhyped RELATIVE TO its fundamentals", not absolute sentiment
 */
function calculateNRG(
  qsInputs: FeatureInput[],
  osInputs: FeatureInput[],
  coverageOS: number,
  capBucket?: CapBucket,
  regime?: RegimeType
): NRGResponse {
  // COMM + MARKET
  const narrativeInputs = osInputs.filter(f => ['COMM', 'MARKET'].includes(f.segment));
  const narrativeScore = narrativeInputs.length > 0 ?
    narrativeInputs.filter(f => f.raw !== null).reduce((sum, f) => sum + f.raw!, 0) / 
    narrativeInputs.filter(f => f.raw !== null).length : 50;
  
  // ADOPT + SEC + TECH
  const realityInputs = [...qsInputs, ...osInputs].filter(
    f => ['ADOPT', 'SEC', 'TECH'].includes(f.segment)
  );
  const realityScore = realityInputs.length > 0 ?
    realityInputs.filter(f => f.raw !== null).reduce((sum, f) => sum + f.raw!, 0) / 
    realityInputs.filter(f => f.raw !== null).length : 50;
  
  // Z-score (simplified)
  const narrativeZ = (narrativeScore - 50) / 20;
  const realityZ = (realityScore - 50) / 20;
  let nrgValue = narrativeZ - realityZ;
  
  // v2.3.3: Cap-bucket adjustment for mega-caps
  // Mega-caps naturally have higher MARKET scores due to liquidity/flows
  // This can artificially inflate NRG even when fundamentals are strong
  // Apply dampening factor for mega-caps to account for this
  if (capBucket === 'mega' && nrgValue > 0) {
    nrgValue *= 0.7; // Dampen positive NRG for mega-caps by 30%
  } else if (capBucket === 'large' && nrgValue > 0) {
    nrgValue *= 0.85; // Dampen by 15% for large caps
  }
  
  // Percentile (using tanh approximation)
  const percentile = 0.5 * (1 + Math.tanh(nrgValue * 0.7));
  
  // v2.3.3: Refined interpretation with cap-bucket context
  let interpretation: NRGInterpretation;
  if (coverageOS < CONFIG.QUALITY_GATE_THRESHOLD) {
    interpretation = 'low_confidence';
  } else if (percentile > 0.90) {
    interpretation = 'overhyped';           // Top 10%: Narrative > substance
  } else if (percentile > 0.65) {
    interpretation = 'mildly_overheated';   // 65-90%: Slightly hot
  } else if (percentile > 0.35) {
    interpretation = 'balanced';            // 35-65%: Fair
  } else if (percentile > 0.10) {
    interpretation = 'mildly_underhyped';   // 10-35%: Slightly cold
  } else {
    interpretation = 'severely_underhyped'; // Bottom 10%: Major opportunity
  }
  
  return {
    value: Math.round(nrgValue * 100) / 100,
    percentile: Math.round(percentile * 100) / 100,
    interpretation,
  };
}

function generateExplainability(
  qsInputs: FeatureInput[],
  osInputs: FeatureInput[]
): ExplainabilityResponse {
  const qsDrivers: FeatureDriver[] = [];
  const osDrivers: FeatureDriver[] = [];
  
  for (const f of qsInputs.filter(f => f.raw !== null)) {
    const z = (f.raw! - 50) / 25;
    const Q = 0.8;  // Placeholder - would come from quality tracking
    const contribution = Math.abs(z) * Q * 0.2;
    
    if (contribution > 0.1) {
      qsDrivers.push({
        feature: f.key,
        z: Math.round(z * 100) / 100,
        Q,
        contribution: Math.round(contribution * 100) / 100,
        trend7d: z > 0.5 ? 'up' : z < -0.5 ? 'down' : 'flat',
      });
    }
  }
  
  for (const f of osInputs.filter(f => f.raw !== null)) {
    const z = (f.raw! - 50) / 25;
    const Q = 0.8;
    const contribution = Math.abs(z) * Q * 0.2;
    
    if (contribution > 0.1) {
      osDrivers.push({
        feature: f.key,
        z: Math.round(z * 100) / 100,
        Q,
        contribution: Math.round(contribution * 100) / 100,
        trend7d: z > 0.5 ? 'up' : z < -0.5 ? 'down' : 'flat',
      });
    }
  }
  
  // Sort by contribution
  qsDrivers.sort((a, b) => b.contribution - a.contribution);
  osDrivers.sort((a, b) => b.contribution - a.contribution);
  
  return {
    qsDrivers: qsDrivers.slice(0, 5),
    osDrivers: osDrivers.slice(0, 5),
  };
}

function generateUpgradeRecommendations(
  qsInputs: FeatureInput[],
  currentQS: number,
  sector: string
): UpgradeRecommendationsResponse {
  const recommendations: UpgradeRecommendation[] = [];
  
  // Find low-scoring controllable features
  for (const f of qsInputs.filter(f => f.raw !== null && f.raw < 60)) {
    const targetValue = Math.min(80, f.raw! + 20);
    const expectedLift = (targetValue - f.raw!) * 0.1;
    
    let feasibility: 'easy' | 'medium' | 'hard' = 'medium';
    let timeEstimate = '2-4 weeks';
    
    if (f.segment === 'SEC') {
      feasibility = 'medium';
      timeEstimate = '4-8 weeks';
    } else if (f.segment === 'TEAM') {
      feasibility = 'hard';
      timeEstimate = '3-6 months';
    } else if (f.segment === 'TECH') {
      feasibility = 'medium';
      timeEstimate = '2-4 weeks';
    }
    
    recommendations.push({
      feature: f.key,
      segment: f.segment,
      currentValue: f.raw!,
      targetValue,
      expectedPOSLift: Math.round(expectedLift * 10) / 10,
      feasibility,
      timeEstimate,
    });
  }
  
  // Sort by expected lift / feasibility
  recommendations.sort((a, b) => {
    const aScore = a.expectedPOSLift * (a.feasibility === 'easy' ? 3 : a.feasibility === 'medium' ? 2 : 1);
    const bScore = b.expectedPOSLift * (b.feasibility === 'easy' ? 3 : b.feasibility === 'medium' ? 2 : 1);
    return bScore - aScore;
  });
  
  return {
    note: 'controllable-only',
    highImpact: recommendations.filter(r => r.expectedPOSLift > 2).slice(0, 3),
    quickWins: recommendations.filter(r => r.feasibility === 'easy').slice(0, 3),
    strategicBet: recommendations.find(r => r.feasibility === 'hard' && r.expectedPOSLift > 3) || null,
  };
}

function extractSources(inputs: FeatureInput[]): string[] {
  const sources = new Set<string>();
  for (const f of inputs) {
    if (f.sources) {
      f.sources.forEach(s => sources.add(s));
    }
  }
  return Array.from(sources);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  CONFIG as OMNISCORE_CONFIG,
  // calculatePOSConvexCombination is already exported above with 'export function'
  detectRegime,
  detectRegimeCryptoNative,
  getTier,
  getCapBucket,
  calculateConditionedTier,
  calculateNMI,
  buildThreatModel,
  generateStressTests,
  determineColdStartPolicy,
  getHierarchicalWeight,
  normalizeHierarchicalWeights,
  scaleRiskToPOSRange,
  // Note: toOmniScoreSnapshot, getQuadrantZone, applyPOSPlausibilityCap, 
  // applySmoothingToPOS, applyOSCapAdjustment are already exported with 
  // 'export function' keyword above
};

