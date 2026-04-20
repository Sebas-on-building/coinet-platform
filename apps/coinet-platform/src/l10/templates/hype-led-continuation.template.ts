/**
 * L10.6 §10.6.6.3.C2 — Template: Hype-Led Continuation
 *
 * Family: NARRATIVE_REFLEXIVE. Continuation driven by attention or
 * speculative participation; weak structural confirmation; spread
 * likely tight against squeeze / distribution families.
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

export const HYPE_LED_CONTINUATION_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.HYPE_LED_CONTINUATION,
  hypothesis_family: L10HypothesisFamilyId.NARRATIVE_REFLEXIVE,
  hypothesis_name: 'Hype-Led Continuation',
  template_version: '1.0.0',
  description:
    'Continuation supported by attention / speculative participation; ' +
    'weak structural confirmation; spread tight vs squeeze or distribution.',
  applicable_scope_types: ['TOKEN', 'NARRATIVE_CLUSTER'],
  required_feature_patterns: ['L6_attention_continuation', 'L6_speculative_flow'],
  required_event_patterns: ['L6_hype_continuation_event'],
  required_validation_patterns: ['L7_ATTENTION_VALIDATION', 'L7_CONTINUATION_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.ATTENTION_FLOW,
      L10TemplateSupportDomain.SPECULATIVE_PARTICIPATION,
      L10TemplateSupportDomain.NARRATIVE_BREADTH,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: true,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.ATTENTION_DECAY,
      L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP],
    blocking_domains: [L10TemplateContradictionDomain.ATTENTION_DECAY, L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE],
    narrowing_contradiction_classes: [L10ContradictionClass.TEMPORAL_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'ongoing_attention_persistence', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.ATTENTION_FLOW, is_upgrade_critical: true },
    { confirmation_ref: 'no_fast_structural_collapse', confirmation_class: L10ConfirmationClass.RISK_RELIEF_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION, is_upgrade_critical: false },
  ],
  invalidation_signals: [
    { invalidation_ref: 'hype_collapses', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.ATTENTION_DECAY, active_collapse_threshold: 0.65, confidence_cap_on_potential: 0.5 },
    { invalidation_ref: 'contradiction_rises_to_blocking', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'distribution_emerges_beneath', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION, L10ShiftConditionClass.SPREAD_NARROWING_CONDITION],
    minimum_count: 2,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.REQUIRED_PRESENT,
    required_regime_classes: ['NARRATIVE_BREAKOUT', 'MEMECOIN_MANIA', 'MATURE_TREND'],
    forbidden_regime_classes: ['DISTRIBUTION'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: ['EARLY_NARRATIVE_IGNITION', 'VALIDATED_EXPANSION', 'LATE_STAGE_REFLEXIVITY'],
    forbidden_sequence_classes: ['PRE_NARRATIVE_ACCUMULATION'],
    incompatible_sequence_narrows: true, incompatible_sequence_blocks: false,
  },
  blocker_law: DEFAULT_L10_BLOCKER_LAW,
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.5, minimum_confirmation_coverage: 0.5 },
  restriction_defaults: makeRestrictionDefaults('COMPETITION_MUST_BE_LIVE'),
  rollout_priority: L10HypothesisRolloutPhase.P2_STRUCTURAL_COMPETITION,
  candidate_generation_priority: 2,
  spread_sensitivity_default: 0.7,
  shared_competition_notes: ['tight spread vs CROWDING_LED_CONTINUATION and DISTRIBUTION_UNDER_HYPE'],
  template_invariants: ['attention_is_primary', 'attention_decay_blocks'],
};
