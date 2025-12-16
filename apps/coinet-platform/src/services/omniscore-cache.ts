/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🗄️ OMNISCORE CACHE LAYER - CONSISTENCY ENGINE                            ║
 * ║                                                                               ║
 * ║   Purpose: Ensure score consistency across repeated queries                   ║
 * ║                                                                               ║
 * ║   Rules:                                                                      ║
 * ║   1. Same project within cache window = SAME score (no variance)             ║
 * ║   2. QS is cached longer (slow-moving fundamentals)                          ║
 * ║   3. OS is cached shorter (fast-moving opportunity)                          ║
 * ║   4. Previous scores are used as anchors for temporal smoothing              ║
 * ║   5. Cache includes confidence + timestamp for staleness detection           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const CACHE_CONFIG = {
  // How long to return the EXACT same score (no recalculation)
  SCORE_TTL_MS: 10 * 60 * 1000,         // 10 minutes - repeated queries = same score
  
  // How long to use previous score as anchor for smoothing
  ANCHOR_TTL_MS: 24 * 60 * 60 * 1000,   // 24 hours - use previous score for smoothing
  
  // Maximum daily change limits (for temporal smoothing)
  QS_MAX_DAILY_DELTA: 3,                // QS can't move more than ±3 points/day
  OS_MAX_DAILY_DELTA: 8,                // OS can move ±8 points/day (faster)
  POS_MAX_DAILY_DELTA: 5,               // POS can't move more than ±5 points/day
  
  // Exception: High Event Risk Severity allows larger moves
  ERS_THRESHOLD_FOR_LARGE_MOVE: 0.5,    // ERS > 0.5 allows breaking daily limits
  
  // Cleanup interval
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000,   // Clean stale entries every 5 minutes
};

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CachedScore {
  projectId: string;
  timestamp: number;
  
  // Core scores
  qs: number;
  os: number | null;
  rs: number;          // Risk score (0-100, higher = riskier)
  pos: number;
  
  // Metadata
  qsTier: string;
  osTier: string | null;
  posTier: string;
  confidence: string;
  quadrant: string;
  
  // For smoothing
  qsRaw: number;       // Before smoothing
  osRaw: number | null;
  posRaw: number;
  
  // Audit
  engineVersion: string;
  cacheHit: boolean;
}

export interface ScoreHistory {
  projectId: string;
  scores: Array<{
    timestamp: number;
    qs: number;
    os: number | null;
    pos: number;
    confidence: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY CACHE (Use Redis in production for persistence across instances)
// ═══════════════════════════════════════════════════════════════════════════════

class OmniScoreCache {
  private cache: Map<string, CachedScore> = new Map();
  private history: Map<string, ScoreHistory> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startCleanup();
  }
  
  /**
   * Get cached score if still valid
   */
  get(projectId: string): CachedScore | null {
    const key = this.normalizeKey(projectId);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_CONFIG.SCORE_TTL_MS) {
      // Cache expired, but keep for history/smoothing
      return null;
    }
    
    logger.info(`[OmniScore Cache] HIT for ${projectId}`, {
      age: `${(age / 1000).toFixed(1)}s`,
      pos: cached.pos,
      tier: cached.posTier,
    });
    
    return { ...cached, cacheHit: true };
  }
  
  /**
   * Get previous score for temporal smoothing (even if cache expired)
   */
  getPreviousForSmoothing(projectId: string): CachedScore | null {
    const key = this.normalizeKey(projectId);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_CONFIG.ANCHOR_TTL_MS) {
      // Too old even for smoothing
      return null;
    }
    
