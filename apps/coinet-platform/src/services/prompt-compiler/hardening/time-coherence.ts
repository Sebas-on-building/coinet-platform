/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ⏱️ TIME COHERENCE GATE                                                    ║
 * ║                                                                               ║
 * ║   Don't mix stale + fresh facts silently.                                    ║
 * ║   If timestamps are too far apart, the narrative becomes misleading.         ║
 * ║                                                                               ║
 * ║   RULES:                                                                      ║
 * ║   - If max(ts) - min(ts) > threshold → flag incoherence                      ║
 * ║   - Force renderer to say "as of X minutes ago"                              ║
 * ║   - Lower confidence when time-incoherent                                    ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Final hardening                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../../utils/logger';
import type { EvidencePack, EvidenceModule } from '../research-engine';
import type { StructuredClaim } from './structured-claims';

// ============================================================================
// TYPES
// ============================================================================

export interface ModuleTimestamp {
  module: string;
  timestamp: number;
  ageSeconds: number;
  freshness: 'fresh' | 'acceptable' | 'stale' | 'very_stale';
}

export interface TimeCoherenceResult {
  isCoherent: boolean;
  maxSpreadSeconds: number;
  oldestModule: ModuleTimestamp | null;
  newestModule: ModuleTimestamp | null;
  staleModules: string[];
  freshnessWarning: string | null;
  confidenceAdjustment: 'none' | 'downgrade_one' | 'downgrade_two' | 'force_low';
  requiredDisclosure: string | null;
  shouldRefresh: string[];
}

