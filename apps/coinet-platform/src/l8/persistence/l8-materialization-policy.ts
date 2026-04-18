/**
 * L8.8 — Materialization Policy
 *
 * §8.8.5 / §8.8.9 — The legal pipeline for turning a contract-valid
 * regime runtime output into a durable, L5-routed persistence envelope.
 * This module is the ONLY place allowed to decide "is this
 * materialization ready, and which durable surface is it going to?".
 *
 * It emits:
 *   - an `L8PersistenceEnvelope` that the persistence validators then
 *     certify,
 *   - or a list of `L8PersistenceViolation`s explaining exactly why
 *     the output is not yet durable.
 */

import {
  L8DurableSurfaceId,
  L8MaterializationMode,
  L8PersistenceClass,
  L8PersistenceEnvelope,
  L8_SURFACE_LEGAL_MODES,
  ALL_L8_DURABLE_SURFACE_IDS,
} from '../contracts/l8-persistence-surface';
import {
  L8DurableSurfaceRegistry,
  getDefaultL8DurableSurfaceRegistry,
} from '../registry/durable-surface.registry';
import {
  L8PersistenceViolation,
  L8PersistenceViolationCode,
  buildL8PersistenceViolation,
} from './l8-persistence-violation-codes';

// ── Input to the materialization policy ─────────────────────────────────

export interface L8MaterializationPreparationInput {
  readonly surface_id: L8DurableSurfaceId;
  readonly persistence_class: L8PersistenceClass;
  readonly materialization_mode: L8MaterializationMode;

  readonly regime_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly regime_family: string;

  readonly compute_run_id: string;
  readonly policy_version: string | null;
  readonly template_id: string | null;
  readonly replay_hash: string | null;
  readonly replay_generation_ref: string | null;
  readonly as_of: string;
  readonly effective_at: string | null;
  readonly trace_id: string;
  readonly manifest_id: string;

  readonly regime_result_id?: string | null;
  readonly transition_profile_id?: string | null;
  readonly confidence_assessment_id?: string | null;
  readonly multiplier_profile_id?: string | null;
  readonly reliance_profile_id?: string | null;

  readonly superseded_prior_ref?: string | null;
  readonly correction_parent_ref?: string | null;
  readonly correction_reason?: string | null;

  readonly evidence_pointer_refs: readonly string[];

  readonly contract_legal: boolean;
  readonly runtime_complete: boolean;

  readonly payload_schema: string;
  readonly payload_hash: string;
}

export type L8MaterializationPreparationResult =
  | { readonly ok: true; readonly envelope: L8PersistenceEnvelope }
  | { readonly ok: false; readonly violations:
      readonly L8PersistenceViolation[] };

// ── Class ↔ surface map ─────────────────────────────────────────────────

/**
 * §8.8.3 — A persistence class can only write to one specific durable
 * surface. This is one of the two gates (with mode legality) that keeps
 * current/historical separation enforced.
 */
export const L8_PERSISTENCE_CLASS_TO_SURFACE: Record<
  L8PersistenceClass, L8DurableSurfaceId
> = {
  [L8PersistenceClass.SUBJECT_DEFINITION]:
    L8DurableSurfaceId.REGIME_SUBJECT_DEFINITIONS,
  [L8PersistenceClass.REGIME_RUN]:
    L8DurableSurfaceId.REGIME_RUNS,

  [L8PersistenceClass.CURRENT_REGIME]:
    L8DurableSurfaceId.CURRENT_REGIME_REGISTRY,
  [L8PersistenceClass.CURRENT_TRANSITION]:
    L8DurableSurfaceId.CURRENT_TRANSITION_REGISTRY,
  [L8PersistenceClass.CURRENT_CONFIDENCE]:
    L8DurableSurfaceId.CURRENT_CONFIDENCE_REGISTRY,
  [L8PersistenceClass.CURRENT_MULTIPLIER]:
    L8DurableSurfaceId.CURRENT_MULTIPLIER_REGISTRY,

  [L8PersistenceClass.REGIME_TRANSITION]:
    L8DurableSurfaceId.REGIME_TRANSITIONS,
  [L8PersistenceClass.REGIME_FAILURE]:
    L8DurableSurfaceId.REGIME_FAILURES,

  [L8PersistenceClass.HISTORICAL_REGIME]:
    L8DurableSurfaceId.HISTORICAL_REGIME_FACTS,
  [L8PersistenceClass.HISTORICAL_TRANSITION]:
    L8DurableSurfaceId.HISTORICAL_TRANSITION_FACTS,
  [L8PersistenceClass.HISTORICAL_CONFIDENCE]:
    L8DurableSurfaceId.HISTORICAL_CONFIDENCE_FACTS,
  [L8PersistenceClass.HISTORICAL_MULTIPLIER]:
    L8DurableSurfaceId.HISTORICAL_MULTIPLIER_FACTS,

  [L8PersistenceClass.EVIDENCE_POINTER]:
    L8DurableSurfaceId.EVIDENCE_REGISTRY,
  [L8PersistenceClass.LINEAGE_POINTER]:
    L8DurableSurfaceId.LINEAGE_REGISTRY,
};

