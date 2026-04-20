/**
 * L10.6 §10.6.6.3.C3 — Template: Attention-Driven Repricing
 *
 * Family: NARRATIVE_REFLEXIVE. Repricing anchored in attention flow;
 * weaker evidence for strong demand or fundamentals; competition with
 * spillover and squeeze families possible.
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

export const ATTENTION_DRIVEN_REPRICING_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.ATTENTION_DRIVEN_REPRICING,
  hypothesis_family: L10HypothesisFamilyId.NARRATIVE_REFLEXIVE,
  hypothesis_name: 'Attention-Driven Repricing',
  template_version: '1.0.0',
  description:
    'Repricing primarily anchored in attention flow; weaker evidence ' +
    'for strong demand or fundamentals; competes with spillover and squeeze.',
  applicable_scope_types: ['TOKEN', 'NARRATIVE_CLUSTER', 'SECTOR'],
  required_feature_patterns: ['L6_attention_flow_shift', 'L6_repricing_signal'],
  required_event_patterns: ['L6_attention_repricing_event'],
  required_validation_patterns: ['L7_ATTENTION_VALIDATION', 'L7_NARRATIVE_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.ATTENTION_FLOW,
      L10TemplateSupportDomain.NARRATIVE_BREADTH,
      L10TemplateSupportDomain.SPECULATIVE_PARTICIPATION,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: true,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.ATTENTION_DECAY,
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
      L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE],
    blocking_domains: [L10TemplateContradictionDomain.ATTENTION_DECAY],
    narrowing_contradiction_classes: [L10ContradictionClass.STRUCTURAL_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION, L10ContradictionClass.TEMPORAL_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'continued_attention_relevance', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.ATTENTION_FLOW, is_upgrade_critical: true },
    { confirmation_ref: 'no_immediate_quality_collapse', confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.NARRATIVE_BREADTH, is_upgrade_critical: false },
  ],
  invalidation_signals: [
    { invalidation_ref: 'attention_decays_fast', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.ATTENTION_DECAY, active_collapse_threshold: 0.65, confidence_cap_on_potential: 0.5 },
    { invalidation_ref: 'stronger_alternative_explanation_emerges', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'structural_contradiction_intensifies', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION, L10ShiftConditionClass.COMPETITION_RESOLUTION_CONDITION],
    minimum_count: 2,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.REQUIRED_PRESENT,
    required_regime_classes: ['NARRATIVE_BREAKOUT', 'SECTOR_ROTATION', 'L2_ATTENTION_SHIFT'],
    forbidden_regime_classes: ['DISTRIBUTION'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: ['EARLY_NARRATIVE_IGNITION', 'VALIDATED_EXPANSION'],
    forbidden_sequence_classes: ['DISTRIBUTION_UNDER_HYPE'],
    incompatible_sequence_narrows: true, incompatible_sequence_blocks: false,
  },
  blocker_law: DEFAULT_L10_BLOCKER_LAW,
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.5 },
  restriction_defaults: makeRestrictionDefaults('COMPETITION_MUST_BE_LIVE'),
  rollout_priority: L10HypothesisRolloutPhase.P2_STRUCTURAL_COMPETITION,
  candidate_generation_priority: 3,
  spread_sensitivity_default: 0.7,
  shared_competition_notes: ['competes with ECOSYSTEM_SPILLOVER and HYPE_LED_CONTINUATION'],
  template_invariants: ['attention_flow_primary', 'attention_decay_blocks'],
};
