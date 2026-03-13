/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📈 OPPORTUNITY SCORE (OS) CALCULATOR                                      ║
 * ║                                                                               ║
 * ║   Market-based score. Fast-moving (changes over hours/days).                 ║
 * ║   Segments: MARKET, TOKEN, VAL, ADOPT, COMM                                  ║
 * ║   Can be GATED if coverage is insufficient.                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  DataPoint,
  OSSegment,
  SegmentScore,
  OpportunityScoreResult,
  TierLabel,
} from '../types';
import { getTierFromScore, OS_SEGMENT_WEIGHTS, SCORE_BOUNDS, CONFIDENCE_THRESHOLDS } from '../constants';
import { OS_REQUIREMENTS, calculateSegmentCoverage } from '../data/requirements';
import { getSourceReliability } from '../data/sources';

// ═══════════════════════════════════════════════════════════════════════════════
// OS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

const OS_SEGMENTS: OSSegment[] = ['MARKET', 'TOKEN', 'VAL', 'ADOPT', 'COMM'];

/**
 * Calculate Opportunity Score from data points
 */
export function calculateOpportunityScore(dataPoints: DataPoint[]): OpportunityScoreResult {
  // Group data points by OS segment
  const bySegment = new Map<OSSegment, DataPoint[]>();
  for (const seg of OS_SEGMENTS) {
    bySegment.set(seg, []);
  }
  
  for (const dp of dataPoints) {
    if (OS_SEGMENTS.includes(dp.segment as OSSegment)) {
      bySegment.get(dp.segment as OSSegment)!.push(dp);
    }
  }
  
  // Calculate each segment score
  const segments: Record<OSSegment, SegmentScore> = {} as Record<OSSegment, SegmentScore>;
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let totalCoverage = 0;
  
  for (const seg of OS_SEGMENTS) {
    const segmentDataPoints = bySegment.get(seg)!;
    const segmentScore = calculateSegmentScore(seg, segmentDataPoints);
    segments[seg] = segmentScore;
    
    const weight = OS_SEGMENT_WEIGHTS[seg];
    totalWeightedScore += segmentScore.score * weight * segmentScore.coverage;
    totalWeight += weight * segmentScore.coverage;
    totalCoverage += segmentScore.coverage;
  }
  
  const coverage = totalCoverage / OS_SEGMENTS.length;
  
  // Check if OS should be gated due to low coverage
  if (coverage < CONFIDENCE_THRESHOLDS.low) {
    return {
      score: null,
      tier: null,
      status: 'gated',
      gateReason: `Insufficient OS coverage: ${(coverage * 100).toFixed(0)}% < ${(CONFIDENCE_THRESHOLDS.low * 100).toFixed(0)}%`,
      coverage,
      segments,
    };
  }
  
  // Calculate final OS
  const score = totalWeight > 0 
    ? Math.max(SCORE_BOUNDS.min, Math.min(SCORE_BOUNDS.max, totalWeightedScore / totalWeight))
    : 50;
  
  const tier = getTierFromScore(score);
  
  return {
    score: Math.round(score * 10) / 10,
    tier,
    status: 'active',
    coverage,
    segments,
  };
}

/**
 * Calculate score for a single segment
 */
function calculateSegmentScore(segment: OSSegment, dataPoints: DataPoint[]): SegmentScore {
  const validPoints = dataPoints.filter(dp => (dp.raw ?? (dp as { value?: number | null }).value) != null);
  const keys = validPoints.map(dp => dp.key);
  const coverage = calculateSegmentCoverage(segment, keys);
  
  if (validPoints.length === 0) {
    return {
      segment,
      score: 50, // Neutral default
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
    const reliability = getSourceReliability(dp.source);
    const weight = reliability;
    
    // Normalize value to 0-100 scale (support both raw and legacy value)
    const rawVal = dp.raw ?? (dp as { value?: number | null }).value;
    const normalizedValue = normalizeDataPoint(dp, rawVal!);
    
    totalWeightedValue += normalizedValue * weight;
    totalWeight += weight;
    totalReliability += reliability;
  }
  
  const score = totalWeight > 0 
    ? Math.max(SCORE_BOUNDS.min, Math.min(SCORE_BOUNDS.max, totalWeightedValue / totalWeight))
    : 50;
  
  const avgReliability = totalReliability / validPoints.length;
  
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
 * Normalize a data point value to 0-100 scale
 */
function normalizeDataPoint(dp: DataPoint, value: number): number {
  switch (dp.key) {
    // Market metrics
    case 'price_usd':
      return 50; // Price itself isn't a score, used for other calculations
    case 'volume_24h':
      return normalizeLog(value, 100000, 10000000000); // $100k-$10B
    case 'market_cap':
      return normalizeLog(value, 1000000, 1000000000000); // $1M-$1T
    case 'liquidity_depth':
      return normalizeLog(value, 10000, 100000000); // $10k-$100M
    case 'bid_ask_spread':
      return Math.max(0, 100 - value * 1000); // Lower spread = better
    case 'exchange_count_tier1':
      return Math.min(100, value * 15); // 0-7 tier-1 exchanges
      
    // Token metrics
    case 'circulating_supply_ratio':
      return value * 100; // 0-1 ratio
    case 'holder_concentration':
      return Math.max(0, 100 - value * 100); // Lower concentration = better
    case 'unlock_pressure_12m':
      return Math.max(0, 100 - value * 2); // Lower unlock = better
    case 'inflation_rate':
      return Math.max(0, 100 - value * 5); // Lower inflation = better
    case 'utility_count':
      return Math.min(100, value * 20); // 0-5 utilities
      
    // Valuation metrics
    case 'price_vs_ath':
      // -80% from ATH gets 80 points (buy opportunity)
      return Math.min(100, Math.max(0, 100 - value));
    case 'mcap_rank':
      return normalizeLog(1000 - Math.min(value, 1000), 1, 1000);
    case 'mcap_tvl_ratio':
      // Lower ratio = better value
      return Math.max(0, 100 - value * 10);
      
    // Adoption metrics
    case 'active_addresses_30d':
      return normalizeLog(value, 100, 10000000); // 100-10M addresses
    case 'transaction_count_30d':
      return normalizeLog(value, 1000, 100000000); // 1k-100M txns
    case 'tvl_usd':
      return normalizeLog(value, 1000000, 10000000000); // $1M-$10B
    case 'revenue_30d':
      return normalizeLog(value, 1000, 100000000); // $1k-$100M
    case 'user_retention_30d':
      return value * 100; // 0-1 ratio
      
    // Community metrics
    case 'twitter_followers':
      return normalizeLog(value, 1000, 5000000); // 1k-5M followers
    case 'twitter_engagement_rate':
      return Math.min(100, value * 2000); // 0-5% engagement
    case 'discord_members':
      return normalizeLog(value, 100, 500000); // 100-500k members
    case 'telegram_members':
      return normalizeLog(value, 100, 500000); // 100-500k members
    case 'github_stars':
      return normalizeLog(value, 100, 50000); // 100-50k stars
      
    default:
      if (value >= 0 && value <= 100) return value;
      return 50;
  }
}

/**
 * Logarithmic normalization for wide-range values
 */
function normalizeLog(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 100;
  
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logValue = Math.log10(value);
  
  return ((logValue - logMin) / (logMax - logMin)) * 100;
}

/**
 * Get missing inputs for a segment
 */
function getMissingInputs(segment: OSSegment, presentKeys: string[]): string[] {
  const req = OS_REQUIREMENTS[segment];
  const allExpected = [...req.required, ...req.optional];
  return allExpected.filter(k => !presentKeys.includes(k));
}