export const L8_CURRENT_PERSISTENCE_CLASSES:
  readonly L8PersistenceClass[] = [
    L8PersistenceClass.CURRENT_REGIME,
    L8PersistenceClass.CURRENT_TRANSITION,
    L8PersistenceClass.CURRENT_CONFIDENCE,
    L8PersistenceClass.CURRENT_MULTIPLIER,
  ];

export const L8_HISTORICAL_PERSISTENCE_CLASSES:
  readonly L8PersistenceClass[] = [
    L8PersistenceClass.HISTORICAL_REGIME,
    L8PersistenceClass.HISTORICAL_TRANSITION,
    L8PersistenceClass.HISTORICAL_CONFIDENCE,
    L8PersistenceClass.HISTORICAL_MULTIPLIER,
  ];

// ── Materialization-ready predicate ─────────────────────────────────────

export function isL8MaterializationReady(input: {
  readonly contract_legal: boolean;
  readonly runtime_complete: boolean;
  readonly payload_hash: string;
  readonly surface_id: L8DurableSurfaceId;
  readonly materialization_mode: L8MaterializationMode;
}): boolean {
  if (!input.contract_legal || !input.runtime_complete) return false;
  if (!input.payload_hash) return false;
  const legal = L8_SURFACE_LEGAL_MODES[input.surface_id];
  if (!legal.includes(input.materialization_mode)) return false;
  return true;
}

// ── Core envelope builder ───────────────────────────────────────────────

