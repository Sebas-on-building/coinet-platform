/**
 * L9.6 §9.6.9.4 — Distribution Under Hype Template
 *
 * Family: DISTRIBUTION_UNDER_HYPE.
 * Primary state: DISTRIBUTION_UNDER_HYPE.
 *
 * Hype/narrative intensity remains high while distribution signals
 * appear underneath; structural support weakens; late entrants arrive
 * after stronger earlier signals have decayed.
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

export const DISTRIBUTION_UNDER_HYPE_TEMPLATE: L9SequenceTemplateDefinition = {
  template_id: L9SequenceTemplateId.DISTRIBUTION_UNDER_HYPE,
  production_family: L9ProductionFamilyId.DISTRIBUTION_UNDER_HYPE,
  primary_sequence_state: L9SequenceState.DISTRIBUTION_UNDER_HYPE,
  template_version: '1.0.0',
  description:
    'Hype/narrative intensity remains high; distribution signals appear ' +
    'underneath; structural support weakens; late entrants arrive after ' +
    'stronger earlier signals have decayed (§9.6.9.4).',
  applicable_scope_types: ['ASSET', 'TOKEN', 'SECTOR', 'NARRATIVE_CLUSTER'],
  required_validation_patterns: [
    'DISTRIBUTION_VALIDATION',
    'NARRATIVE_QUALITY_VALIDATION',
  ],
  required_feature_patterns: [
    'DISTRIBUTION_SIGNAL',
    'HYPE_INTENSITY',
    'SUPPORT_QUALITY_DEGRADATION',
  ],
  required_event_patterns: [
    'DISTRIBUTION_EMERGENCE',
  ],
  regime_requirement: L9TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
  lead_lag_requirement: {
    required_quality_ceiling: L9LeadLagQualityClass.WEAK_BUT_USABLE,
    required_quality_floor: L9LeadLagQualityClass.NARROWED_BY_DECAY,
    allowed_lag_classes: [
      L9SemanticLagClass.LONG_LAG,
      L9SemanticLagClass.LATE_CONFIRMATION,
      L9SemanticLagClass.TOO_LATE_FOR_EARLY_PROOF,
    ],
    narrow_on_off_window_lag: false,
  },
  phase_requirement: {
    allowed_primary_phases: [
      L9PhaseClass.LATE,
      L9PhaseClass.REFLEXIVE_LATE,
      L9PhaseClass.CROWDING,
      L9PhaseClass.DECAYING,
    ],
    forbidden_phases: [
      L9PhaseClass.DISCOVERY,
      L9PhaseClass.EARLY,
      L9PhaseClass.CONFIRMING,
      L9PhaseClass.VALIDATED,
      L9PhaseClass.DIGESTION,
      L9PhaseClass.SHOCK_RESPONSE,
    ],
    allow_dual_phase: true,
  },
  decay_requirement: {
    max_tolerated_dominance: L9DecayDominance.HIGH_DECAY,
    requires_non_zero_decay_for_early_evidence: true,
  },
  post_event_requirement: {
    required_anchor_classes: [],
    required_lifecycle: [],
    blocked_while_active_shock: true,
  },
  contradiction_requirement: {
    narrowing_families: [
      L9ChangePointTriggerFamily.REGIME_TRANSITION,
      L9ChangePointTriggerFamily.NARRATIVE_BREAKOUT,
    ],
    blocking_families: [
      L9ChangePointTriggerFamily.POST_EVENT_ENTRY,
    ],
  },
  support_domains: [
    L9TemplateSupportDomain.LATE_ENTRANT_ORDERING,
    L9TemplateSupportDomain.NARRATIVE_BREADTH_GROWTH,
    L9TemplateSupportDomain.VALIDATED_CONTINUATION,
    L9TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
  ],
  challenge_domains: [
    L9TemplateChallengeDomain.STRUCTURAL_CONFIRMATION_GAP,
    L9TemplateChallengeDomain.EARLY_SUPPORT_DECAYED,
    L9TemplateChallengeDomain.CONTRADICTION_BUNDLE_PRESSURE,
    L9TemplateChallengeDomain.REFLEXIVITY_DOMINANCE,
    L9TemplateChallengeDomain.POST_EVENT_ACTIVE_SHOCK,
  ],
  clean_emission: {
    sequence_completeness_minimum: 0.65,
    requires_ambiguity_resolved: false,
    requires_regime_not_hostile: true,
    requires_support_domain_coverage_minimum: 0.70,
  },
  rollout_priority: L9SequenceRolloutPhase.P5_DECEPTIVE_PATTERN,
  template_invariants: [
    'distribution_evidence_required',
    'hype_intensity_required',
    'earlier_support_materially_decayed_required',
    'no_clean_emission_if_earlier_support_still_dominant',
  ],
};
