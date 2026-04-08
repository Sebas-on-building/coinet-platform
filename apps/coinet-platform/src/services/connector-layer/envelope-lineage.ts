/**
 * L2.1 Envelope Lineage & Forensic Engine
 *
 * Replay safety, dedup, correction chain, backfill tagging, forensic audit.
 * Every envelope is traceable from normalized fragment back to raw origin.
 */

import type { ConstitutionalEnvelope } from './constitutional-envelope';

// ═══════════════════════════════════════════════════════════════════════════════
// DEDUP REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const dedupStore = new Map<string, { envelopeId: string; ingestedAt: string; generation: number }>();

export function isDuplicate(envelope: ConstitutionalEnvelope): boolean {
  const fp = envelope.replayContext.dedupFingerprint;
  const existing = dedupStore.get(fp);
  if (!existing) return false;
  return existing.generation === envelope.replayContext.replayGeneration;
}

export function registerDedup(envelope: ConstitutionalEnvelope): void {
  dedupStore.set(envelope.replayContext.dedupFingerprint, {
    envelopeId: envelope.identity.envelopeId,
    ingestedAt: envelope.timing.ingestedTimestamp,
    generation: envelope.replayContext.replayGeneration,
  });
}

export function getDedupEntry(fingerprint: string) {
  return dedupStore.get(fingerprint) ?? null;
}

