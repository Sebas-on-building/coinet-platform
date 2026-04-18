/**
 * L7.2 — Validation Output Classes and Object Violation Codes
 *
 * §7.2.5.2 — Four first-class output surfaces. These must remain separate
 * objects and can never collapse into a single "does-everything" verdict
 * (§7.2.5.3 output separation law).
 */

/**
 * The four L7.2 first-class validation outputs. Separate from the L7.1
 * output-surface taxonomy (which additionally registers the evidence-read
 * surface) but must remain mission-consistent.
 */
export enum L7ValidationOutputClass {
  VALIDATION_ASSESSMENT = 'VALIDATION_ASSESSMENT',
  CONTRADICTION_BUNDLE = 'CONTRADICTION_BUNDLE',
  CONFIDENCE_ASSESSMENT = 'CONFIDENCE_ASSESSMENT',
  CLAIM_RESTRICTION_PROFILE = 'CLAIM_RESTRICTION_PROFILE',
}

export const ALL_VALIDATION_OUTPUT_CLASSES: readonly L7ValidationOutputClass[] =
  Object.values(L7ValidationOutputClass);

/**
 * §7.2.6.1 — Validation verdict taxonomy. The validation class is the
 * primary categorical outcome of `ValidationAssessment`.
 */
export enum L7ValidationClass {
  CONFIRMED = 'CONFIRMED',
  WEAKLY_CONFIRMED = 'WEAKLY_CONFIRMED',
  CONFLICTING = 'CONFLICTING',
  INSUFFICIENT = 'INSUFFICIENT',
  STALE = 'STALE',
  AMBIGUOUS = 'AMBIGUOUS',
  DEGRADED = 'DEGRADED',
}

export const ALL_VALIDATION_CLASSES: readonly L7ValidationClass[] =
  Object.values(L7ValidationClass);

/**
 * §7.2.6.1 — Validation modifiers. Orthogonal flags that stack on top of
 * the primary validation class.
 */
export enum L7ValidationModifier {
  STALE_SUPPORT_PRESENT = 'STALE_SUPPORT_PRESENT',
  INCOMPLETE_SUPPORT_PRESENT = 'INCOMPLETE_SUPPORT_PRESENT',
  AMBIGUOUS_DIRECTION_PRESENT = 'AMBIGUOUS_DIRECTION_PRESENT',
  DEGRADED_SOURCE_PRESENT = 'DEGRADED_SOURCE_PRESENT',
  UNRESOLVED_CONTRADICTION_PRESENT = 'UNRESOLVED_CONTRADICTION_PRESENT',
  PARTIAL_REGIME_COMPATIBILITY = 'PARTIAL_REGIME_COMPATIBILITY',
}

export const ALL_VALIDATION_MODIFIERS: readonly L7ValidationModifier[] =
  Object.values(L7ValidationModifier);

/**
 * §7.2.8.2 — `L7ObjectViolationCode`. The L7.2 object-model layer has its
 * own violation vocabulary, disjoint from L7.1 boundary violations, so
 * audit records remain unambiguous about which tier rejected an artifact.
 */
export enum L7ObjectViolationCode {
  SUBJECT_UNREGISTERED_CLASS = 'L7O_SUBJECT_UNREGISTERED_CLASS',
  SUBJECT_MISSING_IDENTITY = 'L7O_SUBJECT_MISSING_IDENTITY',
  SUBJECT_MISSING_SCOPE = 'L7O_SUBJECT_MISSING_SCOPE',
  SUBJECT_SCOPE_ILLEGAL_FOR_CLASS = 'L7O_SUBJECT_SCOPE_ILLEGAL_FOR_CLASS',
  SUBJECT_MISSING_TIME_ANCHOR = 'L7O_SUBJECT_MISSING_TIME_ANCHOR',
  SUBJECT_MISSING_SUPPORT = 'L7O_SUBJECT_MISSING_SUPPORT',
  SUBJECT_MISSING_CHALLENGE = 'L7O_SUBJECT_MISSING_CHALLENGE',
  SUBJECT_UNDERDECLARED_HYBRID = 'L7O_SUBJECT_UNDERDECLARED_HYBRID',
  SUBJECT_MISSING_MATERIALITY = 'L7O_SUBJECT_MISSING_MATERIALITY',
  SUBJECT_MISSING_WINDOW = 'L7O_SUBJECT_MISSING_WINDOW',
  SUBJECT_INVALID_WINDOW = 'L7O_SUBJECT_INVALID_WINDOW',
  SUBJECT_MISSING_EVIDENCE_REQUIREMENTS = 'L7O_SUBJECT_MISSING_EVIDENCE_REQUIREMENTS',
  SUBJECT_MISSING_LINEAGE = 'L7O_SUBJECT_MISSING_LINEAGE',
  SUBJECT_MISSING_VERSION = 'L7O_SUBJECT_MISSING_VERSION',
  SUBJECT_REGIME_UNDECLARED = 'L7O_SUBJECT_REGIME_UNDECLARED',
  SUBJECT_FORBIDDEN_SHORTCUT = 'L7O_SUBJECT_FORBIDDEN_SHORTCUT',
  SUBJECT_LOOSE_TEXT_OPINION = 'L7O_SUBJECT_LOOSE_TEXT_OPINION',
  SUBJECT_JUDGMENT_LEAK = 'L7O_SUBJECT_JUDGMENT_LEAK',

