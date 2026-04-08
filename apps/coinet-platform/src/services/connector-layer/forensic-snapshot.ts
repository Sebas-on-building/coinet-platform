/**
 * L2.5 — Forensic Snapshot Builder (v2)
 *
 * Assembles a complete point-in-time ingress forensic record from
 * all L2 layers. A forensic snapshot must be sufficient to answer
 * WHY any ingress decision was made.
 *
 * This is a convenience builder for constructing ForensicSnapshot
 * objects from loose inputs. The canonical types live in replay-types.ts.
 */

import { createHash } from 'crypto';
import type {
  ForensicSnapshot, EnvelopeSummary, FreshnessSummary,
  RoutingSummary, IdentitySummary, DownstreamTrace,
  BlindSpotRecord, IngressVersionPins,
} from './replay-types';
import {
  captureCurrentVersionPins, computeReconstructionIntegrity,
} from './replay-constitution';

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface SnapshotEnvelopeInput {
  envelopeId: string;
  envelopeKind: string;
  source: string;
  providerId: string;
  sourceClass: string;
  fieldFamily?: string;
  entityType?: string;
  canonicalCandidateIds?: string[];
  observedTimestamp?: string;
  ingestedTimestamp: string;
  routeMode: string;
  rawPayloadRef: string;
  rawPayloadHash: string;
  normalizationVersion: string;
  lineageComplete: boolean;
  timingCompleteness: string;
  connectorBinaryVersion?: string;
  idempotencyKey: string;
  dedupFingerprint: string;
  sequenceKey?: string;
  correctionOfEnvelopeId?: string;
}

export interface ForensicSnapshotInput {
  envelope: SnapshotEnvelopeInput;

  freshnessFamily?: string;
  freshnessClass?: string;
  freshnessState?: string;
  dominantClock?: string;
  observationAgeMs?: number;
  freshnessRights?: string[];
  confidencePenalty?: number;
  disclosureRequired?: boolean;

  selectedConnector?: string;
  routeState?: string;
  truthFidelityScore?: number;
  compositeScore?: number;
  provenanceScore?: number;
  allowedConsumers?: string[];
  blindSpots?: string[];
  fallbackUsed?: boolean;

  identityVerdict?: string;
  priorEnvelopeIds?: string[];
  correctionType?: string;
  downstreamEmissionAllowed?: boolean;
  liveStateMutationAllowed?: boolean;

  downstreamConsumers?: string[];
  judgmentRefs?: string[];
  scoringRefs?: string[];
  contradictionRefs?: string[];
  scenarioRefs?: string[];
  explanationRefs?: string[];

  fieldGaps?: string[];
  fallbackScars?: string[];
  degradationState?: string;

