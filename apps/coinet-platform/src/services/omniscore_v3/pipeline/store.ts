/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     💾 STORE STATE                                                            ║
 * ║                                                                               ║
 * ║   Persist snapshot to database                                               ║
 * ║   Returns the stored record for confirmation                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  persistScore,
  type OmniScoreStateRecord,
  type PersistScoreResult,
} from '../persistence';
import type { OmniScoreSnapshot, StepResult, PipelineContext } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StoreStateInput {
  snapshot: OmniScoreSnapshot;
  context: PipelineContext;
}

export interface StoreStateResult {
  success: boolean;
  record: OmniScoreStateRecord | null;
  error?: {
    code: string;
    message: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Store a snapshot to the database
 * 
 * This is THE ONLY way to persist scores.
 */
export async function storeState(input: StoreStateInput): Promise<StoreStateResult> {
  const { snapshot, context } = input;
  
  try {
    // Map legitimacy label to persistence format
    const legitimacyMap: Record<string, 'LEGIT' | 'WATCH' | 'NOT_LEGIT' | 'INSUFFICIENT_DATA'> = {
      'LEGIT': 'LEGIT',
      'WATCH': 'WATCH',
      'SUSPICIOUS': 'NOT_LEGIT',
      'NOT_LEGIT': 'NOT_LEGIT',
      'INSUFFICIENT_DATA': 'INSUFFICIENT_DATA',
      'SEVERE': 'NOT_LEGIT',
    };
    
    const result = await persistScore({
      projectId: snapshot.identity.id,
      posRaw: snapshot.posRaw,
      qs: snapshot.qs,
      os: snapshot.os,
      risk: snapshot.risk,
      confidence: snapshot.confidence,
      coverageQs: snapshot.coverageQS,
      coverageOs: snapshot.coverageOS,
      legitimacy: legitimacyMap[snapshot.legitimacy] ?? 'INSUFFICIENT_DATA',
      status: snapshot.status,
      posFinal: snapshot.posFinal,
      dataTimestamp: new Date(snapshot.audit.dataTimestamp),
    });
    
    // Update context
    context.persistedRecord = result.record;
    
    return {
      success: true,
      record: result.record,
    };
  } catch (err) {
    return {
      success: false,
      record: null,
      error: {
        code: 'STORE_FAILED',
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Build store step result
// ═══════════════════════════════════════════════════════════════════════════════

export function createStoreStepResult(
  result: StoreStateResult,
  startTime: number
): StepResult<OmniScoreStateRecord> {
  if (result.success && result.record) {
    return {
      step: 'EMIT_SNAPSHOT', // Store is part of emit
      success: true,
      data: result.record,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
  
  return {
    step: 'EMIT_SNAPSHOT',
    success: false,
    error: {
      code: result.error?.code ?? 'UNKNOWN',
      message: result.error?.message ?? 'Storage failed',
      recoverable: true, // Can retry
    },
    duration: Date.now() - startTime,
    timestamp: new Date(),
  };
}
