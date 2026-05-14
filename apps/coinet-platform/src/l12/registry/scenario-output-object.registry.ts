/**
 * L12.2 — Scenario output-object registry (§12.2.16).
 *
 * Bridges scenario object types to L12.1 output surface classes:
 *   - declares which L12.1 output surface a given scenario object emits to
 *   - rejects emissions whose object type does not map to a legal surface
 *
 * The L12.1 constitutional output-surface registry continues to enforce
 * field-level emission laws; this registry only governs the type→surface map.
 */

import { L12OutputSurfaceClass } from '../contracts/l12-constitutional-types';

export enum L12ScenarioOutputObjectKind {
  SCENARIO_SET = 'SCENARIO_SET',
  BASE_CASE_SCENARIO = 'BASE_CASE_SCENARIO',
  BULLISH_CONTINUATION_SCENARIO = 'BULLISH_CONTINUATION_SCENARIO',
  BEARISH_FAILURE_SCENARIO = 'BEARISH_FAILURE_SCENARIO',
  TRIGGER_PROFILE = 'TRIGGER_PROFILE',
  INVALIDATION_PROFILE = 'INVALIDATION_PROFILE',
  PATH_CONFIDENCE_PROFILE = 'PATH_CONFIDENCE_PROFILE',
  SCENARIO_SHIFT_CONDITION_SET = 'SCENARIO_SHIFT_CONDITION_SET',
  SCENARIO_RESTRICTION_PROFILE = 'SCENARIO_RESTRICTION_PROFILE',
  SCENARIO_EVIDENCE_READ_SURFACE = 'SCENARIO_EVIDENCE_READ_SURFACE',
  SCENARIO_LINEAGE_READ_SURFACE = 'SCENARIO_LINEAGE_READ_SURFACE',
}

export const ALL_L12_SCENARIO_OUTPUT_OBJECT_KINDS: readonly L12ScenarioOutputObjectKind[] =
  Object.values(L12ScenarioOutputObjectKind);

const KIND_TO_SURFACE: Readonly<Record<L12ScenarioOutputObjectKind, L12OutputSurfaceClass>> = {
  [L12ScenarioOutputObjectKind.SCENARIO_SET]: L12OutputSurfaceClass.SCENARIO_SET,
  [L12ScenarioOutputObjectKind.BASE_CASE_SCENARIO]: L12OutputSurfaceClass.BASE_CASE_SCENARIO,
  [L12ScenarioOutputObjectKind.BULLISH_CONTINUATION_SCENARIO]:
    L12OutputSurfaceClass.BULLISH_CONTINUATION_SCENARIO,
  [L12ScenarioOutputObjectKind.BEARISH_FAILURE_SCENARIO]:
    L12OutputSurfaceClass.BEARISH_FAILURE_SCENARIO,
  [L12ScenarioOutputObjectKind.TRIGGER_PROFILE]: L12OutputSurfaceClass.TRIGGER_PROFILE,
  [L12ScenarioOutputObjectKind.INVALIDATION_PROFILE]: L12OutputSurfaceClass.INVALIDATION_PROFILE,
  [L12ScenarioOutputObjectKind.PATH_CONFIDENCE_PROFILE]:
    L12OutputSurfaceClass.PATH_CONFIDENCE_PROFILE,
  [L12ScenarioOutputObjectKind.SCENARIO_SHIFT_CONDITION_SET]:
    L12OutputSurfaceClass.SCENARIO_SHIFT_CONDITION_SET,
  [L12ScenarioOutputObjectKind.SCENARIO_RESTRICTION_PROFILE]:
    L12OutputSurfaceClass.SCENARIO_RESTRICTION_PROFILE,
  [L12ScenarioOutputObjectKind.SCENARIO_EVIDENCE_READ_SURFACE]:
    L12OutputSurfaceClass.SCENARIO_EVIDENCE_READ_SURFACE,
  [L12ScenarioOutputObjectKind.SCENARIO_LINEAGE_READ_SURFACE]:
    L12OutputSurfaceClass.SCENARIO_LINEAGE_READ_SURFACE,
};

export function getL12OutputSurfaceForObjectKind(
  kind: L12ScenarioOutputObjectKind,
): L12OutputSurfaceClass {
  return KIND_TO_SURFACE[kind];
}

export function isL12RegisteredScenarioOutputObjectKind(
  kind: L12ScenarioOutputObjectKind,
): boolean {
  return Object.prototype.hasOwnProperty.call(KIND_TO_SURFACE, kind);
}

export function isL12LegalObjectKindSurfacePair(
  kind: L12ScenarioOutputObjectKind,
  surfaceClass: L12OutputSurfaceClass,
): boolean {
  return KIND_TO_SURFACE[kind] === surfaceClass;
}