export function buildL8PersistenceEnvelope(
  input: L8MaterializationPreparationInput,
  registry: L8DurableSurfaceRegistry = getDefaultL8DurableSurfaceRegistry(),
): L8MaterializationPreparationResult {
  const violations: L8PersistenceViolation[] = [];

  if (!registry.isRegistered(input.surface_id)) {
    violations.push(buildL8PersistenceViolation(
      L8PersistenceViolationCode.DURABLE_SURFACE_NOT_REGISTERED,
      `surface ${input.surface_id} is not registered`,
      { regime_subject_id: input.regime_subject_id,
        surface: String(input.surface_id) },
    ));
    return { ok: false, violations };
  }

  const descriptor = registry.get(input.surface_id)!;
  const expectedSurface =
    L8_PERSISTENCE_CLASS_TO_SURFACE[input.persistence_class];
  if (expectedSurface !== input.surface_id) {
    violations.push(buildL8PersistenceViolation(
      L8PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE,
      `class ${input.persistence_class} cannot write to surface ${input.surface_id} (expected ${expectedSurface})`,
      { regime_subject_id: input.regime_subject_id, surface: input.surface_id },
    ));
  }

  if (!descriptor.allowed_modes.includes(input.materialization_mode)) {
    violations.push(buildL8PersistenceViolation(
      L8PersistenceViolationCode.CURRENT_MATERIALIZATION_MODE_INVALID,
      `mode ${input.materialization_mode} not legal on surface ${input.surface_id}`,
      { regime_subject_id: input.regime_subject_id, surface: input.surface_id },
    ));
  }

  // §8.8.5.4 — current-state classes must only be LIVE_CURRENT. Replay
  // and repair rebuild historical surfaces — never current.
  if (L8_CURRENT_PERSISTENCE_CLASSES.includes(input.persistence_class)) {
    if (input.materialization_mode === L8MaterializationMode.REPLAY_HISTORICAL) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.REPLAY_WRITTEN_AS_LIVE,
        `current-state class ${input.persistence_class} cannot be written in REPLAY_HISTORICAL mode`,
        { regime_subject_id: input.regime_subject_id, surface: input.surface_id },
      ));
    }
    if (input.materialization_mode === L8MaterializationMode.REPAIR_REBUILD) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.REPAIR_WRITTEN_AS_LIVE,
        `current-state class ${input.persistence_class} cannot be written in REPAIR_REBUILD mode`,
        { regime_subject_id: input.regime_subject_id, surface: input.surface_id },
      ));
    }
    if (input.materialization_mode === L8MaterializationMode.LATE_DATA_REMATERIALIZATION) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.LATE_DATA_WRITTEN_AS_LIVE,
        `current-state class ${input.persistence_class} cannot be written in LATE_DATA_REMATERIALIZATION mode`,
        { regime_subject_id: input.regime_subject_id, surface: input.surface_id },
      ));
    }
  }

  // §8.8.4.6 — historical classes must NOT claim LIVE_CURRENT.
  if (L8_HISTORICAL_PERSISTENCE_CLASSES.includes(input.persistence_class)) {
    if (input.materialization_mode === L8MaterializationMode.LIVE_CURRENT) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.LIVE_WRITTEN_AS_HISTORICAL,
        `historical class ${input.persistence_class} cannot be written in LIVE_CURRENT mode`,
        { regime_subject_id: input.regime_subject_id, surface: input.surface_id },
      ));
    }
  }

  if (!input.contract_legal || !input.runtime_complete) {
    violations.push(buildL8PersistenceViolation(
      L8PersistenceViolationCode.CURRENT_MATERIALIZATION_NOT_READY,
      `output is not materialization-ready (contract_legal=${input.contract_legal}, runtime_complete=${input.runtime_complete})`,
      { regime_subject_id: input.regime_subject_id, surface: input.surface_id },
    ));
  }

  // Identity block.
  for (const field of descriptor.required_identity_fields) {
    if (!identityFieldPresent(field, input)) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY,
        `required identity field missing: ${field}`,
        { regime_subject_id: input.regime_subject_id,
          surface: input.surface_id, context: { field } },
      ));
    }
  }

  // Lineage block.
  for (const field of descriptor.required_lineage_fields) {
    if (!lineageFieldPresent(field, input)) {
      violations.push(buildL8PersistenceViolation(
        L8PersistenceViolationCode.HISTORICAL_ROW_MISSING_LINEAGE,
        `required lineage field missing: ${field}`,
        { regime_subject_id: input.regime_subject_id,
          surface: input.surface_id, context: { field } },
      ));
    }
  }

  // Replay-hash requirement.
  if (descriptor.requires_replay_hash && !input.replay_hash) {
    violations.push(buildL8PersistenceViolation(
      L8PersistenceViolationCode.REPLAY_GENERATION_REF_MISSING,
      `replay_hash required by surface ${input.surface_id}`,
      { regime_subject_id: input.regime_subject_id, surface: input.surface_id },
    ));
  }

  // Evidence requirement for current/historical registries.
  if (descriptor.requires_evidence_ref &&
      input.evidence_pointer_refs.length === 0) {
    violations.push(buildL8PersistenceViolation(
      L8PersistenceViolationCode.EVIDENCE_REQUIRED_BUT_ABSENT,
      `surface ${input.surface_id} requires at least one evidence_pointer_ref`,
      { regime_subject_id: input.regime_subject_id, surface: input.surface_id },
    ));
  }

  // §8.8.4.5 — correction-row linkage law: parent ↔ reason must both
  // appear or both be absent.
  if (input.correction_parent_ref && !input.correction_reason) {
    violations.push(buildL8PersistenceViolation(
      L8PersistenceViolationCode.CORRECTION_ROW_MISSING_REASON,
      `correction row references parent but carries no correction_reason`,
      { regime_subject_id: input.regime_subject_id, surface: input.surface_id },
    ));
  }
  if (!input.correction_parent_ref && input.correction_reason) {
    violations.push(buildL8PersistenceViolation(
      L8PersistenceViolationCode.CORRECTION_ROW_MISSING_PARENT,
      `correction row carries reason without correction_parent_ref`,
      { regime_subject_id: input.regime_subject_id, surface: input.surface_id },
    ));
  }

  if (violations.length > 0) return { ok: false, violations };

  const envelope: L8PersistenceEnvelope = {
    envelope_id: `penv:${input.regime_subject_id}:${input.compute_run_id}:${input.surface_id}`,
    surface_id: input.surface_id,
    persistence_class: input.persistence_class,
    materialization_mode: input.materialization_mode,
    authority_store: descriptor.authority_store,
    mutation_discipline: descriptor.mutation_discipline,
    regime_subject_id: input.regime_subject_id,
    scope_type: input.scope_type,
    scope_id: input.scope_id,
    regime_family: input.regime_family,
    regime_result_id: input.regime_result_id ?? null,
    transition_profile_id: input.transition_profile_id ?? null,
    confidence_assessment_id: input.confidence_assessment_id ?? null,
    multiplier_profile_id: input.multiplier_profile_id ?? null,
    reliance_profile_id: input.reliance_profile_id ?? null,
    as_of: input.as_of,
    effective_at: input.effective_at,
    compute_run_id: input.compute_run_id,
    policy_version: input.policy_version ?? null,
    template_id: input.template_id ?? null,
    replay_generation_ref: input.replay_generation_ref ?? null,
    replay_hash: input.replay_hash ?? null,
    superseded_prior_ref: input.superseded_prior_ref ?? null,
    correction_parent_ref: input.correction_parent_ref ?? null,
    correction_reason: input.correction_reason ?? null,
    evidence_pointer_refs: input.evidence_pointer_refs,
    lineage_refs: {
      trace_id: input.trace_id, manifest_id: input.manifest_id,
    },
    payload_schema: input.payload_schema,
    payload_hash: input.payload_hash,
  };

  return { ok: true, envelope };
}

