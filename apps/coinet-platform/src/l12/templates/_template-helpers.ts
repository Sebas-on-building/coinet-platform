/**
 * L12.5 — Internal pattern helpers used by production templates.
 *
 * Reduces boilerplate when declaring §12.5.4 – §12.5.10 templates while
 * preserving full type safety and pattern materiality semantics.
 */

import {
  L12ConditionMaterialityClass,
  L12ConditionRole,
  L12ConditionSourceLayer,
  L12ScenarioConditionType,
} from '../contracts/scenario-condition';
import {
  L12InvalidationEffect,
  L12InvalidationType,
} from '../contracts/scenario-invalidation';
import {
  L12TemplateConditionPattern,
  L12TemplateHypothesisPattern,
  L12TemplateInvalidationPattern,
  L12TemplatePatternMateriality,
  L12TemplateRegimePattern,
  L12TemplateScoreBandOperator,
  L12TemplateScorePattern,
  L12TemplateSequencePattern,
  L12TemplateTriggerPattern,
  L12TemplateValidationPattern,
} from '../contracts/scenario-template-patterns';
import { L12TriggerEffect, L12TriggerType } from '../contracts/scenario-trigger';

export interface MakeRegimePatternArgs {
  id: string;
  name: string;
  required?: readonly string[];
  forbidden?: readonly string[];
  narrowing?: readonly string[];
  materiality?: L12TemplatePatternMateriality;
  blocks?: boolean;
  narrows?: boolean;
}

export function makeRegimePattern(a: MakeRegimePatternArgs): L12TemplateRegimePattern {
  return {
    pattern_id: a.id,
    pattern_name: a.name,
    pattern_materiality: a.materiality ?? L12TemplatePatternMateriality.REQUIRED,
    narrows_readiness_when_unsatisfied: a.narrows ?? true,
    blocks_template_when_unsatisfied: a.blocks ?? false,
    required_regime_states: a.required ?? [],
    forbidden_regime_states: a.forbidden ?? [],
    narrowing_regime_states: a.narrowing ?? [],
  };
}

export interface MakeSequencePatternArgs {
  id: string;
  name: string;
  required?: readonly string[];
  forbidden?: readonly string[];
  narrowing?: readonly string[];
  decay_must_not_be_dominant?: boolean;
  materiality?: L12TemplatePatternMateriality;
  blocks?: boolean;
  narrows?: boolean;
}

export function makeSequencePattern(a: MakeSequencePatternArgs): L12TemplateSequencePattern {
  return {
    pattern_id: a.id,
    pattern_name: a.name,
    pattern_materiality: a.materiality ?? L12TemplatePatternMateriality.REQUIRED,
    narrows_readiness_when_unsatisfied: a.narrows ?? true,
    blocks_template_when_unsatisfied: a.blocks ?? false,
    required_sequence_states: a.required ?? [],
    forbidden_sequence_states: a.forbidden ?? [],
    narrowing_sequence_states: a.narrowing ?? [],
    decay_must_not_be_dominant: a.decay_must_not_be_dominant ?? true,
  };
}

export interface MakeHypothesisPatternArgs {
  id: string;
  name: string;
  required_primary?: readonly string[];
  forbidden_primary?: readonly string[];
  tolerated_secondary?: readonly string[];
  require_non_narrow_spread?: boolean;
  materiality?: L12TemplatePatternMateriality;
  blocks?: boolean;
  narrows?: boolean;
}

export function makeHypothesisPattern(
  a: MakeHypothesisPatternArgs,
): L12TemplateHypothesisPattern {
  return {
    pattern_id: a.id,
    pattern_name: a.name,
    pattern_materiality: a.materiality ?? L12TemplatePatternMateriality.REQUIRED,
    narrows_readiness_when_unsatisfied: a.narrows ?? true,
    blocks_template_when_unsatisfied: a.blocks ?? false,
    required_primary_hypotheses: a.required_primary ?? [],
    forbidden_primary_hypotheses: a.forbidden_primary ?? [],
    tolerated_secondary_hypotheses: a.tolerated_secondary ?? [],
    require_non_narrow_spread: a.require_non_narrow_spread ?? false,
  };
}

export interface MakeScorePatternArgs {
  id: string;
  name: string;
  family: string;
  operator: L12TemplateScoreBandOperator;
  required_bands?: readonly string[];
  forbidden_bands?: readonly string[];
  materiality?: L12TemplatePatternMateriality;
  blocks?: boolean;
  narrows?: boolean;
  requires_full_bundle?: boolean;
}

export function makeScorePattern(a: MakeScorePatternArgs): L12TemplateScorePattern {
  return {
    pattern_id: a.id,
    pattern_name: a.name,
    pattern_materiality: a.materiality ?? L12TemplatePatternMateriality.REQUIRED,
    narrows_readiness_when_unsatisfied: a.narrows ?? true,
    blocks_template_when_unsatisfied: a.blocks ?? false,
    score_family_ref: a.family,
    operator: a.operator,
    required_band_refs: a.required_bands ?? [],
    forbidden_band_refs: a.forbidden_bands ?? [],
    requires_full_score_context_bundle: a.requires_full_bundle ?? true,
  };
}

