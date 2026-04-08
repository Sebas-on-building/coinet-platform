/**
 * L2.4 — Dedup Engine
 *
 * Semantic duplicate detection. Not just hash comparison.
 * Dedup protects meaning — it ensures one semantic observation
 * produces at most one logical live ingress effect.
 */

import { computeFingerprint, type FingerprintInput, type FingerprintResult } from './event-fingerprint';
import { findDedupPolicy, type DedupPolicy } from './dedup-policy-map';

// ═══════════════════════════════════════════════════════════════════════════════
// DECISIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type DedupDecision =
  | 'NEW_OBSERVATION'
  | 'SEMANTIC_DUPLICATE'
  | 'POSSIBLE_DUPLICATE_REQUIRES_CORRECTION_CHECK'
  | 'REPLAY_DUPLICATE'
  | 'DISTINCT_BUT_SIMILAR';

// ═══════════════════════════════════════════════════════════════════════════════
// DEDUP STORE — semantic fingerprint registry
// ═══════════════════════════════════════════════════════════════════════════════

interface DedupEntry {
  dedupFingerprint: string;
  envelopeId: string;
  semanticPayloadHash: string;
  timeBucket: string;
  fieldFamily: string;
  observedTimestamp?: string;
  replayGeneration: number;
  routeMode: string;
  ingestedAt: string;
}

const dedupStore = new Map<string, DedupEntry>();

// ═══════════════════════════════════════════════════════════════════════════════
// DEDUP CHECK INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DedupCheckInput {
  envelopeId: string;
  fingerprintInput: FingerprintInput;
  routeMode: string;
  replayGeneration: number;
  isBackfill: boolean;
  isCorrection: boolean;
  correctionOfEnvelopeId?: string;
  observedTimestamp?: string;
  ingestedTimestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEDUP RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DedupResult {
  decision: DedupDecision;
  fingerprint: FingerprintResult;
  priorEnvelopeId?: string;
  reasonCodes: string[];
  policy: DedupPolicy;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export function checkDedup(input: DedupCheckInput): DedupResult {
  const policy = findDedupPolicy(input.fingerprintInput.fieldFamily, input.routeMode);
  const fp = computeFingerprint(input.fingerprintInput, policy.timeBucketMs);
  const existing = dedupStore.get(fp.dedupFingerprint);

  // No prior match → new observation
  if (!existing) {
    return {
      decision: 'NEW_OBSERVATION',
      fingerprint: fp,
      reasonCodes: ['NO_PRIOR_MATCH'],
      policy,
    };
  }

  const reasons: string[] = [];

  // Correction → always needs correction-path check, not dedup absorption
  if (input.isCorrection) {
    reasons.push('CORRECTION_FLAG_SET');
    return {
      decision: 'POSSIBLE_DUPLICATE_REQUIRES_CORRECTION_CHECK',
      fingerprint: fp,
      priorEnvelopeId: existing.envelopeId,
      reasonCodes: reasons,
      policy,
    };
  }

  // Replay isolation: different replay generation
  if (policy.replayIsolation && input.isBackfill) {
    if (existing.replayGeneration !== input.replayGeneration) {
      reasons.push('REPLAY_GENERATION_DIFFERS');
      return {
        decision: 'REPLAY_DUPLICATE',
        fingerprint: fp,
        priorEnvelopeId: existing.envelopeId,
        reasonCodes: reasons,
        policy,
      };
    }
  }

  // Same fingerprint, same generation → check window
  const existingTime = new Date(existing.ingestedAt).getTime();
  const incomingTime = new Date(input.ingestedTimestamp).getTime();
  const gap = Math.abs(incomingTime - existingTime);

  if (gap <= policy.dedupWindowMs) {
    // Same semantic payload hash?
    if (existing.semanticPayloadHash === fp.semanticPayloadHash) {
      reasons.push('EXACT_SEMANTIC_MATCH_WITHIN_WINDOW');
      return {
        decision: 'SEMANTIC_DUPLICATE',
        fingerprint: fp,
        priorEnvelopeId: existing.envelopeId,
        reasonCodes: reasons,
        policy,
      };
    }

    // Same fingerprint but different semantic payload — distinct but similar
    reasons.push('SAME_FINGERPRINT_DIFFERENT_PAYLOAD');
    return {
      decision: 'DISTINCT_BUT_SIMILAR',
      fingerprint: fp,
      priorEnvelopeId: existing.envelopeId,
      reasonCodes: reasons,
      policy,
    };
  }

  // Outside dedup window → might be same value at different time
  if (policy.allowSameValueDistinctTime) {
    reasons.push('OUTSIDE_DEDUP_WINDOW_ALLOWED_DISTINCT');
    return {
      decision: 'NEW_OBSERVATION',
      fingerprint: fp,
      priorEnvelopeId: existing.envelopeId,
      reasonCodes: reasons,
      policy,
    };
  }

  // Labels / flags: same value at different time still duplicate if not allowed
  reasons.push('SAME_VALUE_DIFFERENT_TIME_NOT_ALLOWED');
  return {
    decision: 'SEMANTIC_DUPLICATE',
    fingerprint: fp,
    priorEnvelopeId: existing.envelopeId,
    reasonCodes: reasons,
    policy,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

export function registerDedupEntry(input: DedupCheckInput, fp: FingerprintResult): void {
  dedupStore.set(fp.dedupFingerprint, {
    dedupFingerprint: fp.dedupFingerprint,
    envelopeId: input.envelopeId,
    semanticPayloadHash: fp.semanticPayloadHash,
    timeBucket: fp.timeBucketValue,
    fieldFamily: input.fingerprintInput.fieldFamily,
    observedTimestamp: input.observedTimestamp,
    replayGeneration: input.replayGeneration,
    routeMode: input.routeMode,
    ingestedAt: input.ingestedTimestamp,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY & RESET
// ═══════════════════════════════════════════════════════════════════════════════

export function getDedupStoreSize(): number {
  return dedupStore.size;
}

export function resetDedupEngine(): void {
  dedupStore.clear();
}
