/**
 * L3.2 — Canonical Identity Resolution: Pipeline Orchestrator
 *
 * Five-stage pipeline: preflight → deterministic anchors → alias expansion
 * → contextual disambiguation → cross-provider comparison → adjudication.
 *
 * No later layer may operate directly on alias candidates if this
 * pipeline has not completed and emitted an IdentityResolutionDecision.
 */

import type { CanonicalObjectType } from './canonical-entity-types';
import {
  type ResolutionInput,
  type ResolutionPreflight,
  type IdentityResolutionDecision,
  type ContextDisambiguationResult,
} from './identity-resolution-types';
import {
  resolveByContractTuples,
  resolveAddressIdentity,
  resolvePoolAddress,
  detectWrappedRelation,
} from './contract-resolution';
import {
  expandAliases,
} from './alias-registry';
import {
  normalizeClaims,
  compareProviderClaims,
  hasProvenanceSupport,
} from './provider-identity-claims';
import {
  adjudicate,
  type ScarContext,
  type VetoContext,
  type PenaltyContext,
} from './identity-resolver';

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 0 — PREFLIGHT TYPING
// ═══════════════════════════════════════════════════════════════════════════════

const SOURCE_CLASS_TYPE_MAP: Record<string, CanonicalObjectType[]> = {
  MARKET_SURFACE: ['ASSET', 'PAIR'],
  DEX_EMERGENCE: ['PAIR', 'ASSET', 'PROTOCOL'],
  DERIVATIVES_PRESSURE: ['PAIR', 'ASSET'],
  PROTOCOL_SUBSTANCE: ['PROTOCOL'],
  ON_CHAIN_BEHAVIOR: ['ENTITY', 'ASSET', 'CHAIN'],
  STRUCTURAL_SAFETY: ['ASSET', 'PROTOCOL', 'CHAIN'],
  NARRATIVE_ATTENTION: ['NARRATIVE_TOPIC', 'ASSET'],
  ENTITY_CONTEXT: ['ENTITY'],
  REASONING_EXPRESSION: ['ASSET', 'PAIR', 'PROTOCOL', 'ENTITY', 'CHAIN', 'NARRATIVE_TOPIC'],
};

const FIELD_FAMILY_TYPE_MAP: Record<string, CanonicalObjectType> = {
  'price.spot': 'ASSET',
  'price.perp': 'PAIR',
  'market.cap': 'ASSET',
  'derivatives.funding': 'PAIR',
  'derivatives.oi': 'PAIR',
  'derivatives.liquidation': 'PAIR',
  'protocol.tvl': 'PROTOCOL',
  'protocol.fees': 'PROTOCOL',
  'protocol.revenue': 'PROTOCOL',
  'wallet.exchange_inflow': 'ENTITY',
  'wallet.transfer': 'ENTITY',
  'entity.label': 'ENTITY',
  'narrative.intensity': 'NARRATIVE_TOPIC',
  'narrative.velocity': 'NARRATIVE_TOPIC',
  'security.token': 'ASSET',
  'chain.gas': 'CHAIN',
  'chain.tps': 'CHAIN',
};

