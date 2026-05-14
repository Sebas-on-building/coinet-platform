/**
 * L12.5 — Template 2: Leverage-driven continuation with rising fragility (§12.5.5).
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

const POLICY_VERSION = 'l12.5.template.leverage_driven_continuation.v1';

export const L12_LEVERAGE_DRIVEN_CONTINUATION_WITH_FRAGILITY_V1: L12ScenarioTemplateDefinition = {
  template_id: L12ScenarioTemplateId.LEVERAGE_DRIVEN_CONTINUATION_WITH_FRAGILITY_V1,
  template_name: 'Leverage-driven continuation with rising fragility',
  template_doctrine_summary:
    'Continuation may still happen, but the path is powered by leverage, crowding, squeeze dynamics, or reflexive participation. This is a fragile continuation path, not a healthy one.',
  template_version: '1.0.0',

  scenario_family: L12ScenarioFamily.LEVERAGE_DRIVEN_CONTINUATION,
  legal_scenario_types: [
    L12ScenarioType.BASE_CASE,
    L12ScenarioType.BULLISH_CONTINUATION,
    L12ScenarioType.STRESS_CASE,
    L12ScenarioType.BEARISH_FAILURE,
  ],

  applicable_scope_types: ['asset', 'asset_pair', 'sector', 'ecosystem'],

  required_regime_patterns: [
    makeRegimePattern({
      id: 'regime.leverage_or_transition',
      name: 'L8 regime: leverage-led or transition',
      required: ['LEVERAGE_LED_EXPANSION', 'TRANSITION', 'CROWDED_DERIVATIVES'],
      narrowing: ['THIN_LIQUIDITY_FRAGILITY', 'DELEVERAGING'],
      forbidden: [],
    }),
  ],

  required_sequence_patterns: [
    makeSequencePattern({
      id: 'sequence.leverage_phase',
      name: 'L9 sequence: leverage / late-stage',
      required: ['LEVERAGE_CROWDING_PHASE', 'VALIDATED_EXPANSION', 'LATE_STAGE_REFLEXIVITY'],
      forbidden: [],
      narrowing: ['DISTRIBUTION_UNDER_HYPE', 'POST_SHOCK_DIGESTION'],
      decay_must_not_be_dominant: false,
    }),
  ],

  required_hypothesis_patterns: [
    makeHypothesisPattern({
      id: 'hyp.leverage_or_squeeze',
      name: 'L10 hypothesis: leverage/squeeze/reflexive',
      required_primary: [
        'LEVERAGE_DRIVEN_SQUEEZE',
        'CROWDING_LED_CONTINUATION',
        'NARRATIVE_ONLY_REFLEXIVE_PUMP',
      ],
      tolerated_secondary: ['GENUINE_EARLY_ACCUMULATION'],
      require_non_narrow_spread: false,
    }),
  ],

  required_score_patterns: [
    makeScorePattern({
      id: 'score.risk_elevated',
      name: 'L11 Risk Score elevated',
      family: 'RISK_SCORE',
      operator: L12TemplateScoreBandOperator.GREATER_OR_EQUAL,
      required_bands: ['ELEVATED', 'HIGH'],
      forbidden_bands: ['EXTREME', 'CRITICAL'],
    }),
    makeScorePattern({
      id: 'score.timing_not_blocked',
      name: 'L11 Timing Score not blocked',
      family: 'TIMING_SCORE',
      operator: L12TemplateScoreBandOperator.NOT_BLOCKED,
    }),
    makeScorePattern({
      id: 'score.signal_confidence_not_blocked',
      name: 'L11 Signal Confidence not blocked',
      family: 'SIGNAL_CONFIDENCE_SCORE',
      operator: L12TemplateScoreBandOperator.NOT_BLOCKED,
    }),
    makeScorePattern({
      id: 'score.market_structure_not_collapsing',
      name: 'L11 Market Structure not collapsing',
      family: 'MARKET_STRUCTURE_SCORE',
      operator: L12TemplateScoreBandOperator.NOT_IN_BAND,
      forbidden_bands: ['VERY_LOW', 'COLLAPSING'],
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
      id: 'cond.leverage_present',
      name: 'leverage / OI elevated',
      type: L12ScenarioConditionType.REGIME_CONDITION,
      role: L12ConditionRole.SUPPORTS_PATH,
      source_layer: L12ConditionSourceLayer.L8,
      required_surface_ref: 'l8.regime.leverage',
    }),
    makeConditionPattern({
      id: 'cond.risk_elevated',
      name: 'risk score elevated',
      type: L12ScenarioConditionType.SCORE_CONDITION,
      role: L12ConditionRole.WEAKENS_PATH,
      source_layer: L12ConditionSourceLayer.L11,
      required_surface_ref: 'l11.score.risk',
    }),
  ],

  trigger_patterns: [
    makeTriggerPattern({
      id: 'trig.structure_holds',
      name: 'structure holds through leverage reset',
      trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
      expected_effect: L12TriggerEffect.STRENGTHENS_PRIMARY,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.oi_resets_no_breakdown',
      name: 'OI resets without price breakdown',
      trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
      expected_effect: L12TriggerEffect.STRENGTHENS_PRIMARY,
      required_evidence_classes: ['L8_REGIME_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.funding_cools',
      name: 'funding cools',
      trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
      expected_effect: L12TriggerEffect.STRENGTHENS_PRIMARY,
      required_evidence_classes: ['L8_REGIME_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.spot_support_after_leverage_reset',
      name: 'spot support appears after leverage reset',
      trigger_type: L12TriggerType.RECOVERY_TRIGGER,
      expected_effect: L12TriggerEffect.CONFIRMS_RECOVERY,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.risk_score_stabilizes',
      name: 'risk score stabilizes or declines',
      trigger_type: L12TriggerType.RECOVERY_TRIGGER,
      expected_effect: L12TriggerEffect.CONFIRMS_RECOVERY,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
  ],

  invalidation_patterns: [
    makeInvalidationPattern({
      id: 'inv.oi_rises_spot_weakens',
      name: 'OI rises while spot weakens',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
      required_evidence_classes: ['L8_REGIME_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.funding_remains_hot',
      name: 'funding remains hot',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.CONFIDENCE_CAPPED,
      required_evidence_classes: ['L8_REGIME_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.liquidity_deteriorates',
      name: 'liquidity deteriorates',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.PATH_NARROWED,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.market_structure_deteriorates',
      name: 'Market Structure Score deteriorates',
      invalidation_type: L12InvalidationType.SCORE_BREAKDOWN,
      expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.hypothesis_shifts_to_distribution',
      name: 'hypothesis shifts from squeeze to distribution',
      invalidation_type: L12InvalidationType.HYPOTHESIS_RANK_FLIP,
      expected_effect: L12InvalidationEffect.RANKING_FLIP,
      required_evidence_classes: ['L10_HYPOTHESIS_EVIDENCE'],
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

  rollout_priority: 20,
  production_status: L12ScenarioTemplateProductionStatus.PRODUCTION_ENABLED,

  policy_version: POLICY_VERSION,
};
