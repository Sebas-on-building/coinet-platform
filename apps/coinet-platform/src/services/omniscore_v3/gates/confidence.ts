/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 CONFIDENCE GATE                                                        ║
 * ║                                                                               ║
 * ║   Second gate: How confident are we in the data?                             ║
 * ║   Insufficient coverage = BLOCK (no score produced).                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  ConfidenceResult,
  ConfidenceLevel,
  DataPoint,
  Segment,
  QSSegment,
  OSSegment,
} from '../types';
import { getConfidenceLevel, CONFIDENCE_THRESHOLDS } from '../constants';
import {
  QS_REQUIREMENTS,
  OS_REQUIREMENTS,
  RISK_REQUIREMENTS,
  calculateSegmentCoverage,
  checkRequiredData,
} from '../data/requirements';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConfidenceInput {
  dataPoints: DataPoint[];
}

/**
 * Calculate confidence based on data coverage
 */
export function checkConfidence(input: ConfidenceInput): ConfidenceResult {
  const { dataPoints } = input;
  
  // Group data points by segment
  const bySegment = new Map<Segment, string[]>();
  for (const dp of dataPoints) {
    if (dp.value === null) continue;
    const keys = bySegment.get(dp.segment) || [];
    keys.push(dp.key);
    bySegment.set(dp.segment, keys);
  }
  
  // Calculate QS coverage
  const qsSegments: QSSegment[] = ['TEAM', 'TECH', 'SEC', 'GOV', 'ECO'];
  let qsTotalCoverage = 0;
  for (const seg of qsSegments) {
    const keys = bySegment.get(seg) || [];
    qsTotalCoverage += calculateSegmentCoverage(seg, keys);
  }
  const coverageQS = qsTotalCoverage / qsSegments.length;
  
  // Calculate OS coverage
  const osSegments: OSSegment[] = ['MARKET', 'TOKEN', 'VAL', 'ADOPT', 'COMM'];
  let osTotalCoverage = 0;
  for (const seg of osSegments) {
    const keys = bySegment.get(seg) || [];
    osTotalCoverage += calculateSegmentCoverage(seg, keys);
  }
  const coverageOS = osTotalCoverage / osSegments.length;
  
  // Calculate Risk coverage
  const riskSegments: Segment[] = ['LEGAL', 'MACRO'];
  let riskTotalCoverage = 0;
  for (const seg of riskSegments) {
    const keys = bySegment.get(seg) || [];
    riskTotalCoverage += calculateSegmentCoverage(seg, keys);
  }
  const coverageRisk = riskTotalCoverage / riskSegments.length;
  
  // Overall coverage (weighted)
  const overallCoverage = coverageQS * 0.5 + coverageOS * 0.35 + coverageRisk * 0.15;
  
  // Determine confidence level
  const level = getConfidenceLevel(overallCoverage);
  
  // Check for missing required data
  const missingRequired: string[] = [];
  for (const [segment, req] of Object.entries({
    ...QS_REQUIREMENTS,
    ...OS_REQUIREMENTS,
    ...RISK_REQUIREMENTS,
  })) {
    const keys = bySegment.get(segment as Segment) || [];
    const check = checkRequiredData(segment as Segment, keys);
    if (!check.passed) {
      missingRequired.push(...check.missing.map(k => `${segment}.${k}`));
    }
  }
  
  // Determine if gated or degraded
  const gated = level === 'insufficient';
  const degraded = level === 'low' || missingRequired.length > 0;
  
  return {
    level,
    coverageQS,
    coverageOS,
    coverageRisk,
    overallCoverage,
    degraded,
    gated,
    missingRequired,
  };
}

/**
 * Check if confidence allows full scoring
 */
export function canProceedWithScoring(result: ConfidenceResult): boolean {
  return !result.gated;
}

/**
 * Check if OS should be gated due to low OS coverage
 */
export function shouldGateOS(result: ConfidenceResult): boolean {
  return result.coverageOS < CONFIDENCE_THRESHOLDS.low;
}

/**
 * Get human-readable confidence summary
 */
export function getConfidenceSummary(result: ConfidenceResult): string {
  const coveragePct = (result.overallCoverage * 100).toFixed(0);
  
  switch (result.level) {
    case 'high':
      return `High confidence (${coveragePct}% coverage)`;
    case 'medium':
      return `Medium confidence (${coveragePct}% coverage)`;
    case 'low':
      return `Low confidence (${coveragePct}% coverage) - scores may be unreliable`;
    case 'insufficient':
      return `Insufficient data (${coveragePct}% coverage) - cannot produce score`;
  }
}

/**
 * Get confidence band for a score
 * Higher confidence = narrower band
 */
export function getConfidenceBand(
  score: number,
  level: ConfidenceLevel
): [number, number] {
  const bandWidths: Record<ConfidenceLevel, number> = {
    high: 3,
    medium: 6,
    low: 12,
    insufficient: 25,
  };
  
  const width = bandWidths[level];
  return [
    Math.max(0, score - width),
    Math.min(100, score + width),
  ];
}
