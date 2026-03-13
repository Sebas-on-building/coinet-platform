/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏆 QUALITY SCORE (QS) CALCULATOR                                          ║
 * ║                                                                               ║
 * ║   Fundamentals-based score. Slow-moving (changes over days/weeks).           ║
 * ║   Segments: TEAM, TECH, SEC, GOV, ECO                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  DataPoint,
  QSSegment,
  SegmentScore,
  QualityScoreResult,
  TierLabel,
} from '../types';
import { getTierFromScore, QS_SEGMENT_WEIGHTS, SCORE_BOUNDS } from '../constants';
import { QS_REQUIREMENTS, calculateSegmentCoverage } from '../data/requirements';
import { getSourceReliability } from '../data/sources';

// ═══════════════════════════════════════════════════════════════════════════════
// QS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

const QS_SEGMENTS: QSSegment[] = ['TEAM', 'TECH', 'SEC', 'GOV', 'ECO'];

/**
 * Calculate Quality Score from data points
 */
export function calculateQualityScore(dataPoints: DataPoint[]): QualityScoreResult {
  // Group data points by QS segment
  const bySegment = new Map<QSSegment, DataPoint[]>();
  for (const seg of QS_SEGMENTS) {
    bySegment.set(seg, []);
  }
  
  for (const dp of dataPoints) {
    if (QS_SEGMENTS.includes(dp.segment as QSSegment)) {
      bySegment.get(dp.segment as QSSegment)!.push(dp);
    }
  }
  
  // Calculate each segment score
  const segments: Record<QSSegment, SegmentScore> = {} as Record<QSSegment, SegmentScore>;
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let totalCoverage = 0;
  
  for (const seg of QS_SEGMENTS) {
    const segmentDataPoints = bySegment.get(seg)!;
    const segmentScore = calculateSegmentScore(seg, segmentDataPoints);
    segments[seg] = segmentScore;
    
    const weight = QS_SEGMENT_WEIGHTS[seg];
    totalWeightedScore += segmentScore.score * weight * segmentScore.coverage;
    totalWeight += weight * segmentScore.coverage;
    totalCoverage += segmentScore.coverage;
  }
  
  // Calculate final QS
  const score = totalWeight > 0 
    ? Math.max(SCORE_BOUNDS.min, Math.min(SCORE_BOUNDS.max, totalWeightedScore / totalWeight))
    : 50; // Default to neutral if no data
  
  const coverage = totalCoverage / QS_SEGMENTS.length;
  const tier = getTierFromScore(score);
  
  return {
    score: Math.round(score * 10) / 10,
    tier,
    coverage,
    segments,
    breakdown: {
      team: segments.TEAM.score,
      tech: segments.TECH.score,
      security: segments.SEC.score,
      governance: segments.GOV.score,
      ecosystem: segments.ECO.score,
    },
  };
}

/**
 * Calculate score for a single segment
 */
function calculateSegmentScore(segment: QSSegment, dataPoints: DataPoint[]): SegmentScore {
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
 * Normalize a data point value to 0-100 scale (supports raw and legacy value)
 */
function normalizeDataPoint(dp: DataPoint, value: number): number {
  // Different normalization based on key
  // This is a simplified version - production would have more sophisticated normalization
  switch (dp.key) {
    // GitHub metrics
    case 'github_commits_30d':
      return normalizeLog(value, 1, 1000); // 1-1000 commits
    case 'github_stars':
      return normalizeLog(value, 100, 50000); // 100-50k stars
    case 'github_contributors':
      return normalizeLog(value, 1, 500); // 1-500 contributors
    case 'github_forks':
      return normalizeLog(value, 10, 10000); // 10-10k forks
      
    // Security metrics
    case 'audit_count':
      return Math.min(100, value * 20); // 0-5 audits
    case 'auditor_tier':
      return (5 - value) * 25; // Tier 1=100, Tier 4=25
    case 'bug_bounty_size':
      return normalizeLog(value, 10000, 10000000); // $10k-$10M
    case 'incident_count':
      return Math.max(0, 100 - value * 25); // Each incident costs 25 points
      
    // Team metrics
    case 'team_experience_years':
      return Math.min(100, value * 10); // 0-10 years
    case 'team_transparency_score':
      return value; // Already 0-100
      
    // Governance metrics
    case 'decentralization_score':
      return value; // Already 0-100
    case 'voter_turnout':
      return Math.min(100, value * 2); // 0-50% turnout
    case 'proposal_count_90d':
      return Math.min(100, value * 10); // 0-10 proposals
      
    // Ecosystem metrics
    case 'tvl_usd':
      return normalizeLog(value, 1000000, 10000000000); // $1M-$10B
    case 'integration_count':
      return Math.min(100, value * 5); // 0-20 integrations
    case 'ecosystem_projects':
      return normalizeLog(value, 10, 1000); // 10-1000 projects
      
    default:
      // If value is already 0-100, return as-is
      if (value >= 0 && value <= 100) return value;
      // Otherwise, default to 50
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
 * Get missing required inputs for a segment
 */
function getMissingInputs(segment: QSSegment, presentKeys: string[]): string[] {
  const req = QS_REQUIREMENTS[segment];
  const allExpected = [...req.required, ...req.optional];
  return allExpected.filter(k => !presentKeys.includes(k));
}
