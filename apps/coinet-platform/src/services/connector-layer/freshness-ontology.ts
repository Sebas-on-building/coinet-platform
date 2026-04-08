/**
 * L2.2 — Freshness Ontology
 *
 * Freshness is not a scalar. It is a typed epistemic fitness judgment.
 * A payload can be fresh for one use and stale for another.
 * Freshness determines what the observation may still support.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// FRESHNESS FAMILIES
// ═══════════════════════════════════════════════════════════════════════════════

export type FreshnessFamily =
  | 'REALTIME'
  | 'SCHEDULED'
  | 'ON_DEMAND'
  | 'HISTORICAL';

// ═══════════════════════════════════════════════════════════════════════════════
// FRESHNESS CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

export type FreshnessClass =
  | 'REALTIME_CRITICAL'
  | 'REALTIME_IMPORTANT'
  | 'SCHEDULED_HIGH'
  | 'SCHEDULED_MODERATE'
  | 'ON_DEMAND'
  | 'HISTORICAL_LOCKED';

// ═══════════════════════════════════════════════════════════════════════════════
// FRESHNESS STATES — Constitutional levels
// ═══════════════════════════════════════════════════════════════════════════════

export type FreshnessState =
  | 'F0_CURRENT'
  | 'F1_SLIPPING'
  | 'F2_STALE_BUT_USABLE'
  | 'F3_STALE_AND_CONSTRAINED'
  | 'F4_UNUSABLE'
  | 'F5_UNKNOWN';

export const FRESHNESS_RANK: Record<FreshnessState, number> = {
  F0_CURRENT: 0,
  F1_SLIPPING: 1,
  F2_STALE_BUT_USABLE: 2,
  F3_STALE_AND_CONSTRAINED: 3,
  F4_UNUSABLE: 4,
  F5_UNKNOWN: 5,
};

export const FRESHNESS_LABELS: Record<FreshnessState, string> = {
  F0_CURRENT: 'Fully temporally fit for intended live use',
  F1_SLIPPING: 'Usable but early staleness pressure exists',
  F2_STALE_BUT_USABLE: 'Too old for strong uses, valid for limited live functions',
  F3_STALE_AND_CONSTRAINED: 'Display or cite with caution only',
  F4_UNUSABLE: 'Not temporally fit for the intended claim',
  F5_UNKNOWN: 'Cannot determine freshness — timing evidence incomplete',
};

// ═══════════════════════════════════════════════════════════════════════════════
// DOMINANT CLOCK — which timestamp drives the freshness decision
// ═══════════════════════════════════════════════════════════════════════════════

export type DominantClock =
  | 'OBSERVED'
  | 'PUBLISHED'
  | 'INGESTED'
  | 'HISTORICAL_PIN'
  | 'UNKNOWN';

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM USAGE — what the observation is being evaluated for
// ═══════════════════════════════════════════════════════════════════════════════

export type ClaimUsage =
  | 'DISPLAY'
  | 'LIVE_SCORING'
  | 'SCENARIO_CONFIRMATION'
  | 'CONTRADICTION_EVIDENCE'
  | 'HISTORICAL_REPLAY'
  | 'AUDIT';

// ═══════════════════════════════════════════════════════════════════════════════
// FRESHNESS USAGE RIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

export type FreshnessUsageRight =
  | 'DISPLAY_ALLOWED'
  | 'LIVE_SCORING_ALLOWED'
  | 'SCENARIO_CONFIRMATION_ALLOWED'
  | 'CONTRADICTION_EVIDENCE_ALLOWED'
  | 'HISTORICAL_REPLAY_ALLOWED'
  | 'AUDIT_ONLY'
  | 'NOT_ALLOWED';

// ═══════════════════════════════════════════════════════════════════════════════
// CRITICALITY
// ═══════════════════════════════════════════════════════════════════════════════

export type FreshnessCriticality =
  | 'MISSION_CRITICAL'
  | 'THESIS_CRITICAL'
  | 'CONTEXTUAL'
  | 'ENRICHMENT_ONLY';

// ═══════════════════════════════════════════════════════════════════════════════
// TIMING AGES — computed for every evaluation
// ═══════════════════════════════════════════════════════════════════════════════

export interface TimingAges {
  observationAgeMs?: number;
  publicationAgeMs?: number;
  ingestionAgeMs: number;
  transportGapMs?: number;
  publicationGapMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRESHNESS DECISION RECORD — the core output
// ═══════════════════════════════════════════════════════════════════════════════

export interface FreshnessDecisionRecord {
  envelopeId: string;
  fieldFamily?: string;
  sourceClass: string;
  freshnessFamily: FreshnessFamily;
  freshnessClass: FreshnessClass;
  freshnessState: FreshnessState;

  ages: TimingAges;

  dominantClock: DominantClock;
  rights: FreshnessUsageRight[];
  confidencePenalty: number;
  disclosureRequired: boolean;
  disclosureText?: string;
  reasonCodes: string[];
  evaluatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRESHNESS EVALUATION INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface FreshnessEvaluationInput {
  envelopeId: string;
  sourceClass: string;
  fieldFamily?: string;
  routeMode: 'realtime' | 'scheduled' | 'on_demand' | 'backfill';
  claimUsage?: ClaimUsage;

  observedTimestamp?: string;
  publishedTimestamp?: string;
  receivedTimestamp: string;
  ingestedTimestamp: string;
  timingCompleteness: 'full' | 'partial' | 'minimal';

  envelopeKind: string;
  isBackfill: boolean;
  replayGeneration?: number;
  policyVersion?: string;
}

export const L22_VERSION = '1.0.0' as const;
