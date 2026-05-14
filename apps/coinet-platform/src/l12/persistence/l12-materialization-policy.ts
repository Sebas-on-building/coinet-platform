/**
 * L12.6 — Materialization policy (§12.6.6).
 *
 * Encodes which materialization modes are legal for which durable surfaces,
 * and whether a given mode legitimately writes current authority or
 * historical-append surfaces.
 */

import {
  L12DurableSurfaceId,
  L12MaterializationMode,
  L12MutationDiscipline,
} from '../contracts/l12-persistence-surface';

const CURRENT_REGISTRIES: ReadonlySet<L12DurableSurfaceId> = new Set([
  L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY,
  L12DurableSurfaceId.CURRENT_TRIGGER_REGISTRY,
  L12DurableSurfaceId.CURRENT_INVALIDATION_REGISTRY,
  L12DurableSurfaceId.CURRENT_PATH_CONFIDENCE_REGISTRY,
  L12DurableSurfaceId.CURRENT_SHIFT_CONDITION_REGISTRY,
  L12DurableSurfaceId.CURRENT_SCENARIO_RESTRICTION_REGISTRY,
  L12DurableSurfaceId.CURRENT_SCENARIO_EVIDENCE_INDEX,
  L12DurableSurfaceId.CURRENT_SCENARIO_LINEAGE_INDEX,
]);

const TEMPLATE_OR_DEFINITIONS: ReadonlySet<L12DurableSurfaceId> = new Set([
  L12DurableSurfaceId.SCENARIO_SUBJECT_DEFINITIONS,
  L12DurableSurfaceId.SCENARIO_TEMPLATE_DEFINITIONS,
  L12DurableSurfaceId.SCENARIO_RUNS,
]);

const HISTORICAL_SURFACES: ReadonlySet<L12DurableSurfaceId> = new Set([
  L12DurableSurfaceId.SCENARIO_TRANSITIONS,
  L12DurableSurfaceId.SCENARIO_FAILURES,
]);

/**
 * Returns the modes legally allowed to write a given durable surface.
 */
export function l12LegalModesForSurface(
  surface: L12DurableSurfaceId,
): readonly L12MaterializationMode[] {
  if (CURRENT_REGISTRIES.has(surface)) {
    return [
      L12MaterializationMode.LIVE_CURRENT,
      L12MaterializationMode.REPAIR_SUPERSESSION,
      L12MaterializationMode.LATE_DATA_REMATERIALIZATION,
    ];
  }
  if (TEMPLATE_OR_DEFINITIONS.has(surface)) {
    return [
      L12MaterializationMode.LIVE_CURRENT,
      L12MaterializationMode.REPAIR_SUPERSESSION,
    ];
  }
  if (surface === L12DurableSurfaceId.SCENARIO_FAILURES) {
    return [L12MaterializationMode.FAILURE_RECORD];
  }
  if (HISTORICAL_SURFACES.has(surface)) {
    return [
      L12MaterializationMode.LIVE_HISTORICAL_APPEND,
      L12MaterializationMode.REPLAY_HISTORICAL,
      L12MaterializationMode.BACKFILL_HISTORICAL,
      L12MaterializationMode.LATE_DATA_REMATERIALIZATION,
      L12MaterializationMode.FAILURE_RECORD,
    ];
  }
  return [];
}

export function l12IsModeAllowedForSurface(
  surface: L12DurableSurfaceId,
  mode: L12MaterializationMode,
): boolean {
  return l12LegalModesForSurface(surface).includes(mode);
}

/**
 * Returns the canonical mutation discipline for a surface.
 */
export function l12CanonicalDisciplineForSurface(
  surface: L12DurableSurfaceId,
): L12MutationDiscipline {
  if (CURRENT_REGISTRIES.has(surface) || TEMPLATE_OR_DEFINITIONS.has(surface)) {
    return L12MutationDiscipline.CURRENT_UPSERT_WITH_SUPERSESSION;
  }
  if (surface === L12DurableSurfaceId.SCENARIO_FAILURES) {
    return L12MutationDiscipline.FAILURE_APPEND_ONLY;
  }
  if (surface === L12DurableSurfaceId.SCENARIO_TRANSITIONS) {
    return L12MutationDiscipline.TRANSITION_APPEND_ONLY;
  }
  return L12MutationDiscipline.APPEND_ONLY_HISTORY;
}

/**
 * SHADOW mode never writes anywhere authoritative.
 */
export function l12ShadowMaterializationIsAuthoritative(
  mode: L12MaterializationMode,
): boolean {
  return mode === L12MaterializationMode.SHADOW_EVALUATION ? false : false;
}
