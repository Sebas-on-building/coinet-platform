/**
 * L10.6 §10.6.10.3.G1 — Template: Sector Spillover Repricing
 *
 * Family: ECOSYSTEM_SPILLOVER_ROTATION. Repricing driven by sector-level
 * rotation or cross-asset flow; support primarily ecosystem-relational.
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

export const SECTOR_SPILLOVER_REPRICING_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.SECTOR_SPILLOVER_REPRICING,
  hypothesis_family: L10HypothesisFamilyId.ECOSYSTEM_SPILLOVER_ROTATION,
  hypothesis_name: 'Sector Spillover Repricing',
  template_version: '1.0.0',
  description:
    'Sector-level rotation / spillover drives repricing; subject inherits ' +
    'through cross-asset participation.',
  applicable_scope_types: ['SECTOR', 'TOKEN', 'PROTOCOL'],
  required_feature_patterns: ['L6_sector_rotation', 'L6_cross_asset_flow'],
  required_event_patterns: ['L6_sector_spillover_event'],
  required_validation_patterns: ['L7_SECTOR_ROTATION_VALIDATION', 'L7_SPILLOVER_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.ECOSYSTEM_LEVEL_FLOW,
      L10TemplateSupportDomain.RELATION_CROSS_ASSET,
      L10TemplateSupportDomain.DEMAND_BREADTH,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: true,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.SPILLOVER_ABSENCE,
      L10TemplateContradictionDomain.ASSET_SPECIFIC_DOMINANCE,
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP],
    blocking_domains: [L10TemplateContradictionDomain.SPILLOVER_ABSENCE, L10TemplateContradictionDomain.ASSET_SPECIFIC_DOMINANCE],
    narrowing_contradiction_classes: [L10ContradictionClass.STRUCTURAL_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'sector_rotation_active', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.ECOSYSTEM_LEVEL_FLOW, is_upgrade_critical: true },
    { confirmation_ref: 'subject_participates_with_sector', confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.RELATION_CROSS_ASSET, is_upgrade_critical: true },
  ],
  invalidation_signals: [
    { invalidation_ref: 'spillover_evidence_absent', invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.SPILLOVER_ABSENCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'asset_specific_explanation_dominant', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.ASSET_SPECIFIC_DOMINANCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'sector_rotation_reverses', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.PRIMARY_REINFORCEMENT_CONDITION, L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION, L10ShiftConditionClass.SPREAD_WIDENING_CONDITION],
    minimum_count: 3,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
    required_regime_classes: ['SECTOR_ROTATION', 'NARRATIVE_BREAKOUT', 'SPOT_LED_EXPANSION'],
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
  candidate_generation_priority: 1,
  spread_sensitivity_default: 0.6,
  shared_competition_notes: ['competes with NARRATIVE_REFLEXIVE and FUNDAMENTAL_RERATING'],
  template_invariants: ['ecosystem_flow_primary', 'spillover_absence_blocks'],
};
