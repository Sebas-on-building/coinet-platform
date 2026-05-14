/**
 * L13.4 — Citation Pack Contract
 *
 * §13.4.7 / §13.4.13 — Every emitted claim must trace back to
 * governed refs from the input package. The citation pack groups
 * those refs by source layer (validation, regime, sequence,
 * hypothesis, score, scenario, contradiction) and computes a
 * completeness class.
 */

/**
 * §13.4.7.3 — Citation completeness classes.
 */
export enum L13CitationCompletenessClass {
  COMPLETE_CITATION_PACK = 'COMPLETE_CITATION_PACK',
  COMPLETE_WITH_DISCLOSURE = 'COMPLETE_WITH_DISCLOSURE',
  PARTIAL_CITATION_PACK = 'PARTIAL_CITATION_PACK',
  BLOCKED_MISSING_CRITICAL_CITATION = 'BLOCKED_MISSING_CRITICAL_CITATION',
  BLOCKED_UNGOVERNED_CITATION = 'BLOCKED_UNGOVERNED_CITATION',
}

export const ALL_L13_CITATION_COMPLETENESS_CLASSES:
  readonly L13CitationCompletenessClass[] =
  Object.values(L13CitationCompletenessClass);

/**
 * Completeness classes that block emission.
 */
export const L13_BLOCKED_CITATION_COMPLETENESS_CLASSES:
  readonly L13CitationCompletenessClass[] = [
  L13CitationCompletenessClass.BLOCKED_MISSING_CRITICAL_CITATION,
  L13CitationCompletenessClass.BLOCKED_UNGOVERNED_CITATION,
];

export function isL13BlockedCitationCompleteness(
  cls: L13CitationCompletenessClass,
): boolean {
  return L13_BLOCKED_CITATION_COMPLETENESS_CLASSES.includes(cls);
}

/**
 * Reason codes attached to a citation pack when it cannot reach the
 * COMPLETE_CITATION_PACK class.
 */
export enum L13MissingCitationReasonCode {
  MISSING_SCENARIO_REF = 'MISSING_SCENARIO_REF',
  MISSING_SCORE_REF = 'MISSING_SCORE_REF',
  MISSING_HYPOTHESIS_REF = 'MISSING_HYPOTHESIS_REF',
  MISSING_REGIME_REF = 'MISSING_REGIME_REF',
  MISSING_SEQUENCE_REF = 'MISSING_SEQUENCE_REF',
  MISSING_CONTRADICTION_REF = 'MISSING_CONTRADICTION_REF',
  MISSING_VALIDATION_REF = 'MISSING_VALIDATION_REF',
  MISSING_EVIDENCE_REF = 'MISSING_EVIDENCE_REF',
  UNGOVERNED_REF = 'UNGOVERNED_REF',
  CLAIM_HAS_NO_CITATION = 'CLAIM_HAS_NO_CITATION',
}

/**
 * §13.4.7.2 — Citation pack.
 */
export interface L13CitationPack {
  readonly citation_pack_id: string;

  readonly output_id: string;
  readonly input_package_id: string;

  readonly claim_refs: readonly string[];

  readonly evidence_refs: readonly string[];
  readonly contradiction_refs: readonly string[];
  readonly scenario_refs: readonly string[];
  readonly score_refs: readonly string[];
  readonly hypothesis_refs: readonly string[];
  readonly regime_refs: readonly string[];
  readonly sequence_refs: readonly string[];
  readonly validation_refs: readonly string[];

  readonly citation_completeness_class: L13CitationCompletenessClass;

  readonly missing_citation_reason_codes:
    readonly L13MissingCitationReasonCode[];

  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
