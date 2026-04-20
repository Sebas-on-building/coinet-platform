/**
 * L10.6 — Hypothesis Family Definition
 *
 * §10.6.2.3 / §10.6.3 — First production hypothesis-family definition
 * contract.
 *
 * This is *not* the L10.2 `L10HypothesisFamilyDescriptor`, which froze
 * the candidate-archetype taxonomy (`L10HypothesisFamilyClass`). An
 * `L10HypothesisFamilyDefinition` expresses the launch-tier production
 * doctrine for an explanatory-competition family:
 *
 *   - which L10.6 `L10HypothesisFamilyId` it instantiates
 *   - which L10.2 candidate archetypes belong to it (mapping)
 *   - which scope types it legally operates at
 *   - which support / contradiction domains it owns
 *   - which L8 regime posture it requires
 *   - which L9 sequence posture it requires
 *   - which templates it owns
 *   - which restriction posture it defaults to
 *   - which rollout phase it belongs to
 *
 * §10.6.3.5 — A family may only own templates whose semantics match
 * that family's explanatory purpose. Family/template drift is rejected
 * by the registry (§10.6.12.4) and by the family-definition validator.
 */

import type { L10ScopeType } from './hypothesis-subject-class';
import { L10HypothesisFamilyClass } from './hypothesis-subject-class';
import type {
  L10HypothesisFamilyId,
  L10HypothesisRolloutPhase,
  L10HypothesisTemplateId,
  L10TemplateContradictionDomain,
  L10TemplateRegimeRequirement,
  L10TemplateSequenceRequirement,
  L10TemplateSupportDomain,
} from './hypothesis-template-policy';

/**
 * §10.6.2.3 — Restriction posture a family declares by default. This
 * is the L10.6 projection of the L10.3 restriction contract; the
 * explicit projection prevents Layer 10 emitting "clean" hypothesis
 * output when a family inherently requires restrictions.
 *
 *   EXPLANATORY_ONLY          — family never emits recommendations;
 *                               output is purely explanatory.
 *   COMPETITION_MUST_BE_LIVE  — clean emission requires that the
 *                               competition is still live (no single
 *                               candidate has closed out).
 *   NARROWED_DEFAULT          — family's default posture is NARROWED;
 *                               clean emission is the exception, not
 *                               the rule (manipulation/distribution).
 *   POST_EVENT_ANCHORED       — family may only emit while its
 *                               post-event anchor is live (unlock/
 *                               treasury-led flows).
 *   RELATIONAL_ANCHORED       — family may only emit while relational
 *                               evidence (L4 relations, L8 ecosystem)
 *                               remains cited (ecosystem / spillover).
 */
export type L10FamilyRestrictionPosture =
  | 'EXPLANATORY_ONLY'
  | 'COMPETITION_MUST_BE_LIVE'
  | 'NARROWED_DEFAULT'
  | 'POST_EVENT_ANCHORED'
  | 'RELATIONAL_ANCHORED';

/**
 * §10.6.2.3 — A single L7 dependency reference. Kept as a string
 * pattern so the family definition does not have to import L7 tables;
 * the family-definition validator checks that the pattern is non-empty
 * and syntactically valid.
 */
export type L10FamilyValidationDependency = string;

/**
 * §10.6.2.3 — A single L8 regime-class reference. Stored as a string
 * to keep the family definition layer-agnostic; the validator checks
 * that the string matches a known L8 regime class identifier.
 */
export type L10FamilyRegimeDependency = string;

/**
 * §10.6.2.3 — A single L9 sequence-state / phase reference.
 */
export type L10FamilySequenceDependency = string;

/**
 * §10.6.3 — Full production hypothesis-family definition.
 */
