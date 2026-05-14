/**
 * L11.2 — Score Object Readiness Classes (§11.2.10)
 */

export enum L11ScoreObjectReadinessClass {
  /** §11.2.10.1 — Object satisfies every doctrine requirement. */
  OBJECT_COMPLETE = 'OBJECT_COMPLETE',
  /** Disclosure refs are missing — would launder posture. */
  DISCLOSURE_REQUIRED = 'DISCLOSURE_REQUIRED',
  /** Family is reserved/experimental/deprecated — not emissible. */
  RESERVED_FAMILY_BLOCKED = 'RESERVED_FAMILY_BLOCKED',
  /** Object semantically leaks judgment, recommendation, or scenario. */
  SEMANTIC_LEAK_BLOCKED = 'SEMANTIC_LEAK_BLOCKED',
  /** Identity, scope, numeric, lineage, or replay material missing. */
  CONTRACT_INCOMPLETE = 'CONTRACT_INCOMPLETE',
}

export const ALL_L11_SCORE_OBJECT_READINESS_CLASSES:
  readonly L11ScoreObjectReadinessClass[] =
  Object.values(L11ScoreObjectReadinessClass);
