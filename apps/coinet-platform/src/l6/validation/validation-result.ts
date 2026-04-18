/**
 * L6.2 — Validation Result Contract
 *
 * Stable, machine-usable result objects for every primitive validator.
 * Every violation carries a deterministic, reproducible code so that
 * audit emission and invariant assertions remain machine-verifiable.
 */

export enum L6PrimitiveViolationCode {
  INCOMPLETE_IDENTITY = 'L6_PRIM_INCOMPLETE_IDENTITY',
  INVALID_PRIMITIVE_ID = 'L6_PRIM_INVALID_ID',
  INVALID_VERSION_TAG = 'L6_PRIM_INVALID_VERSION',
  MISSING_SCOPE = 'L6_PRIM_MISSING_SCOPE',
  UNREGISTERED_FEATURE_KIND = 'L6_PRIM_UNREG_FEATURE_KIND',
  UNREGISTERED_EVENT_KIND = 'L6_PRIM_UNREG_EVENT_KIND',
  MISSING_REQUIRED_KIND_FIELD = 'L6_PRIM_MISSING_KIND_FIELD',
  FORBIDDEN_KIND_FIELD_PRESENT = 'L6_PRIM_FORBIDDEN_KIND_FIELD',
  MISSING_TRANSFORMATION_CLASS = 'L6_PRIM_MISSING_TRANSFORM',
  INCOMPATIBLE_TRANSFORMATION_CLASS = 'L6_PRIM_INCOMPAT_TRANSFORM',
  MISSING_NULL_POLICY = 'L6_PRIM_MISSING_NULL_POLICY',
  FORBIDDEN_NEUTRAL_FILL = 'L6_PRIM_FORBIDDEN_NEUTRAL_FILL',
  MISSING_LINEAGE_POLICY = 'L6_PRIM_MISSING_LINEAGE',
  INCOMPLETE_LINEAGE_POLICY = 'L6_PRIM_INCOMPLETE_LINEAGE',
  MISSING_FRESHNESS_BUDGET = 'L6_PRIM_MISSING_FRESHNESS',
  MISSING_QUALITY_GATE = 'L6_PRIM_MISSING_QUALITY_GATE',
  MISSING_CONFIDENCE_DERIVATION = 'L6_PRIM_MISSING_CONFIDENCE',
  MISSING_INPUTS = 'L6_PRIM_MISSING_INPUTS',
  EMPTY_INPUT_SURFACE_REF = 'L6_PRIM_EMPTY_INPUT_SURFACE',
  FEATURE_HAS_EVENT_LIFECYCLE = 'L6_PRIM_FEATURE_HAS_LIFECYCLE',
  EVENT_LACKS_TRIGGER = 'L6_PRIM_EVENT_LACKS_TRIGGER',
  EVENT_LACKS_LIFECYCLE = 'L6_PRIM_EVENT_LACKS_LIFECYCLE',
  EVENT_LIFECYCLE_SHAPE_ILLEGAL = 'L6_PRIM_EVENT_LIFECYCLE_SHAPE_ILLEGAL',
  EVENT_IS_STEADY_STATE = 'L6_PRIM_EVENT_IS_STEADY_STATE',
  MIXED_STATE_AND_CHANGE = 'L6_PRIM_MIXED_STATE_AND_CHANGE',
  JUDGMENT_LEAKAGE_IN_NAME = 'L6_PRIM_JUDGMENT_IN_NAME',
  JUDGMENT_LEAKAGE_IN_DESCRIPTION = 'L6_PRIM_JUDGMENT_IN_DESC',
  JUDGMENT_LEAKAGE_IN_TRANSFORM = 'L6_PRIM_JUDGMENT_IN_TRANSFORM',
  JUDGMENT_LEAKAGE_IN_SEVERITY = 'L6_PRIM_JUDGMENT_IN_SEVERITY',
  CONTRADICTION_SUPPORT_MISSING = 'L6_PRIM_CONTRADICTION_MISSING',
  CONTRADICTION_COLLAPSE_ATTEMPT = 'L6_PRIM_CONTRADICTION_COLLAPSE',
  VECTOR_AGGREGATION_INCOMPLETE = 'L6_PRIM_VECTOR_AGG_INCOMPLETE',
  COMPOSITE_SPEC_INCOMPLETE = 'L6_PRIM_COMPOSITE_INCOMPLETE',
  INVALID_EVIDENCE_REQUIREMENTS = 'L6_PRIM_EVIDENCE_INCOMPLETE',
  INVALID_DEDUPE_SPEC = 'L6_PRIM_DEDUPE_INVALID',
  ILLEGAL_PRIMITIVE_CLASS = 'L6_PRIM_ILLEGAL_CLASS',
}

export const ALL_PRIMITIVE_VIOLATION_CODES: readonly L6PrimitiveViolationCode[] =
  Object.values(L6PrimitiveViolationCode);

export interface L6PrimitiveViolation {
  readonly code: L6PrimitiveViolationCode;
  readonly path: string;
  readonly detail: string;
  readonly context: Record<string, unknown>;
}

export interface L6PrimitiveValidationResult {
  readonly valid: boolean;
  readonly violations: readonly L6PrimitiveViolation[];
}

export function ok(): L6PrimitiveValidationResult {
  return { valid: true, violations: [] };
}

export function fail(violations: readonly L6PrimitiveViolation[]): L6PrimitiveValidationResult {
  return { valid: violations.length === 0, violations };
}

export function mergeResults(
  ...results: readonly L6PrimitiveValidationResult[]
): L6PrimitiveValidationResult {
  const all: L6PrimitiveViolation[] = [];
  for (const r of results) all.push(...r.violations);
  return { valid: all.length === 0, violations: all };
}

export function violation(
  code: L6PrimitiveViolationCode,
  path: string,
  detail: string,
  context: Record<string, unknown> = {},
): L6PrimitiveViolation {
  return { code, path, detail, context };
}
