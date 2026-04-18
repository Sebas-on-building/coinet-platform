/**
 * L5.4 Universal Write Contract — Dedupe Key Builder
 *
 * §5.4.11 — Dedupe Law
 *
 * Every envelope must have a deterministic dedupe identity
 * derived from class-specific canonical inputs.
 */

import { createHash } from 'crypto';
import type { StorageEnvelopeDraft } from './storage-envelope.types';

export interface DedupeKeyComponents {
  readonly producer_service: string;
  readonly write_class: string;
  readonly source_provider: string | null;
  readonly source_event_id: string | null;
  readonly canonical_scope_type: string | null;
  readonly canonical_scope_id: string | null;
  readonly metric_contract_id: string | null;
  readonly source_observed_at: string;
  readonly schema_version: string;
  readonly derivation_kind: string;
}

export function extractDedupeComponents(draft: StorageEnvelopeDraft): DedupeKeyComponents {
  return {
    producer_service: draft.producer_service,
    write_class: draft.write_class,
    source_provider: draft.source_provider,
    source_event_id: draft.source_event_id,
    canonical_scope_type: draft.canonical_scope_type,
    canonical_scope_id: draft.canonical_scope_id,
    metric_contract_id: draft.metric_contract_id,
    source_observed_at: draft.source_observed_at,
    schema_version: draft.schema_version,
    derivation_kind: draft.derivation_kind,
  };
}

export function computeDedupeKey(components: DedupeKeyComponents): string {
  const parts = [
    components.producer_service,
    components.write_class,
    components.source_provider ?? '',
    components.source_event_id ?? '',
    components.canonical_scope_type ?? '',
    components.canonical_scope_id ?? '',
    components.metric_contract_id ?? '',
    components.source_observed_at,
    components.schema_version,
    components.derivation_kind,
  ];
  const joined = parts.join('|');
  return createHash('sha256').update(joined, 'utf8').digest('hex');
}

export function computeDedupeKeyFromDraft(draft: StorageEnvelopeDraft): string {
  return computeDedupeKey(extractDedupeComponents(draft));
}

export type DuplicateVerdict = 'IDEMPOTENT_ACCEPT' | 'DUPLICATE_CONFLICT' | 'NOT_DUPLICATE';

export function classifyDuplicate(
  existingDedupeKey: string, existingPayloadHash: string,
  newDedupeKey: string, newPayloadHash: string,
): DuplicateVerdict {
  if (existingDedupeKey !== newDedupeKey) return 'NOT_DUPLICATE';
  if (existingPayloadHash === newPayloadHash) return 'IDEMPOTENT_ACCEPT';
  return 'DUPLICATE_CONFLICT';
}
