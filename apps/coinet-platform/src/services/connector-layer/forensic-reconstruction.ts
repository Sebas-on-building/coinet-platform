/**
 * L2.5 — Forensic Reconstruction
 *
 * Tell the human- and machine-readable story of historical ingress.
 * Not about rerunning — about explaining the chain of ingress truth.
 *
 * Reconstruction must preserve not only data, but also ignorance:
 * blind spots, degraded routes, missing fields, and fallback scars.
 */

import type {
  ForensicReconstruction, ForensicReconstructionRequest,
  ReconstructionTarget, ClaimLineagePack,
  ReplayIndexRecord, NormalizedArtifactRecord,
  FreshnessSummary, RoutingSummary, IdentitySummary,
  BlindSpotRecord, CorrectionChain, IngressVersionPins,
  ConfidenceStateSummary,
} from './replay-types';
import type { EntityConfidenceState } from '../canonicalization/entity-confidence-model';
import {
  getByEnvelopeId, getByTraceId, getCorrectionChain,
  getLineageEdgesTo,
} from './replay-index';
import { readRawPayload } from './raw-payload-archive';

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZED ARTIFACT STORE
// ═══════════════════════════════════════════════════════════════════════════════

const normalizedStore = new Map<string, NormalizedArtifactRecord>();

export function storeNormalizedArtifact(record: NormalizedArtifactRecord): void {
  normalizedStore.set(record.envelopeId, record);
}

export function getNormalizedArtifact(envelopeId: string): NormalizedArtifactRecord | undefined {
  return normalizedStore.get(envelopeId);
}

export function getAllNormalizedArtifacts(): NormalizedArtifactRecord[] {
  return Array.from(normalizedStore.values());
}

