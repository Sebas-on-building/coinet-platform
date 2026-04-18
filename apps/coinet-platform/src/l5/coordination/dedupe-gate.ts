/**
 * L5.5 Write Coordination — Dedupe Gate
 *
 * §5.5.5.11 — DedupeGate
 * §5.5.10 — Idempotency law
 */

import { classifyDuplicate, type DuplicateVerdict } from '../envelope';
import { L5FailureClass } from './coordination-state';

// ═══════════════════════════════════════════════════════════════════════════════
// DEDUPE RECEIPT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DedupeReceipt {
  readonly dedupe_key: string;
  readonly payload_hash_sha256: string;
  readonly manifest_id: string;
  readonly finalized: boolean;
  readonly received_at: string;
  readonly producer_service: string;
  readonly write_class: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DedupeGateResult {
  readonly verdict: DuplicateVerdict;
  readonly existing_manifest_id: string | null;
  readonly existing_finalized: boolean;
  readonly detection_reason: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEDUPE STORE (in-memory for constitutional code; production uses Postgres)
// ═══════════════════════════════════════════════════════════════════════════════

const dedupeStore = new Map<string, DedupeReceipt>();

export function resetDedupeStore(): void {
  dedupeStore.clear();
}

export function recordDedupeReceipt(receipt: DedupeReceipt): void {
  dedupeStore.set(receipt.dedupe_key, receipt);
}

export function getDedupeReceipt(dedupeKey: string): DedupeReceipt | undefined {
  return dedupeStore.get(dedupeKey);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export function checkDedupeGate(
  dedupeKey: string,
  payloadHash: string,
): DedupeGateResult {
  const existing = dedupeStore.get(dedupeKey);
  if (!existing) {
    return { verdict: 'NOT_DUPLICATE', existing_manifest_id: null, existing_finalized: false, detection_reason: null };
  }

  const verdict = classifyDuplicate(existing.dedupe_key, existing.payload_hash_sha256, dedupeKey, payloadHash);

  return {
    verdict,
    existing_manifest_id: existing.manifest_id,
    existing_finalized: existing.finalized,
    detection_reason: verdict === 'IDEMPOTENT_ACCEPT'
      ? `Exact duplicate of manifest ${existing.manifest_id}${existing.finalized ? ' (already finalized)' : ' (in progress)'}`
      : verdict === 'DUPLICATE_CONFLICT'
        ? `Payload hash mismatch for same dedupe key — conflicting write for manifest ${existing.manifest_id}`
        : null,
  };
}

export function dedupeVerdictToFailureClass(verdict: DuplicateVerdict): L5FailureClass | null {
  switch (verdict) {
    case 'IDEMPOTENT_ACCEPT': return L5FailureClass.DUPLICATE_IDEMPOTENT;
    case 'DUPLICATE_CONFLICT': return L5FailureClass.DUPLICATE_CONFLICT;
    default: return null;
  }
}
