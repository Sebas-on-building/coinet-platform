/**
 * L3.2 — Canonical Identity Resolution: Type System
 *
 * All shared types for the identity resolution pipeline.
 * The core output is IdentityResolutionDecision — the governed
 * decision object that later layers consume instead of raw matches.
 *
 * Design axiom: false merge is dangerous, false split is annoying.
 * The system prefers UNRESOLVED / CONTESTED / RESOLVED_WITH_SCAR
 * over clean-but-wrong collapse.
 */

import type { CanonicalObjectType, ConfidenceBand } from './canonical-entity-types';

export const L32_RESOLUTION_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION OUTCOMES AND STATES (dual-output model)
// ═══════════════════════════════════════════════════════════════════════════════

/** Confidence-level outcome */
export type IdentityResolutionOutcome =
  | 'RESOLVED_HIGH'      // score ≥ 85, no hard veto
  | 'RESOLVED_MEDIUM'    // score 70–84, some scar allowed
  | 'RESOLVED_LOW'       // score 55–69, contextual only
  | 'UNRESOLVED';        // score < 55 or hard veto

/** Epistemic-condition state */
export type IdentityResolutionState =
  | 'RESOLVED_CLEAN'       // high + no scar
  | 'RESOLVED_WITH_SCAR'   // resolved but with epistemic damage
  | 'CONTESTED'            // competing candidates or co-authority conflict
  | 'UNRESOLVED';          // cannot determine canonical identity

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION SCARS
// ═══════════════════════════════════════════════════════════════════════════════

export type ResolutionScar =
  | 'ALIAS_ONLY'
  | 'CHAIN_SCAR'
  | 'WRAPPED_RELATION_SCAR'
  | 'BRIDGED_RELATION_SCAR'
  | 'PROVIDER_DISAGREEMENT'
  | 'ENTITY_ATTRIBUTION_SCAR'
  | 'TOPIC_BOUNDARY_SCAR'
  | 'LIFECYCLE_SCAR'
  | 'HISTORICAL_CONTINUITY_SCAR'
  | 'ROUTE_SCAR'
  | 'BLINDSPOT_SCAR';

// ═══════════════════════════════════════════════════════════════════════════════
// HARD VETOES — force UNRESOLVED regardless of score
// ═══════════════════════════════════════════════════════════════════════════════

export type HardVeto =
  | 'SYMBOL_ONLY_MISSION_CRITICAL'
  | 'CROSS_CHAIN_MERGE_WITHOUT_CHAIN_REASONING'
  | 'WRAPPED_NATIVE_MERGE_WITHOUT_RELATIONSHIP'
  | 'PROTOCOL_TOKEN_COLLAPSE_BY_NAME'
  | 'PAIR_POOL_COLLAPSE_BY_LABEL'
  | 'ENTITY_ATTRIBUTION_WITHOUT_PROVENANCE'
  | 'NARRATIVE_MERGE_UNDER_UNRESOLVED_OVERLAP';

export const ALL_HARD_VETOES: readonly HardVeto[] = [
  'SYMBOL_ONLY_MISSION_CRITICAL',
  'CROSS_CHAIN_MERGE_WITHOUT_CHAIN_REASONING',
  'WRAPPED_NATIVE_MERGE_WITHOUT_RELATIONSHIP',
  'PROTOCOL_TOKEN_COLLAPSE_BY_NAME',
  'PAIR_POOL_COLLAPSE_BY_LABEL',
  'ENTITY_ATTRIBUTION_WITHOUT_PROVENANCE',
  'NARRATIVE_MERGE_UNDER_UNRESOLVED_OVERLAP',
];

// ═══════════════════════════════════════════════════════════════════════════════
// CORE DECISION CONTRACT — the artifact L3.2 emits
// ═══════════════════════════════════════════════════════════════════════════════

