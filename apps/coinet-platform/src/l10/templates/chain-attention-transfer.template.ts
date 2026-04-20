/**
 * L10.6 §10.6.10.3.G2 — Template: Chain Attention Transfer
 *
 * Family: ECOSYSTEM_SPILLOVER_ROTATION. Attention migrates between
 * chains or ecosystems, bringing flow with it; subject inherits via
 * chain-level coupling.
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

export const CHAIN_ATTENTION_TRANSFER_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.CHAIN_ATTENTION_TRANSFER,
  hypothesis_family: L10HypothesisFamilyId.ECOSYSTEM_SPILLOVER_ROTATION,
  hypothesis_name: 'Chain Attention Transfer',
  template_version: '1.0.0',
  description:
    'Attention / flow migrates across chains; subject participates in ' +
    'repricing via chain-level attention transfer.',
  applicable_scope_types: ['CHAIN', 'SECTOR', 'TOKEN'],
  required_feature_patterns: ['L6_chain_attention_shift', 'L6_chain_flow_migration'],
  required_event_patterns: ['L6_chain_attention_event'],
  required_validation_patterns: ['L7_CHAIN_ATTENTION_VALIDATION', 'L7_SPILLOVER_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.CHAIN_ATTENTION_TRANSFER,
      L10TemplateSupportDomain.ECOSYSTEM_LEVEL_FLOW,
      L10TemplateSupportDomain.ATTENTION_FLOW,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: true,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.SPILLOVER_ABSENCE,
      L10TemplateContradictionDomain.ASSET_SPECIFIC_DOMINANCE,
      L10TemplateContradictionDomain.ATTENTION_DECAY,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.ASSET_SPECIFIC_DOMINANCE],
    blocking_domains: [L10TemplateContradictionDomain.SPILLOVER_ABSENCE, L10TemplateContradictionDomain.ATTENTION_DECAY],
    narrowing_contradiction_classes: [L10ContradictionClass.STRUCTURAL_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'chain_attention_still_active', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.CHAIN_ATTENTION_TRANSFER, is_upgrade_critical: true },
    { confirmation_ref: 'subject_participates_in_transfer', confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.ECOSYSTEM_LEVEL_FLOW, is_upgrade_critical: true },
  ],
  invalidation_signals: [
    { invalidation_ref: 'chain_attention_decays', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.ATTENTION_DECAY, active_collapse_threshold: 0.65, confidence_cap_on_potential: 0.5 },
    { invalidation_ref: 'spillover_becomes_unsubstantiated', invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.SPILLOVER_ABSENCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'asset_specific_explanation_dominates', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.ASSET_SPECIFIC_DOMINANCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.PRIMARY_REINFORCEMENT_CONDITION, L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION, L10ShiftConditionClass.SPREAD_WIDENING_CONDITION],
    minimum_count: 3,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
    required_regime_classes: ['L2_ATTENTION_SHIFT', 'SECTOR_ROTATION', 'NARRATIVE_BREAKOUT'],
    forbidden_regime_classes: ['DELEVERAGING'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: ['EARLY_NARRATIVE_IGNITION', 'VALIDATED_EXPANSION'],
    forbidden_sequence_classes: ['DISTRIBUTION_UNDER_HYPE'],
    incompatible_sequence_narrows: true, incompatible_sequence_blocks: false,
  },
  blocker_law: DEFAULT_L10_BLOCKER_LAW,
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.55, minimum_confirmation_coverage: 0.6 },
  restriction_defaults: makeRestrictionDefaults('COMPETITION_MUST_BE_LIVE'),
  rollout_priority: L10HypothesisRolloutPhase.P5_RELATIONAL_EXPLANATION,
  candidate_generation_priority: 2,
  spread_sensitivity_default: 0.65,
  shared_competition_notes: ['competes with ATTENTION_DRIVEN_REPRICING at token level'],
  template_invariants: ['chain_attention_primary', 'spillover_absence_blocks'],
};
