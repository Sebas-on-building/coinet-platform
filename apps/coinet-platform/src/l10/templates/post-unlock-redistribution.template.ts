/**
 * L10.6 §10.6.8.3.E1 — Template: Post-Unlock Redistribution
 *
 * Family: SUPPLY_OVERHANG_DISTRIBUTION. Post-unlock window posture
 * where recipients redistribute supply into the market.
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

export const POST_UNLOCK_REDISTRIBUTION_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.POST_UNLOCK_REDISTRIBUTION,
  hypothesis_family: L10HypothesisFamilyId.SUPPLY_OVERHANG_DISTRIBUTION,
  hypothesis_name: 'Post-Unlock Redistribution',
  template_version: '1.0.0',
  description:
    'Recipients of an unlock redistribute supply; post-event window ' +
    'active; distribution posture evident in holder surface.',
  applicable_scope_types: ['TOKEN', 'PROTOCOL'],
  required_feature_patterns: ['L6_unlock_window_active', 'L6_recipient_redistribution'],
  required_event_patterns: ['L6_post_unlock_window_event'],
  required_validation_patterns: ['L7_SUPPLY_VALIDATION', 'L7_POST_EVENT_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.SUPPLY_OVERHANG_EVIDENCE,
      L10TemplateSupportDomain.TREASURY_ENTITY_FLOW,
      L10TemplateSupportDomain.DISTRIBUTION_DIVERGENCE,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: true,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE,
      L10TemplateContradictionDomain.QUALITY_IMPROVEMENT,
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.QUALITY_IMPROVEMENT, L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP],
    blocking_domains: [L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE],
    narrowing_contradiction_classes: [L10ContradictionClass.OVERHANG_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'recipient_addresses_show_outflow', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.TREASURY_ENTITY_FLOW, is_upgrade_critical: true },
    { confirmation_ref: 'post_unlock_window_still_active', confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.SUPPLY_OVERHANG_EVIDENCE, is_upgrade_critical: true },
  ],
  invalidation_signals: [
    { invalidation_ref: 'post_unlock_window_closes_cleanly', invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'clean_demand_absorbs_unlock', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.6 },
    { invalidation_ref: 'recipients_do_not_redistribute', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.QUALITY_IMPROVEMENT, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION, L10ShiftConditionClass.SPREAD_NARROWING_CONDITION, L10ShiftConditionClass.COMPETITION_RESOLUTION_CONDITION],
    minimum_count: 3,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
    required_regime_classes: ['POST_UNLOCK_DIGESTION', 'DISTRIBUTION', 'MATURE_TREND'],
    forbidden_regime_classes: ['EARLY_ACCUMULATION'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: ['POST_SHOCK_DIGESTION', 'DISTRIBUTION_UNDER_HYPE'],
    forbidden_sequence_classes: ['PRE_NARRATIVE_ACCUMULATION'],
    incompatible_sequence_narrows: false, incompatible_sequence_blocks: true,
  },
  blocker_law: { ...DEFAULT_L10_BLOCKER_LAW, blocker_codes: ['UNLOCK_WINDOW_INACTIVE', 'CLEAN_DEMAND_ABSORBS'] },
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.6, minimum_candidate_stability_score: 0.5 },
  restriction_defaults: makeRestrictionDefaults('NARROWED_DEFAULT'),
  rollout_priority: L10HypothesisRolloutPhase.P3_COMPLEX_INTERPRETATION,
  candidate_generation_priority: 1,
  spread_sensitivity_default: 0.65,
  shared_competition_notes: ['competes with FUNDAMENTAL_RERATING when unlock is known'],
  template_invariants: ['unlock_window_must_be_active', 'overhang_is_primary'],
};
