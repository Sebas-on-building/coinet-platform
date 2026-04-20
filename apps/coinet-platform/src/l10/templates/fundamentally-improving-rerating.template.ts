/**
 * L10.6 §10.6.7.3.D1 — Template: Fundamentally Improving Rerating
 *
 * Family: FUNDAMENTAL_RERATING. Primary support from improving
 * fundamentals; validation posture supports the thesis; regime and
 * sequence compatible with rerating.
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

export const FUNDAMENTALLY_IMPROVING_RERATING_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.FUNDAMENTALLY_IMPROVING_RERATING,
  hypothesis_family: L10HypothesisFamilyId.FUNDAMENTAL_RERATING,
  hypothesis_name: 'Fundamentally Improving Rerating',
  template_version: '1.0.0',
  description:
    'Primary support from improving fundamentals / substance; ' +
    'validation posture supports the improvement thesis.',
  applicable_scope_types: ['PROTOCOL', 'TOKEN', 'ASSET'],
  required_feature_patterns: ['L6_fundamental_improvement', 'L6_substance_growth'],
  required_event_patterns: ['L6_rerating_event'],
  required_validation_patterns: ['L7_FUNDAMENTAL_VALIDATION', 'L7_SUBSTANCE_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.BUSINESS_SUBSTANCE,
      L10TemplateSupportDomain.VALIDATED_FUNDAMENTALS,
      L10TemplateSupportDomain.PROTOCOL_QUALITY,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: false,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.FUNDAMENTAL_DEGRADATION,
      L10TemplateContradictionDomain.VALIDATION_CONTRADICTION,
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, L10TemplateContradictionDomain.VALIDATION_CONTRADICTION],
    blocking_domains: [L10TemplateContradictionDomain.FUNDAMENTAL_DEGRADATION],
    narrowing_contradiction_classes: [L10ContradictionClass.VALIDATION_CONTRADICTION, L10ContradictionClass.STRUCTURAL_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'continued_business_quality_improvement', confirmation_class: L10ConfirmationClass.UPGRADE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.BUSINESS_SUBSTANCE, is_upgrade_critical: true },
    { confirmation_ref: 'persistence_of_supportive_validation', confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.VALIDATED_FUNDAMENTALS, is_upgrade_critical: true },
    { confirmation_ref: 'contradiction_not_intensifying', confirmation_class: L10ConfirmationClass.RISK_RELIEF_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION, is_upgrade_critical: false },
  ],
  invalidation_signals: [
    { invalidation_ref: 'support_degrades_into_narrative_only', invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.6 },
    { invalidation_ref: 'substance_evidence_weakens', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.FUNDAMENTAL_DEGRADATION, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'overhang_distribution_stronger_explanation', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.6 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.PRIMARY_REINFORCEMENT_CONDITION, L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION, L10ShiftConditionClass.SPREAD_NARROWING_CONDITION],
    minimum_count: 3,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.MUST_NARROW_UNDER_HOSTILE,
    required_regime_classes: ['SPOT_LED_EXPANSION', 'MATURE_TREND', 'DEFI_RERATING'],
    forbidden_regime_classes: ['DISTRIBUTION'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.MUST_NARROW_UNDER_INCOMPATIBLE,
    required_sequence_classes: ['VALIDATED_EXPANSION', 'EARLY_NARRATIVE_IGNITION'],
    forbidden_sequence_classes: ['FAILED_CONTINUATION', 'DISTRIBUTION_UNDER_HYPE'],
    incompatible_sequence_narrows: true, incompatible_sequence_blocks: false,
  },
  blocker_law: DEFAULT_L10_BLOCKER_LAW,
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.6, minimum_confirmation_coverage: 0.7 },
  restriction_defaults: makeRestrictionDefaults('COMPETITION_MUST_BE_LIVE'),
  rollout_priority: L10HypothesisRolloutPhase.P3_COMPLEX_INTERPRETATION,
  candidate_generation_priority: 1,
  spread_sensitivity_default: 0.5,
  shared_competition_notes: ['tight competition vs STRUCTURALLY_IMPROVING_ACCUMULATION'],
  template_invariants: ['substance_support_primary', 'fundamental_degradation_blocks'],
};
