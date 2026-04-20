/**
 * L10.6 §10.6.5.3.B3 — Template: Reflexive Late-Stage Squeeze
 *
 * Family: LEVERAGE_SQUEEZE. Sequence posture clearly later-stage;
 * reflexive continuation and leverage dominant; fragility rising.
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

export const REFLEXIVE_LATE_STAGE_SQUEEZE_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.REFLEXIVE_LATE_STAGE_SQUEEZE,
  hypothesis_family: L10HypothesisFamilyId.LEVERAGE_SQUEEZE,
  hypothesis_name: 'Reflexive Late-Stage Squeeze',
  template_version: '1.0.0',
  description:
    'Late-stage reflexive squeeze with rising fragility; narrow spread ' +
    'against distribution / manipulation families possible.',
  applicable_scope_types: ['ASSET', 'TOKEN', 'CHAIN'],
  required_feature_patterns: ['L6_late_stage_reflexivity', 'L6_leverage_stress'],
  required_event_patterns: ['L6_reflexive_window_event'],
  required_validation_patterns: ['L7_LEVERAGE_VALIDATION', 'L7_REFLEXIVE_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.LEVERAGE_POSITIONING,
      L10TemplateSupportDomain.CROWDING_STRUCTURE,
      L10TemplateSupportDomain.BASIS_FUNDING_STRESS,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: true,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.LEVERAGE_UNWIND_ACTIVE,
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
      L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE],
    blocking_domains: [L10TemplateContradictionDomain.LEVERAGE_UNWIND_ACTIVE],
    narrowing_contradiction_classes: [L10ContradictionClass.TEMPORAL_CONTRADICTION, L10ContradictionClass.STRUCTURAL_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'squeeze_still_active', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.LEVERAGE_POSITIONING, is_upgrade_critical: true },
    { confirmation_ref: 'not_yet_unwind_dominant', confirmation_class: L10ConfirmationClass.RISK_RELIEF_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.CROWDING_STRUCTURE, is_upgrade_critical: false },
  ],
  invalidation_signals: [
    { invalidation_ref: 'unwind_risk_activates_materially', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.LEVERAGE_UNWIND_ACTIVE, active_collapse_threshold: 0.65, confidence_cap_on_potential: 0.5 },
    { invalidation_ref: 'contradiction_overhang_becomes_blocking', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.DISTRIBUTION_DOMINANCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'support_decays_too_quickly', invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION, L10ShiftConditionClass.SPREAD_NARROWING_CONDITION, L10ShiftConditionClass.SPREAD_WIDENING_CONDITION],
    minimum_count: 3,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
    required_regime_classes: ['BLOWOFF_REFLEXIVE_LATE_STAGE', 'LEVERAGE_LED_EXPANSION', 'THIN_LIQUIDITY_FRAGILITY'],
    forbidden_regime_classes: ['EARLY_ACCUMULATION', 'SPOT_LED_EXPANSION'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: ['LATE_STAGE_REFLEXIVITY', 'LEVERAGE_CROWDING_PHASE'],
    forbidden_sequence_classes: ['PRE_NARRATIVE_ACCUMULATION', 'EARLY_NARRATIVE_IGNITION'],
    incompatible_sequence_narrows: false, incompatible_sequence_blocks: true,
  },
  blocker_law: { ...DEFAULT_L10_BLOCKER_LAW, blocker_codes: ['SUPPORT_COLLAPSE', 'UNWIND_ACTIVE', 'LATE_STAGE_BREAKDOWN'] },
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.5, minimum_candidate_stability_score: 0.45 },
  restriction_defaults: makeRestrictionDefaults('NARROWED_DEFAULT'),
  rollout_priority: L10HypothesisRolloutPhase.P2_STRUCTURAL_COMPETITION,
  candidate_generation_priority: 3,
  spread_sensitivity_default: 0.7,
  shared_competition_notes: [
    'narrow spread against DISTRIBUTION_UNDER_HYPE common in late stages',
  ],
  template_invariants: ['must_be_late_stage', 'unwind_active_blocks', 'fragility_posture_tolerated'],
};
