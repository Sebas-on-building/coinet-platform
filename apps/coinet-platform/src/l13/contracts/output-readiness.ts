/**
 * L13.3 — Output Readiness Contracts
 *
 * §13.3.10 / §13.3.11 — Output readiness classes and the readiness
 * assessment object that determines whether an AI output may emit to
 * the user.
 */

export enum L13OutputReadinessClass {
  CLEAN_GROUNDED_OUTPUT = 'CLEAN_GROUNDED_OUTPUT',
  GROUNDED_WITH_DISCLOSURE = 'GROUNDED_WITH_DISCLOSURE',
  NARROWED_BY_UNCERTAINTY = 'NARROWED_BY_UNCERTAINTY',
  NARROWED_BY_RESTRICTION = 'NARROWED_BY_RESTRICTION',
  PARTIAL_ANSWER = 'PARTIAL_ANSWER',
  REFUSAL_REQUIRED = 'REFUSAL_REQUIRED',
  BLOCKED_UNGROUNDED = 'BLOCKED_UNGROUNDED',
}

export const ALL_L13_OUTPUT_READINESS_CLASSES:
  readonly L13OutputReadinessClass[] =
  Object.values(L13OutputReadinessClass);

/**
 * §13.3.11 — Readiness classes that may NOT emit as an answer.
 * `REFUSAL_REQUIRED` may emit only as a refusal object.
 */
export const L13_BLOCKED_OUTPUT_READINESS_CLASSES:
  readonly L13OutputReadinessClass[] = [
  L13OutputReadinessClass.BLOCKED_UNGROUNDED,
];

export function isL13BlockedOutputReadiness(
  cls: L13OutputReadinessClass,
): boolean {
  return L13_BLOCKED_OUTPUT_READINESS_CLASSES.includes(cls);
}

/**
 * §13.3.11 — Readiness assessment object.
 */
export interface L13OutputReadinessAssessment {
  readonly readiness_assessment_id: string;

  readonly output_id: string;

  readonly readiness_class: L13OutputReadinessClass;

  readonly readiness_reason_codes: readonly string[];

  readonly blocking_issue_refs: readonly string[];
  readonly disclosure_required_refs: readonly string[];
  readonly restriction_refs: readonly string[];
  readonly uncertainty_refs: readonly string[];

  readonly may_emit_to_user: boolean;
  readonly requires_rewrite: boolean;
  readonly requires_refusal: boolean;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
