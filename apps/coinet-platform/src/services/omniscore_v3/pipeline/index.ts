/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 PIPELINE MODULE INDEX                                                  ║
 * ║                                                                               ║
 * ║   THE SINGLE CALCULATION PATH                                                ║
 * ║   NO alternate engines, NO side paths                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Pipeline types
  type PipelineStep,
  type StepResult,
  type DataBundle,
  type PipelineContext,
  type OmniScoreSnapshot,
  type PipelineConfig,
  type PipelineResult,
  
  // Constants
  PIPELINE_STEPS,
  DEFAULT_PIPELINE_CONFIG,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════════════════════════════════════════

export {
  fetchBundle,
  isBundleViable,
  type FetchBundleInput,
  type FetchBundleResult,
} from './fetch';

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULATE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  calculateSnapshot,
  type CalculateSnapshotInput,
  type CalculateSnapshotResult,
} from './calculate';

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  storeState,
  createStoreStepResult,
  type StoreStateInput,
  type StoreStateResult,
} from './store';

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR (THE SINGLE ENTRYPOINT)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Main function
  computeOmniScore,
  
  // Batch processing
  computeOmniScoreBatch,
  
  // Validation
  validatePipelineCompletion,
  validatePipelineOrder,
  
  // Inspection
  getPipelineSummary,
  
  // Types
  type ComputeOmniScoreInput,
  type BatchComputeInput,
  type BatchComputeResult,
} from './orchestrator';
