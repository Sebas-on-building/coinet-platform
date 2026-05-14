/**
 * L12.3 — Scenario input requirement contract (§12.3.4).
 *
 * Each requirement declares the source layer, surface class, requirement
 * class, purpose, scope/freshness/restriction/evidence requirements, and
 * staleness window for one input the subject contract pulls from L7–L11.
 */

import {
  L12DependencyLayer,
  L12DependencySurfaceClass,
} from './l12-constitutional-types';

export enum L12ScenarioInputPurpose {
  PATH_SUPPORT = 'PATH_SUPPORT',
  PATH_CONTRADICTION = 'PATH_CONTRADICTION',
  TRIGGER_INPUT = 'TRIGGER_INPUT',
  INVALIDATION_INPUT = 'INVALIDATION_INPUT',
  SHIFT_CONDITION_INPUT = 'SHIFT_CONDITION_INPUT',
  RESTRICTION_INPUT = 'RESTRICTION_INPUT',
  EVIDENCE_DISCLOSURE = 'EVIDENCE_DISCLOSURE',
  HISTORICAL_CONTEXT = 'HISTORICAL_CONTEXT',
}

export const ALL_L12_SCENARIO_INPUT_PURPOSES: readonly L12ScenarioInputPurpose[] =
  Object.values(L12ScenarioInputPurpose);

export enum L12ScenarioInputRequirementClass {
  REQUIRED_VALIDATION_INPUT = 'REQUIRED_VALIDATION_INPUT',
  REQUIRED_REGIME_INPUT = 'REQUIRED_REGIME_INPUT',
  REQUIRED_SEQUENCE_INPUT = 'REQUIRED_SEQUENCE_INPUT',
  REQUIRED_HYPOTHESIS_INPUT = 'REQUIRED_HYPOTHESIS_INPUT',
  REQUIRED_SCORE_CONTEXT_INPUT = 'REQUIRED_SCORE_CONTEXT_INPUT',
  REQUIRED_GRAPH_CONTEXT_INPUT = 'REQUIRED_GRAPH_CONTEXT_INPUT',
  OPTIONAL_CONTEXT_INPUT = 'OPTIONAL_CONTEXT_INPUT',
  HISTORICAL_INPUT = 'HISTORICAL_INPUT',
  EVIDENCE_ONLY_INPUT = 'EVIDENCE_ONLY_INPUT',
}

export const ALL_L12_SCENARIO_INPUT_REQUIREMENT_CLASSES: readonly L12ScenarioInputRequirementClass[] =
  Object.values(L12ScenarioInputRequirementClass);

export interface L12ScenarioInputRequirement {
  readonly input_requirement_id: string;

  readonly source_layer: L12DependencyLayer;
  readonly surface_class: L12DependencySurfaceClass;

  readonly requirement_class: L12ScenarioInputRequirementClass;

  readonly required_for: readonly L12ScenarioInputPurpose[];

  readonly scope_match_required: boolean;
  readonly freshness_required: boolean;
  readonly restriction_consumption_required: boolean;
  readonly contradiction_consumption_required: boolean;
  readonly evidence_required: boolean;
  readonly lineage_required: boolean;
  readonly replay_hash_required: boolean;

  readonly max_staleness_ms?: number;

  readonly allow_evidence_only: boolean;
  readonly allow_historical: boolean;

  readonly policy_version: string;
}

export function isL12RequiredScenarioInputClass(
  c: L12ScenarioInputRequirementClass,
): boolean {
  return (
    c === L12ScenarioInputRequirementClass.REQUIRED_VALIDATION_INPUT ||
    c === L12ScenarioInputRequirementClass.REQUIRED_REGIME_INPUT ||
    c === L12ScenarioInputRequirementClass.REQUIRED_SEQUENCE_INPUT ||
    c === L12ScenarioInputRequirementClass.REQUIRED_HYPOTHESIS_INPUT ||
    c === L12ScenarioInputRequirementClass.REQUIRED_SCORE_CONTEXT_INPUT ||
    c === L12ScenarioInputRequirementClass.REQUIRED_GRAPH_CONTEXT_INPUT
  );
}
