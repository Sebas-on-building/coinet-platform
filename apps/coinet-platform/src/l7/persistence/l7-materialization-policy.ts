/**
 * L7.7 — Materialization Policy
 *
 * §7.7.4 — The legal pipeline for turning a contract-valid runtime
 * output into a durable, L5-routed persistence envelope. This module
 * is the ONLY place allowed to decide "is this materialization ready,
 * and which durable surface is it going to?".
 *
 * It emits:
 *   - an `L7PersistenceEnvelope` that the persistence validators then
 *     certify,
 *   - or a list of `L7PersistenceViolation`s explaining exactly why
 *     the output is not yet durable.
 */

import {
  L7DurableSurfaceId,
  L7MaterializationMode,
  L7PersistenceClass,
  L7PersistenceEnvelope,
  L7_SURFACE_LEGAL_MODES,
  ALL_L7_DURABLE_SURFACE_IDS,
} from '../contracts/l7-persistence-surface';
import {
  L7DurableSurfaceRegistry,
  getDefaultDurableSurfaceRegistry,
} from '../registry/durable-surface.registry';
import {
  L7PersistenceViolation,
  L7PersistenceViolationCode,
  buildL7PersistenceViolation,
} from './l7-persistence-violation-codes';

// ── Input to the materialization policy ────────────────────────────────

export interface L7MaterializationPreparationInput {
  readonly surface_id: L7DurableSurfaceId;
  readonly persistence_class: L7PersistenceClass;
  readonly materialization_mode: L7MaterializationMode;
  readonly subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly compute_run_id: string;
  readonly policy_version: string | null;
  readonly replay_hash: string | null;
  readonly replay_generation_ref: string | null;
  readonly as_of: string;
  readonly effective_at: string | null;
  readonly trace_id: string;
  readonly manifest_id: string;

  readonly validation_result_id?: string | null;
  readonly contradiction_bundle_id?: string | null;
  readonly confidence_assessment_id?: string | null;
  readonly restriction_profile_id?: string | null;

  readonly superseded_prior_ref?: string | null;
  readonly correction_parent_ref?: string | null;
  readonly correction_reason?: string | null;

  readonly evidence_pointer_refs: readonly string[];

  readonly contract_legal: boolean;
  readonly runtime_complete: boolean;

  readonly payload_schema: string;
  readonly payload_hash: string;
}

export type L7MaterializationPreparationResult =
  | { readonly ok: true; readonly envelope: L7PersistenceEnvelope }
  | { readonly ok: false; readonly violations: readonly L7PersistenceViolation[] };

// ── Correctness predicates ─────────────────────────────────────────────

/**
 * Class ↔ surface map: a persistence class can only write to specific
 * durable surfaces. This is one of the two gates (with mode legality)
 * that keep current/historical separation enforced.
 */
export const L7_PERSISTENCE_CLASS_TO_SURFACE: Record<
  L7PersistenceClass,
  L7DurableSurfaceId
> = {
  [L7PersistenceClass.SUBJECT_DEFINITION]: L7DurableSurfaceId.VALIDATION_SUBJECT_DEFINITIONS,
  [L7PersistenceClass.VALIDATION_RUN]: L7DurableSurfaceId.VALIDATION_RUNS,
  [L7PersistenceClass.CURRENT_VALIDATION]: L7DurableSurfaceId.CURRENT_VALIDATION_REGISTRY,
  [L7PersistenceClass.CURRENT_CONTRADICTION]: L7DurableSurfaceId.CURRENT_CONTRADICTION_REGISTRY,
  [L7PersistenceClass.CURRENT_CONFIDENCE]: L7DurableSurfaceId.CURRENT_CONFIDENCE_REGISTRY,
  [L7PersistenceClass.CURRENT_RESTRICTION]: L7DurableSurfaceId.CURRENT_RESTRICTION_REGISTRY,
  [L7PersistenceClass.VALIDATION_TRANSITION]: L7DurableSurfaceId.VALIDATION_TRANSITIONS,
  [L7PersistenceClass.VALIDATION_FAILURE]: L7DurableSurfaceId.VALIDATION_FAILURES,
  [L7PersistenceClass.HISTORICAL_VALIDATION]: L7DurableSurfaceId.HISTORICAL_VALIDATION_FACTS,
  [L7PersistenceClass.HISTORICAL_CONTRADICTION]: L7DurableSurfaceId.HISTORICAL_CONTRADICTION_FACTS,
  [L7PersistenceClass.HISTORICAL_CONFIDENCE]: L7DurableSurfaceId.HISTORICAL_CONFIDENCE_FACTS,
  [L7PersistenceClass.HISTORICAL_RESTRICTION]: L7DurableSurfaceId.HISTORICAL_RESTRICTION_FACTS,
  [L7PersistenceClass.EVIDENCE_POINTER]: L7DurableSurfaceId.EVIDENCE_POINTERS,
  [L7PersistenceClass.LINEAGE_POINTER]: L7DurableSurfaceId.LINEAGE_POINTERS,
};

