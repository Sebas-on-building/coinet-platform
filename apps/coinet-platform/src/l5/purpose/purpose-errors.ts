/**
 * L5.1 Purpose — Error Codes
 *
 * Every error code encodes a specific constitutional violation
 * of Layer 5 purpose law. These are not generic storage errors.
 * They represent breakdowns in the state-class discipline that
 * L5.1 exists to enforce.
 */

export enum L5PurposeErrorCode {
  /** Write entered L5 without a resolved primary state class. */
  L5_PURPOSE_CLASS_UNRESOLVED = 'L5_PURPOSE_CLASS_UNRESOLVED',

  /** Two stores claim authority for the same state class of fact. */
  L5_PURPOSE_ILLEGAL_AUTHORITY_DUPLICATION = 'L5_PURPOSE_ILLEGAL_AUTHORITY_DUPLICATION',

  /** An L5 module attempted a constitutionally forbidden action. */
  L5_PURPOSE_FORBIDDEN_ACTION = 'L5_PURPOSE_FORBIDDEN_ACTION',

  /** A replay-required write lacks sufficient lineage for reconstruction. */
  L5_PURPOSE_REPLAY_REQUIRED_BUT_UNSUPPORTED = 'L5_PURPOSE_REPLAY_REQUIRED_BUT_UNSUPPORTED',

  /** An archive-required write has no archive pointer or evidence ref. */
  L5_PURPOSE_ARCHIVE_REQUIRED_BUT_MISSING = 'L5_PURPOSE_ARCHIVE_REQUIRED_BUT_MISSING',

  /** A read-model, cache, or projection is acting as undeclared authority. */
  L5_PURPOSE_SHADOW_AUTHORITY_RISK = 'L5_PURPOSE_SHADOW_AUTHORITY_RISK',

  /** A write cannot be uniquely classified into one state class. */
  L5_PURPOSE_AMBIGUOUS_STATE_CLASS = 'L5_PURPOSE_AMBIGUOUS_STATE_CLASS',

  /** Late-arriving data could mutate current belief but the write lacks late-data declaration. */
  L5_PURPOSE_LATE_DATA_RISK_UNDECLARED = 'L5_PURPOSE_LATE_DATA_RISK_UNDECLARED',
}

export class L5PurposeError extends Error {
  public readonly code: L5PurposeErrorCode;
  public readonly details: Record<string, unknown>;

  constructor(code: L5PurposeErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(`[${code}] ${message}`);
    this.name = 'L5PurposeError';
    this.code = code;
    this.details = details;
  }
}
