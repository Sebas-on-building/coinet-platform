/**
 * L10.6 §10.6.9.3.F3 — Template: Fabricated Participation Pattern
 *
 * Family: MANIPULATION_LOW_QUALITY. Participation patterns (volume,
 * holders, attention) show fabrication signatures; contradiction from
 * clean-demand or quality evidence is blocking.
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

export const FABRICATED_PARTICIPATION_PATTERN_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.FABRICATED_PARTICIPATION_PATTERN,
  hypothesis_family: L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY,
  hypothesis_name: 'Fabricated Participation Pattern',
  template_version: '1.0.0',
  description:
    'Participation patterns (volume / holders / attention) bear ' +
    'fabrication signatures; clean demand or quality evidence blocks.',
  applicable_scope_types: ['TOKEN'],
  required_feature_patterns: ['L6_fabricated_volume', 'L6_fabricated_attention'],
  required_event_patterns: ['L6_fabricated_participation_event'],
  required_validation_patterns: ['L7_PARTICIPATION_VALIDATION', 'L7_MANIPULATION_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.FABRICATED_PARTICIPATION_SIGNAL,
      L10TemplateSupportDomain.SUSPICIOUS_QUALITY_POSTURE,
      L10TemplateSupportDomain.LOW_TRUST_STRUCTURE,
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
    blocking_domains: [L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE, L10TemplateContradictionDomain.MANIPULATION_ABSENCE],
    narrowing_contradiction_classes: [L10ContradictionClass.STRUCTURAL_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION, L10ContradictionClass.VALIDATION_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'fabricated_pattern_persists', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.FABRICATED_PARTICIPATION_SIGNAL, is_upgrade_critical: true },
    { confirmation_ref: 'structural_low_trust_confirmed', confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.LOW_TRUST_STRUCTURE, is_upgrade_critical: false },
  ],
  invalidation_signals: [
    { invalidation_ref: 'pattern_identified_as_genuine', invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.MANIPULATION_ABSENCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.5 },
    { invalidation_ref: 'clean_demand_dominates', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.5 },
    { invalidation_ref: 'quality_evidence_rises', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.QUALITY_IMPROVEMENT, active_collapse_threshold: 0.65, confidence_cap_on_potential: 0.5 },
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
    forbidden_sequence_classes: ['VALIDATED_EXPANSION', 'PRE_NARRATIVE_ACCUMULATION'],
    incompatible_sequence_narrows: false, incompatible_sequence_blocks: true,
  },
  blocker_law: { ...DEFAULT_L10_BLOCKER_LAW, blocker_codes: ['CLEAN_QUALITY_PROVEN', 'MANIPULATION_ABSENT'] },
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.55 },
  restriction_defaults: makeRestrictionDefaults('EXPLANATORY_ONLY'),
  rollout_priority: L10HypothesisRolloutPhase.P4_ADVERSARIAL_EXPLANATION,
  candidate_generation_priority: 3,
  spread_sensitivity_default: 0.4,
  shared_competition_notes: ['adversarial; rarely wins clean spread'],
  template_invariants: ['fabricated_signal_required', 'manipulation_absence_blocks'],
};
