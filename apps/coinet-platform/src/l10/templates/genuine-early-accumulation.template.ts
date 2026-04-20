/**
 * L10.6 §10.6.4.3.A1 — Template: Genuine Early Accumulation
 *
 * Family: GENUINE_ACCUMULATION_DEMAND.
 *
 * Accumulation signals appear before full narrative saturation;
 * primary support is from accumulation / flow / liquidity improvement
 * domains; contradiction from distribution, manipulation, and overhang
 * is not dominant; sequence posture is pre-narrative accumulation or
 * early constructive buildup.
 */

import {
  L10HypothesisTemplateDefinition,
} from '../contracts/hypothesis-template-definition';
import {
  L10HypothesisFamilyId,
  L10HypothesisRolloutPhase,
  L10HypothesisTemplateId,
  L10TemplateContradictionDomain,
  L10TemplateRegimeRequirement,
  L10TemplateSequenceRequirement,
  L10TemplateSupportDomain,
} from '../contracts/hypothesis-template-policy';
import {
  L10ConfirmationClass,
  L10ContradictionClass,
  L10InvalidationClass,
  L10ShiftConditionClass,
  L10SupportRoleClass,
} from '../contracts/hypothesis-evidence-semantics-types';
import {
  DEFAULT_L10_BLOCKER_LAW,
  DEFAULT_L10_CLEAN_EMISSION,
  makeRestrictionDefaults,
} from './template-defaults';

export const GENUINE_EARLY_ACCUMULATION_TEMPLATE:
  L10HypothesisTemplateDefinition = {
    template_id: L10HypothesisTemplateId.GENUINE_EARLY_ACCUMULATION,
    hypothesis_family: L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND,
    hypothesis_name: 'Genuine Early Accumulation',
    template_version: '1.0.0',
    description:
      'Accumulation appears before narrative saturation; primary ' +
      'support is accumulation / liquidity / flow; distribution and ' +
      'manipulation are not dominant.',
    applicable_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL'],
    required_feature_patterns: [
      'L6_accumulation_signal',
      'L6_liquidity_improvement',
      'L6_participation_broadening',
    ],
    required_event_patterns: ['L6_accumulation_window_event'],
    required_validation_patterns: [
      'L7_STRUCTURAL_VALIDATION',
      'L7_DEMAND_VALIDATION',
    ],
    support_requirement: {
      required_support_domains: [
        L10TemplateSupportDomain.ACCUMULATION_EVIDENCE,
        L10TemplateSupportDomain.LIQUIDITY_IMPROVEMENT,
        L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
      ],
      minimum_domains_present: 2,
      primary_anchor_roles: [
        L10SupportRoleClass.PRIMARY_SUPPORT,
        L10SupportRoleClass.SECONDARY_SUPPORT,
      ],
      tolerates_degraded_corroboration: false,
    },
    contradiction_requirement: {
      required_contradiction_domains: [
        L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
        L10TemplateContradictionDomain.OVERHANG_DOMINANCE,
        L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
      ],
      narrowing_domains: [
        L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
        L10TemplateContradictionDomain.REGIME_HOSTILITY,
        L10TemplateContradictionDomain.SEQUENCE_POSTURE_INCOMPATIBLE,
      ],
      blocking_domains: [
        L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
        L10TemplateContradictionDomain.OVERHANG_DOMINANCE,
      ],
      narrowing_contradiction_classes: [
        L10ContradictionClass.STRUCTURAL_CONTRADICTION,
        L10ContradictionClass.REGIME_CONDITIONED_CONTRADICTION,
      ],
      blocking_contradiction_classes: [
        L10ContradictionClass.DIRECT_CONTRADICTION,
        L10ContradictionClass.OVERHANG_CONTRADICTION,
      ],
    },
    required_confirmations: [
      {
        confirmation_ref: 'broader_participation_strengthening',
        confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
        support_domain: L10TemplateSupportDomain.DEMAND_BREADTH,
        is_upgrade_critical: true,
      },
      {
        confirmation_ref: 'support_persistence_across_window',
        confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
        support_domain: L10TemplateSupportDomain.ACCUMULATION_EVIDENCE,
        is_upgrade_critical: false,
      },
      {
        confirmation_ref: 'no_strong_distribution_emergence',
        confirmation_class: L10ConfirmationClass.RISK_RELIEF_CONFIRMATION,
        support_domain: L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
        is_upgrade_critical: false,
      },
    ],
    invalidation_signals: [
      {
        invalidation_ref: 'active_distribution',
        invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
        contradiction_domain:
          L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
        active_collapse_threshold: 0.7,
        confidence_cap_on_potential: 0.7,
      },
      {
        invalidation_ref: 'overhang_dominant_release',
        invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
        contradiction_domain:
          L10TemplateContradictionDomain.OVERHANG_DOMINANCE,
        active_collapse_threshold: 0.7,
        confidence_cap_on_potential: 0.6,
      },
      {
        invalidation_ref: 'accumulation_was_not_real_demand',
        invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
        contradiction_domain:
          L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
        active_collapse_threshold: 0.75,
        confidence_cap_on_potential: 0.65,
      },
    ],
    shift_condition_requirement: {
      required_classes: [
        L10ShiftConditionClass.SECONDARY_PROMOTION_CONDITION,
        L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION,
        L10ShiftConditionClass.SPREAD_NARROWING_CONDITION,
      ],
      minimum_count: 3,
    },
    regime_posture: {
      requirement: L10TemplateRegimeRequirement.MUST_NARROW_UNDER_HOSTILE,
      required_regime_classes: ['SPOT_LED_EXPANSION', 'EARLY_ACCUMULATION'],
      forbidden_regime_classes: ['DISTRIBUTION', 'BLOWOFF_REFLEXIVE_LATE_STAGE'],
      hostile_regime_narrows: true,
      hostile_regime_blocks: false,
    },
    sequence_posture: {
      requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
      required_sequence_classes: [
        'PRE_NARRATIVE_ACCUMULATION',
        'EARLY_NARRATIVE_IGNITION',
      ],
      forbidden_sequence_classes: [
        'LATE_STAGE_REFLEXIVITY',
        'DISTRIBUTION_UNDER_HYPE',
      ],
      incompatible_sequence_narrows: true,
      incompatible_sequence_blocks: false,
    },
    blocker_law: DEFAULT_L10_BLOCKER_LAW,
    clean_emission: {
      ...DEFAULT_L10_CLEAN_EMISSION,
      minimum_primary_support_strength: 0.6,
      minimum_confirmation_coverage: 0.66,
    },
    restriction_defaults: makeRestrictionDefaults('COMPETITION_MUST_BE_LIVE'),
    rollout_priority: L10HypothesisRolloutPhase.P1_CORE,
    candidate_generation_priority: 1,
    spread_sensitivity_default: 0.5,
    shared_competition_notes: [
      'narrow against LEVERAGE_DRIVEN_SQUEEZE when leverage dominates',
      'narrow against NARRATIVE_ONLY_REFLEXIVE_PUMP when attention leads structure',
    ],
    template_invariants: [
      'primary_support_from_accumulation_or_demand',
      'distribution_or_overhang_dominance_blocks',
    ],
  };
