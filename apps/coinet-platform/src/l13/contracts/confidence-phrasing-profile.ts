/**
 * L13.5 — Confidence Phrasing Profile Contract
 *
 * §13.5.12 — Tracks every emitted segment's phrase-strength class,
 * the strongest phrase used, the inherited ceiling, and the
 * detected outrun reasons. The phrasing engine populates this for
 * each Layer 13 output; the validator enforces ceiling discipline
 * and the absolute/contextual forbidden phrase rules.
 */

import type { L13ExplanationConfidenceBand } from './confidence-breakdown';
import type { L13PhraseStrengthClass } from './phrase-strength';
import type { L13ForbiddenCertaintyPhraseCode } from './forbidden-certainty-phrase';

/**
 * §13.5.12 — Confidence outrun reason codes.
 */
export enum L13ConfidenceOutrunReasonCode {
  VERY_HIGH_LANGUAGE_UNDER_MEDIUM_CEILING = 'VERY_HIGH_LANGUAGE_UNDER_MEDIUM_CEILING',
  ASSERTIVE_LANGUAGE_UNDER_ACTIVE_INVALIDATION = 'ASSERTIVE_LANGUAGE_UNDER_ACTIVE_INVALIDATION',
  CLEAN_LANGUAGE_UNDER_UNRESOLVED_TRIGGER = 'CLEAN_LANGUAGE_UNDER_UNRESOLVED_TRIGGER',
  STRONG_CERTAINTY_UNDER_NARROW_SPREAD = 'STRONG_CERTAINTY_UNDER_NARROW_SPREAD',
  LOW_CONFIDENCE_DISCLOSURE_MISSING = 'LOW_CONFIDENCE_DISCLOSURE_MISSING',
  RESTRICTION_PROHIBITS_DIRECTIONAL_CERTAINTY = 'RESTRICTION_PROHIBITS_DIRECTIONAL_CERTAINTY',
  ABSOLUTE_FORBIDDEN_PHRASE_PRESENT = 'ABSOLUTE_FORBIDDEN_PHRASE_PRESENT',
  CONTEXTUALLY_FORBIDDEN_PHRASE_UNDER_NARROWED_CEILING = 'CONTEXTUALLY_FORBIDDEN_PHRASE_UNDER_NARROWED_CEILING',
  PHRASE_EXCEEDS_RESTRICTION_POSTURE = 'PHRASE_EXCEEDS_RESTRICTION_POSTURE',
  SCENARIO_AS_CERTAINTY = 'SCENARIO_AS_CERTAINTY',
  CONFIDENCE_AS_PROBABILITY = 'CONFIDENCE_AS_PROBABILITY',
}

export const ALL_L13_CONFIDENCE_OUTRUN_REASON_CODES:
  readonly L13ConfidenceOutrunReasonCode[] =
  Object.values(L13ConfidenceOutrunReasonCode);

/**
 * §13.5.12 — Per-section phrase strength classification.
 */
export interface L13SectionPhraseStrength {
  readonly section_ref: string;
  readonly strongest_class: L13PhraseStrengthClass;
  readonly matched_anchor_phrases: readonly string[];
}

/**
 * §13.5.12 — Confidence Phrasing Profile.
 */
export interface L13ConfidencePhrasingProfile {
  readonly phrasing_profile_id: string;

  readonly output_id: string;

  readonly confidence_ceiling: L13ExplanationConfidenceBand;

  readonly section_phrase_strengths:
    readonly L13SectionPhraseStrength[];

  readonly strongest_phrase_class_used: L13PhraseStrengthClass;
  readonly strongest_phrase_section_ref?: string;

  readonly allowed_phrase_strength_classes:
    readonly L13PhraseStrengthClass[];
  readonly forbidden_phrase_strength_classes:
    readonly L13PhraseStrengthClass[];

  readonly absolute_forbidden_phrases_detected:
    readonly L13ForbiddenCertaintyPhraseCode[];
  readonly contextually_forbidden_phrases_detected:
    readonly L13ForbiddenCertaintyPhraseCode[];

  readonly required_confidence_disclosure: boolean;
  readonly confidence_disclosure_present: boolean;

  readonly confidence_outrun_detected: boolean;
  readonly confidence_outrun_reason_codes:
    readonly L13ConfidenceOutrunReasonCode[];

  readonly output_must_be_rewritten: boolean;
  readonly output_must_be_blocked: boolean;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
