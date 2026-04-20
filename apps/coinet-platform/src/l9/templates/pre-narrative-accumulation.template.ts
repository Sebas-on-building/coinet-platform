/**
 * L9.6 §9.6.5.4 — Pre-Narrative Accumulation Template
 *
 * Family: ACCUMULATION_TO_EXPANSION.
 * Primary state: PRE_NARRATIVE_ACCUMULATION.
 *
 * Requires accumulation behavior before broad narrative saturation,
 * liquidity improvement following/accompanying early accumulation,
 * distribution not dominant, narrative breadth low-to-moderate.
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

export const PRE_NARRATIVE_ACCUMULATION_TEMPLATE: L9SequenceTemplateDefinition = {
  template_id: L9SequenceTemplateId.PRE_NARRATIVE_ACCUMULATION,
  production_family: L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION,
  primary_sequence_state: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
  template_version: '1.0.0',
  description:
    'Accumulation appears before broad narrative saturation; liquidity ' +
    'improvement follows or accompanies; late speculative crowding is ' +
    'absent or limited; distribution is not dominant (§9.6.5.4).',
  applicable_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL', 'CHAIN'],
  required_validation_patterns: [
    'ACCUMULATION_VALIDATION',
    'LIQUIDITY_HEALTH_VALIDATION',
  ],
  required_feature_patterns: [
    'ONCHAIN_ACCUMULATION',
    'LIQUIDITY_DEEPENING',
    'NARRATIVE_BREADTH_SIGNAL',
  ],
  required_event_patterns: [
    'SMART_MONEY_ACCUMULATION',
    'LIQUIDITY_INJECTION',
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
      L9PhaseClass.DISCOVERY,
      L9PhaseClass.EARLY,
    ],
    forbidden_phases: [
      L9PhaseClass.CROWDING,
      L9PhaseClass.LATE,
      L9PhaseClass.REFLEXIVE_LATE,
      L9PhaseClass.DIGESTION,
      L9PhaseClass.SHOCK_RESPONSE,
      L9PhaseClass.DECAYING,
    ],
    allow_dual_phase: false,
  },
  decay_requirement: {
    max_tolerated_dominance: L9DecayDominance.LOW_DECAY,
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
    ],
  },
  support_domains: [
    L9TemplateSupportDomain.ACCUMULATION_EVIDENCE,
    L9TemplateSupportDomain.LIQUIDITY_IMPROVEMENT,
    L9TemplateSupportDomain.EARLY_LEAD_SIGNAL_PRESENCE,
    L9TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
  ],
  challenge_domains: [
    L9TemplateChallengeDomain.LEVERAGE_CROWDING,
    L9TemplateChallengeDomain.NARRATIVE_SATURATION,
    L9TemplateChallengeDomain.DISTRIBUTION_DOMINANCE,
    L9TemplateChallengeDomain.EARLY_SUPPORT_DECAYED,
    L9TemplateChallengeDomain.CONTRADICTION_BUNDLE_PRESSURE,
  ],
  clean_emission: {
    sequence_completeness_minimum: 0.55,
    requires_ambiguity_resolved: true,
    requires_regime_not_hostile: true,
    requires_support_domain_coverage_minimum: 0.75,
  },
  rollout_priority: L9SequenceRolloutPhase.P1_CORE,
  template_invariants: [
    'accumulation_before_narrative',
    'no_clean_under_crowding',
    'no_clean_under_distribution_dominance',
    'regime_must_be_compatible',
  ],
};
