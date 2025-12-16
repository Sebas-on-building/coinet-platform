/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ⚠️ RISK SCORE CALCULATOR                                                  ║
 * ║                                                                               ║
 * ║   What can kill this project? Higher = more risk.                            ║
 * ║   Segments: LEGAL, MACRO                                                     ║
 * ║   Always shown (never gated).                                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  DataPoint,
  RiskSegment,
  SegmentScore,
  RiskScoreResult,
} from '../types';
import { getTierFromScore, RISK_SEGMENT_WEIGHTS, SCORE_BOUNDS } from '../constants';
import { RISK_REQUIREMENTS, calculateSegmentCoverage } from '../data/requirements';
import { getSourceReliability } from '../data/sources';

// ═══════════════════════════════════════════════════════════════════════════════
// RISK CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

const RISK_SEGMENTS: RiskSegment[] = ['LEGAL', 'MACRO'];

/**
 * Calculate Risk Score from data points
 */
export function calculateRiskScore(
  dataPoints: DataPoint[],
  eventRiskSeverity: number = 0
): RiskScoreResult {
  // Group data points by risk segment
  const bySegment = new Map<RiskSegment, DataPoint[]>();
  for (const seg of RISK_SEGMENTS) {
    bySegment.set(seg, []);
  }
  
  for (const dp of dataPoints) {
    if (RISK_SEGMENTS.includes(dp.segment as RiskSegment)) {
      bySegment.get(dp.segment as RiskSegment)!.push(dp);
    }
  }
  
  // Calculate each segment score
  const segments: Record<RiskSegment, SegmentScore> = {} as Record<RiskSegment, SegmentScore>;
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const seg of RISK_SEGMENTS) {
    const segmentDataPoints = bySegment.get(seg)!;
    const segmentScore = calculateSegmentScore(seg, segmentDataPoints);
    segments[seg] = segmentScore;
    
    const weight = RISK_SEGMENT_WEIGHTS[seg];
    // Use coverage-weighted contribution
    const effectiveWeight = weight * Math.max(0.3, segmentScore.coverage);
    totalWeightedScore += segmentScore.score * effectiveWeight;
    totalWeight += effectiveWeight;
  }
  
  // Calculate base risk
  let score = totalWeight > 0 
    ? totalWeightedScore / totalWeight
    : 30; // Default to moderate risk if no data
  
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
  const validPoints = dataPoints.filter(dp => dp.value !== null);
  const keys = validPoints.map(dp => dp.key);
  const coverage = calculateSegmentCoverage(segment, keys);
  
  if (validPoints.length === 0) {
    return {
      segment,
      score: 30, // Moderate risk default
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
    
    // Normalize value to 0-100 risk scale
    const normalizedValue = normalizeRiskDataPoint(dp);
    
    totalWeightedValue += normalizedValue * weight;
    totalWeight += weight;
    totalReliability += reliability;
  }
  
  const score = totalWeight > 0 
    ? Math.max(SCORE_BOUNDS.min, Math.min(SCORE_BOUNDS.max, totalWeightedValue / totalWeight))
    : 30;
  
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
 * Normalize risk data points (higher = more risk)
 */
function normalizeRiskDataPoint(dp: DataPoint): number {
  if (dp.value === null) return 30;
  
  switch (dp.key) {
    // Legal risks
    case 'jurisdiction_risk_score':
      return dp.value; // Already 0-100
    case 'regulatory_news_sentiment':
      // -1 to 1 scale, negative = risky
      return Math.max(0, 50 - dp.value * 50);
    case 'sec_warning_active':
      return dp.value === 1 ? 90 : 10; // Binary: active warning = high risk
    case 'compliance_score':
      return 100 - dp.value; // Higher compliance = lower risk
      
    // Macro risks
    case 'btc_correlation_90d':
      // High correlation = higher systemic risk
      return dp.value * 50; // 0-1 correlation → 0-50 risk
    case 'fear_greed_index':
      // Extreme fear (0-25) or extreme greed (75-100) = higher risk
      const deviation = Math.abs(dp.value - 50);
      return deviation * 1.5; // 0-75 risk
    case 'funding_rate_avg':
      // Extreme funding rates = higher risk
      return Math.min(100, Math.abs(dp.value) * 1000);
    case 'liquidation_intensity':
      // Higher liquidation = higher risk
      return Math.min(100, dp.value * 100);
      
    default:
      if (dp.value >= 0 && dp.value <= 100) return dp.value;
      return 30;
  }
}

/**
 * Get missing inputs for a risk segment
 */
function getMissingInputs(segment: RiskSegment, presentKeys: string[]): string[] {
  const req = RISK_REQUIREMENTS[segment];
  const allExpected = [...req.required, ...req.optional];
  return allExpected.filter(k => !presentKeys.includes(k));
}
