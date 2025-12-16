/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     💾 PERSISTENCE MODULE INDEX                                               ║
 * ║                                                                               ║
 * ║   Database persistence + EMA smoothing for OmniScore v3.0                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type OmniScoreStateRecord,
  type SmoothingState,
  type LegitimacyStatus,
  type ScoringStatus,
  type HistoryQuery,
  type HistoryResult,
  
  // Functions
  createInitialSmoothingState,
  
  // SQL
  CREATE_TABLE_SQL,
  DROP_TABLE_SQL,
} from './schema';

// ═══════════════════════════════════════════════════════════════════════════════
// SMOOTHING
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Config
  SMOOTHING_CONFIG,
  
  // Types
  type SmoothingInput,
  type SmoothingResult,
  type BatchSmoothingInput,
  type BatchSmoothingResult,
  type SmoothingAnalysis,
  
  // Functions
  applySmoothingEMA,
  isSmoothingWarmedUp,
  calculateHalfLife,
  calculateReflection,
  simulateSmoothing,
  applyBatchSmoothing,
  analyzeSmoothingResults,
} from './smoothing';

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type OmniScoreStore,
  type SaveStateInput,
  type PersistScoreInput,
  type PersistScoreResult,
  
  // Classes
  InMemoryOmniScoreStore,
  
  // Store management
  getStore,
  setStore,
  resetStore,
  
  // High-level functions
  persistScore,
  getLatestScore,
  getScoreHistory,
} from './store';
