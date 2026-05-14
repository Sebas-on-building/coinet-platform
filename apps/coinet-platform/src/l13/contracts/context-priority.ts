/**
 * L13.2 — Context Priority Contract
 *
 * §13.2.12 — Priority order applied when token budgets force
 * compression. Required preservation overrides priority rank.
 */

export enum L13ContextClass {
  USER_INTENT = 'USER_INTENT',

  L12_SCENARIO_BASE_CASE = 'L12_SCENARIO_BASE_CASE',
  L12_TRIGGERS = 'L12_TRIGGERS',
  L12_INVALIDATIONS = 'L12_INVALIDATIONS',
  L12_PATH_CONFIDENCE = 'L12_PATH_CONFIDENCE',
  L12_SCENARIO_SPREAD = 'L12_SCENARIO_SPREAD',
  L12_SHIFT_CONDITIONS = 'L12_SHIFT_CONDITIONS',
  L12_SCENARIO_RESTRICTIONS = 'L12_SCENARIO_RESTRICTIONS',

  L11_SCORE_OUTPUT = 'L11_SCORE_OUTPUT',
  L11_SCORE_ATTRIBUTION = 'L11_SCORE_ATTRIBUTION',
  L11_SCORE_MISSING_DATA = 'L11_SCORE_MISSING_DATA',
  L11_SCORE_DRIFT = 'L11_SCORE_DRIFT',
  L11_SCORE_RESTRICTIONS = 'L11_SCORE_RESTRICTIONS',

  L10_HYPOTHESES = 'L10_HYPOTHESES',
  L10_HYPOTHESIS_SPREAD = 'L10_HYPOTHESIS_SPREAD',

  L7_CONTRADICTIONS = 'L7_CONTRADICTIONS',
  L7_VALIDATION = 'L7_VALIDATION',
  L7_RESTRICTIONS = 'L7_RESTRICTIONS',

  L8_REGIME = 'L8_REGIME',
  L9_SEQUENCE = 'L9_SEQUENCE',
  L4_GRAPH_CONTEXT = 'L4_GRAPH_CONTEXT',
  L3_ENTITY = 'L3_ENTITY',

  STRONGEST_POSITIVE_EVIDENCE = 'STRONGEST_POSITIVE_EVIDENCE',
  STRONGEST_CONTRADICTIONS = 'STRONGEST_CONTRADICTIONS',
  TRIGGER_EVIDENCE = 'TRIGGER_EVIDENCE',
  INVALIDATION_EVIDENCE = 'INVALIDATION_EVIDENCE',

  CONFIDENCE_CAPS = 'CONFIDENCE_CAPS',
  RESTRICTIONS = 'RESTRICTIONS',
  MISSING_DATA_DISCLOSURES = 'MISSING_DATA_DISCLOSURES',
  DRIFT_DISCLOSURES = 'DRIFT_DISCLOSURES',

  EVIDENCE_REFS = 'EVIDENCE_REFS',
  LINEAGE_REFS = 'LINEAGE_REFS',

  HISTORICAL_CONTEXT = 'HISTORICAL_CONTEXT',
  OPTIONAL_CONTEXT = 'OPTIONAL_CONTEXT',
}

export const ALL_L13_CONTEXT_CLASSES: readonly L13ContextClass[] =
  Object.values(L13ContextClass);

/**
 * §13.2.12 — Canonical priority ordering. Lower index = higher
 * priority. Required preservation rules override this ranking when
 * an item is on the must-preserve list.
 */
export const L13_CONTEXT_PRIORITY_ORDER: readonly L13ContextClass[] = [
  L13ContextClass.USER_INTENT,

  L13ContextClass.L12_SCENARIO_BASE_CASE,
  L13ContextClass.L12_TRIGGERS,
  L13ContextClass.L12_INVALIDATIONS,
  L13ContextClass.L12_PATH_CONFIDENCE,

  L13ContextClass.L11_SCORE_OUTPUT,
  L13ContextClass.L11_SCORE_ATTRIBUTION,
  L13ContextClass.L11_SCORE_MISSING_DATA,
  L13ContextClass.L11_SCORE_DRIFT,
  L13ContextClass.L11_SCORE_RESTRICTIONS,

  L13ContextClass.L10_HYPOTHESES,
  L13ContextClass.L10_HYPOTHESIS_SPREAD,

  L13ContextClass.L7_CONTRADICTIONS,
  L13ContextClass.L7_VALIDATION,
  L13ContextClass.L7_RESTRICTIONS,

  L13ContextClass.L8_REGIME,
  L13ContextClass.L9_SEQUENCE,
  L13ContextClass.L4_GRAPH_CONTEXT,
  L13ContextClass.L3_ENTITY,

  L13ContextClass.STRONGEST_CONTRADICTIONS,
  L13ContextClass.INVALIDATION_EVIDENCE,
  L13ContextClass.TRIGGER_EVIDENCE,
  L13ContextClass.STRONGEST_POSITIVE_EVIDENCE,

  L13ContextClass.CONFIDENCE_CAPS,
  L13ContextClass.RESTRICTIONS,
  L13ContextClass.MISSING_DATA_DISCLOSURES,
  L13ContextClass.DRIFT_DISCLOSURES,

  L13ContextClass.L12_SCENARIO_SPREAD,
  L13ContextClass.L12_SHIFT_CONDITIONS,
  L13ContextClass.L12_SCENARIO_RESTRICTIONS,

  L13ContextClass.EVIDENCE_REFS,
  L13ContextClass.LINEAGE_REFS,

  L13ContextClass.HISTORICAL_CONTEXT,
  L13ContextClass.OPTIONAL_CONTEXT,
];

/**
 * §13.2.12 — Critical preservation override. Even when these items
 * have lower priority rank than something else in the package, they
 * may not be dropped while present.
 */
export const L13_MUST_PRESERVE_CONTEXT_CLASSES:
  readonly L13ContextClass[] = [
  L13ContextClass.STRONGEST_CONTRADICTIONS,
  L13ContextClass.L7_CONTRADICTIONS,
  L13ContextClass.L12_INVALIDATIONS,
  L13ContextClass.INVALIDATION_EVIDENCE,
  L13ContextClass.L12_TRIGGERS,
  L13ContextClass.TRIGGER_EVIDENCE,
  L13ContextClass.CONFIDENCE_CAPS,
  L13ContextClass.RESTRICTIONS,
  L13ContextClass.L7_RESTRICTIONS,
  L13ContextClass.L11_SCORE_RESTRICTIONS,
  L13ContextClass.L12_SCENARIO_RESTRICTIONS,
  L13ContextClass.MISSING_DATA_DISCLOSURES,
  L13ContextClass.DRIFT_DISCLOSURES,
  L13ContextClass.EVIDENCE_REFS,
  L13ContextClass.LINEAGE_REFS,
  L13ContextClass.USER_INTENT,
];

export function isL13MustPreserveContextClass(
  cls: L13ContextClass,
): boolean {
  return L13_MUST_PRESERVE_CONTEXT_CLASSES.includes(cls);
}

export function getL13ContextPriorityRank(cls: L13ContextClass): number {
  const idx = L13_CONTEXT_PRIORITY_ORDER.indexOf(cls);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

export interface L13ContextPriorityDecision {
  readonly priority_decision_id: string;

  readonly context_ref: string;
  readonly context_class: L13ContextClass;

  readonly priority_rank: number;

  readonly preserve_required: boolean;
  readonly compression_allowed: boolean;
  readonly dropping_allowed: boolean;

  readonly preservation_reason_codes: readonly string[];

  readonly policy_version: string;
}
