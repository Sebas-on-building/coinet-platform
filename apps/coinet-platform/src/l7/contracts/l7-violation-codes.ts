/**
 * L7.1 — Boundary Violation Codes
 *
 * Every constitutional boundary failure has a typed code so that audit
 * records and validator decisions remain deterministic (§7.1.9.2 Band E).
 */

export enum L7BoundaryViolationCode {
  UNREGISTERED_DEPENDENCY = 'L7_UNREG_DEPENDENCY',
  UNREGISTERED_OUTPUT = 'L7_UNREG_OUTPUT',
  ILLEGAL_DEPENDENCY_USAGE = 'L7_ILLEGAL_DEP_USAGE',
  ILLEGAL_OUTPUT_CLASS = 'L7_ILLEGAL_OUTPUT_CLASS',
  ILLEGAL_CAPABILITY_CLAIM = 'L7_ILLEGAL_CAPABILITY',
  FORBIDDEN_JUDGMENT_SEMANTICS = 'L7_FORBIDDEN_JUDGMENT',
  FORBIDDEN_RECOMMENDATION_SEMANTICS = 'L7_FORBIDDEN_RECOMMENDATION',
  FORBIDDEN_SCENARIO_SEMANTICS = 'L7_FORBIDDEN_SCENARIO',
  LOWER_LAYER_REDEFINITION = 'L7_LOWER_LAYER_REDEFINE',
  PRIMITIVE_REINTERPRETATION = 'L7_PRIMITIVE_REINTERPRETATION',
  CONTRADICTION_LAUNDERING = 'L7_CONTRADICTION_LAUNDERING',
  AMBIGUITY_SILENT_RESOLUTION = 'L7_AMBIGUITY_SILENT_RESOLUTION',
  STALE_SUPPORT_MASQUERADE = 'L7_STALE_SUPPORT_MASQUERADE',
  INCOMPLETENESS_NEGLECT = 'L7_INCOMPLETENESS_NEGLECT',
  STORAGE_BYPASS = 'L7_STORAGE_BYPASS',
  CONFIDENCE_LAW_OVERRIDE = 'L7_CONFIDENCE_LAW_OVERRIDE',
  MISSING_LINEAGE = 'L7_MISSING_LINEAGE',
}

export const ALL_VIOLATION_CODES: readonly L7BoundaryViolationCode[] =
  Object.values(L7BoundaryViolationCode);

export class L7ConstitutionalError extends Error {
  public readonly code: L7BoundaryViolationCode;
  public readonly details: Record<string, unknown>;

  constructor(
    code: L7BoundaryViolationCode,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(`[${code}] ${message}`);
    this.name = 'L7ConstitutionalError';
    this.code = code;
    this.details = details;
  }
}
