/**
 * L5.5 Write Coordination — Authority Write Service
 *
 * §5.5.5.4 — AuthorityWriteService
 * §5.5.12 — Store-specific execution branches
 */

import { randomUUID } from 'crypto';
import type { ResolvedStorageEnvelope } from '../envelope';

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORITY WRITE RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuthorityWriteResult {
  readonly success: boolean;
  readonly authority_row_id: string | null;
  readonly authority_store: string;
  readonly natural_key: string;
  readonly idempotent_match: boolean;
  readonly failure_reason: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORITY STORE (in-memory; production uses store-specific implementations)
// ═══════════════════════════════════════════════════════════════════════════════

interface AuthorityRecord {
  readonly authority_row_id: string;
  readonly envelope_id: string;
  readonly manifest_id: string;
  readonly natural_key: string;
  readonly authority_store: string;
  readonly write_class: string;
  readonly payload_hash_sha256: string;
  readonly trace_id: string;
  readonly written_at: string;
}

const authorityStore = new Map<string, AuthorityRecord>();

export function resetAuthorityStore(): void {
  authorityStore.clear();
}

export function getAuthorityRecord(naturalKey: string): AuthorityRecord | undefined {
  return authorityStore.get(naturalKey);
}

export function getAllAuthorityRecords(): AuthorityRecord[] {
  return Array.from(authorityStore.values());
}

// ═══════════════════════════════════════════════════════════════════════════════
// NATURAL KEY DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

export function deriveAuthorityNaturalKey(env: ResolvedStorageEnvelope): string {
  const parts = [
    env.write_class,
    env.authority_scope_type ?? env.canonical_scope_type ?? 'GLOBAL',
    env.authority_scope_id ?? env.canonical_scope_id ?? 'DEFAULT',
    env.canonical_subject_id ?? env.source_event_id ?? env.envelope_id,
  ];
  return parts.join(':');
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORITY COMMIT
// ═══════════════════════════════════════════════════════════════════════════════

export function executeAuthorityCommit(
  env: ResolvedStorageEnvelope,
  manifestId: string,
): AuthorityWriteResult {
  const naturalKey = deriveAuthorityNaturalKey(env);
  const authorityStoreTarget = env.routing.primary_authority_store;

  const existing = authorityStore.get(naturalKey);
  if (existing && existing.payload_hash_sha256 === env.payload_hash_sha256) {
    return {
      success: true,
      authority_row_id: existing.authority_row_id,
      authority_store: authorityStoreTarget,
      natural_key: naturalKey,
      idempotent_match: true,
      failure_reason: null,
    };
  }

  const rowId = randomUUID();
  const record: AuthorityRecord = {
    authority_row_id: rowId,
    envelope_id: env.envelope_id,
    manifest_id: manifestId,
    natural_key: naturalKey,
    authority_store: authorityStoreTarget,
    write_class: env.write_class,
    payload_hash_sha256: env.payload_hash_sha256,
    trace_id: env.trace_id,
    written_at: new Date().toISOString(),
  };

  authorityStore.set(naturalKey, record);

  return {
    success: true,
    authority_row_id: rowId,
    authority_store: authorityStoreTarget,
    natural_key: naturalKey,
    idempotent_match: false,
    failure_reason: null,
  };
}
