/**
 * L12.5 — Template 7: Chop unresolved multi-path (§12.5.10).
 */

import {
  L12ConditionRole,
  L12ConditionSourceLayer,
  L12ScenarioConditionType,
} from '../contracts/scenario-condition';
import { L12ScenarioFamily } from '../contracts/scenario-family';
import {
  L12InvalidationEffect,
  L12InvalidationType,
} from '../contracts/scenario-invalidation';
import {
  L12ScenarioTemplateDefinition,
  L12ScenarioTemplateEvidenceClass,
  L12ScenarioTemplateId,
  L12ScenarioTemplateProductionStatus,
} from '../contracts/scenario-template';
import { L12TemplateScoreBandOperator } from '../contracts/scenario-template-patterns';
import { L12ScenarioType } from '../contracts/scenario-type';
import { L12TriggerEffect, L12TriggerType } from '../contracts/scenario-trigger';

import {
  TEMPLATE_POLICY_REFS,
  makeConditionPattern,
  makeHypothesisPattern,
  makeInvalidationPattern,
  makeRegimePattern,
  makeScorePattern,
  makeSequencePattern,
  makeTriggerPattern,
  makeValidationPattern,
} from './_template-helpers';

const POLICY_VERSION = 'l12.5.template.chop_unresolved_multi_path.v1';

