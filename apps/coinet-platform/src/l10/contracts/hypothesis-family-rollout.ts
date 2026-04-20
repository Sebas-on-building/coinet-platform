/**
 * L10.6 — Hypothesis Family Rollout Entry
 *
 * §10.6.11 — Rollout doctrine. A family may not become production-
 * enabled unless the gating law (§10.6.11.4) is satisfied:
 *   - legal templates exist
 *   - template completeness passes
 *   - required support / contradiction / confirmation / invalidation
 *     structure exists on every owned template
 *   - regime + sequence dependencies are declared
 *   - restriction defaults are declared
 *   - certification for the family passes
 *   - no illegal family overlap or drift remains
 *
 * This module freezes the *contract shape* of a rollout entry. The
 * rollout registry (`src/l10/registry/hypothesis-rollout.registry.ts`)
 * enforces uniqueness and ordering (§10.6.11.2 / INV-10.6-F).
 */

import type {
  L10HypothesisFamilyId,
  L10HypothesisRolloutPhase,
} from './hypothesis-template-policy';

/**
 * §10.6.11.4 — Gate flags that must all be `true` before a family may
 * transition into `ENABLED`. The rollout validator emits specific
 * violation codes for each unsatisfied flag.
 */
export interface L10RolloutGateFlags {
  /** §10.6.11.4 — family definition itself is valid. */
  readonly family_definition_valid: boolean;
  /** §10.6.11.4 — every owned template passes its definition validator. */
  readonly all_templates_valid: boolean;
  /** §10.6.11.4 — family has ≥1 owned template. */
  readonly has_owned_templates: boolean;
  /** §10.6.11.4 — required support / contradiction coverage present. */
  readonly support_contradiction_coverage_complete: boolean;
  /** §10.6.11.4 — required confirmations + invalidations declared. */
  readonly confirmation_invalidation_complete: boolean;
  /** §10.6.11.4 — regime + sequence dependencies declared. */
  readonly regime_sequence_dependencies_complete: boolean;
  /** §10.6.11.4 — restriction defaults declared. */
  readonly restriction_defaults_complete: boolean;
  /** §10.6.11.4 — no illegal overlap / family-template drift. */
  readonly no_family_template_drift: boolean;
  /** §10.6.11.4 — the family's certification test pass recorded. */
  readonly certification_green: boolean;
}

/**
 * §10.6.11 — Lifecycle stage a family may be in.
 *
 *   DRAFT      — family is registered but not yet gated for rollout.
 *   GATED      — family has submitted for rollout but gates not green.
 *   ENABLED    — family is production-enabled.
 *   DEPRECATED — family was enabled but is now retired.
 */
export enum L10RolloutLifecycleStage {
  DRAFT = 'DRAFT',
  GATED = 'GATED',
  ENABLED = 'ENABLED',
  DEPRECATED = 'DEPRECATED',
}

export const ALL_L10_ROLLOUT_LIFECYCLE_STAGES:
  readonly L10RolloutLifecycleStage[] =
    Object.values(L10RolloutLifecycleStage);

/**
 * §10.6.11 — Full rollout entry for one family.
 */
export interface L10HypothesisFamilyRolloutEntry {
  readonly family_id: L10HypothesisFamilyId;
  readonly rollout_phase: L10HypothesisRolloutPhase;
  readonly lifecycle_stage: L10RolloutLifecycleStage;
  readonly rollout_version: string;
  readonly gate_flags: L10RolloutGateFlags;
  /**
   * §10.6.11.4 — families that must already be ENABLED before this
   * entry may transition to ENABLED. Canonical predecessor mapping
   * lives in `hypothesis-template-policy.ts`; this list may duplicate
   * or extend that mapping per rollout policy.
   */
  readonly required_predecessors: readonly L10HypothesisFamilyId[];
  /** §10.6.11.4 — free-form rollout notes for audit. */
  readonly rollout_notes: readonly string[];
}

/**
 * §10.6.11.4 — All gates must be true for a rollout entry to be
 * considered ready to flip into `ENABLED`.
 */
export function rolloutGatesReady(flags: L10RolloutGateFlags): boolean {
  return (
    flags.family_definition_valid &&
    flags.all_templates_valid &&
    flags.has_owned_templates &&
    flags.support_contradiction_coverage_complete &&
    flags.confirmation_invalidation_complete &&
    flags.regime_sequence_dependencies_complete &&
    flags.restriction_defaults_complete &&
    flags.no_family_template_drift &&
    flags.certification_green
  );
}

/**
 * §10.6.11 — A rollout entry is structurally complete if it declares
 * the family, phase, lifecycle, version, and gate flags. Semantic
 * validation (predecessor ordering, etc.) runs through the rollout
 * validator.
 */
export function hasAllRequiredL10RolloutSurfaces(
  entry: L10HypothesisFamilyRolloutEntry,
): boolean {
  return (
    !!entry.family_id &&
    !!entry.rollout_phase &&
    !!entry.lifecycle_stage &&
    !!entry.rollout_version &&
    !!entry.gate_flags
  );
}
