/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ⚠️ RISK SCORE CALCULATOR (EXPANDED MODEL)                                 ║
 * ║                                                                               ║
 * ║   What can kill this project? Higher = more risk.                            ║
 * ║                                                                               ║
 * ║   Segments (8 crypto-specific risk categories):                              ║
 * ║   - LEGAL (10%): Regulatory and legal risks                                  ║
 * ║   - MACRO (10%): Macroeconomic/systemic risks                                ║
 * ║   - CENTRAL (20%): Centralization/decentralization risk                      ║
 * ║   - STABILITY (15%): Network stability risk (outages)                        ║
 * ║   - CONC (15%): Concentration risk (whale holdings)                          ║
 * ║   - UNLOCK (10%): Unlock/vesting schedule risk                               ║
 * ║   - LIQUIDITY (10%): Liquidity fragility risk                                ║
 * ║   - CONTRACT (10%): Smart contract risk                                      ║
 * ║                                                                               ║
 * ║   Always shown (never gated).                                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  DataPoint,
  RiskSegment,
  SegmentScore,
  RiskScoreResult,
} from '../types';
import { RISK_SEGMENT_WEIGHTS, SCORE_BOUNDS } from '../constants';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_RISK_SEGMENTS: RiskSegment[] = [
  'LEGAL',
  'MACRO',
  'CENTRAL',
  'STABILITY',
  'CONC',
  'UNLOCK',
  'LIQUIDITY',
  'CONTRACT',
];

/** Default risk scores when data is unavailable */
const DEFAULT_RISK_SCORES: Record<RiskSegment, number> = {
  LEGAL: 25,      // Assume moderate legal risk
  MACRO: 30,      // Assume moderate systemic risk
  CENTRAL: 40,    // Assume moderate centralization (conservative)
  STABILITY: 25,  // Assume stable unless proven otherwise
  CONC: 35,       // Assume moderate concentration
  UNLOCK: 30,     // Assume some unlock pressure
  LIQUIDITY: 30,  // Assume moderate liquidity
  CONTRACT: 25,   // Assume moderate contract risk
};

/** Required data keys per segment */
const SEGMENT_REQUIRED_KEYS: Record<RiskSegment, string[]> = {
  LEGAL: ['regulatory_status', 'sec_warning_active'],
  MACRO: ['btc_correlation_90d', 'market_beta'],
  CENTRAL: ['nakamoto_coefficient', 'validator_count', 'top_validators_stake_percent'],
  STABILITY: ['uptime_30d', 'outage_count_90d', 'avg_block_time_variance'],
  CONC: ['top10_holders_percent', 'gini_coefficient'],
  UNLOCK: ['next_unlock_percent_30d', 'total_locked_percent'],
  LIQUIDITY: ['depth_2_percent', 'slippage_10k', 'spread_avg'],
  CONTRACT: ['audit_count', 'audit_score', 'code_complexity'],
};

