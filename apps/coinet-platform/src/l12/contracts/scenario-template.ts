/**
 * L12.5 — Scenario template doctrine (§12.5.2).
 *
 * A scenario template is a governed conditional-path blueprint. It is illegal
 * to declare a template that says only "bullish" or "bearish": every template
 * must declare family, legal types, required postures, conditions, triggers,
 * invalidations, confidence policy, evidence classes, restrictions, and rollout
 * status.
 */

import { L12ScenarioFamily } from './scenario-family';
import { L12ScenarioType } from './scenario-type';

import type {
  L12TemplateConditionPattern,
  L12TemplateHypothesisPattern,
  L12TemplateInvalidationPattern,
  L12TemplateRegimePattern,
  L12TemplateScorePattern,
  L12TemplateSequencePattern,
  L12TemplateTriggerPattern,
  L12TemplateValidationPattern,
} from './scenario-template-patterns';

/** Production status of a template (§12.5.2.3). */
export enum L12ScenarioTemplateProductionStatus {
  PRODUCTION_ENABLED = 'PRODUCTION_ENABLED',
  SHADOW_ONLY = 'SHADOW_ONLY',
  RESERVED = 'RESERVED',
  BLOCKED = 'BLOCKED',
}

export const ALL_L12_SCENARIO_TEMPLATE_PRODUCTION_STATUSES: readonly L12ScenarioTemplateProductionStatus[] =
  Object.values(L12ScenarioTemplateProductionStatus);

/**
 * Canonical launch slate of production scenario templates (§12.5.3).
 *
 * Each template id is governed and frozen. Adding ids requires explicit
 * registry registration plus rollout policy approval.
 */
export enum L12ScenarioTemplateId {
  SPOT_LED_CONTINUATION_V1 = 'SPOT_LED_CONTINUATION_V1',
  LEVERAGE_DRIVEN_CONTINUATION_WITH_FRAGILITY_V1 = 'LEVERAGE_DRIVEN_CONTINUATION_WITH_FRAGILITY_V1',
  POST_UNLOCK_DIGESTION_V1 = 'POST_UNLOCK_DIGESTION_V1',
  THIN_LIQUIDITY_FAILURE_V1 = 'THIN_LIQUIDITY_FAILURE_V1',
  DISTRIBUTION_UNDER_HYPE_REVERSAL_V1 = 'DISTRIBUTION_UNDER_HYPE_REVERSAL_V1',
  NARRATIVE_REFLEXIVE_EXTENSION_V1 = 'NARRATIVE_REFLEXIVE_EXTENSION_V1',
  CHOP_UNRESOLVED_MULTI_PATH_V1 = 'CHOP_UNRESOLVED_MULTI_PATH_V1',
}

export const ALL_L12_SCENARIO_TEMPLATE_IDS: readonly L12ScenarioTemplateId[] =
  Object.values(L12ScenarioTemplateId);

/** Evidence classes a template must reference (§12.5.2.2). */
export enum L12ScenarioTemplateEvidenceClass {
  L7_VALIDATION_EVIDENCE = 'L7_VALIDATION_EVIDENCE',
  L7_CONTRADICTION_EVIDENCE = 'L7_CONTRADICTION_EVIDENCE',
  L8_REGIME_EVIDENCE = 'L8_REGIME_EVIDENCE',
  L8_LIQUIDITY_EVIDENCE = 'L8_LIQUIDITY_EVIDENCE',
  L9_SEQUENCE_EVIDENCE = 'L9_SEQUENCE_EVIDENCE',
  L10_HYPOTHESIS_EVIDENCE = 'L10_HYPOTHESIS_EVIDENCE',
  L11_SCORE_CONTEXT_EVIDENCE = 'L11_SCORE_CONTEXT_EVIDENCE',
  L11_DRIFT_EVIDENCE = 'L11_DRIFT_EVIDENCE',
  L11_MISSING_DATA_EVIDENCE = 'L11_MISSING_DATA_EVIDENCE',
  L11_ATTRIBUTION_EVIDENCE = 'L11_ATTRIBUTION_EVIDENCE',
}

export const ALL_L12_SCENARIO_TEMPLATE_EVIDENCE_CLASSES: readonly L12ScenarioTemplateEvidenceClass[] =
  Object.values(L12ScenarioTemplateEvidenceClass);

/**
 * §12.5.2.2 — Production-grade scenario template definition.
 */
export interface L12ScenarioTemplateDefinition {
  readonly template_id: L12ScenarioTemplateId;
  readonly template_name: string;
  readonly template_doctrine_summary: string;
  readonly template_version: string;

  readonly scenario_family: L12ScenarioFamily;
  readonly legal_scenario_types: readonly L12ScenarioType[];

  readonly applicable_scope_types: readonly string[];

  readonly required_regime_patterns: readonly L12TemplateRegimePattern[];
  readonly required_sequence_patterns: readonly L12TemplateSequencePattern[];
  readonly required_hypothesis_patterns: readonly L12TemplateHypothesisPattern[];
  readonly required_score_patterns: readonly L12TemplateScorePattern[];
  readonly required_validation_patterns: readonly L12TemplateValidationPattern[];

  readonly required_condition_patterns: readonly L12TemplateConditionPattern[];

  readonly trigger_patterns: readonly L12TemplateTriggerPattern[];
  readonly invalidation_patterns: readonly L12TemplateInvalidationPattern[];

  readonly confidence_policy_ref: string;
  readonly confidence_cap_policy_ref: string;
  readonly spread_policy_ref: string;
  readonly readiness_policy_ref: string;
  readonly restriction_policy_ref: string;

  readonly required_evidence_classes: readonly L12ScenarioTemplateEvidenceClass[];

  readonly rollout_priority: number;
  readonly production_status: L12ScenarioTemplateProductionStatus;

  readonly policy_version: string;
}

export function isL12ProductionEnabledTemplate(
  d: L12ScenarioTemplateDefinition,
): boolean {
  return d.production_status === L12ScenarioTemplateProductionStatus.PRODUCTION_ENABLED;
}
