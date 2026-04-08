/**
 * L2.5 — Raw Payload Archive
 *
 * Immutable, write-once, content-addressable archive of source-origin
 * evidence. No update-in-place. No silent replacement. No overwrite
 * for corrections. Corrections create new raw artifacts and link
 * to superseded lineage.
 */

import { createHash } from 'crypto';
import type {
  RawPayloadRecord, PayloadFormat,
  ArchiveWriteResult, ArchiveIntegrityResult,
} from './replay-types';

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIVE STORE
// ═══════════════════════════════════════════════════════════════════════════════

const archive = new Map<string, RawPayloadRecord>();

// ═══════════════════════════════════════════════════════════════════════════════
// WRITE INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface RawPayloadInput {
  blob: unknown;
  payloadFormat: PayloadFormat;
  source: string;
  providerId: string;
  connectorInstanceId: string;
  routeId: string;
  routeMode: string;
  observedTimestamp?: string;
  publishedTimestamp?: string;
  receivedTimestamp: string;
  ingestedTimestamp: string;
  schemaVersion?: string;
  replayGeneration: number;
  backfillBatchId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASHING
// ═══════════════════════════════════════════════════════════════════════════════

function computeContentHash(blob: unknown): string {
  const canonical = typeof blob === 'string' ? blob : JSON.stringify(blob);
  return createHash('sha256').update(canonical).digest('hex');
}

function computeContentAddress(hash: string, source: string, timestamp: string): string {
  return createHash('sha256')
    .update(`${hash}::${source}::${timestamp}`)
    .digest('hex').slice(0, 32);
}

function computeBlobSize(blob: unknown): number {
  const str = typeof blob === 'string' ? blob : JSON.stringify(blob);
  return Buffer.byteLength(str, 'utf8');
}

// ═══════════════════════════════════════════════════════════════════════════════
// WRITE — immutable, write-once
// ═══════════════════════════════════════════════════════════════════════════════

export function archiveRawPayload(input: RawPayloadInput): ArchiveWriteResult {
  const rawPayloadHash = computeContentHash(input.blob);
  const contentAddress = computeContentAddress(rawPayloadHash, input.source, input.receivedTimestamp);
  const rawPayloadRef = `raw://${contentAddress}`;
  const blobSizeBytes = computeBlobSize(input.blob);

  if (archive.has(rawPayloadRef)) {
    const existing = archive.get(rawPayloadRef)!;
    if (existing.rawPayloadHash !== rawPayloadHash) {
      throw new Error(`ARCHIVE_INTEGRITY_VIOLATION: content-address collision at ${rawPayloadRef}`);
    }
    return {
      rawPayloadRef,
      contentAddress,
      rawPayloadHash,
      bytesStored: 0,
    };
  }

  const record: RawPayloadRecord = {
    rawPayloadRef,
    contentAddress,
    rawPayloadHash,
    payloadFormat: input.payloadFormat,
    blobSizeBytes,
    blob: input.blob,
    source: input.source,
    providerId: input.providerId,
    connectorInstanceId: input.connectorInstanceId,
    routeId: input.routeId,
    routeMode: input.routeMode,
    observedTimestamp: input.observedTimestamp,
    publishedTimestamp: input.publishedTimestamp,
    receivedTimestamp: input.receivedTimestamp,
    ingestedTimestamp: input.ingestedTimestamp,
    schemaVersion: input.schemaVersion,
    replayGeneration: input.replayGeneration,
    backfillBatchId: input.backfillBatchId,
    createdAt: new Date().toISOString(),
  };

  archive.set(rawPayloadRef, record);

  return { rawPayloadRef, contentAddress, rawPayloadHash, bytesStored: blobSizeBytes };
}

// ═══════════════════════════════════════════════════════════════════════════════
// READ
// ═══════════════════════════════════════════════════════════════════════════════

export function readRawPayload(rawPayloadRef: string): RawPayloadRecord | undefined {
  return archive.get(rawPayloadRef);
}

export function rawPayloadExists(rawPayloadRef: string): boolean {
  return archive.has(rawPayloadRef);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFY INTEGRITY — re-hash blob and compare
// ═══════════════════════════════════════════════════════════════════════════════

export function verifyArchiveIntegrity(rawPayloadRef: string): ArchiveIntegrityResult {
  const record = archive.get(rawPayloadRef);
  if (!record) {
    return {
      rawPayloadRef,
      valid: false,
      expectedHash: '',
      actualHash: '',
      issues: ['RECORD_NOT_FOUND'],
    };
  }

  const actualHash = computeContentHash(record.blob);
  const issues: string[] = [];

  if (actualHash !== record.rawPayloadHash) {
    issues.push('HASH_MISMATCH');
  }
  if (!record.source) issues.push('MISSING_SOURCE');
  if (!record.providerId) issues.push('MISSING_PROVIDER');
  if (!record.routeId) issues.push('MISSING_ROUTE');
  if (!record.receivedTimestamp) issues.push('MISSING_RECEIVED_TIMESTAMP');

  return {
    rawPayloadRef,
    valid: issues.length === 0,
    expectedHash: record.rawPayloadHash,
    actualHash,
    issues,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export function getArchiveBySource(source: string): RawPayloadRecord[] {
  return Array.from(archive.values()).filter(r => r.source === source);
}

export function getArchiveByBatch(batchId: string): RawPayloadRecord[] {
  return Array.from(archive.values()).filter(r => r.backfillBatchId === batchId);
}

export function getArchiveByGeneration(generation: number): RawPayloadRecord[] {
  return Array.from(archive.values()).filter(r => r.replayGeneration === generation);
}

export function getArchiveSize(): number {
  return archive.size;
}

export function getAllArchiveRefs(): string[] {
  return Array.from(archive.keys());
}

export function resetArchive(): void {
  archive.clear();
}
