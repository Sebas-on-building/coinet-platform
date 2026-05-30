/**
 * L13.5 — Uncertainty Disclosure Profile Contract
 *
 * §13.5.4 / §13.5.6 / §13.5.7 — Defines the extended uncertainty
 * source taxonomy used by the expression-governance layer, the
 * disclosure readiness classes, the confidence-ceiling reason
 * codes, and the top-level disclosure profile bound to every
 * Layer 13 output.
 *
 * Relationship to L13.2:
 * - L13.2 owns `L13UncertaintySource` (the input-package view).
 * - L13.5 owns `L13ExpressionUncertaintySource`, a strict
 *   *superset* refined for the expression layer: it splits
 *   `L11_MISSING_DATA` into `L11_MISSING_VISIBILITY`, adds
 *   `L10_MISSING_CONFIRMATIONS`, `L10_ACTIVE_INVALIDATION_RISK`,
 *   `L11_SCORE_RESTRICTION`, `L12_PATH_CONFIDENCE_CAP`,
 *   `L13_GROUNDED_CLAIM_NARROWED`, `L13_GROUNDED_CLAIM_UNCERTAIN_ONLY`,
 *   and `LOW_SIGNAL_CONFIDENCE`.
 * - The expression-uncertainty engine maps from
 *   `L13UncertaintySource` (frozen at L13.2) to one or more
 *   `L13ExpressionUncertaintySource` entries.
 */

import type { L13ExplanationConfidenceBand } from './confidence-breakdown';
import type { L13PhraseStrengthClass } from './phrase-strength';
import type { L13RequiredDisclosurePhraseCode } from './required-disclosure-phrase';
import type { L13ForbiddenCertaintyPhraseCode } from './forbidden-certainty-phrase';

/**
 * §13.5.4 — Extended uncertainty source taxonomy. Closed set.
 */
export enum L13ExpressionUncertaintySource {
  LOW_SIGNAL_CONFIDENCE = 'LOW_SIGNAL_CONFIDENCE',
  L7_CONTRADICTION = 'L7_CONTRADICTION',
  L8_TRANSITION_RISK = 'L8_TRANSITION_RISK',
  L9_SEQUENCE_AMBIGUITY = 'L9_SEQUENCE_AMBIGUITY',
  L9_SEQUENCE_DECAY = 'L9_SEQUENCE_DECAY',
  L10_NARROW_HYPOTHESIS_SPREAD = 'L10_NARROW_HYPOTHESIS_SPREAD',
  L10_MISSING_CONFIRMATIONS = 'L10_MISSING_CONFIRMATIONS',
  L10_ACTIVE_INVALIDATION_RISK = 'L10_ACTIVE_INVALIDATION_RISK',
  L11_MISSING_VISIBILITY = 'L11_MISSING_VISIBILITY',
  L11_DRIFT = 'L11_DRIFT',
  L11_SCORE_RESTRICTION = 'L11_SCORE_RESTRICTION',
  L12_NARROW_SCENARIO_SPREAD = 'L12_NARROW_SCENARIO_SPREAD',
  L12_ACTIVE_INVALIDATION = 'L12_ACTIVE_INVALIDATION',
  L12_UNRESOLVED_TRIGGER = 'L12_UNRESOLVED_TRIGGER',
  L12_PATH_CONFIDENCE_CAP = 'L12_PATH_CONFIDENCE_CAP',
  L13_GROUNDED_CLAIM_NARROWED = 'L13_GROUNDED_CLAIM_NARROWED',
  L13_GROUNDED_CLAIM_UNCERTAIN_ONLY = 'L13_GROUNDED_CLAIM_UNCERTAIN_ONLY',
}

export const ALL_L13_EXPRESSION_UNCERTAINTY_SOURCES:
  readonly L13ExpressionUncertaintySource[] =
  Object.values(L13ExpressionUncertaintySource);

/**
 * §13.5.15 — Confidence-ceiling reason codes. Each entry on the
 * uncertainty-disclosure profile carries the reason the ceiling
 * was set, so the audit log can replay the derivation.
 */