export function resetNormalizedStore(): void {
  normalizedStore.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOWNSTREAM CLAIM REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export interface DownstreamClaimLink {
  claimId: string;
  claimType: ReconstructionTarget;
  supportingEnvelopeIds: string[];
}

const claimRegistry = new Map<string, DownstreamClaimLink>();

export function registerDownstreamClaim(link: DownstreamClaimLink): void {
  claimRegistry.set(link.claimId, link);
}

export function getClaimLink(claimId: string): DownstreamClaimLink | undefined {
  return claimRegistry.get(claimId);
}

export function resetClaimRegistry(): void {
  claimRegistry.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECONSTRUCT
// ═══════════════════════════════════════════════════════════════════════════════

export function reconstruct(request: ForensicReconstructionRequest): ForensicReconstruction {
  const envelopeIds = resolveTargetToEnvelopes(request.targetType, request.targetId);
  const indexRecords = envelopeIds.map(id => getByEnvelopeId(id)).filter(Boolean) as ReplayIndexRecord[];

  const rawPayloadRefs = indexRecords.map(r => r.rawPayloadRef);
  const normalizedArtifacts = envelopeIds
    .map(id => getNormalizedArtifact(id))
    .filter(Boolean) as NormalizedArtifactRecord[];

  const freshnessHistory = indexRecords.map(buildFreshnessSummary);
  const routeHistory = indexRecords.map(buildRoutingSummary);
  const identityHistory = indexRecords.map(buildIdentitySummary);
  const blindSpotHistory = indexRecords.map(buildBlindSpotRecord);

  const correctionRoots = new Set<string>();
  for (const rec of indexRecords) {
    if (rec.correctionOfEnvelopeId) correctionRoots.add(rec.correctionOfEnvelopeId);
    if (rec.supersessionChainRootId) correctionRoots.add(rec.supersessionChainRootId);
  }
  const correctionChains: CorrectionChain[] = [];
  for (const rootId of correctionRoots) {
    const chain = getCorrectionChain(rootId);
    if (chain.length > 0) {
      correctionChains.push({
        rootEnvelopeId: rootId,
        chain: chain.map(c => ({
          envelopeId: c.envelopeId,
          correctionType: c.correctionOfEnvelopeId ? 'CORRECTION' : 'ORIGINAL',
          timestamp: c.createdAt,
        })),
      });
    }
  }

  const explanation = buildExplanation(request, indexRecords, blindSpotHistory, correctionChains);

  const pack = buildClaimLineagePack(request.targetId, indexRecords, rawPayloadRefs, correctionChains);

  let confidenceHistory: ConfidenceStateSummary[] | undefined;
  try {
    confidenceHistory = resolveConfidenceHistory(request.targetId);
    if (confidenceHistory && confidenceHistory.length > 0) {
      explanation.push(`L3.3 confidence: ${confidenceHistory.length} state(s) recorded, latest band=${confidenceHistory[0].band}`);
    }
  } catch { /* L3.3 integration is best-effort */ }

  return {
    reconstructedAt: new Date().toISOString(),
    targetType: request.targetType,
    targetId: request.targetId,
    ingressArtifacts: indexRecords,
    rawPayloadRefs,
    normalizedArtifacts,
    freshnessHistory,
    routeHistory,
    identityHistory,
    blindSpotHistory,
    correctionChains,
    claimLineagePack: pack,
    confidenceHistory,
    explanation,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TARGET RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

function resolveTargetToEnvelopes(targetType: ReconstructionTarget, targetId: string): string[] {
  if (targetType === 'envelope') return [targetId];

  if (targetType === 'trace') {
    return getByTraceId(targetId).map(r => r.envelopeId);
  }

  const claim = claimRegistry.get(targetId);
  if (claim) return claim.supportingEnvelopeIds;

  const edgesTo = getLineageEdgesTo(targetId);
  const fromEnvelopes = edgesTo
    .filter(e => e.fromType === 'envelope')
    .map(e => e.fromId);
  if (fromEnvelopes.length > 0) return fromEnvelopes;

  return [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildFreshnessSummary(rec: ReplayIndexRecord): FreshnessSummary {
  return {
    freshnessFamily: 'UNKNOWN', freshnessClass: 'UNKNOWN',
    freshnessState: rec.freshnessState ?? 'F5_UNKNOWN',
    dominantClock: 'UNKNOWN', rights: [], confidencePenalty: 0, disclosureRequired: false,
  };
}

function buildRoutingSummary(rec: ReplayIndexRecord): RoutingSummary {
  return {
    routeMode: rec.routeMode, selectedConnector: 'UNKNOWN',
    routeState: rec.routeState ?? 'UNKNOWN',
    truthFidelityScore: 0, compositeScore: 0, provenanceScore: 0,
    allowedConsumers: [], blindSpots: rec.blindSpots, fallbackUsed: false,
  };
}

function buildIdentitySummary(rec: ReplayIndexRecord): IdentitySummary {
  return {
    verdict: rec.identityVerdict ?? 'UNKNOWN',
    idempotencyKey: rec.idempotencyKey, dedupFingerprint: rec.dedupFingerprint,
    sequenceKey: rec.eventSequenceKey, priorEnvelopeIds: [],
    correctionOfEnvelopeId: rec.correctionOfEnvelopeId,
    downstreamEmissionAllowed: false, liveStateMutationAllowed: false,
  };
}

function buildBlindSpotRecord(rec: ReplayIndexRecord): BlindSpotRecord {
  return {
    routeBlindSpots: rec.blindSpots,
    fieldGaps: [],
    fallbackScars: [],
    degradationState: rec.routeState === 'R2_DEGRADED' ? 'DEGRADED' : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPLANATION BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildExplanation(
  request: ForensicReconstructionRequest,
  records: ReplayIndexRecord[],
  blindSpots: BlindSpotRecord[],
  corrections: CorrectionChain[],
): string[] {
  const lines: string[] = [];
  lines.push(`Forensic reconstruction for ${request.targetType} [${request.targetId}]`);
  lines.push(`${records.length} ingress artifact(s) resolved`);

  const sources = [...new Set(records.map(r => r.source))];
  lines.push(`Sources: ${sources.join(', ') || 'none'}`);

  const routes = [...new Set(records.map(r => r.routeMode))];
  lines.push(`Route modes: ${routes.join(', ') || 'none'}`);

  const allBlindSpots = blindSpots.flatMap(b => b.routeBlindSpots);
  if (allBlindSpots.length > 0) {
    lines.push(`Blind spots at ingress time: ${allBlindSpots.join(', ')}`);
  }

  if (corrections.length > 0) {
    lines.push(`${corrections.length} correction chain(s) involved`);
  }

  const missingRaw = records.filter(r => !readRawPayload(r.rawPayloadRef));
  if (missingRaw.length > 0) {
    lines.push(`WARNING: ${missingRaw.length} raw payload(s) not recoverable`);
  }

  return lines;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM LINEAGE PACK BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildClaimLineagePack(
  claimId: string,
  records: ReplayIndexRecord[],
  rawPayloadRefs: string[],
  corrections: CorrectionChain[],
): ClaimLineagePack {
  return {
    claimId,
    supportingEnvelopeIds: records.map(r => r.envelopeId),
    supportingRawPayloadRefs: rawPayloadRefs,
    routeIds: [...new Set(records.map(r => r.routeId))],
    traceIds: [...new Set(records.map(r => r.traceId))],
    replayGenerations: [...new Set(records.map(r => r.replayGeneration))],
    blindSpotRefs: records.flatMap(r => r.blindSpots),
    correctionChainRefs: corrections.map(c => c.rootEnvelopeId),
    versionPinsAtIngress: records.map(r => r.versionPins),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// L3.3-B: CONFIDENCE HISTORY FOR FORENSIC RECONSTRUCTION
// ═══════════════════════════════════════════════════════════════════════════════

function resolveConfidenceHistory(canonicalId: string): ConfidenceStateSummary[] {
  try {
    const { getCurrentState, getHistoryForCanonicalId } =
      require('../canonicalization/entity-confidence-model') as typeof import('../canonicalization/entity-confidence-model');
    const summaries: ConfidenceStateSummary[] = [];
    const current = getCurrentState(canonicalId);
    if (current) summaries.push(snapshotConfidenceState(current));
    const transitions = getHistoryForCanonicalId(canonicalId);
    for (const t of transitions) {
      summaries.push({
        stateId: t.transitionId,
        canonicalId: t.canonicalId,
        band: t.newBand,
        epistemicState: 'UNKNOWN',
        finalScore: t.newScore,
        activeScars: t.newScars,
        capChain: [],
        policyVersion: t.policyVersion,
        evaluatorVersion: t.evaluatorVersion,
        evaluatedAt: t.timestamp,
      });
    }
    return summaries;
  } catch {
    return [];
  }
}

export function snapshotConfidenceState(state: EntityConfidenceState): ConfidenceStateSummary {
  return {
    stateId: state.stateId,
    canonicalId: state.canonicalId,
    band: state.band,
    epistemicState: state.epistemicState,
    finalScore: state.finalScore,
    activeScars: state.activeScars.map(s => s.code),
    capChain: state.capChain.map(c => c.reason),
    policyVersion: state.policyVersion,
    evaluatorVersion: state.evaluatorVersion,
    evaluatedAt: state.evaluatedAt,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-FAKE: FORENSIC FAITHFULNESS
// ═══════════════════════════════════════════════════════════════════════════════

export function verifyForensicFaithfulness(recon: ForensicReconstruction): string[] {
  const violations: string[] = [];

  if (recon.ingressArtifacts.length === 0 && recon.targetType !== 'envelope') {
    violations.push('NO_INGRESS_ARTIFACTS_FOR_CLAIM');
  }

  for (const art of recon.ingressArtifacts) {
    if (!readRawPayload(art.rawPayloadRef)) {
      violations.push(`RAW_PAYLOAD_NOT_RECOVERABLE: ${art.envelopeId}`);
    }
  }

  const hasBlindSpots = recon.blindSpotHistory.some(b => b.routeBlindSpots.length > 0);
  const explanationMentionsBlindSpots = recon.explanation.some(e => e.includes('Blind spot'));
  if (hasBlindSpots && !explanationMentionsBlindSpots) {
    violations.push('BLIND_SPOTS_NOT_DISCLOSED_IN_EXPLANATION');
  }

  for (const chain of recon.correctionChains) {
    if (chain.chain.length < 2) continue;
    const rootExists = recon.ingressArtifacts.some(a => a.envelopeId === chain.rootEnvelopeId);
    if (!rootExists) {
      const chainResolves = getByEnvelopeId(chain.rootEnvelopeId);
      if (!chainResolves) {
        violations.push(`CORRECTION_CHAIN_ROOT_MISSING: ${chain.rootEnvelopeId}`);
      }
    }
  }

  const pack = recon.claimLineagePack;
  if (pack.supportingEnvelopeIds.length > 0 && pack.supportingRawPayloadRefs.length === 0) {
    violations.push('CLAIM_LINEAGE_MISSING_RAW_REFS');
  }

  return violations;
}
