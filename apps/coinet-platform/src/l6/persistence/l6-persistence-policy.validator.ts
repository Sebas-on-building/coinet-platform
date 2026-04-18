/**
 * L6.7 — Persistence Policy Validator
 *
 * §6.7.1.7 — Blocks:
 *   - direct store writes
 *   - illegal sink selection
 *   - missing manifest linkage
 *   - current-state writes without authority class
 *   - historical writes without replay identity
 *   - evidence writes without archive linkage
 *   - identity fields missing
 *   - mutation-discipline violations
 */

import {
  L6DurableSurfaceId,
  L6MaterializationMode,
  L6PersistenceClass,
  L6PersistenceEnvelope,
  L6PersistenceIdentity,
  L6PersistenceViolationCode,
  L6MutationDiscipline,
  DURABLE_SURFACE_REGISTRY,
  ALL_DURABLE_SURFACE_IDS,
} from '../contracts/l6-persistence-surface';

export interface L6PersistenceViolation {
  readonly code: L6PersistenceViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L6PersistenceValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L6PersistenceViolation[];
}

export interface L6PersistenceAttempt {
  readonly envelope: L6PersistenceEnvelope;
  readonly direct_store_bypass: boolean;
  readonly sink_hint: string | null;
  readonly evidence_archive_uri: string | null;
  readonly current_authority_class: string | null;
  readonly supersession_tag: string | null;
  readonly prior_row_exists: boolean;
  readonly mutation_action: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';
}

export class L6PersistencePolicyValidator {
  /**
   * Validate a prepared L6 persistence attempt.
   */
  validate(attempt: L6PersistenceAttempt): L6PersistenceValidationResult {
    const v: L6PersistenceViolation[] = [];

    // §6.7.1.1 — direct store writes are never legal
    if (attempt.direct_store_bypass) {
      v.push({
        code: L6PersistenceViolationCode.DIRECT_STORE_WRITE,
        field: 'direct_store_bypass',
        detail: 'persistence attempted outside governed L5 path',
      });
    }

    // identity completeness
    this.validateIdentity(attempt.envelope.identity, v);

    // surface known?
    if (!ALL_DURABLE_SURFACE_IDS.includes(attempt.envelope.target_surface as L6DurableSurfaceId)) {
      v.push({
        code: L6PersistenceViolationCode.UNKNOWN_SURFACE,
        field: 'target_surface',
        detail: `unknown surface ${attempt.envelope.target_surface}`,
      });
      return { ok: false, violations: v };
    }

    const spec = DURABLE_SURFACE_REGISTRY[attempt.envelope.target_surface];

    // persistence class must match
    if (spec.persistence_class !== attempt.envelope.persistence_class) {
      v.push({
        code: L6PersistenceViolationCode.ILLEGAL_SINK_SELECTION,
        field: 'persistence_class',
        detail: `surface ${spec.surface_id} expects ${spec.persistence_class}, got ${attempt.envelope.persistence_class}`,
      });
    }

    // sink hint (if present) must reference the governed authority store
    if (attempt.sink_hint) {
      const raw = attempt.sink_hint.toUpperCase();
      const storeNames = ['POSTGRES', 'CLICKHOUSE', 'OBJECT_STORE', 'REDIS'];
      if (!storeNames.some(s => raw.includes(s))) {
        v.push({
          code: L6PersistenceViolationCode.ILLEGAL_SINK_SELECTION,
          field: 'sink_hint',
          detail: `sink hint ${attempt.sink_hint} is not an L5-governed store`,
        });
      } else if (!raw.includes(spec.authority_store)) {
        v.push({
          code: L6PersistenceViolationCode.AUTHORITY_MISROUTE,
          field: 'sink_hint',
          detail: `surface ${spec.surface_id} authoritative on ${spec.authority_store}, sink routed to ${attempt.sink_hint}`,
        });
      }
    }

    // §6.7.1.7 — manifest linkage required where declared
    if (spec.manifest_linkage_required && !attempt.envelope.identity.storage_manifest_id) {
      v.push({
        code: L6PersistenceViolationCode.MISSING_MANIFEST_LINKAGE,
        field: 'storage_manifest_id',
        detail: `surface ${spec.surface_id} requires manifest linkage`,
      });
    }

    // §6.7.1.7 — historical writes require replay identity
    if (spec.persistence_class === L6PersistenceClass.HISTORICAL_STATE &&
        !attempt.envelope.identity.replay_hash) {
      v.push({
        code: L6PersistenceViolationCode.HISTORICAL_WRITE_WITHOUT_REPLAY_IDENTITY,
        field: 'replay_hash',
        detail: `historical write to ${spec.surface_id} lacks replay identity`,
      });
    }

    // §6.7.1.7 — current-state writes require authority class
    if (spec.persistence_class === L6PersistenceClass.CURRENT_AUTHORITATIVE_STATE &&
        !attempt.current_authority_class) {
      v.push({
        code: L6PersistenceViolationCode.CURRENT_WRITE_WITHOUT_AUTHORITY_CLASS,
        field: 'current_authority_class',
        detail: `current-state write to ${spec.surface_id} lacks authority class`,
      });
    }

    // §6.7.1.7 — evidence writes require archive linkage
    if (spec.persistence_class === L6PersistenceClass.EVIDENCE_STATE &&
        !attempt.evidence_archive_uri) {
      v.push({
        code: L6PersistenceViolationCode.MISSING_EVIDENCE_ARCHIVE,
        field: 'evidence_archive_uri',
        detail: `evidence write to ${spec.surface_id} lacks archive URI`,
      });
    }

    // mutation discipline enforcement
    this.validateMutationDiscipline(spec.mutation_discipline, attempt, v);

    // materialization mode tag required
    if (!attempt.envelope.materialization_mode) {
      v.push({
        code: L6PersistenceViolationCode.ILLEGAL_MATERIALIZATION_MODE,
        field: 'materialization_mode',
        detail: 'materialization_mode missing',
      });
    }

    return { ok: v.length === 0, violations: v };
  }