const CURRENT_CLASSES: readonly L7PersistenceClass[] = [
  L7PersistenceClass.CURRENT_VALIDATION,
  L7PersistenceClass.CURRENT_CONTRADICTION,
  L7PersistenceClass.CURRENT_CONFIDENCE,
  L7PersistenceClass.CURRENT_RESTRICTION,
];

const HISTORICAL_CLASSES: readonly L7PersistenceClass[] = [
  L7PersistenceClass.HISTORICAL_VALIDATION,
  L7PersistenceClass.HISTORICAL_CONTRADICTION,
  L7PersistenceClass.HISTORICAL_CONFIDENCE,
  L7PersistenceClass.HISTORICAL_RESTRICTION,
];

/**
 * §7.7.4 — "materialization ready" predicate. Used by validators and by
 * the failure surface to decide whether to emit MATERIALIZATION_READINESS
 * failures. Deliberately small and explicit.
 */
export function isL7MaterializationReady(input: {
  readonly contract_legal: boolean;
  readonly runtime_complete: boolean;
  readonly payload_hash: string;
  readonly surface_id: L7DurableSurfaceId;
  readonly materialization_mode: L7MaterializationMode;
}): boolean {
  if (!input.contract_legal || !input.runtime_complete) return false;
  if (!input.payload_hash) return false;
  const legal = L7_SURFACE_LEGAL_MODES[input.surface_id];
  if (!legal.includes(input.materialization_mode)) return false;
  return true;
}

// ── Core builder ───────────────────────────────────────────────────────

