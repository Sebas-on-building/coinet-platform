/**
 * L2.4 — Event Fingerprint
 *
 * Field-family-specific semantic identity. Not a raw hash.
 * Semantic identity must dominate formatting identity.
 *
 * Payload hash alone is not a truth identity.
 */

import { createHash } from 'crypto';

export const L24_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FINGERPRINT FAMILIES
// ═══════════════════════════════════════════════════════════════════════════════

export type FingerprintFamily = 'SNAPSHOT' | 'EVENT' | 'LABEL' | 'AGGREGATE';

// ═══════════════════════════════════════════════════════════════════════════════
// TIME BUCKETING
// ═══════════════════════════════════════════════════════════════════════════════

export function timeBucket(isoTimestamp: string | undefined, bucketMs: number): string {
  if (!isoTimestamp) return 'NO_TIME';
  const t = new Date(isoTimestamp).getTime();
  const bucket = Math.floor(t / bucketMs) * bucketMs;
  return String(bucket);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC HASH — ignores formatting, order, transport metadata
// ═══════════════════════════════════════════════════════════════════════════════

export function semanticHash(payload: unknown): string {
  if (payload == null) return 'NULL';
  const normalized = canonicalize(payload);
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

function canonicalize(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return normalizeNumber(val);
  if (typeof val === 'string') return JSON.stringify(val);
  if (Array.isArray(val)) {
    return '[' + val.map(canonicalize).join(',') + ']';
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val as Record<string, unknown>).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize((val as any)[k])).join(',') + '}';
  }
  return String(val);
}

function normalizeNumber(n: number): string {
  if (Number.isNaN(n)) return 'NaN';
  if (!Number.isFinite(n)) return n > 0 ? 'Inf' : '-Inf';
  return n.toPrecision(12);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINGERPRINT INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface FingerprintInput {
  source: string;
  fieldFamily: string;
  entityId?: string;
  entityScope?: string;
  canonicalCandidateIds?: string[];
  observedTimestamp?: string;
  routeMode?: string;
  observationKind?: string;
  semanticPayload?: unknown;
  sequenceKey?: string;
  eventId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINGERPRINT OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface FingerprintResult {
  dedupFingerprint: string;
  fingerprintFamily: FingerprintFamily;
  timeBucketValue: string;
  semanticPayloadHash: string;
  components: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAMILY DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export function detectFingerprintFamily(fieldFamily: string, observationKind?: string): FingerprintFamily {
  if (observationKind === 'RAW_EVENT') return 'EVENT';
  if (observationKind === 'ROLLING_AGGREGATE' || observationKind === 'WINDOWED_METRIC') return 'AGGREGATE';

  const lower = fieldFamily.toLowerCase();
  if (lower.includes('liquidation') || lower.includes('transfer') || lower.includes('event') ||
      lower.includes('creation') || lower.includes('orderflow')) {
    return 'EVENT';
  }
  if (lower.includes('label') || lower.includes('flag') || lower.includes('security') ||
      lower.includes('entity')) {
    return 'LABEL';
  }
  if (lower.includes('aggregate') || lower.includes('rolling')) {
    return 'AGGREGATE';
  }
  return 'SNAPSHOT';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIME BUCKET MS PER FAMILY
// ═══════════════════════════════════════════════════════════════════════════════

const BUCKET_MS: Record<FingerprintFamily, number> = {
  SNAPSHOT: 60_000,
  EVENT: 1_000,
  LABEL: 3_600_000,
  AGGREGATE: 300_000,
};

export function getBucketMs(family: FingerprintFamily, override?: number): number {
  return override ?? BUCKET_MS[family];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE: COMPUTE FINGERPRINT
// ═══════════════════════════════════════════════════════════════════════════════

export function computeFingerprint(input: FingerprintInput, bucketMsOverride?: number): FingerprintResult {
  const family = detectFingerprintFamily(input.fieldFamily, input.observationKind);
  const bucketMs = getBucketMs(family, bucketMsOverride);
  const bucket = timeBucket(input.observedTimestamp, bucketMs);
  const payloadHash = semanticHash(input.semanticPayload);

  const components: string[] = [];

  switch (family) {
    case 'SNAPSHOT':
      components.push(
        input.source,
        input.fieldFamily,
        input.entityId ?? '',
        input.entityScope ?? '',
        (input.canonicalCandidateIds ?? []).sort().join('|'),
        bucket,
        payloadHash,
      );
      break;

    case 'EVENT':
      components.push(
        input.source,
        input.fieldFamily,
        input.entityId ?? '',
        input.sequenceKey ?? '',
        input.eventId ?? '',
        input.observedTimestamp ?? '',
        payloadHash,
      );
      break;

    case 'LABEL':
      components.push(
        input.source,
        input.fieldFamily,
        input.entityId ?? '',
        input.entityScope ?? '',
        bucket,
        payloadHash,
      );
      break;

    case 'AGGREGATE':
      components.push(
        input.source,
        input.fieldFamily,
        input.entityId ?? '',
        (input.canonicalCandidateIds ?? []).sort().join('|'),
        bucket,
        payloadHash,
      );
      break;
  }

  const raw = components.join('::');
  const dedupFingerprint = createHash('sha256').update(raw).digest('hex').slice(0, 40);

  return {
    dedupFingerprint,
    fingerprintFamily: family,
    timeBucketValue: bucket,
    semanticPayloadHash: payloadHash,
    components,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDEMPOTENCY KEY GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface IdempotencyKeyInput {
  providerId: string;
  routeId: string;
  routeMode: string;
  connectorInstanceId: string;
  requestId?: string;
  backfillBatchId?: string;
  replayGeneration: number;
  operationTimestamp: string;
}

export function computeIdempotencyKey(input: IdempotencyKeyInput): string {
  const parts = [
    input.providerId,
    input.routeId,
    input.routeMode,
    input.connectorInstanceId,
    input.requestId ?? '',
    input.backfillBatchId ?? '',
    String(input.replayGeneration),
    timeBucket(input.operationTimestamp, 10_000),
  ];
  return createHash('sha256').update(parts.join('::')).digest('hex').slice(0, 40);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCE KEY GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface SequenceKeyInput {
  streamId: string;
  fieldFamily: string;
  entityId?: string;
  sequencePosition?: number | string;
}

export function computeSequenceKey(input: SequenceKeyInput): string {
  const parts = [
    input.streamId,
    input.fieldFamily,
    input.entityId ?? '',
    String(input.sequencePosition ?? ''),
  ];
  return parts.join('::');
}
