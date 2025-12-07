/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMNISCORE STABILITY SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ensures score continuity and prevents wild swings from data degradation.
 * 
 * Key Features:
 * 1. Last-Known-Good (LKG) snapshot store
 * 2. Score Continuity Guard (INV-12)
 * 3. Source health → weight suppression
 * 4. Gating with freeze (uses LKG, not neutral reset)
 * 
 * Philosophy: A fundamentally stable project shouldn't appear to "collapse"
 * overnight due to pipeline/coverage/API issues.
 */

import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface OmniScoreSnapshot {
  projectId: string;
  timestamp: Date;
  pos: number;
  posAdj: number;
  qs: number;
  os: number | null;  // null if gated
  coverageQS: number;
  coverageOS: number;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  sourceHealth: SourceHealthReport;
  version: string;
}

export interface SourceHealthReport {
  market: 'healthy' | 'degraded' | 'failed';
  social: 'healthy' | 'degraded' | 'failed';
  news: 'healthy' | 'degraded' | 'failed';
  derivatives: 'healthy' | 'degraded' | 'failed';
  overall: 'healthy' | 'degraded' | 'critical';
}

export interface StabilityCheckResult {
  isStable: boolean;
  continuityApplied: boolean;
  freezeApplied: boolean;
  reasons: string[];
  adjustedPOS?: number;
  adjustedOS?: number;
  stabilityNotes: string[];
}