    return cached;
  }
  
  /**
   * Store a new score
   */
  set(score: Omit<CachedScore, 'cacheHit'>): void {
    const key = this.normalizeKey(score.projectId);
    
    // Store in cache
    this.cache.set(key, { ...score, cacheHit: false });
    
    // Add to history
    this.addToHistory(score);
    
    logger.info(`[OmniScore Cache] SET for ${score.projectId}`, {
      pos: score.pos,
      tier: score.posTier,
      confidence: score.confidence,
    });
  }
  
  /**
   * Apply temporal smoothing to new scores based on previous values
   */
  applyTemporalSmoothing(
    projectId: string,
    newQs: number,
    newOs: number | null,
    newPos: number,
    eventRiskSeverity: number = 0
  ): { qs: number; os: number | null; pos: number; smoothingApplied: boolean; details: string } {
    const previous = this.getPreviousForSmoothing(projectId);
    
    if (!previous) {
      // No previous score - use new values directly
      return {
        qs: newQs,
        os: newOs,
        pos: newPos,
        smoothingApplied: false,
        details: 'No previous score for smoothing',
      };
    }
    
    const timeDeltaMs = Date.now() - previous.timestamp;
    const timeDeltaDays = timeDeltaMs / (24 * 60 * 60 * 1000);
    
    // Allow larger moves if high ERS (real event happening)
    const allowLargeMove = eventRiskSeverity >= CACHE_CONFIG.ERS_THRESHOLD_FOR_LARGE_MOVE;
    
    // Calculate max allowed deltas (scaled by time)
    const qsMaxDelta = allowLargeMove ? 15 : CACHE_CONFIG.QS_MAX_DAILY_DELTA * Math.max(timeDeltaDays, 0.1);
    const osMaxDelta = allowLargeMove ? 25 : CACHE_CONFIG.OS_MAX_DAILY_DELTA * Math.max(timeDeltaDays, 0.1);
    const posMaxDelta = allowLargeMove ? 20 : CACHE_CONFIG.POS_MAX_DAILY_DELTA * Math.max(timeDeltaDays, 0.1);
    
    // Smooth each score
    const smoothedQs = this.smoothValue(previous.qs, newQs, qsMaxDelta);
    const smoothedOs = newOs !== null && previous.os !== null 
      ? this.smoothValue(previous.os, newOs, osMaxDelta)
      : newOs;
    const smoothedPos = this.smoothValue(previous.pos, newPos, posMaxDelta);
    
    const qsDelta = Math.abs(newQs - previous.qs);
    const osDelta = newOs !== null && previous.os !== null ? Math.abs(newOs - previous.os) : 0;
    const posDelta = Math.abs(newPos - previous.pos);
    
    const wasSmoothed = 
      smoothedQs !== newQs || 
      smoothedOs !== newOs || 
      smoothedPos !== newPos;
    
    if (wasSmoothed) {
      logger.info(`[OmniScore Cache] Temporal smoothing applied for ${projectId}`, {
        qsRaw: newQs.toFixed(1),
        qsSmoothed: smoothedQs.toFixed(1),
        osRaw: newOs?.toFixed(1) ?? 'null',
        osSmoothed: smoothedOs?.toFixed(1) ?? 'null',
        posRaw: newPos.toFixed(1),
        posSmoothed: smoothedPos.toFixed(1),
        timeDelta: `${(timeDeltaMs / 1000 / 60).toFixed(1)} minutes`,
        allowLargeMove,
      });
    }
    
    return {
      qs: smoothedQs,
      os: smoothedOs,
      pos: smoothedPos,
      smoothingApplied: wasSmoothed,
      details: wasSmoothed 
        ? `Smoothed: QS ${qsDelta.toFixed(1)}→${Math.abs(smoothedQs - previous.qs).toFixed(1)}, ` +
          `OS ${osDelta.toFixed(1)}→${smoothedOs !== null && previous.os !== null ? Math.abs(smoothedOs - previous.os).toFixed(1) : 'N/A'}, ` +
          `POS ${posDelta.toFixed(1)}→${Math.abs(smoothedPos - previous.pos).toFixed(1)}`
        : 'No smoothing needed',
    };
  }
  
  /**
   * Smooth a value toward target within max delta
   */
  private smoothValue(previous: number, target: number, maxDelta: number): number {
    const delta = target - previous;
    if (Math.abs(delta) <= maxDelta) {
      return target; // Within limits, use target
    }
    // Clamp to max delta
    return previous + Math.sign(delta) * maxDelta;
  }
  
  /**
   * Add score to history (for trend analysis)
   */
  private addToHistory(score: Omit<CachedScore, 'cacheHit'>): void {
    const key = this.normalizeKey(score.projectId);
    
    if (!this.history.has(key)) {
      this.history.set(key, {
        projectId: score.projectId,
        scores: [],
      });
    }
    
    const history = this.history.get(key)!;
    history.scores.push({
      timestamp: score.timestamp,
      qs: score.qs,
      os: score.os,
      pos: score.pos,
      confidence: score.confidence,
    });
    
    // Keep last 100 scores per project
    if (history.scores.length > 100) {
      history.scores = history.scores.slice(-100);
    }
  }
  
  /**
   * Get score history for a project
   */
  getHistory(projectId: string, limit: number = 10): ScoreHistory | null {
    const key = this.normalizeKey(projectId);
    const history = this.history.get(key);
    
    if (!history) return null;
    
    return {
      ...history,
      scores: history.scores.slice(-limit),
    };
  }
  
  /**
   * Normalize project ID for cache key
   */
  private normalizeKey(projectId: string): string {
    return projectId.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  
  /**
   * Start periodic cleanup of stale entries
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, cached] of this.cache.entries()) {
        if (now - cached.timestamp > CACHE_CONFIG.ANCHOR_TTL_MS) {
          this.cache.delete(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        logger.info(`[OmniScore Cache] Cleaned ${cleaned} stale entries`);
      }
    }, CACHE_CONFIG.CLEANUP_INTERVAL_MS);
  }
  
  /**
   * Clear all cache (for testing)
   */
  clear(): void {
    this.cache.clear();
    this.history.clear();
  }
  
  /**
   * Get cache stats
   */
  getStats(): { size: number; historySize: number } {
    return {
      size: this.cache.size,
      historySize: this.history.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

export const omniScoreCache = new OmniScoreCache();

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default omniScoreCache;
