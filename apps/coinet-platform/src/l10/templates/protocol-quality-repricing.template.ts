/**
 * L10.6 §10.6.7.3.D2 — Template: Protocol-Quality Repricing
 *
 * Family: FUNDAMENTAL_RERATING. Protocol-specific quality support;
 * structural confirmation stronger than attention.
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

export const PROTOCOL_QUALITY_REPRICING_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.PROTOCOL_QUALITY_REPRICING,
  hypothesis_family: L10HypothesisFamilyId.FUNDAMENTAL_RERATING,
  hypothesis_name: 'Protocol-Quality Repricing',
  template_version: '1.0.0',
  description:
    'Protocol-specific quality support with structural confirmation ' +
    'stronger than mere attention.',
  applicable_scope_types: ['PROTOCOL', 'TOKEN'],
  required_feature_patterns: ['L6_protocol_quality_growth', 'L6_protocol_metric_improvement'],
  required_event_patterns: ['L6_protocol_repricing_event'],
  required_validation_patterns: ['L7_PROTOCOL_QUALITY_VALIDATION', 'L7_FUNDAMENTAL_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.PROTOCOL_QUALITY,
      L10TemplateSupportDomain.VALIDATED_FUNDAMENTALS,
      L10TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: false,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.PROTOCOL_QUALITY_DEGRADATION,
      L10TemplateContradictionDomain.VALIDATION_CONTRADICTION,
      L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, L10TemplateContradictionDomain.VALIDATION_CONTRADICTION],
    blocking_domains: [L10TemplateContradictionDomain.PROTOCOL_QUALITY_DEGRADATION],
    narrowing_contradiction_classes: [L10ContradictionClass.VALIDATION_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'continued_protocol_quality_evidence', confirmation_class: L10ConfirmationClass.UPGRADE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.PROTOCOL_QUALITY, is_upgrade_critical: true },
    { confirmation_ref: 'absence_of_active_degradation', confirmation_class: L10ConfirmationClass.RISK_RELIEF_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.VALIDATED_FUNDAMENTALS, is_upgrade_critical: false },
  ],
  invalidation_signals: [
    { invalidation_ref: 'protocol_quality_support_fails', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.PROTOCOL_QUALITY_DEGRADATION, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'shift_to_non_fundamental_dominant', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.STRUCTURAL_SUPPORT_GAP, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.6 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.PRIMARY_REINFORCEMENT_CONDITION, L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION],
    minimum_count: 2,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.MUST_NARROW_UNDER_HOSTILE,
    required_regime_classes: ['SPOT_LED_EXPANSION', 'DEFI_RERATING', 'MATURE_TREND'],
    forbidden_regime_classes: ['DISTRIBUTION', 'POST_UNLOCK_DIGESTION'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.MUST_NARROW_UNDER_INCOMPATIBLE,
    required_sequence_classes: ['VALIDATED_EXPANSION', 'EARLY_NARRATIVE_IGNITION'],
    forbidden_sequence_classes: ['FAILED_CONTINUATION'],
    incompatible_sequence_narrows: true, incompatible_sequence_blocks: false,
  },
  blocker_law: DEFAULT_L10_BLOCKER_LAW,
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.6, minimum_confirmation_coverage: 0.65 },
  restriction_defaults: makeRestrictionDefaults('COMPETITION_MUST_BE_LIVE'),
  rollout_priority: L10HypothesisRolloutPhase.P3_COMPLEX_INTERPRETATION,
  candidate_generation_priority: 2,
  spread_sensitivity_default: 0.5,
  shared_competition_notes: ['competes with ECOSYSTEM_BETA_RERATING at sector level'],
  template_invariants: ['protocol_quality_primary', 'protocol_quality_degradation_blocks'],
};
