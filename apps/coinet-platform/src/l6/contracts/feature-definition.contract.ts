/**
 * L6.3 — Feature Definition Contract
 *
 * §6.3.3 — A feature definition is the governing constitution of one state
 * primitive. L6.3 extends L6.2's `FeatureContract` with the additional
 * declaration blocks required before compute runtime is allowed:
 *   - input role classification (truth / context / baseline / evidence-only)
 *   - bounds + canonical normalization method
 *   - coverage requirement class
 *   - freshness budget class
 *   - evidence/event link policy depth
 */

import { FeatureContract } from './feature-contract';
import { InputSurfaceRef } from './primitive-contract';
import {
  L6CoverageRequirementClass,
  L6FreshnessBudgetClass,
} from './materialization-policy';

export enum L6FeatureInputRole {
  TRUTH = 'TRUTH',
  CONTEXT = 'CONTEXT',
  BASELINE = 'BASELINE',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
}

export const ALL_FEATURE_INPUT_ROLES: readonly L6FeatureInputRole[] = Object.values(L6FeatureInputRole);

export interface RoledInputSurfaceRef extends InputSurfaceRef {
  readonly role: L6FeatureInputRole;
}

export interface FeatureValueBounds {
  readonly min: number | null;
  readonly max: number | null;
  readonly isBounded: boolean;
  readonly wraps: boolean;
}

export interface FeatureDefinitionExtensions {
  readonly required_truth_inputs: readonly RoledInputSurfaceRef[];
  readonly required_context_inputs: readonly RoledInputSurfaceRef[];
  readonly optional_context_inputs: readonly RoledInputSurfaceRef[];
  readonly baseline_inputs: readonly RoledInputSurfaceRef[];
  readonly evidence_only_inputs: readonly RoledInputSurfaceRef[];
  readonly bounds: FeatureValueBounds;
  readonly normalization_method: string;
  readonly coverage_requirement: L6CoverageRequirementClass;
  readonly freshness_budget_class: L6FreshnessBudgetClass;
  readonly definition_schema_version: string;
}

export interface FeatureDefinitionContract extends FeatureContract, FeatureDefinitionExtensions {}

export const REQUIRED_FEATURE_DEFINITION_BLOCKS: readonly string[] = [
  'identity',
  'scope',
  'value_model',
  'inputs',
  'temporal',
  'quality_confidence',
  'null_late_data',
  'materialization_evidence',
];

export const REQUIRED_FEATURE_DEFINITION_FIELDS: readonly string[] = [
  'primitive_id', 'family', 'name', 'version',
  'scope',
  'feature_kind', 'value_kind', 'unit', 'directionality', 'bounds', 'normalization_method',
  'required_inputs', 'required_truth_inputs',
  'required_history_windows', 'baseline_spec', 'freshness_budget', 'freshness_budget_class', 'warmup_requirement',
  'quality_gate_spec', 'confidence_derivation_spec', 'coverage_requirement',
  'null_policy', 'late_data_policy',
  'materialization_policy', 'evidence_pack_policy', 'event_link_policy',
  'definition_schema_version',
];
