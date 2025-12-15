/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     💾 OMNISCORE STATE PERSISTENCE                                           ║
 * ║                                                                               ║
 * ║   Stores and retrieves OmniScore history for temporal smoothing.             ║
 * ║   Smoothing requires knowledge of previous POS to prevent wild swings.       ║
 * ║   State survives restarts and deployments.                                   ║
 * ║                                                                               ║
 * ║   Production Readiness Gate: Phase 5                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { PrismaClient } from '@prisma/client';
import { ENGINE_VERSION, FORMULA_VERSION } from './version';
import { OmniScoreError } from './errors';

// ═══════════════════════════════════════════════════════════════════════════════
// PRISMA CLIENT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

// Use global singleton to prevent connection exhaustion
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StoredPosState {
  pos: number;
  posRaw?: number | null;
  engineVersion: string;
  formulaVersion: string;
  timestamp: Date;
  regime?: string | null;
  capBucket?: string | null;
  sector?: string | null;
  qsCoverage?: number | null;
  osCoverage?: number | null;
}

export interface StorePosParams {
  projectId: string;
  pos: number;
  posRaw?: number;
  qsScore?: number;
  osScore?: number;
  riskScore?: number;
  regime?: string;
  capBucket?: string;
  sector?: string;
  qsCoverage?: number;
  osCoverage?: number;
  degraded?: boolean;
  inputsHash?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAG
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Feature flag for enabling persistence
 * Default: false during rollout, enable when ready
 */
export function isPersistenceEnabled(): boolean {
  return process.env.OMNISCORE_SMOOTHING_PERSIST === 'true';
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETRIEVAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the most recent POS for a project
 * Used for temporal smoothing
 * 
 * @param projectId - The project identifier
 * @param engineVersion - Only retrieve state from matching engine version
 * @returns Previous state or null if cold start
 */
export async function getPreviousPos(
  projectId: string,
  engineVersion: string = ENGINE_VERSION
): Promise<StoredPosState | null> {
  // If persistence disabled, return null (cold start behavior)
  if (!isPersistenceEnabled()) {
    return null;
  }
  
  try {
    const record = await prisma.omniScoreHistory.findFirst({
      where: {
        projectId,
        engineVersion,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        pos: true,
        posRaw: true,
        engineVersion: true,
        formulaVersion: true,
        createdAt: true,
        regime: true,
        capBucket: true,
        sector: true,
        qsCoverage: true,
        osCoverage: true,
      },
    });
    
    if (!record) {
      // Cold start - no previous state
      return null;
    }
    
    return {
      pos: record.pos,
      posRaw: record.posRaw,
      engineVersion: record.engineVersion,
      formulaVersion: record.formulaVersion,
      timestamp: record.createdAt,
      regime: record.regime,
      capBucket: record.capBucket,
      sector: record.sector,
      qsCoverage: record.qsCoverage,
      osCoverage: record.osCoverage,
    };
  } catch (error) {
    // Log but don't throw - return null to allow cold start fallback
    console.error('[OmniScore Persistence] Failed to get previous POS:', {
      projectId,
      engineVersion,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Get multiple recent states for a project (for debugging/analysis)
 */
export async function getRecentHistory(
  projectId: string,
  limit: number = 10
): Promise<StoredPosState[]> {
  if (!isPersistenceEnabled()) {
    return [];
  }
  
  try {
    const records = await prisma.omniScoreHistory.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        pos: true,
        posRaw: true,
        engineVersion: true,
        formulaVersion: true,
        createdAt: true,
        regime: true,
        capBucket: true,
        sector: true,
        qsCoverage: true,
        osCoverage: true,
      },
    });
    
    return records.map(r => ({
      pos: r.pos,
      posRaw: r.posRaw,
      engineVersion: r.engineVersion,
      formulaVersion: r.formulaVersion,
      timestamp: r.createdAt,
      regime: r.regime,
      capBucket: r.capBucket,
      sector: r.sector,
      qsCoverage: r.qsCoverage,
      osCoverage: r.osCoverage,
    }));
  } catch (error) {
    console.error('[OmniScore Persistence] Failed to get history:', {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Store POS after successful calculation
 * Only call after invariants are validated!
 * 
 * @param params - Score and metadata to store
 */
export async function storePosForSmoothing(
  params: StorePosParams
): Promise<void> {
  // If persistence disabled, skip silently
  if (!isPersistenceEnabled()) {
    return;
  }
  
  try {
    await prisma.omniScoreHistory.create({
      data: {
        projectId: params.projectId,
        pos: params.pos,
        posRaw: params.posRaw,
        qsScore: params.qsScore,
        osScore: params.osScore,
        riskScore: params.riskScore,
        engineVersion: ENGINE_VERSION,
        formulaVersion: FORMULA_VERSION,
        regime: params.regime,
        capBucket: params.capBucket,
        sector: params.sector,
        qsCoverage: params.qsCoverage,
        osCoverage: params.osCoverage,
        degraded: params.degraded ?? false,
        inputsHash: params.inputsHash,
        calculatedAt: new Date(),
      },
    });
  } catch (error) {
    // Log but don't throw - persistence failure shouldn't block response
    console.error('[OmniScore Persistence] Failed to store POS:', {
      projectId: params.projectId,
      pos: params.pos,
      error: error instanceof Error ? error.message : String(error),
    });
    // Optionally emit metric for monitoring
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate hours since last POS calculation
 * Used for smoothing decay factor
 */
export function getHoursSinceLastPos(lastTimestamp: Date | null): number | null {
  if (!lastTimestamp) return null;
  
  const now = new Date();
  const diffMs = now.getTime() - lastTimestamp.getTime();
  return diffMs / (1000 * 60 * 60); // Convert to hours
}

/**
 * Generate SHA256 hash of inputs for deduplication
 * Useful for detecting repeated identical calculations
 */
export async function computeInputsHash(inputs: unknown): Promise<string> {
  const crypto = await import('crypto');
  const jsonStr = JSON.stringify(inputs, Object.keys(inputs as object).sort());
  return crypto.createHash('sha256').update(jsonStr).digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clean up old history records (for maintenance)
 * Default: keep last 30 days
 */
export async function cleanupOldHistory(
  retentionDays: number = 30
): Promise<number> {
  if (!isPersistenceEnabled()) {
    return 0;
  }
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const result = await prisma.omniScoreHistory.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
    
    return result.count;
  } catch (error) {
    console.error('[OmniScore Persistence] Failed to cleanup old history:', error);
    return 0;
  }
}

/**
 * Get count of records per project (for monitoring)
 */
export async function getRecordCounts(): Promise<Record<string, number>> {
  if (!isPersistenceEnabled()) {
    return {};
  }
  
  try {
    const counts = await prisma.omniScoreHistory.groupBy({
      by: ['projectId'],
      _count: true,
    });
    
    return Object.fromEntries(
      counts.map(c => [c.projectId, c._count])
    );
  } catch (error) {
    console.error('[OmniScore Persistence] Failed to get record counts:', error);
    return {};
  }
}
