/**
 * L10.6 §10.6.9.3.F2 — Template: Structurally Weak Pump
 *
 * Family: MANIPULATION_LOW_QUALITY. Pump with poor structural support;
 * likely manipulation-driven; spread tight vs reflexive/narrative.
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

export const STRUCTURALLY_WEAK_PUMP_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.STRUCTURALLY_WEAK_PUMP,
  hypothesis_family: L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY,
  hypothesis_name: 'Structurally Weak Pump',
  template_version: '1.0.0',
  description:
    'Repricing event driven by fragile / low-quality structure; ' +
    'likely manipulation; narrow spread vs reflexive / narrative templates.',
  applicable_scope_types: ['TOKEN'],
  required_feature_patterns: ['L6_weak_structure_pump', 'L6_manipulation_signal'],
  required_event_patterns: ['L6_pump_event'],
  required_validation_patterns: ['L7_QUALITY_VALIDATION', 'L7_MANIPULATION_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.LOW_TRUST_STRUCTURE,
      L10TemplateSupportDomain.SUSPICIOUS_QUALITY_POSTURE,
      L10TemplateSupportDomain.FABRICATED_PARTICIPATION_SIGNAL,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: false,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE,
      L10TemplateContradictionDomain.QUALITY_IMPROVEMENT,
      L10TemplateContradictionDomain.MANIPULATION_ABSENCE,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.QUALITY_IMPROVEMENT],
    blocking_domains: [L10TemplateContradictionDomain.MANIPULATION_ABSENCE, L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE],
    narrowing_contradiction_classes: [L10ContradictionClass.STRUCTURAL_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION, L10ContradictionClass.VALIDATION_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'structural_weakness_persists', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.LOW_TRUST_STRUCTURE, is_upgrade_critical: true },
    { confirmation_ref: 'manipulation_signal_convergent', confirmation_class: L10ConfirmationClass.UPGRADE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.SUSPICIOUS_QUALITY_POSTURE, is_upgrade_critical: true },
  ],
  invalidation_signals: [
    { invalidation_ref: 'clean_demand_shown', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.5 },
    { invalidation_ref: 'quality_improves', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.QUALITY_IMPROVEMENT, active_collapse_threshold: 0.65, confidence_cap_on_potential: 0.5 },
    { invalidation_ref: 'manipulation_evidence_fades', invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.MANIPULATION_ABSENCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.5 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION, L10ShiftConditionClass.COMPETITION_RESOLUTION_CONDITION],
    minimum_count: 2,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
    required_regime_classes: ['LOW_QUALITY_LAUNCH_REGIME', 'MEMECOIN_MANIA', 'THIN_LIQUIDITY_FRAGILITY'],
    forbidden_regime_classes: ['MATURE_TREND'],
    hostile_regime_narrows: false, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: ['LOW_QUALITY_MANIPULATED_WINDOW', 'LATE_STAGE_REFLEXIVITY'],
    forbidden_sequence_classes: ['PRE_NARRATIVE_ACCUMULATION', 'VALIDATED_EXPANSION'],
    incompatible_sequence_narrows: false, incompatible_sequence_blocks: true,
  },
  blocker_law: { ...DEFAULT_L10_BLOCKER_LAW, blocker_codes: ['CLEAN_QUALITY_PROVEN', 'MANIPULATION_ABSENT'] },
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.55 },
  restriction_defaults: makeRestrictionDefaults('EXPLANATORY_ONLY'),
  rollout_priority: L10HypothesisRolloutPhase.P4_ADVERSARIAL_EXPLANATION,
  candidate_generation_priority: 2,
  spread_sensitivity_default: 0.45,
  shared_competition_notes: ['adversarial; tight spread vs REFLEXIVE_LATE_STAGE_SQUEEZE under fragility'],
  template_invariants: ['low_trust_structure_required', 'clean_demand_blocks'],
};