export const L12_CHOP_UNRESOLVED_MULTI_PATH_V1: L12ScenarioTemplateDefinition = {
  template_id: L12ScenarioTemplateId.CHOP_UNRESOLVED_MULTI_PATH_V1,
  template_name: 'Chop / unresolved multi-path',
  template_doctrine_summary:
    'Range/chop path where no decisive continuation or failure path is sufficiently confirmed. Output must preserve uncertainty and never emit clean directional scenarios.',
  template_version: '1.0.0',

  scenario_family: L12ScenarioFamily.CHOP_CONTINUATION,
  legal_scenario_types: [
    L12ScenarioType.BASE_CASE,
    L12ScenarioType.NEUTRAL_CHOP,
    L12ScenarioType.INSUFFICIENT_DATA_CASE,
  ],

  applicable_scope_types: ['asset', 'asset_pair', 'sector', 'ecosystem', 'market'],

  required_regime_patterns: [
    makeRegimePattern({
      id: 'regime.chop_or_transition',
      name: 'L8 regime: CHOP or TRANSITION',
      required: ['CHOP', 'TRANSITION', 'AMBIGUOUS_REGIME'],
      narrowing: [],
    }),
  ],

  required_sequence_patterns: [
    makeSequencePattern({
      id: 'sequence.ambiguous',
      name: 'L9 sequence: ambiguous',
      required: ['AMBIGUOUS_SEQUENCE', 'PRE_NARRATIVE_ACCUMULATION'],
      decay_must_not_be_dominant: false,
    }),
  ],

  required_hypothesis_patterns: [
    makeHypothesisPattern({
      id: 'hyp.narrow_spread',
      name: 'L10 hypothesis: narrow spread',
      required_primary: [],
      tolerated_secondary: [],
      require_non_narrow_spread: false,
    }),
  ],

  required_score_patterns: [
    makeScorePattern({
      id: 'score.scores_mixed_or_narrowed',
      name: 'L11 scores mixed or visibility-narrowed',
      family: 'OPPORTUNITY_SCORE',
      operator: L12TemplateScoreBandOperator.NOT_BLOCKED,
    }),
    makeScorePattern({
      id: 'score.signal_confidence_observable',
      name: 'L11 Signal Confidence observable',
      family: 'SIGNAL_CONFIDENCE_SCORE',
      operator: L12TemplateScoreBandOperator.NOT_BLOCKED,
    }),
  ],

  required_validation_patterns: [
    makeValidationPattern({
      id: 'validation.contradiction_unresolved_or_moderate',
      name: 'L7 contradiction unresolved or moderate',
      manageable: false,
      not_severe: true,
    }),
  ],

  required_condition_patterns: [
    makeConditionPattern({
      id: 'cond.spread_narrow',
      name: 'L10 hypothesis spread narrow',
      type: L12ScenarioConditionType.HYPOTHESIS_CONDITION,
      role: L12ConditionRole.WEAKENS_PATH,
      source_layer: L12ConditionSourceLayer.L10,
      required_surface_ref: 'l10.hypothesis.spread',
    }),
    makeConditionPattern({
      id: 'cond.contradiction_unresolved',
      name: 'L7 contradiction unresolved',
      type: L12ScenarioConditionType.CONTRADICTION_CONDITION,
      role: L12ConditionRole.WEAKENS_PATH,
      source_layer: L12ConditionSourceLayer.L7,
      required_surface_ref: 'l7.contradiction',
    }),
  ],

  trigger_patterns: [
    makeTriggerPattern({
      id: 'trig.regime_break',
      name: 'clear regime break',
      trigger_type: L12TriggerType.RANKING_SHIFT_TRIGGER,
      expected_effect: L12TriggerEffect.PROMOTES_SECONDARY,
      required_evidence_classes: ['L8_REGIME_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.hypothesis_spread_widens',
      name: 'hypothesis spread widens',
      trigger_type: L12TriggerType.RANKING_SHIFT_TRIGGER,
      expected_effect: L12TriggerEffect.PROMOTES_SECONDARY,
      required_evidence_classes: ['L10_HYPOTHESIS_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.score_context_resolves',
      name: 'score context resolves',
      trigger_type: L12TriggerType.WATCH_TRIGGER,
      expected_effect: L12TriggerEffect.WATCH_ONLY,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.contradiction_pressure_declines',
      name: 'contradiction pressure declines',
      trigger_type: L12TriggerType.WATCH_TRIGGER,
      expected_effect: L12TriggerEffect.WATCH_ONLY,
      required_evidence_classes: ['L7_CONTRADICTION_EVIDENCE'],
    }),
  ],

  invalidation_patterns: [
    makeInvalidationPattern({
      id: 'inv.one_path_gains_decisive_evidence',
      name: 'one path gains decisive evidence',
      invalidation_type: L12InvalidationType.HYPOTHESIS_RANK_FLIP,
      expected_effect: L12InvalidationEffect.RANKING_FLIP,
      required_evidence_classes: ['L10_HYPOTHESIS_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.transition_resolves',
      name: 'transition resolves',
      invalidation_type: L12InvalidationType.REGIME_SHIFT,
      expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
      required_evidence_classes: ['L8_REGIME_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.confidence_spread_widens',
      name: 'confidence spread widens',
      invalidation_type: L12InvalidationType.HYPOTHESIS_RANK_FLIP,
      expected_effect: L12InvalidationEffect.RANKING_FLIP,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.missing_visibility_clears',
      name: 'missing visibility clears',
      invalidation_type: L12InvalidationType.MISSING_DATA_BLOCKER,
      expected_effect: L12InvalidationEffect.WATCH_ONLY,
      required_evidence_classes: ['L11_MISSING_DATA_EVIDENCE'],
    }),
  ],

  confidence_policy_ref: TEMPLATE_POLICY_REFS.confidence,
  confidence_cap_policy_ref: TEMPLATE_POLICY_REFS.cap,
  spread_policy_ref: TEMPLATE_POLICY_REFS.spread,
  readiness_policy_ref: TEMPLATE_POLICY_REFS.readiness,
  restriction_policy_ref: TEMPLATE_POLICY_REFS.restriction,

  required_evidence_classes: [
    L12ScenarioTemplateEvidenceClass.L7_CONTRADICTION_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L8_REGIME_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L9_SEQUENCE_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L10_HYPOTHESIS_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L11_SCORE_CONTEXT_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L11_MISSING_DATA_EVIDENCE,
  ],

  rollout_priority: 70,
  production_status: L12ScenarioTemplateProductionStatus.PRODUCTION_ENABLED,

  policy_version: POLICY_VERSION,
};
