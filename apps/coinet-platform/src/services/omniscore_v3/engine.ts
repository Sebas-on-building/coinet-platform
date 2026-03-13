/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 OMNISCORE v3.0 ENGINE                                                  ║
 * ║                                                                               ║
 * ║   Single calculation path. Fixed weights. No regime modulation.              ║
 * ║   Fail-closed on legitimacy or confidence failures.                          ║
 * ║                                                                               ║
 * ║   Formula: POS = 0.55×QS + 0.25×OS + 0.20×(100-Risk)                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  CalculateOmniScoreParams,
  OmniScoreResult,
  SmoothingState,
  CapBucket,
  SectorType,
  DataPoint,
} from './types';
import {
  ENGINE_VERSION,
  FORMULA_VERSION,
  METHODOLOGY_ID,
  FIXED_WEIGHTS,
  getTierFromScore,
  SCORE_BOUNDS,
} from './constants';
import { calculateQualityScore } from './segments/quality';
import { calculateOpportunityScore } from './segments/opportunity';
import { calculateRiskScore } from './segments/risk';
import { checkLegitimacy, extractLegitimacyData, canProceedWithScoring as legitimacyAllows } from './gates/legitimacy';
import { checkConfidence, canProceedWithScoring as confidenceAllows, shouldGateOS } from './gates/confidence';
import { applySmoothing, createSmoothingState } from './smoothing';
import { generateAllocatorView } from './views/allocator';
import { generateTraderView } from './views/trader';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CALCULATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface CalculationContext {
  previousState?: SmoothingState | null;
  fearGreedIndex?: number;
}

/**
 * Calculate OmniScore
 * 
 * This is the SINGLE calculation path. All consumers use this function.
 * Returns null if legitimacy or confidence gates fail.
 */
