/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧮 CALCULATE SNAPSHOT                                                     ║
 * ║                                                                               ║
 * ║   Steps 3-11: The SINGLE calculation path                                    ║
 * ║   NO alternate engines, NO side paths                                        ║
 * ║                                                                               ║
 * ║   Pipeline:                                                                   ║
 * ║   3. validate inputs (zod)                                                   ║
 * ║   4. compute features + provenance                                           ║
 * ║   5. normalize                                                               ║
 * ║   6. compute QS/OS/Risk                                                      ║
 * ║   7. compute confidence + gates                                              ║
 * ║   8. compute posRaw                                                          ║
 * ║   9. smoothing (DB)                                                          ║
 * ║   10. invariants check                                                       ║
 * ║   11. emit snapshot                                                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';
import { ENGINE_VERSION, METHODOLOGY_ID, getTierFromScore, getConfidenceLevel } from '../constants';
import {
  buildFeatureContext,
  computeAllFeatures,
  aggregateResults,
  getTopDrivers,
  type FeatureResult,
} from '../features';
import {
  calculateScores,
  produceGatedResult,
  calculatePOS,
  mapConfidenceLevel,
  type GatedScoringResult,
} from '../scoring';
import {
  determineLegitimacy,
  createDefaultFactors,
  type LegitimacyFactors,
  type LegitimacyResult,
} from '../gates/legitimacy-v2';
import {
  applySmoothingEMA,
  type SmoothingState,
  type SmoothingResult,
} from '../persistence';
import type {
  DataBundle,
  OmniScoreSnapshot,
  PipelineContext,
  StepResult,
  PipelineStep,
  PipelineConfig,
} from './types';
import { DEFAULT_PIPELINE_CONFIG } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

