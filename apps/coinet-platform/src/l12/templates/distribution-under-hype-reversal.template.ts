/**
 * L12.5 — Template 5: Distribution under hype reversal (§12.5.8).
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

const POLICY_VERSION = 'l12.5.template.distribution_under_hype_reversal.v1';

export const L12_DISTRIBUTION_UNDER_HYPE_REVERSAL_V1: L12ScenarioTemplateDefinition = {
  template_id: L12ScenarioTemplateId.DISTRIBUTION_UNDER_HYPE_REVERSAL_V1,
  template_name: 'Distribution under hype reversal',
  template_doctrine_summary:
    'Reversal path where distribution, exchange inflow, treasury movement, or weakening structure undermines a prior constructive path while narrative remains loud.',
  template_version: '1.0.0',

  scenario_family: L12ScenarioFamily.DISTRIBUTION_REVERSAL,
  legal_scenario_types: [
    L12ScenarioType.BEARISH_FAILURE,
    L12ScenarioType.STRESS_CASE,
    L12ScenarioType.INVALIDATION_CASE,
  ],

  applicable_scope_types: ['asset', 'asset_pair', 'sector', 'ecosystem'],

  required_regime_patterns: [
    makeRegimePattern({
      id: 'regime.late_or_sector_rotation',
      name: 'L8 regime: late-stage / sector rotation',
      required: ['SECTOR_ROTATION', 'TRANSITION', 'LATE_STAGE_REFLEXIVE'],
      narrowing: ['THIN_LIQUIDITY_FRAGILITY'],
    }),
  ],

  required_sequence_patterns: [
    makeSequencePattern({
      id: 'sequence.late_or_distribution',
      name: 'L9 sequence: late-stage reflexivity / distribution under hype',
      required: ['LATE_STAGE_REFLEXIVITY', 'DISTRIBUTION_UNDER_HYPE'],
      decay_must_not_be_dominant: false,
    }),
  ],

  required_hypothesis_patterns: [
    makeHypothesisPattern({
      id: 'hyp.distribution',
      name: 'L10 hypothesis: distribution-under-hype / treasury-led distribution',
      required_primary: [
        'DISTRIBUTION_UNDER_HYPE',
        'TREASURY_LED_DISTRIBUTION',
        'POST_UNLOCK_REDISTRIBUTION',
      ],
      forbidden_primary: ['GENUINE_EARLY_ACCUMULATION', 'REAL_DEMAND_LED_EXPANSION'],
    }),
  ],

  required_score_patterns: [
    makeScorePattern({
      id: 'score.whale_conviction_weak',
      name: 'L11 Whale Conviction weak/capped',
      family: 'WHALE_CONVICTION_SCORE',
      operator: L12TemplateScoreBandOperator.LESS_OR_EQUAL,
      required_bands: ['VERY_LOW', 'LOW', 'MEDIUM'],
    }),
    makeScorePattern({
      id: 'score.risk_elevated',
      name: 'L11 Risk elevated',
      family: 'RISK_SCORE',
      operator: L12TemplateScoreBandOperator.GREATER_OR_EQUAL,
      required_bands: ['ELEVATED', 'HIGH'],
    }),
    makeScorePattern({
      id: 'score.thesis_coherence_not_blocked',
      name: 'L11 Thesis Coherence not blocked',
      family: 'THESIS_COHERENCE_SCORE',
      operator: L12TemplateScoreBandOperator.NOT_BLOCKED,
    }),
  ],

  required_validation_patterns: [
    makeValidationPattern({
      id: 'validation.contradiction_present',
      name: 'L7 contradiction present (narrative vs. structure)',
      manageable: true,
      not_severe: false,
    }),
  ],

  required_condition_patterns: [
    makeConditionPattern({
      id: 'cond.whale_distribution_observable',
      name: 'whale / treasury distribution observable',
      type: L12ScenarioConditionType.SCORE_CONDITION,
      role: L12ConditionRole.WEAKENS_PATH,
      source_layer: L12ConditionSourceLayer.L11,
      required_surface_ref: 'l11.score.whale_conviction',
    }),
    makeConditionPattern({
      id: 'cond.narrative_loud_structure_weak',
      name: 'narrative loud while structure weak',
      type: L12ScenarioConditionType.HYPOTHESIS_CONDITION,
      role: L12ConditionRole.WEAKENS_PATH,
      source_layer: L12ConditionSourceLayer.L10,
      required_surface_ref: 'l10.hypothesis.distribution',
    }),
  ],

  trigger_patterns: [
    makeTriggerPattern({
      id: 'trig.exchange_inflows_rise',
      name: 'exchange inflows rise',
      trigger_type: L12TriggerType.FAILURE_TRIGGER,
      expected_effect: L12TriggerEffect.ESCALATES_FAILURE,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.large_holders_distribute',
      name: 'large holders distribute',
      trigger_type: L12TriggerType.FAILURE_TRIGGER,
      expected_effect: L12TriggerEffect.ESCALATES_FAILURE,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.spot_support_fades',
      name: 'spot support fades',
      trigger_type: L12TriggerType.FAILURE_TRIGGER,
      expected_effect: L12TriggerEffect.WEAKENS_PRIMARY,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.whale_conviction_deteriorates',
      name: 'Whale Conviction Score deteriorates',
      trigger_type: L12TriggerType.FAILURE_TRIGGER,
      expected_effect: L12TriggerEffect.ESCALATES_FAILURE,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
  ],

  invalidation_patterns: [
    makeInvalidationPattern({
      id: 'inv.distribution_signals_fade',
      name: 'distribution signals fade',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.exchange_inflows_normalize',
      name: 'exchange inflows normalize',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.spot_demand_returns',
      name: 'spot demand returns',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.PATH_NARROWED,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.hypothesis_shifts_from_distribution',
      name: 'hypothesis spread shifts away from distribution',
      invalidation_type: L12InvalidationType.HYPOTHESIS_RANK_FLIP,
      expected_effect: L12InvalidationEffect.RANKING_FLIP,
      required_evidence_classes: ['L10_HYPOTHESIS_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.whale_conviction_improves',
      name: 'Whale Conviction improves',
      invalidation_type: L12InvalidationType.SCORE_BREAKDOWN,
      expected_effect: L12InvalidationEffect.PATH_NARROWED,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
  ],

  confidence_policy_ref: TEMPLATE_POLICY_REFS.confidence,
  confidence_cap_policy_ref: TEMPLATE_POLICY_REFS.cap,
  spread_policy_ref: TEMPLATE_POLICY_REFS.spread,
  readiness_policy_ref: TEMPLATE_POLICY_REFS.readiness,
  restriction_policy_ref: TEMPLATE_POLICY_REFS.restriction,

  required_evidence_classes: [
    L12ScenarioTemplateEvidenceClass.L7_CONTRADICTION_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L8_LIQUIDITY_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L9_SEQUENCE_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L10_HYPOTHESIS_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L11_SCORE_CONTEXT_EVIDENCE,
  ],

  rollout_priority: 50,
  production_status: L12ScenarioTemplateProductionStatus.PRODUCTION_ENABLED,

  policy_version: POLICY_VERSION,
};