export function runPreflight(input: ResolutionInput): ResolutionPreflight {
  const warnings: string[] = [];
  const blocked: string[] = [];
  let intended: CanonicalObjectType = input.objectTypeHint ?? 'ASSET';
  const admissible: string[] = [];

  if (input.objectTypeHint) {
    intended = input.objectTypeHint;
    admissible.push(intended);
  } else if (input.fieldFamily && FIELD_FAMILY_TYPE_MAP[input.fieldFamily]) {
    intended = FIELD_FAMILY_TYPE_MAP[input.fieldFamily];
    admissible.push(intended);
  } else if (input.sourceClass && SOURCE_CLASS_TYPE_MAP[input.sourceClass]) {
    const candidates = SOURCE_CLASS_TYPE_MAP[input.sourceClass];
    intended = candidates[0];
    admissible.push(...candidates);
  }

  if (input.contractTuples.length > 0 && intended === 'NARRATIVE_TOPIC') {
    warnings.push('CONTRACT_TUPLES_WITH_NARRATIVE_TYPE_MISMATCH');
    blocked.push('NARRATIVE_RESOLVER_ON_CONTRACT_EVIDENCE');
    intended = 'ASSET';
  }

  if (input.pairContext && intended === 'ENTITY') {
    warnings.push('PAIR_CONTEXT_WITH_ENTITY_TYPE_MISMATCH');
  }

  if (input.providerClaims.length > 0) {
    const claimTypes = new Set(input.providerClaims.map(c => c.objectTypeHint));
    if (claimTypes.size > 1) {
      warnings.push(`MIXED_OBJECT_TYPE_CLAIMS:${[...claimTypes].join(',')}`);
    }
  }

  return {
    intendedObjectType: intended,
    admissibleResolverFamilies: admissible.length > 0 ? admissible : [intended],
    preflightWarnings: warnings,
    blockedPaths: blocked,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 3 — CONTEXTUAL DISAMBIGUATION (built into pipeline)
// ═══════════════════════════════════════════════════════════════════════════════

function runContextDisambiguation(
  candidateIds: string[],
  input: ResolutionInput,
  preflight: ResolutionPreflight,
): ContextDisambiguationResult {
  const scores: Record<string, number> = {};
  const supports: Record<string, string[]> = {};
  const penalties: Record<string, string[]> = {};
  const historicalSignals: string[] = [];

  for (const cid of candidateIds) {
    scores[cid] = 0;
    supports[cid] = [];
    penalties[cid] = [];

    if (input.chainContext) {
      supports[cid].push(`CHAIN_CONTEXT:${input.chainContext}`);
      scores[cid] += 5;
    }

    if (input.sourceClass) {
      const admissible = SOURCE_CLASS_TYPE_MAP[input.sourceClass] ?? [];
      if (admissible.includes(preflight.intendedObjectType)) {
        supports[cid].push(`SOURCE_CLASS_MATCH:${input.sourceClass}`);
        scores[cid] += 5;
      }
    }

    if (input.fieldFamily) {
      const expected = FIELD_FAMILY_TYPE_MAP[input.fieldFamily];
      if (expected === preflight.intendedObjectType) {
        supports[cid].push(`FIELD_FAMILY_MATCH:${input.fieldFamily}`);
        scores[cid] += 5;
      }
    }

    if (input.pairContext?.baseHint && cid.startsWith('pair_')) {
      supports[cid].push(`PAIR_BASE_HINT:${input.pairContext.baseHint}`);
      scores[cid] += 3;
    }

    if (input.routeIntention === 'FORENSIC_REPLAY') {
      historicalSignals.push('REPLAY_TOLERANCE_HIGHER');
    }
  }

  return {
    candidateScores: scores,
    contextualSupports: supports,
    contextualPenalties: penalties,
    historicalContinuitySignals: historicalSignals,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCAR / VETO / PENALTY CONTEXT BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildScarContext(
  input: ResolutionInput,
  anchorCandidates: string[],
  aliasCandidates: string[],
  providers: ReturnType<typeof compareProviderClaims>,
): ScarContext {
  const aliasOnly = anchorCandidates.length === 0 && aliasCandidates.length > 0;

  let hasWrapped = false;
  let hasBridged = false;
  for (const tuple of input.contractTuples) {
    const rel = detectWrappedRelation(tuple.chainId, tuple.address);
    if (rel.hasRelation && rel.relationType === 'WRAPPED') hasWrapped = true;
    if (rel.hasRelation && rel.relationType === 'BRIDGED') hasBridged = true;
  }

  return {
    hasOnlyAliasEvidence: aliasOnly,
    hasChainAmbiguity: input.contractTuples.length > 0
      && new Set(input.contractTuples.map(t => t.chainId)).size > 1,
    hasWrappedRelation: hasWrapped,
    hasBridgedRelation: hasBridged,
    hasProviderDisagreement: providers.disagreements.length > 0 || providers.coAuthorityConflicts.length > 0,
    hasEntityAttributionGap: input.objectTypeHint === 'ENTITY'
      && !hasProvenanceSupport(normalizeClaims(input.providerClaims), 'ENTITY'),
    hasTopicBoundaryAmbiguity: input.objectTypeHint === 'NARRATIVE_TOPIC'
      && input.aliasHints.length > 2,
    hasLifecycleConflict: false,
    hasHistoricalDiscontinuity: false,
    hasRouteScar: input.blindSpotRefs.some(r => r.includes('ROUTE')),
    hasBlindspot: input.blindSpotRefs.length > 0,
  };
}

function buildVetoContext(
  input: ResolutionInput,
  scarCtx: ScarContext,
  allCandidates: string[],
): VetoContext {
  return {
    objectType: input.objectTypeHint ?? 'ASSET',
    isMissionCritical: input.isMissionCritical,
    hasOnlyAliasEvidence: scarCtx.hasOnlyAliasEvidence,
    hasCrossChainMerge: scarCtx.hasChainAmbiguity && allCandidates.length <= 1,
    hasChainAwareReasoning: input.chainContext !== undefined,
    hasWrappedNativeMerge: scarCtx.hasWrappedRelation && allCandidates.length <= 1,
    hasRelationshipModel: scarCtx.hasWrappedRelation,
    hasProtocolTokenCollapse: false,
    hasPairPoolCollapse: false,
    hasEntityAttributionWithoutProvenance: scarCtx.hasEntityAttributionGap,
    hasNarrativeMergeUnderOverlap: scarCtx.hasTopicBoundaryAmbiguity && allCandidates.length <= 1,
  };
}

function buildPenaltyContext(
  scarCtx: ScarContext,
  providers: ReturnType<typeof compareProviderClaims>,
  input: ResolutionInput,
  anchorCandidates: string[],
  allCandidates: string[],
): PenaltyContext {
  // Wrapped/native ambiguity penalty only applies when the resolution
  // has genuine merge risk — multiple candidates where native and wrapped
  // coexist. A single clear anchor to a wrapped asset is a scar, not ambiguity.
  const wrappedAmbiguity = scarCtx.hasWrappedRelation
    && allCandidates.length > 1
    && anchorCandidates.length !== 1;

  return {
    hasChainAmbiguity: scarCtx.hasChainAmbiguity,
    hasWrappedNativeAmbiguity: wrappedAmbiguity,
    providerDisagreementCount: providers.disagreements.length + providers.coAuthorityConflicts.length,
    hasEntityAttributionGap: scarCtx.hasEntityAttributionGap,
    hasLifecycleConflict: scarCtx.hasLifecycleConflict,
    routeBlindspotCount: input.blindSpotRefs.length,
    hasNarrativeOverlap: scarCtx.hasTopicBoundaryAmbiguity,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION LEDGER (in-memory; production backs to persistent store)
// ═══════════════════════════════════════════════════════════════════════════════

let _decisionLedger: IdentityResolutionDecision[] = [];
let _unresolvedQueue: IdentityResolutionDecision[] = [];

export function getDecisionLedger(): readonly IdentityResolutionDecision[] {
  return _decisionLedger;
}

export function getUnresolvedQueue(): readonly IdentityResolutionDecision[] {
  return _unresolvedQueue;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export function resolveIdentity(input: ResolutionInput): IdentityResolutionDecision {
  // Stage 0 — Preflight
  const preflight = runPreflight(input);
  const objectType = preflight.intendedObjectType;

  // Stage 1 — Deterministic anchors
  let anchorResult = resolveByContractTuples(input.contractTuples, objectType);

  if (objectType === 'ENTITY' && input.contractTuples.length > 0) {
    const addrResult = resolveAddressIdentity(
      input.contractTuples[0].chainId,
      input.contractTuples[0].address,
    );
    if (addrResult.candidateIds.length > 0) {
      anchorResult = addrResult;
    }
  }

  // Stage 2 — Alias expansion
  const aliasResult = expandAliases(input.aliasHints, objectType, input.chainContext);

  // Stage 3 — Contextual disambiguation
  const allPreCandidates = [
    ...new Set([...anchorResult.candidateIds, ...aliasResult.candidateIds]),
  ];
  const contextResult = runContextDisambiguation(allPreCandidates, input, preflight);

  // Stage 4 — Cross-provider comparison
  const normalizedClaims = normalizeClaims(input.providerClaims);
  for (const claim of normalizedClaims) {
    if (!claim.candidateCanonicalId && allPreCandidates.length === 1) {
      claim.candidateCanonicalId = allPreCandidates[0];
    }
  }
  const providerResult = compareProviderClaims(normalizedClaims, allPreCandidates);

  // Build contexts
  const scarCtx = buildScarContext(input, anchorResult.candidateIds, aliasResult.candidateIds, providerResult);
  const vetoCtx = buildVetoContext(input, scarCtx, allPreCandidates);
  const penaltyCtx = buildPenaltyContext(scarCtx, providerResult, input, anchorResult.candidateIds, allPreCandidates);

  // Stage 5 — Final adjudication
  const decision = adjudicate({
    objectType,
    inputHandle: input.inputHandle,
    isMissionCritical: input.isMissionCritical,
    anchorResult,
    aliasResult,
    contextResult,
    providerResult,
    scarContext: scarCtx,
    vetoContext: vetoCtx,
    penaltyContext: penaltyCtx,
    replayGeneration: input.replayGeneration,
    lineagePackRef: input.lineagePackRef,
    blindSpotRefs: input.blindSpotRefs,
  });

  // Persist
  _decisionLedger.push(decision);
  if (decision.resolutionState === 'UNRESOLVED' || decision.resolutionState === 'CONTESTED') {
    _unresolvedQueue.push(decision);
  }

  return decision;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET (for testing)
// ═══════════════════════════════════════════════════════════════════════════════

export function resetPipelineState(): void {
  _decisionLedger = [];
  _unresolvedQueue = [];
}

export { runPreflight as _runPreflight };
