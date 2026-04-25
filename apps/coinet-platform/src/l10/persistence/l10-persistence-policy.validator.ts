/**
 * L10.8 — Persistence Policy Validator
 *
 * §10.8.2 — Enforces the persistence-principle law on every L10
 * persistence envelope: every write must route through L5, target a
 * registered surface, carry the surface's mandatory identity /
 * lineage / replay / evidence fields, and declare a mode the surface
 * accepts.
 */

import {
  L10DurableSurface,
  L10MaterializationMode,
  L10PersistenceClass,
  L10PersistenceEnvelope,
} from '../contracts/l10-persistence-surface';
import { L10DurableSurfaceRegistry } from '../registry/l10-durable-surface.registry';
import {
  L10PersistenceViolation,
  L10PersistenceViolationCode,
  L10PersistenceViolationTier,
  l10PersistenceViolationTier,
} from './l10-persistence-violation-codes';

export interface L10PersistencePolicyValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L10PersistenceViolation[];
  readonly surface: L10DurableSurface | null;
}

export function validateL10PersistenceEnvelope(
  envelope: L10PersistenceEnvelope,
  registry: L10DurableSurfaceRegistry = L10DurableSurfaceRegistry.default(),
): L10PersistencePolicyValidationResult {
  const violations: L10PersistenceViolation[] = [];

  if (!envelope.envelope_id) {
    violations.push(v(
      L10PersistenceViolationCode.PERSIST_ENVELOPE_ID_MISSING,
      'Envelope id is missing or empty.',
    ));
  }
  if (!envelope.hypothesis_subject_id) {
    violations.push(v(
      L10PersistenceViolationCode.PERSIST_SUBJECT_ID_MISSING,
      `Envelope ${envelope.envelope_id} has no hypothesis_subject_id.`,
    ));
  }
  if (!envelope.policy_version) {
    violations.push(v(
      L10PersistenceViolationCode.PERSIST_POLICY_VERSION_MISSING,
      `Envelope ${envelope.envelope_id} has no policy_version.`,
    ));
  }
  if (!envelope.routes_through_l5) {
    violations.push(v(
      L10PersistenceViolationCode.PERSIST_NOT_ROUTED_THROUGH_L5,
      `Envelope ${envelope.envelope_id} is not routed through L5 ` +
        `(INV-10.8-A).`,
    ));
  }

  const surface = registry.get(envelope.durable_surface_id);
  if (!surface) {
    violations.push(v(
      L10PersistenceViolationCode.PERSIST_SURFACE_UNREGISTERED,
      `Surface ${envelope.durable_surface_id} is not registered.`,
    ));
    return { ok: false, violations, surface: null };
  }

  // §10.8.3.5 — mode × surface legality.
  if (
    !surface.materialization_modes_allowed.includes(envelope.materialization_mode)
  ) {
    violations.push(v(
      L10PersistenceViolationCode.PERSIST_MODE_ILLEGAL_FOR_SURFACE,
      `Mode ${envelope.materialization_mode} illegal for ` +
        `${surface.durable_surface_id}.`,
    ));
  }

  checkFields(
    envelope,
    surface.required_identity_fields,
    L10PersistenceViolationCode.PERSIST_IDENTITY_FIELD_MISSING,
    violations,
    'identity',
  );
  checkFields(
    envelope,
    surface.required_lineage_fields,
    L10PersistenceViolationCode.PERSIST_LINEAGE_FIELD_MISSING,
    violations,
    'lineage',
  );
  checkFields(
    envelope,
    surface.required_replay_fields,
    L10PersistenceViolationCode.PERSIST_REPLAY_FIELD_MISSING,
    violations,
    'replay',
  );
  checkFields(
    envelope,
    surface.required_evidence_fields,
    L10PersistenceViolationCode.PERSIST_EVIDENCE_FIELD_MISSING,
    violations,
    'evidence',
  );

  // §10.8.2.4 — historical append surfaces must not mutate current.
  if (
    surface.persistence_class ===
      L10PersistenceClass.HISTORICAL_FACT_SURFACE &&
    envelope.materialization_mode === L10MaterializationMode.LIVE_CURRENT
  ) {
    violations.push(v(
      L10PersistenceViolationCode.HIST_MUTATES_CURRENT,
      `LIVE_CURRENT write targeted historical surface ` +
        `${surface.durable_surface_id}.`,
    ));
  }

  return { ok: violations.length === 0, violations, surface };
}

function checkFields(
  envelope: L10PersistenceEnvelope,
  fields: readonly string[],
  code: L10PersistenceViolationCode,
  out: L10PersistenceViolation[],
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
  envelope: L10PersistenceEnvelope,
  field: string,
): boolean {
  switch (field) {
    case 'envelope_id': return !!envelope.envelope_id;
    case 'hypothesis_subject_id': return !!envelope.hypothesis_subject_id;
    case 'scope_type': return !!envelope.scope_type;
    case 'scope_id': return !!envelope.scope_id;
    case 'as_of': return !!envelope.as_of;
    case 'compute_run_id': return !!envelope.compute_run_id;
    case 'policy_version': return !!envelope.policy_version;
    case 'replay_hash': return !!envelope.replay_hash;
    case 'evidence_refs': return envelope.evidence_refs.length > 0;
    case 'lineage_refs': return envelope.lineage_refs.length > 0;
    case 'fact_id':
    case 'evidence_pointer_id':
    case 'lineage_id':
    case 'archive_uri':
    case 'checksum':
    case 'manifest_ref':
    case 'deterministic_path': {
      // These live on the opaque payload; the specific validators
      // (evidence / historical) do deeper payload checks.
      return envelope.payload !== null && envelope.payload !== undefined;
    }
    default:
      return true;
  }
}

function v(
  code: L10PersistenceViolationCode,
  detail: string,
  offending_refs?: readonly string[],
): L10PersistenceViolation {
  return {
    code,
    tier: l10PersistenceViolationTier(code) as L10PersistenceViolationTier,
    detail,
    offending_refs,
  };
}
