/**
 * L2.5 — Ingress Replay Engine
 *
 * Replay is not re-fetching. Replay is deterministic reconstruction
 * from pinned ingress artifacts. Four modes:
 *
 *   STRICT_FORENSIC   — exact historical reproduction under pinned versions
 *   STRUCTURAL_REPLAY  — replay structure and lineage, not live mutation
 *   BATCH_REPLAY       — deterministic historical batch rerun
 *   DRY_RUN_AUDIT      — replay and compare without mutating any state
 */

import { createHash } from 'crypto';
import type {
  ReplaySession, ReplayScope, ReplayResults, ReplayMode, ReplayRequest,
  DriftRecord, SingleReplayOutcome, ForensicSnapshot, IngressVersionPins,
  ReplayIndexRecord,
} from './replay-types';
import {
  captureCurrentVersionPins, detectVersionDrift, computeReconstructionIntegrity,
  evaluateReplayPromotion,
} from './replay-constitution';
import { getByEnvelopeId, getByBatchId, getByTraceId } from './replay-index';
import { readRawPayload, verifyArchiveIntegrity } from './raw-payload-archive';

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const sessionRegistry = new Map<string, ReplaySession>();

export function getReplaySession(sessionId: string): ReplaySession | undefined {
  return sessionRegistry.get(sessionId);
}

export function getAllReplaySessions(): ReplaySession[] {
  return Array.from(sessionRegistry.values());
}

