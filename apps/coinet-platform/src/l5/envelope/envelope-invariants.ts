/**
 * L5.4 Universal Write Contract — Envelope Invariants
 *
 * §5.4.18 — INV-5.4-A through INV-5.4-N
 */

import type { StorageEnvelopeDraft, ResolvedStorageEnvelope } from './storage-envelope.types';
import { isDerived } from './derivation-kind';
import { isLegalLifecycleTransition, isMonotonicAdvancement, L5EnvelopeLifecycleState } from './envelope-lifecycle';

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT IDS
// ═══════════════════════════════════════════════════════════════════════════════

export type L5EnvelopeInvariantId =
  | 'INV-5.4-A'  // no L5 write without envelope
  | 'INV-5.4-B'  // stable envelope_id and trace_id
  | 'INV-5.4-C'  // deterministic payload_hash_sha256
  | 'INV-5.4-D'  // deterministic dedupe_key
  | 'INV-5.4-E'  // metric-backed writes have metric contract
  | 'INV-5.4-F'  // resolved-required writes block unresolved identity
  | 'INV-5.4-G'  // derived envelopes have parent lineage
  | 'INV-5.4-H'  // archive-required → proof before manifest
  | 'INV-5.4-I'  // typed projection does not contradict payload
  | 'INV-5.4-J'  // producer legality verified
  | 'INV-5.4-K'  // lifecycle transitions legal and monotonic
  | 'INV-5.4-L'  // replay-required envelopes preserve minimum lineage
  | 'INV-5.4-M'  // duplicate conflict quarantines, not overwrites
  | 'INV-5.4-N'; // resolved envelope aligns with L5.1/L5.2/L5.3

