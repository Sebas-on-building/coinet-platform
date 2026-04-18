/**
 * L6.1 — Violation Codes
 *
 * Every constitutional boundary violation has a typed code.
 */

export enum L6BoundaryViolationCode {
  UNREGISTERED_DEPENDENCY = 'L6_UNREG_DEPENDENCY',
  UNREGISTERED_OUTPUT = 'L6_UNREG_OUTPUT',
  RAW_PROVIDER_INPUT = 'L6_RAW_PROVIDER_INPUT',
  FORBIDDEN_JUDGMENT_SEMANTICS = 'L6_FORBIDDEN_JUDGMENT',
  LOWER_LAYER_REDEFINITION = 'L6_LOWER_LAYER_REDEFINE',
  SILENT_NEUTRAL_FILL = 'L6_SILENT_NEUTRAL_FILL',
  LATE_DATA_SILENT_MUTATION = 'L6_LATE_DATA_SILENT_MUT',
  ILLEGAL_CAPABILITY_CLAIM = 'L6_ILLEGAL_CAPABILITY',
  ILLEGAL_OUTPUT_CLASS = 'L6_ILLEGAL_OUTPUT_CLASS',
  ILLEGAL_DEPENDENCY_USAGE = 'L6_ILLEGAL_DEP_USAGE',
  MISSING_LINEAGE = 'L6_MISSING_LINEAGE',
  STORAGE_BYPASS = 'L6_STORAGE_BYPASS',
}

export const ALL_VIOLATION_CODES: readonly L6BoundaryViolationCode[] = Object.values(L6BoundaryViolationCode);

export class L6ConstitutionalError extends Error {
  public readonly code: L6BoundaryViolationCode;
  public readonly details: Record<string, unknown>;

  constructor(code: L6BoundaryViolationCode, message: string, details: Record<string, unknown> = {}) {
    super(`[${code}] ${message}`);
    this.name = 'L6ConstitutionalError';
    this.code = code;
    this.details = details;
  }
}