export interface ContinuityGuardParams {
  prevSnapshot: OmniScoreSnapshot | null;
  newPOS: number;
  newQS: number;
  newOS: number | null;
  newCoverageQS: number;
  newCoverageOS: number;
  eventRiskSeverity: number;
  sourceHealth: SourceHealthReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// INV-12: Stability thresholds
const STABILITY_CONFIG = {
  // Maximum allowed daily score changes without high event risk
  MAX_QS_DELTA_24H: 5,           // QS is slow-moving fundamentals
  MAX_POS_DELTA_24H: 12,         // POS can move faster but still bounded
  MAX_OS_DELTA_24H: 20,          // OS is fast-moving but shouldn't whiplash
  
  // Coverage thresholds for stability enforcement
  MIN_COVERAGE_FOR_STABLE_QS: 0.60,
  COVERAGE_DROP_THRESHOLD: 0.15,  // 15% sudden loss triggers guard
  
  // Blending factors for continuity guard
  CONTINUITY_BLEND_ALPHA: 0.7,   // Keep 70% of prior when degraded
  
  // LKG cache TTL
  LKG_MAX_AGE_HOURS: 24,
  LKG_STALE_HOURS: 6,
  
  // Source health suppression factors
  DEGRADED_SOURCE_WEIGHT_FACTOR: 0.5,
  FAILED_SOURCE_WEIGHT_FACTOR: 0.1,
};

// In-memory LKG store (would be Redis in production for multi-instance)
const lkgStore: Map<string, OmniScoreSnapshot> = new Map();

// ═══════════════════════════════════════════════════════════════════════════════
// LAST-KNOWN-GOOD (LKG) STORE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Save a snapshot as last-known-good for a project
 */
export function saveLKGSnapshot(snapshot: OmniScoreSnapshot): void {
  // Only save if confidence is at least medium
  if (snapshot.confidence === 'insufficient') {
    logger.debug('🔒 LKG: Not saving snapshot with insufficient confidence', {
      projectId: snapshot.projectId,
      confidence: snapshot.confidence,
    });
    return;
  }
  
  lkgStore.set(snapshot.projectId.toLowerCase(), {
    ...snapshot,
    timestamp: new Date(),
  });
  
  logger.debug('🔒 LKG: Snapshot saved', {
    projectId: snapshot.projectId,
    pos: snapshot.pos,
    qs: snapshot.qs,
    os: snapshot.os,
    confidence: snapshot.confidence,
  });
}

/**
 * Get last-known-good snapshot for a project
 */
export function getLKGSnapshot(projectId: string): OmniScoreSnapshot | null {
  const snapshot = lkgStore.get(projectId.toLowerCase());
  
  if (!snapshot) {
    return null;
  }
  
  // Check if too old
  const ageMs = Date.now() - snapshot.timestamp.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  
  if (ageHours > STABILITY_CONFIG.LKG_MAX_AGE_HOURS) {
    logger.debug('🔒 LKG: Snapshot expired', {
      projectId,
      ageHours: Math.round(ageHours),
      maxAge: STABILITY_CONFIG.LKG_MAX_AGE_HOURS,
    });
    lkgStore.delete(projectId.toLowerCase());
    return null;
  }
  
  return snapshot;
}

/**
 * Check if LKG is stale (should be refreshed but can still be used)
 */
export function isLKGStale(projectId: string): boolean {
  const snapshot = lkgStore.get(projectId.toLowerCase());
  if (!snapshot) return true;
  
  const ageMs = Date.now() - snapshot.timestamp.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  
  return ageHours > STABILITY_CONFIG.LKG_STALE_HOURS;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INV-12: SCORE CONTINUITY GUARD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply continuity guard to prevent wild score swings from data degradation
 * 
 * Key principle: If coverage drops or sources degrade, blend toward previous
 * stable values instead of recomputing from noisy partial data.
 */
export function applyContinuityGuard(params: ContinuityGuardParams): StabilityCheckResult {
  const {
    prevSnapshot,
    newPOS,
    newQS,
    newOS,
    newCoverageQS,
    newCoverageOS,
    eventRiskSeverity,
    sourceHealth,
  } = params;
  
  const result: StabilityCheckResult = {
    isStable: true,
    continuityApplied: false,
    freezeApplied: false,
    reasons: [],
    stabilityNotes: [],
  };
  
  // No previous data = no guard to apply
  if (!prevSnapshot) {
    result.adjustedPOS = newPOS;
    result.adjustedOS = newOS ?? undefined;
    return result;
  }
  
  let adjustedPOS = newPOS;
  let adjustedOS = newOS;
  
  // Check 1: Coverage drop
  const coverageQSDrop = (prevSnapshot.coverageQS || 0) - newCoverageQS;
  const coverageOSDrop = (prevSnapshot.coverageOS || 0) - newCoverageOS;
  const hardCoverageDrop = coverageQSDrop >= STABILITY_CONFIG.COVERAGE_DROP_THRESHOLD ||
                           coverageOSDrop >= STABILITY_CONFIG.COVERAGE_DROP_THRESHOLD;
  
  if (hardCoverageDrop) {
    result.continuityApplied = true;
    result.reasons.push('coverage_drop');
    result.stabilityNotes.push(
      `Coverage decreased from ${(prevSnapshot.coverageQS * 100).toFixed(0)}% → ${(newCoverageQS * 100).toFixed(0)}%`
    );
    
    // Blend toward previous value
    const alpha = STABILITY_CONFIG.CONTINUITY_BLEND_ALPHA;
    adjustedPOS = alpha * prevSnapshot.pos + (1 - alpha) * newPOS;
    
    if (adjustedOS !== null && prevSnapshot.os !== null) {
      adjustedOS = alpha * prevSnapshot.os + (1 - alpha) * adjustedOS;
    }
  }
  
  // Check 2: Source health degradation
  if (sourceHealth.overall === 'critical' || sourceHealth.overall === 'degraded') {
    result.continuityApplied = true;
    result.reasons.push('source_degradation');
    result.stabilityNotes.push(
      `Source health: ${sourceHealth.overall} (MARKET: ${sourceHealth.market}, SOCIAL: ${sourceHealth.social})`
    );
    
    // Additional blending for degraded sources
    if (!hardCoverageDrop) {
      const alpha = sourceHealth.overall === 'critical' ? 0.8 : 0.6;
      adjustedPOS = alpha * prevSnapshot.pos + (1 - alpha) * newPOS;
    }
  }
  
  // Check 3: Abrupt change guard (INV-12)
  // Only applies when no high event risk and coverage is good
  if (eventRiskSeverity < 0.2 && newCoverageQS >= STABILITY_CONFIG.MIN_COVERAGE_FOR_STABLE_QS) {
    const qsDelta = Math.abs(newQS - prevSnapshot.qs);
    const posDelta = Math.abs(adjustedPOS - prevSnapshot.pos);
    
    if (qsDelta > STABILITY_CONFIG.MAX_QS_DELTA_24H) {
      result.isStable = false;
      result.reasons.push('qs_jump_exceeded');
      result.stabilityNotes.push(
        `QS jump ${qsDelta.toFixed(1)} exceeds max ${STABILITY_CONFIG.MAX_QS_DELTA_24H} (no major event detected)`
      );
      
      // Clamp the change
      const direction = newQS > prevSnapshot.qs ? 1 : -1;
      const clampedQS = prevSnapshot.qs + (direction * STABILITY_CONFIG.MAX_QS_DELTA_24H);
      // Adjust POS proportionally
      const qsWeight = 0.6; // Approximate QS contribution to POS
      adjustedPOS = adjustedPOS - (newQS - clampedQS) * qsWeight;
    }
    
    if (posDelta > STABILITY_CONFIG.MAX_POS_DELTA_24H) {
      result.isStable = false;
      result.reasons.push('pos_jump_exceeded');
      result.stabilityNotes.push(
        `POS jump ${posDelta.toFixed(1)} exceeds max ${STABILITY_CONFIG.MAX_POS_DELTA_24H}`
      );
      
      // Clamp the change
      const direction = adjustedPOS > prevSnapshot.pos ? 1 : -1;
      adjustedPOS = prevSnapshot.pos + (direction * STABILITY_CONFIG.MAX_POS_DELTA_24H);
    }
  }
  
  result.adjustedPOS = Math.round(adjustedPOS * 10) / 10;
  result.adjustedOS = adjustedOS !== null ? Math.round(adjustedOS * 10) / 10 : undefined;
  
  if (result.continuityApplied || !result.isStable) {
    logger.info('🔒 Stability: Continuity guard applied', {
      project: prevSnapshot.projectId,
      originalPOS: newPOS,
      adjustedPOS: result.adjustedPOS,
      reasons: result.reasons,
    });
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE HEALTH WEIGHT SUPPRESSION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate source health from available data
 */
export function calculateSourceHealth(params: {
  marketKeysConfigured: number;
  marketKeysTotal: number;
  socialKeysConfigured: number;
  socialKeysTotal: number;
  derivativesKeysConfigured: number;
  derivativesKeysTotal: number;
  newsKeysConfigured: number;
  newsKeysTotal: number;
  recentErrors?: string[];
}): SourceHealthReport {
  const {
    marketKeysConfigured,
    marketKeysTotal,
    socialKeysConfigured,
    socialKeysTotal,
    derivativesKeysConfigured,
    derivativesKeysTotal,
    newsKeysConfigured,
    newsKeysTotal,
    recentErrors = [],
  } = params;
  
  const getHealth = (configured: number, total: number): 'healthy' | 'degraded' | 'failed' => {
    const ratio = total > 0 ? configured / total : 0;
    if (ratio >= 0.75) return 'healthy';
    if (ratio >= 0.25) return 'degraded';
    return 'failed';
  };
  
  const market = getHealth(marketKeysConfigured, marketKeysTotal);
  const social = getHealth(socialKeysConfigured, socialKeysTotal);
  const derivatives = getHealth(derivativesKeysConfigured, derivativesKeysTotal);
  const news = getHealth(newsKeysConfigured, newsKeysTotal);
  
  // Check for recent errors that indicate degradation
  const hasRecentErrors = recentErrors.length > 0;
  
  // Calculate overall health
  const healthScores = { healthy: 2, degraded: 1, failed: 0 };
  const totalScore = healthScores[market] + healthScores[social] + 
                     healthScores[derivatives] + healthScores[news];
  
  let overall: 'healthy' | 'degraded' | 'critical';
  if (totalScore >= 6 && !hasRecentErrors) {
    overall = 'healthy';
  } else if (totalScore >= 3) {
    overall = 'degraded';
  } else {
    overall = 'critical';
  }
  
  return { market, social, news, derivatives, overall };
}

/**
 * Apply weight suppression based on source health
 * 
 * When a data source is degraded, reduce its contribution to prevent
 * noisy partial data from dominating the score.
 */
export function applySourceHealthWeightSuppression(
  weights: Record<string, number>,
  sourceHealth: SourceHealthReport
): Record<string, number> {
  const adjusted = { ...weights };
  
  // Suppress MARKET/VAL weights if market source is degraded
  if (sourceHealth.market === 'degraded') {
    if (adjusted.MARKET) adjusted.MARKET *= STABILITY_CONFIG.DEGRADED_SOURCE_WEIGHT_FACTOR;
    if (adjusted.VAL) adjusted.VAL *= STABILITY_CONFIG.DEGRADED_SOURCE_WEIGHT_FACTOR;
  } else if (sourceHealth.market === 'failed') {
    if (adjusted.MARKET) adjusted.MARKET *= STABILITY_CONFIG.FAILED_SOURCE_WEIGHT_FACTOR;
    if (adjusted.VAL) adjusted.VAL *= STABILITY_CONFIG.FAILED_SOURCE_WEIGHT_FACTOR;
  }
  
  // Suppress COMM weights if social source is degraded
  if (sourceHealth.social === 'degraded') {
    if (adjusted.COMM) adjusted.COMM *= STABILITY_CONFIG.DEGRADED_SOURCE_WEIGHT_FACTOR;
  } else if (sourceHealth.social === 'failed') {
    if (adjusted.COMM) adjusted.COMM *= STABILITY_CONFIG.FAILED_SOURCE_WEIGHT_FACTOR;
  }
  
  // Normalize weights to sum to 1
  const total = Object.values(adjusted).reduce((sum, w) => sum + w, 0);
  if (total > 0) {
    for (const key of Object.keys(adjusted)) {
      adjusted[key] = adjusted[key] / total;
    }
  }
  
  return adjusted;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATING WITH FREEZE (Uses LKG, not neutral reset)
// ═══════════════════════════════════════════════════════════════════════════════

export interface GatingResult {
  isGated: boolean;
  freezeApplied: boolean;
  frozenOS: number | null;
  reason: string | null;
  stabilityNote: string | null;
}

/**
 * Apply gating with freeze logic
 * 
 * When OS becomes gated, freeze at last-known-good OS instead of
 * resetting to neutral (which causes visual "crashes").
 */
export function applyGatingWithFreeze(
  projectId: string,
  coverageQS: number,
  coverageThreshold: number = 0.60
): GatingResult {
  const isGated = coverageQS < coverageThreshold;
  
  if (!isGated) {
    return {
      isGated: false,
      freezeApplied: false,
      frozenOS: null,
      reason: null,
      stabilityNote: null,
    };
  }
  
  // Get LKG snapshot
  const lkg = getLKGSnapshot(projectId);
  
  if (lkg && lkg.os !== null) {
    return {
      isGated: true,
      freezeApplied: true,
      frozenOS: lkg.os,
      reason: `QS coverage ${(coverageQS * 100).toFixed(0)}% below threshold ${(coverageThreshold * 100).toFixed(0)}%`,
      stabilityNote: `OS frozen at last-known-good value (${lkg.os.toFixed(1)}) due to low QS coverage`,
    };
  }
  
  // No LKG available, use neutral
  return {
    isGated: true,
    freezeApplied: false,
    frozenOS: 50, // Neutral fallback
    reason: `QS coverage ${(coverageQS * 100).toFixed(0)}% below threshold; no LKG available`,
    stabilityNote: `OS set to neutral (50) due to low QS coverage and no historical data`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STABILITY SUMMARY FOR AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════════════════════

export interface StabilitySummary {
  continuityGuardActive: boolean;
  sourceHealthSuppressed: boolean;
  gatingFreezeApplied: boolean;
  lkgUsed: boolean;
  lkgAge: string | null;
  stabilityNotes: string[];
  dataQualityWarnings: string[];
}

/**
 * Generate a stability summary for the audit trail
 */
export function generateStabilitySummary(params: {
  continuityResult?: StabilityCheckResult;
  gatingResult?: GatingResult;
  sourceHealth: SourceHealthReport;
  lkgSnapshot?: OmniScoreSnapshot | null;
}): StabilitySummary {
  const { continuityResult, gatingResult, sourceHealth, lkgSnapshot } = params;
  
  const stabilityNotes: string[] = [];
  const dataQualityWarnings: string[] = [];
  
  // Collect stability notes
  if (continuityResult?.stabilityNotes) {
    stabilityNotes.push(...continuityResult.stabilityNotes);
  }
  if (gatingResult?.stabilityNote) {
    stabilityNotes.push(gatingResult.stabilityNote);
  }
  
  // Add source health warnings
  if (sourceHealth.market === 'failed') {
    dataQualityWarnings.push('MARKET data source unavailable');
  } else if (sourceHealth.market === 'degraded') {
    dataQualityWarnings.push('MARKET data source degraded (weight suppressed)');
  }
  
  if (sourceHealth.social === 'failed') {
    dataQualityWarnings.push('SOCIAL data source unavailable');
  } else if (sourceHealth.social === 'degraded') {
    dataQualityWarnings.push('SOCIAL data source degraded (weight suppressed)');
  }
  
  // Calculate LKG age
  let lkgAge: string | null = null;
  if (lkgSnapshot) {
    const ageMs = Date.now() - lkgSnapshot.timestamp.getTime();
    const ageMinutes = Math.round(ageMs / (1000 * 60));
    if (ageMinutes < 60) {
      lkgAge = `${ageMinutes}m`;
    } else {
      const ageHours = Math.round(ageMinutes / 60);
      lkgAge = `${ageHours}h`;
    }
  }
  
  return {
    continuityGuardActive: continuityResult?.continuityApplied ?? false,
    sourceHealthSuppressed: sourceHealth.overall !== 'healthy',
    gatingFreezeApplied: gatingResult?.freezeApplied ?? false,
    lkgUsed: (continuityResult?.continuityApplied || gatingResult?.freezeApplied) ?? false,
    lkgAge,
    stabilityNotes,
    dataQualityWarnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const STABILITY_THRESHOLDS = STABILITY_CONFIG;

