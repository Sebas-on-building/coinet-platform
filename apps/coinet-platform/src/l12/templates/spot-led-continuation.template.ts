/**
 * L12.5 — Template 1: Spot-led continuation (§12.5.4).
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

const POLICY_VERSION = 'l12.5.template.spot_led_continuation.v1';

export const L12_SPOT_LED_CONTINUATION_V1: L12ScenarioTemplateDefinition = {
  template_id: L12ScenarioTemplateId.SPOT_LED_CONTINUATION_V1,
  template_name: 'Spot-led continuation',
  template_doctrine_summary:
    'Constructive continuation supported by real spot participation, healthier liquidity, and non-crowded confirmation. NOT a buy signal: continuation quality is improving if spot-led support remains intact.',
  template_version: '1.0.0',

  scenario_family: L12ScenarioFamily.SPOT_LED_CONTINUATION,
  legal_scenario_types: [
    L12ScenarioType.BASE_CASE,
    L12ScenarioType.BULLISH_CONTINUATION,
    L12ScenarioType.RECOVERY_CASE,
  ],

  applicable_scope_types: ['asset', 'asset_pair', 'sector', 'ecosystem'],

  required_regime_patterns: [
    makeRegimePattern({
      id: 'regime.spot_led_or_risk_on',
      name: 'L8 regime: spot-led or risk-on',
      required: ['SPOT_LED_EXPANSION', 'RISK_ON', 'CHAIN_EXPANSION', 'SECTOR_ROTATION'],
      forbidden: [],
      narrowing: ['THIN_LIQUIDITY_FRAGILITY', 'DELEVERAGING', 'RISK_OFF'],
      blocks: false,
      narrows: true,
    }),
  ],

  required_sequence_patterns: [
    makeSequencePattern({
      id: 'sequence.constructive_phase',
      name: 'L9 sequence: constructive phase',
      required: [
        'VALIDATED_EXPANSION',
        'EARLY_NARRATIVE_IGNITION',
        'PRE_NARRATIVE_ACCUMULATION',
      ],
      narrowing: [
        'LATE_STAGE_REFLEXIVITY',
        'DISTRIBUTION_UNDER_HYPE',
        'POST_SHOCK_DIGESTION',
      ],
      decay_must_not_be_dominant: true,
    }),
  ],

  required_hypothesis_patterns: [
    makeHypothesisPattern({
      id: 'hyp.constructive_demand',
      name: 'L10 hypothesis: constructive demand',
      required_primary: [
        'GENUINE_EARLY_ACCUMULATION',
        'REAL_DEMAND_LED_EXPANSION',
        'FUNDAMENTALLY_IMPROVING_RERATING',
        'SECTOR_SPILLOVER_REPRICING',
      ],
      forbidden_primary: [
        'POST_UNLOCK_REDISTRIBUTION',
        'SUPPLY_OVERHANG_DISTRIBUTION',
        'DISTRIBUTION_UNDER_HYPE',
      ],
      require_non_narrow_spread: true,
    }),
  ],

  required_score_patterns: [
    makeScorePattern({
      id: 'score.opportunity_constructive',
      name: 'L11 Opportunity Score ≥ constructive',
      family: 'OPPORTUNITY_SCORE',
      operator: L12TemplateScoreBandOperator.GREATER_OR_EQUAL,
      required_bands: ['CONSTRUCTIVE', 'STRONG', 'VERY_STRONG'],
    }),
    makeScorePattern({
      id: 'score.market_structure_medium',
      name: 'L11 Market Structure Score ≥ medium',
      family: 'MARKET_STRUCTURE_SCORE',
      operator: L12TemplateScoreBandOperator.GREATER_OR_EQUAL,
      required_bands: ['MEDIUM', 'HIGH', 'VERY_HIGH'],
    }),
    makeScorePattern({
      id: 'score.thesis_coherence_medium',
      name: 'L11 Thesis Coherence Score ≥ medium',
      family: 'THESIS_COHERENCE_SCORE',
      operator: L12TemplateScoreBandOperator.GREATER_OR_EQUAL,
      required_bands: ['MEDIUM', 'HIGH'],
    }),
    makeScorePattern({
      id: 'score.signal_confidence_not_blocked',
      name: 'L11 Signal Confidence Score not blocked',
      family: 'SIGNAL_CONFIDENCE_SCORE',
      operator: L12TemplateScoreBandOperator.NOT_BLOCKED,
    }),
    makeScorePattern({
      id: 'score.risk_not_extreme',
      name: 'L11 Risk Score not extreme',
      family: 'RISK_SCORE',
      operator: L12TemplateScoreBandOperator.NOT_EXTREME,
      forbidden_bands: ['EXTREME', 'CRITICAL'],
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
      id: 'cond.spot_support_present',
      name: 'spot support present',
      type: L12ScenarioConditionType.REGIME_CONDITION,
      role: L12ConditionRole.SUPPORTS_PATH,
      source_layer: L12ConditionSourceLayer.L8,
      required_surface_ref: 'l8.liquidity.spot',
    }),
    makeConditionPattern({
      id: 'cond.market_structure_intact',
      name: 'market structure intact',
      type: L12ScenarioConditionType.SCORE_CONDITION,
      role: L12ConditionRole.SUPPORTS_PATH,
      source_layer: L12ConditionSourceLayer.L11,
      required_surface_ref: 'l11.score.market_structure',
    }),
  ],

  trigger_patterns: [
    makeTriggerPattern({
      id: 'trig.spot_volume_strengthens',
      name: 'spot volume strengthens',
      trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
      expected_effect: L12TriggerEffect.STRENGTHENS_PRIMARY,
      required_condition_pattern_refs: ['cond.spot_support_present'],
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.liquidity_deepens',
      name: 'liquidity deepens',
      trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
      expected_effect: L12TriggerEffect.STRENGTHENS_PRIMARY,
      required_condition_pattern_refs: ['cond.spot_support_present'],
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.funding_cools',
      name: 'funding cools',
      trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
      expected_effect: L12TriggerEffect.STRENGTHENS_PRIMARY,
      required_evidence_classes: ['L8_REGIME_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.market_breadth_improves',
      name: 'market breadth improves',
      trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
      expected_effect: L12TriggerEffect.STRENGTHENS_PRIMARY,
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
    makeTriggerPattern({
      id: 'trig.hypothesis_spread_widens_demand',
      name: 'hypothesis spread widens toward demand/accumulation',
      trigger_type: L12TriggerType.RANKING_SHIFT_TRIGGER,
      expected_effect: L12TriggerEffect.PROMOTES_SECONDARY,
      required_evidence_classes: ['L10_HYPOTHESIS_EVIDENCE'],
    }),
  ],

  invalidation_patterns: [
    makeInvalidationPattern({
      id: 'inv.exchange_inflows_rise',
      name: 'exchange inflows rise',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.PATH_NARROWED,
      required_condition_pattern_refs: ['cond.spot_support_present'],
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.spot_support_weakens',
      name: 'spot support weakens',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
      required_condition_pattern_refs: ['cond.spot_support_present'],
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.liquidity_thins',
      name: 'liquidity thins',
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      expected_effect: L12InvalidationEffect.CONFIDENCE_CAPPED,
      required_evidence_classes: ['L8_LIQUIDITY_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.market_structure_deteriorates',
      name: 'Market Structure Score deteriorates',
      invalidation_type: L12InvalidationType.SCORE_BREAKDOWN,
      expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
      required_condition_pattern_refs: ['cond.market_structure_intact'],
      required_evidence_classes: ['L11_SCORE_CONTEXT_EVIDENCE'],
    }),
    makeInvalidationPattern({
      id: 'inv.hypothesis_rank_flips_to_distribution',
      name: 'hypothesis rank flips to leverage-only or distribution',
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
    L12ScenarioTemplateEvidenceClass.L7_VALIDATION_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L8_REGIME_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L8_LIQUIDITY_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L9_SEQUENCE_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L10_HYPOTHESIS_EVIDENCE,
    L12ScenarioTemplateEvidenceClass.L11_SCORE_CONTEXT_EVIDENCE,
  ],

  rollout_priority: 10,
  production_status: L12ScenarioTemplateProductionStatus.PRODUCTION_ENABLED,

  policy_version: POLICY_VERSION,
};