export interface L10HypothesisFamilyDefinition {
  /** §10.6.2.3 — production family id. */
  readonly family_id: L10HypothesisFamilyId;
  readonly family_version: string;
  readonly description: string;
  /**
   * §10.6.3.4 — L10.2 candidate archetypes (taxonomy-level families)
   * legally owned by this production family. Empty means "none of the
   * frozen L10.2 archetypes participate" — still legal (spillover,
   * ecosystem) because L10.2 froze only eight archetypes.
   */
  readonly owned_candidate_archetypes:
    readonly L10HypothesisFamilyClass[];
  /** §10.6.2.3 — scope types the family legally operates at. */
  readonly legal_scope_types: readonly L10ScopeType[];
  /** §10.6.2.3 — support domains this family exposes to its templates. */
  readonly legal_support_domains: readonly L10TemplateSupportDomain[];
  /**
   * §10.6.2.3 — contradiction domains this family exposes. Every
   * template bound to this family must pick contradiction domains
   * only from this set (registry enforces `TEMPLATE_CONTRADICTION_
   * DOMAIN_NOT_IN_FAMILY`).
   */
  readonly legal_contradiction_domains:
    readonly L10TemplateContradictionDomain[];
  /** §10.6.2.3 — L7 validation pattern ids the family can consume. */
  readonly legal_validation_dependencies:
    readonly L10FamilyValidationDependency[];
  /** §10.6.2.3 — L8 regime-class references legal for this family. */
  readonly legal_regime_dependencies:
    readonly L10FamilyRegimeDependency[];
  /** §10.6.2.3 — L9 sequence-state / phase references legal here. */
  readonly legal_sequence_dependencies:
    readonly L10FamilySequenceDependency[];
  /** §10.6.2.3 — templates that belong to the family. */
  readonly legal_templates: readonly L10HypothesisTemplateId[];
  /** §10.6.2.3 — family-level regime requirement tier. */
  readonly regime_requirement: L10TemplateRegimeRequirement;
  /** §10.6.2.3 — family-level sequence requirement tier. */
  readonly sequence_requirement: L10TemplateSequenceRequirement;
  /** §10.6.2.3 — default restriction posture for templates in this family. */
  readonly default_restriction_posture: L10FamilyRestrictionPosture;
  /** §10.6.2.3 / §10.6.11.1 — canonical rollout phase. */
  readonly rollout_phase: L10HypothesisRolloutPhase;
  /**
   * §10.6.2.4 — other production families this family may coexist
   * with as simultaneous explanation candidates. Coexistence is
   * explicit; coexistence never implies semantic sameness (§10.6.2.4).
   */
  readonly coexists_with: readonly L10HypothesisFamilyId[];
  /**
   * §10.6.2.4 — families that are semantically *incompatible* as
   * co-primary candidates (e.g. genuine accumulation vs manipulation).
   * These may still appear as competition alternatives, but not in
   * the same coexistence set.
   */
  readonly incompatible_with: readonly L10HypothesisFamilyId[];
  /**
   * §10.6.1.3 — free-form family-level invariant notes. Machine-
   * enforced invariants live in `l10_6-invariants.ts`.
   */
  readonly family_invariants: readonly string[];
}

/**
 * §10.6.2.3 — Structural completeness check (no semantic validation).
 */
export function hasAllRequiredL10FamilySurfaces(
  def: L10HypothesisFamilyDefinition,
): boolean {
  return (
    !!def.family_id &&
    !!def.family_version &&
    !!def.description &&
    def.legal_scope_types.length > 0 &&
    def.legal_support_domains.length > 0 &&
    def.legal_contradiction_domains.length > 0 &&
    def.legal_templates.length > 0 &&
    !!def.regime_requirement &&
    !!def.sequence_requirement &&
    !!def.default_restriction_posture &&
    !!def.rollout_phase
  );
}

/**
 * §10.6.3.4 — Canonical family key used by audit and registries.
 * `<family_id>@v<family_version>`.
 */
export function buildL10FamilyKey(
  family_id: L10HypothesisFamilyId,
  version: string,
): string {
  return `${family_id}@v${version}`;
}
