/**
 * L10.6 §10.6.8.3.E3 — Template: Distribution Under Hype
 *
 * Family: SUPPLY_OVERHANG_DISTRIBUTION. Distribution during hype or
 * reflexive continuation windows; spread narrow vs narrative/squeeze.
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

export const DISTRIBUTION_UNDER_HYPE_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.DISTRIBUTION_UNDER_HYPE,
  hypothesis_family: L10HypothesisFamilyId.SUPPLY_OVERHANG_DISTRIBUTION,
  hypothesis_name: 'Distribution Under Hype',
  template_version: '1.0.0',
  description:
    'Insider / holder distribution occurring under the cover of hype ' +
    'or reflexive continuation; narrow spread vs narrative / squeeze.',
  applicable_scope_types: ['TOKEN', 'PROTOCOL'],
  required_feature_patterns: ['L6_holder_distribution', 'L6_hype_distribution'],
  required_event_patterns: ['L6_distribution_window_event'],
  required_validation_patterns: ['L7_DISTRIBUTION_VALIDATION', 'L7_HOLDER_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.DISTRIBUTION_DIVERGENCE,
      L10TemplateSupportDomain.TREASURY_ENTITY_FLOW,
      L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: true,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE,
      L10TemplateContradictionDomain.QUALITY_IMPROVEMENT,
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.QUALITY_IMPROVEMENT],
    blocking_domains: [L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE],
    narrowing_contradiction_classes: [L10ContradictionClass.STRUCTURAL_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'distribution_persists_on_rallies', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.DISTRIBUTION_DIVERGENCE, is_upgrade_critical: true },
    { confirmation_ref: 'holder_exit_signals_intensify', confirmation_class: L10ConfirmationClass.UPGRADE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.TREASURY_ENTITY_FLOW, is_upgrade_critical: true },
  ],
  invalidation_signals: [
    { invalidation_ref: 'holders_reaccumulate', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'clean_demand_evidence_emerges', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.6 },
    { invalidation_ref: 'distribution_evidence_dries_up', invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.QUALITY_IMPROVEMENT, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION, L10ShiftConditionClass.SPREAD_NARROWING_CONDITION, L10ShiftConditionClass.COMPETITION_RESOLUTION_CONDITION],
    minimum_count: 3,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
    required_regime_classes: ['BLOWOFF_REFLEXIVE_LATE_STAGE', 'MEMECOIN_MANIA', 'NARRATIVE_BREAKOUT', 'DISTRIBUTION'],
    forbidden_regime_classes: ['EARLY_ACCUMULATION'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: ['LATE_STAGE_REFLEXIVITY', 'DISTRIBUTION_UNDER_HYPE', 'VALIDATED_EXPANSION'],
    forbidden_sequence_classes: ['PRE_NARRATIVE_ACCUMULATION'],
    incompatible_sequence_narrows: false, incompatible_sequence_blocks: true,
  },
  blocker_law: DEFAULT_L10_BLOCKER_LAW,
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.55, minimum_candidate_stability_score: 0.5 },
  restriction_defaults: makeRestrictionDefaults('NARROWED_DEFAULT'),
  rollout_priority: L10HypothesisRolloutPhase.P3_COMPLEX_INTERPRETATION,
  candidate_generation_priority: 3,
  spread_sensitivity_default: 0.75,
  shared_competition_notes: ['tight competition with REFLEXIVE_LATE_STAGE_SQUEEZE and NARRATIVE_ONLY family'],
  template_invariants: ['distribution_divergence_required', 'clean_demand_blocks'],
};