export const ALL_ENVELOPE_INVARIANT_IDS: readonly L5EnvelopeInvariantId[] = [
  'INV-5.4-A', 'INV-5.4-B', 'INV-5.4-C', 'INV-5.4-D', 'INV-5.4-E', 'INV-5.4-F', 'INV-5.4-G',
  'INV-5.4-H', 'INV-5.4-I', 'INV-5.4-J', 'INV-5.4-K', 'INV-5.4-L', 'INV-5.4-M', 'INV-5.4-N',
];

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnvelopeInvariantResult {
  readonly id: L5EnvelopeInvariantId;
  readonly passed: boolean;
  readonly reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnvelopeInvariantContext {
  readonly draft?: StorageEnvelopeDraft;
  readonly resolved?: ResolvedStorageEnvelope;
  readonly hasEnvelope?: boolean;
  readonly payloadHashMatches?: boolean;
  readonly dedupeKeyDeterministic?: boolean;
  readonly producerRegistered?: boolean;
  readonly lifecycleFrom?: L5EnvelopeLifecycleState;
  readonly lifecycleTo?: L5EnvelopeLifecycleState;
  readonly duplicateConflictHandled?: 'QUARANTINE' | 'OVERWRITE' | null;
  readonly projectionValid?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

type InvCheck = (ctx: EnvelopeInvariantContext) => EnvelopeInvariantResult;

const CHECKS: Record<L5EnvelopeInvariantId, InvCheck> = {
  'INV-5.4-A': (ctx) => {
    const ok = ctx.hasEnvelope ?? true;
    return { id: 'INV-5.4-A', passed: ok, reason: ok ? 'Write has envelope' : 'Write attempted without envelope' };
  },

  'INV-5.4-B': (ctx) => {
    const d = ctx.draft ?? ctx.resolved;
    if (!d) return { id: 'INV-5.4-B', passed: true, reason: 'No draft' };
    const ok = !!d.envelope_id && !!d.trace_id;
    return { id: 'INV-5.4-B', passed: ok, reason: ok ? 'Stable IDs present' : 'Missing envelope_id or trace_id' };
  },

  'INV-5.4-C': (ctx) => {
    const ok = ctx.payloadHashMatches ?? true;
    return { id: 'INV-5.4-C', passed: ok, reason: ok ? 'Payload hash matches' : 'Payload hash mismatch' };
  },

  'INV-5.4-D': (ctx) => {
    const ok = ctx.dedupeKeyDeterministic ?? true;
    return { id: 'INV-5.4-D', passed: ok, reason: ok ? 'Dedupe key deterministic' : 'Dedupe key not deterministic' };
  },

  'INV-5.4-E': (ctx) => {
    const d = ctx.draft ?? ctx.resolved;
    if (!d) return { id: 'INV-5.4-E', passed: true, reason: 'No draft' };
    if (d.write_class !== 'TIME_SERIES_FACT') return { id: 'INV-5.4-E', passed: true, reason: 'Not metric-backed' };
    const ok = !!d.metric_contract_id;
    return { id: 'INV-5.4-E', passed: ok, reason: ok ? 'Metric contract present' : 'Missing metric_contract_id for TIME_SERIES_FACT' };
  },

  'INV-5.4-F': (ctx) => {
    const d = ctx.draft ?? ctx.resolved;
    if (!d) return { id: 'INV-5.4-F', passed: true, reason: 'No draft' };
    if (d.write_class !== 'RELATIONAL_AUTHORITY' && d.write_class !== 'TIME_SERIES_FACT') {
      return { id: 'INV-5.4-F', passed: true, reason: 'Class does not require resolved identity' };
    }
    const ok = !!d.canonical_subject_id;
    return { id: 'INV-5.4-F', passed: ok, reason: ok ? 'Canonical subject resolved' : 'Unresolved identity for resolved-required class' };
  },

  'INV-5.4-G': (ctx) => {
    const d = ctx.draft ?? ctx.resolved;
    if (!d) return { id: 'INV-5.4-G', passed: true, reason: 'No draft' };
    if (!isDerived(d.derivation_kind)) return { id: 'INV-5.4-G', passed: true, reason: 'Not derived' };
    const ok = !!d.parent_envelope_id;
    return { id: 'INV-5.4-G', passed: ok, reason: ok ? 'Parent lineage present' : 'Derived without parent lineage' };
  },

  'INV-5.4-H': (ctx) => {
    const r = ctx.resolved;
    if (!r) return { id: 'INV-5.4-H', passed: true, reason: 'No resolved envelope' };
    if (!r.archive_required) return { id: 'INV-5.4-H', passed: true, reason: 'Archive not required' };
    if (r.lifecycle_state === L5EnvelopeLifecycleState.READY_FOR_MANIFEST && !r.archive_uri) {
      return { id: 'INV-5.4-H', passed: false, reason: 'Manifest-ready without archive proof' };
    }
    return { id: 'INV-5.4-H', passed: true, reason: 'Archive proof present or not yet manifest-ready' };
  },

  'INV-5.4-I': (ctx) => {
    const ok = ctx.projectionValid ?? true;
    return { id: 'INV-5.4-I', passed: ok, reason: ok ? 'Projection consistent' : 'Typed projection contradicts payload' };
  },

  'INV-5.4-J': (ctx) => {
    const ok = ctx.producerRegistered ?? true;
    return { id: 'INV-5.4-J', passed: ok, reason: ok ? 'Producer registered' : 'Producer not registered' };
  },

  'INV-5.4-K': (ctx) => {
    if (!ctx.lifecycleFrom || !ctx.lifecycleTo) return { id: 'INV-5.4-K', passed: true, reason: 'No transition to check' };
    const legal = isLegalLifecycleTransition(ctx.lifecycleFrom, ctx.lifecycleTo);
    const monotonic = isMonotonicAdvancement(ctx.lifecycleFrom, ctx.lifecycleTo);
    const ok = legal && monotonic;
    return { id: 'INV-5.4-K', passed: ok, reason: ok ? 'Transition legal and monotonic' : `Illegal transition '${ctx.lifecycleFrom}' → '${ctx.lifecycleTo}'` };
  },

  'INV-5.4-L': (ctx) => {
    const d = ctx.draft ?? ctx.resolved;
    if (!d) return { id: 'INV-5.4-L', passed: true, reason: 'No draft' };
    if (!d.replay_required) return { id: 'INV-5.4-L', passed: true, reason: 'Replay not required' };
    const ok = !!d.trace_id && !!d.payload_hash_sha256 && !!d.schema_version && !!d.canonical_serialization_version;
    return { id: 'INV-5.4-L', passed: ok, reason: ok ? 'Replay minimum lineage preserved' : 'Missing replay-required lineage fields' };
  },

  'INV-5.4-M': (ctx) => {
    if (!ctx.duplicateConflictHandled) return { id: 'INV-5.4-M', passed: true, reason: 'No duplicate conflict' };
    const ok = ctx.duplicateConflictHandled === 'QUARANTINE';
    return { id: 'INV-5.4-M', passed: ok, reason: ok ? 'Duplicate conflict quarantined' : 'Duplicate conflict handled by overwrite (illegal)' };
  },

  'INV-5.4-N': (ctx) => {
    const r = ctx.resolved;
    if (!r) return { id: 'INV-5.4-N', passed: true, reason: 'No resolved envelope' };
    const ok = r.classification_resolved && r.authority_allocated && r.topology_validated;
    return { id: 'INV-5.4-N', passed: ok, reason: ok ? 'Resolved envelope aligns with L5.1/L5.2/L5.3' : 'Resolution incomplete' };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function assertEnvelopeInvariant(id: L5EnvelopeInvariantId, ctx: EnvelopeInvariantContext): EnvelopeInvariantResult {
  return CHECKS[id](ctx);
}

export function assertAllEnvelopeInvariants(ctx: EnvelopeInvariantContext): EnvelopeInvariantResult[] {
  return ALL_ENVELOPE_INVARIANT_IDS.map(id => CHECKS[id](ctx));
}

export function enforceAllEnvelopeInvariants(ctx: EnvelopeInvariantContext): void {
  const results = assertAllEnvelopeInvariants(ctx);
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    const msg = failures.map(f => `${f.id}: ${f.reason}`).join('; ');
    throw new Error(`L5.4 envelope invariant failures: ${msg}`);
  }
}
