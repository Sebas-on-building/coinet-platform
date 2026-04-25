/**
 * L10.8 — Materialization Policy
 *
 * §10.8.10 — Single place governing whether a hypothesis result may
 * be materialized into a given durable surface. Keeps runtime engines
 * and validators on the same rules.
 *
 * Distinct from the L10.3 `L10HypothesisMaterializationPolicy`
 * per-subject policy: that governs *when* a subject recomputes;
 * this governs *whether a ready output may be persisted*.
 */

import {
  L10DurableSurface,
  L10DurableSurfaceId,
  L10HypothesisServingClass,
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

/**
 * §10.8.10.4 — Readiness flags the materialization policy consults.
 * Kept narrow and typed so the runtime cannot hide "well, sort of
 * ready" behind ad-hoc booleans.
 */
export interface L10MaterializationReadinessFlags {
  readonly contract_valid: boolean;
  readonly readiness_not_blocked: boolean;
  readonly evidence_present: boolean;
  readonly lineage_complete: boolean;
  readonly replay_identity_present: boolean;
}

export interface L10MaterializationRequest {
  readonly envelope: L10PersistenceEnvelope;
  readonly readiness: L10MaterializationReadinessFlags;
  /**
   * §10.8.5.4 — true iff the upstream coordinator has already written
   * a supersession-linkage row for this envelope (only meaningful
   * for current-authority surfaces).
   */
  readonly supersession_linkage_recorded: boolean;
}

export interface L10MaterializationDecision {
  readonly admissible: boolean;
  readonly violations: readonly L10PersistenceViolation[];
  readonly surface: L10DurableSurface | null;
}

/**
 * §10.8.10.2 / §10.8.10.5 — Evaluate a single materialization request
 * against the durable-surface registry. Returns a typed decision
 * instead of throwing so the caller (L5 coordinator or worker) can
 * route the result to quarantine/audit.
 */
export function evaluateL10Materialization(
  req: L10MaterializationRequest,
  registry: L10DurableSurfaceRegistry = L10DurableSurfaceRegistry.default(),
): L10MaterializationDecision {
  const violations: L10PersistenceViolation[] = [];
  const env = req.envelope;

  const surface = registry.get(env.durable_surface_id);
  if (!surface) {
    violations.push(v(
      L10PersistenceViolationCode.PERSIST_SURFACE_UNREGISTERED,
      `Durable surface ${env.durable_surface_id} is not registered.`,
    ));
    return { admissible: false, violations, surface: null };
  }

  if (!env.routes_through_l5) {
    violations.push(v(
      L10PersistenceViolationCode.PERSIST_NOT_ROUTED_THROUGH_L5,
      `Envelope ${env.envelope_id} did not route through L5 ` +
        `(INV-10.8-A).`,
    ));
  }

  if (
    !surface.materialization_modes_allowed.includes(env.materialization_mode)
  ) {
    violations.push(v(
      L10PersistenceViolationCode.MAT_MODE_ILLEGAL_FOR_TARGET,
      `Mode ${env.materialization_mode} illegal for ` +
        `${surface.durable_surface_id}.`,
    ));
  }

  if (!req.readiness.contract_valid) {
    violations.push(v(
      L10PersistenceViolationCode.MAT_CONTRACT_INVALID,
      `Envelope ${env.envelope_id} contract is invalid.`,
    ));
  }
  if (!req.readiness.readiness_not_blocked) {
    violations.push(v(
      L10PersistenceViolationCode.MAT_READINESS_BLOCKED,
      `Envelope ${env.envelope_id} has BLOCKED readiness.`,
    ));
  }
  if (
    surface.required_evidence_fields.length > 0 &&
    !req.readiness.evidence_present
  ) {
    violations.push(v(
      L10PersistenceViolationCode.MAT_EVIDENCE_REQUIRED_MISSING,
      `Evidence required for ${surface.durable_surface_id} but not present.`,
    ));
  }
  if (!req.readiness.lineage_complete) {
    violations.push(v(
      L10PersistenceViolationCode.MAT_LINEAGE_INCOMPLETE,
      `Lineage incomplete for ${env.envelope_id}.`,
    ));
  }
  if (
    surface.required_replay_fields.length > 0 &&
    !req.readiness.replay_identity_present
  ) {
    violations.push(v(
      L10PersistenceViolationCode.MAT_REPLAY_IDENTITY_MISSING,
      `Replay identity required for ${surface.durable_surface_id} but ` +
        `not present.`,
    ));
  }

  // §10.8.10.5 — repair pretending to be live, append pretending to
  // supersede current.
  if (
    env.materialization_mode === L10MaterializationMode.REPAIR_REBUILD &&
    surface.persistence_class ===
      L10PersistenceClass.CURRENT_AUTHORITY_SURFACE &&
    !req.supersession_linkage_recorded
  ) {
    violations.push(v(
      L10PersistenceViolationCode.MAT_REPAIR_PRETENDS_LIVE,
      `Repair write to ${surface.durable_surface_id} without ` +
        `supersession linkage.`,
    ));
  }
  if (
    env.materialization_mode ===
      L10MaterializationMode.LIVE_HISTORICAL_APPEND &&
    surface.persistence_class ===
      L10PersistenceClass.CURRENT_AUTHORITY_SURFACE
  ) {
    violations.push(v(
      L10PersistenceViolationCode.MAT_APPEND_PRETENDS_CURRENT,
      `LIVE_HISTORICAL_APPEND targeted current-authority surface ` +
        `${surface.durable_surface_id}.`,
    ));
  }

  // §10.8.10.4 — serving class ↔ surface cross-check.
  if (!servingClassMatchesClass(env.serving_class, surface)) {
    violations.push(v(
      L10PersistenceViolationCode.PERSIST_SERVING_CLASS_MISMATCH,
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
  serving: L10HypothesisServingClass,
  surface: L10DurableSurface,
): boolean {
  switch (surface.persistence_class) {
    case L10PersistenceClass.CURRENT_AUTHORITY_SURFACE:
      return (
        serving === L10HypothesisServingClass.CURRENT_HYPOTHESIS_STATE ||
        serving === L10HypothesisServingClass.CURRENT_RANKING_STATE ||
        serving === L10HypothesisServingClass.CURRENT_SPREAD_STATE ||
        serving === L10HypothesisServingClass.CURRENT_RELIANCE_STATE ||
        serving === L10HypothesisServingClass.CURRENT_CONFIRMATION_STATE ||
        serving === L10HypothesisServingClass.CURRENT_INVALIDATION_STATE ||
        serving === L10HypothesisServingClass.CURRENT_SHIFT_STATE
      );
    case L10PersistenceClass.HISTORICAL_FACT_SURFACE:
      return (
        serving === L10HypothesisServingClass.HISTORICAL_HYPOTHESIS_FACT
      );
    case L10PersistenceClass.TRANSITION_SURFACE:
      return serving === L10HypothesisServingClass.TRANSITION_FACT;
    case L10PersistenceClass.FAILURE_SURFACE:
      return serving === L10HypothesisServingClass.FAILURE_FACT;
    case L10PersistenceClass.EVIDENCE_SURFACE:
      return serving === L10HypothesisServingClass.EVIDENCE_POINTER;
    case L10PersistenceClass.LINEAGE_SURFACE:
      return serving === L10HypothesisServingClass.LINEAGE_POINTER;
    case L10PersistenceClass.DEFINITION_SURFACE:
    case L10PersistenceClass.RUN_SURFACE:
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

/**
 * §10.8.6 — Evidence-pointer builder convenience. Default evidence
 * surface id used when callers don't explicitly name one.
 */
export function l10DefaultEvidenceSurface(): L10DurableSurfaceId {
  return L10DurableSurfaceId.HYPOTHESIS_EVIDENCE_STORE;
}