export function calculateOmniScore(
  params: CalculateOmniScoreParams,
  context: CalculationContext = {}
): OmniScoreResult | null {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Extract basic info (support identity-based and legacy params)
  const projectId = params.identity?.id ?? params.projectId ?? 'unknown';
  const symbol = params.identity?.symbol ?? params.symbol ?? projectId.toUpperCase();
  const name = params.identity?.name ?? params.name ?? projectId;
  const sector = params.sector || 'Unknown';
  const capBucket = getCapBucket(params.marketCapUsd);
  const eventRiskSeverity = params.eventRiskSeverity || 0;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GATE 1: LEGITIMACY CHECK
  // ═══════════════════════════════════════════════════════════════════════════
  
  const legitimacyInput = extractLegitimacyData(projectId, params.dataPoints);
  const legitimacy = checkLegitimacy(legitimacyInput);
  
  if (!legitimacyAllows(legitimacy)) {
    // Fail-closed: return null for failed legitimacy
    // In production, you might want to return a "gated" result instead
    return createGatedResult(
      params,
      legitimacy,
      `Legitimacy gate failed: ${legitimacy.reason}`,
      timestamp
    );
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GATE 2: CONFIDENCE CHECK
  // ═══════════════════════════════════════════════════════════════════════════
  
  const confidence = checkConfidence({ dataPoints: params.dataPoints });
  
  if (!confidenceAllows(confidence)) {
    // Fail-closed: insufficient data
    return createGatedResult(
      params,
      legitimacy,
      `Confidence gate failed: ${confidence.overallCoverage * 100}% coverage < 40% minimum`,
      timestamp
    );
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE SEGMENT SCORES
  // ═══════════════════════════════════════════════════════════════════════════
  
  const qualityScore = calculateQualityScore(params.dataPoints);
  const opportunityScore = calculateOpportunityScore(params.dataPoints);
  const riskScore = calculateRiskScore(params.dataPoints, eventRiskSeverity);
  
  // Check if OS should be gated
  const osGated = shouldGateOS(confidence) || opportunityScore.status === 'gated';
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE POS (Project OmniScore)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const qs = qualityScore.score;
  const os = osGated ? null : opportunityScore.score;
  const risk = riskScore.score;
  
  let posRaw = calculatePOS(qs, os, risk);
  
  // Apply plausibility cap
  posRaw = Math.min(posRaw, SCORE_BOUNDS.plausibleMax);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY SMOOTHING
  // ═══════════════════════════════════════════════════════════════════════════
  
  const qsSmoothing = applySmoothing('qs', qs, context.previousState || null, eventRiskSeverity);
  const osSmoothing = os !== null 
    ? applySmoothing('os', os, context.previousState || null, eventRiskSeverity)
    : { applied: false, smoothedValue: null, rawValue: os };
  const posSmoothing = applySmoothing('pos', posRaw, context.previousState || null, eventRiskSeverity);
  
  // Use smoothed values
  const qsFinal = qsSmoothing.smoothedValue;
  const osFinal = osSmoothing.smoothedValue as number | null;
  const posFinal = posSmoothing.smoothedValue;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE VIEWS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const allocatorView = generateAllocatorView({
    qs: qsFinal,
    qsTier: getTierFromScore(qsFinal),
    risk,
    riskTier: riskScore.tier,
    confidence: confidence.level,
    pos: posFinal,
    posTier: getTierFromScore(posFinal),
    os: osFinal,
    fearGreedIndex: context.fearGreedIndex,
  });
  
  const traderView = generateTraderView({
    qs: qsFinal,
    qsTier: getTierFromScore(qsFinal),
    os: osFinal,
    osTier: osFinal !== null ? getTierFromScore(osFinal) : null,
    osStatus: osGated ? 'gated' : 'active',
    osGateReason: opportunityScore.gateReason,
    risk,
    pos: posFinal,
    posTier: getTierFromScore(posFinal),
    confidence: confidence.level,
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD RESULT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const result: OmniScoreResult = {
    // Identity
    projectId,
    symbol,
    name,
    sector,
    capBucket,
    
    // Gates
    legitimacy,
    confidence,
    
    // Core Scores
    qs: qsFinal,
    qsTier: getTierFromScore(qsFinal),
    os: osFinal,
    osTier: osFinal !== null ? getTierFromScore(osFinal) : null,
    osStatus: osGated ? 'gated' : 'active',
    risk,
    riskTier: riskScore.tier,
    
    // POS
    pos: posFinal,
    posTier: getTierFromScore(posFinal),
    
    // Coverage
    coverageQS: qualityScore.coverage,
    coverageOS: opportunityScore.coverage,
    
    // Views
    allocatorView,
    traderView,
    
    // Audit
    audit: {
      engineVersion: ENGINE_VERSION,
      formulaVersion: FORMULA_VERSION,
      methodologyId: METHODOLOGY_ID,
      timestamp,
      requestId: params.requestId,
      
      legitimacyChecked: true,
      confidenceChecked: true,
      smoothingApplied: posSmoothing.applied,
      
      totalDataPoints: params.dataPoints.length,
      validDataPoints: params.dataPoints.filter(dp => (dp.raw ?? (dp as { value?: number | null }).value) != null).length,
      staleDataPoints: 0, // TODO: Calculate stale points
      
      degraded: confidence.degraded,
      gated: false,
    },
    
    // Detailed breakdown
    qualityScore,
    opportunityScore,
    riskScore,
  };
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POS FORMULA (FIXED WEIGHTS)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate POS using fixed convex combination
 * 
 * POS = w_qs × QS + w_os × OS + w_safety × (100 - Risk)
 * 
 * If OS is null (gated), renormalize weights:
 * POS = (w_qs / (w_qs + w_safety)) × QS + (w_safety / (w_qs + w_safety)) × (100 - Risk)
 */
function calculatePOS(qs: number, os: number | null, risk: number): number {
  const safety = 100 - risk;
  
  if (os === null) {
    // OS gated: renormalize
    const totalWeight = FIXED_WEIGHTS.w_qs + FIXED_WEIGHTS.w_safety;
    const pos = (FIXED_WEIGHTS.w_qs / totalWeight) * qs +
                (FIXED_WEIGHTS.w_safety / totalWeight) * safety;
    return Math.round(pos * 10) / 10;
  }
  
  // Full formula
  const pos = FIXED_WEIGHTS.w_qs * qs +
              FIXED_WEIGHTS.w_os * os +
              FIXED_WEIGHTS.w_safety * safety;
  
  return Math.round(pos * 10) / 10;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get cap bucket from market cap
 */
function getCapBucket(marketCapUsd?: number): CapBucket {
  if (!marketCapUsd) return 'mid';
  if (marketCapUsd >= 10_000_000_000) return 'mega';    // $10B+
  if (marketCapUsd >= 1_000_000_000) return 'large';    // $1B+
  if (marketCapUsd >= 100_000_000) return 'mid';        // $100M+
  if (marketCapUsd >= 10_000_000) return 'small';       // $10M+
  return 'micro';
}

/**
 * Create a gated result (when legitimacy/confidence fails)
 */
function createGatedResult(
  params: CalculateOmniScoreParams,
  legitimacy: OmniScoreResult['legitimacy'],
  gateReason: string,
  timestamp: string
): OmniScoreResult {
  const projectId = params.identity?.id ?? params.projectId ?? 'unknown';
  const symbol = params.identity?.symbol ?? params.symbol ?? projectId.toUpperCase();
  const name = params.identity?.name ?? params.name ?? projectId;
  const sector = params.sector || 'Unknown';
  const capBucket = getCapBucket(params.marketCapUsd);
  
  return {
    projectId,
    symbol,
    name,
    sector,
    capBucket,
    
    legitimacy,
    confidence: {
      level: 'insufficient',
      coverageQS: 0,
      coverageOS: 0,
      coverageRisk: 0,
      overallCoverage: 0,
      degraded: true,
      gated: true,
      missingRequired: [],
    },
    
    qs: 0,
    qsTier: 'Critical',
    os: null,
    osTier: null,
    osStatus: 'gated',
    risk: 100,
    riskTier: 'Critical',
    
    pos: 0,
    posTier: 'Critical',
    
    coverageQS: 0,
    coverageOS: 0,
    
    allocatorView: {
      recommendation: 'avoid',
      timeHorizon: '6-12 months',
      keyMetrics: ['qs', 'risk', 'confidence'],
      hideOS: true,
      rationale: gateReason,
    },
    traderView: {
      signal: 'strong_sell',
      timeHorizon: '1-4 weeks',
      keyMetrics: ['os', 'nrg', 'momentum'],
      gateReason,
      rationale: gateReason,
    },
    
    audit: {
      engineVersion: ENGINE_VERSION,
      formulaVersion: FORMULA_VERSION,
      methodologyId: METHODOLOGY_ID,
      timestamp,
      requestId: params.requestId,
      
      legitimacyChecked: true,
      confidenceChecked: true,
      smoothingApplied: false,
      
      totalDataPoints: params.dataPoints.length,
      validDataPoints: 0,
      staleDataPoints: 0,
      
      degraded: true,
      gated: true,
      gateReason,
    },
    
    qualityScore: {
      score: 0,
      tier: 'Critical',
      coverage: 0,
      segments: {} as any,
      breakdown: { team: 0, tech: 0, security: 0, governance: 0, ecosystem: 0 },
    },
    opportunityScore: {
      score: null,
      tier: null,
      status: 'gated',
      gateReason,
      coverage: 0,
      segments: {} as any,
    },
    riskScore: {
      score: 100,
      tier: 'Critical',
      segments: {} as any,
      eventRiskSeverity: 0,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { createSmoothingState };
