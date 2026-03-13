/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📋 OMNISCORE v3.0 TYPE DEFINITIONS                                        ║
 * ║                                                                               ║
 * ║   Canonical types for the entire OmniScore v3.0 system.                      ║
 * ║   All other modules import from here.                                        ║
 * ║                                                                               ║
 * ║   ⚠️  HARD RULE: UI/Chat may ONLY use fields from OmniScoreSnapshot.         ║
 * ║       No price, Fear & Greed, etc. unless explicitly in snapshot.            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TIER SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

export type TierLabel = 'Elite' | 'Strong' | 'Neutral' | 'Weak' | 'Critical';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient';

// ═══════════════════════════════════════════════════════════════════════════════
// LEGITIMACY STATUS (Simplified for UI)
// ═══════════════════════════════════════════════════════════════════════════════

/** 
 * LEGIT = passed all checks
 * WATCH = passed but has soft warnings
 * NOT_LEGIT = failed hard checks
 * INSUFFICIENT_DATA = cannot determine
 */
export type LegitimacyLabel = 'LEGIT' | 'WATCH' | 'NOT_LEGIT' | 'INSUFFICIENT_DATA';

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRITY FLAG (for manipulation detection)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clean = no manipulation signals
 * Suspicious = minor anomalies detected
 * Manipulated = clear manipulation patterns
 * Severe = extreme manipulation, possibly fraudulent
 * Gated = score not produced due to data/legitimacy issues
 */
export type IntegrityFlag = 'Clean' | 'Suspicious' | 'Manipulated' | 'Severe' | 'Gated';

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/** QS Segments (fundamentals, slow-moving) */
export type QSSegment = 'TEAM' | 'TECH' | 'SEC' | 'GOV' | 'ECO';

/** OS Segments (opportunity, fast-moving) */
export type OSSegment = 'MARKET' | 'TOKEN' | 'VAL' | 'ADOPT' | 'COMM';

/** 
 * Risk Segments (expanded for crypto-specific risks)
 * 
 * LEGAL      - Regulatory and legal risks
 * MACRO      - Macroeconomic/systemic risks
 * CENTRAL    - Centralization/decentralization risk (validators, governance)
 * STABILITY  - Network stability risk (outages, congestion)
 * CONC       - Concentration risk (whale holdings, top holder %)
 * UNLOCK     - Unlock/vesting schedule risk
 * LIQUIDITY  - Liquidity fragility risk (thin books, slippage)
 * CONTRACT   - Smart contract risk (if applicable)
 */
export type RiskSegment = 
  | 'LEGAL' 
  | 'MACRO' 
  | 'CENTRAL' 
  | 'STABILITY' 
  | 'CONC' 
  | 'UNLOCK' 
  | 'LIQUIDITY' 
  | 'CONTRACT';

/** All segments */
export type Segment = QSSegment | OSSegment | RiskSegment;

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export type SectorType = 'L1' | 'L2' | 'DeFi' | 'Infrastructure' | 'AI' | 'Meme' | 'Gaming' | 'Unknown';

export type CapBucket = 'mega' | 'large' | 'mid' | 'small' | 'micro';

// ═══════════════════════════════════════════════════════════════════════════════
// DATA SOURCES
// ═══════════════════════════════════════════════════════════════════════════════

export type DataSourceType = 'api' | 'blockchain' | 'derived' | 'estimate';

/** Known data providers */
export type DataProvider = 
  | 'coingecko'
  | 'coinmarketcap'
  | 'defillama'
  | 'github'
  | 'etherscan'
  | 'solscan'
  | 'dune'
  | 'messari'
  | 'santiment'
  | 'glassnode'
  | 'blockchain_rpc'
  | 'derived';

export interface DataSource {
  id: string;
  type: DataSourceType;
  reliability: number;  // 0-1
  ttlSeconds: number;
  requires?: string[];  // For derived sources
  banned?: boolean;     // Estimates are banned from scores
}

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  📊 DATA POINT WITH FULL PROVENANCE                                           ║
 * ║                                                                               ║
 * ║  Every fetched datapoint MUST include complete provenance metadata.          ║
 * ║  No defaults-to-zero allowed. If we don't have it, value = null.            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
export interface DataPoint {
  /** Metric key (e.g., 'price_usd', 'github_commits_30d') */
  key: string;
  
  /** Segment this data belongs to */
  segment: Segment;
  
  /** Raw value from source (null if unavailable - NEVER default to 0) */
  raw: number | null;
  
