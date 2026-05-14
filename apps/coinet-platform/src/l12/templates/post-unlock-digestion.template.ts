/**
 * L12.5 — Template 3: Post-unlock digestion (§12.5.6).
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

const POLICY_VERSION = 'l12.5.template.post_unlock_digestion.v1';

export const L12_POST_UNLOCK_DIGESTION_V1: L12ScenarioTemplateDefinition = {
  template_id: L12ScenarioTemplateId.POST_UNLOCK_DIGESTION_V1,
  template_name: 'Post-unlock digestion',
  template_doctrine_summary:
    'A supply-overhang event has occurred or is being absorbed, but evidence is insufficient to declare clean continuation or clean failure. This is a digestion path.',
  template_version: '1.0.0',

  scenario_family: L12ScenarioFamily.POST_UNLOCK_DIGESTION,
  legal_scenario_types: [
    L12ScenarioType.BASE_CASE,
    L12ScenarioType.NEUTRAL_CHOP,
    L12ScenarioType.RECOVERY_CASE,
    L12ScenarioType.BEARISH_FAILURE,
  ],

  applicable_scope_types: ['asset', 'sector', 'ecosystem'],

  required_regime_patterns: [
    makeRegimePattern({
      id: 'regime.post_event',
      name: 'L8 regime: post-event window',
      required: ['POST_EVENT', 'TRANSITION', 'CHOP'],
      narrowing: ['THIN_LIQUIDITY_FRAGILITY', 'RISK_OFF'],
    }),
  ],

  required_sequence_patterns: [
    makeSequencePattern({
      id: 'sequence.post_shock',
      name: 'L9 sequence: post-shock digestion',
      required: ['POST_SHOCK_DIGESTION', 'POST_EVENT_WINDOW'],
      decay_must_not_be_dominant: false,
    }),
  ],

  required_hypothesis_patterns: [
    makeHypothesisPattern({
      id: 'hyp.unlock_or_recovery',
      name: 'L10 hypothesis: unlock-driven or recovery alternative',
      required_primary: [
        'POST_UNLOCK_REDISTRIBUTION',
        'SUPPLY_OVERHANG_DISTRIBUTION',
        'DISTRIBUTION_UNDER_HYPE',
      ],
      tolerated_secondary: ['REACCUMULATION_ATTEMPT', 'REAL_DEMAND_LED_EXPANSION'],
    }),
  ],

  required_score_patterns: [
    makeScorePattern({
      id: 'score.unlock_risk_elevated',
      name: 'L11 Unlock Risk elevated or recently elevated',
      family: 'UNLOCK_RISK_SCORE',
      operator: L12TemplateScoreBandOperator.GREATER_OR_EQUAL,
      required_bands: ['ELEVATED', 'HIGH', 'CRITICAL'],
    }),
    makeScorePattern({
      id: 'score.timing_narrowed',
      name: 'L11 Timing narrowed',
      family: 'TIMING_SCORE',
      operator: L12TemplateScoreBandOperator.NOT_BLOCKED,
    }),
    makeScorePattern({
      id: 'score.risk_not_low_clean',
      name: 'L11 Risk Score not low-clean',
      family: 'RISK_SCORE',
      operator: L12TemplateScoreBandOperator.NOT_IN_BAND,
      forbidden_bands: ['VERY_LOW', 'LOW_CLEAN'],
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
      id: 'cond.post_event_window_active',
      name: 'post-event window active',
      type: L12ScenarioConditionType.SEQUENCE_CONDITION,
      role: L12ConditionRole.REQUIRED_FOR_PATH,
      source_layer: L12ConditionSourceLayer.L9,
      required_surface_ref: 'l9.sequence.post_shock',
    }),
    makeConditionPattern({
      id: 'cond.unlock_risk_observable',
      name: 'unlock risk observable',
      type: L12ScenarioConditionType.SCORE_CONDITION,
      role: L12ConditionRole.SUPPORTS_PATH,
      source_layer: L12ConditionSourceLayer.L11,
      required_surface_ref: 'l11.score.unlock_risk',
    }),
  ],

  trigger_patterns: [
    makeTriggerPattern({
      id: 'trig.liquidity_absorbs_unlock',
      name: 'liquidity absorbs unlock',
      trigger_type: L12TriggerType.RECOVERY_TRIGGER,
      expected_effect: L12TriggerEffect.CONFIRMS_RECOVERY,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.distribution_pressure_fades',
      name: 'distribution pressure fades',
      trigger_type: L12TriggerType.RECOVERY_TRIGGER,
      expected_effect: L12TriggerEffect.STRENGTHENS_PRIMARY,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.reaccumulation_appears',
      name: 'reaccumulation appears',
      trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
      expected_effect: L12TriggerEffect.STRENGTHENS_PRIMARY,
      required_evidence_classes: ['L10_HYPOTHESIS_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.unlock_risk_declines',
      name: 'Unlock Risk Score declines',
      trigger_type: L12TriggerType.RECOVERY_TRIGGER,
      expected_effect: L12TriggerEffect.CONFIRMS_RECOVERY,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
  ],

  invalidation_patterns: [
    makeInvalidationPattern({
      id: 'inv.exchange_inflows_rise',
      name: 'treasury / exchange transfers rise',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.support_weakens',
      name: 'support weakens',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.liquidity_absorption_fails',
      name: 'liquidity absorption fails',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.CONFIDENCE_CAPPED,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.distribution_hypothesis_strengthens',
      name: 'distribution hypothesis strengthens',
      invalidation_type: L12InvalidationType.HYPOTHESIS_RANK_FLIP,
      expected_effect: L12InvalidationEffect.RANKING_FLIP,
      required_evidence_classes: ['L10_HYPOTHESIS_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.unlock_risk_remains_high',
      name: 'Unlock Risk remains high',
      invalidation_type: L12InvalidationType.SCORE_BREAKDOWN,
      expected_effect: L12InvalidationEffect.CONFIDENCE_CAPPED,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
  ],

  confidence_policy_ref: TEMPLATE_POLICY_REFS.confidence,
  confidence_cap_policy_ref: TEMPLATE_POLICY_REFS.cap,
  spread_policy_ref: TEMPLATE_POLICY_REFS.spread,
  readiness_policy_ref: TEMPLATE_POLICY_REFS.readiness,
  restriction_policy_ref: TEMPLATE_POLICY_REFS.restriction,

  required_evidence_classes: [
    L12ScenarioTemplateEvidenceClass.L8_LIQUIDITY_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L9_SEQUENCE_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L10_HYPOTHESIS_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L11_SCORE_CONTEXT_EVIDENCE,
  ],

  rollout_priority: 30,
  production_status: L12ScenarioTemplateProductionStatus.PRODUCTION_ENABLED,

  policy_version: POLICY_VERSION,
};
