/**
 * L2.4 — Idempotency Engine
 *
 * Protects against running the same connector operation twice.
 * Idempotency protects mutation. Deduplication protects meaning.
 * They are related, but not the same problem.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DECISIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type IdempotencyDecision =
  | 'ALLOW_MUTATION'
  | 'BLOCK_DUPLICATE_MUTATION'
  | 'ALLOW_REPLAY_SCOPED_MUTATION'
  | 'ALLOW_CORRECTION_MUTATION';

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

export interface IdempotencyEntry {
  idempotencyKey: string;
  firstSeenEnvelopeId: string;
  lastSeenEnvelopeId: string;
  firstApplicationAt: string;
  lastSeenAt: string;
  duplicateCount: number;
  finalMutationStatus: 'APPLIED' | 'BLOCKED' | 'REPLAY_SCOPED' | 'CORRECTION';
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const registry = new Map<string, IdempotencyEntry>();

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATION INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface IdempotencyCheckInput {
  idempotencyKey: string;
  envelopeId: string;
  isCorrection: boolean;
  isReplay: boolean;
  replayGeneration: number;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface IdempotencyResult {
  decision: IdempotencyDecision;
  priorEnvelopeId?: string;
  duplicateCount: number;
  reasonCodes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export function checkIdempotency(input: IdempotencyCheckInput): IdempotencyResult {
  const existing = registry.get(input.idempotencyKey);

  if (!existing) {
    registry.set(input.idempotencyKey, {
      idempotencyKey: input.idempotencyKey,
      firstSeenEnvelopeId: input.envelopeId,
      lastSeenEnvelopeId: input.envelopeId,
      firstApplicationAt: input.timestamp,
      lastSeenAt: input.timestamp,
      duplicateCount: 0,
      finalMutationStatus: input.isCorrection ? 'CORRECTION'
        : input.isReplay ? 'REPLAY_SCOPED'
        : 'APPLIED',
    });

    const decision: IdempotencyDecision = input.isCorrection
      ? 'ALLOW_CORRECTION_MUTATION'
      : input.isReplay
        ? 'ALLOW_REPLAY_SCOPED_MUTATION'
        : 'ALLOW_MUTATION';

    return { decision, duplicateCount: 0, reasonCodes: ['FIRST_SEEN'] };
  }

  // Already seen this key
  existing.lastSeenEnvelopeId = input.envelopeId;
  existing.lastSeenAt = input.timestamp;
  existing.duplicateCount++;

  if (input.isCorrection) {
    existing.finalMutationStatus = 'CORRECTION';
    return {
      decision: 'ALLOW_CORRECTION_MUTATION',
      priorEnvelopeId: existing.firstSeenEnvelopeId,
      duplicateCount: existing.duplicateCount,
      reasonCodes: ['IDEMPOTENT_RETRY_BUT_CORRECTION_ALLOWED'],
    };
  }

  if (input.isReplay && input.replayGeneration > 0) {
    return {
      decision: 'ALLOW_REPLAY_SCOPED_MUTATION',
      priorEnvelopeId: existing.firstSeenEnvelopeId,
      duplicateCount: existing.duplicateCount,
      reasonCodes: ['REPLAY_GENERATION_ADVANCED'],
    };
  }

  existing.finalMutationStatus = 'BLOCKED';
  return {
    decision: 'BLOCK_DUPLICATE_MUTATION',
    priorEnvelopeId: existing.firstSeenEnvelopeId,
    duplicateCount: existing.duplicateCount,
    reasonCodes: ['IDEMPOTENT_RETRY_BLOCKED'],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export function getIdempotencyEntry(key: string): IdempotencyEntry | undefined {
  return registry.get(key);
}

export function getIdempotencyRegistrySize(): number {
  return registry.size;
}

export function resetIdempotencyRegistry(): void {
  registry.clear();
}