export function resetIngressReplayEngine(): void {
  sessionRegistry.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE ENVELOPE REPLAY
// ═══════════════════════════════════════════════════════════════════════════════

export function replaySingleEnvelope(
  envelopeId: string,
  mode: ReplayMode,
  pinnedVersions: IngressVersionPins,
): SingleReplayOutcome {
  const indexRecord = getByEnvelopeId(envelopeId);
  if (!indexRecord) {
    return {
      envelopeId,
      success: false,
      integrityScore: 0,
      drifts: [],
      divergenceReasons: ['INDEX_RECORD_NOT_FOUND'],
    };
  }

  const rawRecord = readRawPayload(indexRecord.rawPayloadRef);
  const rawExists = !!rawRecord;
  const archiveOk = rawExists ? verifyArchiveIntegrity(indexRecord.rawPayloadRef).valid : false;

  const versionDrifts = detectVersionDrift(indexRecord.versionPins, pinnedVersions);

  if (mode === 'STRICT_FORENSIC') {
    const criticalDrift = versionDrifts.some(d => d.severity === 'CRITICAL');
    if (criticalDrift) {
      return {
        envelopeId,
        success: false,
        integrityScore: 0,
        drifts: versionDrifts.map(toDriftRecord.bind(null, envelopeId)),
        divergenceReasons: ['STRICT_FORENSIC_VERSION_MISMATCH'],
      };
    }
  }

  const integrity = computeReconstructionIntegrity({
    hasEnvelope: true,
    hasFreshnessDecision: !!indexRecord.freshnessState,
    hasRoutingDecision: !!indexRecord.routeState,
    hasIdentityDecision: !!indexRecord.identityVerdict,
    versionsPinned: versionDrifts.length === 0,
    lineageComplete: rawExists && archiveOk,
    rawPayloadRefExists: rawExists,
    normalizationVersionExists: !!indexRecord.normalizationVersion,
    timingComplete: true,
  });

  const divergenceReasons: string[] = [];
  if (!rawExists) divergenceReasons.push('RAW_PAYLOAD_MISSING');
  if (!archiveOk && rawExists) divergenceReasons.push('RAW_PAYLOAD_CORRUPTED');

  const snapshot = buildSnapshotFromIndex(indexRecord, integrity);

  return {
    envelopeId,
    success: integrity.integrityScore >= 0.5,
    integrityScore: integrity.integrityScore,
    drifts: versionDrifts.map(toDriftRecord.bind(null, envelopeId)),
    divergenceReasons,
    reconstructedSnapshot: snapshot,
  };
}

function toDriftRecord(envelopeId: string, d: { field: string; originalVersion: string; currentVersion: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' }): DriftRecord {
  return {
    envelopeId,
    dimension: 'POLICY',
    originalValue: d.originalVersion,
    replayedValue: d.currentVersion,
    severity: d.severity,
    reasonCode: `VERSION_DRIFT_${d.field}`,
  };
}

function buildSnapshotFromIndex(
  rec: ReplayIndexRecord,
  integrity: { integrityScore: number; issues: string[]; envelopeReconstructable: boolean; freshnessReplayable: boolean; routingReplayable: boolean; identityReplayable: boolean; versionsPinned: boolean; lineageComplete: boolean },
): ForensicSnapshot {
  const now = new Date().toISOString();
  return {
    snapshotId: `snap-${createHash('sha256').update(`${rec.envelopeId}::${now}`).digest('hex').slice(0, 24)}`,
    envelopeId: rec.envelopeId,
    capturedAt: now,
    versionPins: rec.versionPins,
    envelope: {
      envelopeId: rec.envelopeId,
      envelopeKind: rec.correctionOfEnvelopeId ? 'correction' : 'observation',
      source: rec.source,
      providerId: rec.providerId,
      sourceClass: rec.sourceClass,
      fieldFamily: rec.fieldFamily,
      canonicalCandidateCount: 0,
      ingestedTimestamp: rec.createdAt,
      routeMode: rec.routeMode,
      rawPayloadRef: rec.rawPayloadRef,
      rawPayloadHash: '',
      normalizationVersion: rec.normalizationVersion,
      lineageComplete: integrity.lineageComplete,
      timingCompleteness: 'unknown',
    },
    freshnessDecision: {
      freshnessFamily: 'UNKNOWN', freshnessClass: 'UNKNOWN',
      freshnessState: rec.freshnessState ?? 'F5_UNKNOWN',
      dominantClock: 'UNKNOWN', rights: [], confidencePenalty: 0, disclosureRequired: false,
    },
    routingDecision: {
      routeMode: rec.routeMode, selectedConnector: 'UNKNOWN',
      routeState: rec.routeState ?? 'UNKNOWN',
      truthFidelityScore: 0, compositeScore: 0, provenanceScore: 0,
      allowedConsumers: [], blindSpots: rec.blindSpots, fallbackUsed: false,
    },
    identityDecision: {
      verdict: rec.identityVerdict ?? 'UNKNOWN',
      idempotencyKey: rec.idempotencyKey, dedupFingerprint: rec.dedupFingerprint,
      sequenceKey: rec.eventSequenceKey, priorEnvelopeIds: [],
      correctionOfEnvelopeId: rec.correctionOfEnvelopeId,
      downstreamEmissionAllowed: false, liveStateMutationAllowed: false,
    },
    downstreamTrace: {
      consumers: [], judgmentRefs: [], scoringRefs: [],
      contradictionRefs: [], scenarioRefs: [], explanationRefs: [],
    },
    blindSpotRecord: {
      routeBlindSpots: rec.blindSpots, fieldGaps: [], fallbackScars: [],
    },
    reconstructionIntegrity: {
      ...integrity,
      rawPayloadRecoverable: integrity.lineageComplete,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH / SESSION REPLAY
// ═══════════════════════════════════════════════════════════════════════════════

export function createReplaySession(request: ReplayRequest): ReplaySession {
  const sessionId = `replay-${Date.now()}-${createHash('sha256')
    .update(JSON.stringify(request.scope) + request.replayGeneration)
    .digest('hex').slice(0, 12)}`;

  const session: ReplaySession = {
    sessionId,
    createdAt: new Date().toISOString(),
    status: 'PENDING',
    replayMode: request.replayMode,
    replayGeneration: request.replayGeneration,
    versionPins: request.pinnedVersions,
    scope: request.scope,
    results: {
      totalEnvelopes: 0,
      reconstructed: 0,
      failedReconstruction: 0,
      divergenceDetected: false,
      integrityViolations: [],
      driftDetected: [],
      divergenceReasons: [],
    },
  };

  sessionRegistry.set(sessionId, session);
  return session;
}

export function executeReplaySession(sessionId: string): ReplaySession {
  const session = sessionRegistry.get(sessionId);
  if (!session) throw new Error(`Replay session ${sessionId} not found`);

  session.status = 'RUNNING';

  const envelopeIds = resolveScope(session.scope);
  session.results.totalEnvelopes = envelopeIds.length;

  if (envelopeIds.length === 0) {
    session.status = 'COMPLETED';
    session.completedAt = new Date().toISOString();
    return session;
  }

  for (const envId of envelopeIds) {
    const outcome = replaySingleEnvelope(envId, session.replayMode, session.versionPins);

    if (outcome.success) {
      session.results.reconstructed++;
    } else {
      session.results.failedReconstruction++;
      for (const r of outcome.divergenceReasons) {
        session.results.divergenceReasons.push(`${envId}: ${r}`);
      }
    }

    for (const d of outcome.drifts) {
      session.results.driftDetected.push(d);
    }

    if (outcome.integrityScore < 0.5) {
      session.results.integrityViolations.push(
        `${envId}: score=${outcome.integrityScore}`,
      );
    }
  }

  session.results.divergenceDetected = session.results.divergenceReasons.length > 0;

  session.status = session.results.failedReconstruction === 0
    ? 'COMPLETED'
    : session.results.reconstructed > 0
      ? 'PARTIAL'
      : 'FAILED';
  session.completedAt = new Date().toISOString();

  return session;
}

function resolveScope(scope: ReplayScope): string[] {
  if (scope.envelopeIds?.length) return scope.envelopeIds;

  if (scope.backfillBatchId) {
    return getByBatchId(scope.backfillBatchId).map(r => r.envelopeId);
  }
  if (scope.traceId) {
    return getByTraceId(scope.traceId).map(r => r.envelopeId);
  }

  return [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-FAKE: REPLAY HONESTY
// ═══════════════════════════════════════════════════════════════════════════════

export function verifyReplayHonesty(session: ReplaySession): string[] {
  const violations: string[] = [];

  if (session.status === 'COMPLETED' && session.results.failedReconstruction > 0) {
    violations.push('SESSION_MARKED_COMPLETE_WITH_FAILURES');
  }

  if (session.status === 'COMPLETED' && session.results.driftDetected.length > 0) {
    const criticalDrifts = session.results.driftDetected.filter(d => d.severity === 'CRITICAL');
    if (criticalDrifts.length > 0) {
      violations.push(`CRITICAL_DRIFT_UNDISCLOSED: ${criticalDrifts.length} critical drifts`);
    }
  }

  if (session.results.totalEnvelopes > 0 && session.results.reconstructed === 0 && session.status !== 'FAILED') {
    violations.push('ZERO_RECONSTRUCTION_NOT_MARKED_FAILED');
  }

  const pinCheck = session.versionPins;
  if (!pinCheck.envelopeProtocolVersion || !pinCheck.normalizationVersion) {
    violations.push('REPLAY_WITHOUT_VERSION_PINS');
  }

  if (session.replayMode === 'STRICT_FORENSIC' && session.results.divergenceDetected) {
    violations.push('STRICT_FORENSIC_WITH_DIVERGENCE');
  }

  return violations;
}
