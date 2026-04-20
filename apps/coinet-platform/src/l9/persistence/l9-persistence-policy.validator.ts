/**
 * L9.8 — Persistence Policy Validator
 *
 * §9.8.2 — Enforces the persistence-principle law on every L9
 * persistence envelope: every write must route through L5, target a
 * registered surface, carry the surface's mandatory identity /
 * lineage / replay / evidence fields, and declare a mode the surface
 * accepts.
 *
 * Complements `l9-current-authority.validator.ts` (which handles
 * supersession specifics for current-authority surfaces) and
 * `l9-historical-surface.validator.ts` (correction-aware law).
 */

import {
  L9PersistenceEnvelope,
  L9DurableSurface,
  L9PersistenceClass,
  L9MaterializationMode,
} from '../contracts/l9-persistence-surface';
import { L9DurableSurfaceRegistry } from '../registry/l9-durable-surface.registry';
import {
  L9PersistenceViolation,
  L9PersistenceViolationCode,
  L9PersistenceViolationTier,
  l9PersistenceViolationTier,
} from './l9-persistence-violation-codes';

export interface L9PersistencePolicyValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L9PersistenceViolation[];
  readonly surface: L9DurableSurface | null;
}

export function validateL9PersistenceEnvelope(
  envelope: L9PersistenceEnvelope,
  registry: L9DurableSurfaceRegistry = L9DurableSurfaceRegistry.default(),
): L9PersistencePolicyValidationResult {
  const violations: L9PersistenceViolation[] = [];

  if (!envelope.envelope_id) {
    violations.push(v(
      L9PersistenceViolationCode.PERSIST_ENVELOPE_ID_MISSING,
      'Envelope id is missing or empty.',
    ));
  }
  if (!envelope.sequence_subject_id) {
    violations.push(v(
      L9PersistenceViolationCode.PERSIST_SUBJECT_ID_MISSING,
      `Envelope ${envelope.envelope_id} has no sequence_subject_id.`,
    ));
  }
  if (!envelope.policy_version) {
    violations.push(v(
      L9PersistenceViolationCode.PERSIST_POLICY_VERSION_MISSING,
      `Envelope ${envelope.envelope_id} has no policy_version.`,
    ));
  }
  if (!envelope.routes_through_l5) {
    violations.push(v(
      L9PersistenceViolationCode.PERSIST_NOT_ROUTED_THROUGH_L5,
      `Envelope ${envelope.envelope_id} is not routed through L5 ` +
        `(INV-9.8-A).`,
    ));
  }

  const surface = registry.get(envelope.durable_surface_id);
  if (!surface) {
    violations.push(v(
      L9PersistenceViolationCode.PERSIST_SURFACE_UNREGISTERED,
      `Surface ${envelope.durable_surface_id} is not registered.`,
    ));
    return { ok: false, violations, surface: null };
  }

  // §9.8.3.5 — mode × surface legality.
  if (!surface.materialization_modes_allowed.includes(envelope.materialization_mode)) {
    violations.push(v(
      L9PersistenceViolationCode.PERSIST_MODE_ILLEGAL_FOR_SURFACE,
      `Mode ${envelope.materialization_mode} illegal for ` +
        `${surface.durable_surface_id}.`,
    ));
  }

  // §9.8.2.5 — required identity fields.
  checkFields(
    envelope,
    surface.required_identity_fields,
    L9PersistenceViolationCode.PERSIST_IDENTITY_FIELD_MISSING,
    violations,
    'identity',
  );
  checkFields(
    envelope,
    surface.required_lineage_fields,
    L9PersistenceViolationCode.PERSIST_LINEAGE_FIELD_MISSING,
    violations,
    'lineage',
  );
  checkFields(
    envelope,
    surface.required_replay_fields,
    L9PersistenceViolationCode.PERSIST_REPLAY_FIELD_MISSING,
    violations,
    'replay',
  );
  checkFields(
    envelope,
    surface.required_evidence_fields,
    L9PersistenceViolationCode.PERSIST_EVIDENCE_FIELD_MISSING,
    violations,
    'evidence',
  );

  // §9.8.2.4 — historical append surfaces must not mutate current.
  if (
    surface.persistence_class === L9PersistenceClass.HISTORICAL_FACT_SURFACE &&
    envelope.materialization_mode === L9MaterializationMode.LIVE_CURRENT
  ) {
    violations.push(v(
      L9PersistenceViolationCode.HIST_MUTATES_CURRENT,
      `LIVE_CURRENT write targeted historical surface ` +
        `${surface.durable_surface_id}.`,
    ));
  }

  return { ok: violations.length === 0, violations, surface };
}

function checkFields(
  envelope: L9PersistenceEnvelope,
  fields: readonly string[],
  code: L9PersistenceViolationCode,
  out: L9PersistenceViolation[],
  category: string,
): void {
  for (const f of fields) {
    if (!envelopeHasField(envelope, f)) {
      out.push(v(code,
        `Envelope ${envelope.envelope_id} missing required ${category} ` +
          `field '${f}' for surface ${envelope.durable_surface_id}.`));
    }
  }
}

function envelopeHasField(
  envelope: L9PersistenceEnvelope,
  field: string,
): boolean {
  switch (field) {
    case 'envelope_id': return !!envelope.envelope_id;
    case 'sequence_subject_id': return !!envelope.sequence_subject_id;
    case 'scope_type': return !!envelope.scope_type;
    case 'scope_id': return !!envelope.scope_id;
    case 'as_of': return !!envelope.as_of;
    case 'compute_run_id': return !!envelope.compute_run_id;
    case 'policy_version': return !!envelope.policy_version;
    case 'replay_hash': return !!envelope.replay_hash;
    case 'evidence_refs': return envelope.evidence_refs.length > 0;
    case 'lineage_refs': return envelope.lineage_refs.length > 0;
    case 'fact_id':
    case 'evidence_id':
    case 'lineage_id':
    case 'archive_uri':
    case 'checksum_sha256':
    case 'manifest_id':
    case 'deterministic_path': {
      // These live on the opaque payload; we trust the writer but
      // require a non-null payload with typed fields. The specific
      // validators (evidence / historical) do deeper payload checks.
      return envelope.payload !== null && envelope.payload !== undefined;
    }
    default:
      return true;
  }
}

function v(
  code: L9PersistenceViolationCode,
  detail: string,
  offending_refs?: readonly string[],
): L9PersistenceViolation {
  return {
    code,
    tier: l9PersistenceViolationTier(code) as L9PersistenceViolationTier,
    detail,
    offending_refs,
  };
}