/** Optional data keys per segment */
const SEGMENT_OPTIONAL_KEYS: Record<RiskSegment, string[]> = {
  LEGAL: ['jurisdiction_risk_score', 'regulatory_news_sentiment', 'compliance_score'],
  MACRO: ['fear_greed_index', 'funding_rate_avg', 'liquidation_intensity', 'market_dominance'],
  CENTRAL: ['unique_governance_voters', 'governance_participation_rate', 'admin_key_holders', 'client_diversity'],
  STABILITY: ['tps_consistency', 'network_congestion_events', 'upgrade_stability_score'],
  CONC: ['top50_holders_percent', 'team_holdings_percent', 'foundation_holdings_percent', 'vc_holdings_percent', 'unique_holders'],
  UNLOCK: ['next_unlock_percent_90d', 'vesting_cliff_soon', 'team_vesting_remaining'],
  LIQUIDITY: ['bid_ask_spread', 'volume_to_mcap_ratio', 'exchange_count'],
  CONTRACT: ['bug_bounty_active', 'proxy_upgradeable', 'admin_privilege_risk', 'verified_source_code'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// RISK CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Risk Score from data points
 */
export function calculateRiskScore(
  dataPoints: DataPoint[],
  eventRiskSeverity: number = 0
): RiskScoreResult {
  // Group data points by risk segment
  const bySegment = new Map<RiskSegment, DataPoint[]>();
  for (const seg of ALL_RISK_SEGMENTS) {
    bySegment.set(seg, []);
  }
  
  for (const dp of dataPoints) {
    if (ALL_RISK_SEGMENTS.includes(dp.segment as RiskSegment)) {
      bySegment.get(dp.segment as RiskSegment)!.push(dp);
    }
  }
  
  // Calculate each segment score
  const segments: Record<RiskSegment, SegmentScore> = {} as Record<RiskSegment, SegmentScore>;
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const seg of ALL_RISK_SEGMENTS) {
    const segmentDataPoints = bySegment.get(seg)!;
    const segmentScore = calculateSegmentScore(seg, segmentDataPoints);
    segments[seg] = segmentScore;
    
    const weight = RISK_SEGMENT_WEIGHTS[seg];
    // Use coverage-weighted contribution (min 0.3 to prevent zero-weight)
    const effectiveWeight = weight * Math.max(0.3, segmentScore.coverage);
    totalWeightedScore += segmentScore.score * effectiveWeight;
    totalWeight += effectiveWeight;
  }
  
  // Calculate base risk
  let score = totalWeight > 0 
    ? totalWeightedScore / totalWeight
    : 30; // Default to moderate risk if no data at all
  
  // Add event risk severity (0-1 scale, adds up to 30 points)
  const eventRiskContribution = eventRiskSeverity * 30;
  score = Math.min(SCORE_BOUNDS.max, score + eventRiskContribution);
  
  // Risk score: higher = riskier
  // Tier is inverted: Elite risk = low score, Critical risk = high score
  const tier = getRiskTier(score);
  
  return {
    score: Math.round(score * 10) / 10,
    tier,
    segments,
    eventRiskSeverity,
  };
}

/**
 * Get risk tier (inverted from normal tier logic)
 */
function getRiskTier(riskScore: number): 'Elite' | 'Strong' | 'Neutral' | 'Weak' | 'Critical' {
  // For risk: low score = good (Elite), high score = bad (Critical)
  if (riskScore <= 15) return 'Elite';      // Very low risk
  if (riskScore <= 30) return 'Strong';     // Low risk
  if (riskScore <= 50) return 'Neutral';    // Moderate risk
  if (riskScore <= 70) return 'Weak';       // High risk
  return 'Critical';                         // Very high risk
}

/**
 * Calculate score for a single risk segment
 */
function calculateSegmentScore(segment: RiskSegment, dataPoints: DataPoint[]): SegmentScore {
  const validPoints = dataPoints.filter(dp => dp.raw !== null);
  const keys = validPoints.map(dp => dp.key);
  const coverage = calculateSegmentCoverage(segment, keys);
  
  if (validPoints.length === 0) {
    return {
      segment,
      score: DEFAULT_RISK_SCORES[segment],
      coverage: 0,
      reliability: 0,
      dataPoints: [],
      missingInputs: getMissingInputs(segment, keys),
    };
  }
  
  // Calculate weighted average of data points
  let totalWeightedValue = 0;
  let totalWeight = 0;
  let totalReliability = 0;
  
  for (const dp of validPoints) {
    const reliability = dp.confidenceSource ?? 0.7;
    const weight = reliability;
    
    // Normalize value to 0-100 risk scale using segment-specific logic
    const normalizedValue = normalizeRiskDataPoint(segment, dp);
    
    totalWeightedValue += normalizedValue * weight;
    totalWeight += weight;
    totalReliability += reliability;
  }
  
  const score = totalWeight > 0 
    ? Math.max(SCORE_BOUNDS.min, Math.min(SCORE_BOUNDS.max, totalWeightedValue / totalWeight))
    : DEFAULT_RISK_SCORES[segment];
  
  const avgReliability = validPoints.length > 0 
    ? totalReliability / validPoints.length 
    : 0;
  
  return {
    segment,
    score: Math.round(score * 10) / 10,
    coverage,
    reliability: avgReliability,
    dataPoints: validPoints,
    missingInputs: getMissingInputs(segment, keys),
  };
}

/**
 * Calculate coverage for a risk segment
 */
function calculateSegmentCoverage(segment: RiskSegment, presentKeys: string[]): number {
  const required = SEGMENT_REQUIRED_KEYS[segment] || [];
  const optional = SEGMENT_OPTIONAL_KEYS[segment] || [];
  
  if (required.length === 0 && optional.length === 0) return 0;
  
  // Required keys count more toward coverage
  const requiredPresent = required.filter(k => presentKeys.includes(k)).length;
  const optionalPresent = optional.filter(k => presentKeys.includes(k)).length;
  
  const requiredCoverage = required.length > 0 ? requiredPresent / required.length : 1;
  const optionalCoverage = optional.length > 0 ? optionalPresent / optional.length : 0;
  
  // Weight required higher (70% required, 30% optional)
  return 0.7 * requiredCoverage + 0.3 * optionalCoverage;
}

/**
 * Normalize risk data points (higher = more risk)
 * Uses segment-specific normalization logic
 */
function normalizeRiskDataPoint(segment: RiskSegment, dp: DataPoint): number {
  const value = dp.raw;
  if (value === null) return DEFAULT_RISK_SCORES[segment];
  
  switch (segment) {
    case 'LEGAL':
      return normalizeLegalRisk(dp);
    case 'MACRO':
      return normalizeMacroRisk(dp);
    case 'CENTRAL':
      return normalizeCentralizationRisk(dp);
    case 'STABILITY':
      return normalizeStabilityRisk(dp);
    case 'CONC':
      return normalizeConcentrationRisk(dp);
    case 'UNLOCK':
      return normalizeUnlockRisk(dp);
    case 'LIQUIDITY':
      return normalizeLiquidityRisk(dp);
    case 'CONTRACT':
      return normalizeContractRisk(dp);
    default:
      return value >= 0 && value <= 100 ? value : 30;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENT-SPECIFIC NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeLegalRisk(dp: DataPoint): number {
  const value = dp.raw!;
  
  switch (dp.key) {
    case 'regulatory_status':
      // 0=banned, 1=restricted, 2=unclear, 3=approved
      return Math.max(0, Math.min(100, (3 - value) * 30));
    case 'jurisdiction_risk_score':
      return value; // Already 0-100
    case 'regulatory_news_sentiment':
      // -1 to 1 scale, negative = risky
      return Math.max(0, Math.min(100, 50 - value * 50));
    case 'sec_warning_active':
      return value === 1 ? 85 : 10;
    case 'compliance_score':
      return Math.max(0, Math.min(100, 100 - value));
    default:
      return value >= 0 && value <= 100 ? value : 25;
  }
}

function normalizeMacroRisk(dp: DataPoint): number {
  const value = dp.raw!;
  
  switch (dp.key) {
    case 'btc_correlation_90d':
      // High correlation = higher systemic risk (0-1 scale)
      return Math.max(0, Math.min(100, value * 60));
    case 'market_beta':
      // Beta > 1 = more volatile than market
      return Math.max(0, Math.min(100, Math.abs(value - 1) * 40 + 20));
    case 'fear_greed_index':
      // Extreme fear (0-25) or extreme greed (75-100) = higher risk
      const deviation = Math.abs(value - 50);
      return Math.max(0, Math.min(100, deviation * 1.5));
    case 'funding_rate_avg':
      // Extreme funding rates = higher risk
      return Math.min(100, Math.abs(value) * 500);
    case 'liquidation_intensity':
      return Math.min(100, value * 100);
    case 'market_dominance':
      // Low dominance for BTC = higher systemic risk
      return Math.max(0, Math.min(100, 80 - value));
    default:
      return value >= 0 && value <= 100 ? value : 30;
  }
}

function normalizeCentralizationRisk(dp: DataPoint): number {
  const value = dp.raw!;
  
  switch (dp.key) {
    case 'nakamoto_coefficient':
      // Higher = more decentralized = lower risk
      // BTC ~4, ETH ~3, SOL ~19 (but fewer validators total)
      if (value >= 100) return 5;   // Very decentralized
      if (value >= 50) return 15;
      if (value >= 20) return 30;
      if (value >= 10) return 45;
      if (value >= 5) return 60;
      return 80; // Very centralized
      
    case 'validator_count':
      // More validators = more decentralized = lower risk
      if (value >= 10000) return 5;
      if (value >= 5000) return 15;
      if (value >= 1000) return 30;
      if (value >= 100) return 50;
      if (value >= 20) return 70;
      return 85;
      
    case 'top_validators_stake_percent':
      // Higher % by top validators = more centralized = higher risk
      if (value <= 20) return 10;
      if (value <= 33) return 25;
      if (value <= 50) return 45;
      if (value <= 66) return 65;
      return 85;
      
    case 'admin_key_holders':
      // Single admin key = high risk
      if (value === 0) return 10;  // No admin keys (immutable)
      if (value === 1) return 70;  // Single point of failure
      if (value <= 3) return 50;   // Small multisig
      if (value <= 7) return 30;   // Decent multisig
      return 20;
      
    case 'client_diversity':
      // Score 0-100, higher = more diverse = lower risk
      return Math.max(0, Math.min(100, 100 - value));
      
    case 'governance_participation_rate':
      // Higher participation = lower risk
      return Math.max(0, Math.min(100, 100 - value));
      
    default:
      return value >= 0 && value <= 100 ? value : 40;
  }
}

function normalizeStabilityRisk(dp: DataPoint): number {
  const value = dp.raw!;
  
  switch (dp.key) {
    case 'uptime_30d':
      // 99.9% = 10 risk, 99% = 30, 95% = 60, <90% = 90
      if (value >= 99.9) return 5;
      if (value >= 99.5) return 15;
      if (value >= 99) return 30;
      if (value >= 95) return 55;
      if (value >= 90) return 75;
      return 90;
      
    case 'outage_count_90d':
      // 0 outages = 5 risk, 1 = 25, 2-3 = 50, 4+ = 80
      if (value === 0) return 5;
      if (value === 1) return 30;
      if (value <= 3) return 55;
      if (value <= 5) return 75;
      return 90;
      
    case 'avg_block_time_variance':
      // Lower variance = more stable = lower risk (in %)
      if (value <= 1) return 10;
      if (value <= 5) return 25;
      if (value <= 10) return 45;
      if (value <= 20) return 65;
      return 85;
      
    case 'network_congestion_events':
      // Number of congestion events in 30d
      if (value === 0) return 5;
      if (value <= 2) return 25;
      if (value <= 5) return 50;
      return 75;
      
    case 'upgrade_stability_score':
      // 0-100, higher = more stable
      return Math.max(0, Math.min(100, 100 - value));
      
    default:
      return value >= 0 && value <= 100 ? value : 25;
  }
}

function normalizeConcentrationRisk(dp: DataPoint): number {
  const value = dp.raw!;
  
  switch (dp.key) {
    case 'top10_holders_percent':
      // Higher concentration = higher risk
      if (value >= 80) return 90;
      if (value >= 60) return 70;
      if (value >= 40) return 50;
      if (value >= 25) return 30;
      return 15;
      
    case 'top50_holders_percent':
      if (value >= 90) return 80;
      if (value >= 75) return 55;
      if (value >= 50) return 35;
      return 20;
      
    case 'gini_coefficient':
      // 0 = perfect equality, 1 = perfect inequality
      if (value >= 0.95) return 85;
      if (value >= 0.90) return 65;
      if (value >= 0.85) return 45;
      if (value >= 0.75) return 30;
      return 15;
      
    case 'team_holdings_percent':
    case 'foundation_holdings_percent':
    case 'vc_holdings_percent':
      // Higher insider holdings = higher risk
      if (value >= 30) return 75;
      if (value >= 20) return 55;
      if (value >= 10) return 35;
      if (value >= 5) return 20;
      return 10;
      
    case 'unique_holders':
      // More holders = more distributed = lower risk
      if (value >= 1000000) return 5;
      if (value >= 100000) return 20;
      if (value >= 10000) return 40;
      if (value >= 1000) return 60;
      return 80;
      
    default:
      return value >= 0 && value <= 100 ? value : 35;
  }
}

function normalizeUnlockRisk(dp: DataPoint): number {
  const value = dp.raw!;
  
  switch (dp.key) {
    case 'next_unlock_percent_30d':
      // % of supply unlocking in next 30 days
      if (value >= 10) return 90;
      if (value >= 5) return 70;
      if (value >= 2) return 50;
      if (value >= 1) return 30;
      if (value >= 0.5) return 20;
      return 10;
      
    case 'next_unlock_percent_90d':
      // % of supply unlocking in next 90 days
      if (value >= 20) return 85;
      if (value >= 10) return 60;
      if (value >= 5) return 40;
      if (value >= 2) return 25;
      return 15;
      
    case 'total_locked_percent':
      // More locked = potentially more future unlock pressure
      // But also shows long-term commitment
      if (value >= 80) return 50;
      if (value >= 60) return 40;
      if (value >= 40) return 30;
      if (value >= 20) return 25;
      return 20;
      
    case 'vesting_cliff_soon':
      // Boolean: cliff coming in next 30 days
      return value === 1 ? 70 : 15;
      
    case 'team_vesting_remaining':
      // % of team tokens still vesting (higher = more future pressure)
      if (value >= 80) return 55;
      if (value >= 50) return 40;
      if (value >= 20) return 25;
      return 15;
      
    default:
      return value >= 0 && value <= 100 ? value : 30;
  }
}

function normalizeLiquidityRisk(dp: DataPoint): number {
  const value = dp.raw!;
  
  switch (dp.key) {
    case 'depth_2_percent':
      // % of market cap within 2% of price (higher = more liquid = lower risk)
      if (value >= 10) return 5;
      if (value >= 5) return 15;
      if (value >= 2) return 30;
      if (value >= 1) return 50;
      if (value >= 0.5) return 70;
      return 85;
      
    case 'slippage_10k':
      // Slippage for $10k trade (lower = better = lower risk)
      if (value <= 0.1) return 5;
      if (value <= 0.5) return 20;
      if (value <= 1) return 40;
      if (value <= 2) return 60;
      if (value <= 5) return 80;
      return 90;
      
    case 'spread_avg':
      // Average bid-ask spread % (lower = better = lower risk)
      if (value <= 0.05) return 5;
      if (value <= 0.1) return 15;
      if (value <= 0.25) return 30;
      if (value <= 0.5) return 50;
      if (value <= 1) return 70;
      return 85;
      
    case 'volume_to_mcap_ratio':
      // Higher ratio = more liquid = lower risk (capped at 1)
      const ratio = Math.min(value, 1);
      return Math.max(5, Math.min(80, 80 - ratio * 75));
      
    case 'exchange_count':
      // More exchanges = more liquid = lower risk
      if (value >= 50) return 5;
      if (value >= 20) return 15;
      if (value >= 10) return 30;
      if (value >= 5) return 50;
      if (value >= 2) return 70;
      return 85;
      
    default:
      return value >= 0 && value <= 100 ? value : 30;
  }
}

function normalizeContractRisk(dp: DataPoint): number {
  const value = dp.raw!;
  
  switch (dp.key) {
    case 'audit_count':
      // More audits = lower risk
      if (value >= 5) return 5;
      if (value >= 3) return 15;
      if (value >= 2) return 30;
      if (value >= 1) return 50;
      return 75;
      
    case 'audit_score':
      // 0-100, higher = better = lower risk
      return Math.max(0, Math.min(100, 100 - value));
      
    case 'bug_bounty_active':
      // Boolean: active bug bounty = lower risk
      return value === 1 ? 15 : 50;
      
    case 'proxy_upgradeable':
      // Boolean: upgradeable proxy = higher risk
      return value === 1 ? 55 : 20;
      
    case 'admin_privilege_risk':
      // 0-100 risk score
      return value;
      
    case 'verified_source_code':
      // Boolean: verified source = lower risk
      return value === 1 ? 10 : 60;
      
    case 'code_complexity':
      // Lines of code or complexity metric (higher = higher risk)
      if (value <= 1000) return 15;
      if (value <= 5000) return 30;
      if (value <= 20000) return 50;
      if (value <= 100000) return 70;
      return 85;
      
    default:
      return value >= 0 && value <= 100 ? value : 25;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get missing inputs for a risk segment
 */
function getMissingInputs(segment: RiskSegment, presentKeys: string[]): string[] {
  const required = SEGMENT_REQUIRED_KEYS[segment] || [];
  const optional = SEGMENT_OPTIONAL_KEYS[segment] || [];
  const allExpected = [...required, ...optional];
  return allExpected.filter(k => !presentKeys.includes(k));
}

/**
 * Get a summary of what risk segments contributed most to the final score
 */
export function getRiskBreakdown(result: RiskScoreResult): {
  topRisks: Array<{ segment: RiskSegment; score: number; weight: number; contribution: number }>;
  coverageWarnings: string[];
} {
  const contributions = ALL_RISK_SEGMENTS.map(seg => ({
    segment: seg,
    score: result.segments[seg].score,
    weight: RISK_SEGMENT_WEIGHTS[seg],
    contribution: result.segments[seg].score * RISK_SEGMENT_WEIGHTS[seg],
  }));
  
  // Sort by contribution (descending)
  contributions.sort((a, b) => b.contribution - a.contribution);
  
  const coverageWarnings: string[] = [];
  for (const seg of ALL_RISK_SEGMENTS) {
    const segResult = result.segments[seg];
    if (segResult.coverage < 0.3) {
      coverageWarnings.push(`${seg}: Low coverage (${Math.round(segResult.coverage * 100)}%)`);
    }
  }
  
  return {
    topRisks: contributions.slice(0, 5),
    coverageWarnings,
  };
}