export function buildL7PersistenceEnvelope(
  input: L7MaterializationPreparationInput,
  registry: L7DurableSurfaceRegistry = getDefaultDurableSurfaceRegistry(),
): L7MaterializationPreparationResult {
  const violations: L7PersistenceViolation[] = [];

  if (!registry.isRegistered(input.surface_id)) {
    violations.push(
      buildL7PersistenceViolation(
        L7PersistenceViolationCode.DURABLE_SURFACE_NOT_REGISTERED,
        `surface ${input.surface_id} is not registered`,
        { subject_id: input.subject_id, surface: String(input.surface_id) },
      ),
    );
    return { ok: false, violations };
  }

  const descriptor = registry.get(input.surface_id)!;
  const expectedSurface = L7_PERSISTENCE_CLASS_TO_SURFACE[input.persistence_class];
  if (expectedSurface !== input.surface_id) {
    violations.push(
      buildL7PersistenceViolation(
        L7PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE,
        `class ${input.persistence_class} cannot write to surface ${input.surface_id} (expected ${expectedSurface})`,
        { subject_id: input.subject_id, surface: input.surface_id },
      ),
    );
  }

  if (!descriptor.allowed_modes.includes(input.materialization_mode)) {
    violations.push(
      buildL7PersistenceViolation(
        L7PersistenceViolationCode.CURRENT_MATERIALIZATION_MODE_INVALID,
        `mode ${input.materialization_mode} not legal on surface ${input.surface_id}`,
        { subject_id: input.subject_id, surface: input.surface_id },
      ),
    );
  }

  // Current-state writes must only be LIVE_CURRENT. Replay/repair rebuilds
  // historical surfaces — never current.
  if (CURRENT_CLASSES.includes(input.persistence_class)) {
    if (input.materialization_mode === L7MaterializationMode.REPLAY_HISTORICAL) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.REPLAY_WRITTEN_AS_LIVE,
          `current-state class ${input.persistence_class} cannot be written in REPLAY_HISTORICAL mode`,
          { subject_id: input.subject_id, surface: input.surface_id },
        ),
      );
    }
    if (input.materialization_mode === L7MaterializationMode.REPAIR_REBUILD) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.REPAIR_WRITTEN_AS_LIVE,
          `current-state class ${input.persistence_class} cannot be written in REPAIR_REBUILD mode`,
          { subject_id: input.subject_id, surface: input.surface_id },
        ),
      );
    }
  }

  // Historical writes must NOT claim LIVE_CURRENT.
  if (HISTORICAL_CLASSES.includes(input.persistence_class)) {
    if (input.materialization_mode === L7MaterializationMode.LIVE_CURRENT) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.LIVE_WRITTEN_AS_REPLAY,
          `historical class ${input.persistence_class} cannot be written in LIVE_CURRENT mode`,
          { subject_id: input.subject_id, surface: input.surface_id },
        ),
      );
    }
  }

  if (!input.contract_legal || !input.runtime_complete) {
    violations.push(
      buildL7PersistenceViolation(
        L7PersistenceViolationCode.CURRENT_MATERIALIZATION_NOT_READY,
        `output is not materialization-ready (contract_legal=${input.contract_legal}, runtime_complete=${input.runtime_complete})`,
        { subject_id: input.subject_id, surface: input.surface_id },
      ),
    );
  }

  // Identity block.
  for (const field of descriptor.required_identity_fields) {
    if (!identityFieldPresent(field, input)) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY,
          `required identity field missing: ${field}`,
          { subject_id: input.subject_id, surface: input.surface_id, context: { field } },
        ),
      );
    }
  }

  // Lineage block.
  for (const field of descriptor.required_lineage_fields) {
    if (!lineageFieldPresent(field, input)) {
      violations.push(
        buildL7PersistenceViolation(
          L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_LINEAGE,
          `required lineage field missing: ${field}`,
          { subject_id: input.subject_id, surface: input.surface_id, context: { field } },
        ),
      );
    }
  }

  // Replay-hash requirement.
  if (descriptor.requires_replay_hash && !input.replay_hash) {
    violations.push(
      buildL7PersistenceViolation(
        L7PersistenceViolationCode.REPLAY_GENERATION_REF_MISSING,
        `replay_hash required by surface ${input.surface_id}`,
        { subject_id: input.subject_id, surface: input.surface_id },
      ),
    );
  }

  // Evidence requirement for current/historical registries.
  if (descriptor.requires_evidence_ref && input.evidence_pointer_refs.length === 0) {
    violations.push(
      buildL7PersistenceViolation(
        L7PersistenceViolationCode.EVIDENCE_REQUIRED_BUT_ABSENT,
        `surface ${input.surface_id} requires at least one evidence_pointer_ref`,
        { subject_id: input.subject_id, surface: input.surface_id },
      ),
    );
  }

  // Correction row linkage.
  if (input.correction_parent_ref && !input.correction_reason) {
    violations.push(
      buildL7PersistenceViolation(
        L7PersistenceViolationCode.CORRECTION_ROW_MISSING_REASON,
        `correction row references parent but carries no correction_reason`,
        { subject_id: input.subject_id, surface: input.surface_id },
      ),
    );
  }
  if (!input.correction_parent_ref && input.correction_reason) {
    violations.push(
      buildL7PersistenceViolation(
        L7PersistenceViolationCode.CORRECTION_ROW_MISSING_PARENT,
        `correction row carries reason without correction_parent_ref`,
        { subject_id: input.subject_id, surface: input.surface_id },
      ),
    );
  }

  if (violations.length > 0) return { ok: false, violations };

  const envelope: L7PersistenceEnvelope = {
    envelope_id: `penv:${input.subject_id}:${input.compute_run_id}:${input.surface_id}`,
    surface_id: input.surface_id,
    persistence_class: input.persistence_class,
    materialization_mode: input.materialization_mode,
    authority_store: descriptor.authority_store,
    mutation_discipline: descriptor.mutation_discipline,
    subject_id: input.subject_id,
    scope_type: input.scope_type,
    scope_id: input.scope_id,
    validation_result_id: input.validation_result_id ?? null,
    contradiction_bundle_id: input.contradiction_bundle_id ?? null,
    confidence_assessment_id: input.confidence_assessment_id ?? null,
    restriction_profile_id: input.restriction_profile_id ?? null,
    as_of: input.as_of,
    effective_at: input.effective_at,
    compute_run_id: input.compute_run_id,
    policy_version: input.policy_version ?? null,
    replay_generation_ref: input.replay_generation_ref ?? null,
    replay_hash: input.replay_hash ?? null,
    superseded_prior_ref: input.superseded_prior_ref ?? null,
    correction_parent_ref: input.correction_parent_ref ?? null,
    correction_reason: input.correction_reason ?? null,
    evidence_pointer_refs: input.evidence_pointer_refs,
    lineage_refs: { trace_id: input.trace_id, manifest_id: input.manifest_id },
    payload_schema: input.payload_schema,
    payload_hash: input.payload_hash,
  };

  return { ok: true, envelope };
}

