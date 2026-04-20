/**
 * L10.6 §10.6.4.3.A3 — Template: Structurally Improving Accumulation
 *
 * Family: GENUINE_ACCUMULATION_DEMAND.
 *
 * Accumulation *plus* improving structural quality beneath it. Requires
 * liquidity / participation / substance support improving together,
 * low manipulation posture, and manageable contradiction.
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

export const STRUCTURALLY_IMPROVING_ACCUMULATION_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.STRUCTURALLY_IMPROVING_ACCUMULATION,
  hypothesis_family: L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND,
  hypothesis_name: 'Structurally Improving Accumulation',
  template_version: '1.0.0',
  description:
    'Accumulation coincides with improving structural quality: ' +
    'liquidity, participation, and substance all strengthen.',
  applicable_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL'],
  required_feature_patterns: [
    'L6_accumulation_signal', 'L6_structural_improvement', 'L6_liquidity_improvement',
  ],
  required_event_patterns: ['L6_structural_improvement_event'],
  required_validation_patterns: [
    'L7_STRUCTURAL_VALIDATION', 'L7_DEMAND_VALIDATION',
  ],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.ACCUMULATION_EVIDENCE,
      L10TemplateSupportDomain.LIQUIDITY_IMPROVEMENT,
      L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
      L10TemplateSupportDomain.VALIDATED_FUNDAMENTALS,
    ],
    minimum_domains_present: 3,
    primary_anchor_roles: [
      L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT,
    ],
    tolerates_degraded_corroboration: false,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
      L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
      L10TemplateContradictionDomain.OVERHANG_DOMINANCE,
    ],
    narrowing_domains: [
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
      L10TemplateContradictionDomain.REGIME_HOSTILITY,
      L10TemplateContradictionDomain.VALIDATION_CONTRADICTION,
    ],
    blocking_domains: [
      L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
      L10TemplateContradictionDomain.OVERHANG_DOMINANCE,
    ],
    narrowing_contradiction_classes: [
      L10ContradictionClass.STRUCTURAL_CONTRADICTION,
      L10ContradictionClass.VALIDATION_CONTRADICTION,
    ],
    blocking_contradiction_classes: [
      L10ContradictionClass.DIRECT_CONTRADICTION,
      L10ContradictionClass.OVERHANG_CONTRADICTION,
    ],
  },
  required_confirmations: [
    {
      confirmation_ref: 'continued_structural_improvement',
      confirmation_class: L10ConfirmationClass.UPGRADE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
      is_upgrade_critical: true,
    },
    {
      confirmation_ref: 'validation_surfaces_not_degrading',
      confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.VALIDATED_FUNDAMENTALS,
      is_upgrade_critical: true,
    },
    {
      confirmation_ref: 'regime_compatibility_sustained',
      confirmation_class: L10ConfirmationClass.REGIME_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
      is_upgrade_critical: false,
    },
  ],
  invalidation_signals: [
    {
      invalidation_ref: 'structural_support_weakens_while_narrative_remains',
      invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
      contradiction_domain:
        L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
      active_collapse_threshold: 0.7,
      confidence_cap_on_potential: 0.7,
    },
    {
      invalidation_ref: 'support_becomes_concentrated_and_low_quality',
      invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain:
        L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
      active_collapse_threshold: 0.75,
      confidence_cap_on_potential: 0.65,
    },
    {
      invalidation_ref: 'overhang_distribution_stronger_explanation',
      invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain:
        L10TemplateContradictionDomain.OVERHANG_DOMINANCE,
      active_collapse_threshold: 0.75,
      confidence_cap_on_potential: 0.6,
    },
  ],
  shift_condition_requirement: {
    required_classes: [
      L10ShiftConditionClass.PRIMARY_REINFORCEMENT_CONDITION,
      L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION,
      L10ShiftConditionClass.SPREAD_NARROWING_CONDITION,
    ],
    minimum_count: 3,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.MUST_NARROW_UNDER_HOSTILE,
    required_regime_classes: ['SPOT_LED_EXPANSION', 'EARLY_ACCUMULATION', 'MATURE_TREND'],
    forbidden_regime_classes: ['DISTRIBUTION', 'THIN_LIQUIDITY_FRAGILITY'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: [
      'PRE_NARRATIVE_ACCUMULATION', 'EARLY_NARRATIVE_IGNITION', 'VALIDATED_EXPANSION',
    ],
    forbidden_sequence_classes: ['DISTRIBUTION_UNDER_HYPE', 'FAILED_CONTINUATION'],
    incompatible_sequence_narrows: true, incompatible_sequence_blocks: false,
  },
  blocker_law: DEFAULT_L10_BLOCKER_LAW,
  clean_emission: {
    ...DEFAULT_L10_CLEAN_EMISSION,
    minimum_primary_support_strength: 0.65,
    minimum_confirmation_coverage: 0.7,
  },
  restriction_defaults: makeRestrictionDefaults('COMPETITION_MUST_BE_LIVE'),
  rollout_priority: L10HypothesisRolloutPhase.P1_CORE,
  candidate_generation_priority: 3,
  spread_sensitivity_default: 0.5,
  shared_competition_notes: [
    'tight competition vs FUNDAMENTALLY_IMPROVING_RERATING',
  ],
  template_invariants: [
    'structural_improvement_must_be_upgrade_critical',
    'distribution_or_overhang_dominance_blocks',
  ],
};