/**
 * §8.8.9.3 — Thin wrapper for callers that want a clearly named
 * "prepare" entry point over the envelope builder.
 */
export function prepareL8Materialization(
  input: L8MaterializationPreparationInput,
  registry?: L8DurableSurfaceRegistry,
): L8MaterializationPreparationResult {
  return buildL8PersistenceEnvelope(input, registry);
}

// ── helpers ─────────────────────────────────────────────────────────────

function identityFieldPresent(
  field: string, input: L8MaterializationPreparationInput,
): boolean {
  switch (field) {
    case 'regime_subject_id': return !!input.regime_subject_id;
    case 'scope_type': return !!input.scope_type;
    case 'scope_id': return !!input.scope_id;
    case 'regime_family': return !!input.regime_family;
    case 'compute_run_id': return !!input.compute_run_id;
    case 'materialization_mode': return !!input.materialization_mode;
    case 'policy_version': return !!input.policy_version;
    case 'current_state_id':
    case 'effective_as_of':
    case 'fact_id':
    case 'as_of':
    case 'effective_at':
      return !!input.as_of;
    // Identity fields that live on a sub-record (transition, failure,
    // pointer). Envelope-prep stage only requires the caller to have
    // declared the primary subject + run + scope identity. Sub-record
    // field presence is verified by the more specific validators.
    case 'transition_id':
    case 'new_state_ref':
    case 'delta_kind':
    case 'failure_id':
    case 'stage':
    case 'failure_code':
    case 'evidence_id':
    case 'evidence_class':
    case 'subject_ref':
    case 'archive_uri':
    case 'checksum':
    case 'lineage_id':
    case 'state_ref':
    case 'manifest_id':
    case 'trace_id':
      return true;
    default:
      return true;
  }
}

function lineageFieldPresent(
  field: string, input: L8MaterializationPreparationInput,
): boolean {
  switch (field) {
    case 'policy_version': return !!input.policy_version;
    case 'materialization_mode': return !!input.materialization_mode;
    case 'replay_hash': return !!input.replay_hash;
    case 'compute_run_id': return !!input.compute_run_id;
    case 'lineage_refs.trace_id': return !!input.trace_id;
    case 'lineage_refs.manifest_id': return !!input.manifest_id;
    default: return true;
  }
}

export const ALL_L8_PERSISTENCE_CLASSES_REGISTERED:
  readonly L8DurableSurfaceId[] = ALL_L8_DURABLE_SURFACE_IDS;
