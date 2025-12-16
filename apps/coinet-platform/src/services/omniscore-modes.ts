/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 OMNISCORE MODES - ALLOCATOR VS TRADER                                  ║
 * ║                                                                               ║
 * ║   Two-mode system on top of the single shared "Legitimacy Engine"             ║
 * ║                                                                               ║
 * ║   ALLOCATOR MODE (Long-term):                                                 ║
 * ║   - Wants: durability, survivability, asymmetric upside with controlled risk  ║
 * ║   - Score: QS heavy (70-85%), OS light (15-30%)                              ║
 * ║   - Strong risk gating: high RS caps the score harder                        ║
 * ║   - Longer smoothing window; less sensitivity to momentum noise              ║
 * ║                                                                               ║
 * ║   TRADER MODE (Short-term):                                                   ║
 * ║   - Wants: safe enough to trade + is it moving + where's the trap            ║
 * ║   - Score: OS heavy (55-75%), QS moderate (25-45%)                           ║
 * ║   - Hard blocks: legitimacy gate fail or confidence low → "don't trade"      ║
 * ║   - Strong microstructure focus: liquidity, spread, manipulation risk        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';
import type { OmniScoreSnapshot, TierLabel, ConfidenceLevel, CapBucket, SectorType } from './omniscore-v2.5';
import { LegitimacyGate, assessLegitimacy, type LegitimacyResult, type LegitimacyStatus } from './omniscore-legitimacy';

// ═══════════════════════════════════════════════════════════════════════════════
// MODE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type UserMode = 'allocator' | 'trader';

export type AllocatorVerdict = 'ACCUMULATE' | 'HOLD' | 'WATCH' | 'AVOID';
export type TraderVerdict = 'TREND' | 'MEAN_REVERT' | 'WAIT' | 'AVOID';