export function clearDedupStore(): void {
  dedupStore.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORRECTION CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

const correctionChain = new Map<string, string[]>();

export function registerCorrection(envelope: ConstitutionalEnvelope): void {
  const ref = envelope.replayContext.correctionOfEnvelopeId;
  if (!ref) return;
  const chain = correctionChain.get(ref) ?? [];
  chain.push(envelope.identity.envelopeId);
  correctionChain.set(ref, chain);
}

export function getCorrectionChain(originalEnvelopeId: string): string[] {
  return correctionChain.get(originalEnvelopeId) ?? [];
}

export function isCorrection(envelope: ConstitutionalEnvelope): boolean {
  return !!envelope.replayContext.correctionOfEnvelopeId;
}

export function clearCorrectionChain(): void {
  correctionChain.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReplayLedgerEvent {
  envelopeId: string;
  traceId: string;
  source: string;
  replayGeneration: number;
  backfillBatchId?: string;
  isCorrection: boolean;
  isDuplicate: boolean;
  ingestedAt: string;
  dedupFingerprint: string;
}

const replayLedger: ReplayLedgerEvent[] = [];

export function recordReplayEvent(envelope: ConstitutionalEnvelope, dupFlag: boolean): void {
  replayLedger.push({
    envelopeId: envelope.identity.envelopeId,
    traceId: envelope.identity.traceId,
    source: envelope.identity.source,
    replayGeneration: envelope.replayContext.replayGeneration,
    backfillBatchId: envelope.replayContext.backfillBatchId,
    isCorrection: !!envelope.replayContext.correctionOfEnvelopeId,
    isDuplicate: dupFlag,
    ingestedAt: envelope.timing.ingestedTimestamp,
    dedupFingerprint: envelope.replayContext.dedupFingerprint,
  });
}

export function getReplayLedger(): readonly ReplayLedgerEvent[] {
  return replayLedger;
}

export function getReplayLedgerSince(iso: string): ReplayLedgerEvent[] {
  return replayLedger.filter(e => e.ingestedAt >= iso);
}

export function clearReplayLedger(): void {
  replayLedger.length = 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKFILL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const backfillBatches = new Map<string, { count: number; startedAt: string; envelopeIds: string[] }>();

export function registerBackfillEnvelope(envelope: ConstitutionalEnvelope): void {
  const batchId = envelope.replayContext.backfillBatchId;
  if (!batchId) return;
  const batch = backfillBatches.get(batchId) ?? { count: 0, startedAt: envelope.timing.ingestedTimestamp, envelopeIds: [] };
  batch.count++;
  batch.envelopeIds.push(envelope.identity.envelopeId);
  backfillBatches.set(batchId, batch);
}

export function getBackfillBatch(batchId: string) {
  return backfillBatches.get(batchId) ?? null;
}

export function getAllBackfillBatches() {
  const result: Array<{ batchId: string; count: number; startedAt: string }> = [];
  for (const [batchId, batch] of backfillBatches) {
    result.push({ batchId, count: batch.count, startedAt: batch.startedAt });
  }
  return result;
}

export function clearBackfillRegistry(): void {
  backfillBatches.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINEAGE AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

export interface LineageAuditRecord {
  envelopeId: string;
  source: string;
  rawPayloadRef: string;
  rawPayloadHash: string;
  normalizationVersion: string;
  connectorName: string;
  connectorVersion: string;
  lineagePath: string[];
  lineageComplete: boolean;
  timingComplete: boolean;
}

export function buildLineageAudit(envelope: ConstitutionalEnvelope): LineageAuditRecord {
  return {
    envelopeId: envelope.identity.envelopeId,
    source: envelope.identity.source,
    rawPayloadRef: envelope.payloadContext.rawPayloadRef,
    rawPayloadHash: envelope.payloadContext.rawPayloadHash,
    normalizationVersion: envelope.payloadContext.normalizationVersion,
    connectorName: envelope.lineageContext.upstreamConnectorName,
    connectorVersion: envelope.lineageContext.upstreamConnectorVersion,
    lineagePath: envelope.lineageContext.lineagePath,
    lineageComplete: envelope.validationContext.lineageComplete,
    timingComplete: envelope.timing.timingCompleteness === 'full',
  };
}

export function verifyLineageIntegrity(envelope: ConstitutionalEnvelope): { intact: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!envelope.payloadContext.rawPayloadRef) issues.push('missing rawPayloadRef');
  if (!envelope.payloadContext.rawPayloadHash) issues.push('missing rawPayloadHash');
  if (!envelope.payloadContext.normalizationVersion) issues.push('missing normalizationVersion');
  if (!envelope.lineageContext.upstreamConnectorName) issues.push('missing connectorName');
  if (!envelope.lineageContext.upstreamConnectorVersion) issues.push('missing connectorVersion');
  if (envelope.lineageContext.lineagePath.length === 0) issues.push('empty lineagePath');
  if (envelope.payloadContext.normalizedPayloadFragment !== undefined &&
      envelope.payloadContext.normalizedPayloadFragment !== null &&
      !envelope.payloadContext.rawPayloadRef) {
    issues.push('normalized fragment without raw reference — anti-fake violation');
  }

  return { intact: issues.length === 0, issues };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INGEST PIPELINE — Full lifecycle
// ═══════════════════════════════════════════════════════════════════════════════

export interface IngestResult {
  accepted: boolean;
  duplicate: boolean;
  correction: boolean;
  backfill: boolean;
  envelopeId: string;
  reasonCodes: string[];
}

export function processEnvelopeIngress(envelope: ConstitutionalEnvelope): IngestResult {
  const corr = isCorrection(envelope);
  const bf = !!envelope.replayContext.backfillBatchId;
  const dup = !corr && isDuplicate(envelope);

  const reasons: string[] = [];

  if (dup) {
    reasons.push('duplicate_detected');
    recordReplayEvent(envelope, true);
    return {
      accepted: false,
      duplicate: true,
      correction: corr,
      backfill: bf,
      envelopeId: envelope.identity.envelopeId,
      reasonCodes: reasons,
    };
  }

  registerDedup(envelope);
  if (corr) registerCorrection(envelope);
  if (bf) registerBackfillEnvelope(envelope);
  recordReplayEvent(envelope, false);

  return {
    accepted: true,
    duplicate: false,
    correction: corr,
    backfill: bf,
    envelopeId: envelope.identity.envelopeId,
    reasonCodes: reasons,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET — For tests
// ═══════════════════════════════════════════════════════════════════════════════

export function resetAllLineageState(): void {
  clearDedupStore();
  clearCorrectionChain();
  clearReplayLedger();
  clearBackfillRegistry();
}
