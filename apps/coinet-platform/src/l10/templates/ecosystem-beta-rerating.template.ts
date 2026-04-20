/**
 * L10.6 §10.6.10.3.G3 — Template: Ecosystem Beta Rerating
 *
 * Family: ECOSYSTEM_SPILLOVER_ROTATION. Rerating driven by broader
 * ecosystem repricing where the subject rerates via its exposure to
 * leader growth.
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

export const ECOSYSTEM_BETA_RERATING_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.ECOSYSTEM_BETA_RERATING,
  hypothesis_family: L10HypothesisFamilyId.ECOSYSTEM_SPILLOVER_ROTATION,
  hypothesis_name: 'Ecosystem Beta Rerating',
  template_version: '1.0.0',
  description:
    'Rerating through exposure to a repricing leader in the ecosystem; ' +
    'subject inherits the rerating via structural coupling.',
  applicable_scope_types: ['PROTOCOL', 'SECTOR', 'ECOSYSTEM', 'TOKEN'],
  required_feature_patterns: ['L6_beta_exposure', 'L6_ecosystem_rerating'],
  required_event_patterns: ['L6_ecosystem_beta_event'],
  required_validation_patterns: ['L7_ECOSYSTEM_VALIDATION', 'L7_BETA_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.ECOSYSTEM_LEVEL_FLOW,
      L10TemplateSupportDomain.RELATION_CROSS_ASSET,
      L10TemplateSupportDomain.VALIDATED_FUNDAMENTALS,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: true,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.SPILLOVER_ABSENCE,
      L10TemplateContradictionDomain.ASSET_SPECIFIC_DOMINANCE,
      L10TemplateContradictionDomain.FUNDAMENTAL_DEGRADATION,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.ASSET_SPECIFIC_DOMINANCE],
    blocking_domains: [L10TemplateContradictionDomain.SPILLOVER_ABSENCE, L10TemplateContradictionDomain.FUNDAMENTAL_DEGRADATION],
    narrowing_contradiction_classes: [L10ContradictionClass.STRUCTURAL_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'leader_rerating_active', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.ECOSYSTEM_LEVEL_FLOW, is_upgrade_critical: true },
    { confirmation_ref: 'subject_coupling_preserved', confirmation_class: L10ConfirmationClass.STABILITY_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.RELATION_CROSS_ASSET, is_upgrade_critical: true },
  ],
  invalidation_signals: [
    { invalidation_ref: 'leader_stops_rerating', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.SPILLOVER_ABSENCE, active_collapse_threshold: 0.65, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'ecosystem_structure_breaks', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.FUNDAMENTAL_DEGRADATION, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.6 },
    { invalidation_ref: 'asset_decouples_idiosyncratically', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.ASSET_SPECIFIC_DOMINANCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.PRIMARY_REINFORCEMENT_CONDITION, L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION, L10ShiftConditionClass.SPREAD_WIDENING_CONDITION],
    minimum_count: 3,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
    required_regime_classes: ['SECTOR_ROTATION', 'DEFI_RERATING', 'SPOT_LED_EXPANSION'],
    forbidden_regime_classes: ['DELEVERAGING'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: ['VALIDATED_EXPANSION', 'EARLY_NARRATIVE_IGNITION'],
    forbidden_sequence_classes: ['FAILED_CONTINUATION'],
    incompatible_sequence_narrows: true, incompatible_sequence_blocks: false,
  },
  blocker_law: DEFAULT_L10_BLOCKER_LAW,
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.55, minimum_confirmation_coverage: 0.6 },
  restriction_defaults: makeRestrictionDefaults('COMPETITION_MUST_BE_LIVE'),
  rollout_priority: L10HypothesisRolloutPhase.P5_RELATIONAL_EXPLANATION,
  candidate_generation_priority: 3,
  spread_sensitivity_default: 0.6,
  shared_competition_notes: ['competes with FUNDAMENTAL_RERATING when repricing is idiosyncratic'],
  template_invariants: ['leader_coupling_must_hold', 'spillover_absence_blocks'],
};
