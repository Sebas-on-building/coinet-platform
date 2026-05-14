/**
 * L12.5 — Template 4: Thin-liquidity failure (§12.5.7).
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

const POLICY_VERSION = 'l12.5.template.thin_liquidity_failure.v1';

export const L12_THIN_LIQUIDITY_FAILURE_V1: L12ScenarioTemplateDefinition = {
  template_id: L12ScenarioTemplateId.THIN_LIQUIDITY_FAILURE_V1,
  template_name: 'Thin-liquidity failure',
  template_doctrine_summary:
    'Failure path driven by shallow liquidity, fragile depth, weak absorption, or dislocation risk.',
  template_version: '1.0.0',

  scenario_family: L12ScenarioFamily.THIN_LIQUIDITY_FAILURE,
  legal_scenario_types: [
    L12ScenarioType.BEARISH_FAILURE,
    L12ScenarioType.STRESS_CASE,
    L12ScenarioType.INVALIDATION_CASE,
    L12ScenarioType.RECOVERY_CASE,
  ],

  applicable_scope_types: ['asset', 'asset_pair', 'sector', 'ecosystem', 'market'],

  required_regime_patterns: [
    makeRegimePattern({
      id: 'regime.thin_liquidity',
      name: 'L8 regime: thin-liquidity fragility',
      required: ['THIN_LIQUIDITY_FRAGILITY', 'DELEVERAGING', 'RISK_OFF'],
      narrowing: ['CHOP', 'TRANSITION'],
    }),
  ],

  required_sequence_patterns: [
    makeSequencePattern({
      id: 'sequence.weak_or_decaying',
      name: 'L9 sequence: weak / decaying / late / unsupported',
      required: ['LATE_STAGE_REFLEXIVITY', 'POST_SHOCK_DIGESTION', 'UNSUPPORTED_PHASE'],
      forbidden: ['VALIDATED_EXPANSION', 'PRE_NARRATIVE_ACCUMULATION'],
      decay_must_not_be_dominant: false,
    }),
  ],

  required_hypothesis_patterns: [
    makeHypothesisPattern({
      id: 'hyp.fragility_or_failure',
      name: 'L10 hypothesis: fragility / failure',
      required_primary: [
        'THIN_LIQUIDITY_DISLOCATION',
        'DELEVERAGING_BREAKDOWN',
        'POST_UNLOCK_REDISTRIBUTION',
      ],
      tolerated_secondary: ['REACCUMULATION_ATTEMPT'],
    }),
  ],

  required_score_patterns: [
    makeScorePattern({
      id: 'score.market_structure_weak',
      name: 'L11 Market Structure weak/capped',
      family: 'MARKET_STRUCTURE_SCORE',
      operator: L12TemplateScoreBandOperator.LESS_OR_EQUAL,
      required_bands: ['VERY_LOW', 'LOW', 'MEDIUM'],
    }),
    makeScorePattern({
      id: 'score.risk_high',
      name: 'L11 Risk high',
      family: 'RISK_SCORE',
      operator: L12TemplateScoreBandOperator.GREATER_OR_EQUAL,
      required_bands: ['HIGH', 'EXTREME'],
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
      id: 'validation.contradiction_in_liquidity',
      name: 'L7 contradiction or degradation in liquidity support',
      manageable: false,
      not_severe: false,
    }),
  ],

  required_condition_patterns: [
    makeConditionPattern({
      id: 'cond.depth_weak',
      name: 'depth weak',
      type: L12ScenarioConditionType.REGIME_CONDITION,
      role: L12ConditionRole.WEAKENS_PATH,
      source_layer: L12ConditionSourceLayer.L8,
      required_surface_ref: 'l8.liquidity.depth',
    }),
    makeConditionPattern({
      id: 'cond.market_structure_weak',
      name: 'market structure weak',
      type: L12ScenarioConditionType.SCORE_CONDITION,
      role: L12ConditionRole.WEAKENS_PATH,
      source_layer: L12ConditionSourceLayer.L11,
      required_surface_ref: 'l11.score.market_structure',
    }),
  ],

  trigger_patterns: [
    makeTriggerPattern({
      id: 'trig.depth_deteriorates',
      name: 'depth deteriorates',
      trigger_type: L12TriggerType.FAILURE_TRIGGER,
      expected_effect: L12TriggerEffect.ESCALATES_FAILURE,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.spread_widens',
      name: 'spread widens',
      trigger_type: L12TriggerType.FAILURE_TRIGGER,
      expected_effect: L12TriggerEffect.ESCALATES_FAILURE,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.volatility_jumps',
      name: 'volatility jumps',
      trigger_type: L12TriggerType.FAILURE_TRIGGER,
      expected_effect: L12TriggerEffect.WEAKENS_PRIMARY,
      required_evidence_classes: ['L8_REGIME_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.support_fails',
      name: 'support fails',
      trigger_type: L12TriggerType.FAILURE_TRIGGER,
      expected_effect: L12TriggerEffect.COLLAPSES_BASE_CASE,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
  ],

  invalidation_patterns: [
    makeInvalidationPattern({
      id: 'inv.liquidity_deepens',
      name: 'liquidity deepens',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.spot_support_returns',
      name: 'spot support returns',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.PATH_NARROWED,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.market_structure_recovers',
      name: 'Market Structure Score recovers',
      invalidation_type: L12InvalidationType.SCORE_BREAKDOWN,
      expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.risk_score_declines',
      name: 'Risk Score declines',
      invalidation_type: L12InvalidationType.SCORE_BREAKDOWN,
      expected_effect: L12InvalidationEffect.CONFIDENCE_CAPPED,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.drift_blocker',
      name: 'liquidity Market Structure score drift',
      invalidation_type: L12InvalidationType.DRIFT_BLOCKER,
      expected_effect: L12InvalidationEffect.CONFIDENCE_CAPPED,
      required_evidence_classes: ['L11_DRIFT_EVIDENCE'],
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
    L12ScenarioTemplateEvidenceClass.L11_SCORE_CONTEXT_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L11_DRIFT_EVIDENCE,
  ],

  rollout_priority: 40,
  production_status: L12ScenarioTemplateProductionStatus.PRODUCTION_ENABLED,

  policy_version: POLICY_VERSION,
};
