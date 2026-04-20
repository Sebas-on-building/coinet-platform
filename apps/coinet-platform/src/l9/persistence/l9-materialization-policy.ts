/**
 * L9.8 — Materialization Policy
 *
 * §9.8.10 — Single place governing whether a sequence result may be
 * materialized into a given durable surface. Keeps runtime engines
 * and validators on the same rules.
 *
 * Distinct from the L9.3 `L9SequenceMaterializationPolicy` per-subject
 * policy (`EAGER` / `ON_DEMAND` / …): that governs *when* a subject
 * recomputes; this governs *whether a ready output may be persisted*.
 */

import {
  L9DurableSurface,
  L9DurableSurfaceId,
  L9MaterializationMode,
  L9PersistenceClass,
  L9PersistenceEnvelope,
  L9SequenceServingClass,
} from '../contracts/l9-persistence-surface';
import { L9DurableSurfaceRegistry } from '../registry/l9-durable-surface.registry';
import {
  L9PersistenceViolation,
  L9PersistenceViolationCode,
  L9PersistenceViolationTier,
  l9PersistenceViolationTier,
} from './l9-persistence-violation-codes';

/**
 * §9.8.10.4 — Readiness flags the materialization policy consults.
 * Kept narrow and typed so the runtime cannot hide "well, sort of
 * ready" behind ad-hoc booleans.
 */
export interface L9MaterializationReadinessFlags {
  readonly contract_valid: boolean;
  readonly readiness_not_blocked: boolean;
  readonly evidence_present: boolean;
  readonly lineage_complete: boolean;
  readonly replay_identity_present: boolean;
}

export interface L9MaterializationRequest {
  readonly envelope: L9PersistenceEnvelope;
  readonly readiness: L9MaterializationReadinessFlags;
  /**
   * §9.8.5.4 — true iff the upstream coordinator has already written
   * a supersession-linkage row for this envelope (only meaningful
   * for current-authority surfaces).
   */
  readonly supersession_linkage_recorded: boolean;
}

export interface L9MaterializationDecision {
  readonly admissible: boolean;
  readonly violations: readonly L9PersistenceViolation[];
  readonly surface: L9DurableSurface | null;
}

/**
 * §9.8.10.2 / §9.8.10.5 — Evaluate a single materialization request
 * against the durable-surface registry. Returns a typed decision
 * instead of throwing so the caller (L5 coordinator or worker) can
 * route the result to quarantine/audit.
 */
