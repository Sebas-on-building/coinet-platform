/**
 * L10.6 — Hypothesis Template Definition
 *
 * §10.6.3 — Template doctrine. A hypothesis template is a *governed
 * family-bound execution contract* that defines exactly how a
 * HypothesisCandidate is legally generated, what evidence structure
 * the candidate must carry, and what conditions narrow or block its
 * clean emission (§10.6.3.4).
 *
 * §10.6.3.2 / §10.6.3.3 — Every template must declare:
 *   - id, family, version, applicable scopes
 *   - required support domains (non-empty)
 *   - required contradiction domains (non-empty)
 *   - required feature/event/validation patterns from L6/L7
 *   - required regime posture (L8)
 *   - required sequence posture (L9)
 *   - required confirmations (named surfaces)
 *   - invalidation signals (named surfaces + threshold profile)
 *   - blocker law (conditions that force BLOCKED legality)
 *   - restriction defaults (L10.3 restriction posture)
 *   - rollout priority (L10.6.11)
 *   - candidate-generation priority (relative rank within family)
 *   - shared-competition notes (§10.6.3.3)
 *
 * §10.6.3.4 — A template is illegal if it omits any required field,
 * if it does not bind to exactly one family, or if its contradiction
 * domain set is empty (templates must always be narrowable).
 */

import type { L10ScopeType } from './hypothesis-subject-class';
import type {
  L10ConfirmationClass,
  L10ContradictionClass,
  L10EvidencePostureClass,
  L10InvalidationClass,
  L10ShiftConditionClass,
  L10SupportRoleClass,
} from './hypothesis-evidence-semantics-types';
import type {
  L10FamilyRegimeDependency,
  L10FamilyRestrictionPosture,
  L10FamilySequenceDependency,
  L10FamilyValidationDependency,
} from './hypothesis-family-definition';
import type {
  L10HypothesisFamilyId,
  L10HypothesisRolloutPhase,
  L10HypothesisTemplateId,
  L10TemplateContradictionDomain,
  L10TemplateRegimeRequirement,
  L10TemplateSequenceRequirement,
  L10TemplateSupportDomain,
} from './hypothesis-template-policy';

// ──────────────────────────────────────────────────────────────────
// §10.6.3.3 — Required-feature-pattern / event-pattern descriptors
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.3.3 — A feature-pattern reference the template consumes from
 * L6. Stored as a string pattern id so the template module does not
 * have to import L6; validator checks non-emptiness.
 */
export type L10TemplateFeaturePattern = string;

/**
 * §10.6.3.3 — An event-pattern reference the template consumes
 * from L6.
 */
export type L10TemplateEventPattern = string;

// ──────────────────────────────────────────────────────────────────
// §10.6.3.3 — Support requirement
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.3.3 / §10.6.4.3 — Support minimums. Each template declares
 * how strong its primary support must be and how many support domains
 * must be concurrently present.
 */
export interface L10TemplateSupportRequirement {
  /** §10.6.3.3 — support domains the template consumes. */
  readonly required_support_domains:
    readonly L10TemplateSupportDomain[];
  /** §10.6.3.3 — minimum number of concurrently present domains. */
  readonly minimum_domains_present: number;
  /** §10.6.3.3 — support roles that may anchor as primary here. */
  readonly primary_anchor_roles: readonly L10SupportRoleClass[];
  /**
   * §10.6.3.3 — explicit declaration that degraded/stale support is
   * permitted (rare; defaults false). When true, the template accepts
   * `DEGRADED_SUPPORT`/`STALE_SUPPORT` as corroborative but never as
   * primary.
   */
  readonly tolerates_degraded_corroboration: boolean;
}

// ──────────────────────────────────────────────────────────────────
// §10.6.3.3 — Contradiction requirement
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.3.3 / §10.6.4.3 — Contradiction posture: which contradiction
 * domains merely narrow the template vs which outright block it.
 * Blockers feed `L10F_STATE_BLOCKER_CONDITION_PRESENT`.
 */