export enum L13ConfidenceCeilingReasonCode {
  BLOCKED_BY_RESTRICTION = 'BLOCKED_BY_RESTRICTION',
  BLOCKED_BY_CONTRADICTED_EMITTED_CLAIM = 'BLOCKED_BY_CONTRADICTED_EMITTED_CLAIM',
  LOWERED_BY_ACTIVE_INVALIDATION = 'LOWERED_BY_ACTIVE_INVALIDATION',
  LOWERED_BY_UNRESOLVED_TRIGGER = 'LOWERED_BY_UNRESOLVED_TRIGGER',
  LOWERED_BY_BOTH_INVALIDATION_AND_TRIGGER = 'LOWERED_BY_BOTH_INVALIDATION_AND_TRIGGER',
  LOWERED_BY_NARROW_SCENARIO_SPREAD = 'LOWERED_BY_NARROW_SCENARIO_SPREAD',
  LOWERED_BY_NARROW_HYPOTHESIS_SPREAD = 'LOWERED_BY_NARROW_HYPOTHESIS_SPREAD',
  LOWERED_BY_MISSING_VISIBILITY = 'LOWERED_BY_MISSING_VISIBILITY',
  LOWERED_BY_DRIFT = 'LOWERED_BY_DRIFT',
  LOWERED_BY_MISSING_VISIBILITY_AND_DRIFT = 'LOWERED_BY_MISSING_VISIBILITY_AND_DRIFT',
  LOWERED_BY_CONTRADICTION = 'LOWERED_BY_CONTRADICTION',
  LOWERED_BY_TRANSITION_RISK = 'LOWERED_BY_TRANSITION_RISK',
  LOWERED_BY_SEQUENCE_AMBIGUITY = 'LOWERED_BY_SEQUENCE_AMBIGUITY',
  LOWERED_BY_CLAIM_LEVEL_NARROWING = 'LOWERED_BY_CLAIM_LEVEL_NARROWING',
  LOWERED_BY_LOW_SIGNAL_CONFIDENCE = 'LOWERED_BY_LOW_SIGNAL_CONFIDENCE',
  CEILING_INHERITED_UNCHANGED = 'CEILING_INHERITED_UNCHANGED',
}

export const ALL_L13_CONFIDENCE_CEILING_REASON_CODES:
  readonly L13ConfidenceCeilingReasonCode[] =
  Object.values(L13ConfidenceCeilingReasonCode);

/**
 * §13.5.7 — Disclosure readiness class.
 */
export enum L13DisclosureReadinessClass {
  DISCLOSURE_CLEAN = 'DISCLOSURE_CLEAN',
  DISCLOSURE_REQUIRED_PRESENT = 'DISCLOSURE_REQUIRED_PRESENT',
  DISCLOSURE_REQUIRED_MISSING = 'DISCLOSURE_REQUIRED_MISSING',
  DISCLOSURE_TOO_WEAK = 'DISCLOSURE_TOO_WEAK',
  DISCLOSURE_CONTRADICTORY = 'DISCLOSURE_CONTRADICTORY',
  DISCLOSURE_BLOCKED = 'DISCLOSURE_BLOCKED',
}

export const ALL_L13_DISCLOSURE_READINESS_CLASSES:
  readonly L13DisclosureReadinessClass[] =
  Object.values(L13DisclosureReadinessClass);

/**
 * Readiness classes that signal disclosure failure — the
 * expression-governance envelope must mark `rewrite_required` or
 * `block_required` when any of these are present.
 */
export const L13_DISCLOSURE_READINESS_FAILURE_CLASSES:
  readonly L13DisclosureReadinessClass[] = [
  L13DisclosureReadinessClass.DISCLOSURE_REQUIRED_MISSING,
  L13DisclosureReadinessClass.DISCLOSURE_TOO_WEAK,
  L13DisclosureReadinessClass.DISCLOSURE_CONTRADICTORY,
  L13DisclosureReadinessClass.DISCLOSURE_BLOCKED,
];

export function isL13DisclosureReadinessFailure(
  cls: L13DisclosureReadinessClass,
): boolean {
  return L13_DISCLOSURE_READINESS_FAILURE_CLASSES.includes(cls);
}

/**
 * §13.5.6 — Uncertainty Disclosure Profile.
 *
 * Bound onto every Layer 13 output. The expression-governance
 * envelope at §13.5.20 references this profile.
 */
export interface L13UncertaintyDisclosureProfile {
  readonly uncertainty_profile_id: string;

  readonly output_id: string;
  readonly input_package_id: string;
  readonly grounded_output_ref: string;

  readonly uncertainty_sources:
    readonly L13ExpressionUncertaintySource[];

  readonly confidence_ceiling: L13ExplanationConfidenceBand;
  readonly confidence_ceiling_reason_codes:
    readonly L13ConfidenceCeilingReasonCode[];

  readonly required_disclosure_phrases:
    readonly L13RequiredDisclosurePhraseCode[];
  readonly forbidden_certainty_phrases:
    readonly L13ForbiddenCertaintyPhraseCode[];

  readonly required_phrase_strength_class: L13PhraseStrengthClass;
  readonly forbidden_phrase_strength_classes:
    readonly L13PhraseStrengthClass[];

  readonly must_mention_contradiction: boolean;
  readonly must_mention_missing_data: boolean;
  readonly must_mention_drift: boolean;
  readonly must_mention_invalidation: boolean;
  readonly must_mention_unresolved_trigger: boolean;
  readonly must_mention_narrow_scenario_spread: boolean;
  readonly must_mention_narrow_hypothesis_spread: boolean;
  readonly must_mention_transition_risk: boolean;
  readonly must_mention_sequence_ambiguity: boolean;

  readonly required_section_refs: readonly string[];
  readonly required_claim_refs: readonly string[];

  readonly disclosure_readiness: L13DisclosureReadinessClass;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