  /** Normalized value 0-100 (calculated after raw is validated) */
  normalized: number | null;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PROVENANCE (required for every datapoint)
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Data provider (e.g., 'coingecko', 'github', 'defillama') */
  source: DataProvider | string;
  
  /** Source type classification */
  sourceType: DataSourceType;
  
  /** When this data was fetched (ISO8601) */
  timestamp: string;
  
  /** Seconds since data was fetched */
  freshnessSeconds: number;
  
  /** Provider trust score (0-1) */
  confidenceSource: number;
  
  /** Is this derived from other values? */
  isDerived: boolean;
  
  /** If derived, what was it derived from? */
  derivedFrom?: string[];
  
  /** Derivation formula (for audit trail) */
  derivationFormula?: string;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // QUALITY FLAGS
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Is this data considered stale? */
  isStale: boolean;
  
  /** TTL for this data type in seconds */
  ttlSeconds: number;
  
  /** Data quality warnings */
  warnings?: string[];
}

/** Legacy alias for backward compatibility */
export interface LegacyDataPoint {
  key: string;
  segment: Segment;
  value: number | null;
  source: string;
  sourceType: DataSourceType;
  fetchedAt: string;
  reliability: number;
  derivedFrom?: string[];
}

/**
 * Feature input for scoring (grouped datapoints by metric category)
 */
export interface FeatureInput {
  /** Category of features */
  category: 'market' | 'onchain' | 'development' | 'tokenomics' | 'social' | 'risk';
  
  /** All datapoints in this category */
  dataPoints: DataPoint[];
  
  /** Category-level coverage (0-1) */
  coverage: number;
  
  /** Category-level reliability (0-1) */
  reliability: number;
  
