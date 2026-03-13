/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📥 FETCH BUNDLE                                                           ║
 * ║                                                                               ║
 * ║   Step 1-2: Resolve entity + Fetch all data                                  ║
 * ║   Returns a complete DataBundle for calculation                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { resolveEntity, type ResolvedEntity, type EntityResolutionInput } from '../data/entity';
import { fetchAllData, type FetchAllDataResult } from '../data/fetcher';
import type { DataPoint } from '../types';
import type { DataBundle, StepResult } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface FetchBundleInput {
  /** Asset identifier (symbol, name, address, or provider ID) */
  assetId: string;
  
  /** Optional chain hint */
  chain?: string;
  
  /** Optional contract address */
  contract?: string;
  
  /** Force refresh (bypass cache) */
  forceRefresh?: boolean;
}

export interface FetchBundleResult {
  /** Resolved entity step result */
  entityStep: StepResult<ResolvedEntity>;
  
  /** Fetch data step result */
  fetchStep: StepResult<FetchAllDataResult>;
  
  /** Complete data bundle (null if failed) */
  bundle: DataBundle | null;
  
  /** Overall success */
  success: boolean;
  
  /** Error (if failed) */
  error?: {
    step: 'RESOLVE_ENTITY' | 'FETCH_DATA';
    code: string;
    message: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: RESOLVE ENTITY
// ═══════════════════════════════════════════════════════════════════════════════

async function resolveEntityStep(input: FetchBundleInput): Promise<StepResult<ResolvedEntity>> {
  const startTime = Date.now();
  
  try {
    const entityInput: EntityResolutionInput = {
      symbol: input.assetId.toUpperCase(),
      name: input.assetId,
      chain: input.chain,
      contractAddress: input.contract,
    };
    
    const entity = await resolveEntity(entityInput);
    
    return {
      step: 'RESOLVE_ENTITY',
      success: true,
      data: entity,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    
    return {
      step: 'RESOLVE_ENTITY',
      success: false,
      error: {
        code: 'ENTITY_RESOLUTION_FAILED',
        message: error.message,
        recoverable: false,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: FETCH DATA
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchDataStep(entity: ResolvedEntity): Promise<StepResult<FetchAllDataResult>> {
  const startTime = Date.now();
  
  try {
    const result = await fetchAllData(entity);
    
    return {
      step: 'FETCH_DATA',
      success: true,
      data: result,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    
    return {
      step: 'FETCH_DATA',
      success: false,
      error: {
        code: 'DATA_FETCH_FAILED',
        message: error.message,
        recoverable: true, // Can retry
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD BUNDLE
// ═══════════════════════════════════════════════════════════════════════════════

function buildBundle(
  entity: ResolvedEntity,
  fetchResult: FetchAllDataResult
): DataBundle {
  // Flatten all data points from feature inputs
  const allDataPoints: DataPoint[] = [];
  for (const featureInput of fetchResult.data) {
    allDataPoints.push(...featureInput.dataPoints);
  }
  
  // Calculate quality metrics
  const validPoints = allDataPoints.filter(dp => dp.raw !== null);
  const sources = new Set(validPoints.map(dp => dp.source));
  
  let totalStaleness = 0;
  for (const dp of validPoints) {
    totalStaleness += dp.freshnessSeconds / 3600; // to hours
  }
  const avgStaleness = validPoints.length > 0 
    ? totalStaleness / validPoints.length 
    : 0;
  
  return {
    entity,
    dataPoints: allDataPoints,
    fetchedAt: new Date(),
    fetchErrors: fetchResult.errors,
    quality: {
      totalRequested: allDataPoints.length,
      totalFetched: validPoints.length,
      staleness: avgStaleness,
      sourceCount: sources.size,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch a complete data bundle for an asset
 * 
 * This is the ONLY way to get data into the pipeline.
 * 
 * Steps:
 * 1. Resolve entity (identity confidence check)
 * 2. Fetch all data from providers
 * 3. Build bundle with quality metrics
 */
export async function fetchBundle(input: FetchBundleInput): Promise<FetchBundleResult> {
  // Step 1: Resolve entity
  const entityStep = await resolveEntityStep(input);
  
  if (!entityStep.success || !entityStep.data) {
    return {
      entityStep,
      fetchStep: {
        step: 'FETCH_DATA',
        success: false,
        error: {
          code: 'SKIPPED',
          message: 'Skipped due to entity resolution failure',
          recoverable: false,
        },
        duration: 0,
        timestamp: new Date(),
      },
      bundle: null,
      success: false,
      error: {
        step: 'RESOLVE_ENTITY',
        code: entityStep.error?.code ?? 'UNKNOWN',
        message: entityStep.error?.message ?? 'Unknown error',
      },
    };
  }
  
  const entity = entityStep.data;
  
  // Step 2: Fetch data
  const fetchStep = await fetchDataStep(entity);
  
  if (!fetchStep.success || !fetchStep.data) {
    return {
      entityStep,
      fetchStep,
      bundle: null,
      success: false,
      error: {
        step: 'FETCH_DATA',
        code: fetchStep.error?.code ?? 'UNKNOWN',
        message: fetchStep.error?.message ?? 'Unknown error',
      },
    };
  }
  
  // Build bundle
  const bundle = buildBundle(entity, fetchStep.data);
  
  return {
    entityStep,
    fetchStep,
    bundle,
    success: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if bundle has minimum data for scoring
 */
export function isBundleViable(bundle: DataBundle): {
  viable: boolean;
  reason?: string;
} {
  // Check identity confidence
  if (bundle.entity.identityConfidence < 60) {
    return {
      viable: false,
      reason: `Identity confidence ${bundle.entity.identityConfidence}% below minimum 60%`,
    };
  }
  
  // Check data quality
  if (bundle.quality.totalFetched < 5) {
    return {
      viable: false,
      reason: `Only ${bundle.quality.totalFetched} data points fetched (minimum 5)`,
    };
  }
  
  // Check staleness
  if (bundle.quality.staleness > 72) {
    return {
      viable: false,
      reason: `Data too stale: ${bundle.quality.staleness.toFixed(1)} hours old`,
    };
  }
  
  return { viable: true };
}