export interface MakeValidationPatternArgs {
  id: string;
  name: string;
  manageable?: boolean;
  not_severe?: boolean;
  required_classes?: readonly string[];
  forbidden_classes?: readonly string[];
  materiality?: L12TemplatePatternMateriality;
  blocks?: boolean;
  narrows?: boolean;
}

export function makeValidationPattern(
  a: MakeValidationPatternArgs,
): L12TemplateValidationPattern {
  return {
    pattern_id: a.id,
    pattern_name: a.name,
    pattern_materiality: a.materiality ?? L12TemplatePatternMateriality.REQUIRED,
    narrows_readiness_when_unsatisfied: a.narrows ?? true,
    blocks_template_when_unsatisfied: a.blocks ?? false,
    contradiction_must_be_manageable: a.manageable ?? true,
    contradiction_must_not_be_severe: a.not_severe ?? true,
    required_validation_classes: a.required_classes ?? [],
    forbidden_validation_classes: a.forbidden_classes ?? [],
  };
}

export interface MakeConditionPatternArgs {
  id: string;
  name: string;
  type: L12ScenarioConditionType;
  role: L12ConditionRole;
  source_layer: L12ConditionSourceLayer;
  required_surface_ref: string;
  required_materiality?: L12ConditionMaterialityClass;
  must_be_monitorable?: boolean;
  materiality?: L12TemplatePatternMateriality;
  blocks?: boolean;
  narrows?: boolean;
}

export function makeConditionPattern(
  a: MakeConditionPatternArgs,
): L12TemplateConditionPattern {
  return {
    pattern_id: a.id,
    pattern_name: a.name,
    pattern_materiality: a.materiality ?? L12TemplatePatternMateriality.REQUIRED,
    narrows_readiness_when_unsatisfied: a.narrows ?? true,
    blocks_template_when_unsatisfied: a.blocks ?? false,
    condition_type: a.type,
    condition_role: a.role,
    source_layer: a.source_layer,
    required_surface_ref: a.required_surface_ref,
    required_materiality: a.required_materiality ?? L12ConditionMaterialityClass.MATERIAL,
    must_be_monitorable: a.must_be_monitorable ?? true,
  };
}

export interface MakeTriggerPatternArgs {
  id: string;
  name: string;
  trigger_type: L12TriggerType;
  expected_effect: L12TriggerEffect;
  required_condition_pattern_refs?: readonly string[];
  required_evidence_classes?: readonly string[];
  must_be_monitorable?: boolean;
  decisive_floor?: 'STRONG' | 'DECISIVE';
  materiality?: L12TemplatePatternMateriality;
  blocks?: boolean;
  narrows?: boolean;
}

export function makeTriggerPattern(a: MakeTriggerPatternArgs): L12TemplateTriggerPattern {
  return {
    pattern_id: a.id,
    pattern_name: a.name,
    pattern_materiality: a.materiality ?? L12TemplatePatternMateriality.REQUIRED,
    narrows_readiness_when_unsatisfied: a.narrows ?? false,
    blocks_template_when_unsatisfied: a.blocks ?? false,
    trigger_type: a.trigger_type,
    trigger_name: a.name,
    expected_effect: a.expected_effect,
    required_condition_pattern_refs: a.required_condition_pattern_refs ?? [],
    required_evidence_classes: a.required_evidence_classes ?? [],
    must_be_monitorable: a.must_be_monitorable ?? true,
    minimum_strength_band_for_decisive: a.decisive_floor ?? 'STRONG',
  };
}

export interface MakeInvalidationPatternArgs {
  id: string;
  name: string;
  invalidation_type: L12InvalidationType;
  expected_effect: L12InvalidationEffect;
  required_condition_pattern_refs?: readonly string[];
  required_evidence_classes?: readonly string[];
  must_be_monitorable?: boolean;
  forces_cap_when_active?: boolean;
  blocks_clean_when_blocking?: boolean;
  materiality?: L12TemplatePatternMateriality;
  blocks?: boolean;
  narrows?: boolean;
}

export function makeInvalidationPattern(
  a: MakeInvalidationPatternArgs,
): L12TemplateInvalidationPattern {
  return {
    pattern_id: a.id,
    pattern_name: a.name,
    pattern_materiality: a.materiality ?? L12TemplatePatternMateriality.REQUIRED,
    narrows_readiness_when_unsatisfied: a.narrows ?? true,
    blocks_template_when_unsatisfied: a.blocks ?? false,
    invalidation_type: a.invalidation_type,
    invalidation_name: a.name,
    expected_effect: a.expected_effect,
    required_condition_pattern_refs: a.required_condition_pattern_refs ?? [],
    required_evidence_classes: a.required_evidence_classes ?? [],
    must_be_monitorable: a.must_be_monitorable ?? true,
    forces_confidence_cap_when_active: a.forces_cap_when_active ?? true,
    blocks_clean_readiness_when_blocking: a.blocks_clean_when_blocking ?? true,
  };
}

/* Default policy refs (shared across templates). */
export const TEMPLATE_POLICY_REFS = {
  confidence: 'l12.path_confidence_policy.default.v1',
  cap: 'l12.path_confidence_cap_policy.default.v1',
  spread: 'l12.spread_policy.default.v1',
  readiness: 'l12.readiness_policy.default.v1',
  restriction: 'l12.restriction_policy.default.v1',
} as const;