export interface L10TemplateContradictionRequirement {
  readonly required_contradiction_domains:
    readonly L10TemplateContradictionDomain[];
  readonly narrowing_domains:
    readonly L10TemplateContradictionDomain[];
  readonly blocking_domains:
    readonly L10TemplateContradictionDomain[];
  readonly narrowing_contradiction_classes:
    readonly L10ContradictionClass[];
  readonly blocking_contradiction_classes:
    readonly L10ContradictionClass[];
}

// ──────────────────────────────────────────────────────────────────
// §10.6.3.3 — Confirmation requirement
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.3.3 — One required confirmation slot. The template registry
 * enforces that each slot is declared with:
 *   - a governed confirmation class (§10.5)
 *   - a named reference so missing confirmations are visible by name
 *   - a governed domain the confirmation must cite
 */
export interface L10TemplateConfirmationRequirement {
  readonly confirmation_ref: string;
  readonly confirmation_class: L10ConfirmationClass;
  readonly support_domain: L10TemplateSupportDomain;
  readonly is_upgrade_critical: boolean;
}

// ──────────────────────────────────────────────────────────────────
// §10.6.3.3 — Invalidation requirement
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.3.3 / §10.6.4.3 — Invalidation slot definition. Each template
 * lists its named invalidation signals. `active_collapse_threshold`
 * matches the L10.5 invalidation policy ("when this threshold trips,
 * the candidate collapses").
 */
export interface L10TemplateInvalidationRequirement {
  readonly invalidation_ref: string;
  readonly invalidation_class: L10InvalidationClass;
  readonly contradiction_domain: L10TemplateContradictionDomain;
  readonly active_collapse_threshold: number;
  readonly confidence_cap_on_potential: number;
}

// ──────────────────────────────────────────────────────────────────
// §10.6.3.3 — Regime requirement
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.3.3 — Regime conditioning. A template either ignores regime
 * posture (NONE) or declares explicit classes that support or
 * forbid it. Classes are stored as strings (L8 regime-class ids) to
 * keep L10 decoupled from L8 enums.
 */
export interface L10TemplateRegimePosture {
  readonly requirement: L10TemplateRegimeRequirement;
  readonly required_regime_classes: readonly L10FamilyRegimeDependency[];
  readonly forbidden_regime_classes: readonly L10FamilyRegimeDependency[];
  /** §10.6.3.3 — how hostile regime narrows vs blocks. */
  readonly hostile_regime_narrows: boolean;
  readonly hostile_regime_blocks: boolean;
}

// ──────────────────────────────────────────────────────────────────
// §10.6.3.3 — Sequence requirement
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.3.3 — Sequence conditioning. Sequence states / phases are
 * strings so the template module is layer-agnostic; the validator
 * checks membership in the template's family sequence-dependency set.
 */
export interface L10TemplateSequencePosture {
  readonly requirement: L10TemplateSequenceRequirement;
  readonly required_sequence_classes: readonly L10FamilySequenceDependency[];
  readonly forbidden_sequence_classes: readonly L10FamilySequenceDependency[];
  readonly incompatible_sequence_narrows: boolean;
  readonly incompatible_sequence_blocks: boolean;
}

// ──────────────────────────────────────────────────────────────────
// §10.6.3.3 — Shift-condition requirement
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.3.3 — Required shift-condition posture. Every template
 * must declare at least one shift-condition class so the L10.5 shift
 * semantics cannot be erased at the template tier.
 */
export interface L10TemplateShiftConditionRequirement {
  readonly required_classes: readonly L10ShiftConditionClass[];
  readonly minimum_count: number;
}

// ──────────────────────────────────────────────────────────────────
// §10.6.3.3 — Blocker / clean-emission law
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.3.4 / INV-10.6-D — A template may not emit a clean explanation
 * while its own blocker conditions are present. This predicate set is
 * machine-enforced by the state-legality validator.
 */
export interface L10TemplateBlockerLaw {
  readonly blocker_codes: readonly string[];
  readonly blocked_under_active_invalidation: boolean;
  readonly blocked_under_blocking_contradiction: boolean;
  readonly blocked_under_missing_upgrade_critical_confirmation: boolean;
  readonly blocked_under_hostile_regime_if_required: boolean;
}

/**
 * §10.6.3.3 — Clean-emission criteria. Distinct from L10.3 output
 * readiness: this is the *template-tier* precondition, consumed by
 * the family-runtime before L10.3 output validation even runs.
 */
export interface L10TemplateCleanEmissionCriteria {
  readonly minimum_primary_support_strength: number;
  readonly minimum_confirmation_coverage: number;
  readonly minimum_candidate_stability_score: number;
  readonly evidence_posture_ceiling: L10EvidencePostureClass;
  readonly requires_competition_live: boolean;
}

// ──────────────────────────────────────────────────────────────────
// §10.6.3.3 — Restriction defaults
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.3.3 — Restriction defaults. Templates declare restrictions
 * derived from the family plus any template-specific restrictions
 * (e.g. post-unlock redistribution requires POST_EVENT_ANCHORED).
 */
export interface L10TemplateRestrictionDefaults {
  readonly family_default: L10FamilyRestrictionPosture;
  readonly template_overrides: readonly L10FamilyRestrictionPosture[];
}

// ──────────────────────────────────────────────────────────────────
// §10.6.3.3 — Full template definition
// ──────────────────────────────────────────────────────────────────

export interface L10HypothesisTemplateDefinition {
  readonly template_id: L10HypothesisTemplateId;
  readonly hypothesis_family: L10HypothesisFamilyId;
  readonly hypothesis_name: string;
  readonly template_version: string;
  readonly description: string;
  readonly applicable_scope_types: readonly L10ScopeType[];

  // Pattern consumption
  readonly required_feature_patterns:
    readonly L10TemplateFeaturePattern[];
  readonly required_event_patterns:
    readonly L10TemplateEventPattern[];
  readonly required_validation_patterns:
    readonly L10FamilyValidationDependency[];

  // Evidence-semantics posture
  readonly support_requirement: L10TemplateSupportRequirement;
  readonly contradiction_requirement:
    L10TemplateContradictionRequirement;
  readonly required_confirmations:
    readonly L10TemplateConfirmationRequirement[];
  readonly invalidation_signals:
    readonly L10TemplateInvalidationRequirement[];
  readonly shift_condition_requirement:
    L10TemplateShiftConditionRequirement;

  // Layer dependencies
  readonly regime_posture: L10TemplateRegimePosture;
  readonly sequence_posture: L10TemplateSequencePosture;

  // Legality / emission
  readonly blocker_law: L10TemplateBlockerLaw;
  readonly clean_emission: L10TemplateCleanEmissionCriteria;

  // Restrictions + rollout
  readonly restriction_defaults: L10TemplateRestrictionDefaults;
  readonly rollout_priority: L10HypothesisRolloutPhase;
  readonly candidate_generation_priority: number;
  readonly spread_sensitivity_default: number;

  // Notes for shared-competition context (§10.6.3.3)
  readonly shared_competition_notes: readonly string[];
  readonly template_invariants: readonly string[];
}

/**
 * §10.6.3.3 — Build a canonical template key for registries and audit.
 * `<family>::<template_id>@v<version>`.
 */
export function buildL10TemplateKey(
  family: L10HypothesisFamilyId,
  template_id: L10HypothesisTemplateId,
  version: string,
): string {
  return `${family}::${template_id}@v${version}`;
}

/**
 * §10.6.3.3 — Structural completeness. Full legality runs through
 * `hypothesis-template-definition.validator`.
 */
export function hasAllRequiredL10TemplateSurfaces(
  def: L10HypothesisTemplateDefinition,
): boolean {
  return (
    !!def.template_id &&
    !!def.hypothesis_family &&
    !!def.hypothesis_name &&
    !!def.template_version &&
    def.applicable_scope_types.length > 0 &&
    def.required_validation_patterns.length > 0 &&
    def.support_requirement.required_support_domains.length > 0 &&
    def.contradiction_requirement.required_contradiction_domains.length > 0 &&
    def.required_confirmations.length > 0 &&
    def.invalidation_signals.length > 0 &&
    def.shift_condition_requirement.required_classes.length > 0 &&
    !!def.regime_posture &&
    !!def.sequence_posture &&
    !!def.blocker_law &&
    !!def.clean_emission &&
    !!def.restriction_defaults &&
    !!def.rollout_priority &&
    def.candidate_generation_priority >= 0
  );
}
