/**
 * L12.5 — Scenario template requirement patterns (§12.5.2.2).
 *
 * Patterns are the *machine-governed declarations* a template uses to require
 * a specific lower-layer posture, score posture, or condition/trigger/
 * invalidation shape. They are NOT free-text prose: each pattern carries an
 * explicit `pattern_id`, the surface or layer it consults, and a verdict
 * effect that the evaluator must enforce.
 */

import {
  L12ConditionMaterialityClass,
  L12ConditionRole,
  L12ConditionSourceLayer,
  L12ScenarioConditionType,
} from './scenario-condition';
import {
  L12InvalidationEffect,
  L12InvalidationType,
} from './scenario-invalidation';
import { L12TriggerEffect, L12TriggerType } from './scenario-trigger';

/* ────────────────────────────────────────────────────────────────────── */
/* Common pattern primitives                                              */
/* ────────────────────────────────────────────────────────────────────── */

/** Pattern verdict the evaluator emits per pattern. */
export enum L12TemplatePatternVerdict {
  SATISFIED = 'SATISFIED',
  PARTIAL = 'PARTIAL',
  NARROWED = 'NARROWED',
  MISSING = 'MISSING',
  BLOCKED = 'BLOCKED',
}

export const ALL_L12_TEMPLATE_PATTERN_VERDICTS: readonly L12TemplatePatternVerdict[] =
  Object.values(L12TemplatePatternVerdict);

/** Pattern materiality (must-have vs. nice-to-have). */
export enum L12TemplatePatternMateriality {
  REQUIRED = 'REQUIRED',
  PREFERRED = 'PREFERRED',
  EXCLUDING = 'EXCLUDING',
}

export const ALL_L12_TEMPLATE_PATTERN_MATERIALITIES: readonly L12TemplatePatternMateriality[] =
  Object.values(L12TemplatePatternMateriality);

interface L12TemplatePatternBase {
  readonly pattern_id: string;
  readonly pattern_name: string;
  readonly pattern_materiality: L12TemplatePatternMateriality;
  readonly narrows_readiness_when_unsatisfied: boolean;
  readonly blocks_template_when_unsatisfied: boolean;
}

/* ────────────────────────────────────────────────────────────────────── */
/* L8 regime patterns                                                     */
/* ────────────────────────────────────────────────────────────────────── */

export interface L12TemplateRegimePattern extends L12TemplatePatternBase {
  readonly required_regime_states: readonly string[];
  readonly forbidden_regime_states: readonly string[];
  readonly narrowing_regime_states: readonly string[];
}

/* ────────────────────────────────────────────────────────────────────── */
/* L9 sequence patterns                                                   */
/* ────────────────────────────────────────────────────────────────────── */

export interface L12TemplateSequencePattern extends L12TemplatePatternBase {
  readonly required_sequence_states: readonly string[];
  readonly forbidden_sequence_states: readonly string[];
  readonly narrowing_sequence_states: readonly string[];
  readonly decay_must_not_be_dominant: boolean;
}

/* ────────────────────────────────────────────────────────────────────── */
/* L10 hypothesis patterns                                                */
/* ────────────────────────────────────────────────────────────────────── */

export interface L12TemplateHypothesisPattern extends L12TemplatePatternBase {
  readonly required_primary_hypotheses: readonly string[];
  readonly forbidden_primary_hypotheses: readonly string[];
  readonly tolerated_secondary_hypotheses: readonly string[];
  readonly require_non_narrow_spread: boolean;
}

/* ────────────────────────────────────────────────────────────────────── */
/* L11 score patterns                                                     */
/* ────────────────────────────────────────────────────────────────────── */

/** Logical operator for score-band requirements. */
export enum L12TemplateScoreBandOperator {
  GREATER_OR_EQUAL = 'GREATER_OR_EQUAL',
  LESS_OR_EQUAL = 'LESS_OR_EQUAL',
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  IN_BAND = 'IN_BAND',
  NOT_IN_BAND = 'NOT_IN_BAND',
  NOT_BLOCKED = 'NOT_BLOCKED',
  NOT_EXTREME = 'NOT_EXTREME',
}

export const ALL_L12_TEMPLATE_SCORE_BAND_OPERATORS: readonly L12TemplateScoreBandOperator[] =
  Object.values(L12TemplateScoreBandOperator);

export interface L12TemplateScorePattern extends L12TemplatePatternBase {
  /** L11 score family identifier (e.g., `OPPORTUNITY_SCORE`). */
  readonly score_family_ref: string;
  readonly operator: L12TemplateScoreBandOperator;
  readonly required_band_refs: readonly string[];
  readonly forbidden_band_refs: readonly string[];
  /** A pattern is illegal if it bypasses the L11 score-context bundle. */
  readonly requires_full_score_context_bundle: boolean;
}

/* ────────────────────────────────────────────────────────────────────── */
/* L7 validation patterns                                                 */
/* ────────────────────────────────────────────────────────────────────── */

export interface L12TemplateValidationPattern extends L12TemplatePatternBase {
  readonly contradiction_must_be_manageable: boolean;
  readonly contradiction_must_not_be_severe: boolean;
  readonly required_validation_classes: readonly string[];
  readonly forbidden_validation_classes: readonly string[];
}

/* ────────────────────────────────────────────────────────────────────── */
/* Condition patterns                                                     */
/* ────────────────────────────────────────────────────────────────────── */

export interface L12TemplateConditionPattern extends L12TemplatePatternBase {
  readonly condition_type: L12ScenarioConditionType;
  readonly condition_role: L12ConditionRole;
  readonly source_layer: L12ConditionSourceLayer;
  readonly required_surface_ref: string;
  readonly required_materiality: L12ConditionMaterialityClass;
  /** Conditions used as triggers/invalidations must be monitorable. */
  readonly must_be_monitorable: boolean;
}

/* ────────────────────────────────────────────────────────────────────── */
/* Trigger patterns                                                       */
/* ────────────────────────────────────────────────────────────────────── */

export interface L12TemplateTriggerPattern extends L12TemplatePatternBase {
  readonly trigger_type: L12TriggerType;
  readonly trigger_name: string;
  readonly expected_effect: L12TriggerEffect;
  readonly required_condition_pattern_refs: readonly string[];
  readonly required_evidence_classes: readonly string[];
  readonly must_be_monitorable: boolean;
  readonly minimum_strength_band_for_decisive: 'STRONG' | 'DECISIVE';
}

/* ────────────────────────────────────────────────────────────────────── */
/* Invalidation patterns                                                  */
/* ────────────────────────────────────────────────────────────────────── */

export interface L12TemplateInvalidationPattern extends L12TemplatePatternBase {
  readonly invalidation_type: L12InvalidationType;
  readonly invalidation_name: string;
  readonly expected_effect: L12InvalidationEffect;
  readonly required_condition_pattern_refs: readonly string[];
  readonly required_evidence_classes: readonly string[];
  readonly must_be_monitorable: boolean;
  /** Required when active. */
  readonly forces_confidence_cap_when_active: boolean;
  /** Blocking invalidation must block clean readiness. */
  readonly blocks_clean_readiness_when_blocking: boolean;
}
