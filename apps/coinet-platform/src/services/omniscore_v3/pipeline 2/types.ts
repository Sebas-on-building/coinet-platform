/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔄 PIPELINE TYPES                                                         ║
 * ║                                                                               ║
 * ║   Types for the single calculation path                                      ║
 * ║   NO alternate engines, NO side paths                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { ResolvedEntity } from '../data/entity';
import type { DataPoint } from '../types';
import type { FeatureResult } from '../features/types';
import type { CategoryScoreResult, GatedScoringResult } from '../scoring';
import type { LegitimacyResult } from '../gates/legitimacy-v2';
import type { SmoothingResult, OmniScoreStateRecord } from '../persistence';

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STEPS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All steps in the pipeline, in order
 */
export const PIPELINE_STEPS = [
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
] as const;

export type PipelineStep = (typeof PIPELINE_STEPS)[number];

// ═══════════════════════════════════════════════════════════════════════════════
// STEP RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface StepResult<T = unknown> {
  step: PipelineStep;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
  duration: number; // milliseconds
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUNDLE (Input to calculateSnapshot)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Data bundle - everything needed to calculate a snapshot
 */
export interface DataBundle {
  /** Resolved entity with identity confidence */
  entity: ResolvedEntity;
  
  /** All fetched data points */
  dataPoints: DataPoint[];
  
  /** Fetch timestamp */
  fetchedAt: Date;
  
  /** Any errors during fetch */
  fetchErrors: string[];
  
  /** Data quality metrics */
  quality: {
    totalRequested: number;
    totalFetched: number;
    staleness: number; // hours
    sourceCount: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE CONTEXT (Passed through all steps)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Context object that accumulates results as pipeline progresses
 */
export interface PipelineContext {
  /** Input asset identifier */
  assetId: string;
  
  /** Pipeline start time */
  startedAt: Date;
  
  /** Completed steps */
  completedSteps: PipelineStep[];
  
  /** Step results for audit */
  stepResults: StepResult[];
  
  /** Current step (if in progress) */
  currentStep?: PipelineStep;
  
  /** Resolved entity (after step 1) */
  entity?: ResolvedEntity;
  
  /** Data bundle (after step 2) */
  bundle?: DataBundle;
  
  /** Validated inputs (after step 3) */
  validatedInputs?: boolean;
  
  /** Feature results (after step 4) */
  features?: {
    qs: FeatureResult[];
    os: FeatureResult[];
    risk: FeatureResult[];
  };
  
  /** Normalized features (after step 5) */
  normalized?: {
    qs: FeatureResult[];
    os: FeatureResult[];
    risk: FeatureResult[];
  };
  
  /** Category scores (after step 6) */
  scores?: {
    qs: CategoryScoreResult;
    os: CategoryScoreResult;
    risk: CategoryScoreResult;
  };
  
  /** Legitimacy result (after step 7) */
  legitimacy?: LegitimacyResult;
  
  /** Gated scoring result (after step 7) */
  gatedScores?: GatedScoringResult;
  
  /** POS calculation (after step 8) */
  pos?: {
    raw: number;
    gated: boolean;
    osGated: boolean;
  };
  
  /** Smoothing result (after step 9) */
  smoothing?: SmoothingResult;
  
  /** Invariants check (after step 10) */
  invariantsValid?: boolean;
  invariantViolations?: string[];
  
  /** Final snapshot (after step 11) */
  snapshot?: OmniScoreSnapshot;
  
  /** Persisted record (after store) */
  persistedRecord?: OmniScoreStateRecord;
  
  /** Overall success */
  success?: boolean;
  
  /** Pipeline error (if failed) */
  error?: {
    step: PipelineStep;
    code: string;
    message: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SNAPSHOT (Final output)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canonical OmniScore Snapshot
 * This is THE ONLY output format from the pipeline
 */
export interface OmniScoreSnapshot {
  // Identity
  identity: {
    id: string;
    symbol: string;
    name: string;
    chain?: string;
    contract?: string;
    confidence: number;
  };
  
  // Legitimacy
  legitimacy: 'LEGIT' | 'WATCH' | 'SUSPICIOUS' | 'NOT_LEGIT' | 'INSUFFICIENT_DATA' | 'SEVERE';
  legitimacyDetails: {
    warnings: string[];
    criticalIssues: string[];
    allowAllocator: boolean;
    allowTrader: boolean;
    allowRanking: boolean;
  };
  
  // Scores
  qs: number;
  qsTier: string;
  os: number | null;
  osTier: string | null;
  osGated: boolean;
  osGateReason?: string;
  risk: number;
  riskTier: string;
  
  // POS
  posRaw: number;
  posSmoothed: number;
  posFinal: number | null;
  posTier: string | null;
  
  // Confidence
  confidence: number;
  confidenceLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  coverageQS: number;
  coverageOS: number;
  
  // Status
  flag: 'Clean' | 'Suspicious' | 'Manipulated' | 'Severe' | 'Gated';
  status: 'scored' | 'partial' | 'gated';
  
  // Drivers (top contributors)
  drivers: {
    qs: Array<{ name: string; contribution: number; value: number }>;
    os: Array<{ name: string; contribution: number; value: number }>;
    risk: Array<{ name: string; contribution: number; value: number }>;
  };
  
  // Audit trail
  audit: {
    engineVersion: string;
    methodologyId: string;
    pipelineSteps: PipelineStep[];
    stepDurations: Record<PipelineStep, number>;
    dataTimestamp: string;
    calculatedAt: string;
    warnings: string[];
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export interface PipelineConfig {
  /** Timeout for entire pipeline (ms) */
  timeoutMs: number;
  
  /** Should we persist to DB? */
  persist: boolean;
  
  /** Should we skip smoothing? (for backtesting) */
  skipSmoothing: boolean;
  
  /** Strict mode - fail on any warning */
  strict: boolean;
  
  /** Debug mode - include extra details */
  debug: boolean;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  timeoutMs: 30_000,
  persist: true,
  skipSmoothing: false,
  strict: false,
  debug: false,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface PipelineResult {
  /** Was the pipeline successful? */
  success: boolean;
  
  /** The snapshot (null if failed before completion) */
  snapshot: OmniScoreSnapshot | null;
  
  /** Persisted record (if persistence enabled) */
  record: OmniScoreStateRecord | null;
  
  /** Pipeline context (for debugging) */
  context: PipelineContext;
  
  /** Total duration */
  durationMs: number;
  
  /** Error info (if failed) */
  error?: {
    step: PipelineStep;
    code: string;
    message: string;
    recoverable: boolean;
  };
}