export interface TimeCoherenceConfig {
  maxSpreadSeconds: number;      // Max allowed timestamp spread
  staleThresholdSeconds: number; // When to consider a module stale
  veryStaleThresholdSeconds: number;
  forceDisclosureThresholdSeconds: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_TIME_CONFIG: TimeCoherenceConfig = {
  maxSpreadSeconds: 300,         // 5 minutes max spread
  staleThresholdSeconds: 180,    // 3 minutes = stale
  veryStaleThresholdSeconds: 600, // 10 minutes = very stale
  forceDisclosureThresholdSeconds: 120, // Force "as of X ago" if > 2 min
};

// ============================================================================
// FRESHNESS THRESHOLDS PER MODULE TYPE
// ============================================================================

const MODULE_FRESHNESS_THRESHOLDS: Record<string, number> = {
  dexscreener: 60,    // Price/volume needs to be fresh
  security: 1800,     // Security flags change slowly
  holders: 300,       // Holder data moderate
  sentiment: 600,     // Sentiment moderate
  news: 900,          // News can be older
  derivatives: 120,   // Derivatives need to be fresh
  onchain: 300,       // On-chain moderate
  pumpfun: 60,        // Pump data needs to be fresh
  smartmoney: 300,    // Smart money moderate
};

// ============================================================================
// TIME COHERENCE CHECK
// ============================================================================

/**
 * Check time coherence across all modules in evidence
 */
export function checkTimeCoherence(
  evidencePack: EvidencePack,
  config: TimeCoherenceConfig = DEFAULT_TIME_CONFIG
): TimeCoherenceResult {
  const now = Date.now();
  const timestamps: ModuleTimestamp[] = [];
  
  // Extract timestamps from each module
  for (const [moduleName, moduleData] of Object.entries(evidencePack.evidence)) {
    if (!moduleData) continue;
    
    const ts = (moduleData as EvidenceModule).ts || 0;
    if (ts === 0) continue;
    
    const ageSeconds = (now - ts) / 1000;
    const threshold = MODULE_FRESHNESS_THRESHOLDS[moduleName] || config.staleThresholdSeconds;
    
    let freshness: ModuleTimestamp['freshness'];
    if (ageSeconds <= threshold / 2) {
      freshness = 'fresh';
    } else if (ageSeconds <= threshold) {
      freshness = 'acceptable';
    } else if (ageSeconds <= config.veryStaleThresholdSeconds) {
      freshness = 'stale';
    } else {
      freshness = 'very_stale';
    }
    
    timestamps.push({
      module: moduleName,
      timestamp: ts,
      ageSeconds,
      freshness,
    });
  }
  
  if (timestamps.length === 0) {
    return {
      isCoherent: true,
      maxSpreadSeconds: 0,
      oldestModule: null,
      newestModule: null,
      staleModules: [],
      freshnessWarning: null,
      confidenceAdjustment: 'none',
      requiredDisclosure: null,
      shouldRefresh: [],
    };
  }
  
  // Sort by timestamp
  timestamps.sort((a, b) => a.timestamp - b.timestamp);
  
  const oldest = timestamps[0];
  const newest = timestamps[timestamps.length - 1];
  const maxSpread = (newest.timestamp - oldest.timestamp) / 1000;
  
  const staleModules = timestamps
    .filter(t => t.freshness === 'stale' || t.freshness === 'very_stale')
    .map(t => t.module);
  
  const veryStaleModules = timestamps
    .filter(t => t.freshness === 'very_stale')
    .map(t => t.module);
  
  // Determine coherence
  const isCoherent = maxSpread <= config.maxSpreadSeconds && veryStaleModules.length === 0;
  
  // Determine confidence adjustment
  let confidenceAdjustment: TimeCoherenceResult['confidenceAdjustment'] = 'none';
  if (veryStaleModules.length > 0) {
    confidenceAdjustment = 'force_low';
  } else if (maxSpread > config.maxSpreadSeconds) {
    confidenceAdjustment = 'downgrade_two';
  } else if (staleModules.length > 0) {
    confidenceAdjustment = 'downgrade_one';
  }
  
  // Build freshness warning
  let freshnessWarning: string | null = null;
  if (staleModules.length > 0) {
    freshnessWarning = `Stale modules: ${staleModules.join(', ')} (${Math.round(oldest.ageSeconds)}s old)`;
  }
  
  // Build required disclosure
  let requiredDisclosure: string | null = null;
  if (oldest.ageSeconds > config.forceDisclosureThresholdSeconds) {
    const minutes = Math.round(oldest.ageSeconds / 60);
    requiredDisclosure = minutes > 1 
      ? `as of ${minutes} minutes ago`
      : `as of about a minute ago`;
  }
  
  // Determine what to refresh
  const shouldRefresh = timestamps
    .filter(t => t.freshness === 'stale' || t.freshness === 'very_stale')
    .filter(t => ['dexscreener', 'derivatives', 'pumpfun'].includes(t.module)) // High-priority
    .map(t => t.module);
  
  if (!isCoherent) {
    logger.warn('⏱️ Time incoherence detected', {
      maxSpread,
      oldest: oldest.module,
      newest: newest.module,
      staleCount: staleModules.length,
    });
  }
  
  return {
    isCoherent,
    maxSpreadSeconds: maxSpread,
    oldestModule: oldest,
    newestModule: newest,
    staleModules,
    freshnessWarning,
    confidenceAdjustment,
    requiredDisclosure,
    shouldRefresh,
  };
}

// ============================================================================
// CLAIM-SPECIFIC TIME CHECK
// ============================================================================

/**
 * Check time coherence for specific claims being used
 */
export function checkClaimTimeCoherence(
  claims: StructuredClaim[],
  evidencePack: EvidencePack,
  config: TimeCoherenceConfig = DEFAULT_TIME_CONFIG
): {
  allFresh: boolean;
  staleClaims: Array<{ claim: StructuredClaim; ageSeconds: number; module: string }>;
  timeConflicts: Array<{ claim1: StructuredClaim; claim2: StructuredClaim; spreadSeconds: number }>;
} {
  const claimAges: Array<{ claim: StructuredClaim; ts: number; module: string }> = [];
  
  for (const claim of claims) {
    // Extract module from evidence_keys
    const module = claim.evidence_keys[0]?.split('.')[1];
    if (!module) continue;
    
    const moduleData = (evidencePack.evidence as Record<string, EvidenceModule | undefined>)[module];
    if (!moduleData?.ts) continue;
    
    claimAges.push({ claim, ts: moduleData.ts, module });
  }
  
  const now = Date.now();
  const staleClaims: Array<{ claim: StructuredClaim; ageSeconds: number; module: string }> = [];
  const timeConflicts: Array<{ claim1: StructuredClaim; claim2: StructuredClaim; spreadSeconds: number }> = [];
  
  // Check each claim for staleness
  for (const { claim, ts, module } of claimAges) {
    const ageSeconds = (now - ts) / 1000;
    const threshold = MODULE_FRESHNESS_THRESHOLDS[module] || config.staleThresholdSeconds;
    
    if (ageSeconds > threshold) {
      staleClaims.push({ claim, ageSeconds, module });
    }
  }
  
  // Check for time conflicts between claims
  for (let i = 0; i < claimAges.length; i++) {
    for (let j = i + 1; j < claimAges.length; j++) {
      const spread = Math.abs(claimAges[i].ts - claimAges[j].ts) / 1000;
      
      if (spread > config.maxSpreadSeconds) {
        timeConflicts.push({
          claim1: claimAges[i].claim,
          claim2: claimAges[j].claim,
          spreadSeconds: spread,
        });
      }
    }
  }
  
  return {
    allFresh: staleClaims.length === 0 && timeConflicts.length === 0,
    staleClaims,
    timeConflicts,
  };
}

// ============================================================================
// TIME BOUNDS FOR RENDERER
// ============================================================================

export interface TimeBounds {
  oldestDataAge: number;      // Seconds
  newestDataAge: number;      // Seconds
  requiresDisclosure: boolean;
  disclosureText: string | null;
  moduleAges: Record<string, number>;
}

/**
 * Generate time bounds for the renderer to use
 */
export function generateTimeBounds(evidencePack: EvidencePack): TimeBounds {
  const now = Date.now();
  const moduleAges: Record<string, number> = {};
  let oldest = 0;
  let newest = Infinity;
  
  for (const [moduleName, moduleData] of Object.entries(evidencePack.evidence)) {
    if (!moduleData) continue;
    
    const ts = (moduleData as EvidenceModule).ts || 0;
    if (ts === 0) continue;
    
    const ageSeconds = Math.round((now - ts) / 1000);
    moduleAges[moduleName] = ageSeconds;
    
    if (ageSeconds > oldest) oldest = ageSeconds;
    if (ageSeconds < newest) newest = ageSeconds;
  }
  
  if (newest === Infinity) newest = 0;
  
  const requiresDisclosure = oldest > 120; // 2 minutes
  let disclosureText: string | null = null;
  
  if (requiresDisclosure) {
    const minutes = Math.round(oldest / 60);
    if (minutes >= 60) {
      const hours = Math.round(minutes / 60);
      disclosureText = `as of ${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 1) {
      disclosureText = `as of ${minutes} minutes ago`;
    } else {
      disclosureText = `as of about a minute ago`;
    }
  }
  
  return {
    oldestDataAge: oldest,
    newestDataAge: newest,
    requiresDisclosure,
    disclosureText,
    moduleAges,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  MODULE_FRESHNESS_THRESHOLDS,
  DEFAULT_TIME_CONFIG as TIME_COHERENCE_CONFIG,
};