  ASSESSMENT_MISSING_IDENTITY = 'L7O_ASSESSMENT_MISSING_IDENTITY',
  ASSESSMENT_MISSING_SUBJECT_LINK = 'L7O_ASSESSMENT_MISSING_SUBJECT_LINK',
  ASSESSMENT_ILLEGAL_CLASS = 'L7O_ASSESSMENT_ILLEGAL_CLASS',
  ASSESSMENT_MISSING_LINEAGE = 'L7O_ASSESSMENT_MISSING_LINEAGE',
  ASSESSMENT_MISSING_REPLAY_HASH = 'L7O_ASSESSMENT_MISSING_REPLAY_HASH',
  ASSESSMENT_CONTRADICTION_MISSING = 'L7O_ASSESSMENT_CONTRADICTION_MISSING',
  ASSESSMENT_FLAG_INCONSISTENCY = 'L7O_ASSESSMENT_FLAG_INCONSISTENCY',

  CONTRADICTION_MISSING_IDENTITY = 'L7O_CONTRADICTION_MISSING_IDENTITY',
  CONTRADICTION_MISSING_RECORDS = 'L7O_CONTRADICTION_MISSING_RECORDS',
  CONTRADICTION_MISSING_FAMILY = 'L7O_CONTRADICTION_MISSING_FAMILY',
  CONTRADICTION_UNTYPED_RECORD = 'L7O_CONTRADICTION_UNTYPED_RECORD',
  CONTRADICTION_MISSING_LINEAGE = 'L7O_CONTRADICTION_MISSING_LINEAGE',

  CONFIDENCE_MISSING_IDENTITY = 'L7O_CONFIDENCE_MISSING_IDENTITY',
  CONFIDENCE_SCORE_OUT_OF_RANGE = 'L7O_CONFIDENCE_SCORE_OUT_OF_RANGE',
  CONFIDENCE_MISSING_FACTORS = 'L7O_CONFIDENCE_MISSING_FACTORS',
  CONFIDENCE_BAND_MISMATCH = 'L7O_CONFIDENCE_BAND_MISMATCH',
  CONFIDENCE_MISSING_LINEAGE = 'L7O_CONFIDENCE_MISSING_LINEAGE',

  RESTRICTION_MISSING_IDENTITY = 'L7O_RESTRICTION_MISSING_IDENTITY',
  RESTRICTION_MISSING_RIGHTS = 'L7O_RESTRICTION_MISSING_RIGHTS',
  RESTRICTION_MISSING_REASONS = 'L7O_RESTRICTION_MISSING_REASONS',
  RESTRICTION_UNAUTHORISED_DOWNSTREAM = 'L7O_RESTRICTION_UNAUTHORISED_DOWNSTREAM',
  RESTRICTION_INCONSISTENT_RIGHT = 'L7O_RESTRICTION_INCONSISTENT_RIGHT',
  RESTRICTION_MISSING_LINEAGE = 'L7O_RESTRICTION_MISSING_LINEAGE',
}

export const ALL_OBJECT_VIOLATION_CODES: readonly L7ObjectViolationCode[] =
  Object.values(L7ObjectViolationCode);

export class L7ObjectError extends Error {
  public readonly code: L7ObjectViolationCode;
  public readonly details: Record<string, unknown>;

  constructor(
    code: L7ObjectViolationCode,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(`[${code}] ${message}`);
    this.name = 'L7ObjectError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Output class required-field catalogue. Consumed by the output registry
 * and by each validator to keep field law single-sourced.
 */
export const REQUIRED_FIELDS_BY_OUTPUT: Readonly<
  Record<L7ValidationOutputClass, readonly string[]>
> = {
  [L7ValidationOutputClass.VALIDATION_ASSESSMENT]: [
    'validation_result_id',
    'validation_subject_id',
    'claim_family',
    'claim_version',
    'scope_type',
    'scope_id',
    'as_of',
    'validation_class',
    'support_strength_score',
    'compute_run_id',
    'replay_hash',
  ],
  [L7ValidationOutputClass.CONTRADICTION_BUNDLE]: [
    'contradiction_bundle_id',
    'validation_subject_id',
    'scope_type',
    'scope_id',
    'as_of',
    'contradiction_records',
    'highest_severity',
    'dominant_contradiction_family',
    'compute_run_id',
    'replay_hash',
  ],
  [L7ValidationOutputClass.CONFIDENCE_ASSESSMENT]: [
    'validation_subject_id',
    'confidence_score',
    'confidence_band',
    'compute_run_id',
    'replay_hash',
  ],
  [L7ValidationOutputClass.CLAIM_RESTRICTION_PROFILE]: [
    'restriction_profile_id',
    'validation_subject_id',
    'downstream_use_rights',
    'restriction_reasons',
    'compute_run_id',
    'replay_hash',
  ],
};