export type IdentityResolutionDecision = {
  resolutionId: string;
  objectType: CanonicalObjectType;

  inputHandle: string;
  candidateCanonicalIds: string[];
  selectedCanonicalId?: string;

  resolutionState: IdentityResolutionState;
  outcome: IdentityResolutionOutcome;
  confidenceScore: number;

  deterministicAnchorHits: string[];
  aliasMatches: string[];
  contextualMatches: string[];
  providerClaimsCompared: string[];
  providerDisagreements: string[];

  scars: ResolutionScar[];
  hardVetoes: HardVeto[];
  reasonCodes: string[];

  lineagePackRef?: string;
  blindSpotRefs: string[];
  rejectedCandidateIds: string[];

  manualReviewRequired: boolean;
  replayGeneration: number;

  createdAt: string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// PREFLIGHT TYPING
// ═══════════════════════════════════════════════════════════════════════════════

export type ResolutionPreflight = {
  intendedObjectType: CanonicalObjectType;
  admissibleResolverFamilies: string[];
  preflightWarnings: string[];
  blockedPaths: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

export type AnchorStrength = 'EXACT' | 'STRONG' | 'WEAK' | 'NONE';

export type DeterministicAnchorResult = {
  candidateIds: string[];
  anchorStrength: AnchorStrength;
  matchedAnchors: string[];
  blockedCandidates: string[];
};

export type AliasExpansionResult = {
  candidateIds: string[];
  aliasStrengthByCandidate: Record<string, number>;
  aliasMatchesByCandidate: Record<string, string[]>;
  collisionWarnings: string[];
};

export type ContextDisambiguationResult = {
  candidateScores: Record<string, number>;
  contextualSupports: Record<string, string[]>;
  contextualPenalties: Record<string, string[]>;
  historicalContinuitySignals: string[];
};

export type CrossProviderComparisonResult = {
  agreementByCandidate: Record<string, number>;
  disagreements: string[];
  coAuthorityConflicts: string[];
  reinforcingClaims: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING MODEL
// ═══════════════════════════════════════════════════════════════════════════════

export type ScoreBuckets = {
  deterministicAnchor: number;   // 0–45
  aliasEvidence: number;         // 0–15
  contextualDisambiguation: number; // 0–20
  crossProviderAgreement: number;   // 0–20
};

export type PenaltyBuckets = {
  crossChainAmbiguity: number;        // 0 to -20
  wrappedNativeAmbiguity: number;     // 0 to -25
  providerDisagreement: number;       // 0 to -30
  entityAttributionGap: number;       // 0 to -35
  lifecycleConflict: number;          // 0 to -10
  routeBlindspotScar: number;         // 0 to -20
  narrativeOverlapAmbiguity: number;  // 0 to -15
};

export const SCORE_LIMITS: Readonly<Record<keyof ScoreBuckets, number>> = {
  deterministicAnchor: 45,
  aliasEvidence: 15,
  contextualDisambiguation: 20,
  crossProviderAgreement: 20,
};

export const PENALTY_LIMITS: Readonly<Record<keyof PenaltyBuckets, number>> = {
  crossChainAmbiguity: -20,
  wrappedNativeAmbiguity: -25,
  providerDisagreement: -30,
  entityAttributionGap: -35,
  lifecycleConflict: -10,
  routeBlindspotScar: -20,
  narrativeOverlapAmbiguity: -15,
};

export const OUTCOME_THRESHOLDS = {
  RESOLVED_HIGH: 85,
  RESOLVED_MEDIUM: 70,
  RESOLVED_LOW: 55,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION INPUT — what comes into the pipeline
// ═══════════════════════════════════════════════════════════════════════════════

export type ResolutionInput = {
  inputHandle: string;
  objectTypeHint?: CanonicalObjectType;
  sourceClass?: string;
  fieldFamily?: string;
  chainContext?: string;
  providerClaims: ProviderIdentityClaim[];
  contractTuples: ContractTuple[];
  aliasHints: string[];
  pairContext?: { baseHint?: string; quoteHint?: string; scopeHint?: string };
  routeIntention?: string;
  replayGeneration: number;
  lineagePackRef?: string;
  blindSpotRefs: string[];
  isMissionCritical: boolean;
};

export type ProviderIdentityClaim = {
  providerId: string;
  providerObjectId: string;
  claimClass: 'DETERMINISTIC_ANCHOR' | 'ALIAS' | 'ATTRIBUTION' | 'LIFECYCLE' | 'RELATIONSHIP' | 'SCOPE';
  objectTypeHint: CanonicalObjectType;
  payload: Record<string, unknown>;
  confidence?: ConfidenceBand;
  sourceRefs: string[];
};

export type ContractTuple = {
  chainId: string;
  address: string;
  role?: string;
  sourceRefs: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// MISSION-CRITICAL GUARDRAILS
// ═══════════════════════════════════════════════════════════════════════════════

export type MissionCriticalUse =
  | 'PRICE_SCORING'
  | 'OI_SCORING'
  | 'FUNDING_SCORING'
  | 'LIQUIDITY_SCORING'
  | 'TVL_SCORING'
  | 'EXCHANGE_FLOW_CLAIMS'
  | 'SMART_MONEY_CONCLUSIONS'
  | 'CONTRACT_REASONING'
  | 'TRANSFER_REASONING'
  | 'SAFETY_VERDICT';

export function isOutcomeSafeForMissionCritical(
  outcome: IdentityResolutionOutcome,
  state: IdentityResolutionState,
): boolean {
  if (outcome === 'UNRESOLVED') return false;
  if (state === 'CONTESTED') return false;
  if (state === 'UNRESOLVED') return false;
  if (outcome === 'RESOLVED_LOW') return false;
  return true;
}

export function isOutcomeSafeForContextual(
  outcome: IdentityResolutionOutcome,
): boolean {
  return outcome !== 'UNRESOLVED';
}