  /** Timestamp of oldest data in category */
  oldestDataTimestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGITIMACY GATE
// ═══════════════════════════════════════════════════════════════════════════════

export type LegitimacyStatus = 'passed' | 'failed' | 'gated';

export interface LegitimacyHardFails {
  rugPullHistory: boolean;
  activeSecWarning: boolean;
  contractHoneypot: boolean;
  fakeAuditPdf: boolean;
}

export interface LegitimacySoftFails {
  noPublicTeam: boolean;
  lessThan30dOld: boolean;
  lessThan100Holders: boolean;
  washTradingDetected: boolean;
  noAudit: boolean;
}

export interface LegitimacyResult {
  status: LegitimacyStatus;
  hardFails: LegitimacyHardFails;
  softFails: LegitimacySoftFails;
  hardFailCount: number;
  softFailCount: number;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE GATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConfidenceResult {
  level: ConfidenceLevel;
  coverageQS: number;
  coverageOS: number;
  coverageRisk: number;
  overallCoverage: number;
  degraded: boolean;
  gated: boolean;
  missingRequired: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENT SCORES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SegmentScore {
  segment: Segment;
  score: number;        // 0-100
  coverage: number;     // 0-1
  reliability: number;  // 0-1
  dataPoints: DataPoint[];
  missingInputs: string[];
}

export interface QualityScoreResult {
  score: number;
  tier: TierLabel;
  coverage: number;
  segments: Record<QSSegment, SegmentScore>;
  breakdown: {
    team: number;
    tech: number;
    security: number;
    governance: number;
    ecosystem: number;
  };
}

export interface OpportunityScoreResult {
  score: number | null;  // null if gated
  tier: TierLabel | null;
  status: 'active' | 'gated';
  gateReason?: string;
  coverage: number;
  segments: Record<OSSegment, SegmentScore>;
}

export interface RiskScoreResult {
  score: number;        // 0-100, higher = more risk
  tier: TierLabel;
  segments: Record<RiskSegment, SegmentScore>;
  eventRiskSeverity: number;  // 0-1
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEWS (Allocator vs Trader)
// ═══════════════════════════════════════════════════════════════════════════════

export type AllocatorRecommendation = 'accumulate' | 'hold' | 'reduce' | 'avoid';

export type TraderSignal = 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';

export interface AllocatorView {
  recommendation: AllocatorRecommendation;
  timeHorizon: '6-12 months';
  keyMetrics: ['qs', 'risk', 'confidence'];
  hideOS: boolean;
  rationale: string;
}

export interface TraderView {
  signal: TraderSignal;
  timeHorizon: '1-4 weeks';
  keyMetrics: ['os', 'nrg', 'momentum'];
  gateReason?: string;
  rationale: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMOOTHING
// ═══════════════════════════════════════════════════════════════════════════════

export interface SmoothingState {
  projectId: string;
  qs: number;
  os: number | null;
  pos: number;
  risk: number;
  timestamp: Date;
  engineVersion: string;
}

export interface SmoothingResult {
  applied: boolean;
  previousValue: number | null;
  rawValue: number;
  smoothedValue: number;
  delta: number;
  wasLimited: boolean;
  timeSinceLastHours: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuditMetadata {
  engineVersion: string;
  formulaVersion: string;
  methodologyId: string;
  methodologyHash?: string;     // SHA256 hash of methodology spec (optional for legacy)
  buildSha?: string;           // Git commit SHA of the build
  timestamp: string;           // ISO8601
  requestId?: string;
  
  // Calculation audit
  legitimacyChecked: boolean;
  confidenceChecked: boolean;
  smoothingApplied: boolean;
  
  // Data quality
  totalDataPoints: number;
  validDataPoints: number;
  staleDataPoints?: number;
  sourceStaleness?: Record<string, number>;  // source -> hours since last fetch
  missingSources?: string[];                  // Sources we couldn't reach
  
  // Flags
  degraded: boolean;
  gated: boolean;
  gateReason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTITY (Required for all tokens)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TokenIdentity {
  /** Internal identifier */
  id: string;
  /** Trading symbol (e.g., BTC, ETH) */
  symbol: string;
  /** Full name (e.g., Bitcoin, Ethereum) */
  name: string;
  /** Primary chain (e.g., bitcoin, ethereum, solana) */
  chain: string;
  /** Contract address (null for native tokens like BTC) */
  contract: string | null;
  /** Provider IDs for data lookups */
  canonicalProviderIds: {
    coingecko?: string;
    defillama?: string;
    github?: string;
    twitter?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE DRIVERS (Explainability)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScoreDriver {
  /** Metric key (e.g., github_commits_30d) */
  key: string;
  /** Human-readable label */
  label: string;
  /** Raw value from data source */
  raw: number;
  /** Normalized value (0-100) */
  normalized: number;
  /** Weight in segment */
  weight: number;
  /** Contribution to segment score */
  contribution: number;
  /** Direction of impact */
  impact: 'positive' | 'negative' | 'neutral';
}

export interface ScoreDrivers {
  /** Top 3-5 contributors to QS */
  qs: ScoreDriver[];
  /** Top 3-5 contributors to OS (null if OS gated) */
  os: ScoreDriver[] | null;
  /** Top 3-5 contributors to Risk */
  risk: ScoreDriver[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// OMNISCORE SNAPSHOT (CANONICAL OUTPUT - THE ONLY TRUTH)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  🎯 OmniScoreSnapshot - THE CANONICAL OUTPUT                                  ║
 * ║                                                                               ║
 * ║  ⚠️  HARD RULES:                                                              ║
 * ║  1. UI/Chat may ONLY claim numbers present in this snapshot                  ║
 * ║  2. No price, Fear & Greed, BTC trend, etc. unless explicitly included       ║
 * ║  3. If confidence < 40 → posFinal = null, error = INSUFFICIENT_DATA          ║
 * ║  4. If legitimacy = NOT_LEGIT → posFinal = null, gated = true                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
export interface OmniScoreSnapshot {
  // ─────────────────────────────────────────────────────────────────────────────
  // IDENTITY (required, always present)
  // ─────────────────────────────────────────────────────────────────────────────
  identity: TokenIdentity;

  // ─────────────────────────────────────────────────────────────────────────────
  // LEGITIMACY (fraud/manipulation gate)
  // ─────────────────────────────────────────────────────────────────────────────
  legitimacy: LegitimacyLabel;
  legitimacyDetails: LegitimacyResult;

  // ─────────────────────────────────────────────────────────────────────────────
  // CORE SCORES
  // ─────────────────────────────────────────────────────────────────────────────
  /** Quality Score (0-100) - fundamentals, slow-moving */
  qs: number;
  qsTier: TierLabel;

  /** Opportunity Score (0-100 or null if gated) - timing, fast-moving */
  os: number | null;
  osTier: TierLabel | null;
  osGated: boolean;
  osGateReason?: string;

  /** Risk Score (0-100) - higher = more risk */
  risk: number;
  riskTier: TierLabel;
  
  /** 
   * Risk breakdown by segment (for transparency)
   * Shows contribution from each risk category
   */
  riskBreakdown?: {
    /** Top risk contributors */
    topRisks: Array<{
      segment: RiskSegment;
      score: number;
      weight: number;
      contribution: number;
    }>;
    /** Coverage warnings for risk data */
    coverageWarnings: string[];
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PROJECT OMNISCORE (the combined score)
  // ─────────────────────────────────────────────────────────────────────────────
  /** Raw POS before smoothing */
  posRaw: number;
  /** Smoothed POS (temporal stability applied) */
  posSmoothed: number;
  /** Final POS (null if gated due to low confidence or legitimacy) */
  posFinal: number | null;
  posTier: TierLabel | null;

  // ─────────────────────────────────────────────────────────────────────────────
  // CONFIDENCE & COVERAGE
  // ─────────────────────────────────────────────────────────────────────────────
  /** Overall confidence (0-100, rounded percentage) */
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  /** QS data coverage (0-1) */
  coverageQS: number;
  /** OS data coverage (0-1) */
  coverageOS: number;

  // ─────────────────────────────────────────────────────────────────────────────
  // INTEGRITY FLAG (manipulation detection)
  // ─────────────────────────────────────────────────────────────────────────────
  flag: IntegrityFlag;

  // ─────────────────────────────────────────────────────────────────────────────
  // SCORE DRIVERS (explainability)
  // ─────────────────────────────────────────────────────────────────────────────
  drivers: ScoreDrivers;

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEWS (same truth, different presentation)
  // ─────────────────────────────────────────────────────────────────────────────
  allocatorView: AllocatorView;
  traderView: TraderView;

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTOR & CLASSIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  sector: SectorType;
  capBucket: CapBucket;

  // ─────────────────────────────────────────────────────────────────────────────
  // AUDIT TRAIL (always included, full traceability)
  // ─────────────────────────────────────────────────────────────────────────────
  audit: AuditMetadata;

  // ─────────────────────────────────────────────────────────────────────────────
  // ERROR (present if gated)
  // ─────────────────────────────────────────────────────────────────────────────
  error?: {
    code: OmniScoreErrorCode;
    message: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY ALIAS (deprecated, use OmniScoreSnapshot)
// ═══════════════════════════════════════════════════════════════════════════════

/** @deprecated Use OmniScoreSnapshot instead */
export interface OmniScoreResult {
  // Identity
  projectId: string;
  symbol: string;
  name: string;
  sector: SectorType;
  capBucket: CapBucket;
  
  // Gates
  legitimacy: LegitimacyResult;
  confidence: ConfidenceResult;
  
  // Core Scores (0-100)
  qs: number;
  qsTier: TierLabel;
  os: number | null;       // null if gated
  osTier: TierLabel | null;
  osStatus: 'active' | 'gated';
  risk: number;
  riskTier: TierLabel;
  
  // POS (Project OmniScore)
  pos: number;
  posTier: TierLabel;
  
  // Coverage
  coverageQS: number;
  coverageOS: number;
  
  // Views (same truth, different presentation)
  allocatorView: AllocatorView;
  traderView: TraderView;
  
  // Audit
  audit: AuditMetadata;
  
  // Detailed breakdown (for debugging)
  qualityScore: QualityScoreResult;
  opportunityScore: OpportunityScoreResult;
  riskScore: RiskScoreResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CalculateOmniScoreParams {
  /** Token identity (preferred when available) */
  identity?: TokenIdentity;
  
  /** Legacy: project/asset identifier (used when identity not provided) */
  projectId?: string;
  
  /** Legacy: trading symbol */
  symbol?: string;
  
  /** Legacy: full name */
  name?: string;
  
  /** Sector classification */
  sector?: SectorType;
  
  /** Market cap in USD (for cap bucket classification) */
  marketCapUsd?: number;
  
  /** Data inputs */
  dataPoints: DataPoint[];
  
  /** Optional overrides */
  eventRiskSeverity?: number;
  
  /** Request metadata */
  requestId?: string;
  
  /** Previous state for smoothing */
  previousState?: SmoothingState;
}

/** @deprecated Use identity-based params */
export interface LegacyCalculateOmniScoreParams {
  projectId: string;
  symbol?: string;
  name?: string;
  sector?: SectorType;
  marketCapUsd?: number;
  dataPoints: DataPoint[];
  eventRiskSeverity?: number;
  requestId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type OmniScoreErrorCode =
  | 'LEGITIMACY_FAILED'
  | 'CONFIDENCE_INSUFFICIENT'
  | 'COVERAGE_BELOW_THRESHOLD'
  | 'DATA_STALE'
  | 'VALIDATION_ERROR'
  | 'UPSTREAM_FAILURE'
  | 'INVARIANT_VIOLATION'
  | 'INTERNAL_ERROR';

export interface OmniScoreError {
  code: OmniScoreErrorCode;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  details?: Record<string, unknown>;
  timestamp: string;
}
