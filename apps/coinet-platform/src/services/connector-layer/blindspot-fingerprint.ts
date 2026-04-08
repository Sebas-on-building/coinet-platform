/**
 * L2.7 — Blind-Spot Fingerprint
 *
 * Identical blind spots triggered by the same request/route/field/cause
 * should collapse into one logical blind-spot record, while distinct
 * blind spots must remain distinct. Blind spots are evidence artifacts
 * — they need identity discipline too.
 */

import { createHash } from 'crypto';
import type { BlindSpotType, BlindSpotSeverity } from '../connector-layer/trace-graph';
import type { BlindSpotCause, BlindSpotScope } from './fallback-semantics';

// ═══════════════════════════════════════════════════════════════════════════════
// FINGERPRINT
// ═══════════════════════════════════════════════════════════════════════════════

export interface BlindSpotFingerprintInput {
  requestId: string;
  traceId: string;
  type: BlindSpotType;
  cause: BlindSpotCause;
  scope: BlindSpotScope;
  sourceClass?: string;
  fieldFamily?: string;
  relatedRouteId?: string;
  relatedEnvelopeId?: string;
  severity: BlindSpotSeverity;
}

export interface BlindSpotFingerprint {
  fingerprint: string;
  stableKeyParts: string[];
}

export function computeBlindSpotFingerprint(input: BlindSpotFingerprintInput): BlindSpotFingerprint {
  const keyParts: string[] = [
    input.requestId,
    input.type,
    input.cause,
    input.scope,
    input.sourceClass ?? '*',
    input.fieldFamily ?? '*',
    input.relatedRouteId ?? '*',
  ];

  const fingerprint = createHash('sha256')
    .update(keyParts.join('::'))
    .digest('hex').slice(0, 24);

  return { fingerprint: `bsfp-${fingerprint}`, stableKeyParts: keyParts };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEDUP REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const seenFingerprints = new Map<string, { count: number; firstBlindSpotId: string }>();

export interface DedupResult {
  isDuplicate: boolean;
  fingerprint: string;
  firstBlindSpotId?: string;
  occurrenceCount: number;
}

export function dedupBlindSpot(
  blindSpotId: string,
  fp: BlindSpotFingerprint,
): DedupResult {
  const existing = seenFingerprints.get(fp.fingerprint);
  if (existing) {
    existing.count++;
    return {
      isDuplicate: true,
      fingerprint: fp.fingerprint,
      firstBlindSpotId: existing.firstBlindSpotId,
      occurrenceCount: existing.count,
    };
  }

  seenFingerprints.set(fp.fingerprint, { count: 1, firstBlindSpotId: blindSpotId });
  return {
    isDuplicate: false,
    fingerprint: fp.fingerprint,
    occurrenceCount: 1,
  };
}

export function getFingerprintCount(): number {
  return seenFingerprints.size;
}

export function resetFingerprintRegistry(): void {
  seenFingerprints.clear();
}
