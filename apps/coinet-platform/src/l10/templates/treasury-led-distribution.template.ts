/**
 * L10.6 §10.6.8.3.E2 — Template: Treasury-Led Distribution
 *
 * Family: SUPPLY_OVERHANG_DISTRIBUTION. Treasury or insider entities
 * leading distribution; structural support weak; holder surface clear.
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

export const TREASURY_LED_DISTRIBUTION_TEMPLATE: L10HypothesisTemplateDefinition = {
  template_id: L10HypothesisTemplateId.TREASURY_LED_DISTRIBUTION,
  hypothesis_family: L10HypothesisFamilyId.SUPPLY_OVERHANG_DISTRIBUTION,
  hypothesis_name: 'Treasury-Led Distribution',
  template_version: '1.0.0',
  description:
    'Treasury / insider entity outflows drive distribution; holder ' +
    'surface and flow evidence converge against a demand thesis.',
  applicable_scope_types: ['TOKEN', 'PROTOCOL'],
  required_feature_patterns: ['L6_treasury_outflow', 'L6_insider_distribution'],
  required_event_patterns: ['L6_treasury_distribution_event'],
  required_validation_patterns: ['L7_TREASURY_VALIDATION', 'L7_HOLDER_VALIDATION'],
  support_requirement: {
    required_support_domains: [
      L10TemplateSupportDomain.TREASURY_ENTITY_FLOW,
      L10TemplateSupportDomain.DISTRIBUTION_DIVERGENCE,
      L10TemplateSupportDomain.SUPPLY_OVERHANG_EVIDENCE,
    ],
    minimum_domains_present: 2,
    primary_anchor_roles: [L10SupportRoleClass.PRIMARY_SUPPORT, L10SupportRoleClass.SECONDARY_SUPPORT],
    tolerates_degraded_corroboration: false,
  },
  contradiction_requirement: {
    required_contradiction_domains: [
      L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE,
      L10TemplateContradictionDomain.QUALITY_IMPROVEMENT,
      L10TemplateContradictionDomain.VALIDATION_CONTRADICTION,
    ],
    narrowing_domains: [L10TemplateContradictionDomain.VALIDATION_CONTRADICTION],
    blocking_domains: [L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE, L10TemplateContradictionDomain.QUALITY_IMPROVEMENT],
    narrowing_contradiction_classes: [L10ContradictionClass.VALIDATION_CONTRADICTION],
    blocking_contradiction_classes: [L10ContradictionClass.DIRECT_CONTRADICTION, L10ContradictionClass.OVERHANG_CONTRADICTION],
  },
  required_confirmations: [
    { confirmation_ref: 'treasury_outflows_persist', confirmation_class: L10ConfirmationClass.CORE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.TREASURY_ENTITY_FLOW, is_upgrade_critical: true },
    { confirmation_ref: 'distribution_divergence_intensifies', confirmation_class: L10ConfirmationClass.UPGRADE_CONFIRMATION,
      support_domain: L10TemplateSupportDomain.DISTRIBUTION_DIVERGENCE, is_upgrade_critical: true },
  ],
  invalidation_signals: [
    { invalidation_ref: 'treasury_flow_reverses', invalidation_class: L10InvalidationClass.ACTIVE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.55 },
    { invalidation_ref: 'quality_improvement_emerges', invalidation_class: L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.QUALITY_IMPROVEMENT, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.6 },
    { invalidation_ref: 'distribution_evidence_collapses', invalidation_class: L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
      contradiction_domain: L10TemplateContradictionDomain.VALIDATION_CONTRADICTION, active_collapse_threshold: 0.7, confidence_cap_on_potential: 0.5 },
  ],
  shift_condition_requirement: {
    required_classes: [L10ShiftConditionClass.PRIMARY_COLLAPSE_CONDITION, L10ShiftConditionClass.SPREAD_NARROWING_CONDITION, L10ShiftConditionClass.COMPETITION_RESOLUTION_CONDITION],
    minimum_count: 3,
  },
  regime_posture: {
    requirement: L10TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
    required_regime_classes: ['DISTRIBUTION', 'MATURE_TREND'],
    forbidden_regime_classes: ['EARLY_ACCUMULATION', 'SPOT_LED_EXPANSION'],
    hostile_regime_narrows: true, hostile_regime_blocks: false,
  },
  sequence_posture: {
    requirement: L10TemplateSequenceRequirement.REQUIRED_COMPATIBLE_STATE,
    required_sequence_classes: ['DISTRIBUTION_UNDER_HYPE', 'POST_SHOCK_DIGESTION'],
    forbidden_sequence_classes: ['PRE_NARRATIVE_ACCUMULATION'],
    incompatible_sequence_narrows: false, incompatible_sequence_blocks: true,
  },
  blocker_law: DEFAULT_L10_BLOCKER_LAW,
  clean_emission: { ...DEFAULT_L10_CLEAN_EMISSION, minimum_primary_support_strength: 0.6, minimum_candidate_stability_score: 0.5 },
  restriction_defaults: makeRestrictionDefaults('NARROWED_DEFAULT'),
  rollout_priority: L10HypothesisRolloutPhase.P3_COMPLEX_INTERPRETATION,
  candidate_generation_priority: 2,
  spread_sensitivity_default: 0.65,
  shared_competition_notes: ['shares spread with DISTRIBUTION_UNDER_HYPE and FUNDAMENTAL_RERATING'],
  template_invariants: ['treasury_flow_must_be_present', 'clean_demand_blocks'],
};
