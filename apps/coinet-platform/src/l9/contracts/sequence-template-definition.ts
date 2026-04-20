/**
 * L9.6 — Sequence Template Definition
 *
 * §9.6.4 — Template doctrine. A sequence template is a *governed
 * family-bound execution contract* that defines how a sequence state
 * is legally reached, maintained, narrowed, or blocked (§9.6.4.2).
 *
 * §9.6.4.3 — Every template must declare: id, family, primary state,
 * version, applicable scopes, required validation/feature/event
 * patterns, regime posture, lead-lag posture, phase posture, decay
 * posture, support and challenge domains, contradiction posture,
 * post-event anchor requirements, completeness minimum, clean-emission
 * requirements, rollout priority.
 *
 * §9.6.4.4 — A template is illegal if it omits any required field, if
 * it does not bind to exactly one family, or if its posture omits
 * challenge domains (templates must always be narrowable).
 */

import { L9SequenceScopeType } from './sequence-family';
import { L9SequenceState } from './sequence-state';
import { L9PhaseClass } from './phase-state';
import {
  L9ChangePointTriggerFamily,
} from './l9-change-point-policy';
import {
  L9PostEventAnchorClass,
  L9PostEventLifecycle,
} from './l9-post-event-window-policy';
import {
  L9DecayDominance,
} from './l9-decay-policy';
import {
  L9LeadLagQualityClass,
  L9SemanticLagClass,
} from './l9-lead-lag-policy';
import {
  L9ProductionFamilyId,
  L9SequenceRolloutPhase,
  L9SequenceTemplateId,
  L9TemplateChallengeDomain,
  L9TemplateRegimeRequirement,
  L9TemplateSupportDomain,
} from './sequence-template-policy';

/**
 * §9.6.4.3 — Required lead-lag posture a template expects.
 */
export interface L9TemplateLeadLagRequirement {
  readonly required_quality_ceiling: L9LeadLagQualityClass;
  readonly required_quality_floor: L9LeadLagQualityClass;
  readonly allowed_lag_classes: readonly L9SemanticLagClass[];
  /**
   * §9.6.4.3 — if true, a lag class outside `allowed_lag_classes`
   * forces narrowing rather than blocking. Defaults to false.
   */
  readonly narrow_on_off_window_lag: boolean;
}

/**
 * §9.6.4.3 — Required phase posture.
 */
export interface L9TemplatePhaseRequirement {
  readonly allowed_primary_phases: readonly L9PhaseClass[];
  readonly forbidden_phases: readonly L9PhaseClass[];
  /**
   * §9.5.6.7 — a template may require explicit ambiguity preservation
   * (e.g. EXPANSION vs CROWDING) rather than collapsing to one phase.
   */
  readonly allow_dual_phase: boolean;
}

/**
 * §9.6.4.3 — Required decay posture.
 */
export interface L9TemplateDecayRequirement {
  readonly max_tolerated_dominance: L9DecayDominance;
  /**
   * §9.5.8.2 — a template that is only legal with explicit non-zero
   * decay for its base evidence must say so.
   */
  readonly requires_non_zero_decay_for_early_evidence: boolean;
}

/**
 * §9.6.4.3 — Required post-event posture. Empty `required_anchor_classes`
 * means post-event anchoring is not required for this template.
 */
export interface L9TemplatePostEventRequirement {
  readonly required_anchor_classes: readonly L9PostEventAnchorClass[];
  readonly required_lifecycle: readonly L9PostEventLifecycle[];
  /**
   * §9.5.9.7 — if true, template is *blocked* whenever the
   * post-event window is in `ACTIVE_SHOCK`.
   */
  readonly blocked_while_active_shock: boolean;
}

/**
 * §9.6.4.3 — Contradiction posture: which contradiction families
 * merely narrow the template vs which outright block it.
 */
export interface L9TemplateContradictionRequirement {
  readonly narrowing_families: readonly L9ChangePointTriggerFamily[];
  readonly blocking_families: readonly L9ChangePointTriggerFamily[];
}

/**
 * §9.6.4.3 — Clean-emission requirement predicate input.
 */
export interface L9TemplateCleanEmissionCriteria {
  /** §9.6.4.3 — minimum chain completeness in 0..1. */
  readonly sequence_completeness_minimum: number;
  /** §9.6.2.5 — required additional clean-emission flags. */
  readonly requires_ambiguity_resolved: boolean;
  readonly requires_regime_not_hostile: boolean;
  readonly requires_support_domain_coverage_minimum: number;
}

/**
 * §9.6.4.3 — Full sequence-template definition.
 */
export interface L9SequenceTemplateDefinition {
  readonly template_id: L9SequenceTemplateId;
  readonly production_family: L9ProductionFamilyId;
  readonly primary_sequence_state: L9SequenceState;
  readonly template_version: string;
  readonly description: string;
  readonly applicable_scope_types: readonly L9SequenceScopeType[];
  /** §9.6.4.3 — L7 validation patterns the template consumes. */
  readonly required_validation_patterns: readonly string[];
  /** §9.6.4.3 — L6 feature patterns the template consumes. */
  readonly required_feature_patterns: readonly string[];
  /** §9.6.4.3 — L6 event patterns the template consumes. */
  readonly required_event_patterns: readonly string[];
  /** §9.6.12.2 — regime posture the template consumes. */
  readonly regime_requirement: L9TemplateRegimeRequirement;
  readonly lead_lag_requirement: L9TemplateLeadLagRequirement;
  readonly phase_requirement: L9TemplatePhaseRequirement;
  readonly decay_requirement: L9TemplateDecayRequirement;
  readonly post_event_requirement: L9TemplatePostEventRequirement;
  readonly contradiction_requirement: L9TemplateContradictionRequirement;
  readonly support_domains: readonly L9TemplateSupportDomain[];
  readonly challenge_domains: readonly L9TemplateChallengeDomain[];
  readonly clean_emission: L9TemplateCleanEmissionCriteria;
  readonly rollout_priority: L9SequenceRolloutPhase;
  /**
   * §9.6.14.1 — free-form template-level invariants. Machine-enforced
   * invariants live in `src/l9/invariants/l9_6-invariants.ts`.
   */
  readonly template_invariants: readonly string[];
}

/**
 * §9.6.4.3 — Build a canonical template identifier string
 * `<family>::<template_id>@v<version>`. Used by registries and audit.
 */
export function buildL9SequenceTemplateKey(
  family: L9ProductionFamilyId,
  template_id: L9SequenceTemplateId,
  version: string,
): string {
  return `${family}::${template_id}@v${version}`;
}

/**
 * §9.6.4.3 — Dispatch helper. Determines whether the supplied
 * definition declares all required non-empty surfaces. This is a
 * structural check only — full legality runs through the validator.
 */
export function hasAllRequiredL9TemplateSurfaces(
  def: L9SequenceTemplateDefinition,
): boolean {
  return (
    !!def.template_id &&
    !!def.production_family &&
    !!def.primary_sequence_state &&
    !!def.template_version &&
    def.applicable_scope_types.length > 0 &&
    def.support_domains.length > 0 &&
    def.challenge_domains.length > 0 &&
    !!def.lead_lag_requirement &&
    !!def.phase_requirement &&
    !!def.decay_requirement &&
    !!def.post_event_requirement &&
    !!def.contradiction_requirement &&
    !!def.clean_emission &&
    !!def.rollout_priority
  );
}
