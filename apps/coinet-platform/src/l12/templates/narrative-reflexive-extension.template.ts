/**
 * L12.5 — Template 6: Narrative reflexive extension (§12.5.9).
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

const POLICY_VERSION = 'l12.5.template.narrative_reflexive_extension.v1';

export const L12_NARRATIVE_REFLEXIVE_EXTENSION_V1: L12ScenarioTemplateDefinition = {
  template_id: L12ScenarioTemplateId.NARRATIVE_REFLEXIVE_EXTENSION_V1,
  template_name: 'Narrative reflexive extension',
  template_doctrine_summary:
    'Continuation path driven by narrative expansion, reflexive attention, or participation acceleration rather than full structural support.',
  template_version: '1.0.0',

  scenario_family: L12ScenarioFamily.NARRATIVE_REFLEXIVE_EXTENSION,
  legal_scenario_types: [
    L12ScenarioType.BULLISH_CONTINUATION,
    L12ScenarioType.BASE_CASE,
    L12ScenarioType.STRESS_CASE,
    L12ScenarioType.BEARISH_FAILURE,
  ],

  applicable_scope_types: ['asset', 'asset_pair', 'sector', 'ecosystem'],

  required_regime_patterns: [
    makeRegimePattern({
      id: 'regime.sector_or_attention',
      name: 'L8 regime: sector rotation / attention shift / memecoin mania',
      required: ['SECTOR_ROTATION', 'ATTENTION_SHIFT', 'MEMECOIN_MANIA'],
      narrowing: ['THIN_LIQUIDITY_FRAGILITY', 'RISK_OFF'],
    }),
  ],

  required_sequence_patterns: [
    makeSequencePattern({
      id: 'sequence.narrative_phases',
      name: 'L9 sequence: early ignition / late reflexive',
      required: ['EARLY_NARRATIVE_IGNITION', 'LATE_STAGE_REFLEXIVITY'],
      decay_must_not_be_dominant: true,
    }),
  ],

  required_hypothesis_patterns: [
    makeHypothesisPattern({
      id: 'hyp.narrative_or_reflexive',
      name: 'L10 hypothesis: narrative / reflexive',
      required_primary: [
        'NARRATIVE_DRIVEN_REPRICING',
        'NARRATIVE_ONLY_REFLEXIVE_PUMP',
        'SECTOR_SPILLOVER_REPRICING',
      ],
    }),
  ],

  required_score_patterns: [
    makeScorePattern({
      id: 'score.thesis_coherence_not_blocked',
      name: 'L11 Thesis Coherence not blocked',
      family: 'THESIS_COHERENCE_SCORE',
      operator: L12TemplateScoreBandOperator.NOT_BLOCKED,
    }),
    makeScorePattern({
      id: 'score.signal_confidence_not_blocked',
      name: 'L11 Signal Confidence not blocked',
      family: 'SIGNAL_CONFIDENCE_SCORE',
      operator: L12TemplateScoreBandOperator.NOT_BLOCKED,
    }),
  ],

  required_validation_patterns: [
    makeValidationPattern({
      id: 'validation.contradiction_manageable',
      name: 'L7 contradiction manageable',
    }),
  ],

  required_condition_patterns: [
    makeConditionPattern({
      id: 'cond.narrative_strength',
      name: 'narrative strength observable',
      type: L12ScenarioConditionType.HYPOTHESIS_CONDITION,
      role: L12ConditionRole.SUPPORTS_PATH,
      source_layer: L12ConditionSourceLayer.L10,
      required_surface_ref: 'l10.hypothesis.narrative',
    }),
    makeConditionPattern({
      id: 'cond.signal_confidence_observable',
      name: 'signal confidence observable',
      type: L12ScenarioConditionType.SCORE_CONDITION,
      role: L12ConditionRole.SUPPORTS_PATH,
      source_layer: L12ConditionSourceLayer.L11,
      required_surface_ref: 'l11.score.signal_confidence',
    }),
  ],

  trigger_patterns: [
    makeTriggerPattern({
      id: 'trig.narrative_breadth_expands',
      name: 'narrative breadth expands',
      trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
      expected_effect: L12TriggerEffect.STRENGTHENS_PRIMARY,
      required_evidence_classes: ['L10_HYPOTHESIS_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.participation_broadens',
      name: 'participation broadens',
      trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
      expected_effect: L12TriggerEffect.STRENGTHENS_PRIMARY,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.liquidity_holds',
      name: 'liquidity does not collapse',
      trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
      expected_effect: L12TriggerEffect.STRENGTHENS_PRIMARY,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.hypothesis_spread_widens_narrative',
      name: 'hypothesis spread widens toward narrative extension',
      trigger_type: L12TriggerType.RANKING_SHIFT_TRIGGER,
      expected_effect: L12TriggerEffect.PROMOTES_SECONDARY,
      required_evidence_classes: ['L10_HYPOTHESIS_EVIDENCE'],
    }),
  ],

  invalidation_patterns: [
    makeInvalidationPattern({
      id: 'inv.narrative_velocity_slows',
      name: 'narrative velocity slows',
      invalidation_type: L12InvalidationType.HYPOTHESIS_RANK_FLIP,
      expected_effect: L12InvalidationEffect.PATH_NARROWED,
      required_evidence_classes: ['L10_HYPOTHESIS_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.whales_distribute',
      name: 'whales distribute',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.spot_volume_fades',
      name: 'spot volume fades',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.CONFIDENCE_CAPPED,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.leverage_remains_crowded',
      name: 'leverage remains crowded',
      invalidation_type: L12InvalidationType.REGIME_SHIFT,
      expected_effect: L12InvalidationEffect.PATH_NARROWED,
      required_evidence_classes: ['L8_REGIME_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.signal_confidence_deteriorates',
      name: 'Signal Confidence deteriorates',
      invalidation_type: L12InvalidationType.SCORE_BREAKDOWN,
      expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
  ],

  confidence_policy_ref: TEMPLATE_POLICY_REFS.confidence,
  confidence_cap_policy_ref: TEMPLATE_POLICY_REFS.cap,
  spread_policy_ref: TEMPLATE_POLICY_REFS.spread,
  readiness_policy_ref: TEMPLATE_POLICY_REFS.readiness,
  restriction_policy_ref: TEMPLATE_POLICY_REFS.restriction,

  required_evidence_classes: [
    L12ScenarioTemplateEvidenceClass.L8_REGIME_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L8_LIQUIDITY_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L9_SEQUENCE_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L10_HYPOTHESIS_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L11_SCORE_CONTEXT_EVIDENCE,
  ],

  rollout_priority: 60,
  production_status: L12ScenarioTemplateProductionStatus.PRODUCTION_ENABLED,

  policy_version: POLICY_VERSION,
};
