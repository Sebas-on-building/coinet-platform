/**
 * L10.6 §10.6.4.3.A2 — Template: Real Demand-Led Expansion
 *
 * Family: GENUINE_ACCUMULATION_DEMAND.
 *
 * Continuation driven by demand and participation, not leverage.
 * Leverage may not yet dominate enough to reclassify as squeeze-led.
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

export const REAL_DEMAND_LED_EXPANSION_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.REAL_DEMAND_LED_EXPANSION,
  hypothesis_family: L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND,
  hypothesis_name: 'Real Demand-Led Expansion',
  template_version: '1.0.0',
  description:
    'Continuation supported primarily by demand / participation; ' +
    'leverage is present but not dominant; regime not sharply hostile.',
  applicable_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL', 'SECTOR'],
  required_feature_patterns: [
    'L6_demand_breadth', 'L6_participation_continuation', 'L6_liquidity_health',
  ],
  required_event_patterns: ['L6_expansion_window_event'],
  required_validation_patterns: [
    'L7_DEMAND_VALIDATION', 'L7_CONTINUATION_VALIDATION',
  ],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.DEMAND_BREADTH,
      L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
      L10TemplateSupportDomain.LIQUIDITY_IMPROVEMENT,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [
      L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT,
    ],
    tolerates_degraded_corroboration: false,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.LEVERAGE_DOMINANCE_UNDER_DEMAND_CLAIM,
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
      L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
    ],
    narrowing_domains: [
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
      L10TemplateContradictionDomain.REGIME_HOSTILITY,
    ],
    blocking_domains: [
      L10TemplateContradictionDomain.LEVERAGE_DOMINANCE_UNDER_DEMAND_CLAIM,
      L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
    ],
    narrowing_contradiction_classes: [
      L10ContradictionClass.STRUCTURAL_CONTRADICTION,
      L10ContradictionClass.REGIME_CONDITIONED_CONTRADICTION,
    ],
    blocking_contradiction_classes: [
      L10ContradictionClass.DIRECT_CONTRADICTION,
    ],
  },
  required_confirmations: [
    {
      confirmation_ref: 'continued_breadth_and_participation',
      confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.DEMAND_BREADTH,
      is_upgrade_critical: true,
    },
    {
      confirmation_ref: 'no_major_support_decay',
      confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
      is_upgrade_critical: false,
    },
    {
      confirmation_ref: 'sustained_support_beyond_one_burst',
      confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.LIQUIDITY_IMPROVEMENT,
      is_upgrade_critical: false,
    },
  ],
  invalidation_signals: [
    {
      invalidation_ref: 'leverage_dominance_overtakes_demand',
      invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain:
        L10TemplateContradictionDomain.LEVERAGE_DOMINANCE_UNDER_DEMAND_CLAIM,
      active_collapse_threshold: 0.7,
      confidence_cap_on_potential: 0.7,
    },
    {
      invalidation_ref: 'support_collapses_into_crowding',
      invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
      contradiction_domain:
        L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
      active_collapse_threshold: 0.7,
      confidence_cap_on_potential: 0.65,
    },
    {
      invalidation_ref: 'structural_contradiction_intensifies',
      invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain:
        L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
      active_collapse_threshold: 0.75,
      confidence_cap_on_potential: 0.7,
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
    required_regime_classes: ['SPOT_LED_EXPANSION', 'NARRATIVE_BREAKOUT', 'MATURE_TREND'],
    forbidden_regime_classes: ['DISTRIBUTION', 'POST_UNLOCK_DIGESTION'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: [
      'VALIDATED_EXPANSION', 'EARLY_NARRATIVE_IGNITION',
    ],
    forbidden_sequence_classes: ['DISTRIBUTION_UNDER_HYPE', 'LATE_STAGE_REFLEXIVITY'],
    incompatible_sequence_narrows: true, incompatible_sequence_blocks: false,
  },
  blocker_law: DEFAULT_L10_BLOCKER_LAW,
  clean_emission: {
    ...DEFAULT_L10_CLEAN_EMISSION,
    minimum_primary_support_strength: 0.6,
    minimum_confirmation_coverage: 0.66,
  },
  restriction_defaults: makeRestrictionDefaults('COMPETITION_MUST_BE_LIVE'),
  rollout_priority: L10HypothesisRolloutPhase.P1_CORE,
  candidate_generation_priority: 2,
  spread_sensitivity_default: 0.55,
  shared_competition_notes: [
    'tightest competition vs LEVERAGE_DRIVEN_SQUEEZE',
    'narrow against SUPPLY_OVERHANG_DISTRIBUTION on latent overhang',
  ],
  template_invariants: [
    'primary_support_from_demand_not_leverage',
    'leverage_dominance_blocks',
  ],
};
