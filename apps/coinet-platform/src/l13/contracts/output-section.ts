/**
 * L13.3 — Output Section Contract
 *
 * §13.3.4 — Output sections are the typed building blocks of every
 * L13 AI explanation output. Each section declares its class,
 * content, evidence/contradiction refs, semantic flags, and
 * readiness so the validators can enforce the section discipline.
 */

/**
 * §13.3.4.1 — Output section classes.
 */
export enum L13OutputSectionClass {
  HEADLINE = 'HEADLINE',
  SUMMARY = 'SUMMARY',
  OBSERVATION = 'OBSERVATION',
  INFERENCE = 'INFERENCE',
  UNCERTAINTY = 'UNCERTAINTY',
  CONTRADICTION = 'CONTRADICTION',
  SCENARIO = 'SCENARIO',
  TRIGGER_INVALIDATION = 'TRIGGER_INVALIDATION',
  SCORE = 'SCORE',
  HYPOTHESIS = 'HYPOTHESIS',
  RESTRICTION = 'RESTRICTION',
  REFUSAL = 'REFUSAL',
}

export const ALL_L13_OUTPUT_SECTION_CLASSES:
  readonly L13OutputSectionClass[] =
  Object.values(L13OutputSectionClass);

/**
 * §13.3.4.2 — Section readiness classes.
 */
export enum L13OutputSectionReadinessClass {
  SECTION_COMPLETE = 'SECTION_COMPLETE',
  SECTION_COMPLETE_WITH_DISCLOSURE = 'SECTION_COMPLETE_WITH_DISCLOSURE',
  SECTION_OPTIONAL_ABSENT = 'SECTION_OPTIONAL_ABSENT',
  SECTION_REQUIRED_MISSING = 'SECTION_REQUIRED_MISSING',
  SECTION_BLOCKED_BY_RESTRICTION = 'SECTION_BLOCKED_BY_RESTRICTION',
  SECTION_ILLEGAL_SEMANTICS = 'SECTION_ILLEGAL_SEMANTICS',
}

export const ALL_L13_OUTPUT_SECTION_READINESS_CLASSES:
  readonly L13OutputSectionReadinessClass[] =
  Object.values(L13OutputSectionReadinessClass);

/**
 * Readiness classes that block the parent output from emitting.
 */
export const L13_BLOCKING_SECTION_READINESS_CLASSES:
  readonly L13OutputSectionReadinessClass[] = [
  L13OutputSectionReadinessClass.SECTION_REQUIRED_MISSING,
  L13OutputSectionReadinessClass.SECTION_ILLEGAL_SEMANTICS,
];

export function isL13BlockingSectionReadiness(
  cls: L13OutputSectionReadinessClass,
): boolean {
  return L13_BLOCKING_SECTION_READINESS_CLASSES.includes(cls);
}

/**
 * §13.3.4 — Section object.
 */
export interface L13OutputSection {
  readonly section_id: string;

  readonly section_class: L13OutputSectionClass;

  readonly title: string;
  readonly content: string;

  readonly claim_refs: readonly string[];

  readonly evidence_refs: readonly string[];
  readonly contradiction_refs: readonly string[];

  readonly required: boolean;
  readonly present: boolean;

  readonly section_readiness: L13OutputSectionReadinessClass;

  readonly may_contain_inference: boolean;
  readonly may_contain_observation: boolean;
  readonly may_contain_uncertainty: boolean;
  readonly may_contain_restriction: boolean;

  readonly forbidden_semantic_hits: readonly string[];

  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}

/**
 * §13.3.5 — Words/phrases that mark a fragment as speculative
 * inference (used by the observation/inference separation
 * validator). Observation sections must NOT contain these.
 */
export const L13_INFERENCE_MARKER_PHRASES: readonly string[] = [
  'suggests',
  'implies',
  'means that',
  'likely',
  'probably',
  'could indicate',
  'tends to',
  'usually',
  'might mean',
  'this points to',
  'this would mean',
  'as a result',
  'consequently',
  'therefore',
];

/**
 * §13.3.5 — Words/phrases that signal a direct factual claim. When
 * present in an INFERENCE section without an explicit hedge or
 * evidence ref, the validator flags
 * `L13O_INFERENCE_PRESENTED_AS_FACT`.
 */
export const L13_OBSERVATION_MARKER_PHRASES: readonly string[] = [
  'currently shows',
  'currently marks',
  'is currently',
  'is the active',
  'is the base case',
  'engine reports',
  'engine surfaces',
  'governed surface shows',
];
