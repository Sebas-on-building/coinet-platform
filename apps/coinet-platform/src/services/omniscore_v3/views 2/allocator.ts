/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     💼 ALLOCATOR VIEW                                                         ║
 * ║                                                                               ║
 * ║   Long-term view for portfolio allocation.                                   ║
 * ║   Focus: QS, Risk, Confidence. Time horizon: 6-12 months.                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  AllocatorView,
  AllocatorRecommendation,
  ConfidenceLevel,
  TierLabel,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// ALLOCATOR VIEW GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface AllocatorInput {
  qs: number;
  qsTier: TierLabel;
  risk: number;
  riskTier: TierLabel;
  confidence: ConfidenceLevel;
  pos: number;
  posTier: TierLabel;
  os: number | null;
  fearGreedIndex?: number;
}

/**
 * Generate allocator view from scores
 */
export function generateAllocatorView(input: AllocatorInput): AllocatorView {
  const recommendation = getRecommendation(input);
  const hideOS = shouldHideOS(input);
  const rationale = generateRationale(input, recommendation);
  
  return {
    recommendation,
    timeHorizon: '6-12 months',
    keyMetrics: ['qs', 'risk', 'confidence'],
    hideOS,
    rationale,
  };
}

/**
 * Determine recommendation based on scores
 */
function getRecommendation(input: AllocatorInput): AllocatorRecommendation {
  const { qs, risk, confidence, posTier } = input;
  
  // Low confidence = avoid making strong recommendations
  if (confidence === 'insufficient' || confidence === 'low') {
    return 'hold';
  }
  
  // High risk = reduce or avoid
  if (risk >= 70) {
    return 'avoid';
  }
  if (risk >= 50) {
    return 'reduce';
  }
  
  // Based on QS (fundamentals)
  if (qs >= 85) {
    // Elite fundamentals
    return risk <= 30 ? 'accumulate' : 'hold';
  }
  if (qs >= 70) {
    // Strong fundamentals
    return risk <= 40 ? 'accumulate' : 'hold';
  }
  if (qs >= 50) {
    // Neutral fundamentals
    return 'hold';
  }
  
  // Weak/Critical fundamentals
  if (qs < 30) {
    return 'avoid';
  }
  
  return 'reduce';
}

/**
 * Determine if OS should be hidden
 * Hide when market conditions make OS unreliable (extreme fear/greed)
 */
function shouldHideOS(input: AllocatorInput): boolean {
  const { fearGreedIndex, os, confidence } = input;
  
  // Hide if OS is gated
  if (os === null) return true;
  
  // Hide in extreme market conditions
  if (fearGreedIndex !== undefined) {
    if (fearGreedIndex <= 15 || fearGreedIndex >= 85) {
      return true;
    }
  }
  
  // Hide if low confidence
  if (confidence === 'low' || confidence === 'insufficient') {
    return true;
  }
  
  return false;
}

/**
 * Generate human-readable rationale
 */
function generateRationale(
  input: AllocatorInput,
  recommendation: AllocatorRecommendation
): string {
  const { qs, qsTier, risk, riskTier, confidence } = input;
  
  const parts: string[] = [];
  
  // QS assessment
  if (qs >= 85) {
    parts.push(`Elite fundamentals (QS: ${qs.toFixed(0)})`);
  } else if (qs >= 70) {
    parts.push(`Strong fundamentals (QS: ${qs.toFixed(0)})`);
  } else if (qs >= 50) {
    parts.push(`Average fundamentals (QS: ${qs.toFixed(0)})`);
  } else {
    parts.push(`Weak fundamentals (QS: ${qs.toFixed(0)})`);
  }
  
  // Risk assessment
  if (risk <= 30) {
    parts.push(`low risk (${risk.toFixed(0)})`);
  } else if (risk <= 50) {
    parts.push(`moderate risk (${risk.toFixed(0)})`);
  } else {
    parts.push(`elevated risk (${risk.toFixed(0)})`);
  }
  
  // Confidence caveat
  if (confidence === 'low') {
    parts.push('but low data confidence');
  } else if (confidence === 'medium') {
    parts.push('with medium confidence');
  }
  
  // Recommendation context
  switch (recommendation) {
    case 'accumulate':
      return `${parts.join(', ')}. Suitable for gradual accumulation.`;
    case 'hold':
      return `${parts.join(', ')}. Maintain current position.`;
    case 'reduce':
      return `${parts.join(', ')}. Consider reducing exposure.`;
    case 'avoid':
      return `${parts.join(', ')}. Not recommended for allocation.`;
  }
}
