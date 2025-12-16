/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     💾 PERSISTENCE STORE                                                      ║
 * ║                                                                               ║
 * ║   Abstract store interface + in-memory implementation                        ║
 * ║   Production should use PostgreSQL/Supabase implementation                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  type OmniScoreStateRecord,
  type SmoothingState,
  type HistoryQuery,
  type HistoryResult,
  type LegitimacyStatus,
  type ScoringStatus,
  createInitialSmoothingState,
} from './schema';
import { ENGINE_VERSION, METHODOLOGY_ID } from '../constants';

// ═══════════════════════════════════════════════════════════════════════════════
// STORE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input for saving a new state
 */
export interface SaveStateInput {
  projectId: string;
  posFinal: number | null;
  posRaw: number;
  posSmoothed: number;
  qs: number;
  os: number | null;
  risk: number;
  confidence: number;
  coverageQs: number;
  coverageOs: number;
  legitimacy: LegitimacyStatus;
  status: ScoringStatus;
  dataTimestamp: Date;
}

/**
 * Abstract store interface
 */
export interface OmniScoreStore {
  /** Save a new state record */
  saveState(input: SaveStateInput): Promise<OmniScoreStateRecord>;
  
  /** Get the latest state for a project */
  getLatestState(projectId: string): Promise<OmniScoreStateRecord | null>;
  
  /** Get smoothing state for a project */
  getSmoothingState(projectId: string): Promise<SmoothingState>;
  
  /** Query historical states */
  queryHistory(query: HistoryQuery): Promise<HistoryResult>;
  
  /** Delete states for a project (for testing) */
  deleteProjectStates(projectId: string): Promise<number>;
  
  /** Clear all states (for testing) */
  clearAll(): Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE (for testing and development)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * In-memory implementation of OmniScoreStore
 * Suitable for testing and development
 */
export class InMemoryOmniScoreStore implements OmniScoreStore {
  private records: Map<string, OmniScoreStateRecord[]> = new Map();
  private idCounter = 0;
  
  async saveState(input: SaveStateInput): Promise<OmniScoreStateRecord> {
    const record: OmniScoreStateRecord = {
      id: `mem-${++this.idCounter}`,
      projectId: input.projectId,
      posFinal: input.posFinal,
      posRaw: input.posRaw,
      posSmoothed: input.posSmoothed,
      qs: input.qs,
      os: input.os,
      risk: input.risk,
      confidence: input.confidence,
      coverageQs: input.coverageQs,
      coverageOs: input.coverageOs,
      legitimacy: input.legitimacy,
      status: input.status,
      engineVersion: ENGINE_VERSION,
      methodologyId: METHODOLOGY_ID,
      createdAt: new Date(),
      dataTimestamp: input.dataTimestamp,
    };
    
    const projectRecords = this.records.get(input.projectId) ?? [];
    projectRecords.push(record);
    
    // Keep sorted by dataTimestamp descending
    projectRecords.sort((a, b) => b.dataTimestamp.getTime() - a.dataTimestamp.getTime());
    
    this.records.set(input.projectId, projectRecords);
    
    return record;
  }
  
  async getLatestState(projectId: string): Promise<OmniScoreStateRecord | null> {
    const projectRecords = this.records.get(projectId);
    if (!projectRecords || projectRecords.length === 0) {
      return null;
    }
    return projectRecords[0]; // Already sorted descending
  }
  
  async getSmoothingState(projectId: string): Promise<SmoothingState> {
    const latest = await this.getLatestState(projectId);
    
    if (!latest) {
      return createInitialSmoothingState(projectId);
    }
    
    const projectRecords = this.records.get(projectId) ?? [];
    
    return {
      prevPosSmoothed: latest.posSmoothed,
      prevTimestamp: latest.dataTimestamp,
      stateCount: projectRecords.length,
      projectId,
    };
  }
  
