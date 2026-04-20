/**
 * L9.6 §9.6.8.4 — Post-Shock Digestion Template
 *
 * Family: SHOCK_DIGESTION.
 * Primary state: POST_SHOCK_DIGESTION.
 *
 * Shock realized; immediate damage phase recorded; stabilization or
 * partial recovery emerges; decay of shock relevance incomplete.
 * Requires a legal post-event anchor class (§9.6.8.4).
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
  L9PostEventAnchorClass,
  L9PostEventLifecycle,
} from '../contracts/l9-post-event-window-policy';
import {
  L9LeadLagQualityClass,
  L9SemanticLagClass,
} from '../contracts/l9-lead-lag-policy';

export const POST_SHOCK_DIGESTION_TEMPLATE: L9SequenceTemplateDefinition = {
  template_id: L9SequenceTemplateId.POST_SHOCK_DIGESTION,
  production_family: L9ProductionFamilyId.SHOCK_DIGESTION,
  primary_sequence_state: L9SequenceState.POST_SHOCK_DIGESTION,
  template_version: '1.0.0',
  description:
    'Shock realized; immediate damage phase recorded; stabilization or ' +
    'partial recovery emerges; full resumed trend not yet justified; ' +
    'decay of shock relevance incomplete (§9.6.8.4).',
  applicable_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL', 'ECOSYSTEM', 'CHAIN'],
  required_validation_patterns: [
    'POST_EVENT_VALIDATION',
    'STABILIZATION_VALIDATION',
  ],
  required_feature_patterns: [
    'POST_EVENT_PERSISTENCE',
    'DAMAGE_PHASE_SIGNAL',
    'STABILIZATION_SIGNAL',
  ],
  required_event_patterns: [
    'UNLOCK_REALIZATION',
    'LIQUIDATION_SHOCK',
    'SECURITY_SHOCK',
  ],
  regime_requirement: L9TemplateRegimeRequirement.REQUIRED_PRESENT,
  lead_lag_requirement: {
    required_quality_ceiling: L9LeadLagQualityClass.WEAK_BUT_USABLE,
    required_quality_floor: L9LeadLagQualityClass.NARROWED_BY_DECAY,
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
      L9PhaseClass.SHOCK_RESPONSE,
      L9PhaseClass.DIGESTION,
      L9PhaseClass.RECOVERY,
    ],
    forbidden_phases: [
      L9PhaseClass.DISCOVERY,
      L9PhaseClass.EARLY,
      L9PhaseClass.VALIDATED,
      L9PhaseClass.EXPANSION,
      L9PhaseClass.CROWDING,
      L9PhaseClass.LATE,
      L9PhaseClass.REFLEXIVE_LATE,
    ],
    allow_dual_phase: true,
  },
  decay_requirement: {
    max_tolerated_dominance: L9DecayDominance.HIGH_DECAY,
    requires_non_zero_decay_for_early_evidence: true,
  },
  post_event_requirement: {
    required_anchor_classes: [
      L9PostEventAnchorClass.UNLOCK,
      L9PostEventAnchorClass.LIQUIDATION,
      L9PostEventAnchorClass.SECURITY_EVENT,
      L9PostEventAnchorClass.CONTRADICTION_BUNDLE,
    ],
    required_lifecycle: [
      L9PostEventLifecycle.DIGESTING,
      L9PostEventLifecycle.STABILIZING,
      L9PostEventLifecycle.ACTIVE_SHOCK,
    ],
    blocked_while_active_shock: false,
  },
  contradiction_requirement: {
    narrowing_families: [
      L9ChangePointTriggerFamily.CONTRADICTION_BUNDLE,
      L9ChangePointTriggerFamily.REGIME_TRANSITION,
      L9ChangePointTriggerFamily.DECAY_DOMINANCE,
    ],
    blocking_families: [
      L9ChangePointTriggerFamily.LEAD_LAG_INVERSION,
    ],
  },
  support_domains: [
    L9TemplateSupportDomain.POST_EVENT_STABILIZATION,
    L9TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
    L9TemplateSupportDomain.LIQUIDITY_IMPROVEMENT,
    L9TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
  ],
  challenge_domains: [
    L9TemplateChallengeDomain.POST_EVENT_ACTIVE_SHOCK,
    L9TemplateChallengeDomain.POST_SHOCK_RELEVANCE,
    L9TemplateChallengeDomain.CONTRADICTION_BUNDLE_PRESSURE,
    L9TemplateChallengeDomain.EARLY_SUPPORT_DECAYED,
    L9TemplateChallengeDomain.HOSTILE_REGIME_POSTURE,
  ],
  clean_emission: {
    sequence_completeness_minimum: 0.60,
    requires_ambiguity_resolved: false,
    requires_regime_not_hostile: false,
    requires_support_domain_coverage_minimum: 0.70,
  },
  rollout_priority: L9SequenceRolloutPhase.P4_SHOCK_RECOVERY,
  template_invariants: [
    'post_event_anchor_required',
    'damage_phase_required',
    'no_full_recovery_while_shock_dominant',
    'expired_window_not_treated_as_current',
  ],
};
