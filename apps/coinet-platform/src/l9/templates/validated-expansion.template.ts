/**
 * L9.6 §9.6.5.6 — Validated Expansion Template
 *
 * Family: ACCUMULATION_TO_EXPANSION.
 * Primary state: VALIDATED_EXPANSION.
 *
 * Ordered progression from early support into broader confirmation;
 * phase at VALIDATED/EXPANSION; leverage signals present only as
 * later reinforcement.
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

export const VALIDATED_EXPANSION_TEMPLATE: L9SequenceTemplateDefinition = {
  template_id: L9SequenceTemplateId.VALIDATED_EXPANSION,
  production_family: L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION,
  primary_sequence_state: L9SequenceState.VALIDATED_EXPANSION,
  template_version: '1.0.0',
  description:
    'Ordered progression from early support into broader confirmation; ' +
    'structural participation improving; leverage is later ' +
    'reinforcement, not driver (§9.6.5.6).',
  applicable_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL', 'CHAIN', 'SECTOR'],
  required_validation_patterns: [
    'STRUCTURAL_CONFIRMATION_VALIDATION',
    'PARTICIPATION_VALIDATION',
    'LIQUIDITY_HEALTH_VALIDATION',
  ],
  required_feature_patterns: [
    'STRUCTURAL_CONTINUATION',
    'PARTICIPATION_DEEPENING',
    'LIQUIDITY_HEALTH',
  ],
  required_event_patterns: [
    'STRUCTURAL_CONFIRMATION',
  ],
  regime_requirement: L9TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
  lead_lag_requirement: {
    required_quality_ceiling: L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL,
    required_quality_floor: L9LeadLagQualityClass.WEAK_BUT_USABLE,
    allowed_lag_classes: [
      L9SemanticLagClass.IMMEDIATE,
      L9SemanticLagClass.SHORT_LAG,
      L9SemanticLagClass.MEDIUM_LAG,
      L9SemanticLagClass.LONG_LAG,
    ],
    narrow_on_off_window_lag: true,
  },
  phase_requirement: {
    allowed_primary_phases: [
      L9PhaseClass.VALIDATED,
      L9PhaseClass.EXPANSION,
    ],
    forbidden_phases: [
      L9PhaseClass.LATE,
      L9PhaseClass.REFLEXIVE_LATE,
      L9PhaseClass.DIGESTION,
      L9PhaseClass.SHOCK_RESPONSE,
      L9PhaseClass.DECAYING,
    ],
    allow_dual_phase: true,
  },
  decay_requirement: {
    max_tolerated_dominance: L9DecayDominance.MODERATE_DECAY,
    requires_non_zero_decay_for_early_evidence: false,
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
      L9ChangePointTriggerFamily.DECAY_DOMINANCE,
      L9ChangePointTriggerFamily.POST_EVENT_ENTRY,
      L9ChangePointTriggerFamily.LEAD_LAG_INVERSION,
    ],
  },
  support_domains: [
    L9TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
    L9TemplateSupportDomain.VALIDATED_CONTINUATION,
    L9TemplateSupportDomain.LIQUIDITY_IMPROVEMENT,
    L9TemplateSupportDomain.EARLY_LEAD_SIGNAL_PRESENCE,
    L9TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
  ],
  challenge_domains: [
    L9TemplateChallengeDomain.LEVERAGE_CROWDING,
    L9TemplateChallengeDomain.EARLY_SUPPORT_DECAYED,
    L9TemplateChallengeDomain.CONTRADICTION_BUNDLE_PRESSURE,
    L9TemplateChallengeDomain.POST_EVENT_ACTIVE_SHOCK,
    L9TemplateChallengeDomain.DISTRIBUTION_DOMINANCE,
  ],
  clean_emission: {
    sequence_completeness_minimum: 0.65,
    requires_ambiguity_resolved: false,
    requires_regime_not_hostile: true,
    requires_support_domain_coverage_minimum: 0.80,
  },
  rollout_priority: L9SequenceRolloutPhase.P1_CORE,
  template_invariants: [
    'crowding_is_later_reinforcement_only',
    'early_support_must_not_be_decayed',
    'active_shock_blocks_clean_emission',
  ],
};
