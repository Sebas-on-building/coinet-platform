/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     💾 PERSISTENCE SCHEMA                                                     ║
 * ║                                                                               ║
 * ║   Database schema for OmniScore state persistence                            ║
 * ║   Enables smoothing across restarts and historical tracking                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// OMNISCORE STATE TABLE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SQL Schema for omniscore_state table
 * 
 * CREATE TABLE omniscore_state (
 *   id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   project_id            VARCHAR(255) NOT NULL,
 *   
 *   -- Core scores
 *   pos_final             DECIMAL(5,2),           -- nullable if gated
 *   pos_raw               DECIMAL(5,2) NOT NULL,
 *   pos_smoothed          DECIMAL(5,2) NOT NULL,
 *   
 *   -- Component scores (for debugging/history)
 *   qs                    DECIMAL(5,2) NOT NULL,
 *   os                    DECIMAL(5,2),           -- nullable if OS gated
 *   risk                  DECIMAL(5,2) NOT NULL,
 *   confidence            DECIMAL(5,2) NOT NULL,
 *   
 *   -- Coverage metrics
 *   coverage_qs           DECIMAL(3,2) NOT NULL,
 *   coverage_os           DECIMAL(3,2) NOT NULL,
 *   
 *   -- Status
 *   legitimacy            VARCHAR(20) NOT NULL,   -- LEGIT, WATCH, NOT_LEGIT, INSUFFICIENT_DATA
 *   status                VARCHAR(20) NOT NULL,   -- scored, partial, gated
 *   
 *   -- Versioning
 *   engine_version        VARCHAR(20) NOT NULL,
 *   methodology_id        VARCHAR(50) NOT NULL,
 *   
 *   -- Timestamps
 *   created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   data_timestamp        TIMESTAMPTZ NOT NULL,   -- when the data was fetched
 *   
 *   -- Indexes
 *   CONSTRAINT unique_project_timestamp UNIQUE (project_id, data_timestamp)
 * );
 * 
 * -- Indexes for efficient queries
 * CREATE INDEX idx_omniscore_state_project ON omniscore_state(project_id);
 * CREATE INDEX idx_omniscore_state_project_created ON omniscore_state(project_id, created_at DESC);
 * CREATE INDEX idx_omniscore_state_legitimacy ON omniscore_state(legitimacy);
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPESCRIPT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface OmniScoreStateRecord {
  id: string;
  projectId: string;
  
  // Core scores
  posFinal: number | null;
  posRaw: number;
  posSmoothed: number;
  
  // Component scores
  qs: number;
  os: number | null;
  risk: number;
  confidence: number;
  
  // Coverage
  coverageQs: number;
  coverageOs: number;
  
  // Status
  legitimacy: LegitimacyStatus;
  status: ScoringStatus;
  
  // Versioning
  engineVersion: string;
  methodologyId: string;
  
  // Timestamps
  createdAt: Date;
  dataTimestamp: Date;
}

export type LegitimacyStatus = 'LEGIT' | 'WATCH' | 'NOT_LEGIT' | 'INSUFFICIENT_DATA';
export type ScoringStatus = 'scored' | 'partial' | 'gated';

// ═══════════════════════════════════════════════════════════════════════════════
// SMOOTHING STATE (IN-MEMORY + DB BACKED)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * State required for EMA smoothing
 */
export interface SmoothingState {
  /** Previous smoothed POS value */
  prevPosSmoothed: number | null;
  /** Timestamp of previous state */
  prevTimestamp: Date | null;
  /** Number of consecutive states (for cold-start detection) */
  stateCount: number;
  /** Project ID */
  projectId: string;
}

/**
 * Create initial smoothing state (cold start)
 */
export function createInitialSmoothingState(projectId: string): SmoothingState {
  return {
    prevPosSmoothed: null,
    prevTimestamp: null,
    stateCount: 0,
    projectId,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY QUERY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface HistoryQuery {
  projectId: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  orderBy?: 'asc' | 'desc';
}

export interface HistoryResult {
  records: OmniScoreStateRecord[];
  totalCount: number;
  hasMore: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIGRATION SQL
// ═══════════════════════════════════════════════════════════════════════════════

export const CREATE_TABLE_SQL = `
-- OmniScore State Table
-- Stores historical score states for smoothing and analytics

CREATE TABLE IF NOT EXISTS omniscore_state (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            VARCHAR(255) NOT NULL,
  
  -- Core scores
  pos_final             DECIMAL(5,2),
  pos_raw               DECIMAL(5,2) NOT NULL,
  pos_smoothed          DECIMAL(5,2) NOT NULL,
  
  -- Component scores
  qs                    DECIMAL(5,2) NOT NULL,
  os                    DECIMAL(5,2),
  risk                  DECIMAL(5,2) NOT NULL,
  confidence            DECIMAL(5,2) NOT NULL,
  
  -- Coverage metrics
  coverage_qs           DECIMAL(3,2) NOT NULL,
  coverage_os           DECIMAL(3,2) NOT NULL,
  
  -- Status
  legitimacy            VARCHAR(20) NOT NULL,
  status                VARCHAR(20) NOT NULL,
  
  -- Versioning
  engine_version        VARCHAR(20) NOT NULL,
  methodology_id        VARCHAR(50) NOT NULL,
  
  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_timestamp        TIMESTAMPTZ NOT NULL,
  
  -- Constraints
  CONSTRAINT chk_pos_range CHECK (pos_raw >= 0 AND pos_raw <= 100),
  CONSTRAINT chk_qs_range CHECK (qs >= 0 AND qs <= 100),
  CONSTRAINT chk_risk_range CHECK (risk >= 0 AND risk <= 100),
  CONSTRAINT chk_confidence_range CHECK (confidence >= 0 AND confidence <= 100),
  CONSTRAINT chk_coverage_range CHECK (coverage_qs >= 0 AND coverage_qs <= 1 AND coverage_os >= 0 AND coverage_os <= 1),
  CONSTRAINT chk_legitimacy CHECK (legitimacy IN ('LEGIT', 'WATCH', 'NOT_LEGIT', 'INSUFFICIENT_DATA')),
  CONSTRAINT chk_status CHECK (status IN ('scored', 'partial', 'gated'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_omniscore_state_project 
  ON omniscore_state(project_id);

CREATE INDEX IF NOT EXISTS idx_omniscore_state_project_created 
  ON omniscore_state(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_omniscore_state_legitimacy 
  ON omniscore_state(legitimacy);

CREATE INDEX IF NOT EXISTS idx_omniscore_state_data_timestamp 
  ON omniscore_state(data_timestamp DESC);

-- Unique constraint to prevent duplicate states for same project at same time
CREATE UNIQUE INDEX IF NOT EXISTS idx_omniscore_state_unique 
  ON omniscore_state(project_id, data_timestamp);
`;

export const DROP_TABLE_SQL = `
DROP TABLE IF EXISTS omniscore_state CASCADE;
`;
