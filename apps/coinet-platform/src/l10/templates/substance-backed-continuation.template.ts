/**
 * L10.6 §10.6.7.3.D3 — Template: Substance-Backed Continuation
 *
 * Family: FUNDAMENTAL_RERATING. Continuation where substance support
 * stays active; validation posture supports ongoing rerating rather
 * than pure speculation.
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

export const SUBSTANCE_BACKED_CONTINUATION_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.SUBSTANCE_BACKED_CONTINUATION,
  hypothesis_family: L10HypothesisFamilyId.FUNDAMENTAL_RERATING,
  hypothesis_name: 'Substance-Backed Continuation',
  template_version: '1.0.0',
  description:
    'Continuation driven by persistent substance; validation posture ' +
    'continues to support rerating rather than pure speculation.',
  applicable_scope_types: ['PROTOCOL', 'TOKEN', 'ASSET'],
  required_feature_patterns: ['L6_substance_continuation', 'L6_fundamental_persistence'],
  required_event_patterns: ['L6_rerating_continuation_event'],
  required_validation_patterns: ['L7_FUNDAMENTAL_VALIDATION', 'L7_CONTINUATION_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.BUSINESS_SUBSTANCE,
      L10TemplateSupportDomain.VALIDATED_FUNDAMENTALS,
      L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: false,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.FUNDAMENTAL_DEGRADATION,
      L10TemplateContradictionDomain.VALIDATION_CONTRADICTION,
      L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.VALIDATION_CONTRADICTION, L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE],
    blocking_domains: [L10TemplateContradictionDomain.FUNDAMENTAL_DEGRADATION],
    narrowing_contradiction_classes: [L10ContradictionClass.STRUCTURAL_CONTRADICTION, L10ContradictionClass.VALIDATION_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'substance_persists_during_continuation', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.BUSINESS_SUBSTANCE, is_upgrade_critical: true },
    { confirmation_ref: 'validation_remains_compatible', confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.VALIDATED_FUNDAMENTALS, is_upgrade_critical: false },
  ],
  invalidation_signals: [
    { invalidation_ref: 'substance_evidence_weakens', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.FUNDAMENTAL_DEGRADATION, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'shift_to_narrative_only_dominant', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.6 },
    { invalidation_ref: 'distribution_dominates_beneath_rally', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
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
    required_sequence_classes: ['VALIDATED_EXPANSION'],
    forbidden_sequence_classes: ['FAILED_CONTINUATION', 'DISTRIBUTION_UNDER_HYPE'],
    incompatible_sequence_narrows: true, incompatible_sequence_blocks: false,
  },
  blocker_law: DEFAULT_L10_BLOCKER_LAW,
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.6, minimum_confirmation_coverage: 0.65 },
  restriction_defaults: makeRestrictionDefaults('COMPETITION_MUST_BE_LIVE'),
  rollout_priority: L10HypothesisRolloutPhase.P3_COMPLEX_INTERPRETATION,
  candidate_generation_priority: 3,
  spread_sensitivity_default: 0.55,
  shared_competition_notes: ['tight competition vs HYPE_LED_CONTINUATION and CROWDING_LED_CONTINUATION'],
  template_invariants: ['substance_must_persist', 'fundamental_degradation_blocks'],
};