/**
 * §7.7.4 — Thin wrapper for callers that want a clearly named "prepare"
 * entry point over the envelope builder.
 */
export function prepareL7Materialization(
  input: L7MaterializationPreparationInput,
  registry?: L7DurableSurfaceRegistry,
): L7MaterializationPreparationResult {
  return buildL7PersistenceEnvelope(input, registry);
}

// ── helpers ────────────────────────────────────────────────────────────

function identityFieldPresent(
  field: string,
  input: L7MaterializationPreparationInput,
): boolean {
  switch (field) {
    case 'validation_subject_id':
    case 'subject_id':
      return !!input.subject_id;
    case 'scope_type':
      return !!input.scope_type;
    case 'scope_id':
      return !!input.scope_id;
    case 'compute_run_id':
      return !!input.compute_run_id;
    case 'materialization_mode':
      return !!input.materialization_mode;
    case 'policy_version':
      return !!input.policy_version;
    case 'claim_family':
    case 'claim_version':
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
      // These identity fields live on the caller's sub-record (transition /
      // failure / pointer). At envelope-prep time we only check that the
      // caller has *declared* the primary subject+run identity; full field
      // presence is verified by the `HistoricalSurfaceValidator` and by
      // `L7PersistencePolicyValidator` on the concrete row.
      return true;
    case 'current_state_id':
    case 'effective_as_of':
    case 'fact_id':
    case 'as_of':
    case 'effective_at':
      return !!input.as_of;
    default:
      return true;
  }
}

function lineageFieldPresent(
  field: string,
  input: L7MaterializationPreparationInput,
): boolean {
  switch (field) {
    case 'policy_version':
      return !!input.policy_version;
    case 'materialization_mode':
      return !!input.materialization_mode;
    case 'replay_hash':
      return !!input.replay_hash;
    case 'compute_run_id':
      return !!input.compute_run_id;
    case 'lineage_refs.trace_id':
      return !!input.trace_id;
    case 'lineage_refs.manifest_id':
      return !!input.manifest_id;
    default:
      return true;
  }
}

export const L7_CURRENT_PERSISTENCE_CLASSES: readonly L7PersistenceClass[] =
  CURRENT_CLASSES;
export const L7_HISTORICAL_PERSISTENCE_CLASSES: readonly L7PersistenceClass[] =
  HISTORICAL_CLASSES;
export const ALL_L7_PERSISTENCE_CLASSES_REGISTERED: readonly L7DurableSurfaceId[] =
  ALL_L7_DURABLE_SURFACE_IDS;
