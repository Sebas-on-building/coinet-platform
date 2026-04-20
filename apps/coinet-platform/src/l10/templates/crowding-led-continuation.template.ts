/**
 * L10.6 §10.6.5.3.B2 — Template: Crowding-Led Continuation
 *
 * Family: LEVERAGE_SQUEEZE. Crowding / participation signals support
 * continuation more than pure demand; contradiction rising but manageable.
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

export const CROWDING_LED_CONTINUATION_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.CROWDING_LED_CONTINUATION,
  hypothesis_family: L10HypothesisFamilyId.LEVERAGE_SQUEEZE,
  hypothesis_name: 'Crowding-Led Continuation',
  template_version: '1.0.0',
  description:
    'Continuation primarily supported by crowding and participation; ' +
    'demand-side support not dominant; sequence beyond early accumulation.',
  applicable_scope_types: ['ASSET', 'TOKEN', 'CHAIN'],
  required_feature_patterns: ['L6_crowding_signal', 'L6_participation_concentration'],
  required_event_patterns: ['L6_continuation_window_event'],
  required_validation_patterns: ['L7_POSITIONING_VALIDATION', 'L7_CONTINUATION_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.CROWDING_STRUCTURE,
      L10TemplateSupportDomain.LEVERAGE_POSITIONING,
      L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: false,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.LEVERAGE_UNWIND_ACTIVE,
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
      L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, L10TemplateContradictionDomain.REGIME_HOSTILITY],
    blocking_domains: [L10TemplateContradictionDomain.LEVERAGE_UNWIND_ACTIVE],
    narrowing_contradiction_classes: [L10ContradictionClass.STRUCTURAL_CONTRADICTION, L10ContradictionClass.REGIME_CONDITIONED_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'crowding_remains_constructive', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.CROWDING_STRUCTURE, is_upgrade_critical: true },
    { confirmation_ref: 'no_immediate_collapse_regime_shift', confirmation_class: L10ConfirmationClass.REGIME_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE, is_upgrade_critical: false },
  ],
  invalidation_signals: [
    { invalidation_ref: 'contradiction_becomes_blocking', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.6 },
    { invalidation_ref: 'unwind_invalidation_active', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.LEVERAGE_UNWIND_ACTIVE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'support_narrows_too_far', invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, active_collapse_threshold: 0.75, confidence_cap_on_potential: 0.6 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.SECONDARY_PROMOTION_CONDITION, L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION],
    minimum_count: 2,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
    required_regime_classes: ['LEVERAGE_LED_EXPANSION', 'MATURE_TREND', 'CHOP'],
    forbidden_regime_classes: ['EARLY_ACCUMULATION', 'SPOT_LED_EXPANSION'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: ['LEVERAGE_CROWDING_PHASE', 'CROWDING_WITHOUT_CONFIRMATION'],
    forbidden_sequence_classes: ['PRE_NARRATIVE_ACCUMULATION'],
    incompatible_sequence_narrows: true, incompatible_sequence_blocks: false,
  },
  blocker_law: DEFAULT_L10_BLOCKER_LAW,
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.55, minimum_candidate_stability_score: 0.5 },
  restriction_defaults: makeRestrictionDefaults('NARROWED_DEFAULT'),
  rollout_priority: L10HypothesisRolloutPhase.P2_STRUCTURAL_COMPETITION,
  candidate_generation_priority: 2,
  spread_sensitivity_default: 0.65,
  shared_competition_notes: ['competition vs NARRATIVE_ONLY_REFLEXIVE_PUMP in hype regimes'],
  template_invariants: ['crowding_must_be_primary', 'unwind_active_blocks'],
};
