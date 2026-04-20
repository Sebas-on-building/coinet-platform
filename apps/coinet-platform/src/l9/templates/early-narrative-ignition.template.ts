/**
 * L9.6 §9.6.5.5 — Early Narrative Ignition Template
 *
 * Family: ACCUMULATION_TO_EXPANSION.
 * Primary state: EARLY_NARRATIVE_IGNITION.
 *
 * Narrative breadth expands after prior structural/accumulation
 * signals; participation strengthens; still early enough to avoid
 * late reflexive semantics.
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

export const EARLY_NARRATIVE_IGNITION_TEMPLATE: L9SequenceTemplateDefinition = {
  template_id: L9SequenceTemplateId.EARLY_NARRATIVE_IGNITION,
  production_family: L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION,
  primary_sequence_state: L9SequenceState.EARLY_NARRATIVE_IGNITION,
  template_version: '1.0.0',
  description:
    'Narrative breadth expands after prior structural or accumulation ' +
    'signals; participation strengthens; contradiction posture is ' +
    'manageable; still early enough to avoid late reflexive semantics ' +
    '(§9.6.5.5).',
  applicable_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL', 'CHAIN', 'SECTOR'],
  required_validation_patterns: [
    'NARRATIVE_VALIDATION',
    'PARTICIPATION_VALIDATION',
  ],
  required_feature_patterns: [
    'NARRATIVE_BREADTH_GROWTH',
    'PARTICIPATION_DEEPENING',
    'STRUCTURAL_SUPPORT_PERSISTENCE',
  ],
  required_event_patterns: [
    'NARRATIVE_BREAKOUT',
    'PARTICIPATION_INFLECTION',
  ],
  regime_requirement: L9TemplateRegimeRequirement.REQUIRED_COMPATIBLE,
  lead_lag_requirement: {
    required_quality_ceiling: L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL,
    required_quality_floor: L9LeadLagQualityClass.WEAK_BUT_USABLE,
    allowed_lag_classes: [
      L9SemanticLagClass.IMMEDIATE,
      L9SemanticLagClass.SHORT_LAG,
      L9SemanticLagClass.MEDIUM_LAG,
    ],
    narrow_on_off_window_lag: true,
  },
  phase_requirement: {
    allowed_primary_phases: [
      L9PhaseClass.EARLY,
      L9PhaseClass.CONFIRMING,
      L9PhaseClass.VALIDATED,
    ],
    forbidden_phases: [
      L9PhaseClass.CROWDING,
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
      L9ChangePointTriggerFamily.NARRATIVE_BREAKOUT,
    ],
    blocking_families: [
      L9ChangePointTriggerFamily.DECAY_DOMINANCE,
      L9ChangePointTriggerFamily.POST_EVENT_ENTRY,
    ],
  },
  support_domains: [
    L9TemplateSupportDomain.NARRATIVE_BREADTH_GROWTH,
    L9TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
    L9TemplateSupportDomain.EARLY_LEAD_SIGNAL_PRESENCE,
    L9TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
  ],
  challenge_domains: [
    L9TemplateChallengeDomain.NARRATIVE_SATURATION,
    L9TemplateChallengeDomain.DISTRIBUTION_DOMINANCE,
    L9TemplateChallengeDomain.EARLY_SUPPORT_DECAYED,
    L9TemplateChallengeDomain.CONTRADICTION_BUNDLE_PRESSURE,
    L9TemplateChallengeDomain.POST_EVENT_ACTIVE_SHOCK,
  ],
  clean_emission: {
    sequence_completeness_minimum: 0.60,
    requires_ambiguity_resolved: false,
    requires_regime_not_hostile: true,
    requires_support_domain_coverage_minimum: 0.75,
  },
  rollout_priority: L9SequenceRolloutPhase.P1_CORE,
  template_invariants: [
    'narrative_requires_prior_structure_or_accumulation',
    'no_clean_under_active_shock',
    'dominant_distribution_blocks',
  ],
};
