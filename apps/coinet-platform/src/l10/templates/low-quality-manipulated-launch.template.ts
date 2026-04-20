/**
 * L10.6 §10.6.9.3.F1 — Template: Low-Quality Manipulated Launch
 *
 * Family: MANIPULATION_LOW_QUALITY. Launch-level manipulation:
 * suspicious liquidity / wash activity; insufficient quality posture;
 * default restriction posture BLOCKED unless explicitly whitelisted.
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

export const LOW_QUALITY_MANIPULATED_LAUNCH_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.LOW_QUALITY_MANIPULATED_LAUNCH,
  hypothesis_family: L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY,
  hypothesis_name: 'Low-Quality Manipulated Launch',
  template_version: '1.0.0',
  description:
    'Launch-level manipulation: wash / suspicious activity; insufficient ' +
    'quality posture; default BLOCKED unless whitelisted.',
  applicable_scope_types: ['TOKEN'],
  required_feature_patterns: ['L6_launch_window', 'L6_wash_activity_signal'],
  required_event_patterns: ['L6_launch_manipulation_event'],
  required_validation_patterns: ['L7_QUALITY_VALIDATION', 'L7_MANIPULATION_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.SUSPICIOUS_QUALITY_POSTURE,
      L10TemplateSupportDomain.LOW_TRUST_STRUCTURE,
      L10TemplateSupportDomain.FABRICATED_PARTICIPATION_SIGNAL,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: false,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.QUALITY_IMPROVEMENT,
      L10TemplateContradictionDomain.MANIPULATION_ABSENCE,
      L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.QUALITY_IMPROVEMENT],
    blocking_domains: [L10TemplateContradictionDomain.MANIPULATION_ABSENCE, L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE],
    narrowing_contradiction_classes: [L10ContradictionClass.STRUCTURAL_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION, L10ContradictionClass.VALIDATION_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'suspicious_posture_persists', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.SUSPICIOUS_QUALITY_POSTURE, is_upgrade_critical: true },
    { confirmation_ref: 'low_trust_structural_evidence', confirmation_class: L10ConfirmationClass.UPGRADE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.LOW_TRUST_STRUCTURE, is_upgrade_critical: true },
  ],
  invalidation_signals: [
    { invalidation_ref: 'quality_improves_materially', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.QUALITY_IMPROVEMENT, active_collapse_threshold: 0.65, confidence_cap_on_potential: 0.45 },
    { invalidation_ref: 'manipulation_evidence_absent', invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.MANIPULATION_ABSENCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.5 },
    { invalidation_ref: 'clean_demand_emerges', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.5 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION, L10ShiftConditionClass.COMPETITION_RESOLUTION_CONDITION],
    minimum_count: 2,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
    required_regime_classes: ['LOW_QUALITY_LAUNCH_REGIME', 'MEMECOIN_MANIA'],
    forbidden_regime_classes: ['MATURE_TREND'],
    hostile_regime_narrows: false, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: ['LOW_QUALITY_MANIPULATED_WINDOW'],
    forbidden_sequence_classes: ['PRE_NARRATIVE_ACCUMULATION', 'VALIDATED_EXPANSION'],
    incompatible_sequence_narrows: false, incompatible_sequence_blocks: true,
  },
  blocker_law: { ...DEFAULT_L10_BLOCKER_LAW, blocker_codes: ['CLEAN_QUALITY_PROVEN', 'MANIPULATION_ABSENT'] },
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.6 },
  restriction_defaults: makeRestrictionDefaults('EXPLANATORY_ONLY'),
  rollout_priority: L10HypothesisRolloutPhase.P4_ADVERSARIAL_EXPLANATION,
  candidate_generation_priority: 1,
  spread_sensitivity_default: 0.4,
  shared_competition_notes: ['adversarial family; rarely shares clean spread with P1/P2'],
  template_invariants: ['suspicious_posture_primary', 'manipulation_absence_blocks'],
};
