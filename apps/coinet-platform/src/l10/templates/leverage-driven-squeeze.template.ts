/**
 * L10.6 §10.6.5.3.B1 — Template: Leverage-Driven Squeeze
 *
 * Family: LEVERAGE_SQUEEZE. Leverage signals are primary support;
 * squeeze-supportive positioning and sequence posture present.
 */

import { L10HypothesisTemplateDefinition } from '../contracts/hypothesis-template-definition';
import {
  L10HypothesisFamilyId, L10HypothesisRolloutPhase, L10HypothesisTemplateId,
  L10TemplateContradictionDomain, L10TemplateRegimeRequirement,
  L10TemplateSequenceRequirement, L10TemplateSupportDomain,
} from '../contracts/hypothesis-template-policy';
import {
  L10ConfirmationClass, L10ContradictionClass, L10InvalidationClass,
  L10ShiftConditionClass, L10SupportRoleClass,
} from '../contracts/hypothesis-evidence-semantics-types';
import {
  DEFAULT_L10_BLOCKER_LAW, DEFAULT_L10_CLEAN_EMISSION, makeRestrictionDefaults,
} from './template-defaults';

export const LEVERAGE_DRIVEN_SQUEEZE_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.LEVERAGE_DRIVEN_SQUEEZE,
  hypothesis_family: L10HypothesisFamilyId.LEVERAGE_SQUEEZE,
  hypothesis_name: 'Leverage-Driven Squeeze',
  template_version: '1.0.0',
  description:
    'Leverage / crowding / basis-funding stress dominate; sequence ' +
    'posture compatible with squeeze progression.',
  applicable_scope_types: ['ASSET', 'TOKEN', 'CHAIN', 'MARKET'],
  required_feature_patterns: ['L6_leverage_stress', 'L6_basis_funding_divergence'],
  required_event_patterns: ['L6_squeeze_window_event'],
  required_validation_patterns: ['L7_LEVERAGE_VALIDATION', 'L7_POSITIONING_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.LEVERAGE_POSITIONING,
      L10TemplateSupportDomain.CROWDING_STRUCTURE,
      L10TemplateSupportDomain.BASIS_FUNDING_STRESS,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: false,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.LEVERAGE_UNWIND_ACTIVE,
      L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE,
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE, L10TemplateContradictionDomain.REGIME_HOSTILITY],
    blocking_domains: [L10TemplateContradictionDomain.LEVERAGE_UNWIND_ACTIVE],
    narrowing_contradiction_classes: [L10ContradictionClass.STRUCTURAL_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION, L10ContradictionClass.TEMPORAL_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'continuation_under_squeeze_conditions', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.LEVERAGE_POSITIONING, is_upgrade_critical: true },
    { confirmation_ref: 'leverage_pressure_persists', confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.CROWDING_STRUCTURE, is_upgrade_critical: false },
    { confirmation_ref: 'not_yet_invalidated_by_immediate_unwind', confirmation_class: L10ConfirmationClass.RISK_RELIEF_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.BASIS_FUNDING_STRESS, is_upgrade_critical: false },
  ],
  invalidation_signals: [
    { invalidation_ref: 'squeeze_support_disappears_quickly', invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.LEVERAGE_UNWIND_ACTIVE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.6 },
    { invalidation_ref: 'leverage_posture_collapses', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.LEVERAGE_UNWIND_ACTIVE, active_collapse_threshold: 0.75, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'demand_or_manipulation_explanation_dominates', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE, active_collapse_threshold: 0.75, confidence_cap_on_potential: 0.65 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.SECONDARY_PROMOTION_CONDITION, L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION, L10ShiftConditionClass.SPREAD_WIDENING_CONDITION],
    minimum_count: 3,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
    required_regime_classes: ['LEVERAGE_LED_EXPANSION', 'BLOWOFF_REFLEXIVE_LATE_STAGE', 'MATURE_TREND'],
    forbidden_regime_classes: ['SPOT_LED_EXPANSION', 'EARLY_ACCUMULATION'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: ['LEVERAGE_CROWDING_PHASE', 'LATE_STAGE_REFLEXIVITY'],
    forbidden_sequence_classes: ['PRE_NARRATIVE_ACCUMULATION'],
    incompatible_sequence_narrows: true, incompatible_sequence_blocks: false,
  },
  blocker_law: DEFAULT_L10_BLOCKER_LAW,
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.55 },
  restriction_defaults: makeRestrictionDefaults('NARROWED_DEFAULT'),
  rollout_priority: L10HypothesisRolloutPhase.P2_STRUCTURAL_COMPETITION,
  candidate_generation_priority: 1,
  spread_sensitivity_default: 0.6,
  shared_competition_notes: ['tight competition vs REAL_DEMAND_LED_EXPANSION'],
  template_invariants: ['primary_support_from_leverage_domains', 'leverage_unwind_active_blocks'],
};
