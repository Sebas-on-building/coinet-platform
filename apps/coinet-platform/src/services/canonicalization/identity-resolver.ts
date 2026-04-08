/**
 * L3.2 — Canonical Identity Resolution: Resolver
 *
 * Per-object-type scoring, hard veto system, and outcome mapping.
 * The resolver combines deterministic anchors, alias evidence,
 * contextual disambiguation, and provider comparison into one
 * governed IdentityResolutionDecision.
 *
 * Core axiom: false merge is dangerous, false split is annoying.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CanonicalObjectType } from './canonical-entity-types';
import {
  type IdentityResolutionDecision,
  type IdentityResolutionOutcome,
  type IdentityResolutionState,
  type ResolutionScar,
  type HardVeto,
  type DeterministicAnchorResult,
  type AliasExpansionResult,
  type ContextDisambiguationResult,
  type CrossProviderComparisonResult,
  type ScoreBuckets,
  type PenaltyBuckets,
  SCORE_LIMITS,
  OUTCOME_THRESHOLDS,
  ALL_HARD_VETOES,
} from './identity-resolution-types';

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeScoreBuckets(
  anchor: DeterministicAnchorResult,
  alias: AliasExpansionResult,
  context: ContextDisambiguationResult,
  providers: CrossProviderComparisonResult,
  selectedCandidate: string | undefined,
): ScoreBuckets {
  let anchorScore = 0;
  if (anchor.anchorStrength === 'EXACT') anchorScore = 45;
  else if (anchor.anchorStrength === 'STRONG') anchorScore = 35;
  else if (anchor.anchorStrength === 'WEAK') anchorScore = 15;

  const aliasScore = selectedCandidate
    ? clamp(alias.aliasStrengthByCandidate[selectedCandidate] ?? 0, 0, SCORE_LIMITS.aliasEvidence)
    : 0;

  const contextScore = selectedCandidate
    ? clamp(context.candidateScores[selectedCandidate] ?? 0, 0, SCORE_LIMITS.contextualDisambiguation)
    : 0;

  const providerScore = selectedCandidate
    ? clamp(providers.agreementByCandidate[selectedCandidate] ?? 0, 0, SCORE_LIMITS.crossProviderAgreement)
    : 0;

  return {
    deterministicAnchor: anchorScore,
    aliasEvidence: aliasScore,
    contextualDisambiguation: contextScore,
    crossProviderAgreement: providerScore,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PENALTIES
// ═══════════════════════════════════════════════════════════════════════════════

export type PenaltyContext = {
  hasChainAmbiguity: boolean;
  hasWrappedNativeAmbiguity: boolean;
  providerDisagreementCount: number;
  hasEntityAttributionGap: boolean;
  hasLifecycleConflict: boolean;
  routeBlindspotCount: number;
  hasNarrativeOverlap: boolean;
};

export function computePenalties(ctx: PenaltyContext): PenaltyBuckets {
  return {
    crossChainAmbiguity: ctx.hasChainAmbiguity ? -20 : 0,
    wrappedNativeAmbiguity: ctx.hasWrappedNativeAmbiguity ? -25 : 0,
    providerDisagreement: clamp(ctx.providerDisagreementCount * -10, -30, 0),
    entityAttributionGap: ctx.hasEntityAttributionGap ? -35 : 0,
    lifecycleConflict: ctx.hasLifecycleConflict ? -10 : 0,
    routeBlindspotScar: clamp(ctx.routeBlindspotCount * -5, -20, 0),
    narrativeOverlapAmbiguity: ctx.hasNarrativeOverlap ? -15 : 0,
  };
}

export function totalScore(scores: ScoreBuckets, penalties: PenaltyBuckets): number {
  const pos = scores.deterministicAnchor + scores.aliasEvidence
    + scores.contextualDisambiguation + scores.crossProviderAgreement;
  const neg = penalties.crossChainAmbiguity + penalties.wrappedNativeAmbiguity
    + penalties.providerDisagreement + penalties.entityAttributionGap
    + penalties.lifecycleConflict + penalties.routeBlindspotScar
    + penalties.narrativeOverlapAmbiguity;
  return clamp(pos + neg, 0, 100);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HARD VETOES
// ═══════════════════════════════════════════════════════════════════════════════

export type VetoContext = {
  objectType: CanonicalObjectType;
  isMissionCritical: boolean;
  hasOnlyAliasEvidence: boolean;
  hasCrossChainMerge: boolean;
  hasChainAwareReasoning: boolean;
  hasWrappedNativeMerge: boolean;
  hasRelationshipModel: boolean;
  hasProtocolTokenCollapse: boolean;
  hasPairPoolCollapse: boolean;
  hasEntityAttributionWithoutProvenance: boolean;
  hasNarrativeMergeUnderOverlap: boolean;
};

export function detectHardVetoes(ctx: VetoContext): HardVeto[] {
  const vetoes: HardVeto[] = [];

  if (ctx.isMissionCritical && ctx.hasOnlyAliasEvidence) {
    vetoes.push('SYMBOL_ONLY_MISSION_CRITICAL');
  }
  if (ctx.hasCrossChainMerge && !ctx.hasChainAwareReasoning) {
    vetoes.push('CROSS_CHAIN_MERGE_WITHOUT_CHAIN_REASONING');
  }
  if (ctx.hasWrappedNativeMerge && !ctx.hasRelationshipModel) {
    vetoes.push('WRAPPED_NATIVE_MERGE_WITHOUT_RELATIONSHIP');
  }
  if (ctx.hasProtocolTokenCollapse) {
    vetoes.push('PROTOCOL_TOKEN_COLLAPSE_BY_NAME');
  }
  if (ctx.hasPairPoolCollapse) {
    vetoes.push('PAIR_POOL_COLLAPSE_BY_LABEL');
  }
  if (ctx.hasEntityAttributionWithoutProvenance) {
    vetoes.push('ENTITY_ATTRIBUTION_WITHOUT_PROVENANCE');
  }
  if (ctx.hasNarrativeMergeUnderOverlap) {
    vetoes.push('NARRATIVE_MERGE_UNDER_UNRESOLVED_OVERLAP');
  }

  return vetoes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCAR DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export type ScarContext = {
  hasOnlyAliasEvidence: boolean;
  hasChainAmbiguity: boolean;
  hasWrappedRelation: boolean;
  hasBridgedRelation: boolean;
  hasProviderDisagreement: boolean;
  hasEntityAttributionGap: boolean;
  hasTopicBoundaryAmbiguity: boolean;
  hasLifecycleConflict: boolean;
  hasHistoricalDiscontinuity: boolean;
  hasRouteScar: boolean;
  hasBlindspot: boolean;
};

export function detectScars(ctx: ScarContext): ResolutionScar[] {
  const scars: ResolutionScar[] = [];
  if (ctx.hasOnlyAliasEvidence) scars.push('ALIAS_ONLY');
  if (ctx.hasChainAmbiguity) scars.push('CHAIN_SCAR');
  if (ctx.hasWrappedRelation) scars.push('WRAPPED_RELATION_SCAR');
  if (ctx.hasBridgedRelation) scars.push('BRIDGED_RELATION_SCAR');
  if (ctx.hasProviderDisagreement) scars.push('PROVIDER_DISAGREEMENT');
  if (ctx.hasEntityAttributionGap) scars.push('ENTITY_ATTRIBUTION_SCAR');
  if (ctx.hasTopicBoundaryAmbiguity) scars.push('TOPIC_BOUNDARY_SCAR');
  if (ctx.hasLifecycleConflict) scars.push('LIFECYCLE_SCAR');
  if (ctx.hasHistoricalDiscontinuity) scars.push('HISTORICAL_CONTINUITY_SCAR');
  if (ctx.hasRouteScar) scars.push('ROUTE_SCAR');
  if (ctx.hasBlindspot) scars.push('BLINDSPOT_SCAR');
  return scars;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTCOME MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

export function mapOutcome(
  score: number,
  vetoes: HardVeto[],
): IdentityResolutionOutcome {
  if (vetoes.length > 0) return 'UNRESOLVED';
  if (score >= OUTCOME_THRESHOLDS.RESOLVED_HIGH) return 'RESOLVED_HIGH';
  if (score >= OUTCOME_THRESHOLDS.RESOLVED_MEDIUM) return 'RESOLVED_MEDIUM';
  if (score >= OUTCOME_THRESHOLDS.RESOLVED_LOW) return 'RESOLVED_LOW';
  return 'UNRESOLVED';
}

export function mapState(
  outcome: IdentityResolutionOutcome,
  scars: ResolutionScar[],
  providers: CrossProviderComparisonResult,
  candidateIds: string[],
  contextScores: Record<string, number>,
): IdentityResolutionState {
  if (outcome === 'UNRESOLVED') {
    if (providers.coAuthorityConflicts.length > 0) return 'CONTESTED';
    if (candidateIds.length >= 2) {
      const sorted = [...candidateIds].sort(
        (a, b) => (contextScores[b] ?? 0) - (contextScores[a] ?? 0)
      );
      const top = contextScores[sorted[0]] ?? 0;
      const second = contextScores[sorted[1]] ?? 0;
      if (top > 0 && second > 0 && top - second < 10) return 'CONTESTED';
    }
    return 'UNRESOLVED';
  }

  if (scars.length > 0) return 'RESOLVED_WITH_SCAR';
  return 'RESOLVED_CLEAN';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANDIDATE SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

export function selectCandidate(
  allCandidateIds: string[],
  anchorResult: DeterministicAnchorResult,
  contextScores: Record<string, number>,
  providerAgreement: Record<string, number>,
): { selectedId: string | undefined; isContested: boolean } {
  if (allCandidateIds.length === 0) return { selectedId: undefined, isContested: false };
  if (allCandidateIds.length === 1) return { selectedId: allCandidateIds[0], isContested: false };

  const anchorCandidates = anchorResult.candidateIds;
  if (anchorCandidates.length === 1) {
    return { selectedId: anchorCandidates[0], isContested: false };
  }

  const scored = allCandidateIds.map(id => ({
    id,
    score: (contextScores[id] ?? 0) + (providerAgreement[id] ?? 0)
      + (anchorCandidates.includes(id) ? 30 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1];
  const isContested = second && top.score - second.score < 10;

  return { selectedId: top.id, isContested };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL RESOLUTION ADJUDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

export type AdjudicationInput = {
  objectType: CanonicalObjectType;
  inputHandle: string;
  isMissionCritical: boolean;
  anchorResult: DeterministicAnchorResult;
  aliasResult: AliasExpansionResult;
  contextResult: ContextDisambiguationResult;
  providerResult: CrossProviderComparisonResult;
  scarContext: ScarContext;
  vetoContext: VetoContext;
  penaltyContext: PenaltyContext;
  replayGeneration: number;
  lineagePackRef?: string;
  blindSpotRefs: string[];
};

export function adjudicate(input: AdjudicationInput): IdentityResolutionDecision {
  const allCandidateIds = [
    ...new Set([
      ...input.anchorResult.candidateIds,
      ...input.aliasResult.candidateIds,
      ...Object.keys(input.contextResult.candidateScores),
    ]),
  ];

  const { selectedId, isContested } = selectCandidate(
    allCandidateIds,
    input.anchorResult,
    input.contextResult.candidateScores,
    input.providerResult.agreementByCandidate,
  );

  const scores = computeScoreBuckets(
    input.anchorResult,
    input.aliasResult,
    input.contextResult,
    input.providerResult,
    selectedId,
  );
  const penalties = computePenalties(input.penaltyContext);
  const score = totalScore(scores, penalties);

  const vetoes = detectHardVetoes(input.vetoContext);
  const scars = detectScars(input.scarContext);

  const outcome = mapOutcome(score, vetoes);
  const state = mapState(
    outcome,
    scars,
    input.providerResult,
    allCandidateIds,
    input.contextResult.candidateScores,
  );

  const rejectedCandidateIds = allCandidateIds.filter(id => id !== selectedId);
  const manualReviewRequired = state === 'CONTESTED'
    || (state === 'UNRESOLVED' && allCandidateIds.length > 0)
    || (isContested && input.isMissionCritical);

  return {
    resolutionId: `res_${uuidv4().replace(/-/g, '')}`,
    objectType: input.objectType,
    inputHandle: input.inputHandle,
    candidateCanonicalIds: allCandidateIds,
    selectedCanonicalId: outcome !== 'UNRESOLVED' ? selectedId : undefined,
    resolutionState: state,
    outcome,
    confidenceScore: score,
    deterministicAnchorHits: input.anchorResult.matchedAnchors,
    aliasMatches: selectedId
      ? (input.aliasResult.aliasMatchesByCandidate[selectedId] ?? [])
      : [],
    contextualMatches: selectedId
      ? (input.contextResult.contextualSupports[selectedId] ?? [])
      : [],
    providerClaimsCompared: input.providerResult.reinforcingClaims,
    providerDisagreements: [
      ...input.providerResult.disagreements,
      ...input.providerResult.coAuthorityConflicts,
    ],
    scars,
    hardVetoes: vetoes,
    reasonCodes: [
      `ANCHOR:${input.anchorResult.anchorStrength}`,
      `SCORE:${score}`,
      ...vetoes.map(v => `VETO:${v}`),
      ...scars.map(s => `SCAR:${s}`),
      ...(isContested ? ['CANDIDATES_CONTESTED'] : []),
    ],
    lineagePackRef: input.lineagePackRef,
    blindSpotRefs: input.blindSpotRefs,
    rejectedCandidateIds,
    manualReviewRequired,
    replayGeneration: input.replayGeneration,
    createdAt: new Date().toISOString(),
  };
}