export interface ModeConfig {
  qsWeight: number;       // 0-1, how much QS affects final score
  osWeight: number;       // 0-1, how much OS affects final score
  rsMultiplier: number;   // Risk score impact multiplier (higher = stricter)
  smoothingFactor: number; // Higher = more smoothing
  minConfidence: number;  // Minimum confidence for confident verdict
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const MODE_CONFIGS: Record<UserMode, ModeConfig> = {
  allocator: {
    qsWeight: 0.75,         // QS is 75% of allocator score
    osWeight: 0.25,         // OS is 25% of allocator score
    rsMultiplier: 1.5,      // Risk has 1.5x impact
    smoothingFactor: 0.9,   // High smoothing (slow-moving)
    minConfidence: 0.65,    // Need 65% confidence for verdict
  },
  trader: {
    qsWeight: 0.35,         // QS is 35% of trader score
    osWeight: 0.65,         // OS is 65% of trader score
    rsMultiplier: 1.0,      // Standard risk impact
    smoothingFactor: 0.5,   // Low smoothing (responsive)
    minConfidence: 0.50,    // Need 50% confidence for verdict
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODE OUTPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AllocatorOutput {
  mode: 'allocator';
  
  // Legitimacy check
  legit: LegitimacyStatus;
  
  // Core scores
  allocatorScore: number;      // 0-100, weighted blend
  qs: number;                  // Quality Score
  rs: number;                  // Risk Score
  confidence: ConfidenceLevel;
  
  // Verdict
  verdict: AllocatorVerdict;
  verdictReason: string;
  
  // Drivers
  topReasons: string[];
  topRisks: string[];
  
  // Forward-looking
  whatWouldImprove: string[];
  whatWouldWorsen: string[];
  
  // Meta
  tier: TierLabel;
  quadrant: string;
}

export interface TraderOutput {
  mode: 'trader';
  
  // Legitimacy check
  tradeSafe: boolean;          // Is it safe to trade?
  
  // Core scores
  traderScore: number;         // 0-100, OS-heavy weighted blend
  os: number;                  // Opportunity Score
  rs: number;                  // Risk Score
  confidence: ConfidenceLevel;
  
  // Verdict
  verdict: TraderVerdict;
  verdictReason: string;
  
  // Trap warnings
  trapWarnings: string[];
  
  // What's needed for upgrade
  catalystNeeded: string;
  
  // Meta
  tier: TierLabel;
  quadrant: string;
}

export interface UnifiedModeOutput {
  projectId: string;
  timestamp: string;
  
  // Legitimacy (shared)
  legitimacy: LegitimacyResult;
  
  // Core scores (shared)
  qs: number;
  os: number | null;
  rs: number;
  pos: number;              // Combined OmniScore
  confidence: ConfidenceLevel;
  quadrant: string;
  tier: TierLabel;
  
  // Mode-specific
  allocator: AllocatorOutput;
  trader: TraderOutput;
  
  // What data was used
  coverageQS: number;
  coverageOS: number;
  
  // Audit
  engineVersion: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERDICT CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

function calculateAllocatorVerdict(
  allocatorScore: number,
  qs: number,
  rs: number,
  confidence: ConfidenceLevel,
  legitimacy: LegitimacyStatus
): { verdict: AllocatorVerdict; reason: string } {
  // Hard blocks
  if (legitimacy === 'NOT_LEGIT') {
    return { verdict: 'AVOID', reason: 'Project failed legitimacy gate' };
  }
  if (legitimacy === 'INSUFFICIENT_DATA') {
    return { verdict: 'WATCH', reason: 'Insufficient data for confident assessment' };
  }
  if (confidence === 'insufficient' || confidence === 'low') {
    return { verdict: 'WATCH', reason: 'Low confidence in data quality' };
  }
  
  // Risk-based blocks
  if (rs >= 70) {
    return { verdict: 'AVOID', reason: `High risk score (${rs.toFixed(0)}/100)` };
  }
  if (rs >= 50 && qs < 70) {
    return { verdict: 'AVOID', reason: `Elevated risk (${rs.toFixed(0)}) with weak fundamentals (QS ${qs.toFixed(0)})` };
  }
  
  // Score-based verdicts
  if (allocatorScore >= 85 && qs >= 80) {
    return { verdict: 'ACCUMULATE', reason: `Strong fundamentals (QS ${qs.toFixed(0)}) with favorable score (${allocatorScore.toFixed(0)})` };
  }
  if (allocatorScore >= 70 && qs >= 65) {
    return { verdict: 'HOLD', reason: `Decent fundamentals (QS ${qs.toFixed(0)}) worth maintaining position` };
  }
  if (allocatorScore >= 55) {
    return { verdict: 'WATCH', reason: `Moderate score (${allocatorScore.toFixed(0)}) - monitor for improvement` };
  }
  
  return { verdict: 'AVOID', reason: `Weak allocator score (${allocatorScore.toFixed(0)}) - insufficient quality` };
}

function calculateTraderVerdict(
  traderScore: number,
  os: number | null,
  rs: number,
  confidence: ConfidenceLevel,
  legitimacy: LegitimacyStatus,
  qs: number
): { verdict: TraderVerdict; reason: string } {
  // Hard blocks
  if (legitimacy === 'NOT_LEGIT') {
    return { verdict: 'AVOID', reason: 'Project failed legitimacy gate - do not trade' };
  }
  if (legitimacy === 'INSUFFICIENT_DATA') {
    return { verdict: 'WAIT', reason: 'Insufficient data - wait for clarity' };
  }
  if (confidence === 'insufficient') {
    return { verdict: 'WAIT', reason: 'Insufficient confidence - wait for better data' };
  }
  
  // OS gated
  if (os === null) {
    return { verdict: 'WAIT', reason: 'Opportunity Score gated - wait for quality improvement' };
  }
  
  // Microstructure risk
  if (rs >= 75) {
    return { verdict: 'AVOID', reason: `Very high risk (${rs.toFixed(0)}) - stay away` };
  }
  if (rs >= 60 && os >= 70) {
    return { verdict: 'AVOID', reason: `High risk (${rs.toFixed(0)}) despite opportunity - trap warning` };
  }
  
  // Score-based verdicts
  if (os >= 75 && qs >= 60 && rs < 50) {
    return { verdict: 'TREND', reason: `Strong opportunity (OS ${os.toFixed(0)}) with solid quality (QS ${qs.toFixed(0)})` };
  }
  if (os < 50 && qs >= 70) {
    return { verdict: 'MEAN_REVERT', reason: `Undervalued quality (QS ${qs.toFixed(0)}) with low opportunity (OS ${os.toFixed(0)}) - mean reversion play` };
  }
  if (os >= 60 && rs < 60) {
    return { verdict: 'TREND', reason: `Active opportunity (OS ${os.toFixed(0)}) with acceptable risk` };
  }
  
  return { verdict: 'WAIT', reason: `Trader score (${traderScore.toFixed(0)}) doesn't justify entry - wait for setup` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate mode-specific scores and verdicts from an OmniScore snapshot
 */
export function calculateModeOutputs(
  snapshot: OmniScoreSnapshot,
  legitimacy: LegitimacyResult
): UnifiedModeOutput {
  const config = {
    allocator: MODE_CONFIGS.allocator,
    trader: MODE_CONFIGS.trader,
  };
  
  const qs = snapshot.qs;
  const os = snapshot.os;
  const rs = snapshot.risk;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ALLOCATOR SCORE: QS-heavy, risk-gated
  // ═══════════════════════════════════════════════════════════════════════════
  const allocatorBase = os !== null
    ? config.allocator.qsWeight * qs + config.allocator.osWeight * os
    : qs; // If OS gated, use pure QS
  
  // Apply risk penalty
  const allocatorRiskPenalty = Math.max(0, (rs - 30) * 0.3 * config.allocator.rsMultiplier);
  const allocatorScore = Math.max(0, Math.min(100, allocatorBase - allocatorRiskPenalty));
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TRADER SCORE: OS-heavy, microstructure-focused
  // ═══════════════════════════════════════════════════════════════════════════
  const traderBase = os !== null
    ? config.trader.qsWeight * qs + config.trader.osWeight * os
    : qs * 0.5; // If OS gated, heavily discount
  
  // Apply risk penalty (lighter for traders, they expect some risk)
  const traderRiskPenalty = Math.max(0, (rs - 40) * 0.25 * config.trader.rsMultiplier);
  const traderScore = Math.max(0, Math.min(100, traderBase - traderRiskPenalty));
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VERDICTS
  // ═══════════════════════════════════════════════════════════════════════════
  const allocatorVerdict = calculateAllocatorVerdict(
    allocatorScore, qs, rs, snapshot.confidence, legitimacy.status
  );
  
  const traderVerdict = calculateTraderVerdict(
    traderScore, os, rs, snapshot.confidence, legitimacy.status, qs
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD OUTPUTS
  // ═══════════════════════════════════════════════════════════════════════════
  const quadrant = getQuadrant(qs, os);
  
  const allocatorOutput: AllocatorOutput = {
    mode: 'allocator',
    legit: legitimacy.status,
    allocatorScore: Math.round(allocatorScore * 10) / 10,
    qs,
    rs,
    confidence: snapshot.confidence,
    verdict: allocatorVerdict.verdict,
    verdictReason: allocatorVerdict.reason,
    topReasons: buildAllocatorReasons(qs, rs, legitimacy),
    topRisks: buildAllocatorRisks(rs, legitimacy),
    whatWouldImprove: buildImprovementActions(qs, os, rs, 'allocator'),
    whatWouldWorsen: buildWorsenFactors(qs, rs),
    tier: snapshot.tier,
    quadrant,
  };
  
  const traderOutput: TraderOutput = {
    mode: 'trader',
    tradeSafe: legitimacy.status === 'LEGIT' && rs < 70 && snapshot.confidence !== 'insufficient',
    traderScore: Math.round(traderScore * 10) / 10,
    os: os ?? 0,
    rs,
    confidence: snapshot.confidence,
    verdict: traderVerdict.verdict,
    verdictReason: traderVerdict.reason,
    trapWarnings: buildTrapWarnings(rs, os, legitimacy),
    catalystNeeded: buildCatalystNeeded(os, qs, traderVerdict.verdict),
    tier: snapshot.tier,
    quadrant,
  };
  
  return {
    projectId: snapshot.id,
    timestamp: snapshot.audit.timestamp,
    legitimacy,
    qs,
    os,
    rs,
    pos: snapshot.posAdjusted,
    confidence: snapshot.confidence,
    quadrant,
    tier: snapshot.tier,
    allocator: allocatorOutput,
    trader: traderOutput,
    coverageQS: snapshot.coverageQS,
    coverageOS: snapshot.coverageOS,
    engineVersion: snapshot.audit.engineVersion,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getQuadrant(qs: number, os: number | null): string {
  const qsThreshold = 60;
  const osThreshold = 60;
  
  if (qs >= qsThreshold && os !== null && os >= osThreshold) return 'TARGET';
  if (qs >= qsThreshold && (os === null || os < osThreshold)) return 'BUILDER';
  if (qs < qsThreshold && os !== null && os >= osThreshold) return 'HYPE';
  return 'AVOID';
}

function buildAllocatorReasons(qs: number, rs: number, legitimacy: LegitimacyResult): string[] {
  const reasons: string[] = [];
  
  if (qs >= 85) reasons.push('Elite fundamentals (QS 85+)');
  else if (qs >= 70) reasons.push('Strong fundamentals (QS 70-84)');
  else if (qs >= 55) reasons.push('Moderate fundamentals (QS 55-69)');
  
  if (rs < 30) reasons.push('Low risk profile');
  if (legitimacy.status === 'LEGIT') reasons.push('Passed all legitimacy checks');
  
  if (legitimacy.passedChecks >= 4) reasons.push(`${legitimacy.passedChecks}/5 integrity checks passed`);
  
  return reasons.slice(0, 3);
}

function buildAllocatorRisks(rs: number, legitimacy: LegitimacyResult): string[] {
  const risks: string[] = [];
  
  if (rs >= 60) risks.push('High risk score - position sizing caution');
  else if (rs >= 40) risks.push('Moderate risk - monitor closely');
  
  risks.push(...legitimacy.watchReasons.slice(0, 2));
  
  return risks.slice(0, 3);
}

function buildImprovementActions(qs: number, os: number | null, rs: number, mode: UserMode): string[] {
  const actions: string[] = [];
  
  if (qs < 70) actions.push('Improve security posture / audit coverage');
  if (os !== null && os < 60) actions.push('Increase liquidity depth');
  if (rs >= 50) actions.push('Address concentration / centralization risks');
  
  if (mode === 'allocator') {
    if (qs < 80) actions.push('Strengthen ecosystem integrations');
  } else {
    if (os !== null && os < 70) actions.push('Wait for volume/momentum pickup');
  }
  
  return actions.slice(0, 3);
}

function buildWorsenFactors(qs: number, rs: number): string[] {
  const factors: string[] = [];
  
  factors.push('Security incident or exploit');
  factors.push('Major unlock/vesting cliff');
  if (qs >= 80) factors.push('Key team departure');
  factors.push('Regulatory action');
  
  return factors.slice(0, 3);
}

function buildTrapWarnings(rs: number, os: number | null, legitimacy: LegitimacyResult): string[] {
  const warnings: string[] = [];
  
  if (rs >= 50) warnings.push('⚠️ Elevated risk score');
  if (os !== null && os >= 80 && rs >= 40) warnings.push('⚠️ High OS with moderate risk - potential trap');
  if (legitimacy.status === 'WATCH') warnings.push('⚠️ Legitimacy concerns - trade with caution');
  
  warnings.push(...legitimacy.failedReasons.slice(0, 2).map(r => `⚠️ ${r}`));
  
  return warnings.slice(0, 3);
}

function buildCatalystNeeded(os: number | null, qs: number, verdict: TraderVerdict): string {
  if (verdict === 'TREND') return 'Already in favorable position - maintain momentum';
  if (verdict === 'MEAN_REVERT') return 'Volume increase or narrative shift to unlock value';
  if (verdict === 'WAIT') {
    if (os !== null && os < 50) return 'OS needs to reach 60+ for entry signal';
    if (qs < 60) return 'QS needs to improve above 60 (quality gate)';
    return 'Wait for clearer trend or reduced risk';
  }
  return 'Major improvements needed before considering';
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const OmniScoreModes = {
  calculateModeOutputs,
  MODE_CONFIGS,
};

export default OmniScoreModes;