export function evaluateL9Materialization(
  req: L9MaterializationRequest,
  registry: L9DurableSurfaceRegistry = L9DurableSurfaceRegistry.default(),
): L9MaterializationDecision {
  const violations: L9PersistenceViolation[] = [];
  const env = req.envelope;

  const surface = registry.get(env.durable_surface_id);
  if (!surface) {
    violations.push(v(
      L9PersistenceViolationCode.PERSIST_SURFACE_UNREGISTERED,
      `Durable surface ${env.durable_surface_id} is not registered.`,
    ));
    return { admissible: false, violations, surface: null };
  }

  if (!env.routes_through_l5) {
    violations.push(v(
      L9PersistenceViolationCode.PERSIST_NOT_ROUTED_THROUGH_L5,
      `Envelope ${env.envelope_id} did not route through L5 ` +
        `(INV-9.8-A).`,
    ));
  }

  if (!surface.materialization_modes_allowed.includes(env.materialization_mode)) {
    violations.push(v(
      L9PersistenceViolationCode.MAT_MODE_ILLEGAL_FOR_TARGET,
      `Mode ${env.materialization_mode} illegal for ` +
        `${surface.durable_surface_id}.`,
    ));
  }

  if (!req.readiness.contract_valid) {
    violations.push(v(
      L9PersistenceViolationCode.MAT_CONTRACT_INVALID,
      `Envelope ${env.envelope_id} contract is invalid.`,
    ));
  }
  if (!req.readiness.readiness_not_blocked) {
    violations.push(v(
      L9PersistenceViolationCode.MAT_READINESS_BLOCKED,
      `Envelope ${env.envelope_id} has BLOCKED readiness.`,
    ));
  }
  if (surface.required_evidence_fields.length > 0 && !req.readiness.evidence_present) {
    violations.push(v(
      L9PersistenceViolationCode.MAT_EVIDENCE_REQUIRED_MISSING,
      `Evidence required for ${surface.durable_surface_id} but not present.`,
    ));
  }
  if (!req.readiness.lineage_complete) {
    violations.push(v(
      L9PersistenceViolationCode.MAT_LINEAGE_INCOMPLETE,
      `Lineage incomplete for ${env.envelope_id}.`,
    ));
  }
  if (surface.required_replay_fields.length > 0 && !req.readiness.replay_identity_present) {
    violations.push(v(
      L9PersistenceViolationCode.MAT_REPLAY_IDENTITY_MISSING,
      `Replay identity required for ${surface.durable_surface_id} but ` +
        `not present.`,
    ));
  }

  // §9.8.10.5 — repair pretending to be live, append pretending to
  // supersede current.
  if (
    env.materialization_mode === L9MaterializationMode.REPAIR_REBUILD &&
    surface.persistence_class === L9PersistenceClass.CURRENT_AUTHORITY_SURFACE &&
    !req.supersession_linkage_recorded
  ) {
    violations.push(v(
      L9PersistenceViolationCode.MAT_REPAIR_PRETENDS_LIVE,
      `Repair write to ${surface.durable_surface_id} without ` +
        `supersession linkage.`,
    ));
  }
  if (
    env.materialization_mode === L9MaterializationMode.LIVE_HISTORICAL_APPEND &&
    surface.persistence_class === L9PersistenceClass.CURRENT_AUTHORITY_SURFACE
  ) {
    violations.push(v(
      L9PersistenceViolationCode.MAT_APPEND_PRETENDS_CURRENT,
      `LIVE_HISTORICAL_APPEND targeted current-authority surface ` +
        `${surface.durable_surface_id}.`,
    ));
  }

  // §9.8.10.4 — serving class ↔ surface cross-check.
  if (!servingClassMatchesClass(env.serving_class, surface)) {
    violations.push(v(
      L9PersistenceViolationCode.PERSIST_SERVING_CLASS_MISMATCH,
      `Serving class ${env.serving_class} does not match ` +
        `${surface.persistence_class} (${surface.durable_surface_id}).`,
    ));
  }

  return {
    admissible: violations.length === 0,
    violations,
    surface,
  };
}

function servingClassMatchesClass(
  serving: L9SequenceServingClass,
  surface: L9DurableSurface,
): boolean {
  switch (surface.persistence_class) {
    case L9PersistenceClass.CURRENT_AUTHORITY_SURFACE:
      return (
        serving === L9SequenceServingClass.CURRENT_SEQUENCE_STATE ||
        serving === L9SequenceServingClass.CURRENT_PHASE_STATE ||
        serving === L9SequenceServingClass.CURRENT_DECAY_STATE ||
        serving === L9SequenceServingClass.CURRENT_RELIANCE_STATE
      );
    case L9PersistenceClass.HISTORICAL_FACT_SURFACE:
      return serving === L9SequenceServingClass.HISTORICAL_SEQUENCE_FACT;
    case L9PersistenceClass.TRANSITION_SURFACE:
      return serving === L9SequenceServingClass.TRANSITION_FACT;
    case L9PersistenceClass.FAILURE_SURFACE:
      return serving === L9SequenceServingClass.FAILURE_FACT;
    case L9PersistenceClass.EVIDENCE_SURFACE:
      return serving === L9SequenceServingClass.EVIDENCE_POINTER;
    case L9PersistenceClass.LINEAGE_SURFACE:
      return serving === L9SequenceServingClass.LINEAGE_POINTER;
    case L9PersistenceClass.DEFINITION_SURFACE:
    case L9PersistenceClass.RUN_SURFACE:
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

/**
 * §9.8.2.5 — Evidence-pointer builder convenience. The
 * `durable_surface_id` is optional because callers that already know
 * they are targeting the evidence store can skip it.
 */
export function l9DefaultEvidenceSurface(): L9DurableSurfaceId {
  return L9DurableSurfaceId.SEQUENCE_EVIDENCE_STORE;
}