  async queryHistory(query: HistoryQuery): Promise<HistoryResult> {
    const projectRecords = this.records.get(query.projectId) ?? [];
    
    let filtered = [...projectRecords];
    
    // Apply date filters
    if (query.startDate) {
      filtered = filtered.filter(r => r.dataTimestamp >= query.startDate!);
    }
    if (query.endDate) {
      filtered = filtered.filter(r => r.dataTimestamp <= query.endDate!);
    }
    
    // Sort
    if (query.orderBy === 'asc') {
      filtered.sort((a, b) => a.dataTimestamp.getTime() - b.dataTimestamp.getTime());
    } else {
      filtered.sort((a, b) => b.dataTimestamp.getTime() - a.dataTimestamp.getTime());
    }
    
    const totalCount = filtered.length;
    
    // Apply limit
    const limit = query.limit ?? 100;
    const hasMore = filtered.length > limit;
    filtered = filtered.slice(0, limit);
    
    return {
      records: filtered,
      totalCount,
      hasMore,
    };
  }
  
  async deleteProjectStates(projectId: string): Promise<number> {
    const projectRecords = this.records.get(projectId);
    if (!projectRecords) return 0;
    
    const count = projectRecords.length;
    this.records.delete(projectId);
    return count;
  }
  
  async clearAll(): Promise<void> {
    this.records.clear();
    this.idCounter = 0;
  }
  
  // Debug helpers
  getRecordCount(): number {
    let count = 0;
    for (const records of this.records.values()) {
      count += records.length;
    }
    return count;
  }
  
  getProjectCount(): number {
    return this.records.size;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON STORE INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let storeInstance: OmniScoreStore | null = null;

/**
 * Get the current store instance
 * Creates an in-memory store if none exists
 */
export function getStore(): OmniScoreStore {
  if (!storeInstance) {
    storeInstance = new InMemoryOmniScoreStore();
  }
  return storeInstance;
}

/**
 * Set a custom store instance (e.g., PostgreSQL)
 */
export function setStore(store: OmniScoreStore): void {
  storeInstance = store;
}

/**
 * Reset to default (for testing)
 */
export function resetStore(): void {
  storeInstance = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIGH-LEVEL PERSISTENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

import { applySmoothingEMA, type SmoothingResult } from './smoothing';

export interface PersistScoreInput {
  projectId: string;
  posRaw: number;
  qs: number;
  os: number | null;
  risk: number;
  confidence: number;
  coverageQs: number;
  coverageOs: number;
  legitimacy: LegitimacyStatus;
  status: ScoringStatus;
  posFinal: number | null;
  dataTimestamp?: Date;
}

export interface PersistScoreResult {
  record: OmniScoreStateRecord;
  smoothing: SmoothingResult;
}

/**
 * Persist a score with automatic smoothing
 */
export async function persistScore(input: PersistScoreInput): Promise<PersistScoreResult> {
  const store = getStore();
  const timestamp = input.dataTimestamp ?? new Date();
  
  // Get previous smoothing state
  const prevState = await store.getSmoothingState(input.projectId);
  
  // Apply smoothing
  const smoothing = applySmoothingEMA({
    posRaw: input.posRaw,
    prevState: prevState.stateCount > 0 ? prevState : null,
    timestamp,
  });
  
  // Determine final POS (gated if legitimacy/confidence fails)
  const posFinal = input.posFinal !== null 
    ? smoothing.posSmoothed  // Use smoothed value for final
    : null;
  
  // Save state
  const record = await store.saveState({
    projectId: input.projectId,
    posFinal,
    posRaw: input.posRaw,
    posSmoothed: smoothing.posSmoothed,
    qs: input.qs,
    os: input.os,
    risk: input.risk,
    confidence: input.confidence,
    coverageQs: input.coverageQs,
    coverageOs: input.coverageOs,
    legitimacy: input.legitimacy,
    status: input.status,
    dataTimestamp: timestamp,
  });
  
  return { record, smoothing };
}

/**
 * Get latest score with smoothing info
 */
export async function getLatestScore(projectId: string): Promise<{
  record: OmniScoreStateRecord;
  smoothingState: SmoothingState;
} | null> {
  const store = getStore();
  
  const record = await store.getLatestState(projectId);
  if (!record) return null;
  
  const smoothingState = await store.getSmoothingState(projectId);
  
  return { record, smoothingState };
}

/**
 * Get score history for a project
 */
export async function getScoreHistory(
  projectId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<HistoryResult> {
  const store = getStore();
  
  return store.queryHistory({
    projectId,
    startDate: options?.startDate,
    endDate: options?.endDate,
    limit: options?.limit ?? 100,
    orderBy: 'desc',
  });
}
