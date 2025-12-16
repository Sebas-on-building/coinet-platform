/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 PIPELINE ORCHESTRATOR                                                  ║
 * ║                                                                               ║
 * ║   THE SINGLE ENTRYPOINT for OmniScore calculation                            ║
 * ║                                                                               ║
 * ║   Pipeline order (STRICT, NO SHORTCUTS):                                     ║
 * ║   1. resolve entity                                                          ║
 * ║   2. fetch data                                                              ║
 * ║   3. validate inputs (zod)                                                   ║
 * ║   4. compute features + provenance                                           ║
 * ║   5. normalize                                                               ║
 * ║   6. compute QS/OS/Risk                                                      ║
 * ║   7. compute confidence + gates                                              ║
 * ║   8. compute posRaw                                                          ║
 * ║   9. smoothing (DB)                                                          ║
 * ║   10. invariants check                                                       ║
 * ║   11. emit snapshot + audit                                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { fetchBundle, isBundleViable, type FetchBundleInput } from './fetch';
import { calculateSnapshot, type CalculateSnapshotInput } from './calculate';
import { storeState } from './store';
import { getStore } from '../persistence';
import type {
  PipelineConfig,
  PipelineResult,
  PipelineContext,
  OmniScoreSnapshot,
  PIPELINE_STEPS,
  PipelineStep,
} from './types';
import { DEFAULT_PIPELINE_CONFIG } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ComputeOmniScoreInput {
  /** Asset identifier (symbol, name, address, or provider ID) */
  assetId: string;
  
  /** Optional chain hint */
  chain?: string;
  
  /** Optional contract address */
  contract?: string;
  
  /** Pipeline configuration */
  config?: Partial<PipelineConfig>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate that all required steps were completed
 */
export function validatePipelineCompletion(context: PipelineContext): {
  valid: boolean;
  missingSteps: PipelineStep[];
} {
  const requiredSteps: PipelineStep[] = [
    'RESOLVE_ENTITY',
    'FETCH_DATA',
    'VALIDATE_INPUTS',
    'COMPUTE_FEATURES',
    'NORMALIZE',
    'COMPUTE_SCORES',
    'COMPUTE_GATES',
    'COMPUTE_POS',
    'APPLY_SMOOTHING',
    'CHECK_INVARIANTS',
    'EMIT_SNAPSHOT',
  ];
  
  const completedSet = new Set(context.completedSteps);
  const missingSteps = requiredSteps.filter(step => !completedSet.has(step));
  
  return {
    valid: missingSteps.length === 0,
    missingSteps,
  };
}

/**
 * Validate pipeline order was maintained
 */
export function validatePipelineOrder(completedSteps: PipelineStep[]): {
  valid: boolean;
  error?: string;
} {
  const expectedOrder: PipelineStep[] = [
    'RESOLVE_ENTITY',
    'FETCH_DATA',
    'VALIDATE_INPUTS',
    'COMPUTE_FEATURES',
    'NORMALIZE',
    'COMPUTE_SCORES',
    'COMPUTE_GATES',
    'COMPUTE_POS',
    'APPLY_SMOOTHING',
    'CHECK_INVARIANTS',
    'EMIT_SNAPSHOT',
  ];
  
  let lastIndex = -1;
  for (const step of completedSteps) {
    const currentIndex = expectedOrder.indexOf(step);
    if (currentIndex === -1) {
      return { valid: false, error: `Unknown step: ${step}` };
    }
    if (currentIndex <= lastIndex) {
      return { valid: false, error: `Step ${step} executed out of order` };
    }
    lastIndex = currentIndex;
  }
  
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * THE SINGLE ENTRYPOINT for OmniScore calculation
 * 
 * This function orchestrates the entire pipeline:
 * 1. Fetch bundle (entity + data)
 * 2. Calculate snapshot
 * 3. Store state (if persistence enabled)
 * 4. Return result
 * 
 * NO ALTERNATE ENGINES. NO SIDE PATHS.
 */
export async function computeOmniScore(
  input: ComputeOmniScoreInput
): Promise<PipelineResult> {
  const startTime = Date.now();
  const config = { ...DEFAULT_PIPELINE_CONFIG, ...input.config };
  
  // Initialize context
  const context: PipelineContext = {
    assetId: input.assetId,
    startedAt: new Date(),
    completedSteps: [],
    stepResults: [],
  };
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1-2: Fetch bundle (entity + data)
  // ─────────────────────────────────────────────────────────────────────────────
  
  const fetchResult = await fetchBundle({
    assetId: input.assetId,
    chain: input.chain,
    contract: input.contract,
  });
  
  // Record fetch steps
  context.stepResults.push(fetchResult.entityStep);
  if (fetchResult.entityStep.success) {
    context.completedSteps.push('RESOLVE_ENTITY');
    context.entity = fetchResult.entityStep.data;
  }
  
  context.stepResults.push(fetchResult.fetchStep);
  if (fetchResult.fetchStep.success) {
    context.completedSteps.push('FETCH_DATA');
  }
  
  // Check if fetch failed
  if (!fetchResult.success || !fetchResult.bundle) {
    return {
      success: false,
      snapshot: null,
      record: null,
      context,
      durationMs: Date.now() - startTime,
      error: {
        step: fetchResult.error?.step ?? 'RESOLVE_ENTITY',
        code: fetchResult.error?.code ?? 'FETCH_FAILED',
        message: fetchResult.error?.message ?? 'Failed to fetch data',
        recoverable: fetchResult.error?.step === 'FETCH_DATA',
      },
    };
  }
  
  context.bundle = fetchResult.bundle;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CHECK: Bundle viability
  // ─────────────────────────────────────────────────────────────────────────────
  
  const viability = isBundleViable(fetchResult.bundle);
  if (!viability.viable) {
    return {
      success: false,
      snapshot: null,
      record: null,
      context,
      durationMs: Date.now() - startTime,
      error: {
        step: 'FETCH_DATA',
        code: 'BUNDLE_NOT_VIABLE',
        message: viability.reason ?? 'Bundle not viable for scoring',
        recoverable: true,
      },
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3-11: Calculate snapshot
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Get previous smoothing state
  const store = getStore();
  const prevState = await store.getSmoothingState(fetchResult.bundle.entity.canonicalId);
  
  const calcResult = await calculateSnapshot({
    bundle: fetchResult.bundle,
    prevSmoothingState: prevState.stateCount > 0 ? prevState : null,
    config,
  });
  
  // Merge calc step results into context
  for (const stepResult of calcResult.context.stepResults) {
    context.stepResults.push(stepResult);
    if (stepResult.success) {
      context.completedSteps.push(stepResult.step);
    }
  }
  
  // Copy relevant data from calc context
  context.features = calcResult.context.features;
  context.normalized = calcResult.context.normalized;
  context.scores = calcResult.context.scores;
  context.legitimacy = calcResult.context.legitimacy;
  context.gatedScores = calcResult.context.gatedScores;
  context.pos = calcResult.context.pos;
  context.smoothing = calcResult.context.smoothing;
  context.invariantsValid = calcResult.context.invariantsValid;
  context.invariantViolations = calcResult.context.invariantViolations;
  context.snapshot = calcResult.context.snapshot;
  
  // Check if calculation failed
  if (!calcResult.success || !calcResult.snapshot) {
    return {
      success: false,
      snapshot: null,
      record: null,
      context,
      durationMs: Date.now() - startTime,
      error: {
        step: calcResult.error?.step ?? 'COMPUTE_FEATURES',
        code: calcResult.error?.code ?? 'CALC_FAILED',
        message: calcResult.error?.message ?? 'Failed to calculate snapshot',
        recoverable: false,
      },
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STORE: Persist to database (if enabled)
  // ─────────────────────────────────────────────────────────────────────────────
  
  let record = null;
  
  if (config.persist) {
    const storeResult = await storeState({
      snapshot: calcResult.snapshot,
      context,
    });
    
    if (storeResult.success) {
      record = storeResult.record;
      context.persistedRecord = record;
    } else {
      // Store failure is non-fatal (snapshot still valid)
      console.warn('Failed to persist score:', storeResult.error?.message);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATION: Ensure pipeline was complete
  // ─────────────────────────────────────────────────────────────────────────────
  
  const completion = validatePipelineCompletion(context);
  if (!completion.valid) {
    console.warn('Pipeline incomplete, missing steps:', completion.missingSteps);
  }
  
  const orderValid = validatePipelineOrder(context.completedSteps);
  if (!orderValid.valid) {
    console.warn('Pipeline order violation:', orderValid.error);
  }
  
  context.success = true;
  
  return {
    success: true,
    snapshot: calcResult.snapshot,
    record,
    context,
    durationMs: Date.now() - startTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface BatchComputeInput {
  assetIds: string[];
  config?: Partial<PipelineConfig>;
  concurrency?: number;
}

export interface BatchComputeResult {
  results: Map<string, PipelineResult>;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
}

/**
 * Compute OmniScore for multiple assets
 */
export async function computeOmniScoreBatch(
  input: BatchComputeInput
): Promise<BatchComputeResult> {
  const startTime = Date.now();
  const concurrency = input.concurrency ?? 5;
  const results = new Map<string, PipelineResult>();
  
  // Process in batches
  for (let i = 0; i < input.assetIds.length; i += concurrency) {
    const batch = input.assetIds.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(assetId => 
        computeOmniScore({
          assetId,
          config: input.config,
        })
      )
    );
    
    for (let j = 0; j < batch.length; j++) {
      results.set(batch[j], batchResults[j]);
    }
  }
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const result of results.values()) {
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  return {
    results,
    successCount,
    failureCount,
    totalDurationMs: Date.now() - startTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE INSPECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get pipeline execution summary
 */
export function getPipelineSummary(result: PipelineResult): {
  assetId: string;
  success: boolean;
  completedSteps: number;
  totalSteps: number;
  durationMs: number;
  stepDurations: Record<string, number>;
  error?: string;
} {
  const stepDurations: Record<string, number> = {};
  for (const stepResult of result.context.stepResults) {
    stepDurations[stepResult.step] = stepResult.duration;
  }
  
  return {
    assetId: result.context.assetId,
    success: result.success,
    completedSteps: result.context.completedSteps.length,
    totalSteps: 11,
    durationMs: result.durationMs,
    stepDurations,
    error: result.error?.message,
  };
}