const DataBundleSchema = z.object({
  entity: z.object({
    canonicalId: z.string(),
    symbol: z.string(),
    name: z.string(),
    identityConfidence: z.number().min(0).max(100),
  }),
  dataPoints: z.array(z.object({
    key: z.string(),
    raw: z.number().nullable(),
  })),
  fetchedAt: z.date(),
  quality: z.object({
    totalRequested: z.number(),
    totalFetched: z.number(),
    staleness: z.number(),
    sourceCount: z.number(),
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Step 3: Validate inputs
 */
function validateInputs(bundle: DataBundle, ctx: PipelineContext): StepResult<boolean> {
  const startTime = Date.now();
  
  try {
    // Validate bundle structure
    DataBundleSchema.parse(bundle);
    
    ctx.validatedInputs = true;
    
    return {
      step: 'VALIDATE_INPUTS',
      success: true,
      data: true,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  } catch (err) {
    const error = err instanceof z.ZodError 
      ? err.errors.map(e => e.message).join(', ')
      : String(err);
    
    return {
      step: 'VALIDATE_INPUTS',
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: error,
        recoverable: false,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}

/**
 * Step 4: Compute features
 */
function computeFeatures(bundle: DataBundle, ctx: PipelineContext): StepResult<{
  qs: FeatureResult[];
  os: FeatureResult[];
  risk: FeatureResult[];
}> {
  const startTime = Date.now();
  
  try {
    const featureCtx = buildFeatureContext(bundle.dataPoints);
    const features = computeAllFeatures(featureCtx);
    
    ctx.features = features;
    
    return {
      step: 'COMPUTE_FEATURES',
      success: true,
      data: features,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  } catch (err) {
    return {
      step: 'COMPUTE_FEATURES',
      success: false,
      error: {
        code: 'FEATURE_COMPUTATION_FAILED',
        message: err instanceof Error ? err.message : String(err),
        recoverable: false,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}

/**
 * Step 5: Normalize features
 * (Currently features are self-normalizing, but this is where cross-sectional
 * normalization would happen in the future)
 */
function normalizeFeatures(ctx: PipelineContext): StepResult<{
  qs: FeatureResult[];
  os: FeatureResult[];
  risk: FeatureResult[];
}> {
  const startTime = Date.now();
  
  if (!ctx.features) {
    return {
      step: 'NORMALIZE',
      success: false,
      error: {
        code: 'NO_FEATURES',
        message: 'Features not computed',
        recoverable: false,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
  
  // Features are already normalized 0-100 internally
  // Future: Apply cross-sectional normalization here
  ctx.normalized = ctx.features;
  
  return {
    step: 'NORMALIZE',
    success: true,
    data: ctx.normalized,
    duration: Date.now() - startTime,
    timestamp: new Date(),
  };
}

/**
 * Step 6: Compute category scores (QS/OS/Risk)
 */
function computeScores(bundle: DataBundle, ctx: PipelineContext): StepResult<{
  qs: number;
  os: number;
  risk: number;
}> {
  const startTime = Date.now();
  
  if (!ctx.normalized) {
    return {
      step: 'COMPUTE_SCORES',
      success: false,
      error: {
        code: 'NO_NORMALIZED_FEATURES',
        message: 'Normalized features not available',
        recoverable: false,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
  
  try {
    const scoringResult = calculateScores({
      qsResults: ctx.normalized.qs,
      osResults: ctx.normalized.os,
      riskResults: ctx.normalized.risk,
      dataPoints: bundle.dataPoints,
    });
    
    ctx.scores = {
      qs: scoringResult.qsResult,
      os: scoringResult.osResult,
      risk: scoringResult.riskResult,
    };
    
    return {
      step: 'COMPUTE_SCORES',
      success: true,
      data: {
        qs: scoringResult.qsResult.score,
        os: scoringResult.osResult.score,
        risk: scoringResult.riskResult.score,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  } catch (err) {
    return {
      step: 'COMPUTE_SCORES',
      success: false,
      error: {
        code: 'SCORE_COMPUTATION_FAILED',
        message: err instanceof Error ? err.message : String(err),
        recoverable: false,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}

/**
 * Step 7: Compute gates (legitimacy + confidence)
 */
function computeGates(bundle: DataBundle, ctx: PipelineContext): StepResult<{
  legitimacy: LegitimacyResult;
  gated: GatedScoringResult;
}> {
  const startTime = Date.now();
  
  if (!ctx.scores) {
    return {
      step: 'COMPUTE_GATES',
      success: false,
      error: {
        code: 'NO_SCORES',
        message: 'Scores not computed',
        recoverable: false,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
  
  try {
    // Build legitimacy factors from bundle and scores
    const factors = buildLegitimacyFactors(bundle, ctx);
    const legitimacy = determineLegitimacy(factors);
    
    // Get gated scoring result
    const scoringResult = calculateScores({
      qsResults: ctx.normalized!.qs,
      osResults: ctx.normalized!.os,
      riskResults: ctx.normalized!.risk,
      dataPoints: bundle.dataPoints,
    });
    
    const gated = produceGatedResult(scoringResult);
    
    ctx.legitimacy = legitimacy;
    ctx.gatedScores = gated;
    
    return {
      step: 'COMPUTE_GATES',
      success: true,
      data: { legitimacy, gated },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  } catch (err) {
    return {
      step: 'COMPUTE_GATES',
      success: false,
      error: {
        code: 'GATE_COMPUTATION_FAILED',
        message: err instanceof Error ? err.message : String(err),
        recoverable: false,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}

/**
 * Step 8: Compute POS
 */
function computePOS(ctx: PipelineContext): StepResult<{
  raw: number;
  gated: boolean;
  osGated: boolean;
}> {
  const startTime = Date.now();
  
  if (!ctx.gatedScores || !ctx.legitimacy) {
    return {
      step: 'COMPUTE_POS',
      success: false,
      error: {
        code: 'NO_GATED_SCORES',
        message: 'Gated scores not computed',
        recoverable: false,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
  
  const gated = ctx.gatedScores;
  const legitimacy = ctx.legitimacy;
  
  // Determine if fully gated
  const isFullyGated = 
    legitimacy.label === 'INSUFFICIENT_DATA' ||
    legitimacy.label === 'SEVERE' ||
    gated.status === 'gated';
  
  ctx.pos = {
    raw: gated.pos.posRaw,
    gated: isFullyGated,
    osGated: gated.osGated,
  };
  
  return {
    step: 'COMPUTE_POS',
    success: true,
    data: ctx.pos,
    duration: Date.now() - startTime,
    timestamp: new Date(),
  };
}

/**
 * Step 9: Apply smoothing
 */
function applySmoothing(
  ctx: PipelineContext,
  prevState: SmoothingState | null,
  config: PipelineConfig
): StepResult<SmoothingResult> {
  const startTime = Date.now();
  
  if (!ctx.pos) {
    return {
      step: 'APPLY_SMOOTHING',
      success: false,
      error: {
        code: 'NO_POS',
        message: 'POS not computed',
        recoverable: false,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
  
  if (config.skipSmoothing) {
    // Skip smoothing - use raw value
    const result: SmoothingResult = {
      posSmoothed: ctx.pos.raw,
      posRaw: ctx.pos.raw,
      newState: {
        prevPosSmoothed: ctx.pos.raw,
        prevTimestamp: new Date(),
        stateCount: prevState?.stateCount ?? 0,
        projectId: ctx.assetId,
      },
      isColdStart: true,
      isGapReset: false,
      wasEmergencyCapped: false,
      delta: 0,
      alpha: 0.25,
      debug: {
        prevSmoothed: null,
        gapHours: null,
        stateCount: 0,
      },
    };
    
    ctx.smoothing = result;
    
    return {
      step: 'APPLY_SMOOTHING',
      success: true,
      data: result,
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
  
  const result = applySmoothingEMA({
    posRaw: ctx.pos.raw,
    prevState,
    timestamp: new Date(),
  });
  
  ctx.smoothing = result;
  
  return {
    step: 'APPLY_SMOOTHING',
    success: true,
    data: result,
    duration: Date.now() - startTime,
    timestamp: new Date(),
  };
}

/**
 * Step 10: Check invariants
 */
function checkInvariants(ctx: PipelineContext): StepResult<boolean> {
  const startTime = Date.now();
  
  const violations: string[] = [];
  
  // INV-1: Scores must be in [0, 100]
  if (ctx.scores) {
    const { qs, os, risk } = ctx.scores;
    if (qs.score < 0 || qs.score > 100) violations.push(`QS out of range: ${qs.score}`);
    if (os.score < 0 || os.score > 100) violations.push(`OS out of range: ${os.score}`);
    if (risk.score < 0 || risk.score > 100) violations.push(`Risk out of range: ${risk.score}`);
  }
  
  // INV-2: POS must be in [0, 100]
  if (ctx.pos && (ctx.pos.raw < 0 || ctx.pos.raw > 100)) {
    violations.push(`POS out of range: ${ctx.pos.raw}`);
  }
  
  // INV-3: Smoothed must be in [0, 100]
  if (ctx.smoothing && (ctx.smoothing.posSmoothed < 0 || ctx.smoothing.posSmoothed > 100)) {
    violations.push(`Smoothed POS out of range: ${ctx.smoothing.posSmoothed}`);
  }
  
  // INV-4: Coverage must be in [0, 1]
  if (ctx.scores) {
    const { qs, os } = ctx.scores;
    if (qs.coverage.weightedCoverage < 0 || qs.coverage.weightedCoverage > 1) {
      violations.push(`QS coverage out of range: ${qs.coverage.weightedCoverage}`);
    }
    if (os.coverage.weightedCoverage < 0 || os.coverage.weightedCoverage > 1) {
      violations.push(`OS coverage out of range: ${os.coverage.weightedCoverage}`);
    }
  }
  
  // INV-5: If legitimacy is INSUFFICIENT_DATA or SEVERE, posFinal must be null
  if (ctx.legitimacy && ctx.pos) {
    const blockedLabels = ['INSUFFICIENT_DATA', 'SEVERE'];
    if (blockedLabels.includes(ctx.legitimacy.label) && !ctx.pos.gated) {
      violations.push(`Legitimacy ${ctx.legitimacy.label} but POS not gated`);
    }
  }
  
  ctx.invariantsValid = violations.length === 0;
  ctx.invariantViolations = violations;
  
  if (violations.length > 0) {
    return {
      step: 'CHECK_INVARIANTS',
      success: false,
      error: {
        code: 'INVARIANT_VIOLATION',
        message: violations.join('; '),
        recoverable: false,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
  
  return {
    step: 'CHECK_INVARIANTS',
    success: true,
    data: true,
    duration: Date.now() - startTime,
    timestamp: new Date(),
  };
}

/**
 * Step 11: Emit snapshot
 */
function emitSnapshot(bundle: DataBundle, ctx: PipelineContext): StepResult<OmniScoreSnapshot> {
  const startTime = Date.now();
  
  if (!ctx.scores || !ctx.legitimacy || !ctx.pos || !ctx.smoothing) {
    return {
      step: 'EMIT_SNAPSHOT',
      success: false,
      error: {
        code: 'INCOMPLETE_CONTEXT',
        message: 'Context incomplete for snapshot emission',
        recoverable: false,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
  
  const { scores, legitimacy, pos, smoothing, gatedScores } = ctx;
  
  // Determine final POS
  const posFinal = pos.gated ? null : smoothing.posSmoothed;
  
  // Determine flag
  let flag: OmniScoreSnapshot['flag'];
  if (pos.gated) {
    flag = 'Gated';
  } else if (legitimacy.label === 'SEVERE') {
    flag = 'Severe';
  } else if (legitimacy.label === 'NOT_LEGIT' || legitimacy.label === 'SUSPICIOUS') {
    flag = 'Suspicious';
  } else {
    flag = 'Clean';
  }
  
  // Build drivers
  const qsDrivers = getTopDrivers(ctx.features?.qs ?? [], 3).map(d => ({
    name: d.name,
    contribution: d.contribution ?? 0,
    value: d.normalized ?? 0,
  }));
  
  const osDrivers = getTopDrivers(ctx.features?.os ?? [], 3).map(d => ({
    name: d.name,
    contribution: d.contribution ?? 0,
    value: d.normalized ?? 0,
  }));
  
  const riskDrivers = getTopDrivers(ctx.features?.risk ?? [], 3).map(d => ({
    name: d.name,
    contribution: d.contribution ?? 0,
    value: d.normalized ?? 0,
  }));
  
  // Build step durations
  const stepDurations: Record<PipelineStep, number> = {} as Record<PipelineStep, number>;
  for (const result of ctx.stepResults) {
    stepDurations[result.step] = result.duration;
  }
  
  const snapshot: OmniScoreSnapshot = {
    identity: {
      id: bundle.entity.canonicalId,
      symbol: bundle.entity.symbol,
      name: bundle.entity.name,
      chain: bundle.entity.chain,
      contract: bundle.entity.contractAddresses?.primary,
      confidence: bundle.entity.identityConfidence,
    },
    
    legitimacy: legitimacy.label,
    legitimacyDetails: {
      warnings: legitimacy.warnings,
      criticalIssues: legitimacy.criticalIssues,
      allowAllocator: legitimacy.allowAllocatorView,
      allowTrader: legitimacy.allowTraderView,
      allowRanking: legitimacy.allowRanking,
    },
    
    qs: scores.qs.score,
    qsTier: getTierFromScore(scores.qs.score),
    os: pos.osGated ? null : scores.os.score,
    osTier: pos.osGated ? null : getTierFromScore(scores.os.score),
    osGated: pos.osGated,
    osGateReason: gatedScores?.osGateReason,
    risk: scores.risk.score,
    riskTier: getTierFromScore(100 - scores.risk.score), // Invert for tier
    
    posRaw: pos.raw,
    posSmoothed: smoothing.posSmoothed,
    posFinal,
    posTier: posFinal !== null ? getTierFromScore(posFinal) : null,
    
    confidence: gatedScores?.gating.confidence ?? 0,
    confidenceLevel: mapConfidenceLevel(gatedScores?.gating.confidence ?? 0),
    coverageQS: scores.qs.coverage.weightedCoverage,
    coverageOS: scores.os.coverage.weightedCoverage,
    
    flag,
    status: gatedScores?.status ?? 'gated',
    
    drivers: {
      qs: qsDrivers,
      os: osDrivers,
      risk: riskDrivers,
    },
    
    audit: {
      engineVersion: ENGINE_VERSION,
      methodologyId: METHODOLOGY_ID,
      pipelineSteps: ctx.completedSteps,
      stepDurations,
      dataTimestamp: bundle.fetchedAt.toISOString(),
      calculatedAt: new Date().toISOString(),
      warnings: [
        ...legitimacy.warnings,
        ...(ctx.invariantViolations ?? []),
      ],
    },
  };
  
  ctx.snapshot = snapshot;
  
  return {
    step: 'EMIT_SNAPSHOT',
    success: true,
    data: snapshot,
    duration: Date.now() - startTime,
    timestamp: new Date(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Build legitimacy factors
// ═══════════════════════════════════════════════════════════════════════════════

function buildLegitimacyFactors(bundle: DataBundle, ctx: PipelineContext): LegitimacyFactors {
  const defaults = createDefaultFactors();
  
  // Extract from bundle
  const factors: LegitimacyFactors = {
    ...defaults,
    identityConfidence: bundle.entity.identityConfidence,
    providerIdCount: countProviderIds(bundle.entity),
    staleness: bundle.quality.staleness,
    coverageQS: ctx.scores?.qs.coverage.weightedCoverage ?? 0,
    coverageOS: ctx.scores?.os.coverage.weightedCoverage ?? 0,
  };
  
  // Extract from data points
  for (const dp of bundle.dataPoints) {
    if (dp.key === 'wash_trading_score' && dp.raw !== null) {
      factors.washTradingScore = dp.raw;
    }
    if (dp.key === 'liquidity_score' && dp.raw !== null) {
      factors.liquidityScore = dp.raw;
    }
    if (dp.key === 'bid_ask_spread_percent' && dp.raw !== null) {
      factors.bidAskSpreadPercent = dp.raw;
    }
    if (dp.key === 'volume_to_mcap_ratio' && dp.raw !== null) {
      factors.volumeToMcapRatio = dp.raw;
    }
    if (dp.key === 'admin_risk_score' && dp.raw !== null) {
      factors.adminRiskScore = dp.raw;
    }
    if (dp.key === 'audit_count' && dp.raw !== null) {
      factors.auditCount = dp.raw;
    }
    if (dp.key === 'incident_count_12m' && dp.raw !== null) {
      factors.incidentCount12m = dp.raw;
    }
    if (dp.key === 'incident_severity_max' && dp.raw !== null) {
      factors.maxIncidentSeverity = dp.raw;
    }
    if (dp.key === 'has_mint_function' && dp.raw !== null) {
      factors.hasMintFunction = dp.raw === 1;
    }
    if (dp.key === 'contract_verified' && dp.raw !== null) {
      factors.hasVerifiedContract = dp.raw === 1;
    }
    if (dp.key === 'is_renounced' && dp.raw !== null) {
      factors.isContractRenounced = dp.raw === 1;
    }
  }
  
  return factors;
}

function countProviderIds(entity: any): number {
  let count = 0;
  if (entity.providerIds?.coingecko) count++;
  if (entity.providerIds?.coinmarketcap) count++;
  if (entity.providerIds?.defillama) count++;
  if (entity.providerIds?.github) count++;
  return Math.max(count, 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface CalculateSnapshotInput {
  bundle: DataBundle;
  prevSmoothingState?: SmoothingState | null;
  config?: Partial<PipelineConfig>;
}

export interface CalculateSnapshotResult {
  success: boolean;
  snapshot: OmniScoreSnapshot | null;
  context: PipelineContext;
  error?: {
    step: PipelineStep;
    code: string;
    message: string;
  };
}

/**
 * Calculate a snapshot from a data bundle
 * 
 * This is THE SINGLE CALCULATION PATH.
 * No alternate engines, no side paths.
 */
export async function calculateSnapshot(
  input: CalculateSnapshotInput
): Promise<CalculateSnapshotResult> {
  const { bundle, prevSmoothingState = null } = input;
  const config = { ...DEFAULT_PIPELINE_CONFIG, ...input.config };
  
  // Initialize context
  const ctx: PipelineContext = {
    assetId: bundle.entity.canonicalId,
    startedAt: new Date(),
    completedSteps: [],
    stepResults: [],
  };
  
  // Helper to record step
  const recordStep = (result: StepResult) => {
    ctx.stepResults.push(result);
    if (result.success) {
      ctx.completedSteps.push(result.step);
    }
  };
  
  // Step 3: Validate inputs
  ctx.currentStep = 'VALIDATE_INPUTS';
  const validateResult = validateInputs(bundle, ctx);
  recordStep(validateResult);
  if (!validateResult.success) {
    return {
      success: false,
      snapshot: null,
      context: ctx,
      error: {
        step: 'VALIDATE_INPUTS',
        code: validateResult.error?.code ?? 'UNKNOWN',
        message: validateResult.error?.message ?? 'Validation failed',
      },
    };
  }
  
  // Step 4: Compute features
  ctx.currentStep = 'COMPUTE_FEATURES';
  const featuresResult = computeFeatures(bundle, ctx);
  recordStep(featuresResult);
  if (!featuresResult.success) {
    return {
      success: false,
      snapshot: null,
      context: ctx,
      error: {
        step: 'COMPUTE_FEATURES',
        code: featuresResult.error?.code ?? 'UNKNOWN',
        message: featuresResult.error?.message ?? 'Feature computation failed',
      },
    };
  }
  
  // Step 5: Normalize
  ctx.currentStep = 'NORMALIZE';
  const normalizeResult = normalizeFeatures(ctx);
  recordStep(normalizeResult);
  if (!normalizeResult.success) {
    return {
      success: false,
      snapshot: null,
      context: ctx,
      error: {
        step: 'NORMALIZE',
        code: normalizeResult.error?.code ?? 'UNKNOWN',
        message: normalizeResult.error?.message ?? 'Normalization failed',
      },
    };
  }
  
  // Step 6: Compute scores
  ctx.currentStep = 'COMPUTE_SCORES';
  const scoresResult = computeScores(bundle, ctx);
  recordStep(scoresResult);
  if (!scoresResult.success) {
    return {
      success: false,
      snapshot: null,
      context: ctx,
      error: {
        step: 'COMPUTE_SCORES',
        code: scoresResult.error?.code ?? 'UNKNOWN',
        message: scoresResult.error?.message ?? 'Score computation failed',
      },
    };
  }
  
  // Step 7: Compute gates
  ctx.currentStep = 'COMPUTE_GATES';
  const gatesResult = computeGates(bundle, ctx);
  recordStep(gatesResult);
  if (!gatesResult.success) {
    return {
      success: false,
      snapshot: null,
      context: ctx,
      error: {
        step: 'COMPUTE_GATES',
        code: gatesResult.error?.code ?? 'UNKNOWN',
        message: gatesResult.error?.message ?? 'Gate computation failed',
      },
    };
  }
  
  // Step 8: Compute POS
  ctx.currentStep = 'COMPUTE_POS';
  const posResult = computePOS(ctx);
  recordStep(posResult);
  if (!posResult.success) {
    return {
      success: false,
      snapshot: null,
      context: ctx,
      error: {
        step: 'COMPUTE_POS',
        code: posResult.error?.code ?? 'UNKNOWN',
        message: posResult.error?.message ?? 'POS computation failed',
      },
    };
  }
  
  // Step 9: Apply smoothing
  ctx.currentStep = 'APPLY_SMOOTHING';
  const smoothingResult = applySmoothing(ctx, prevSmoothingState, config);
  recordStep(smoothingResult);
  if (!smoothingResult.success) {
    return {
      success: false,
      snapshot: null,
      context: ctx,
      error: {
        step: 'APPLY_SMOOTHING',
        code: smoothingResult.error?.code ?? 'UNKNOWN',
        message: smoothingResult.error?.message ?? 'Smoothing failed',
      },
    };
  }
  
  // Step 10: Check invariants
  ctx.currentStep = 'CHECK_INVARIANTS';
  const invariantsResult = checkInvariants(ctx);
  recordStep(invariantsResult);
  if (!invariantsResult.success && config.strict) {
    return {
      success: false,
      snapshot: null,
      context: ctx,
      error: {
        step: 'CHECK_INVARIANTS',
        code: invariantsResult.error?.code ?? 'UNKNOWN',
        message: invariantsResult.error?.message ?? 'Invariant check failed',
      },
    };
  }
  
  // Step 11: Emit snapshot
  ctx.currentStep = 'EMIT_SNAPSHOT';
  const snapshotResult = emitSnapshot(bundle, ctx);
  recordStep(snapshotResult);
  if (!snapshotResult.success) {
    return {
      success: false,
      snapshot: null,
      context: ctx,
      error: {
        step: 'EMIT_SNAPSHOT',
        code: snapshotResult.error?.code ?? 'UNKNOWN',
        message: snapshotResult.error?.message ?? 'Snapshot emission failed',
      },
    };
  }
  
  ctx.success = true;
  
  return {
    success: true,
    snapshot: snapshotResult.data!,
    context: ctx,
  };
}
