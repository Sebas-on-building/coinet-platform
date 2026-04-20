/**
 * L9.6 §9.6.7.4 — Leverage Crowding Phase Template
 *
 * Family: REFLEXIVITY.
 * Primary state: LEVERAGE_CROWDING_PHASE.
 *
 * OI expansion follows/overtakes prior validation; crowding emerges;
 * transition risk elevated; clean continuation trust narrows.
 */

import { L9SequenceTemplateDefinition } from '../contracts/sequence-template-definition';
import {
  L9ProductionFamilyId,
  L9SequenceRolloutPhase,
  L9SequenceTemplateId,
  L9TemplateChallengeDomain,
  L9TemplateRegimeRequirement,
  L9TemplateSupportDomain,
} from '../contracts/sequence-template-policy';
import { L9SequenceState } from '../contracts/sequence-state';
import { L9PhaseClass } from '../contracts/phase-state';
import { L9ChangePointTriggerFamily } from '../contracts/l9-change-point-policy';
import { L9DecayDominance } from '../contracts/l9-decay-policy';
import {
  L9LeadLagQualityClass,
  L9SemanticLagClass,
} from '../contracts/l9-lead-lag-policy';

export const LEVERAGE_CROWDING_PHASE_TEMPLATE: L9SequenceTemplateDefinition = {
  template_id: L9SequenceTemplateId.LEVERAGE_CROWDING_PHASE,
  production_family: L9ProductionFamilyId.REFLEXIVITY,
  primary_sequence_state: L9SequenceState.LEVERAGE_CROWDING_PHASE,
  template_version: '1.0.0',
  description:
    'OI expansion follows or overtakes prior validation; crowding emerges; ' +
    'leverage signals dominant; transition risk elevated; clean ' +
    'continuation trust narrowed (§9.6.7.4).',
  applicable_scope_types: ['ASSET', 'TOKEN', 'MARKET', 'CHAIN', 'ECOSYSTEM'],
  required_validation_patterns: [
    'DERIVATIVES_STRUCTURE_VALIDATION',
    'PARTICIPATION_VALIDATION',
  ],
  required_feature_patterns: [
    'OI_EXPANSION',
    'FUNDING_BASIS_STRESS',
    'PARTICIPATION_CROWDING',
  ],
  required_event_patterns: [
    'FUNDING_SPIKE',
    'OI_ACCELERATION',
  ],
  regime_requirement: L9TemplateRegimeRequirement.MUST_NARROW_UNDER_HOSTILE,
  lead_lag_requirement: {
    required_quality_ceiling: L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL,
    required_quality_floor: L9LeadLagQualityClass.NARROWED_BY_CONTRADICTION,
    allowed_lag_classes: [
      L9SemanticLagClass.SHORT_LAG,
      L9SemanticLagClass.MEDIUM_LAG,
      L9SemanticLagClass.LONG_LAG,
      L9SemanticLagClass.LATE_CONFIRMATION,
    ],
    narrow_on_off_window_lag: true,
  },
  phase_requirement: {
    allowed_primary_phases: [
      L9PhaseClass.EXPANSION,
      L9PhaseClass.CROWDING,
    ],
    forbidden_phases: [
      L9PhaseClass.DISCOVERY,
      L9PhaseClass.EARLY,
      L9PhaseClass.CONFIRMING,
      L9PhaseClass.DIGESTION,
      L9PhaseClass.SHOCK_RESPONSE,
    ],
    allow_dual_phase: true,
  },
  decay_requirement: {
    max_tolerated_dominance: L9DecayDominance.MODERATE_DECAY,
    requires_non_zero_decay_for_early_evidence: true,
  },
  post_event_requirement: {
    required_anchor_classes: [],
    required_lifecycle: [],
    blocked_while_active_shock: true,
  },
  contradiction_requirement: {
    narrowing_families: [
      L9ChangePointTriggerFamily.CONTRADICTION_BUNDLE,
      L9ChangePointTriggerFamily.REGIME_TRANSITION,
      L9ChangePointTriggerFamily.LEAD_LAG_INVERSION,
    ],
    blocking_families: [
      L9ChangePointTriggerFamily.POST_EVENT_ENTRY,
    ],
  },
  support_domains: [
    L9TemplateSupportDomain.DERIVATIVES_EXPANSION,
    L9TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
    L9TemplateSupportDomain.VALIDATED_CONTINUATION,
    L9TemplateSupportDomain.LATE_ENTRANT_ORDERING,
  ],
  challenge_domains: [
    L9TemplateChallengeDomain.EARLY_SUPPORT_DECAYED,
    L9TemplateChallengeDomain.STRUCTURAL_CONFIRMATION_GAP,
    L9TemplateChallengeDomain.CONTRADICTION_BUNDLE_PRESSURE,
    L9TemplateChallengeDomain.HOSTILE_REGIME_POSTURE,
    L9TemplateChallengeDomain.POST_EVENT_ACTIVE_SHOCK,
  ],
  clean_emission: {
    sequence_completeness_minimum: 0.65,
    requires_ambiguity_resolved: false,
    requires_regime_not_hostile: false,
    requires_support_domain_coverage_minimum: 0.75,
  },
  rollout_priority: L9SequenceRolloutPhase.P3_LATE_STAGE,
  template_invariants: [
    'prior_validation_required',
    'derivatives_material',
    'expansion_vs_crowding_ambiguity_explicit_where_relevant',
  ],
};
