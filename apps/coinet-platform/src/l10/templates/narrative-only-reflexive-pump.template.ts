/**
 * L10.6 §10.6.6.3.C1 — Template: Narrative-Only Reflexive Pump
 *
 * Family: NARRATIVE_REFLEXIVE. Primary support is narrative/attention
 * with weak structural support; sequence posture ignition or reflexive.
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

export const NARRATIVE_ONLY_REFLEXIVE_PUMP_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.NARRATIVE_ONLY_REFLEXIVE_PUMP,
  hypothesis_family: L10HypothesisFamilyId.NARRATIVE_REFLEXIVE,
  hypothesis_name: 'Narrative-Only Reflexive Pump',
  template_version: '1.0.0',
  description:
    'Repricing driven primarily by narrative and attention; structural ' +
    'support is weak or secondary and is not hidden.',
  applicable_scope_types: ['TOKEN', 'NARRATIVE_CLUSTER', 'SECTOR'],
  required_feature_patterns: ['L6_narrative_ignition', 'L6_attention_burst'],
  required_event_patterns: ['L6_reflexive_window_event'],
  required_validation_patterns: ['L7_NARRATIVE_VALIDATION', 'L7_REFLEXIVE_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.NARRATIVE_BREADTH,
      L10TemplateSupportDomain.ATTENTION_FLOW,
      L10TemplateSupportDomain.SPECULATIVE_PARTICIPATION,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: true,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
      L10TemplateContradictionDomain.NARRATIVE_COLLAPSE,
      L10TemplateContradictionDomain.ATTENTION_DECAY,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, L10TemplateContradictionDomain.REGIME_HOSTILITY],
    blocking_domains: [L10TemplateContradictionDomain.NARRATIVE_COLLAPSE, L10TemplateContradictionDomain.ATTENTION_DECAY],
    narrowing_contradiction_classes: [L10ContradictionClass.STRUCTURAL_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION, L10ContradictionClass.TEMPORAL_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'narrative_breadth_persists', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.NARRATIVE_BREADTH, is_upgrade_critical: true },
    { confirmation_ref: 'reflexive_continuation_without_immediate_collapse', confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.ATTENTION_FLOW, is_upgrade_critical: false },
  ],
  invalidation_signals: [
    { invalidation_ref: 'narrative_breadth_falls_quickly', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.NARRATIVE_COLLAPSE, active_collapse_threshold: 0.65, confidence_cap_on_potential: 0.5 },
    { invalidation_ref: 'structural_weakness_becomes_dominant', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'supply_or_manipulation_overtakes', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.ATTENTION_DECAY, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION, L10ShiftConditionClass.SPREAD_NARROWING_CONDITION, L10ShiftConditionClass.COMPETITION_RESOLUTION_CONDITION],
    minimum_count: 3,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.REQUIRED_PRESENT,
    required_regime_classes: ['NARRATIVE_BREAKOUT', 'MEMECOIN_MANIA', 'SECTOR_ROTATION'],
    forbidden_regime_classes: ['DISTRIBUTION', 'DELEVERAGING'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: ['EARLY_NARRATIVE_IGNITION', 'LATE_STAGE_REFLEXIVITY'],
    forbidden_sequence_classes: ['PRE_NARRATIVE_ACCUMULATION', 'POST_SHOCK_DIGESTION'],
    incompatible_sequence_narrows: true, incompatible_sequence_blocks: false,
  },
  blocker_law: DEFAULT_L10_BLOCKER_LAW,
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.5, minimum_confirmation_coverage: 0.5 },
  restriction_defaults: makeRestrictionDefaults('COMPETITION_MUST_BE_LIVE'),
  rollout_priority: L10HypothesisRolloutPhase.P2_STRUCTURAL_COMPETITION,
  candidate_generation_priority: 1,
  spread_sensitivity_default: 0.7,
  shared_competition_notes: ['wide competition vs GENUINE_EARLY_ACCUMULATION and FUNDAMENTAL_RERATING'],
  template_invariants: ['primary_support_narrative_not_structure', 'narrative_collapse_blocks'],
};