  versionPinOverrides?: Partial<IngressVersionPins>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export function buildForensicSnapshot(input: ForensicSnapshotInput): ForensicSnapshot {
  const e = input.envelope;
  const now = new Date().toISOString();

  const envSummary: EnvelopeSummary = {
    envelopeId: e.envelopeId,
    envelopeKind: e.envelopeKind,
    source: e.source,
    providerId: e.providerId,
    sourceClass: e.sourceClass,
    fieldFamily: e.fieldFamily,
    entityType: e.entityType,
    canonicalCandidateCount: e.canonicalCandidateIds?.length ?? 0,
    observedTimestamp: e.observedTimestamp,
    ingestedTimestamp: e.ingestedTimestamp,
    routeMode: e.routeMode,
    rawPayloadRef: e.rawPayloadRef,
    rawPayloadHash: e.rawPayloadHash,
    normalizationVersion: e.normalizationVersion,
    lineageComplete: e.lineageComplete,
    timingCompleteness: e.timingCompleteness,
  };

  const freshness: FreshnessSummary = {
    freshnessFamily: input.freshnessFamily ?? 'UNKNOWN',
    freshnessClass: input.freshnessClass ?? 'UNKNOWN',
    freshnessState: input.freshnessState ?? 'F5_UNKNOWN',
    dominantClock: input.dominantClock ?? 'UNKNOWN',
    observationAgeMs: input.observationAgeMs,
    rights: input.freshnessRights ?? [],
    confidencePenalty: input.confidencePenalty ?? 0,
    disclosureRequired: input.disclosureRequired ?? false,
  };

  const routing: RoutingSummary = {
    routeMode: e.routeMode,
    selectedConnector: input.selectedConnector ?? 'UNKNOWN',
    routeState: input.routeState ?? 'UNKNOWN',
    truthFidelityScore: input.truthFidelityScore ?? 0,
    compositeScore: input.compositeScore ?? 0,
    provenanceScore: input.provenanceScore ?? 0,
    allowedConsumers: input.allowedConsumers ?? [],
    blindSpots: input.blindSpots ?? [],
    fallbackUsed: input.fallbackUsed ?? false,
  };

  const identity: IdentitySummary = {
    verdict: input.identityVerdict ?? 'UNKNOWN',
    idempotencyKey: e.idempotencyKey,
    dedupFingerprint: e.dedupFingerprint,
    sequenceKey: e.sequenceKey,
    priorEnvelopeIds: input.priorEnvelopeIds ?? [],
    correctionType: input.correctionType,
    correctionOfEnvelopeId: e.correctionOfEnvelopeId,
    downstreamEmissionAllowed: input.downstreamEmissionAllowed ?? false,
    liveStateMutationAllowed: input.liveStateMutationAllowed ?? false,
  };

  const downstream: DownstreamTrace = {
    consumers: input.downstreamConsumers ?? [],
    judgmentRefs: input.judgmentRefs ?? [],
    scoringRefs: input.scoringRefs ?? [],
    contradictionRefs: input.contradictionRefs ?? [],
    scenarioRefs: input.scenarioRefs ?? [],
    explanationRefs: input.explanationRefs ?? [],
  };

  const blindSpotRecord: BlindSpotRecord = {
    routeBlindSpots: input.blindSpots ?? [],
    fieldGaps: input.fieldGaps ?? [],
    fallbackScars: input.fallbackScars ?? [],
    degradationState: input.degradationState,
  };

  const versionPins = captureCurrentVersionPins({
    connectorBinaryVersion: e.connectorBinaryVersion,
    normalizationVersion: e.normalizationVersion,
    ...input.versionPinOverrides,
  });

  const integrity = computeReconstructionIntegrity({
    hasEnvelope: true,
    hasFreshnessDecision: input.freshnessState != null,
    hasRoutingDecision: input.selectedConnector != null,
    hasIdentityDecision: input.identityVerdict != null,
    versionsPinned: !!versionPins.envelopeProtocolVersion && !!versionPins.normalizationVersion,
    lineageComplete: e.lineageComplete,
    rawPayloadRefExists: !!e.rawPayloadRef,
    normalizationVersionExists: !!e.normalizationVersion,
    timingComplete: e.timingCompleteness === 'full',
  });

  const snapshotId = createHash('sha256')
    .update(`${e.envelopeId}::${now}`)
    .digest('hex').slice(0, 24);

  return {
    snapshotId: `snap-${snapshotId}`,
    envelopeId: e.envelopeId,
    capturedAt: now,
    versionPins,
    envelope: envSummary,
    freshnessDecision: freshness,
    routingDecision: routing,
    identityDecision: identity,
    downstreamTrace: downstream,
    blindSpotRecord,
    reconstructionIntegrity: integrity,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SNAPSHOT STORE
// ═══════════════════════════════════════════════════════════════════════════════

const snapshotStore = new Map<string, ForensicSnapshot>();

export function storeSnapshot(snapshot: ForensicSnapshot): void {
  snapshotStore.set(snapshot.envelopeId, snapshot);
}

export function getSnapshot(envelopeId: string): ForensicSnapshot | undefined {
  return snapshotStore.get(envelopeId);
}

export function getAllSnapshots(): ForensicSnapshot[] {
  return Array.from(snapshotStore.values());
}

export function getSnapshotsByIntegrity(minScore: number): ForensicSnapshot[] {
  return Array.from(snapshotStore.values())
    .filter(s => s.reconstructionIntegrity.integrityScore >= minScore);
}

export function resetSnapshotStore(): void {
  snapshotStore.clear();
}
