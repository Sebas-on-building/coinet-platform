/**
 * L9.6 §9.6.7.5 — Late-Stage Reflexivity Template
 *
 * Family: REFLEXIVITY.
 * Primary state: LATE_STAGE_REFLEXIVITY.
 *
 * Reflexive participation dominates; contradiction posture rising;
 * signal ordering indicates lateness, not early-stage validation.
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

export const LATE_STAGE_REFLEXIVITY_TEMPLATE: L9SequenceTemplateDefinition = {
  template_id: L9SequenceTemplateId.LATE_STAGE_REFLEXIVITY,
  production_family: L9ProductionFamilyId.REFLEXIVITY,
  primary_sequence_state: L9SequenceState.LATE_STAGE_REFLEXIVITY,
  template_version: '1.0.0',
  description:
    'Prior expansion established; reflexive participation dominates; ' +
    'lead-lag ordering shows late entrants after stronger earlier ' +
    'support; early support narrowing under decay or contradiction ' +
    '(§9.6.7.5).',
  applicable_scope_types: ['ASSET', 'TOKEN', 'MARKET', 'CHAIN', 'ECOSYSTEM'],
  required_validation_patterns: [
    'PARTICIPATION_VALIDATION',
    'DERIVATIVES_STRUCTURE_VALIDATION',
  ],
  required_feature_patterns: [
    'REFLEXIVE_PARTICIPATION',
    'LATE_ENTRANT_SIGNAL',
    'EARLY_SUPPORT_NARROWING',
  ],
  required_event_patterns: [
    'REFLEXIVITY_INFLECTION',
    'LATE_ENTRANT_SURGE',
  ],
  regime_requirement: L9TemplateRegimeRequirement.MUST_NARROW_UNDER_HOSTILE,
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
      L9ChangePointTriggerFamily.CONTRADICTION_BUNDLE,
      L9ChangePointTriggerFamily.REGIME_TRANSITION,
    ],
    blocking_families: [
      L9ChangePointTriggerFamily.POST_EVENT_ENTRY,
    ],
  },
  support_domains: [
    L9TemplateSupportDomain.LATE_ENTRANT_ORDERING,
    L9TemplateSupportDomain.VALIDATED_CONTINUATION,
    L9TemplateSupportDomain.DERIVATIVES_EXPANSION,
    L9TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
  ],
  challenge_domains: [
    L9TemplateChallengeDomain.STRUCTURAL_CONFIRMATION_GAP,
    L9TemplateChallengeDomain.CONTRADICTION_BUNDLE_PRESSURE,
    L9TemplateChallengeDomain.HOSTILE_REGIME_POSTURE,
    L9TemplateChallengeDomain.POST_EVENT_ACTIVE_SHOCK,
    L9TemplateChallengeDomain.REFLEXIVITY_DOMINANCE,
  ],
  clean_emission: {
    sequence_completeness_minimum: 0.70,
    requires_ambiguity_resolved: false,
    requires_regime_not_hostile: false,
    requires_support_domain_coverage_minimum: 0.70,
  },
  rollout_priority: L9SequenceRolloutPhase.P3_LATE_STAGE,
  template_invariants: [
    'prior_expansion_required',
    'late_ordering_required',
    'reflexive_signals_dominant',
    'active_shock_blocks_clean_emission',
  ],
};