  private validateIdentity(
    id: L6PersistenceIdentity,
    v: L6PersistenceViolation[],
  ): void {
    const required: (keyof L6PersistenceIdentity)[] = [
      'primitive_id', 'primitive_version', 'scope_type', 'scope_id',
      'temporal_anchor', 'compute_run_id', 'replay_hash',
    ];
    for (const key of required) {
      if (!id[key]) {
        v.push({
          code: L6PersistenceViolationCode.IDENTITY_INCOMPLETE,
          field: key,
          detail: `persistence identity missing ${key}`,
        });
      }
    }
  }

  private validateMutationDiscipline(
    disc: L6MutationDiscipline,
    attempt: L6PersistenceAttempt,
    v: L6PersistenceViolation[],
  ): void {
    if (disc === L6MutationDiscipline.APPEND_ONLY &&
        attempt.mutation_action !== 'INSERT') {
      v.push({
        code: L6PersistenceViolationCode.MUTATION_DISCIPLINE_VIOLATION,
        field: 'mutation_action',
        detail: `append-only surface ${attempt.envelope.target_surface} received ${attempt.mutation_action}`,
      });
    }
    if (disc === L6MutationDiscipline.IMMUTABLE &&
        attempt.mutation_action !== 'INSERT') {
      v.push({
        code: L6PersistenceViolationCode.MUTATION_DISCIPLINE_VIOLATION,
        field: 'mutation_action',
        detail: `immutable surface ${attempt.envelope.target_surface} may not receive ${attempt.mutation_action}`,
      });
    }
    if (disc === L6MutationDiscipline.SUPERSEDING_CURRENT_AUTHORITY &&
        attempt.prior_row_exists && !attempt.supersession_tag &&
        attempt.envelope.materialization_mode !== L6MaterializationMode.LIVE_MATERIALIZATION) {
      v.push({
        code: L6PersistenceViolationCode.ILLEGAL_SUPERSESSION,
        field: 'supersession_tag',
        detail: `supersession of prior current-state row requires explicit supersession tag outside live mode`,
      });
    }
  }
}
